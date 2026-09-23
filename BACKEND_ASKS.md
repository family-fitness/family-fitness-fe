# 백엔드에 요청드릴 것

> 프론트에서 화면을 만들다 **서버에 없어서 막힌 것들**입니다.
> 코드 안에 `▲` 로 표시해 뒀고, 여기에 한 번 더 모았습니다.
>
> 급한 순서로 적었습니다. 없어도 화면은 돌아가지만, 있으면 그 자리가 살아납니다.

---

## 1. 지금 화면이 못 그리고 있는 것

### `GET /families/{familyId}/cheers?toProfileId=&size=`

**칭찬을 보내는 길은 있는데 받은 걸 보는 길이 없습니다.**
`POST .../cheers` 로 보내는 건 되는데 조회가 없어서, 아이 화면의 "받은 칭찬" 과
부모 화면의 "오늘" 을 목 서버로만 그리고 있습니다. 이 서비스의 가족 순환 전체가
여기에 달려 있습니다.

응답 모양 제안:

```
{ cheers: [{ cheerId, fromProfileId, fromName, toProfileId, message, missionId, createdAt }] }
```

### cheer 에 `kind` 칸

지금은 `missionId` 가 있으면 완료 알림, 없으면 조르기로 **추측**하고 있습니다.
아이가 "같이 하자" 고 부른 것과 "다 했어요" 를 화면이 다르게 말해야 하는데
추측이라 위태롭습니다.

```
kind: "DONE" | "CALL" | "PRAISE"
```

### cheer 에 `replyToCheerId`

어느 알림에 답한 칭찬인지 잇지 못해, 지금은 **순서로 짝을 맞추고** 있습니다.
알림이 셋인데 칭찬이 하나면 어느 것에 답한 건지 알 수 없습니다.

---

### `GET /invites/{claimCode}` — 코드가 어느 자리인지

초대코드는 **가족 전체가 아니라 자리 하나**에 발급됩니다(`POST /profiles/{id}/invite`).
그런데 받는 쪽 화면은 그걸 모른 채 코드를 넣고, **넣고 나서야 자기가 누가 됐는지** 압니다.

넣기 전에 「서준이네 · 아빠 자리」 를 보여 줘야 _받는 사람이 역할을 고를 수 없다_ 는 것이
화면에서 사실이 됩니다. 부모 권한이 곧 코치 승인 권한이라 여기서 새면 안 됩니다.

```
{ familyName, profileName, role, ageGroup?, invitedByName?, expiresAt? }
```

없는 코드는 404, 기한이 지났으면 410 을 주세요.
**로그인 전에도 부를 수 있어야 합니다** — 초대 링크로 처음 들어온 사람이 보는 화면입니다.

---

## 2. 측정·신체

### `latest` 응답에 `heightCm` · `weightKg`

측정 등록 때 키·몸무게를 **받아 두고도 돌려주지 않습니다.**
그래서 부모가 방금 적은 값이 저장하자마자 화면에서 사라졌습니다.
지금은 기기에 따로 들고 있는데, 기기를 바꾸면 없어집니다.

### `GET /profiles/{profileId}/fitness-tests` (이력)

`latest` 하나만 있어서 **자라는 기록에 추이를 그릴 수 없습니다.**
"어떻게 자라고 있나" 가 이 서비스의 핵심인데 점 하나만 찍고 있습니다.
아이 자세히 화면의 **신체 점수 흐름**과 **키 · 몸무게가 자란 만큼**이 이 값으로 그려집니다
(목 서버로 먼저 만들어 뒀습니다).

```
{ tests: [{ fitnessTestId, testedOn, overallPercentile, heightCm, weightKg }], nextCursor }
```

최근 회차가 먼저 오게 해 주세요. 다시 재기는 **덮어쓰기가 아니라 추가**입니다.

### `PATCH /profiles/{profileId}/body {heightCm, weightKg}`

측정 회차에 얹지 않고 **키·몸무게만 고치는 길**이 없습니다.
아이 키는 한 계절이면 달라지는데, 그때마다 체력 측정을 새로 해야 합니다.

---

## 3. 코치

### `GET /families/{familyId}/coach/runs/latest`

지금은 **실행한 runId 를 기기에 들고 있습니다.** 기기를 바꾸거나 저장소를 비우면
이번 주 제안을 다시 찾지 못합니다.

### `GET /missions/{missionId}`

미션 하나를 보려고 **가족 미션 목록 전체를 받아서 걸러 쓰고** 있습니다.

---

### `ProfileSummary` 에 `sex`

가족을 만들 때(`OwnerRequest`)와 구성원을 더할 때(`AddMemberRequest`)는 **받으면서**
조회 응답에는 돌려주지 않습니다. 가족 정보를 고치는 화면에서 성별을 보여 줄 수가 없고,
국민체력100 규준 자체가 성별로 나뉘어 있어 어차피 서버가 아는 값입니다.

```
sex: "M" | "F"
```

`GET /families/{familyId}/fitness-map` 의 `members` 에도 같이 넣어 주세요.

---

## 4. 계속하게 하는 것 — 레벨 · 캘린더

9/23 회의에서 **계산은 서버가 하고 프론트는 꾸미기만** 하기로 한 것들입니다.
두 곳에서 따로 세면 아이 화면과 부모 화면의 레벨이 어긋납니다.
화면은 목 서버로 먼저 만들어 뒀고, 아래 모양으로 답이 오면 그대로 붙습니다.

### `GET /families/{familyId}/calendar?profileId=&from=&to=`

캘린더 한 칸과 홈의 **이번 주 막대**가 이것 하나로 그려집니다. 지금 계약에는
미션의 기간(startDate~endDate)만 있고 **그날 몇 분 했는지**가 없습니다 —
날짜별 합은 활동 기록(`activityDate`)을 가진 서버만 정확히 냅니다.

```
{
  profileId, from, to,
  days: [{
    date: "2026-09-22",
    minutes: 12,              // 그날 확인된 운동 시간(영상 · 타이머로 서버가 아는 것만)
    plannedMinutes: 12 | null,// 그날 잡혀 있던 시간
    entries: [{ missionId, title, minutes, verifiedBy, completed,
                sessions: [{ title, phase, minutes, done }] | null }],
    stickers: [{ cheerId, stickerId, fromProfileId, fromName, message, missionId, createdAt }]
  }]
}
```

**아무것도 안 한 날은 `days` 에 넣지 말아 주세요.** 0분으로 채워 오면 화면이 그날을
빠진 날처럼 그리기 쉽습니다. 날짜는 한국 날짜로 잘라 주세요.

### `GET /profiles/{profileId}/progress`

레벨 · 경험치 · 업적 · 연속. 아이 홈 맨 위의 자라는 캐릭터가 이 값으로 섭니다.

```
{
  profileId, level, xp,
  levelFloorXp,            // 이 레벨이 시작된 경험치
  nextLevelXp | null,      // 다음 레벨이 되는 경험치. 마지막 레벨이면 null
  streakDays,              // 며칠 이어서 했나. 오늘 아직이면 어제까지로 센다
  activeDays,              // 지금까지 운동한 날. 아이 홈 「키움 섬」 의 나무 수 — 줄지 않는다
  achievements: [{ code, title, description, earnedAt | null }],
  recentXp: [{ reason, amount, at }]
}
```

목 서버가 쓰는 규칙입니다 — 바꾸셔도 되고, 바꾸시면 알려 주세요.

| 무엇                  | 경험치 |
| --------------------- | ------ |
| 운동 한 칸 끝내기     | +5     |
| 그날 잡힌 것 다 하기  | +20    |
| 칭찬 스티커 받기      | +10    |
| 키 · 몸무게 새로 재기 | +20    |

- **경험치는 줄지 않습니다.** 쉰 날에 깎는 규칙은 두지 말아 주세요
- 레벨 구간은 `0 · 80 · 200 · 360 · 560 · 800 · 1080 · 1400 · 1760 · 2160` (레벨 1~10)
- 업적은 열두 개입니다(`src/mocks/progress.ts`). **개수를 목표로 하는 칭찬 업적은 두지 않습니다**
  — 「스티커 10장」 을 두면 못 채운 날이 실패가 됩니다. 첫 스티커 하나만 기념합니다

---

## 4-2. 오늘 운동 짜기 · 하기

9/23 회의 — **짧은 구간(2분 안팎) 여러 개를 차례로** 틀고, 한 칸이 끝나면 다음 칸으로
내려가는 방식으로 정했습니다. 아래가 있어야 그 흐름이 서버와 이어집니다.

### 미션 · 제안에 `sessions[]` — 준비 · 본 · 정리 칸

`MissionView.sessions[]` · `ProposalView.sessions[]` · `CreateMissionRequest.sessions[]`

```
sessions: [{
  position: 1,                       // 1부터. 하는 차례
  phase: "WARMUP" | "MAIN" | "COOLDOWN",
  title: "팔 벌려 뛰기",
  factor: "민첩성" | null,
  minutes: 2 | null,
  clip: { videoId, startSec, endSec, title } | null,
  completed: false,
  verifiedBy: "TIMER" | "VIDEO_PROGRESS" | null
}]
```

**`endSec` 이 꼭 있어야 합니다.** 끝을 모르면 구간만 틀 수도, 다 했는지 잴 수도 없습니다.
세션이 안 오면 프론트는 미션 전체를 본운동 한 칸으로 그립니다 — 준비 · 정리를 지어내지 않습니다.

### `POST /missions/{missionId}/sessions/{position}/done`

한 칸 끝. 앱 안 타이머로 잰 시간이라 `verifiedBy: TIMER` 로 남겨 주세요.

```
요청 { profileId, activeSeconds, startedAt, endedAt }
응답 { position, missionProgress, missionCompleted, xpGained }
```

마지막 칸이면 미션 완료 · 부모 알림까지 같이 처리해 주시면 됩니다.

### 코치 실행에 조건 — `POST /families/{familyId}/coach/runs`

부모가 고른 조건을 같이 보냅니다. 지금은 `minutesPerSession` 만 받습니다.

```
{
  profileId,            // 누구의 운동인지
  date: "2026-09-23",   // 그날 하루
  minutes: 20,          // 기본값은 아래 「운동할 수 있는 시간」 에서
  quiet: true,          // 아랫집이 신경 쓰이면 뛰는 동작 빼기
  place: "HOME" | "OUTDOOR",
  focusFactor: "유연성" | null,  // null 이면 코치가 가장 낮은 요인을 고름
  withParent: true      // 부모도 같이 하나
}
```

### `GET · PUT /profiles/{profileId}/availability` — 운동할 수 있는 시간

사람마다 한 주. AI 편성의 「몇 분」 기본값과 홈 링의 「이번 주 며칠」 목표가 여기서 나옵니다.
**운동을 막는 데 쓰지 않습니다** — 적어 둔 날이 아니어도 운동은 됩니다.

```
{ profileId, slots: [{ day: "MON" … "SUN", start: "19:00", minutes: 20 }] }
```

### `GET /clips?factor=&phase=&quiet=&q=&list=&profileId=` · `POST /clips/{clipId}/favorite`

「키우고 싶은 힘으로 찾기」 화면. AI 쪽이 영상 48편을 491개 클립으로 끊어 둔 표
(`video_clips.csv`)를 그대로 주시면 됩니다. `list=FAVORITE` 는 즐겨찾기만.

```
{
  clips: [{ clipId, videoId, startSec, endSec, title,
            factor, phase, homeOk, quiet, props, favorited }],
  total
}
```

---

## 5. 보안

### HttpOnly 쿠키 토큰

지금은 액세스 토큰을 `localStorage` 에 둡니다. **XSS 한 번이면 그대로 털립니다.**
아이 건강 정보를 다루는 서비스라 쿠키로 옮기는 편이 맞습니다.

프론트는 이미 `credentials: "include"` 로 보내고 있고, Next 의 rewrites 로
같은 출처처럼 보이게 해 뒀으므로 **쿠키로 바꿔도 프론트 수정은 거의 없습니다.**

---

## 6. 기획서 확장

### AI 체력 나이

기획서 확장 기능 (7) 입니다. 지금은 **또래 백분위를 점수로 쓰고** 있는데,
"체력 나이 9살" 이 아이에게 훨씬 잘 읽힙니다. 오면 점수 자리를 바꾸겠습니다.
