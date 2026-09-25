# 백엔드 API 요약 — 프론트가 부르는 주소 전부

> 2026-09-25 · 프론트 `feature/FE-104-audit` 기준 · 서버 계약은 `src/lib/api/schema.ts`(백엔드 `/v3/api-docs` 에서 생성, 29개 주소)와 맞대 봤습니다.
> 자세한 까닭과 예시는 `BACKEND_ASKS.md` 에 있습니다. 이 문서는 **무엇이 필요한지 한 장으로** 보는 용도입니다.
> 모든 주소 앞에는 `/api/v1` 이 붙고, 로그인 뒤의 요청은 `Authorization: Bearer <accessToken>` 입니다.

## 한눈에

| 구분                   | 개수    | 뜻                                                                                              |
| ---------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| **그대로 씀**          | 15      | 서버에 있고 지금 모양으로 쓴다(아래 6장)                                                        |
| **있지만 바뀌어야 함** | 9       | 주소는 있는데 칸이 모자라거나 뜻이 다르다(아래 2장)                                             |
| **새로 필요함**        | 17 (+2) | 서버에 없어 지금은 목(MSW)이 대신 답한다(아래 3장). +2 는 아직 부르지 않는 사진 올리기 · 지우기 |
| 서버에만 있음          | 7       | 프론트가 부르지 않는다(아래 5장)                                                                |

## 1. 가장 급한 것 — 목을 끄면 바로 깨지는 것

| #   | 무엇이 깨지나                                                          | 부탁                                                                                                                                                  |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ①   | 아이가 보내는 것이 전부 403(「엄마 · 아빠한테 알리기」 · 「고마워요」) | 부모 계정이 **계정 없는 자녀 프로필 이름으로** `POST /families/{id}/cheers` 를 보낼 수 있게(한 기기를 아이가 빌려 쓴다)                               |
| ②   | 오늘 운동 짜기가 한 주 가족 편성을 짜고, 같은 주 두 번이면 409         | `POST /families/{id}/coach/runs` 가 `profileId · date · minutes · quiet · place · focusFactor · withParent` 를 받고, 잠금은 **(프로필, 날짜)** 단위로 |
| ③   | 준비 · 본 · 정리 칸이 사라져 모든 운동이 본운동 한 칸                  | `MissionView.sessions[]` · `ProposalView.sessions[]` · `CreateMissionRequest.sessions[]` · 끝낸 칸은 `participants[].doneSessions`(아래 4장)          |
| ④   | 코치 운동 목표가 1분이 된다                                            | AI 9/17 클립 형식(`duration_sec · phase · order · video.end_sec`)으로 변환                                                                            |
| ⑤   | 육각형의 민첩성이 늘 「안 잼」                                         | 레이더에 민첩성(043 반복옆뛰기)                                                                                                                       |
| ⑥   | 짜는 과정이 끝에 한꺼번에 뜬다                                         | `CoachRun.steps` 를 단계마다 저장                                                                                                                     |
| ⑦   | 운동 칸을 끝내도 기록이 안 남는다                                      | `POST /missions/{id}/sessions/{position}/done`(아래 3장) — 지금 서버의 `activity/timer` 는 칸을 모른다                                                |
| ⑧   | 캘린더 · 이번 주 · 리그 · 레벨이 전부 빈다                             | `GET /families/{id}/calendar` · `GET /profiles/{id}/progress`(아래 3장)                                                                               |

## 2. 있지만 바뀌어야 하는 주소

| 주소                                              | 바꿀 것                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /families/{id}/profiles` · `GET /me`         | `ProfileSummary` 에 `sex`("M"/"F") · `photoUrl`                                                                               |
| `GET /me`                                         | 이 계정 **자기** 프로필을 알 수 있게(`selfProfileId`). 없으면 프론트는 보호자 프로필 → 첫째 순으로 「나」 를 고른다           |
| `POST /families/{id}/profiles`                    | 가입 때 받은 `heightCm · weightKg` 를 받는다                                                                                  |
| `GET /profiles/{id}/fitness-tests/latest`         | 응답에 그 회차의 `heightCm · weightKg`                                                                                        |
| `POST /families/{id}/cheers`                      | `stickerId`(지금은 `emoji` 칸에 싣는다) · `kind`(`DONE` \| `PRAISE` \| `THANKS`) · `replyToCheerId`(고마워요가 답하는 스티커) |
| `POST /families/{id}/coach/runs`                  | 1장 ②                                                                                                                         |
| `GET /families/{id}/missions` · `POST …/missions` | 1장 ③. 여러 날 한 번에 `dates[]`, `title` 길이 제한 알려 주기                                                                 |
| `GET /families/{id}/fitness-map`                  | `members[].photoUrl`, 레이더에 민첩성(1장 ⑤)                                                                                  |

## 3. 새로 필요한 주소

| 기능                | 주소                                                                | 응답 모양(요점)                                                                                                                                                                                                                                                                                        | 쓰는 화면                                            |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 날짜별 기록         | `GET /families/{id}/calendar?profileId=&from=&to=`                  | `{ profileId, from, to, days: [{ date, minutes, plannedMinutes, entries[], stickers[], rest? }] }` — 아무것도 안 한 날은 넣지 않는다. 범위 최대 42일                                                                                                                                                   | 캘린더 · 하루 기록 · 이번 주 링 · 요일 탑 · 대시보드 |
| 레벨 · 업적 · 연속  | `GET /profiles/{id}/progress`                                       | `{ level, xp, levelFloorXp, nextLevelXp, streakDays, activeDays, achievements[{code,title,description,earnedAt}], recentXp[] }` — **부모 프로필도**                                                                                                                                                    | 아이 홈 · 레벨과 업적 · 대시보드 · 리그 프로필       |
| 운동 한 칸 끝       | `POST /missions/{id}/sessions/{position}/done`                      | 요청 `{ profileId, activeSeconds, startedAt, endedAt }` → `{ position, verifiedBy, missionProgress, missionCompleted, xpGained }` — **그 사람의 진행**. `xpGained` 는 `/progress` 가 실제로 는 만큼. 참여자 아님 403 `NOT_A_PARTICIPANT` · 절반도 안 함 422 `TOO_SHORT` · 동의 철회 `CONSENT_REQUIRED` | 운동하기                                             |
| 운동할 수 있는 시간 | `GET · PUT /profiles/{id}/availability`                             | `{ profileId, slots: [{ day: "MON"…, start: "HH:mm", minutes }] }`                                                                                                                                                                                                                                     | 첫 시작 · 운동 시간 설정 · 편성 기본값               |
| 운동 클립           | `GET /clips?factor=&phase=&quiet=&q=&list=&profileId=`              | `{ clips: [{ clipId, videoId, startSec, endSec, title, factor, phase, homeOk, quiet, props, favorited }], total }` — AI 의 `video_clips.csv`(48편 · 491클립)                                                                                                                                           | 운동 찾기 · 직접 짜기 · 홈 영상 줄                   |
| 클립 즐겨찾기       | `POST /clips/{clipId}/favorite`                                     | 요청 `{ profileId, favorited }`                                                                                                                                                                                                                                                                        | 운동 찾기                                            |
| 받은 칭찬           | `GET /families/{id}/cheers?toProfileId=&size=`                      | `{ cheers: [{ cheerId, fromProfileId, fromName, toProfileId, message, missionId, stickerId, createdAt }] }`                                                                                                                                                                                            | 아이 홈 · 부모 칸 · 캘린더                           |
| 알림                | `GET /notifications?profileId=` · `POST /notifications/read`        | `{ items: [{ notificationId, kind, title, body, aboutProfileId, fromProfileId, missionId, date, stickerId, createdAt, read }], unread }` — `kind`: `KID_DONE` · `REMEASURE` · `PRAISE` · `MISSION_READY` · `ACHIEVEMENT` · `KID_THANKS`                                                                | 종 · 알림                                            |
| 측정 이력           | `GET /profiles/{id}/fitness-tests?size=`                            | `{ tests: [{ fitnessTestId, testedOn, overallPercentile, heightCm, weightKg }] }`                                                                                                                                                                                                                      | 아이 기록(점수 흐름 · 키 자)                         |
| 오늘 제안 다시 찾기 | `GET /families/{id}/coach/runs/latest`                              | `CoachRunView`(없으면 404)                                                                                                                                                                                                                                                                             | 부모 홈 「AI 제안이 와 있어요」                      |
| 초대코드 미리 보기  | `GET /invites/{claimCode}`                                          | `{ familyName, profileName, role, ageGroup, invitedByName, expiresAt }` · 없는 코드 404 · 기한 지남 410                                                                                                                                                                                                | 초대코드 넣기                                        |
| 가족 리그           | `GET /families/{id}/league?month=YYYY-MM`                           | `{ month, tier, rate, rank, groupSize, promote, demote, daysLeft, standings[{familyName, rate, me}] }` — **셀 날이 없으면 `rate` · `rank` 는 null**                                                                                                                                                    | 리그 · 대시보드 · 부모 홈 칸                         |
| 쉬는 날 카드        | `GET · POST /families/{id}/rest-days` · `DELETE …/rest-days/{date}` | `{ month, perMonth: 2, left, days: ["YYYY-MM-DD"] }`                                                                                                                                                                                                                                                   | 리그 · 대시보드 · 캘린더                             |
| 프로필 사진         | `PUT · DELETE /profiles/{id}/photo`                                 | multipart(jpeg ≤ 1MB) → `{ photoUrl }`                                                                                                                                                                                                                                                                 | 첫 시작 · 설정 · 가족 관리(지금은 기기에만 둔다)     |

리그 · 쉬는 날에 붙는 규칙:

- **달성률 = 잡힌 운동 날 중 해낸 날 ÷ 잡힌 운동 날**, 아이들 평균. 잡힌 날은 그 아이에게 운동이 등록된 날이다(가입 전 날은 세지 않는다)
- 한 달이 한 판 — 1일에 위 `promote` 집은 한 티어 올리고 아래 `demote` 집은 내린다. 새 가족은 브론즈
- 쉬는 날은 한 달 두 장 · 가족 단위 · 부모만 · 오늘부터 이번 달 안. 캘린더에 `rest: true`, **이어서 한 날은 건너서 잇되 더하지 않고**, 달성률에서 뺀다

## 4. 칸(세션) 모양 — 1장 ③ 과 3장 「운동 한 칸 끝」 이 쓰는 것

```
sessions: [
  { position: 1, phase: "WARMUP" | "MAIN" | "COOLDOWN", title, factor, minutes,
    clip: { videoId, startSec, endSec } }
]
participants: [
  { profileId, name, progress, completed, verifiedBy: "TIMER" | "VIDEO_PROGRESS" | "SELF_REPORT" | null,
    needsGuardianCheck, doneSessions: [1, 2] }        // 이 사람이 끝낸 칸의 position
]
```

- **끝냈는지는 사람마다다.** 칸에 `completed` 하나를 두면 형제가 같은 운동을 받았을 때(직접 짜기에서 여럿을 고른다)
  한 아이가 끝낸 칸이 다른 아이에게도 끝난 칸이 된다. 같이 하기로 한 보호자는 아이가 끝낸 칸을 같이 끝낸다 — 형제는 저마다
- 칸이 없으면 프론트는 본운동 한 칸만 그린다(준비 · 정리를 지어내지 않는다)
- `verifiedBy` 는 서버가 아는 것만 — 걸음수 같은 자기 신고는 `SELF_REPORT` 이고 부모 확인(`…/participants/{profileId}/confirm`)이 남는다.
  확인하면 `completed: true` · `needsGuardianCheck: false`, 목표에 못 미쳤으면 422 `TARGET_NOT_REACHED`
- 직접 짠 운동은 **보낸 차례대로** 한다(`position`). 프론트가 준비 · 본 · 정리로 다시 줄 세우지 않는다

## 5. 서버에만 있고 프론트가 부르지 않는 것

| 주소                                                                        | 사정                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /coach/chat`                                                          | 코치 대화창은 9/23 회의에서 없앴다 — 추천은 버튼(편성)으로 받는다                |
| `GET /families/{id}/report/weekly`                                          | 주간 리포트 화면을 뺐다. 이번 주는 캘린더 응답으로 그린다                        |
| `GET /videos` · `POST /videos/{id}/favorite` · `POST /videos/{id}/progress` | 영상 한 편 단위라 동작을 따로 고를 수 없다 — 3장 `/clips` 로 바꾸고 싶다         |
| `POST /missions/{id}/activity/timer` · `…/activity/steps`                   | 칸을 몰라 3장 「운동 한 칸 끝」 으로 대신한다. 걸음수 자기 신고 화면은 지금 없다 |

`POST /auth/refresh` 는 `fetch` 로 직접 부른다(토큰 만료 때). 그대로 쓴다.

## 6. 그대로 쓰는 주소

`POST /auth/dev-login` · `POST /auth/google` · `POST /auth/refresh` · `POST /families` · `POST /profiles/{id}/invite` ·
`POST /profiles/claim` · `PATCH /profiles/{id}/support-mode` · `PATCH /profiles/{id}/consent` · `GET /fitness/items?ageGroup=` ·
`POST /profiles/{id}/fitness-tests` · `POST /profiles/{id}/predictions` · `GET /coach/runs/{id}` · `POST /coach/runs/{id}/approve` ·
`POST /coach/runs/{id}/reject` · `POST /missions/{id}/participants/{profileId}/confirm`

## 7. 공통 약속

- **오류는 봉투로** — `{ "error": { "code": "CONSENT_REQUIRED", "message": "…" } }`. 화면은 `code` 로 가르고 `message` 는 보이지 않는다.
  모르는 코드면 그 화면의 물러설 문구가 뜬다
- 화면이 가르는 코드: `UNAUTHORIZED` · `NOT_A_PARENT` · `NOT_SAME_FAMILY` · `CONSENT_REQUIRED` · `CONSENT_WITHDRAWN` · `NOT_MEASURABLE` ·
  `NO_ITEMS` · `ITEM_NOT_ALLOWED` · `UNKNOWN_ITEM` · `ITEM_NOT_FOR_AGE_GROUP` · `DUPLICATE_DATE` · `NO_FITNESS_TEST` · `ALREADY_RUN_THIS_WEEK` ·
  `RUN_IN_PROGRESS` · `ALREADY_APPROVED` · `TEMPORARILY_UNAVAILABLE` · `ALREADY_IN_FAMILY` · `CODE_NOT_FOUND` · `CODE_EXPIRED` ·
  `ALREADY_CLAIMED` · `ALREADY_MEMBER` · `NOT_APPLICABLE` · `INVALID_SLOT` · `INVALID_DATE` · `ALREADY_REST_DAY` · `NO_REST_CARD_LEFT` ·
  `ALREADY_MOVED` · `TARGET_NOT_REACHED`
- 본문 없는 성공(204 · 빈 200)도 성공으로 읽는다
- 로그아웃 · 로그인 · 초대 수락 때 프론트가 받아 둔 값을 다 비운다 — 로그인 응답에 `/me` 와 같은 `nextStep · profiles` 를 얹어 주면
  스플래시가 한 번 더 묻지 않는다(지금 계약 그대로)
- 구글 로그인의 `state` 는 프론트가 만들고 맞춰 본다. 초대코드는 `POST /auth/google` 본문의 `claimCode` 로만 간다
- 날짜는 `YYYY-MM-DD`(한국 날짜), 시각은 ISO-8601. 한 주는 월요일에 시작한다
- 모르는 값은 0 이 아니라 `null` — 백분위 · 등급(만 7~10세 규준 빈칸) · 리그 달성률 · 순위
- 서버가 정하는 문구(`headline` · `topPercentText` · 업적 이름)는 프론트가 고쳐 쓰지 않는다
- **줄지 않는 값**: 경험치 · 레벨 · 운동한 날(나무) · 받은 업적은 한 번 쌓이면 줄지 않는다(규칙 10). 최근 며칠만 세는 창으로 셈하면
  날마다 레벨이 내려간다. 시간표를 고쳐도 지난날의 달성률은 그대로다
- 예측(`/predictions`)의 점에는 p10 · p50 · p90 이 다 있어야 그린다 — 띠 없이 가운데 선만 그리면 정해진 앞날처럼 보인다(규칙 3)
