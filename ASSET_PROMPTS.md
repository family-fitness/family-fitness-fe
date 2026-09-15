# 에셋 생성 명세 — 우리가족 체력키움 (2차)

이미지 생성 AI 에 그대로 넣을 프롬프트 모음입니다.

**1차에서 받은 79장은 그대로 씁니다.** 이 문서는 화면을 아이 중심으로 다시 짜면서
새로 필요해진 것만 담았습니다. 이미 있는 것과 겹치지 않습니다.

- 새로 필요한 것 : **62장**
- 그중 애니메이션용 연속 프레임 : 24장 (8동작 × 3프레임)

---

## 0. 모든 에셋 공통 규칙

아래 문장을 **모든 프롬프트 끝에 반드시 붙입니다.** 1차와 같은 문장이라
새 그림이 기존 79장과 한 세트로 보입니다.

```
flat 2D vector illustration, thick uniform dark navy outline (#1B2574, 3px equivalent),
solid fill colors only, no gradients, no drop shadows, no texture, no highlights,
limited palette: white #FFFFFF, sky blue #2784E6, deep navy #1B2574, warm yellow #FFB800,
soft grey #E8EBF0, skin tone #FFD9C0, transparent background,
centered subject, generous even margin, PNG with alpha channel, square 1024x1024,
friendly public-service illustration style, no text, no letters, no numbers, no watermark
```

### 파일 이름과 저장 위치

받은 파일은 `public/assets/<분류>/<이름>.png` 로 넣습니다.
**이름을 그대로 지켜 주세요.** 코드가 이 이름으로 찾습니다.

```
public/assets/
  anim/    연속 프레임 (새로 생김)
  stamp/   도장 (새로 생김)
  char/    캐릭터 부품 (1차에 있음, 여기서 추가)
  item/    사물 (1차에 있음, 여기서 추가)
  scene/   빈 화면용 장면 (1차에 있음, 여기서 추가)
```

### 연속 프레임은 이렇게 뽑아 주세요

`anim/` 은 아이 화면에서 **캐릭터가 움직이는 데** 씁니다.
한 동작을 3장으로 뽑고, 코드가 3장을 번갈아 보여줘 애니메이션을 만듭니다.

- **세 장의 캐릭터가 같아야 합니다.** 같은 옷, 같은 머리, 같은 크기, 같은 위치
- 바뀌는 것은 **팔다리 각도뿐**입니다
- 캔버스 안에서 **발 위치가 움직이면 안 됩니다** (점프 동작만 예외)
- 가능하면 한 번의 대화에서 연속으로 뽑아 주세요. 새 대화를 열면 캐릭터가 달라집니다

---

## 1. 아이 캐릭터 동작 — `anim/` (24장) ★ 가장 중요

아이 홈과 운동 화면의 주인공입니다. 한 동작에 3프레임씩.

공통 캐릭터 설명(**모든 anim 프롬프트에 그대로 넣어 주세요**):

```
a cheerful Korean elementary school child, round face, short black hair,
white t-shirt, sky blue shorts, blue sneakers, simple dot eyes, small smile,
full body, front view, standing on invisible ground line
```

| 파일             | 동작 설명 (위 캐릭터 설명 뒤에 붙일 말)                                |
| ---------------- | ---------------------------------------------------------------------- |
| `anim/idle-1`    | standing still, arms relaxed at sides                                  |
| `anim/idle-2`    | standing still, arms relaxed, shoulders slightly raised (breathing in) |
| `anim/idle-3`    | standing still, arms relaxed, weight shifted slightly to one leg       |
| `anim/jump-1`    | crouching down, knees bent, arms swung back, about to jump             |
| `anim/jump-2`    | mid air, both feet off the ground, arms raised overhead                |
| `anim/jump-3`    | landing, knees slightly bent, arms coming down                         |
| `anim/run-1`     | running, left knee lifted high, right arm forward                      |
| `anim/run-2`     | running, both feet near the ground, arms at sides                      |
| `anim/run-3`     | running, right knee lifted high, left arm forward                      |
| `anim/stretch-1` | standing, reaching both arms straight up overhead                      |
| `anim/stretch-2` | bending forward at the waist, fingers reaching toward toes             |
| `anim/stretch-3` | sitting on the floor, legs straight, reaching toward toes              |
| `anim/squat-1`   | standing upright, hands on hips                                        |
| `anim/squat-2`   | half squat, knees bent 45 degrees, arms forward                        |
| `anim/squat-3`   | deep squat, thighs parallel to ground, arms forward                    |
| `anim/cheer-1`   | both arms raised in a V shape, big open smile, jumping slightly        |
| `anim/cheer-2`   | both arms raised higher, both feet off the ground                      |
| `anim/cheer-3`   | arms coming down, still smiling, feet landing                          |
| `anim/tired-1`   | hands on knees, leaning forward, catching breath                       |
| `anim/tired-2`   | standing up slowly, one hand wiping forehead                           |
| `anim/tired-3`   | standing, hands on hips, satisfied smile                               |
| `anim/wave-1`    | right arm raised, hand open, waving                                    |
| `anim/wave-2`    | right arm raised, hand tilted to the other side                        |
| `anim/wave-3`    | right arm lowered halfway, smiling                                     |

---

## 2. 도장 — `stamp/` (12장) ★ 부모가 아이에게 찍어 주는 것

부모가 아이의 운동 기록에 찍어 주는 도장입니다.
**아이가 기다리는 보상이라 이 세트가 가장 예뻐야 합니다.**

원형 도장 모양(잉크로 찍은 듯한 살짝 거친 테두리)으로, **안쪽에 그림만** 넣습니다.
글자는 넣지 마세요 — 코드가 얹습니다.

| 파일                 | 프롬프트에 넣을 그림 설명                                          |
| -------------------- | ------------------------------------------------------------------ |
| `stamp/stamp-great`  | round ink stamp, inside: a big thumbs up hand                      |
| `stamp/stamp-star`   | round ink stamp, inside: a five pointed star                       |
| `stamp/stamp-heart`  | round ink stamp, inside: a heart shape                             |
| `stamp/stamp-medal`  | round ink stamp, inside: a medal with a ribbon                     |
| `stamp/stamp-fire`   | round ink stamp, inside: a flame shape                             |
| `stamp/stamp-muscle` | round ink stamp, inside: a flexed arm showing a bicep              |
| `stamp/stamp-clap`   | round ink stamp, inside: two hands clapping                        |
| `stamp/stamp-crown`  | round ink stamp, inside: a simple crown                            |
| `stamp/stamp-rocket` | round ink stamp, inside: a rocket pointing up                      |
| `stamp/stamp-smile`  | round ink stamp, inside: a smiling face, dot eyes and curved mouth |
| `stamp/stamp-flower` | round ink stamp, inside: a simple flower with five petals          |
| `stamp/stamp-empty`  | round ink stamp outline only, inside empty (아직 못 받은 자리)     |

**색 지정**: 도장은 남색(#1B2574) 테두리에 하늘색(#2784E6) 또는
노란색(#FFB800) 한 가지로만 채워 주세요. `stamp-empty` 는 옅은 회색(#E8EBF0) 테두리만.

---

## 3. 점수 · 성장 — `item/` (8장)

| 파일                    | 프롬프트에 넣을 그림 설명                                            |
| ----------------------- | -------------------------------------------------------------------- |
| `item/item-ruler-tall`  | a vertical height measuring ruler for children, with tick marks      |
| `item/item-scale`       | a simple bathroom weight scale seen from above                       |
| `item/item-growth-up`   | a small plant sprout growing out of the ground, two leaves           |
| `item/item-growth-tree` | the same plant grown taller with more leaves                         |
| `item/item-target`      | a round archery target with three rings and an arrow in the center   |
| `item/item-streak`      | a small paper calendar page with three check marks in a row          |
| `item/item-battery`     | a horizontal battery icon, three quarters full                       |
| `item/item-compare`     | two vertical bars of different height side by side, like a bar chart |

---

## 4. 부모 화면 — `char/` 추가 (6장)

1차에 부모 몸통은 있지만 **표정이 아이용뿐**이라 부모 표정이 부족합니다.

| 파일                  | 프롬프트에 넣을 그림 설명                                          |
| --------------------- | ------------------------------------------------------------------ |
| `char/face-parent-1`  | adult face, warm gentle smile, simple dot eyes, no hair (얼굴만)   |
| `char/face-parent-2`  | adult face, slightly worried expression, simple dot eyes, no hair  |
| `char/face-parent-3`  | adult face, proud smile with closed happy eyes, no hair            |
| `char/hair-mom-long`  | long straight black hair, hair only, no face, viewed from front    |
| `char/hair-dad-short` | short black adult male hair, hair only, no face, viewed from front |
| `char/hair-cap-blue`  | a blue baseball cap, cap only, no head, viewed from front          |

---

## 5. 빈 화면 · 장면 — `scene/` 추가 (8장)

글만 있는 빈 화면은 오류난 화면처럼 보입니다.

| 파일                        | 프롬프트에 넣을 그림 설명                                           |
| --------------------------- | ------------------------------------------------------------------- |
| `scene/scene-pick-role`     | a parent and a child standing side by side, both smiling and waving |
| `scene/scene-first-body`    | a child standing next to a tall height ruler, parent measuring      |
| `scene/scene-need-update`   | a child standing next to a height ruler that is now too short       |
| `scene/scene-waiting-stamp` | a child sitting and looking at a phone, waiting, small smile        |
| `scene/scene-got-stamp`     | a child holding up a sheet of paper covered in round stamps, happy  |
| `scene/scene-rest-day`      | a child lying on a cushion reading a book, relaxed                  |
| `scene/scene-together`      | a parent and a child stretching together on a mat, both smiling     |
| `scene/scene-no-video`      | a blank television screen with a play triangle, unplugged           |

---

## 6. 운동 부위 — `item/` 추가 (4장)

추천 운동이 어디에 좋은지 한눈에 보이게 합니다.

| 파일              | 프롬프트에 넣을 그림 설명                                   |
| ----------------- | ----------------------------------------------------------- |
| `item/part-leg`   | a simplified human leg, front view, isolated                |
| `item/part-arm`   | a simplified human arm, front view, isolated                |
| `item/part-core`  | a simplified human torso showing the belly area, front view |
| `item/part-heart` | a simple heart organ shape with a pulse line across it      |

---

## 받은 뒤에 제가 할 일

1. `public/assets/` 아래 분류대로 넣습니다
2. `npm run assets` 로 여백을 잘라내고 크기를 줄입니다 (1차 때 27MB → 1.9MB 였습니다)
3. `npm run check:assets` 가 빠진 이름을 잡아 줍니다

**연속 프레임(`anim/`)이 가장 중요합니다.** 다른 게 늦어도 이건 먼저 주시면
아이 화면을 바로 살릴 수 있습니다.
