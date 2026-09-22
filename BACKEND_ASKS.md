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

## 2. 측정·신체

### `latest` 응답에 `heightCm` · `weightKg`

측정 등록 때 키·몸무게를 **받아 두고도 돌려주지 않습니다.**
그래서 부모가 방금 적은 값이 저장하자마자 화면에서 사라졌습니다.
지금은 기기에 따로 들고 있는데, 기기를 바꾸면 없어집니다.

### `GET /profiles/{profileId}/fitness-tests` (이력)

`latest` 하나만 있어서 **자라는 기록에 추이를 그릴 수 없습니다.**
"어떻게 자라고 있나" 가 이 서비스의 핵심인데 점 하나만 찍고 있습니다.

```
{ tests: [{ fitnessTestId, testedOn, overallPercentile, heightCm, weightKg }], nextCursor }
```

### `PATCH /profiles/{profileId}/body {heightCm, weightKg}`

측정 회차에 얹지 않고 **키·몸무게만 고치는 길**이 없습니다.
아이 키는 한 계절이면 달라지는데, 그때마다 체력 측정을 새로 해야 합니다.

---

## 3. 코치

### `POST /coach/chat` 응답에 `suggestion?`

대화 중에 코치가 미션을 제안하면, 부모가 **버튼 하나로 미션을 만들 수 있게**
하려고 합니다. 화면은 이미 만들어 뒀고 값만 오면 카드가 뜹니다.
안 오면 지금처럼 답변만 보여 줍니다.

```
suggestion?: {
  title, targetMetric, targetValue, startDate, endDate,
  videoId?, videoTitle?, participantProfileIds[], rationale?
}
```

값이 그대로 `POST /families/{familyId}/missions` 본문이 되게 맞춰 뒀습니다.

### `GET /families/{familyId}/coach/runs/latest`

지금은 **실행한 runId 를 기기에 들고 있습니다.** 기기를 바꾸거나 저장소를 비우면
이번 주 제안을 다시 찾지 못합니다.

### `GET /missions/{missionId}`

미션 하나를 보려고 **가족 미션 목록 전체를 받아서 걸러 쓰고** 있습니다.

---

## 4. 저장

### 프로필당 아바타 한 줄

아이가 고른 캐릭터 모습(머리·표정·몸)을 기기에만 두고 있어서
**기기를 바꾸면 처음 모습으로 돌아갑니다.**

```
avatar?: { hair, face, body }
```

### 날짜별 활동 요약

아이 홈의 "이번 주 움직인 날" 을 지금은 **칭찬 기록의 날짜로 대신 세고** 있습니다.
운동은 했는데 알리지 않은 날은 빠집니다.

```
GET /profiles/{profileId}/activity/weekly?weekStart=
{ days: [{ date, activeMinutes, verifiedMinutes }] }
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
