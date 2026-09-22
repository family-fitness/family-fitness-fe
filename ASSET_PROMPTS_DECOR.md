# 꾸미기 에셋 명세 — 우리가족 체력키움

> 캐릭터 말고 **화면 자체를 꾸미는 것**들입니다.
> 지금 화면은 흰 바탕에 글자와 선만 있어서, 그림이 들어가는 자리를 빼면
> 문서처럼 보입니다. 이 문서의 에셋은 전부 **화면의 구조를 보이게** 하는 데 씁니다.
>
> 캐릭터·장면 에셋은 `ASSET_PROMPTS.md` 에 따로 있습니다. 섞지 마세요.

**총 44장.** 급한 순서로 적었습니다 — 1절부터 만들어 주시면 바로 씁니다.

---

## 0. 모든 에셋 공통 규칙

아래 문장을 **모든 프롬프트 끝에 반드시 붙입니다.** 기존 에셋과 한 세트로 보여야 합니다.

```
flat 2D vector illustration, thick uniform dark navy outline (#1B2574, 3px equivalent),
solid fill colors only, no gradients, no drop shadows, no texture, no highlights,
limited palette: white #FFFFFF, sky blue #2784E6, deep navy #1B2574, warm yellow #FFB800,
soft grey #E8EBF0, transparent background,
PNG with alpha channel, no text, no letters, no numbers, no watermark
```

### 이 문서에만 있는 추가 규칙

- **사람을 그리지 마세요.** 이 문서의 에셋에는 캐릭터가 들어가지 않습니다.
  사람이 필요한 그림은 `ASSET_PROMPTS.md` 쪽입니다
- **크기가 정사각형이 아닙니다.** 절마다 비율이 다릅니다. 각 절 머리에 적어 뒀습니다
- **여백을 임의로 넣지 마세요.** 특히 띠(strip)와 타일(tile)은 가장자리까지 그림이
  닿아야 합니다. 여백이 있으면 이어 붙일 때 틈이 보입니다
- **한 파일에 한 그림.** 여러 변형을 한 장에 모아 주시면 쓸 수 없습니다

### 넣지 말아야 할 것 (부정 프롬프트)

```
no gradient, no glow, no neon, no purple, no 3D, no bevel, no emboss,
no photo, no realistic texture, no paper texture, no grain, no noise,
no drop shadow, no inner shadow, no lens flare, no sparkle overlay,
no people, no faces, no characters, no hands,
no text, no letters, no numbers, no logos of other brands,
no frame border around the whole image, no background color fill
```

---

## 1. 브랜드 마크 — 4장 · 정사각형 1024×1024

**가장 급합니다.** 지금 이 서비스에는 로고가 없습니다. 로그인 화면 맨 위와 상단 막대,
홈 화면 아이콘에 들어갈 마크가 필요합니다.

공공기관 사업 출품작이라 **캐릭터 마스코트가 아니라 심볼**이어야 합니다.
귀엽기보다 단정한 쪽으로 가 주세요.

저장 위치: `public/assets/brand/`

| 파일             | 무엇                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `mark-core.png`  | 기본 심볼. 아래 프롬프트                                             |
| `mark-solid.png` | 같은 심볼을 **남색 단색 실루엣**으로. 작은 크기·단색 인쇄용          |
| `mark-round.png` | 같은 심볼을 **연파랑 원 안에** 넣은 것. 여백 20%. 앱 아이콘용        |
| `mark-wide.png`  | 같은 심볼을 왼쪽에 두고 오른쪽을 비운 **가로 3:1** 판. 워드마크 자리 |

```
a simple emblem combining two abstract shapes: a rounded upward arrow
and a soft heart outline sharing one continuous stroke,
symmetrical, geometric, built from circles and straight lines only,
sky blue and warm yellow fills inside a dark navy outline,
reads clearly at 32 pixels, no mascot, no animal, no human figure
```

> 방향을 바꿔 보고 싶으시면 `upward arrow + heart` 대신
> `a running track oval and a rising bar chart`, 또는
> `three overlapping rounded chevrons rising to the right` 로 바꿔서
> 세 벌 뽑아 주세요. 그중에서 고르겠습니다.

---

## 2. 화면 머리 띠 — 10장 · 가로 1536×420 (세로로 잘려도 되는 판)

화면 맨 위에 까는 **가로로 긴 장면**입니다. 지금 `bg/` 가 하는 일과 같은데,
지금 것은 종류가 부족해서 화면마다 같은 하늘이 깔립니다.

**중요** — 이 띠는 화면 폭에 맞춰 늘어나고 **아래쪽이 흰색으로 자연스럽게 사라져야**
합니다. 아래 가장자리를 흰색으로 **서서히 흐리지 말고**, 그리는 대상 자체를
위쪽 2/3 안에 두고 아래 1/3 을 완전히 비워 주세요. (그라데이션 금지 규칙과 충돌합니다)

저장 위치: `public/assets/bg/`

| 파일                 | 쓰는 화면          | 무엇을 그리나                              |
| -------------------- | ------------------ | ------------------------------------------ |
| `bg-morning.png`     | 아이 홈(아침)      | 낮은 언덕과 떠오르는 해, 구름 둘           |
| `bg-evening.png`     | 아이 홈(저녁)      | 같은 언덕, 노란 하늘과 구름 셋             |
| `bg-park.png`        | 운동 고르기        | 공원 — 나무 셋, 벤치 하나, 잔디 띠         |
| `bg-court.png`       | 놀이               | 체육관 바닥 라인과 낮은 벽                 |
| `bg-home-room.png`   | 영상 보기          | 거실 — 창문, 커튼, 매트                    |
| `bg-desk.png`        | 측정 입력          | 책상 위 — 줄자, 노트, 연필이 가지런히      |
| `bg-chart.png`       | 결과 · 자라는 기록 | 아주 연한 격자와 오르는 선 하나            |
| `bg-calendar.png`    | 주간 기록          | 달력 칸 무늬가 가로로 반복                 |
| `bg-ribbon.png`      | 칭찬 · 축하        | 리본과 색종이 조각이 위쪽에 흩어진 모습    |
| `bg-quiet-night.png` | 오프라인 · 쉬는 날 | 밤하늘 — 달 하나와 별 몇 개, 아주 조용하게 |

```
wide horizontal scene, 1536x420, subject occupies only the upper two thirds,
bottom third completely empty transparent, no fade, no gradient,
elements spread evenly across the full width so it can be cropped from either side,
very low visual weight, thin outlines, pale fills, must not compete with text placed on top
```

---

## 3. 구획 장식 — 6장 · 가로 1024×96

구역과 구역 사이를 나누는 띠입니다. 지금은 회색 선 하나뿐이라 화면이 평평합니다.

**좌우로 이어 붙입니다.** 왼쪽 끝과 오른쪽 끝의 무늬가 맞물려야 합니다.

저장 위치: `public/assets/deco/`

| 파일                 | 무엇                                    |
| -------------------- | --------------------------------------- |
| `rule-track.png`     | 육상 트랙 레인 선 두 줄이 가로로 이어짐 |
| `rule-wave.png`      | 낮고 완만한 물결 한 줄                  |
| `rule-dash.png`      | 굵은 점선 — 점이 둥글고 간격이 넓음     |
| `rule-step.png`      | 계단처럼 한 칸씩 오르는 선              |
| `rule-rope.png`      | 줄넘기 줄이 늘어진 모양                 |
| `rule-dots-fade.png` | 점이 가운데로 갈수록 커졌다 작아짐      |

```
horizontal seamless tileable divider strip, 1024x96,
pattern touches both left and right edges so tiles connect without a seam,
single line weight, navy outline with optional sky blue accent,
nothing in the vertical center except the line itself
```

---

## 4. 배경 타일 — 4장 · 정사각형 256×256 · 이어 붙임

구획 배경에 아주 연하게 까는 반복 무늬입니다. **네 방향으로 이어 붙습니다**
(상하좌우 가장자리가 모두 맞물려야 합니다).

**아주 연해야 합니다.** 화면에서 불투명도 8% 정도로 씁니다. 진하면 글자를 못 읽습니다.

저장 위치: `public/assets/deco/`

| 파일             | 무엇                         |
| ---------------- | ---------------------------- |
| `tile-dot.png`   | 작은 점이 격자로             |
| `tile-cross.png` | 작은 십자가 격자로           |
| `tile-arc.png`   | 겹치는 원호로 만든 비늘 무늬 |
| `tile-grid.png`  | 아주 가는 모눈               |

```
seamless repeating tile, 256x256, tiles in all four directions without visible seam,
single colour sky blue on transparent, very thin strokes, low density,
motif repeats at least 4 times across the tile, no border, no frame
```

---

## 5. 데이터 부품 — 6장

점수와 또래 비교를 그리는 데 쓰는 조각입니다. 지금은 원형 링과 막대뿐이라
같은 값을 두 번 말하고 있습니다. **또래 100명 중 내 자리를 실제 점 100개로** 바꿉니다.

저장 위치: `public/assets/data/` (새 분류)

| 파일               | 크기    | 무엇                                                               |
| ------------------ | ------- | ------------------------------------------------------------------ |
| `dot-peer.png`     | 128×128 | 또래 한 명을 뜻하는 **연회색 동그라미** 하나. 속 채움, 외곽선 없음 |
| `dot-me.png`       | 128×128 | 내 자리를 뜻하는 **파란 동그라미**. 같은 크기, 남색 외곽선 있음    |
| `dot-family.png`   | 128×128 | 가족을 뜻하는 **노란 동그라미**. 같은 크기                         |
| `mark-average.png` | 128×256 | 또래 평균 위치를 가리키는 **세로 눈금 하나**. 위가 뾰족함          |
| `ring-empty.png`   | 512×512 | 점수 링의 **바탕 고리**. 연회색, 두께 균일, 12시에 살짝 벌어짐     |
| `ring-cap.png`     | 128×128 | 링 끝에 얹는 **둥근 마감**. 파란 원                                |

```
single simple geometric shape, centered, no decoration around it,
exactly one shape per file, flat solid fill, crisp edges,
must look identical when scaled down to 8 pixels
```

> `dot-*` 세 장은 크기와 모양이 **완전히 같아야** 합니다. 색만 다릅니다.
> 100개를 나란히 놓았을 때 하나만 튀어 보이면 안 됩니다.

---

## 6. 기념 표시 — 8장 · 정사각형 512×512

아이가 **이미 해낸 것**을 기념하는 표시입니다.

**중요 — 목표가 아니라 기록입니다.** "10개 모으면 ○○" 같은 잠긴 칸을 만들지 않습니다.
못 채운 날이 실패가 되기 때문입니다. 그래서 **자물쇠나 회색 처리된 버전은 만들지 마세요.**
받은 것만 보여주고, 안 받은 것은 화면에 아예 없습니다.

저장 위치: `public/assets/badge/` (새 분류. 기존 `stamp/` 12장은 그대로 둡니다)

| 파일                   | 언제 받나                   | 무엇을 그리나              |
| ---------------------- | --------------------------- | -------------------------- |
| `badge-first.png`      | 오늘 운동을 마친 날         | 싹이 트는 새싹             |
| `badge-video.png`      | 영상을 처음 끝까지 본 날    | 재생 삼각형이 든 둥근 화면 |
| `badge-collection.png` | 영상 다섯 편을 완주한 날    | 겹쳐 놓은 카드 세 장       |
| `badge-timer.png`      | 앱이 직접 본 기록이 남은 날 | 초시계                     |
| `badge-together.png`   | 가족과 같은 미션을 한 날    | 맞잡은 두 개의 둥근 고리   |
| `badge-week.png`       | 한 주에 세 번 움직인 날     | 달력 한 장에 동그라미 셋   |
| `badge-measure.png`    | 측정을 처음 등록한 날       | 줄자가 감긴 원             |
| `badge-praise.png`     | 칭찬을 처음 받은 날         | 말풍선 안에 하트           |

> 코드가 지금 이 여덟 개를 찾습니다(`src/lib/badges.ts`). 오기 전까지는
> 기존 `stamp/` 그림으로 대신 보여 주고 있습니다.

```
circular badge, single icon centered inside a ring,
ring is warm yellow, inner disc is white, icon is navy and sky blue,
flat, no ribbon tails, no banner, no star burst behind,
no lock icon, no grey disabled version
```

---

## 7. 아바타 꾸미기 추가 부품 — 10장 · 정사각형 1024×1024

아이가 자기 캐릭터를 꾸미는 화면을 새로 만듭니다.
`char/` 에 이미 몸통·머리·표정·옷이 있으니, **거기에 얹을 것**만 추가합니다.

**겹쳐 쓰는 부품입니다.** 캐릭터 전체를 그리지 마세요. 해당 부품만 그리고,
캐릭터의 어느 위치에 얹힐지를 기준으로 **같은 1024×1024 판 안 같은 자리**에
그려 주세요. (예: 모자는 항상 위쪽 1/4 가운데)

저장 위치: `public/assets/char/`

| 파일                  | 무엇                   | 판 안 위치      |
| --------------------- | ---------------------- | --------------- |
| `hat-cap-yellow.png`  | 노란 야구모자          | 위쪽 1/4 가운데 |
| `hat-band.png`        | 머리띠                 | 위쪽 1/4 가운데 |
| `hat-beanie.png`      | 비니                   | 위쪽 1/4 가운데 |
| `prop-ball.png`       | 공 하나 (손에 드는 것) | 오른쪽 아래     |
| `prop-rope.png`       | 줄넘기 줄              | 아래쪽 가로     |
| `prop-medal-neck.png` | 목에 거는 메달         | 가운데 위쪽     |
| `shoe-blue.png`       | 파란 운동화 한 켤레    | 아래쪽 1/5      |
| `shoe-yellow.png`     | 노란 운동화 한 켤레    | 아래쪽 1/5      |
| `top-vest.png`        | 조끼                   | 가운데          |
| `top-stripe.png`      | 가로줄무늬 티셔츠      | 가운데          |

```
single wearable part only, drawn in isolation on transparent background,
positioned as if worn by a character but the character is NOT drawn,
consistent scale across all parts in this set, front facing view,
no body, no head, no skin, no shadow under the item
```

---

## 정리 — 어디에 무엇이 들어가나

| 분류      | 장수 | 저장 위치              | 비율              |
| --------- | ---- | ---------------------- | ----------------- |
| 브랜드    | 4    | `public/assets/brand/` | 정사각 / 가로 3:1 |
| 화면 머리 | 10   | `public/assets/bg/`    | 가로 1536×420     |
| 구획 장식 | 6    | `public/assets/deco/`  | 가로 1024×96      |
| 배경 타일 | 4    | `public/assets/deco/`  | 정사각 256×256    |
| 데이터    | 6    | `public/assets/data/`  | 절 안에 표기      |
| 기념 표시 | 10   | `public/assets/badge/` | 정사각 512×512    |
| 아바타    | 10   | `public/assets/char/`  | 정사각 1024×1024  |

받은 파일은 그대로 위 경로에 넣어 주시면 됩니다.
`npm run assets` 가 여백을 잘라내고 크기를 맞춘 뒤 목록을 갱신합니다.

---

## 만들기 전에 한 번만 확인해 주세요

1. **사람이 들어갔나요?** 이 문서의 에셋에는 캐릭터가 들어가지 않습니다
2. **글자나 숫자가 들어갔나요?** 전부 코드로 넣습니다. 그림에 넣지 마세요
3. **한 파일에 여러 변형을 모았나요?** 한 장에 하나만
4. **띠와 타일의 가장자리에 여백이 있나요?** 이어 붙일 때 틈이 됩니다
5. **그라데이션이나 그림자가 들어갔나요?** 기존 에셋과 따로 놀게 됩니다
