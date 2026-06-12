import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.twitter 읽기
const envPath = join(__dirname, '..', '.env.twitter');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim()))
);

const API_KEY = env.TWITTER_API_KEY;
const API_SECRET = env.TWITTER_API_SECRET;
const ACCESS_TOKEN = env.TWITTER_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = env.TWITTER_ACCESS_TOKEN_SECRET;

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function buildOAuthHeader(method, url, params, bodyParams = {}) {
  const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams, ...bodyParams };
  const sortedParams = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&');

  const sigBase = `${method}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const sigKey = `${percentEncode(API_SECRET)}&${percentEncode(ACCESS_TOKEN_SECRET)}`;
  const signature = createHmac('sha1', sigKey).update(sigBase).digest('base64');

  oauthParams.oauth_signature = signature;

  const header = 'OAuth ' + Object.entries(oauthParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return header;
}

export async function postTweet(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });
  const authHeader = buildOAuthHeader('POST', url, {}, {});

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// 테스트 실행
const testText = process.argv[2] || '테스트 포스트 — Glim 마케팅 에이전트 연결 테스트 🔧';
console.log('포스팅 중:', testText);
const result = await postTweet(testText);
console.log('성공!', result);
