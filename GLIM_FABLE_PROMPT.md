# Glim — 원샷 구현 프롬프트 (Cloudflare 버전, for Fable)

> 아래 전체를 그대로 복사해 Fable(claude-fable-5)에게 붙여넣으면 됩니다.
> 자기완결적(self-contained)으로 작성되어 있어 추가 설명 없이 원샷 빌드가 가능합니다.
> 백엔드는 **Cloudflare 네이티브**(Workers + D1 + R2)이며, 영상은 **R2 mp4 우선 + YouTube URL 보조**입니다.

---

너는 **Glim**이라는 웹 제품을 **한 번에(one-shot)** 처음부터 끝까지 구현하는 시니어 풀스택 엔지니어다. 아래 스펙을 읽고, 바로 실행 가능한 프로덕션 품질의 **Next.js(App Router) + Cloudflare** 앱을 만들어라. 중간에 질문하지 말고, 모호한 부분은 합리적인 기본값으로 채워 끝까지 완성한 뒤, 실행 방법을 README로 남겨라.

## 0. 한 줄 정의
Glim은 "TikTok처럼 신생 앱을 발견하고, 15초 데모를 본 뒤, 새 탭 없이 바로 체험하고, 3초 만에 피드백을 남기는 앱 발견 플랫폼"이다.

기존 Product Hunt는 앱을 **읽고 설명을 보는** 방식이다. Glim은 앱을 **보고, 바로 써보고, 즉시 반응하는** 방식이다.

## 1. 제품 철학 (구현 내내 지켜야 할 원칙)
- 첫 화면에서 **설명하지 말고 보여줘라.** 사이트 진입 즉시 첫 앱 데모 영상이 자동재생되어야 한다. 긴 랜딩페이지 금지.
- **로그인보다 체험이 먼저다.** 로그인 없이 피드 탐색 / 영상 시청 / Try / 좋아요·저장이 가능해야 한다. 일정 행동(좋아요 3회 또는 저장 1회 또는 피드백 1회) 이후에 부드럽게 로그인을 유도한다.
- **새 탭보다 내부 체험이 먼저다.** Try는 가능하면 iframe으로 플랫폼 안에서 연다.
- **긴 리뷰보다 빠른 피드백이 먼저다.** 피드백은 3초 안에 끝나는 태그 선택 + 선택적 한 줄 코멘트.
- **좋아요보다 Try 클릭이, 조회수보다 체험 전환율이 더 중요한 지표다.**
- MVP에 **넣지 말 것**: 복잡한 AI 추천, 투자유치, 포인트 현금화, 광고 시스템, 게시판형 댓글, 긴 텍스트 설명 중심 UI.

## 2. 기술 스택 (고정)
- **Next.js (App Router) + TypeScript**
- **Tailwind CSS + shadcn/ui**
- 호스팅/런타임: **Cloudflare Workers** — `@opennextjs/cloudflare` 어댑터로 Next.js App Router 구동, `wrangler`로 개발/배포
- DB: **Cloudflare D1 (SQLite)** + **Drizzle ORM**(스키마·마이그레이션·타입)
- 파일 저장: **Cloudflare R2** (데모 mp4 / 썸네일). R2는 egress 무료라 영상 서빙에 적합
- 인증: **better-auth** + Google OAuth (세션은 D1에 저장)
- 데이터 접근: 서버 컴포넌트 / 서버 액션 / Route Handler에서 Drizzle로 D1 접근

> ⚠️ **중요(보안 모델):** D1에는 Postgres 같은 RLS가 없다. 따라서 "본인 데이터만 수정", "maker 본인만 앱 수정" 같은 모든 권한 검증은 **반드시 서버(서버 액션/Route Handler) 레이어에서** better-auth 세션 또는 `anonymousId` 소유권을 확인해 처리하라. 클라이언트에서 직접 D1에 쓰지 마라.

## 3. Cloudflare 셋업 요구사항 (반드시 충족)
1. **`wrangler.toml`** 에 D1 바인딩, R2 바인딩, OpenNext 설정 포함.
2. **Drizzle 스키마**(`src/db/schema.ts`) + 마이그레이션 디렉터리(`drizzle/`). 마이그레이션은 `drizzle-kit generate` → `wrangler d1 migrations apply` 흐름.
3. **시드 스크립트**로 **샘플 앱 10~12개**를 삽입해 피드가 절대 비지 않게 한다. 데모 영상은 공개 샘플 mp4 URL(무료 stock/placeholder 영상 등 호스팅 가능한 URL)을 사용하고, 일부 앱은 YouTube URL 보조 필드도 채워 둔다. 카테고리는 AI / 생산성 / 개발자도구 / 금융 / 건강 / 콘텐츠 / 교육 / 게임 등에서 다양하게 섞는다. 각 앱은 실제로 iframe에 띄울 수 있는 공개 URL(또는 fallback이 동작하는 URL)을 갖는다.
4. **`.dev.vars` / `.env.example`** 에 필요한 비밀값 placeholder 포함:
   - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - (R2 공개 접근용) `R2_PUBLIC_BASE_URL`
   바인딩(`DB`=D1, `BUCKET`=R2)은 `wrangler.toml`로 주입.
5. **README** 에: Cloudflare 계정 준비 → `wrangler d1 create` / `wrangler r2 bucket create` → 마이그레이션 적용 → 시드 실행 → Google OAuth 클라이언트 생성 및 redirect URI 설정 → `wrangler dev`(또는 `pnpm dev`) → `wrangler deploy` 까지 단계별 안내.
6. **익명 사용자 처리**: 로그인 전 사용자는 클라이언트에서 생성한 `anonymousId`(localStorage + 쿠키)로 식별한다. 모든 interaction/feedback이 익명으로도 기록되어야 하고, 로그인 시 익명 데이터를 사용자 계정에 병합(merge)한다.

## 4. 데이터 모델 (D1 / SQLite, Drizzle 기준)
SQLite 특성에 맞춰 작성하라:
- `id`는 `text` PK, 기본값 `crypto.randomUUID()`.
- 날짜는 `integer`(unix ms) 또는 `text`(ISO) — Drizzle `timestamp` 모드 일관 사용.
- 배열/객체(`tags`, `maker_links`)는 **JSON 문자열 컬럼**(`text`, `{ mode: 'json' }`)으로 저장.
- bool은 `integer`(0/1).

테이블:
- **users**(better-auth 표준 스키마): `id`, `name`, `email`, `image`, `created_at` + better-auth가 요구하는 `sessions`, `accounts`, `verification` 등 부속 테이블 포함.
- **apps**: `id`, `slug`(unique), `name`, `tagline`, `description`, `url`, `demo_video_url`(R2 mp4), `youtube_url?`(보조), `thumbnail_url`, `category`, `tags`(json), `maker_id`(users), `maker_name`, `maker_links`(json: website/x/github), `guest_mode_available`(bool), `no_login_trial_available`(bool), `embeddable`(bool), `status`('draft'|'published'|'hidden'), `created_at`, `updated_at`
- **interactions**: `id`, `user_id?`, `anonymous_id?`, `app_id`, `type`(`impression`|`video_start`|`video_complete`|`skip`|`like`|`save`|`share`|`try_click`|`try_return`|`feedback_submit`), `metadata`(json), `created_at`
- **feedback**: `id`, `app_id`, `user_id?`, `anonymous_id?`, `rating`('positive'|'neutral'|'negative'), `tags`(json: `useful`|`interesting`|`confusing`|`buggy`|`login_blocked`|`too_slow`|`not_for_me`), `comment?`, `created_at`
- **app_stats**: 별도 테이블 대신 interactions/feedback에서 **집계 쿼리**(Drizzle/SQL)로 계산. app별 `views`, `completed_views`, `try_clicks`, `try_returns`, `likes`, `saves`, `shares`, `feedback_count`, `top_feedback_tags`.

**권한 규칙(서버 레이어에서 강제):** published 앱은 누구나 read. interactions/feedback은 익명·로그인 모두 insert 가능하되, update/delete는 본인(`user_id` 일치 또는 `anonymous_id` 일치)만. apps는 `maker_id`가 현재 세션 유저일 때만 수정.

### TypeScript 타입 참고
```ts
type App = {
  id: string; slug: string; name: string; tagline: string; description?: string
  url: string; demoVideoUrl: string; youtubeUrl?: string; thumbnailUrl?: string
  category: string; tags: string[]
  makerId: string; makerName: string
  makerLinks?: { website?: string; x?: string; github?: string }
  guestModeAvailable: boolean; noLoginTrialAvailable: boolean; embeddable: boolean
  status: 'draft' | 'published' | 'hidden'
  createdAt: number; updatedAt: number
}

type Interaction = {
  id: string; userId?: string; anonymousId?: string; appId: string
  type: 'impression' | 'video_start' | 'video_complete' | 'skip' | 'like'
      | 'save' | 'share' | 'try_click' | 'try_return' | 'feedback_submit'
  metadata?: Record<string, any>; createdAt: number
}

type Feedback = {
  id: string; appId: string; userId?: string; anonymousId?: string
  rating?: 'positive' | 'neutral' | 'negative'
  tags: Array<'useful'|'interesting'|'confusing'|'buggy'|'login_blocked'|'too_slow'|'not_for_me'>
  comment?: string; createdAt: number
}
```

## 5. 영상 재생 정책 (R2 우선 + YouTube 보조)
- **피드 메인 영상은 R2의 mp4**를 `<video muted autoplay loop playsinline>`로 재생한다. 광고·외부 브랜딩이 없고 egress 무료라 가장 깔끔/저렴하다.
- 앱에 `demo_video_url`(R2 mp4)이 있으면 그것을 쓰고, 없고 `youtube_url`만 있으면 **YouTube IFrame 임베드**(`autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`)로 fallback 재생한다.
- YouTube 임베드는 광고/브랜딩이 나타날 수 있으므로 피드 메인보다는 보조 수단으로 취급하고, `/submit`에서 제작자에게 "R2 영상 업로드를 권장, YouTube는 보조 옵션"이라고 안내한다.
- 성능: 피드에서는 **현재 활성 카드 1개만** 재생/로드하고 나머지는 lazy. YouTube iframe도 활성 카드일 때만 마운트한다.

## 6. 화면 / 라우트

### `/` — Home Feed (핵심)
- 로그인 없이 즉시 시작. 진입하자마자 첫 앱 데모 영상 자동재생(음소거 자동재생 → 탭 시 사운드).
- 모바일: 세로 스와이프 / 데스크톱: 마우스 휠 + ↑↓ 키 + 스크롤 스냅.
- 각 카드 구성: 15초 데모 영상(루프), 앱 이름, 한 줄 설명, 카테고리 칩, 액션 버튼 — **Try**(가장 강조), Like, Save, Share, Feedback.
- 상단엔 최소한의 `Glim` 로고만. 긴 설명 금지.
- 이벤트 기록: 노출 시 `impression`, 재생 시 `video_start`, 끝까지 보면 `video_complete`, 넘기면 `skip`.

예시 카드:
```
────────────────
🚀 AI meeting notes in seconds.
[15-second demo video]
👍 42   💬 8
[ Try ]
────────────────
```

### `/try/[appId]` — Try View (핵심)
- 외부 앱을 iframe으로 플랫폼 안에서 체험. 상단 고정 Glim bar:
  ```
  ← Back to Glim     {앱 이름}     👍   💬   🔗
  ```
- iframe 차단(X-Frame-Options/CSP) 대비 **fallback**: iframe 로드 실패 감지 시 "이 앱은 새 창에서 열립니다" 안내 + 새 탭 열기 버튼(열어도 Glim으로 돌아오도록 안내). MVP에서 실패 탐지를 완벽히 구현할 필요는 없지만 구조상 fallback이 가능해야 한다.
- 이벤트: 진입 시 `try_click`, Back 시 `try_return`. **Back을 누르면 즉시 피드백 모달**을 띄운다.

### 피드백 모달 (3초 UX)
```
How was it?
👍 Useful   ✨ Interesting   😕 Confusing   🐞 Buggy
🚪 Login blocked me   🐢 Too slow   ❌ Not for me

[ Optional: Tell the maker one thing. ]
```
- 태그 다중선택 가능, 코멘트는 선택. 제출 시 `feedback_submit` 기록 후 자연스럽게 다음 앱으로.

### `/submit` — Submit App
- 필드: App name, App URL, Tagline, Description, Category, Tags, **Demo video(R2 업로드)**, **YouTube URL(선택)**, Thumbnail, Maker name, Maker links, `Guest mode available` / `No-login trial` / `Embeddable` 체크박스.
- 영상 업로드는 **R2 presigned URL**로 클라이언트 → R2 직접 업로드 후 공개 URL을 `demo_video_url`에 저장. 등록 즉시 피드에 published로 노출.
- 등록은 로그인 필요(여기서 로그인 게이트는 허용).
- 가능하면 **로그인 없이 30초 이상 체험 가능한 앱**을 우선 노출하고, "로그인해야만 볼 수 있는 앱"은 추천 점수에서 불리하게 만든다.

### `/app/[slug]` — App Detail (공유 / SEO용)
- 데모 영상(또는 YouTube), 설명, Try 버튼, 피드백 요약, 제작자 정보. OG 메타태그 세팅.

### `/dashboard` — Maker Dashboard
- 로그인 필요. 내 앱 목록 + 앱별 지표: Views / Completed views / Try clicks / Try click-through rate / Feedback / Likes / Saves / Shares + **Top friction**(피드백 태그 비율 막대) + 피드백 코멘트 목록.

예시:
```
Views: 1,240      Completed views: 410
Try clicks: 126   Feedback: 31
Top friction:
- Login blocked me: 42%
- Confusing: 23%
- Too slow: 18%
- Not for me: 17%
```
이 대시보드가 Product Hunt와의 핵심 차별점이다. 단순 좋아요가 아니라 **실제 사용 전환**을 보여준다.

### 인증
- better-auth + Google OAuth, 세션은 D1에 저장. 로그인은 **진입 장벽이 아니어야** 한다.
- 로그인이 필요한 순간: 앱 등록 / 일정 횟수 이후 피드백 / 저장 목록 영구화 / 대시보드 접근.
- 로그인 유도 카피 예: `Save your discoveries with one click. — Continue with Google`
- 로그인 시 기존 `anonymousId`의 interaction/feedback/저장을 현재 유저로 병합한다.

## 7. 추천 / 피드 정렬 (MVP, 단순하게)
초기 정렬 믹스: **오늘 인기 30% + 최근 등록 30% + 랜덤 40%**.

App Score(인기 정렬용, 서버에서 집계 쿼리로 계산):
```
App Score =
    video_completion_rate * 2
  + try_click_rate        * 5
  + feedback_rate         * 3
  + save_rate             * 2
  - immediate_skip_rate   * 2
  - login_blocked_rate    * 3
```
복잡한 개인화/ML은 만들지 말 것. 단, 행동 로그(interactions)는 나중에 개인화에 쓸 수 있도록 구조화해 둔다.

## 8. 디자인 방향
- 브랜드명 **Glim**. 메인 카피: `Discover what was built today.`
  보조 카피: `Watch 15-second demos, try apps instantly, and leave feedback in seconds.`
- 톤: 글로벌 SaaS, 미니멀. 검정/화이트 기반, **영상과 앱 카드가 주인공**.
- TikTok/Shorts의 직관성 + Linear/Vercel의 깔끔함. 버튼은 적고 강하게.
- 모바일 우선, 데스크톱 대응. 다크 기본.

## 9. 빌드 순서 (이 순서대로 진행)
1. **Phase 1 — 작동하는 피드**: D1 스키마 + 시드 앱 10개, 세로 피드, R2 mp4 자동재생(+YouTube fallback), Try/Like/Save/Share UI, 피드백 모달. (D1 읽기 연동)
2. **Phase 2 — 앱 등록**: `/submit` + R2 presigned 업로드 + 등록 앱이 피드에 표시.
3. **Phase 3 — Try View**: `/try/[appId]` iframe + Glim bar + Back 시 피드백.
4. **Phase 4 — 통계**: interaction/feedback 이벤트 저장 + `/dashboard` 집계 지표.
5. **Phase 5 — 로그인**: better-auth Google OAuth + 익명→계정 병합 + 저장목록/대시보드 접근.

## 10. 완료 기준 (Definition of Done)
- `pnpm install` 후 D1 마이그레이션·시드를 적용하고 `wrangler dev`(또는 `pnpm dev`)를 실행하면 `/`에서 영상 피드가 즉시 보이고 스와이프로 넘어간다.
- Try → iframe(또는 fallback) → Back → 피드백 모달 → 다음 앱의 전체 플로우가 동작한다.
- 로그인 없이 좋아요/저장/피드백이 익명으로 기록되고, 로그인 시 병합된다.
- `/submit`으로 새 앱 등록(R2 업로드 포함) 시 피드와 `/app/[slug]`에 즉시 반영된다.
- `/dashboard`에서 실제 집계 지표가 보인다.
- 모든 쓰기 경로에서 서버 레이어 권한 검증이 적용되어 있다(타인 데이터 수정 불가).
- README에 Cloudflare(D1/R2/Workers) 설정 + 실행/배포 단계가 정확히 적혀 있고, `.env.example`을 제공한다.
- TypeScript 타입 에러 없이 빌드(`pnpm build` / `opennextjs-cloudflare build`)가 통과한다.

## 11. 반드시 피할 것 (재강조)
긴 랜딩페이지 / 첫 화면 로그인 강제 / 카드 리스트만 / 새 탭 기본 UX / 포인트·광고·투자 기능 / AI 추천부터 만들기 / 게시판형 댓글 / 텍스트 설명 중심 UI / 클라이언트에서 D1 직접 쓰기.

## 12. 핵심 차별점 (한눈에)
| | Product Hunt | **Glim** |
|---|---|---|
| 소비 방식 | 읽는다 | **본다** |
| 체험 | 밖으로 나간다 | **플랫폼 안에서 바로 써본다** |
| 반응 | 좋아요 중심 | **플랫폼 안에서 빠른 피드백** |
| 지표 | 조회수·좋아요 | **실제 사용(Try) 전환율** |

---

이제 위 스펙대로 전체 코드를 작성하고, 마지막에 Cloudflare 실행/배포 방법을 README로 정리해라.
