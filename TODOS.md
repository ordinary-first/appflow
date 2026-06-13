# TODOS

> CEO 리뷰(2026-06-13, `~/.gstack/projects/ordinary-first-appflow/ceo-plans/2026-06-13-platform-stabilization-growth.md`)에서 연기된 항목 + 기존 HANDOFF §9 잔여분.

## 즉시

- [ ] **디자인 리뷰 (`/gstack-design-review`)** — 검색, 트렌딩, 대시보드 2.0 추이 바(`TrendBars`), 배지 임베드 프리뷰(`BadgeEmbed`), 피드백→리뷰 모달. 코드만 검증됐고 실제 화면 폴리시 미확인. Effort: S.
- [ ] **아웃리치 DM 시작** — `scripts/twitter-outreach.mjs` 활용해 unclaimed 30개 앱 메이커에게 `?utm_source=dm-x` 링크 전송. 검색·클레임 랜딩·UTM 측정 모두 준비 완료. 첫 4주 목표: 클레임 3건.
- [ ] **피드 UI 이슈** — A) 브라우저 기본 영상 컨트롤 겹침 억제 + 뮤트 버튼 명시 B) 하단 Try 버튼 중복 제거, 텍스트 하단 이동 C) 스와이프 시 다음 영상 프리로드(`preload="auto"`) 적용.

## P2 — 다음 스프린트 후보

- [ ] **주간 인앱 다이제스트 (E6b)** — 팔로워·저장 활동 있는 메이커에게 주 1회 인앱 알림 ("이번 주 BirdsEyes: Try 23, 저장 7"). `app_daily_stats` 인프라(E2) 안정화 후. 이메일 발송은 스팸 리스크 원칙상 별도 opt-in 결정 필요. Effort: M→S (CC).
- [ ] **GitHub Actions CI** — push 시 `pnpm typecheck` + `pnpm test`(vitest) 실행. 테스트 인프라가 이번 스프린트에 생기므로 회귀 그물을 자동화. Effort: S.
- [ ] **seed-window 페이지네이션 (추천 피드)** — 설계 문서 확정 모델. 트리거: published 포스트 200개 돌파. 현재는 후보풀 LIMIT 200 + 40장 단일 배치로 충분. Effort: M→S (CC).

## P3 — 시점 도래 시

- [ ] **R2 presigned URL 직접 업로드** — 업로드 한도 25MB 상향이 필요해질 때. S3 호환 API 토큰 필요. 현 formData 경유는 Workers 메모리 버퍼링 한계. Effort: M.
- [ ] **검색 FTS 전환** — 카탈로그 수백 개 돌파 시 LIKE → SQLite FTS5 (D1 지원 확인 필요) 또는 태그/카테고리 가중 랭킹. Effort: M.
- [ ] **클레임 알림 이메일 (opt-in)** — 설계 문서 Phase 6 이후 원칙 유지.
- [ ] **Cloudflare Stream 전환** — 영상 수 증가 시 R2 mp4 → Stream (기존 HANDOFF).
- [ ] **개인화 추천** — interaction 로그 기반 카테고리 개인화 (기존 HANDOFF).
- [ ] **관리자 UI** — 클레임 승인(현재 x-admin-token curl)·앱 승인/반려 (기존 HANDOFF).
- [ ] **아웃리치 상태 DB 테이블화** — 스프레드시트 운영에서 클레임 실적이 생기면 재평가 (CEO 플랜 E4의 YAGNI 가드).
- [ ] **팔로잉 피드 텍스트 리뷰 카드** — mediaType='text' 전환 리뷰가 현재 앱 페이지 리뷰 탭에만 노출 (비디오 카드 피드에 텍스트 전용 카드 디자인 부재). 디자인 리뷰에서 카드 형태 확정 후 팔로잉 피드에 포함. Effort: S.
