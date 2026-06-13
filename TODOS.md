# TODOS

> CEO 리뷰(2026-06-13, `~/.gstack/projects/ordinary-first-appflow/ceo-plans/2026-06-13-platform-stabilization-growth.md`)에서 연기된 항목 + 기존 HANDOFF §9 잔여분.

## 즉시

- [x] **피드 UI 이슈** — A) YouTube 임베드 `controls=0` + postMessage 재생 제어로 컨트롤 겹침 제거, 상단 그라데이션 마스킹, 뮤트 버튼 추가 B) 하단 Try 버튼 중복 제거, 중앙 단일 반투명 CTA 하단 이동 C) `near` 카드 프리로드(mp4 `preload="auto"` + YouTube iframe near 마운트). (커밋 `fc307ee`)
- [x] **디자인 리뷰** — 검색/트렌딩/대시보드/배지/피드백 모달 Codex 소스 감사 + Claude Preview 시각 점검. 수정: 검색 로딩 상태, 배지 복사 버튼 터치 타깃·실패 피드백, 피드백 입력 aria-label, 트렌딩 빈 상태 카피, 검색 제목. (커밋 `8235cd4`~`457bc0b`)
- [ ] **아웃리치 (마케팅, 별도 세션)** — `scripts/twitter-outreach.mjs`는 DM이 아니라 **공개 리플**이고 대상이 광범위(off-target 포함). UTM(`utm_source=tw-reply`)은 추가 완료. unclaimed 앱은 `maker_id=glim-system`이라 메이커 핸들 없음 → "30명 직접 DM"은 핸들 확보 또는 다른 채널 필요. 마케팅 세션에서 진행.

### 디자인 리뷰 보류 항목 (P3, 판단/리스크 큼)
- [ ] **대시보드 통계 위계** — 8개 stat이 균등 가중. Try 전환(핵심 지표)에 시각 위계 부여 검토. 메이커 데이터 표시 변경이라 신중히.
- [ ] **균일 `rounded-xl/2xl` 라디우스** — AI-slop 신호. 카드/입력/버튼 라디우스 위계화 검토 (광범위·미관, 저우선).

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
