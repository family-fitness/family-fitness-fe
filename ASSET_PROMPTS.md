# 에셋 주문서 — v3 (헬스 앱 결)

> 지난 그림들이 "중구난방" 이라는 말을 들은 이유는 **장마다 선 굵기 · 색 · 그리는 법이 달라서**였다.
> 이번 주문은 여섯 묶음 68장이고(9/25 가족 리그 · 쉬는 날 · 첫 시작 7장 더함 · 안 쓰는 5장 뺌), 전부 **아래 공통 규칙 하나**로 뽑는다.
>
> **화면의 아이콘도 그림으로 바꾼다** (9/23 요청 — "이모트는 쓰지 말고 이미지로").
> 요인 · 메뉴 · 참여 방식 · 스티커 · 배지 · 빈 화면 자리는 이 주문서의 그림만 부른다.
> 뒤로 · › · 재생 · 멈춤 · 체크 같은 작은 조작 기호만 아이콘으로 남긴다.
>
> **그림이 오기 전에는 그 자리가 비어 있다** — 선 아이콘이나 뜻이 비슷한 옛 그림으로
> 대신 세우지 않는다(9/23 "무분별하다"). 레벨 캐릭터만 코드로 그린 임시 그림이 선다.
> 옛 1 · 2차 그림 48장은 지웠다. 파일이 들어오면 `npm run assets -- <원본폴더>` 로 그 자리가 채워진다.

---

## 0. 공통 규칙 — 모든 장에 그대로 붙여 주세요

```
flat vector illustration, simple health app style,
shapes only — no outline strokes, no gradients, no shadows, no texture, no noise,
no text, no letters, no numbers,
palette strictly limited to: blue #2784E6, navy #1B2574, yellow #FFB800,
pale blue #EAF3FD, white #FFFFFF,
transparent background, single subject centered, 1024x1024 canvas
```

- **색은 다섯 가지뿐이다.** 초록 · 빨강 · 보라 · 분홍은 쓰지 않는다 (초록은 앱에서 "해냈다" 표시 전용)
- **그림 한 장에 하나.** 여러 포즈를 한 장에 격자로 뽑지 않는다
- 사람을 그리지 않는다. 사람 대신 서는 것은 캐릭터 **「키움이」** 하나다

### 넣는 곳

```
public/assets/level/level-1.png
public/assets/sticker/sticker-star.png
public/assets/badge/badge-first-step.png
public/assets/scene/kiumi-no-record.png
public/assets/icon/factor-cardio.png
```

1024 원본을 그대로 넣고 `npm run assets -- <원본폴더>` 를 돌리면 여백을 자르고 크기를 줄이고,
**앱이 아는 그림 목록(`src/lib/asset-list.ts`)을 새로 쓴다.** 목록에 있는 그림만 화면이
부른다 — 목록을 안 고치면 파일을 넣어도 자리가 빈 채로 있다.
이름이 틀리거나 목록이 낡았으면 `npm run check:assets` 가 잡는다.

---

## 1. 레벨 캐릭터 「키움이」 — 10장 ★ 가장 급함

아이 홈 맨 위에 선다. 운동하면 경험치가 차고 **레벨 둘마다 한 단계 자란다.**
체력을 「키운다」 에서 온 캐릭터라 **머리 위 새싹이 식물처럼 자란다.** 몸은 그대로다 —
같은 아이가 자라는 것으로 읽혀야 한다.

**참고 그림:** `docs/asset-refs/kiumi-stages.png` — 코드로 그린 임시 그림이다.
**이 실루엣과 비율을 지켜 주세요.** 더 예쁘게는 괜찮고, 다른 캐릭터가 되면 안 된다.

### 키움이 기본 프롬프트

```
mascot character "Kiumi": a round egg-shaped chubby creature, body blue #2784E6,
a large pale blue #EAF3FD oval patch covering the lower two thirds of the front (face and belly),
two navy #1B2574 vertical oval eyes with a small white highlight each,
a small navy smile, soft yellow #FFB800 blush on both cheeks,
two short stubby blue arms, two navy oval feet,
a thin navy stem growing straight up from the top of the head,
standing still, facing the viewer, full body, cute, simple
```

### 단계마다 바뀌는 것 (서 있는 것 5장)

| 파일            | 이름        | 머리 위 (노랑 #FFB800)                   | 몸에 더하는 것            |
| --------------- | ----------- | ---------------------------------------- | ------------------------- |
| `level/level-1` | 씨앗 키움이 | 아주 짧은 줄기, 잎 **하나** (오른쪽)     | 없음                      |
| `level/level-2` | 새싹 키움이 | 조금 긴 줄기, 작은 잎 **둘** (좌우)      | 없음                      |
| `level/level-3` | 잎새 키움이 | 더 긴 줄기, 큰 잎 둘                     | 이마에 노랑 **머리띠**    |
| `level/level-4` | 꽃 키움이   | 큰 잎 둘 + 줄기 끝에 노랑 **꽃 한 송이** | 머리띠                    |
| `level/level-5` | 나무 키움이 | 큰 잎 둘 + 위로 솟은 잎 하나 (작은 나무) | 머리띠 + 가슴에 노랑 메달 |

### 만세 자세 5장

위 다섯 장과 같은 단계, **두 팔을 위로 번쩍** 든 모습. 운동을 다 했을 때와 레벨이 오를 때 뜬다.

```
same character, both arms raised high above the head in celebration, mouth open happily
```

`level/level-1-cheer` · `level/level-2-cheer` · `level/level-3-cheer` · `level/level-4-cheer` · `level/level-5-cheer`

> **다섯 장을 같은 캔버스 위치 · 같은 몸 크기로** 뽑아 주세요. 이 묶음만은 여백을 자르지 않는다 —
> 단계마다 새싹 높이가 달라서 잘라내면 몸 크기가 들쭉날쭉해진다.

---

## 2. 칭찬 스티커 — 12장

부모가 아이에게 붙여 주는 스티커. **고르기만 해도 보내진다** — 그래서 한눈에 뜻이 읽혀야 한다.
캘린더의 날짜 칸에 작게(28px), 붙이는 화면에 크게(96px) 뜬다. **작게 줄여도 읽히는 모양**이어야 한다.

### 스티커 공통

```
round die-cut sticker, thick white border around the whole sticker like a real sticker,
inside the border a filled pale blue #EAF3FD circle,
one single bold object in the center, flat, chunky shapes readable at 28 pixels,
```

| 파일                      | 화면 이름    | 가운데 그림                                               |
| ------------------------- | ------------ | --------------------------------------------------------- |
| `sticker/sticker-star`    | 최고야       | 통통한 노랑 별                                            |
| `sticker/sticker-thumb`   | 엄지척       | 파랑 주먹에 엄지 위로 (사람 손 말고 키움이 손처럼 둥글게) |
| `sticker/sticker-medal`   | 멋져         | 노랑 메달 + 남색 끈                                       |
| `sticker/sticker-heart`   | 사랑해       | 파랑 하트 (분홍 아님)                                     |
| `sticker/sticker-crown`   | 대단해       | 노랑 왕관                                                 |
| `sticker/sticker-flag`    | 끝까지 했네  | 남색 깃대 + 노랑 깃발                                     |
| `sticker/sticker-sprout`  | 쑥쑥 자라라  | 노랑 잎 두 장 새싹 (키움이 머리 위와 같은 잎)             |
| `sticker/sticker-sparkle` | 반짝반짝     | 노랑 반짝임 세 개                                         |
| `sticker/sticker-clap`    | 짝짝짝       | 마주 치는 두 손바닥 + 작은 선 세 개                       |
| `sticker/sticker-rocket`  | 슝 빨라졌어  | 파랑 로켓 + 노랑 불꽃 꼬리                                |
| `sticker/sticker-sun`     | 오늘도 맑음  | 노랑 해 (얼굴 없이)                                       |
| `sticker/sticker-kiumi`   | 꼭 안아 줄게 | 키움이 얼굴만 (1장의 키움이와 같은 얼굴)                  |

---

## 3. 업적 배지 — 12장

레벨과 업적 화면에 격자로 선다. 아직 못 받은 배지는 앱이 **회색으로 바꿔** 그리므로
잠긴 그림을 따로 뽑지 않는다.

**모양은 육각형 메달이다.** 이 앱의 주인공 그래프가 체력 육각형이라 배지도 같은 모양으로 맞춘다.

### 배지 공통

```
achievement badge, a flat hexagon medallion with a pointy top,
navy #1B2574 outer rim, blue #2784E6 inner face,
one yellow #FFB800 emblem in the center, no ribbon, no text,
```

| 파일                        | 업적              | 가운데 문양                       |
| --------------------------- | ----------------- | --------------------------------- |
| `badge/badge-first-step`    | 첫걸음            | 발자국 하나                       |
| `badge/badge-streak-3`      | 사흘 이어서       | 이어진 동그라미 셋                |
| `badge/badge-streak-7`      | 일주일 이어서     | 이어진 동그라미 일곱 (반원형으로) |
| `badge/badge-full-set`      | 준비부터 정리까지 | 올라갔다 내려오는 계단 세 칸      |
| `badge/badge-min-30`        | 30분              | 시계 — 바늘이 반 바퀴             |
| `badge/badge-min-100`       | 100분             | 시계 — 테두리가 거의 한 바퀴      |
| `badge/badge-min-300`       | 300분             | 시계 둘이 겹친 모양               |
| `badge/badge-weekend`       | 주말에도          | 해 + 작은 깃발                    |
| `badge/badge-together`      | 가족과 함께       | 크고 작은 하트 둘                 |
| `badge/badge-remeasure`     | 자란 만큼 다시    | 세로 자                           |
| `badge/badge-first-sticker` | 첫 스티커         | 모서리가 살짝 말린 동그란 스티커  |
| `badge/badge-six-powers`    | 여섯 가지 힘      | 작은 육각형 안의 여섯 갈래 별     |

---

## 4. 빈 화면 · 그 순간 — 5장

글만 있는 빈 화면은 오류난 화면처럼 보인다. 키움이가 그 상황을 연기한다.
1장의 **3단계(잎새) 키움이**로 그려 주세요.

| 파일                     | 언제                     | 키움이가                                    |
| ------------------------ | ------------------------ | ------------------------------------------- |
| `scene/kiumi-no-record`  | 아직 한 번도 안 쟀을 때  | 자기 키보다 큰 세로 자 옆에 서서 올려다본다 |
| `scene/kiumi-no-mission` | 오늘 운동이 아직 없을 때 | 운동 매트 위에 앉아 기다린다                |
| `scene/kiumi-waiting`    | 칭찬을 기다릴 때         | 편지 봉투를 두 손으로 안고 있다             |
| `scene/kiumi-rest`       | 쉬는 날                  | 눈 감고 편하게 누워 있다                    |
| `scene/kiumi-no-alarm`   | 알림이 없을 때           | 작은 종을 들고 고개를 갸웃한다              |

---

## 5. 아이콘 그림 — 22장

화면에서 지금 비어 있는 자리다. **작게(24~40px) 줄여도 무엇인지 읽혀야 한다.**
앱이 연한 파랑 둥근 칸 위에 올려 쓰므로 **칸(바탕 타일)은 그리지 않는다.**

### 아이콘 공통

```
flat vector pictogram, one single simple object, chunky rounded shapes,
readable at 24 pixels, no background tile, no circle behind it,
512x512
```

### 체력 요인 — 6장

체력 육각형의 여섯 꼭지점, 요인 표, 측정 항목, 운동 찾기 칸에 선다.

| 파일                      | 요인       | 그림                                      |
| ------------------------- | ---------- | ----------------------------------------- |
| `icon/factor-cardio`      | 심폐지구력 | 파랑 하트 + 가로지르는 노랑 심박 선 한 줄 |
| `icon/factor-strength`    | 근력       | 남색 손잡이에 파랑 원판 아령              |
| `icon/factor-endurance`   | 근지구력   | 노랑 모래가 흐르는 파랑 모래시계          |
| `icon/factor-flexibility` | 유연성     | 활처럼 휘어 고리를 이룬 파랑 리본         |
| `icon/factor-agility`     | 민첩성     | 두 번 꺾인 노랑 지그재그 화살표           |
| `icon/factor-power`       | 순발력     | 노랑 번개 + 그 아래 눌린 파랑 스프링      |

### 메뉴 · 줄 — 12장

설정 · 가족 관리 · 측정 결과 · 홈 카드의 줄 앞에 선다.

| 파일                  | 자리                  | 그림                                   |
| --------------------- | --------------------- | -------------------------------------- |
| `icon/menu-family`    | 가족 관리 · 초대      | 파랑 지붕 집, 문에 노랑 하트           |
| `icon/menu-support`   | 참여 방식             | 마주 잡은 둥근 두 손 + 작은 노랑 하트  |
| `icon/menu-consent`   | 보호자 동의           | 남색 방패 + 노랑 체크                  |
| `icon/menu-switch`    | 누가 쓰는지 바꾸기    | 서로 뒤를 쫓는 두 화살표 (파랑 · 노랑) |
| `icon/menu-cheer`     | 응원 보내기           | 둥근 말풍선 안에 노랑 하트             |
| `icon/menu-measure`   | 키 · 몸무게 새로 재기 | 말려 있는 노랑 줄자                    |
| `icon/menu-equipment` | 장비가 있으면         | 손잡이 달린 악력계                     |
| `icon/menu-invite`    | 초대코드              | 한쪽이 뜯긴 노랑 티켓                  |
| `icon/menu-schedule`  | 운동할 수 있는 시간   | 둥근 파랑 시계 + 뒤에 달력 한 장       |
| `icon/menu-calendar`  | 캘린더                | 달력 한 장 + 모서리에 동그란 스티커    |
| `icon/menu-ai`        | AI 에게 운동 받기     | 크고 작은 반짝임 셋 (노랑)             |
| `icon/menu-trophy`    | 레벨과 업적           | 노랑 트로피                            |

### 참여 방식 · 역할 — 4장

| 파일                | 자리                   | 그림                                      |
| ------------------- | ---------------------- | ----------------------------------------- |
| `icon/mode-cheer`   | 응원할게요             | 파랑 메가폰                               |
| `icon/mode-weekend` | 주말에는 같이          | 달력 한 장 위로 떠오르는 노랑 해          |
| `icon/mode-full`    | 매번 같이              | 나란히 놓인 큰 운동화 · 작은 운동화       |
| `icon/role-parent`  | 역할 고르기의 「부모」 | 큰 파랑 하트가 작은 노랑 하트를 감싼 모양 |

---

## 6. 가족 리그 · 쉬는 날 카드 · 첫 시작 — 7장 (9/25 새로)

> **받았다(9/25, `family-fitness-assets-complete-v6`).** 플래티넘 메달의 왕관 위에 투명한 구멍이 나 있어(생성 잡티)
> 들일 때 그 자리를 방패 면 색으로 메웠다. 원본 폴더는 그대로 두었다 — 다시 뽑으면 그것으로 바꾼다.

### 리그 티어 메달 — 5장

가족 리그(매달 브론즈 · 실버 · 골드 · 플래티넘 · 다이아)의 티어 메달. 리그 화면 · 가족 대시보드 · 부모 홈 칸에 선다.
오기 전에는 그 자리를 비워 두고 티어 이름 글자만 선다.

**업적 배지(육각형)와 헷갈리지 않게 방패 모양이다.** 색은 다섯 가지 규칙 그대로라 금속 색(구리 · 은빛) 대신
**가운데 문양이 한 칸씩 커지는 것**으로 가른다.

```
league tier emblem, a flat shield badge with a rounded bottom point,
navy #1B2574 outer rim, blue #2784E6 inner face,
one emblem in the center in yellow #FFB800 and white #FFFFFF, no ribbon, no text, no numbers,
```

| 파일                   | 티어     | 가운데 문양                                     |
| ---------------------- | -------- | ----------------------------------------------- |
| `league/tier-bronze`   | 브론즈   | 작은 노랑 별 하나                               |
| `league/tier-silver`   | 실버     | 노랑 별 둘이 나란히                             |
| `league/tier-gold`     | 골드     | 노랑 별 셋이 부채꼴로                           |
| `league/tier-platinum` | 플래티넘 | 노랑 왕관 하나                                  |
| `league/tier-diamond`  | 다이아   | 흰 · 연파랑 면으로 깎은 보석 하나 + 작은 반짝임 |

### 쉬는 날 카드 — 1장

| 파일             | 자리         | 그림                                             |
| ---------------- | ------------ | ------------------------------------------------ |
| `icon/menu-rest` | 쉬는 날 카드 | 한쪽이 뜯긴 파랑 티켓 위에 노랑 초승달 + 작은 별 |

---

### 첫 시작 인사 — 1장

첫 시작 첫 칸(「안녕하세요! 저는 키움이에요」)에 크게 선다. 오기 전에는 레벨 캐릭터가 대신 선다.
1장의 **3단계(잎새) 키움이**로 그려 주세요.

| 파일                | 자리         | 키움이가                                                |
| ------------------- | ------------ | ------------------------------------------------------- |
| `scene/kiumi-hello` | 첫 시작 인사 | 한 손을 크게 흔들고 다른 손에 노랑 클립보드를 안은 모습 |

---

## 7. 이번에 쓰지 않는 것

지난 주문의 조립 아바타(몸통 · 머리 · 표정 · 옷), 동작 프레임(`anim/`), 바탕 장면(`bg/`),
옛 도장(`stamp/`)은 **더 뽑지 않아도 된다.** 앱에서 지웠다.
사람 모습 그림도 이번에는 없다 — 가족은 프로필 사진(이 기기에만), 없으면 이름 첫 글자 동그라미로 가리킨다.
