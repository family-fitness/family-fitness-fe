# 에셋 생성 명세 — 우리가족 체력키움

이미지 생성 AI 에 그대로 넣을 프롬프트 모음입니다.
**한 장에 완성된 그림을 뽑지 않습니다.** 부품을 따로 뽑아서 코드에서 겹쳐 한 장면을 만듭니다.
그래야 가족 구성원 5명이 각자 다르게 보이고, 나중에 옷 하나만 바꿔도 됩니다.

---

## 0. 모든 에셋 공통 규칙

아래 문장을 **모든 프롬프트 끝에 반드시 붙입니다.**

```
flat 2D vector illustration, thick uniform dark navy outline (#1B2574, 3px equivalent),
solid fill colors only, no gradients, no drop shadows, no texture, no highlights,
limited palette: white #FFFFFF, sky blue #2784E6, deep navy #1B2574, warm yellow #FFB800,
soft grey #E8EBF0, skin tone #FFD9C0, transparent background,
centered subject, generous even margin, PNG with alpha channel, square 1024x1024,
friendly public-service illustration style, no text, no letters, no numbers, no watermark
```

### 왜 이 규칙인가

| 규칙                     | 이유                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| 굵은 남색 외곽선         | 국민체력100 공식 마스코트가 쓰는 방식. 공공 서비스 인상이 남는다 |
| 그라데이션 · 그림자 금지 | 그라데이션은 AI 가 만든 티가 가장 크게 나는 지점이다             |
| 팔레트 6색 고정          | 70장이 한 세트로 보이려면 색이 같아야 한다                       |
| 배경 투명                | 부품을 겹쳐 쓰려면 필수다                                        |
| 글자 금지                | 이미지 생성 AI 는 한글을 제대로 못 쓴다. 글자는 코드로 얹는다    |
| 정사각 · 여백 넉넉       | 어디에 놓아도 잘리지 않는다                                      |

### 파일 규칙

```
public/assets/<분류>/<이름>.png
```

분류는 `char`(캐릭터 부품) · `move`(운동 동작) · `item`(사물) · `scene`(빈 화면) · `deco`(장식).

---

## A. 캐릭터 부품 — 겹쳐서 한 사람을 만든다 (28장)

우리 앱에는 부모 2명 · 자녀 3명이 나옵니다. 사람마다 그림을 따로 뽑으면 구성원이 늘 때마다
다시 뽑아야 합니다. **몸 → 머리 → 표정 → 옷 → 소품** 다섯 겹으로 나눠 조합합니다.

겹치는 순서는 `body → hair → face → top → prop` 이고, 모두 같은 1024 캔버스에
같은 위치로 그려야 합니다. 그래서 각 프롬프트에 **위치 지정 문장**이 들어갑니다.

### A-1. 몸통 5장 `char/body-*.png`

> 공통 추가 문장: `full body facing forward, arms relaxed at sides, standing straight, head area left blank and empty, body occupies lower 70% of canvas, flat white t-shirt and grey shorts`

| 파일           | 프롬프트 앞부분                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `body-adult-f` | `Body of an adult woman in her early forties, average build, simple rounded cartoon proportions, no head, neck ends flat at the top` |
| `body-adult-m` | `Body of an adult man in his early forties, average build, simple rounded cartoon proportions, no head, neck ends flat at the top`   |
| `body-child-m` | `Body of a nine year old boy, small rounded cartoon proportions, no head, neck ends flat at the top`                                 |
| `body-child-f` | `Body of a six year old girl, small rounded cartoon proportions, no head, neck ends flat at the top`                                 |
| `body-toddler` | `Body of a three year old toddler, very short chubby cartoon proportions, no head, neck ends flat at the top`                        |

### A-2. 머리 + 헤어 8장 `char/hair-*.png`

> 공통 추가 문장: `head only, no facial features at all, blank face, round head shape, positioned in upper 30% of canvas, neck stub at bottom`

| 파일            | 프롬프트 앞부분                                                        |
| --------------- | ---------------------------------------------------------------------- |
| `hair-bob`      | `Head with a short black bob haircut, straight fringe`                 |
| `hair-ponytail` | `Head with black hair tied in a ponytail`                              |
| `hair-short-m`  | `Head with short black side-parted hair`                               |
| `hair-crop`     | `Head with a very short black cropped haircut`                         |
| `hair-twintail` | `Head with black hair in two low pigtails`                             |
| `hair-curly`    | `Head with soft curly black hair`                                      |
| `hair-bun`      | `Head with black hair tied in a top bun`                               |
| `hair-cap`      | `Head with short black hair under a white sports cap with a blue brim` |

### A-3. 표정 6장 `char/face-*.png`

> 공통 추가 문장: `facial features only, no head outline, no hair, no skin fill, just eyes and mouth and optional cheeks, positioned in upper 30% of canvas at head center, small simple shapes`

| 파일           | 프롬프트 앞부분                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `face-calm`    | `Simple cartoon face: two small oval eyes and a small closed smile`                                |
| `face-happy`   | `Simple cartoon face: two curved-up closed eyes and an open smile, two small round pink cheeks`    |
| `face-proud`   | `Simple cartoon face: two round eyes looking up, a wide grin, two small round pink cheeks`         |
| `face-tired`   | `Simple cartoon face: two half-closed eyes and a small wavy mouth, one sweat drop near the temple` |
| `face-focused` | `Simple cartoon face: two determined narrowed eyes and a straight small mouth`                     |
| `face-cheer`   | `Simple cartoon face: two star-shaped sparkling eyes and an open cheering mouth`                   |

### A-4. 상의 6장 `char/top-*.png`

> 공통 추가 문장: `clothing only, no body, no head, no arms, torso-shaped garment shell, positioned in middle of canvas where an adult torso would be`

| 파일                | 프롬프트 앞부분                                                      |
| ------------------- | -------------------------------------------------------------------- |
| `top-jersey-blue`   | `Sky blue sleeveless sports jersey with a white round collar`        |
| `top-jersey-white`  | `White short-sleeve sports jersey with sky blue side stripes`        |
| `top-hoodie`        | `Soft grey zip-up hoodie, hood down`                                 |
| `top-tshirt-yellow` | `Warm yellow short-sleeve cotton t-shirt`                            |
| `top-tracksuit`     | `Deep navy tracksuit jacket with two white stripes down each sleeve` |
| `top-apron`         | `Simple white home apron over a plain shirt`                         |

### A-5. 소품 3장 `char/prop-*.png`

> 공통 추가 문장: `single object only, no person, positioned to the right of canvas center at hand height`

| 파일            | 프롬프트 앞부분                                                |
| --------------- | -------------------------------------------------------------- |
| `prop-headband` | `A sky blue sports headband, front view, worn-shape`           |
| `prop-towel`    | `A small white sports towel draped over an invisible shoulder` |
| `prop-bottle`   | `A white sports water bottle with a sky blue cap`              |

---

## B. 운동 동작 12장 `move/*.png`

측정 항목 6개와 미션 운동 6개입니다. 이건 부품이 아니라 **한 장에 한 동작**입니다.
동작을 부품으로 쪼개면 관절이 안 맞습니다.

> 공통 추가 문장: `single genderless rounded cartoon person in a white t-shirt and grey shorts, side view, clean simple pose, whole figure fits inside canvas with margin`

### B-1. 국민체력100 측정 항목 6장

| 파일                 | 프롬프트 앞부분                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `move-situp`         | `A person doing a curl-up on a mat, knees bent, hands crossed on chest, torso lifted halfway`                 |
| `move-sit-and-reach` | `A person sitting on the floor with legs straight forward, bending at the waist and reaching toward the toes` |
| `move-single-leg`    | `A person standing balanced on one leg, other knee lifted, arms out to the sides for balance`                 |
| `move-grip`          | `A person standing and squeezing a hand grip dynamometer in one hand, arm straight down`                      |
| `move-long-jump`     | `A person mid standing-long-jump, both feet off the ground, knees tucked, arms swung forward`                 |
| `move-shuttle-run`   | `A person running fast and turning at a marker cone, one arm forward`                                         |

### B-2. 미션 운동 6장

| 파일                | 프롬프트 앞부분                                                       |
| ------------------- | --------------------------------------------------------------------- |
| `move-stretch-back` | `A person sitting cross-legged and stretching both arms up overhead`  |
| `move-stretch-leg`  | `A person sitting with one leg extended, stretching toward that foot` |
| `move-plank`        | `A person holding a forearm plank position on a mat`                  |
| `move-squat`        | `A person in a half squat, arms extended forward`                     |
| `move-jump-rope`    | `A person jumping rope, rope arc above the head`                      |
| `move-walk`         | `A person walking briskly, one arm forward, small step`               |

---

## C. 사물 12장 `item/*.png`

측정 · 미션 · 기록에 쓰는 물건입니다. 화면 여기저기 작게 놓습니다.

> 공통 추가 문장: `single object, no person, no background, front or three-quarter view, object fills 70% of canvas`

| 파일             | 프롬프트 앞부분                                                     |
| ---------------- | ------------------------------------------------------------------- |
| `item-tape`      | `A yellow retractable tape measure, partly pulled out`              |
| `item-stopwatch` | `A round white sports stopwatch with a sky blue rim, blank face`    |
| `item-grip`      | `A hand grip dynamometer, white body with a sky blue handle`        |
| `item-mat`       | `A rolled up sky blue exercise mat`                                 |
| `item-cone`      | `A single yellow training cone`                                     |
| `item-shoes`     | `A pair of white running shoes with sky blue accents, side by side` |
| `item-bottle`    | `A white sports water bottle with a sky blue cap, standing upright` |
| `item-clipboard` | `A white clipboard with a blank sheet of paper, no writing`         |
| `item-medal`     | `A round warm yellow medal on a sky blue ribbon, blank center`      |
| `item-trophy`    | `A small warm yellow trophy cup, blank front`                       |
| `item-whistle`   | `A sky blue coach whistle on a white cord`                          |
| `item-calendar`  | `A small white desk calendar page, blank, no numbers`               |

---

## D. 빈 화면 · 상태 장면 10장 `scene/*.png`

화면이 비었을 때 놓습니다. 여기가 그림이 가장 필요한 자리입니다 —
글만 있으면 "오류난 화면" 처럼 보입니다.

> 공통 추가 문장: `simple scene, one or two elements only, lots of empty space, calm and encouraging mood`

| 파일                     | 언제 쓰나           | 프롬프트 앞부분                                                                        |
| ------------------------ | ------------------- | -------------------------------------------------------------------------------------- |
| `scene-no-record`        | 측정 기록이 없을 때 | `A blank clipboard and a tape measure lying next to it, waiting to be used`            |
| `scene-first-measure`    | 첫 측정 권유        | `A rounded cartoon person standing next to a height measuring stick, looking up at it` |
| `scene-no-mission`       | 미션이 없을 때      | `An empty running track lane with a single starting block, no person`                  |
| `scene-waiting-approval` | 승인 대기           | `A clipboard with a large blank checkbox and a pen resting on it`                      |
| `scene-no-video`         | 영상이 없을 때      | `A blank tablet screen propped on a stand next to a rolled exercise mat`               |
| `scene-no-cheer`         | 응원이 없을 때      | `Two empty speech bubbles overlapping, blank inside`                                   |
| `scene-too-young`        | 만 4세 미만         | `A tiny toddler figure holding a large adult hand, only the hand and forearm visible`  |
| `scene-invite`           | 초대 대기           | `An open envelope with a blank card sliding out`                                       |
| `scene-done`             | 미션 완료           | `A finish line tape being broken, ribbon flying to both sides, no person`              |
| `scene-error`            | 오류                | `A single training cone tipped over on its side`                                       |

---

## E. 장식 부품 12장 `deco/*.png`

배경이나 카드 귀퉁이에 겹쳐 쓰는 조각입니다. **이것들이 부품 조립의 핵심입니다** —
장면 하나를 통째로 뽑는 대신, 이 조각들을 배치해 화면마다 다른 장면을 만듭니다.

> 공통 추가 문장: `single decorative element, no person, no object detail, simple flat shape`

| 파일               | 프롬프트 앞부분                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `deco-track-lines` | `Three parallel curved white running track lane lines on a transparent background, horizontal, seen from above` |
| `deco-grass`       | `A low strip of simple flat grass tufts, horizontal band`                                                       |
| `deco-cloud-1`     | `One simple rounded flat cloud`                                                                                 |
| `deco-cloud-2`     | `One simple rounded flat cloud, wider and lower than the first`                                                 |
| `deco-sun`         | `A simple flat sun with short straight rays, warm yellow`                                                       |
| `deco-confetti`    | `A scatter of small flat confetti pieces in sky blue and warm yellow, no overlap`                               |
| `deco-sparkle`     | `Three simple four-pointed sparkle shapes of different sizes`                                                   |
| `deco-arrow-up`    | `One simple thick upward curved arrow`                                                                          |
| `deco-star`        | `One simple flat five-pointed star, warm yellow`                                                                |
| `deco-ribbon`      | `A short flat ribbon banner, blank, no text`                                                                    |
| `deco-dots`        | `A small field of evenly spaced flat dots, sky blue`                                                            |
| `deco-line-wave`   | `One simple flat wavy horizontal line`                                                                          |

---

## F. 등급 도장 5장 `item/grade-*.png`

국민체력100 등급 1~5 를 나타냅니다.
**색으로 좋고 나쁨을 가르지 않습니다.** 낮은 등급을 빨강으로 그리면 아이가 자기 화면에서
자기가 나쁘다는 신호를 봅니다. 같은 모양에 테두리 겹수만 다르게 합니다.

> 공통 추가 문장: `circular badge seal, deep navy outline, white fill, no text, no numbers, flat`

| 파일      | 프롬프트 앞부분                                                                         |
| --------- | --------------------------------------------------------------------------------------- |
| `grade-1` | `A circular badge with five concentric navy rings and a small laurel leaf on each side` |
| `grade-2` | `A circular badge with four concentric navy rings and a small laurel leaf on each side` |
| `grade-3` | `A circular badge with three concentric navy rings`                                     |
| `grade-4` | `A circular badge with two concentric navy rings`                                       |
| `grade-5` | `A circular badge with one navy ring`                                                   |

---

## 정리 — 총 73장

| 분류          | 장수 | 쓰는 곳                    |
| ------------- | ---- | -------------------------- |
| A 캐릭터 부품 | 28   | 구성원 아바타. 겹쳐서 조합 |
| B 운동 동작   | 12   | 측정 입력 · 미션 · 영상    |
| C 사물        | 12   | 카드 귀퉁이 · 목록 아이콘  |
| D 빈 화면     | 10   | 데이터가 없을 때           |
| E 장식 부품   | 12   | 배경 조립                  |
| F 등급 도장   | 5    | 결과 화면                  |

---

## 받은 뒤 확인할 것

1. **배경이 진짜 투명한가** — 흰색으로 채워져 오는 경우가 많습니다
2. **외곽선 굵기가 같은가** — 한 장만 얇으면 겹쳤을 때 티가 납니다
3. **캐릭터 부품의 위치가 맞는가** — `body` 위에 `hair` 를 얹었을 때 목이 이어져야 합니다
4. **글자가 들어가지 않았는가** — 이미지 생성 AI 는 한글을 못 씁니다. 글자는 코드로 얹습니다
5. **그라데이션이 없는가** — 있으면 다시 뽑습니다. AI 티가 가장 크게 나는 지점입니다

파일은 `public/assets/<분류>/` 아래에 규칙대로 넣어 주시면 코드에서 바로 씁니다.
