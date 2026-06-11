# Glim — 원샷 구현 프롬프트 (for Fable)

> 아래 전체를 그대로 복사해 Fable(claude-fable-5)에게 붙여넣으면 됩니다.
> 자기완결적(self-contained)으로 작성되어 있어 추가 설명 없이 원샷 빌드가 가능합니다.

---

너는 **Glim**이라는 웹 제품을 **한 번에(one-shot)** 처음부터 끝까지 구현하는 시니어 풀스택 엔지니어다. 아래 스펙을 읽고, 바로 실행 가능한 프로덕션 품질의 **Next.js + Supabase** 앱을 만들어라. 중간에 질문하지 말고, 모호한 부분은 합리적인 기본값으로 채워 끝까지 완성한 뒤, 실행 방법을 README로 남겨라.

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
- **Supabase**: Postgres(DB) + Auth(Google OAuth) + Storage(데모 영상/썸네일)
- 데이터 접근: 서버 컴포넌트 + `@supabase/ssr` 클라이언트(서버/브라우저 양쪽)
- 배포 타깃: Vercel
- 패키지 매니저: `pnpm` (없으면 npm)

## 3. Supabase 연동 요구사항 (반드시 충족)
1. **`supabase/migrations/0001_init.sql`** 에 전체 스키마 + RLS 정책 작성.
2. **`supabase/seed.sql`** (또는 `scripts/seed.ts`)로 **샘플 앱 10~12개**를 삽입해 피드가 절대 비지 않게 한다. 데모 영상은 공개 샘플 mp4 URL(무료 stock/placeholder 영상 등 호스팅 가능한 URL)을 사용. 카테고리는 AI / 생산성 / 개발자도구 / 금융 / 건강 / 콘텐츠 / 교육 / 게임 등에서 다양하게 섞는다. 각 앱은 실제로 iframe에 띄울 수 있는 공개 URL(또는 fallback이 동작하는 URL)을 갖는다.
3. **`.env.example`** 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth 키 placeholder 포함.
4. **README** 에: Supabase 프로젝트 생성 → 마이그레이션 적용(`supabase db push` 또는 SQL 에디터 붙여넣기) → seed 실행 → Storage 버킷 생성 → Google OAuth 설정 → `pnpm dev` 까지 단계별 안내.
5. **익명 사용자 처리**: 로그인 전 사용자는 클라이언트에서 생성한 `anonymousId`(localStorage + 쿠키)로 식별한다. 모든 interaction/feedback이 익명으로도 기록되어야 하고, 로그인 시 익명 데이터를 사용자 계정에 병합(merge)한다. RLS는 익명 insert를 허용하되 타인 데이터 수정은 막도록 설계한다.

## 4. 데이터 모델 (Postgres 테이블)
snake_case 컬럼, `uuid` PK, `created_at timestamptz default now()` 기준.

- **profiles**: `id`(auth.users 참조), `name`, `email`, `avatar_url`, `created_at`
- **apps**: `id`, `slug`(unique), `name`, `tagline`, `description`, `url`, `demo_video_url`, `thumbnail_url`, `category`, `tags text[]`, `maker_id`(profiles), `maker_name`, `maker_links jsonb`(website/x/github), `guest_mode_available bool`, `no_login_trial_available bool`, `embeddable bool`, `status`('draft'|'published'|'hidden'), `created_at`, `updated_at`
- **interactions**: `id`, `user_id?`, `anonymous_id?`, `app_id`, `type`(`impression`|`video_start`|`video_complete`|`skip`|`like`|`save`|`share`|`try_click`|`try_return`|`feedback_submit`), `metadata jsonb`, `created_at`
- **feedback**: `id`, `app_id`, `user_id?`, `anonymous_id?`, `rating`('positive'|'neutral'|'negative'), `tags text[]`(`useful`|`interesting`|`confusing`|`buggy`|`login_blocked`|`too_slow`|`not_for_me`), `comment?`, `created_at`
- **app_stats** (뷰 또는 집계 함수): app별 `views`, `completed_views`, `try_clicks`, `try_returns`, `likes`, `saves`, `shares`, `feedback_count`, `top_feedback_tags jsonb`. interactions/feedback에서 계산.

**RLS**: published 앱은 누구나 read. interactions/feedback은 익명·로그인 모두 insert 가능, 본인(user_id 또는 anonymous_id) 것만 update/delete. apps는 maker 본인만 수정.

### TypeScript 타입 참고
```ts
type App = {
  id: string; slug: string; name: string; tagline: string; description?: string
  url: string; demoVideoUrl: string; thumbnailUrl?: string
  category: string; tags: string[]
  makerId: string; makerName: string
  makerLinks?: { website?: string; x?: string; github?: string }
  guestModeAvailable: boolean; noLoginTrialAvailable: boolean; embeddable: boolean
  status: 'draft' | 'published' | 'hidden'
  createdAt: Date; updatedAt: Date
}

type Interaction = {
  id: string; userId?: string; anonymousId?: string; appId: string
  type: 'impression' | 'video_start' | 'video_complete' | 'skip' | 'like'
      | 'save' | 'share' | 'try_click' | 'try_return' | 'feedback_submit'
  metadata?: Record<string, any>; createdAt: Date
}

type Feedback = {
  id: string; appId: string; userId?: string; anonymousId?: string
  rating?: 'positive' | 'neutral' | 'negative'
  tags: Array<'useful'|'interesting'|'confusing'|'buggy'|'login_blocked'|'too_slow'|'not_for_me'>
  comment?: string; createdAt: Date
}
```

## 5. 화면 / 라우트

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
- 필드: App name, App URL, Tagline, Description, Category, Tags, Demo video(업로드 → Storage), Thumbnail, Maker name, Maker links, `Guest mode available` / `No-login trial` / `Embeddable` 체크박스.
- 영상은 Supabase Storage 업로드. 등록 즉시 피드에 published로 노출.
- 등록은 로그인 필요(여기서 로그인 게이트는 허용).
- 가능하면 **로그인 없이 30초 이상 체험 가능한 앱**을 우선 노출하고, "로그인해야만 볼 수 있는 앱"은 추천 점수에서 불리하게 만든다.

### `/app/[slug]` — App Detail (공유 / SEO용)
- 데모 영상, 설명, Try 버튼, 피드백 요약, 제작자 정보. OG 메타태그 세팅.

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
- Supabase Google OAuth. 로그인은 **진입 장벽이 아니어야** 한다.
- 로그인이 필요한 순간: 앱 등록 / 일정 횟수 이후 피드백 / 저장 목록 영구화 / 대시보드 접근.
- 로그인 유도 카피 예: `Save your discoveries with one click. — Continue with Google`

## 6. 추천 / 피드 정렬 (MVP, 단순하게)
초기 정렬 믹스: **오늘 인기 30% + 최근 등록 30% + 랜덤 40%**.

App Score(인기 정렬용, 서버에서 계산):
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

## 7. 디자인 방향
- 브랜드명 **Glim**. 메인 카피: `Discover what was built today.`
  보조 카피: `Watch 15-second demos, try apps instantly, and leave feedback in seconds.`
- 톤: 글로벌 SaaS, 미니멀. 검정/화이트 기반, **영상과 앱 카드가 주인공**.
- TikTok/Shorts의 직관성 + Linear/Vercel의 깔끔함. 버튼은 적고 강하게.
- 모바일 우선, 데스크톱 대응. 다크 기본.

## 8. 빌드 순서 (이 순서대로 진행)
1. **Phase 1 — 작동하는 피드**: seed 앱 10개, 세로 피드, 영상 자동재생, Try/Like/Save/Share UI, 피드백 모달. (Supabase 읽기 연동)
2. **Phase 2 — 앱 등록**: `/submit` + Storage 업로드 + 등록 앱이 피드에 표시.
3. **Phase 3 — Try View**: `/try/[appId]` iframe + Glim bar + Back 시 피드백.
4. **Phase 4 — 통계**: interaction/feedback 이벤트 저장 + `/dashboard` 지표.
5. **Phase 5 — 로그인**: Google OAuth + 익명→계정 병합 + 저장목록/대시보드 접근.

## 9. 완료 기준 (Definition of Done)
- `pnpm install && pnpm dev` 후 `.env`를 채우고 마이그레이션·seed를 적용하면 `/`에서 영상 피드가 즉시 보이고 스와이프로 넘어간다.
- Try → iframe(또는 fallback) → Back → 피드백 모달 → 다음 앱의 전체 플로우가 동작한다.
- 로그인 없이 좋아요/저장/피드백이 익명으로 기록되고, 로그인 시 병합된다.
- `/submit`으로 새 앱 등록 시 피드와 `/app/[slug]`에 즉시 반영된다.
- `/dashboard`에서 실제 집계 지표가 보인다.
- README에 Supabase 설정 + 실행 단계가 정확히 적혀 있고, `.env.example`을 제공한다.
- TypeScript 타입 에러 없이 `pnpm build`가 통과한다.

## 10. 반드시 피할 것 (재강조)
긴 랜딩페이지 / 첫 화면 로그인 강제 / 카드 리스트만 / 새 탭 기본 UX / 포인트·광고·투자 기능 / AI 추천부터 만들기 / 게시판형 댓글 / 텍스트 설명 중심 UI.

## 11. 핵심 차별점 (한눈에)
| | Product Hunt | **Glim** |
|---|---|---|
| 소비 방식 | 읽는다 | **본다** |
| 체험 | 밖으로 나간다 | **플랫폼 안에서 바로 써본다** |
| 반응 | 좋아요 중심 | **플랫폼 안에서 빠른 피드백** |
| 지표 | 조회수·좋아요 | **실제 사용(Try) 전환율** |

---

이제 위 스펙대로 전체 코드를 작성하고, 마지막에 실행/배포 방법을 README로 정리해라.
