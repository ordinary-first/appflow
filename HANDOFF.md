# Glim — 작업 인수인계 (Handoff)

> **이 문서는 Claude ↔ Codex ↔ 누구든 다음 작업자를 위한 공유 로그다.**
> 작업을 진행한 뒤에는 반드시 이 파일의 **"작업 로그"** 섹션에 날짜·작업자·변경사항을 추가하고 커밋해라.
> 그래야 Claude로 다시 넘어올 때 혹은 다른 Codex 세션이 이어받을 때 컨텍스트 손실 없이 이어갈 수 있다.

---

## 1. 프로젝트 개요

**Glim** = TikTok-style 신생 앱 발견 플랫폼.
- 세로 스냅 피드에서 15초 데모 영상 자동재생
- **Try** 버튼으로 외부 앱을 플랫폼 안(iframe)에서 바로 체험
- 체험 후 3초 태그 피드백 (7개 태그 + 선택적 한 줄 코멘트)
- 제작자 대시보드: 조회수 → Try 클릭 전환율, Top friction

브랜치: `claude/keen-noether-23jwsg`

---

## 2. 기술 스택 (고정)

| 계층 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) + TypeScript |
| 런타임/호스팅 | **Cloudflare Workers** (`@opennextjs/cloudflare` 1.x) |
| DB | **Cloudflare D1** (SQLite) + **Drizzle ORM** |
| 파일 저장 | **Cloudflare R2** (egress 무료) |
| 인증 | **better-auth** 1.x + Google OAuth |
| CSS | Tailwind CSS 4 + 직접 작성한 shadcn 스타일 UI 컴포넌트 |
| 패키지 | pnpm |

---

## 3. 파일 구조 (현재 구현 완료)

```
/
├── wrangler.toml                 # Workers 설정, D1/R2 바인딩
├── drizzle.config.ts             # Drizzle → D1 설정
├── drizzle/0000_init.sql         # 전체 스키마 마이그레이션 (적용 완료)
├── seed.sql                      # 샘플 앱 12개 (로컬/원격 DB에 적용 가능)
├── open-next.config.ts           # OpenNext Workers 빌드 설정
├── cloudflare-env.d.ts           # Workers 바인딩 타입 (DB, BUCKET, secrets)
├── .env.example                  # 필요한 환경변수 목록
│
└── src/
    ├── app/
    │   ├── page.tsx                  # ★ Home Feed (서버 컴포넌트 → Feed 클라이언트)
    │   ├── layout.tsx                # 루트 레이아웃 + MergeOnLogin
    │   ├── globals.css               # Tailwind 4 + 다크 테마 + .feed-snap 스냅 CSS
    │   ├── try/[appId]/page.tsx      # ★ Try View 페이지 (서버 → TryView 클라이언트)
    │   ├── app/[slug]/page.tsx       # 앱 상세 / 공유 / SEO (OG 메타태그)
    │   ├── submit/page.tsx           # 앱 제출 페이지 (로그인 게이트)
    │   ├── dashboard/page.tsx        # ★ Maker Dashboard (서버 컴포넌트)
    │   └── api/
    │       ├── auth/[...all]/route.ts   # better-auth 핸들러 (GET + POST)
    │       ├── interactions/route.ts    # POST: 이벤트 기록 (익명·로그인 모두)
    │       ├── feedback/route.ts        # POST: 태그 피드백 저장
    │       ├── apps/route.ts            # POST: 앱 등록 (로그인 필수)
    │       ├── upload/route.ts          # POST: R2 파일 업로드 (로그인 필수)
    │       ├── media/[...key]/route.ts  # GET: R2 스트리밍 (Range 지원, 영상 탐색 가능)
    │       └── merge/route.ts           # POST: 익명 데이터 → 계정 병합
    │
    ├── components/
    │   ├── feed/
    │   │   ├── Feed.tsx              # ★ 핵심: 스냅 피드, 키보드 탐색, 로그인 넛지
    │   │   └── AppCard.tsx           # ★ 카드: 영상 재생/완료 감지, 액션 레일
    │   ├── TryView.tsx               # ★ iframe + Glim bar + fallback
    │   ├── FeedbackModal.tsx         # ★ 3초 피드백 모달
    │   ├── SubmitForm.tsx            # 앱 등록 폼 (R2 업로드 포함)
    │   ├── GoogleSignIn.tsx          # Google 로그인 버튼
    │   ├── MergeOnLogin.tsx          # 로그인 시 익명 데이터 자동 병합 트리거
    │   └── ui/
    │       ├── button.tsx            # Button (variant: default/secondary/ghost/outline)
    │       ├── dialog.tsx            # Dialog (ESC 닫기, 오버레이 클릭 닫기)
    │       └── input.tsx             # Input, Textarea, Label
    │
    ├── db/
    │   ├── schema.ts                 # Drizzle 스키마 전체 (user/session/account/verification + apps/interactions/feedback)
    │   └── index.ts                  # getDb(), getEnv() — Workers request context에서 D1/R2 접근
    │
    └── lib/
        ├── auth.ts                   # getAuth() (per-request), getSessionUser()
        ├── auth-client.ts            # 클라이언트용 authClient, useSession, signIn, signOut
        ├── feed.ts                   # getFeedApps() (30/30/40 믹스 + App Score), getAppStats()
        ├── track.ts                  # track(appId, type) — fire-and-forget, once 중복 방지
        ├── anon.ts                   # getAnonymousId() — localStorage + cookie
        ├── types.ts                  # FeedItem (서버→클라이언트 직렬화 타입)
        └── utils.ts                  # cn(), slugify(), youtubeVideoId()
```

---

## 4. 데이터 모델 (D1 / SQLite)

### better-auth 테이블 (자동 관리)
`user`, `session`, `account`, `verification` — better-auth의 Drizzle 어댑터가 관리.

### Glim 테이블

**`apps`**
```
id TEXT PK | slug TEXT UNIQUE | name | tagline | description | url
demo_video_url  -- R2 mp4 경로 (/api/media/uploads/...) 또는 외부 URL
youtube_url     -- YouTube URL (보조, 광고 뜸. R2 없을 때만 fallback)
thumbnail_url | category | tags JSON | maker_id FK | maker_name
maker_links JSON (website/x/github) | guest_mode_available BOOL
no_login_trial_available BOOL | embeddable BOOL
status ENUM('draft','published','hidden') | created_at | updated_at
```

**`interactions`** (이벤트 로그, insert-only)
```
id | user_id? | anonymous_id? | app_id FK | type ENUM(
  impression | video_start | video_complete | skip | like | save | share
  try_click | try_return | feedback_submit
) | metadata JSON | created_at
```

**`feedback`** (3초 태그 피드백)
```
id | app_id FK | user_id? | anonymous_id?
rating ENUM(positive|neutral|negative)
tags JSON (useful|interesting|confusing|buggy|login_blocked|too_slow|not_for_me)
comment TEXT | created_at
```

> ⚠️ **D1엔 RLS가 없다.** 모든 권한 검증(본인 앱만 수정, 본인 데이터만 병합)은 API route 서버 레이어에서 한다. 절대 클라이언트에서 D1에 직접 쓰지 말 것.

---

## 5. 핵심 설계 결정 (왜 이렇게 했는지)

### 익명 우선 (Anonymous-first)
- `getAnonymousId()` → `crypto.randomUUID()` → localStorage + cookie `glim_anon_id`
- 모든 interaction/feedback API는 `anonymousId`로 insert 가능
- 로그인 시 `/api/merge` → `UPDATE ... SET user_id = ? WHERE anonymous_id = ? AND user_id IS NULL`로 병합
- 세션 없이도 좋아요/저장은 localStorage에 임시 보존 (`LIKES_KEY`, `SAVES_KEY`)

### 로그인 넛지 (부드럽게, 강제 아님)
`Feed.tsx`의 `maybeNudge()`:
```
좋아요 3회 OR 저장 1회 OR 피드백 1회 → 로그인 권유 Dialog
"Maybe later" 누르면 localStorage에 플래그 → 다시 안 뜸
```

### 영상 재생 전략
1. `demo_video_url` (R2 mp4) → `<video muted autoplay loop playsinline>` — 광고·브랜딩 없음, egress 무료
2. `youtube_url`만 있으면 → YouTube IFrame embed — **광고가 뜰 수 있음**, R2 권장
3. 둘 다 없으면 → Play 아이콘 placeholder
- **활성 카드 1개만** 재생/마운트 (YouTube iframe도 포함)
- `video_complete` 감지: `onTimeUpdate`에서 `currentTime >= duration - 0.35`

### Try View fallback
- `embeddable: false`거나 iframe이 6초 안에 `onLoad`를 안 발사하면 → blocked 상태
- blocked 상태: "새 창에서 열립니다" + `<a target="_blank">` + "I'm done — leave feedback" 버튼

### App Score (피드 정렬)
```
score = completedViews/views * 2
      + tryClicks/views * 5
      + feedbackCount/views * 3
      + saves/views * 2
      - skips/views * 2
      - loginBlocked/views * 3
```
피드 믹스: `popular 30% | recent 30% | random 40%` — 첫 카드는 high-score 앱

### better-auth per-request 패턴
Workers에서는 D1 바인딩이 request context 안에서만 존재함. 따라서 `betterAuth({...})`를 모듈 수준에서 생성하면 안 되고, `getAuth()`를 매 요청마다 호출해야 함. `src/lib/auth.ts` 참고.

---

## 6. 환경변수 / 시크릿

로컬: `.dev.vars` 파일 (gitignore됨)
프로덕션: `wrangler secret put NAME`

| 이름 | 설명 |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`로 생성 |
| `BETTER_AUTH_URL` | 앱 공개 URL (예: `https://glim.example.com`) |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 |

D1 바인딩 `DB`, R2 바인딩 `BUCKET`은 `wrangler.toml`에서 설정 (시크릿 아님).

---

## 7. 자주 쓰는 명령어

```bash
pnpm install            # 의존성 설치
pnpm dev                # 로컬 개발 (miniflare D1/R2 포함)
pnpm build              # Next.js 빌드 (타입 검사 포함)
pnpm typecheck          # tsc --noEmit
pnpm cf:build           # OpenNext Workers 번들 빌드 (.open-next/)
pnpm deploy             # cf:build + wrangler deploy

pnpm db:generate        # 스키마 변경 후 마이그레이션 SQL 생성
pnpm db:migrate:local   # 로컬 D1에 마이그레이션 적용
pnpm db:migrate:remote  # 원격 D1에 마이그레이션 적용
pnpm db:seed:local      # 로컬 D1에 seed.sql 실행 (샘플 앱 12개)
pnpm db:seed:remote     # 원격 D1에 seed.sql 실행
```

---

## 8. 검증 완료 사항

| 항목 | 결과 |
|---|---|
| `pnpm build` (Next.js) | ✅ |
| `pnpm typecheck` (tsc --noEmit) | ✅ |
| `pnpm cf:build` (Workers 번들) | ✅ |
| 로컬 D1 마이그레이션 + seed 12개 | ✅ |
| 홈 피드 200 / 앱 상세 200 / Try 200 / Submit 200 / Dashboard 200 | ✅ |
| 익명 interaction POST (impression, try_click) | ✅ |
| 익명 feedback POST → 상세 페이지 집계 반영 | ✅ |
| 비로그인 업로드/앱등록 → 401 거부 | ✅ |
| 잘못된 interaction type → invalid payload 거부 | ✅ |

---

## 9. 남은 작업 (TODO)

Codex 또는 다음 작업자가 이어서 할 것들. 우선순위 순으로 정렬.

### 필수 (MVP 완성도)
- [x] **`wrangler.toml`에 실제 D1 database_id 채우기** — `glim-db` production D1 ID 반영 완료
- [x] **Google OAuth Redirect URI 설정** — Google Cloud Console에서 localhost/production callback 등록 완료
- [ ] **R2 CORS 설정** — R2 버킷에서 영상 업로드 직접 presigned URL 방식으로 전환하려면 필요 (현재는 Worker 경유 업로드라 불필요)
- [x] **signOut 버튼** — 피드 헤더와 Dashboard에 로그인 사용자 칩 + 로그아웃 버튼 추가 완료
- [x] **앱 수정/삭제** — Dashboard Hide/Unhide/Delete UI와 owner-only `PATCH`/`DELETE /api/apps/[id]` 추가 완료

### 개선 (UX)
- [ ] **피드 무한 스크롤** — 현재 서버에서 40개를 한번에 로드. DB 커지면 페이지네이션 필요 (`/api/feed?cursor=`)
- [ ] **저장 목록 페이지** — 로그인 사용자의 `save` interaction으로 저장된 앱 목록 (`/saved`)
- [ ] **카테고리 필터** — 피드 상단 필터 칩 (AI / Productivity / DevTools …)
- [ ] **좋아요 상태 서버 동기화** — 현재 localStorage만. 로그인 사용자는 DB 기준으로 초기화 필요
- [ ] **Try View에서 뒤로가기 시 피드 스크롤 위치 복원** — 현재 `router.push('/')` 시 피드가 처음으로 돌아감. `?feedback=appId` 쿼리 파라미터로 피드백 모달 여는 로직은 이미 있음 (`Feed.tsx` useEffect)

### 나중에 (Post-MVP)
- [ ] **Cloudflare Stream 전환** — 영상 수 많아지면 R2 mp4 → Stream (인코딩/적응 화질)
- [ ] **개인화 추천** — 현재 30/30/40 랜덤 믹스. interaction 로그 활용한 간단한 카테고리 기반 개인화
- [ ] **앱 자동 스크래핑** — Product Hunt / Lovable Showcase 등에서 앱 크롤 후 등록 (관리자 도구)
- [ ] **관리자 모드** — 앱 승인/반려, 시드 앱 관리

---

## 10. 작업 로그 (반드시 업데이트)

> **규칙**: 작업 완료 후 여기에 한 줄 이상 추가 후 커밋. 다음 작업자(Claude/Codex 누구든)가 이 로그를 읽고 컨텍스트를 파악한다.

| 날짜 | 작업자 | 브랜치 | 내용 |
|---|---|---|---|
| 2026-06-11 | Claude (claude-fable-5) | `claude/keen-noether-23jwsg` | 전체 MVP 원샷 구현: 피드, Try View, 피드백 모달, Submit, Dashboard, 인증(better-auth), 익명→계정 병합, R2 스트리밍, D1 스키마+마이그레이션, 시드 12개. 빌드/타입체크/Workers 번들 전부 통과. |
| 2026-06-11 | Claude (claude-sonnet-4-6) | `claude/keen-noether-23jwsg` | 이 HANDOFF.md 작성. 구현 인벤토리, 설계 결정 근거, TODO 목록 정리. |
| 2026-06-11 | Codex (GPT-5) | `claude/keen-noether-23jwsg` | Google OAuth Client 생성 및 Cloudflare `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` secrets 주입, unused initial OAuth client 삭제, WSL OpenNext/Workers 재배포, OAuth 재로그인 smoke 통과. 작업 1 Dashboard/Auth UX 반영: UserMenu signOut, Dashboard Hide/Delete UI, owner-only `PATCH`/`DELETE /api/apps/[id]`, production D1/BETTER_AUTH_URL 설정. WSL typecheck/build/deploy 통과. |

---

## 11. Codex에게 이어서 맡기는 작업

아래 작업을 우선적으로 진행해줘. **각 작업 완료 후 위 "10. 작업 로그"에 날짜/작업자/내용을 추가하고 브랜치(`claude/keen-noether-23jwsg`)에 커밋·푸시하라.** Claude로 다시 세션이 넘어올 수 있으니 로그가 정확해야 한다.

### 즉시 할 것

1. **signOut 버튼 추가** (`src/components/feed/Feed.tsx`, Dashboard)
   - 로그인 상태에서 상단 헤더에 아바타/이름 + 로그아웃 버튼
   - `signOut()` from `@/lib/auth-client`

2. **앱 수정/숨기기** (`src/app/dashboard/page.tsx`, 새 API route 추가)
   - Dashboard의 각 앱 패널에 "Hide" / "Delete" 버튼
   - `PATCH /api/apps/[id]` — status를 'hidden'으로 (makerId 서버 검증 필수)
   - `DELETE /api/apps/[id]` — 앱 삭제 (makerId 서버 검증 필수)

3. **피드 무한 스크롤 / 페이지네이션** (`src/app/page.tsx`, `src/lib/feed.ts`)
   - `getFeedApps(limit, cursor?)` 형태로 확장
   - 클라이언트에서 마지막 카드 도달 시 다음 배치 fetch
   - Intersection Observer 기반 (`Feed.tsx`에 이미 IO 있음)

4. **저장 목록 페이지** (`src/app/saved/page.tsx`)
   - 로그인 사용자: DB의 `save` interaction으로 저장한 앱 목록
   - 비로그인 사용자: localStorage의 `glim_saves`에서 읽어서 앱 카드로 표시

### 참고할 기존 패턴
- 새 API route 만들 때: `getSessionUser()`로 인증, 소유권 검증은 반드시 서버에서
- D1 쿼리: `getDb()`로 클라이언트 가져오고 Drizzle 사용 (`src/db/index.ts`)
- 새 페이지: `export const dynamic = "force-dynamic"` (D1 읽어야 하므로)
- 스키마 변경 시: `pnpm db:generate` → `pnpm db:migrate:local` → 로컬 검증 후 `pnpm db:migrate:remote`
