# API 계약 제안 — 프론트엔드 → 백엔드

> 백엔드 구현 전에 **프론트가 먼저 제안하는 요청·응답 모양**입니다.
> 프론트는 이 계약대로 MSW 목 서버를 만들어 화면을 먼저 만들고 있습니다.
> 실제 구현이 이것과 다르면 화면을 통째로 고쳐야 하므로, **구현 시작 전에 리뷰를 부탁드립니다.**
>
> 원본 기획: `family-fitness-be` 레포의 `docs/user-flow.md`, `docs/erd.md`
> 프론트 타입 정의: [`src/lib/api/types.ts`](../src/lib/api/types.ts)

## 먼저 정해야 할 것

구현보다 이게 급합니다. 답에 따라 프론트 코드가 크게 갈립니다.

| # | 질문 | 프론트가 지금 가정한 것 |
|---|---|---|
| 1 | **로그인 후 프론트에 뭘 주나요?** 세션 쿠키 / JWT / Authorization 헤더 | `HttpOnly` 세션 쿠키. 모든 요청에 `credentials: "include"` 로 보냅니다 |
| 2 | **카카오 OAuth 콜백을 백엔드가 받나요?** | 예. 프론트는 `/oauth2/authorization/kakao` 로 이동만 시키고, 백엔드가 처리 후 프론트로 리다이렉트합니다 |
| 3 | **`POST /auth/dev-token` 을 로컬에서 쓸 수 있나요?** | 씁니다. 카카오 로그인 없이 화면 개발을 하려면 필요합니다 |
| 4 | **날짜·시각 형식** | 날짜 `YYYY-MM-DD`, 시각 ISO-8601 UTC (`2026-08-30T11:00:00Z`) |
| 5 | **JSON 키 표기** | `camelCase` |
| 6 | **에러 응답 형식** | 아래 "공통 규칙" 참고 |
| 7 | **백분위·등급을 서버가 계산해서 주나요?** | 예. 프론트는 계산하지 않고 받은 값을 표시만 합니다 |

## 공통 규칙

### 경로

모든 업무 API 는 `/api/v1` 아래에 둡니다.

프론트는 이 경로를 **상대 경로로** 부릅니다. Next 의 rewrites 가 백엔드로 넘기므로
브라우저 입장에서는 프론트와 백엔드가 같은 출처가 됩니다.

```
브라우저   →  /api/v1/families/{id}/fitness-map     (같은 출처로 보임)
Next 서버  →  http://localhost:8080/api/v1/...
```

**그래서 백엔드에 CORS 설정이 필요 없습니다.** 세션 쿠키도 그냥 실려 갑니다.

### 에러

```json
{
  "code": "GUARDIAN_CONSENT_REQUIRED",
  "message": "보호자 동의가 필요해요."
}
```

- `code` 는 프론트가 분기에 씁니다. 화면 문구를 바꾸거나 특정 UI 를 띄웁니다
- `message` 는 사용자에게 그대로 보여줄 수 있는 한국어입니다
- HTTP 상태 코드도 의미대로 씁니다 (400 검증, 403 권한, 404 없음, 409 상태 충돌)

프론트가 분기에 쓰는 `code` 목록입니다. 이것들은 **반드시 이 문자열이어야** 합니다.

| code | 상태 | 언제 |
|---|---|---|
| `NO_MEASURED_ITEM` | 400 | 측정 항목을 하나도 안 넣고 저장 |
| `NOT_MEASURABLE_AGE` | 422 | 만 4세 미만 프로필의 측정 저장 |
| `GUARDIAN_CONSENT_REQUIRED` | 403 | 동의가 없거나 철회된 프로필의 측정·활동 저장 |
| `PARENT_ROLE_REQUIRED` | 403 | 자녀 계정이 코치 제안을 승인·거절하려 함 |
| `ALREADY_DECIDED` | 409 | 이미 승인·거절된 제안을 다시 처리 |
| `INVALID_CLAIM_CODE` | 400 | 초대코드 형식 오류 |
| `CLAIM_CODE_NOT_FOUND` | 404 | 만료되었거나 없는 초대코드 |

### null 을 쓰는 곳

프론트는 "값이 없음"과 "0"을 구분해서 다른 화면을 그립니다. 빈 문자열이나 0 으로 채우지 말아 주세요.

- 측정 기록이 없는 구성원 → `headline: null` → "첫 측정을 등록하면 지도가 그려져요"
- 계정이 아직 없는 프로필 → `userId: null` → 초대하기 버튼

## 화면이 의존하는 규칙

프론트 화면이 이 동작을 전제로 만들어져 있습니다. 달라지면 알려주세요.

### 1. 승인 전에는 미션이 0건이다

`POST /coach/runs/{id}/approve` 가 성공하기 전까지 `GET /families/{id}/missions` 는 빈 배열입니다.
프론트는 승인 전 화면에서 "미션"이라는 단어를 쓰지 않고 "제안"이라고 부릅니다.

### 2. 완료 판정은 서버가 한다

`POST /missions/{id}/progress` 에서 프론트는 관측값만 보냅니다. 완료 여부는 응답으로 받습니다.

| `verifiedBy` | 프론트가 보내는 것 | 서버가 완료로 올리나 |
|---|---|---|
| `VIDEO_PROGRESS` | `progressPercent` (유튜브 IFrame API 로 수집) | 90 이상이면 예 |
| `TIMER` | `minutes` (앱 내 타이머) | 예 |
| `SELF_REPORT` | `steps` (사람이 만보계 보고 입력) | **아니오.** 부모 확인이 방어선 |

### 3. `measurable` 은 서버가 판단한다

프론트가 생년월일로 나이를 계산해 판단하지 않습니다. `profile.measurable` 이 `false` 면
측정 버튼을 **렌더링하지 않습니다**(비활성화가 아니라 없앰).

### 4. `optionalInput` 이 폼을 두 구역으로 나눈다

`GET /fitness/items` 응답의 `optionalInput` 이 기준입니다.

- `false` → "집에서 잴 수 있어요" (필수)
- `true` → "장비가 있으면 더 정확해요" (선택, 접힌 상태로 시작)

악력계가 있는 집이 거의 없어서, 첫 화면에서 장비를 요구하면 이탈합니다.

### 5. AI 답변에는 `citations` 가 항상 붙는다

`role: "ASSISTANT"` 인데 `citations` 가 비어 있으면 프론트는 버그로 봅니다.

## 엔드포인트

### 가족 체력 지도 (홈 메인)

```
GET /api/v1/families/{familyId}/fitness-map
```

**홈 화면 전체가 이 호출 하나로 옵니다.** 구성원별로 추가 호출을 하지 않습니다.

```json
{
  "family": { "id": "…", "name": "하준이네", "regionCode": "11305" },
  "members": [
    {
      "profile": {
        "id": "…",
        "familyId": "…",
        "userId": "…",
        "displayName": "박지현",
        "birthDate": "1985-04-12",
        "sex": "FEMALE",
        "role": "PARENT",
        "isOwner": true,
        "heightCm": 162.5,
        "weightKg": 55.2,
        "supportMode": "MEASURE_TOO",
        "measurable": true,
        "ageGroup": "ADULT",
        "age": 41,
        "consentPersonalAt": "2026-08-20T09:00:00Z",
        "consentHealthAt": "2026-08-20T09:00:00Z"
      },
      "headline": "40대 여성 중 상위 38%",
      "overallPercentile": 62,
      "overallGrade": 3,
      "weakestItem": "SIT_AND_REACH",
      "strongestItem": "SIT_UP",
      "lastMeasuredOn": "2026-08-24"
    }
  ]
}
```

`headline` 은 서버가 만든 완성된 한국어 문장입니다. 프론트는 조립하지 않습니다.

### 측정 항목 목록

```
GET /api/v1/fitness/items?ageGroup=YOUTH
```

```json
[
  {
    "code": "SIT_AND_REACH",
    "label": "앉아윗몸앞으로굽히기",
    "unit": "cm",
    "domain": "FLEXIBILITY",
    "optionalInput": false,
    "ageGroups": ["TODDLER", "YOUTH", "ADULT"],
    "higherIsBetter": true,
    "hint": "발끝을 0으로 두고 손끝이 닿은 위치까지"
  }
]
```

`code` 는 백엔드 `FitnessItem` enum 과 1:1 입니다. 프론트가 가정한 값입니다.

`SIT_UP` · `SIT_AND_REACH` · `SINGLE_LEG_STAND` · `GRIP_STRENGTH` · `STANDING_LONG_JUMP` · `SHUTTLE_RUN`

> `user-flow.md` 6-1 에 "활용신청 후 실제 API 응답과 대조 필요"로 적혀 있습니다.
> 확정되면 알려 주세요. 여기가 틀리면 백분위가 통째로 틀어집니다.

### 측정 등록

```
POST /api/v1/profiles/{profileId}/fitness-tests
```

```json
{
  "measuredOn": "2026-08-26",
  "source": "HOME",
  "items": [
    { "item": "SIT_UP", "value": 28 },
    { "item": "SIT_AND_REACH", "value": 3.2 }
  ]
}
```

응답 (201) — **백분위와 등급을 서버가 채워서 돌려줍니다.**

```json
{
  "id": "…",
  "profileId": "…",
  "measuredOn": "2026-08-26",
  "source": "HOME",
  "ageAtTest": 9,
  "items": [
    { "item": "SIT_UP", "value": 28, "percentile": 74, "grade": 2 },
    { "item": "SIT_AND_REACH", "value": 3.2, "percentile": 18, "grade": 5 }
  ],
  "overallPercentile": 59,
  "overallGrade": 3
}
```

### 코치 실행과 승인

```
POST /api/v1/families/{familyId}/coach/runs      실행
GET  /api/v1/families/{familyId}/coach/runs/latest   최신 1건        ← 추가 요청
GET  /api/v1/coach/runs/{runId}                  단건
POST /api/v1/coach/runs/{runId}/approve          승인
POST /api/v1/coach/runs/{runId}/reject           거절  { "reason": "…" }
```

> `GET .../coach/runs/latest` 는 `user-flow.md` 목록에 없지만 프론트에 필요합니다.
> 홈이나 코치 탭에 들어왔을 때 "승인 기다리는 제안이 있는지"를 알아야 배지를 띄울 수 있습니다.
> runId 를 프론트가 따로 보관하지 않으려면 이 엔드포인트가 있어야 합니다.

```json
{
  "id": "…",
  "familyId": "…",
  "status": "AWAITING_APPROVAL",
  "createdAt": "2026-08-30T11:00:00Z",
  "proposalItems": [
    {
      "id": "…",
      "title": "앉아서 다리 뻗기 스트레칭",
      "description": "매일 저녁 5분. 영상을 따라 하면 됩니다.",
      "targetProfileIds": ["…"],
      "videoId": "…",
      "rationale": "하준이의 앉아윗몸앞으로굽히기가 6개 항목 중 가장 낮습니다. 유연성은 짧게 자주 하는 편이 효과가 커서 매일 5분으로 잡았습니다.",
      "targetItem": "SIT_AND_REACH",
      "scheduledFor": "2026-09-01"
    }
  ],
  "approvedAt": null,
  "approvedByProfileId": null,
  "rejectedReason": null
}
```

`rationale` 은 화면에 그대로 보여줍니다. **왜 이 운동인지가 이 서비스의 설득력입니다.**
"유연성 향상" 같은 일반론 말고, 이 아이의 측정값을 근거로 든 문장이면 좋겠습니다.

`status` 값: `RUNNING` · `AWAITING_APPROVAL` · `APPROVED` · `REJECTED` · `FAILED`

### 미션 진행

```
POST /api/v1/missions/{missionId}/progress
```

```json
{ "profileId": "…", "verifiedBy": "VIDEO_PROGRESS", "progressPercent": 94 }
{ "profileId": "…", "verifiedBy": "TIMER", "minutes": 6 }
{ "profileId": "…", "verifiedBy": "SELF_REPORT", "steps": 8200 }
```

응답은 갱신된 `Mission` 전체입니다. 프론트가 부분 갱신을 조립하지 않게 하려는 것입니다.

### 10년 후 예측

```
POST /api/v1/profiles/{profileId}/predictions
```

```json
{
  "id": "…",
  "profileId": "…",
  "modelVersion": "lgbm-quantile-2026.08",
  "createdAt": "2026-08-30T12:00:00Z",
  "disclaimer": "집단 데이터 기반 참고용 추정이며 의학적 진단이 아닙니다. …",
  "points": [
    { "scenario": "BASELINE", "item": "SIT_AND_REACH", "ageAt": 9, "p10": 9.0, "p50": 18.0, "p90": 29.0 },
    { "scenario": "IMPROVED", "item": "SIT_AND_REACH", "ageAt": 9, "p10": 8.0, "p50": 18.0, "p90": 30.0 }
  ]
}
```

- `points` 는 시나리오 × 항목 × 나이로 평평하게(flat) 주세요. 프론트가 차트용으로 묶습니다
- `disclaimer` 는 **서버가 문장을 내려주고** 프론트는 접거나 숨기지 않고 항상 표시합니다.
  하드코딩하지 않는 이유는, 문구가 바뀌어야 할 때 배포 없이 고칠 수 있게 하려는 것입니다

### 그 외

| 화면 | 메서드 · 경로 |
|---|---|
| 내 프로필 목록 | `GET /api/v1/me/profiles` |
| 가족 만들기 | `POST /api/v1/families` |
| 구성원 추가 | `POST /api/v1/families/{id}/profiles` |
| 초대코드 열기 | `POST /api/v1/profiles/{id}/invite` |
| 초대코드로 합류 | `POST /api/v1/profiles/claim` |
| 응원 모드 변경 | `PATCH /api/v1/profiles/{id}/support-mode` |
| 동의 철회 | `DELETE /api/v1/profiles/{id}/guardian-consent` |
| 최신 측정 결과 | `GET /api/v1/profiles/{id}/fitness-tests/latest` |
| 미션 목록 | `GET /api/v1/families/{id}/missions` ← 추가 요청 |
| 미션 단건 | `GET /api/v1/missions/{id}` ← 추가 요청 |
| 부모 미션 등록 | `POST /api/v1/families/{id}/missions` |
| 가족 활동 합계 | `GET /api/v1/families/{id}/activity` |
| 걸음수 입력 | `POST /api/v1/profiles/{id}/activity/steps` |
| 타이머 종료 | `POST /api/v1/profiles/{id}/activity/timer` |
| 주간 요약 | `GET /api/v1/families/{id}/report` |
| 영상 추천 | `GET /api/v1/profiles/{id}/videos/recommend` |
| 찜 목록 · 추가 · 해제 | `GET`/`POST` `/api/v1/profiles/{id}/videos/favorites`, `DELETE .../favorites/{videoId}` |
| 최근 본 영상 | `GET /api/v1/profiles/{id}/videos/recent` |
| 코치 대화 조회 · 전송 | `GET`/`POST` `/api/v1/coach/chat` |

전체 타입은 [`src/lib/api/types.ts`](../src/lib/api/types.ts) 에 있습니다.

## 실제 구현이 올라온 뒤

백엔드에 `springdoc-openapi` 가 붙어 있으므로, 손으로 쓴 이 타입들을 버리고 자동 생성으로 갈아탑니다.

```bash
npx openapi-typescript http://localhost:8080/v3/api-docs -o src/lib/api/schema.ts
```

그때부터는 백엔드가 DTO 를 바꾸면 프론트에서 타입 에러로 즉시 드러납니다.
**그러니 이 문서는 그때까지만 유효한 임시 계약입니다.**
