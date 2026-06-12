import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env.twitter'), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);

const { TWITTER_API_KEY: API_KEY, TWITTER_API_SECRET: API_SECRET,
        TWITTER_ACCESS_TOKEN: ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET: ACCESS_TOKEN_SECRET } = env;

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthHeader(method, urlWithParams, bodyParams = {}) {
  // URL과 쿼리 파라미터 분리 (GET 서명에 쿼리 파라미터 포함 필요)
  const [baseUrl, queryString] = urlWithParams.split('?');
  const queryParams = queryString
    ? Object.fromEntries(new URLSearchParams(queryString).entries())
    : {};

  const nonce = Math.random().toString(36).slice(2) + Date.now();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const allParams = { ...oauthParams, ...bodyParams, ...queryParams };
  const sortedParams = Object.entries(allParams).sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${percentEncode(k)}=${percentEncode(v)}`).join('&');
  const sigBase = `${method}&${percentEncode(baseUrl)}&${percentEncode(sortedParams)}`;
  const sigKey = `${percentEncode(API_SECRET)}&${percentEncode(ACCESS_TOKEN_SECRET)}`;
  oauthParams.oauth_signature = createHmac('sha1', sigKey).update(sigBase).digest('base64');
  return 'OAuth ' + Object.entries(oauthParams).map(([k,v]) => `${percentEncode(k)}="${percentEncode(v)}"`).join(', ');
}

async function searchTweets(query, maxResults = 10) {
  const url = 'https://api.twitter.com/2/tweets/search/recent';
  const params = new URLSearchParams({
    query,
    max_results: maxResults,
    'tweet.fields': 'author_id,created_at,text',
    'expansions': 'author_id',
    'user.fields': 'username,name',
  });
  const fullUrl = `${url}?${params}`;
  const res = await fetch(fullUrl, {
    headers: { Authorization: oauthHeader('GET', fullUrl) },
  });
  return res.json();
}

async function replyToTweet(tweetId, text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } });
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url), 'Content-Type': 'application/json' },
    body,
  });
  return res.json();
}

// 검색 쿼리: 앱 링크를 실제로 공유하며 홍보 중인 메이커만 타겟
const queries = [
  // 🔥 Fable 5로 만든 따끈따끈한 앱 링크
  '"fable 5" (built OR made OR shipped OR "check it out" OR try) url:http -is:retweet lang:en',
  '"claude fable" (built OR made OR app OR tool) url:http -is:retweet lang:en',
  // lovable.app 링크 직접 공유
  'url:lovable.app ("I built" OR "I made" OR "built this" OR "check it out" OR launched OR shipped) -is:retweet lang:en',
  // v0.dev / bolt.new 링크 공유
  '(url:v0.dev OR url:bolt.new) ("I built" OR "I made" OR launched OR shipped OR "vibe") -is:retweet lang:en',
];

// 노이즈 필터: 이런 단어 포함된 트윗은 스킵
const NOISE_KEYWORDS = ['coinbase', 'crypto', 'wall street', 'tiktok algorithm', 'reaper', 'notion mcp', 'gumroad',
  'anthropic just launched', 'xiaomi', 'benchmark', 'rival to claude', 'meta has just launched', 'meta ads mcp'];

function isNoise(text) {
  const lower = text.toLowerCase();
  return NOISE_KEYWORDS.some(kw => lower.includes(kw));
}

const REPLY_TEMPLATE = () =>
  `This is exactly the kind of app Glim is built for — a TikTok-style feed where vibe-coders can get their apps in front of real users and get feedback fast. Worth listing it here → https://glim.ordinaryindividuality.workers.dev`;

const DRY_RUN = process.argv[2] !== '--send'; // 기본은 dry-run

console.log(DRY_RUN ? '=== DRY RUN (실제 리플 안 보냄) ===' : '=== LIVE MODE ===\n');

for (const query of queries) {
  console.log(`\n검색: "${query}"`);
  const result = await searchTweets(query, 10);

  if (result.errors || !result.data) {
    console.log('결과 없음 또는 에러:', JSON.stringify(result));
    continue;
  }

  const users = Object.fromEntries((result.includes?.users || []).map(u => [u.id, u]));

  for (const tweet of result.data) {
    const user = users[tweet.author_id];
    const username = user?.username || tweet.author_id;

    if (isNoise(tweet.text)) {
      console.log(`\n[SKIP 노이즈] @${username}: ${tweet.text.substring(0, 60)}...`);
      continue;
    }

    console.log(`\n✅ @${username}: ${tweet.text.substring(0, 100)}...`);
    console.log(`Tweet ID: ${tweet.id}`);
    console.log(`리플 예정: ${REPLY_TEMPLATE()}`);

    if (!DRY_RUN) {
      const reply = await replyToTweet(tweet.id, REPLY_TEMPLATE());
      console.log('리플 결과:', reply.data ? `✅ ${reply.data.id}` : `❌ ${JSON.stringify(reply)}`);
      // 스팸 방지: 리플 사이 2초 간격
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
