# 에셋 생성 명세 — 우리가족 체력키움

## ★★ 가장 급한 것 — 머리카락이 없는 그림 12장

1차로 받은 `move/` 12장 중 **11장에 머리카락이 없습니다.** `scene-first-body` 도 같습니다.
민머리라 나이도 성별도 읽히지 않고, 아이 서비스 그림으로 쓰기 어렵습니다.
**`move-jump-rope` 은 로그인 화면과 홈 화면 아이콘에 그대로 쓰이고 있습니다.**

| 파일                          | 무엇                            |
| ----------------------------- | ------------------------------- |
| `move/move-grip.png`          | 악력계를 쥔 모습                |
| `move/move-jump-rope.png`     | 줄넘기 ★ 앱 아이콘에 쓰임       |
| `move/move-long-jump.png`     | 제자리멀리뛰기                  |
| `move/move-plank.png`         | 플랭크                          |
| `move/move-shuttle-run.png`   | 왕복달리기                      |
| `move/move-single-leg.png`    | 외발서기                        |
| `move/move-sit-and-reach.png` | 앉아윗몸앞으로굽히기            |
| `move/move-situp.png`         | 윗몸말아올리기                  |
| `move/move-stretch-back.png`  | 등 스트레칭                     |
| `move/move-stretch-leg.png`   | 다리 스트레칭                   |
| `move/move-walk.png`          | 걷기                            |
| `scene/scene-first-body.png`  | 키 재는 그림 — 머리도 옷도 없음 |

`move/move-squat.png` 한 장만 머리(묶음머리)가 있습니다. **그 그림의 결에 맞춰** 주세요.

### 프롬프트에 꼭 넣어 주세요

```
the child has short dark navy hair clearly drawn on the head,
hair silhouette is visible and distinct from the skin tone,
wearing a white t-shirt and blue shorts and blue sneakers,
not bald, no shaved head, no skin-coloured scalp, not naked
```

`anim/` 8종과 **같은 아이**로 보여야 합니다. 그쪽은 짧은 남색 머리에 흰 티셔츠,
파란 반바지, 파란 운동화입니다.

---

## ★ 지금 가장 급한 것 — 다시 뽑아야 할 프레임 13장

3차로 받은 `anim/` 64장 중 **13장이 못 쓰는 상태**입니다. 화면은 이 장들을 자동으로
건너뛰고 있어서 지금도 돌아가지만, 그만큼 동작이 뚝뚝 끊깁니다.

| 동작      | 다시 뽑을 번호 | 무엇이 잘못됐나                                 |
| --------- | -------------- | ----------------------------------------------- |
| `run`     | 1, 3, 4, 7, 8  | 한 명이 아니라 **작은 캐릭터가 격자로** 여러 명 |
| `squat`   | 1              | 같음                                            |
| `stretch` | 8              | 같음                                            |
| `tired`   | 1              | 같음                                            |
| `wave`    | 3, 4, 5, 6, 7  | 캐릭터 둘레에 **파란 물결 고리**가 덧그려짐     |

지금 남아서 쓰이는 건 `run` 3장, `wave` 3장뿐입니다. 이 둘이 가장 급합니다.

### 다시 뽑을 때 프롬프트에 꼭 넣어 주세요

```
exactly one single child character in the frame, centered, full body,
no duplicated figures, no grid, no contact sheet, no multiple poses in one image,
no decorative circles, no swirls, no water rings, no motion arcs around the character,
plain transparent background with nothing behind the character
```

**한 장에 한 명만.** 여러 자세를 한 장에 모아 주시면 안 됩니다 — 저희가 8장을
따로 받아서 이어 붙입니다.

---

**이번 요청의 핵심은 하나입니다 — 애니메이션 프레임을 3장에서 8장으로 늘리는 것.**

2차에서 받은 3프레임은 화면에서 뚝뚝 끊깁니다. 코드에서 겹쳐 넘기고 몸 전체를
CSS 로 움직여 많이 나아졌지만, 프레임 자체가 적어서 한계가 분명합니다.

- 새로 필요한 것 : **82장**
  - 캐릭터 동작 8종 × 8프레임 = **64장** (기존 24장을 **대체**합니다)
  - 새 기능용 그림 **8장**
  - **배경 10장** (새 분류 `bg/`, 규칙이 다릅니다 — 3절을 꼭 읽어 주세요)

기존 1·2차 에셋은 그대로 씁니다. `stamp/` 12장은 지금 화면에서 쓰지 않지만
지우지 마세요 — 나중에 뱃지로 되살립니다.

---

## 0. 모든 에셋 공통 규칙

아래 문장을 **모든 프롬프트 끝에 반드시 붙입니다.** 1·2차와 같은 문장이라
새 그림이 기존 것과 한 세트로 보입니다.

```
flat 2D vector illustration, thick uniform dark navy outline (#1B2574, 3px equivalent),
solid fill colors only, no gradients, no drop shadows, no texture, no highlights,
limited palette: white #FFFFFF, sky blue #2784E6, deep navy #1B2574, warm yellow #FFB800,
soft grey #E8EBF0, skin tone #FFD9C0, transparent background,
centered subject, generous even margin, PNG with alpha channel, square 1024x1024,
friendly public-service illustration style, no text, no letters, no numbers, no watermark
```

### 파일 이름

받은 파일은 `public/assets/<분류>/<이름>.png` 로 넣습니다. **이름을 그대로 지켜 주세요.**

`anim/` 은 **기존 파일을 덮어씁니다.** `idle-1 ~ idle-8` 처럼 1부터 8까지입니다.

> 프레임 수는 코드에 적혀 있지 않습니다. 에셋을 넣으면 스크립트가 세어서
> 화면이 알아서 8장을 씁니다. 8장이 다 오지 않아도 온 만큼 돕니다.

---

## 1. 캐릭터 동작 — `anim/` (64장) ★ 이번 요청의 전부

### 반드시 지켜 주셔야 하는 것

**여덟 장의 캐릭터가 완전히 같아야 합니다.** 같은 얼굴, 같은 머리, 같은 옷,
같은 크기. 바뀌는 것은 **팔다리 각도뿐**입니다.

- 캔버스 안에서 **발 위치가 움직이면 안 됩니다** (`jump` 만 예외)
- **한 동작 8장을 한 번의 대화에서 연속으로** 뽑아 주세요.
  새 대화를 열면 캐릭터가 달라집니다
- 8장이 **1 → 2 → … → 8 → 1** 로 이어져 **끊김 없이 순환**해야 합니다.
  8번 다음에 1번이 와도 자연스러워야 합니다

공통 캐릭터 설명(**모든 프롬프트에 그대로 넣어 주세요**):

```
a cheerful Korean elementary school child, round face, short dark navy hair,
white t-shirt, blue shorts, blue sneakers, simple dot eyes, small smile,
full body, front view, standing on invisible ground line
```

### `idle` — 가만히 서서 숨 쉬기

가장 자주 보이는 동작입니다. 아주 작게만 움직입니다.

| 파일     | 동작                                                           |
| -------- | -------------------------------------------------------------- |
| `idle-1` | standing still, arms relaxed at sides, shoulders neutral       |
| `idle-2` | shoulders rising very slightly, chest expanding (breathing in) |
| `idle-3` | shoulders at highest point, chest full                         |
| `idle-4` | shoulders starting to lower                                    |
| `idle-5` | shoulders back to neutral                                      |
| `idle-6` | weight shifting slightly to the left leg, head tilted a little |
| `idle-7` | weight centered again                                          |
| `idle-8` | weight shifting slightly to the right leg                      |

### `jump` — 제자리 점프

**이 동작만 발이 캔버스 안에서 움직입니다.** 공중 프레임은 실제로 위로 떠야 합니다.

| 파일     | 동작                                                            |
| -------- | --------------------------------------------------------------- |
| `jump-1` | standing upright, arms at sides                                 |
| `jump-2` | crouching, knees bent, arms swung back                          |
| `jump-3` | deep crouch, arms fully back, about to launch                   |
| `jump-4` | pushing off, legs straightening, arms swinging forward and up   |
| `jump-5` | **in the air, both feet clearly off the ground, arms overhead** |
| `jump-6` | starting to descend, arms coming down, legs reaching for ground |
| `jump-7` | landing, knees bent to absorb, arms at sides                    |
| `jump-8` | standing upright again                                          |

### `run` — 제자리 달리기

| 파일    | 동작                                        |
| ------- | ------------------------------------------- |
| `run-1` | left knee lifted high, right arm forward    |
| `run-2` | left foot coming down, arms mid swing       |
| `run-3` | both feet near the ground, passing position |
| `run-4` | right knee starting to lift                 |
| `run-5` | right knee lifted high, left arm forward    |
| `run-6` | right foot coming down, arms mid swing      |
| `run-7` | both feet near the ground, passing position |
| `run-8` | left knee starting to lift                  |

### `squat` — 앉았다 일어서기

| 파일      | 동작                                                       |
| --------- | ---------------------------------------------------------- |
| `squat-1` | standing upright, hands on hips                            |
| `squat-2` | knees bending slightly, arms starting to reach forward     |
| `squat-3` | half squat, knees bent 45 degrees, arms forward            |
| `squat-4` | deeper squat, thighs almost parallel to ground             |
| `squat-5` | **deepest squat, thighs parallel to ground, arms forward** |
| `squat-6` | rising, knees bent 45 degrees                              |
| `squat-7` | rising further, almost upright                             |
| `squat-8` | standing upright, hands returning to hips                  |

### `stretch` — 몸 펴기

| 파일        | 동작                                                      |
| ----------- | --------------------------------------------------------- |
| `stretch-1` | standing, arms at sides                                   |
| `stretch-2` | arms rising to shoulder height                            |
| `stretch-3` | both arms straight up overhead, body stretched tall       |
| `stretch-4` | leaning to the left with arms overhead                    |
| `stretch-5` | back to center with arms overhead                         |
| `stretch-6` | leaning to the right with arms overhead                   |
| `stretch-7` | bending forward at the waist, hands reaching toward knees |
| `stretch-8` | rising back up, arms lowering                             |

### `cheer` — 만세

| 파일      | 동작                                                       |
| --------- | ---------------------------------------------------------- |
| `cheer-1` | standing, arms at sides, mouth starting to open in a smile |
| `cheer-2` | arms swinging up to shoulder height, big open smile        |
| `cheer-3` | both arms raised in a V shape, feet still on ground        |
| `cheer-4` | **arms in V, both feet off the ground, mid hop**           |
| `cheer-5` | arms in V at the highest point, head tilted back happily   |
| `cheer-6` | starting to come down, arms still up                       |
| `cheer-7` | feet landing, arms lowering to shoulder height             |
| `cheer-8` | arms back at sides, still smiling                          |

### `tired` — 숨 고르기

운동을 마친 뒤 뿌듯하게 숨을 고르는 모습입니다. 힘들어 보이면 안 됩니다.

| 파일      | 동작                                                 |
| --------- | ---------------------------------------------------- |
| `tired-1` | hands on knees, leaning forward, catching breath     |
| `tired-2` | still leaning, shoulders rising with a deep breath   |
| `tired-3` | shoulders lowering, breathing out                    |
| `tired-4` | starting to straighten up, one hand leaving the knee |
| `tired-5` | standing up, one hand wiping the forehead            |
| `tired-6` | standing upright, hands moving to hips               |
| `tired-7` | hands on hips, satisfied smile, chest rising         |
| `tired-8` | hands on hips, chest lowering, still smiling         |

### `wave` — 손 흔들기

| 파일     | 동작                                     |
| -------- | ---------------------------------------- |
| `wave-1` | standing, arms at sides                  |
| `wave-2` | right arm rising to shoulder height      |
| `wave-3` | right arm raised, hand open, tilted left |
| `wave-4` | right hand tilted right                  |
| `wave-5` | right hand tilted left again             |
| `wave-6` | right hand tilted right again            |
| `wave-7` | right arm lowering to shoulder height    |
| `wave-8` | right arm back at side, still smiling    |

---

## 2. 새 기능에 필요한 그림 (8장)

아이가 할 수 있는 것을 늘리면서 필요해진 그림들입니다.

| 파일                     | 그림 설명                                                        |
| ------------------------ | ---------------------------------------------------------------- |
| `item/item-dice`         | a single six sided die showing five pips, tilted slightly        |
| `item/item-book`         | an open book with a bookmark ribbon, seen from the front         |
| `scene/scene-collection` | a wall of small framed picture cards, some filled and some empty |
| `scene/scene-pick`       | a child standing in front of three large cards, choosing one     |
| `item/item-check-big`    | a thick check mark inside a rounded square                       |
| `item/item-lock`         | a simple closed padlock (아직 못 연 운동 표시용)                 |

---

## 3. 배경 — `bg/` (10장) ★ 새 분류

### 왜 따로 만드는가

떠다니던 구름·별 조각을 뺐습니다. **흰 배경에 조각이 흩어져 있으면 이모지를
뿌려 놓은 것처럼 보입니다.** 대신 **가로로 긴 장면 한 장**을 화면 위나 아래에
깔아서, 아이가 어떤 장소에 있는 것처럼 만들려고 합니다.

### 이 분류만 공통 규칙이 다릅니다

배경은 글 뒤에 깔립니다. 앞의 공통 문장 대신 **아래 문장**을 붙여 주세요.

```
flat 2D vector illustration, very pale and low contrast, thin light outline only
(no thick outlines), solid fill colors only, no gradients, no drop shadows, no texture,
pale palette: white #FFFFFF, very light sky blue #EAF3FD, light grey #F4F4F4,
pale yellow #FFF5DC, soft green #EAF5EE, transparent background,
wide horizontal banner composition, PNG with alpha channel, 1536x512,
empty space in the middle so text can sit on top,
friendly public-service illustration style, no text, no letters, no numbers, no watermark
```

**중요** — 굵은 남색 외곽선을 쓰지 마세요. 배경이 캐릭터보다 진하면 캐릭터가 묻힙니다.
가운데는 비워 주세요. 그 위에 글자가 올라갑니다.

### 목록

| 파일                | 그림 설명                                                                       |
| ------------------- | ------------------------------------------------------------------------------- |
| `bg/bg-sky`         | wide sky band with three or four very pale soft clouds, nothing else            |
| `bg/bg-ground`      | wide ground strip with short grass tufts along the top edge, pale green         |
| `bg/bg-park`        | wide park scene: two simple trees on the left, a bench on the right, pale       |
| `bg/bg-living-room` | wide living room: a sofa on the left, a rug in the middle, a lamp on the right  |
| `bg/bg-gym`         | wide indoor gym: wall bars on the left, a mat on the floor, a ball on the right |
| `bg/bg-track`       | wide running track: three curved lane lines, pale, seen from a low angle        |
| `bg/bg-playground`  | wide playground: a slide on the left, a swing set on the right                  |
| `bg/bg-night`       | wide night sky band with a few small pale stars and a thin crescent moon        |
| `bg/bg-confetti`    | wide band of pale confetti pieces scattered along the top edge only             |
| `bg/bg-hill`        | wide gently rolling hill line, two soft green mounds                            |

### 어디에 쓸지

| 배경                 | 쓰는 곳                      |
| -------------------- | ---------------------------- |
| `bg-sky` `bg-hill`   | 아이 홈 머리 뒤              |
| `bg-living-room`     | 운동 화면 — 집에서 하는 운동 |
| `bg-park` `bg-track` | 운동 고르기 화면             |
| `bg-playground`      | 놀이(게임) 화면              |
| `bg-confetti`        | 다 했어요 화면               |
| `bg-gym`             | 내가 한 운동                 |
| `bg-night`           | 저녁에 여는 화면 (나중에)    |
| `bg-ground`          | 캐릭터가 서 있는 자리 아래   |

---

## 받은 뒤에 제가 할 일

1. `public/assets/` 아래 분류대로 넣습니다 (`anim/` 은 덮어쓰기)
2. `npm run assets` — 여백을 잘라내고 크기를 줄입니다.
   같은 동작 8장은 **합친 상자로 함께** 잘라서 서로의 위치가 안 틀어지게 합니다
3. 스크립트가 프레임 수를 세어 `src/lib/anim-frames.ts` 에 적습니다.
   코드는 안 고쳐도 8장을 쓰게 됩니다
4. `npm run check:assets` 가 빠진 이름을 잡아 줍니다

**`anim/` 64장이 먼저입니다.** 배경 10장이 그다음이고, 나머지 8장은 늦어도 됩니다.
