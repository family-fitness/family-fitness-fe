# 에셋 생성 명세 — 우리가족 체력키움 (3차)

**이번 요청의 핵심은 하나입니다 — 애니메이션 프레임을 3장에서 8장으로 늘리는 것.**

2차에서 받은 3프레임은 화면에서 뚝뚝 끊깁니다. 코드에서 겹쳐 넘기고 몸 전체를
CSS 로 움직여 많이 나아졌지만, 프레임 자체가 적어서 한계가 분명합니다.

- 새로 필요한 것 : **72장**
  - 캐릭터 동작 8종 × 8프레임 = **64장** (기존 24장을 **대체**합니다)
  - 새 기능용 그림 **8장**

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

| 파일                     | 그림 설명                                                                |
| ------------------------ | ------------------------------------------------------------------------ |
| `item/item-dice`         | a single six sided die showing five pips, tilted slightly                |
| `item/item-book`         | an open book with a bookmark ribbon, seen from the front                 |
| `scene/scene-collection` | a wall of small framed picture cards, some filled and some empty         |
| `scene/scene-pick`       | a child standing in front of three large cards, choosing one             |
| `item/item-check-big`    | a thick check mark inside a rounded square                               |
| `item/item-lock`         | a simple closed padlock (아직 못 연 운동 표시용)                         |
| `deco/deco-ground`       | a simple horizontal ground line with a few small grass tufts, wide shape |
| `deco/deco-sky-band`     | a very wide, very shallow soft cloud band, meant to sit behind a header  |

> `deco-ground` 와 `deco-sky-band` 는 **가로로 아주 긴 모양**으로 뽑아 주세요.
> 정사각형 안에 넣지 말고 가로 1024 × 세로 256 정도가 좋습니다.
> 조각을 흩뿌리는 대신 **바닥선과 하늘띠**로 장면을 만들려는 것입니다 —
> 떠다니는 구름 조각은 이모지처럼 보여서 뺐습니다.

---

## 받은 뒤에 제가 할 일

1. `public/assets/` 아래 분류대로 넣습니다 (`anim/` 은 덮어쓰기)
2. `npm run assets` — 여백을 잘라내고 크기를 줄입니다.
   같은 동작 8장은 **합친 상자로 함께** 잘라서 서로의 위치가 안 틀어지게 합니다
3. 스크립트가 프레임 수를 세어 `src/lib/anim-frames.ts` 에 적습니다.
   코드는 안 고쳐도 8장을 쓰게 됩니다
4. `npm run check:assets` 가 빠진 이름을 잡아 줍니다

**`anim/` 64장이 먼저입니다.** 나머지 8장은 늦어도 됩니다.
