<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 우리가족 체력키움 — 프론트엔드 작업 규칙

> 사람과 AI 가 함께 읽는 파일이다. 새 화면·컴포넌트를 만들기 전에 먼저 읽는다.
> 규칙이 바뀌면 코드가 아니라 이 파일을 먼저 고친다.

## 이 프로젝트가 뭔가

국민체력100 공개데이터 기반 가족 체력 서비스. 한국스포츠정책과학원 공공데이터 활용 경진대회 출품작.
**앱스토어에 올리지 않는 웹(PWA)** 이다. 링크로 바로 들어오고, 홈 화면에 설치되면 앱처럼 보인다.

레포가 셋으로 나뉘어 있다.

| 레포 | 내용 |
|---|---|
| `family-fitness/family-fitness-fe` | **여기.** Next.js 프론트엔드 |
| `family-fitness/family-fitness-be` | Kotlin + Spring Boot. 기획 문서 `docs/user-flow.md`, `docs/erd.md` 원본이 여기 있다 |
| `family-fitness/family-fitness-ai` | Python AI 서비스 (RAG 검색·임베딩) |

**백엔드는 아직 구현 전이다.** 화면은 MSW 목 데이터 위에서 만들고, 실제 API 가 올라오면 갈아끼운다.

## 절대 어기면 안 되는 도메인 규칙

발표 자리에서 무너지는 지점들이다. 화면 문구 하나까지 여기에 걸린다.

### 1. 코치 제안은 미션이 아니다

주간 코치가 만든 것은 **제안(proposal)** 이고, 보호자가 승인해야 비로소 **미션(mission)** 이 된다.
승인 전에는 미션이 0건이다. 백엔드 테스트로 증명하는 우리 서비스의 핵심 주장이다.

- 승인 전 화면에서 "미션"이라는 단어를 쓰지 않는다. "제안", "이번 주 제안"이라고 쓴다
- 승인 버튼은 `role === "PARENT"` 인 프로필에만 보인다. 자녀 계정은 버튼 자체가 없다
- 거절도 1급 동작이다. 거절 사유를 받는다

### 2. 걸음수는 자기 신고다. 자동 실측인 척하지 않는다

웹에서 서버가 진짜로 아는 건 **유튜브 재생 진행률**과 **앱 내 타이머** 둘뿐이다.

| `verifiedBy` | 화면 표기 | 성격 |
|---|---|---|
| `VIDEO_PROGRESS` | "영상 완주로 확인됨" | 서버가 안다 |
| `TIMER` | "타이머로 확인됨" | 서버가 안다 |
| `SELF_REPORT` | "직접 입력함 · 부모 확인 필요" | 사람이 적은 값 |

`SELF_REPORT` 에 "자동 인증", "자동 동기화" 같은 말을 붙이지 않는다.

### 3. 10년 후 예측은 예언이 아니다

국민체력100은 횡단면 데이터라 개인 추적이 불가능하다.

- 쓸 문구: "지금과 같은 조건의 10년 위 연령대는 여기 있습니다"
- 쓰면 안 되는 문구: "당신은 10년 뒤 이렇게 됩니다"
- `prediction.disclaimer` 는 화면에서 **제거하거나 접을 수 없다.** 항상 보이게 둔다
- p10~p90 신뢰구간 음영을 반드시 같이 그린다. 중앙값만 그리면 확정된 미래처럼 보인다

### 4. 측정할 수 없는 사람이 있다

- `profile.measurable === false` (만 4세 미만) 면 측정 버튼을 **렌더링하지 않는다.** 비활성화가 아니라 없앤다
- 측정 기록이 없으면 `headline === null` → "첫 측정을 등록하면 지도가 그려져요"
- 동의가 철회되면 측정·활동 저장이 403 이다. 에러 코드 `GUARDIAN_CONSENT_REQUIRED` 를 사람 말로 옮긴다

### 5. 측정 폼은 두 구역으로 나눈다

`FitnessItemMeta.optionalInput` 이 기준이다.

- `false` → "집에서 잴 수 있어요" (필수)
- `true` → "장비가 있으면 더 정확해요" (선택). 악력계·넓은 공간이 필요한 항목

첫 화면에서 장비를 요구하면 거기서 이탈한다. 선택 구역은 접힌 상태로 시작한다.

### 6. AI 코치 답변에는 근거가 붙는다

`CoachMessage.role === "ASSISTANT"` 인데 `citations` 가 비어 있으면 **버그로 본다.**
답변 아래 인용 카드를 항상 렌더링한다.

### 7. 계정과 프로필은 다르다

로그인은 **계정(user)** 이 하고, 측정·미션·활동은 전부 **프로필(profile)** 에 달린다.
한 계정이 여러 프로필을 관리한다(부모 계정 하나로 온 가족). 화면에서 "나"를 말할 때
그게 계정인지 프로필인지 항상 구분한다.

## 코드 규칙

### 폴더 구조

```
src/
  app/              라우트만. 화면 조립과 데이터 로딩까지
  components/
    ui/             도메인을 모르는 기본 부품 (Button, Card, Sheet)
    app-shell/      하단 탭바, 헤더 등 앱 껍데기
    domain/         이 서비스를 아는 컴포넌트 (MemberCard, GradeBadge)
  lib/
    api/            백엔드 계약 — types.ts, client.ts, queries.ts
    *.ts            순수 함수. 여기 있는 건 전부 테스트 가능해야 한다
  mocks/            MSW. 백엔드가 없는 동안의 가짜 서버
  stores/           Zustand. 서버가 모르는 상태만
  providers/        Provider 컴포넌트
```

### 상태를 어디에 둘지

- **서버에서 온 것** → TanStack Query. `useState` 에 복사해두지 않는다
- **URL 로 표현되는 것**(선택된 탭, 필터) → searchParams
- **그 외 전역**(현재 보고 있는 프로필, 진행 중 타이머) → Zustand
- Zustand 에 서버 데이터를 캐싱하지 않는다. 두 개가 어긋나기 시작한다

### 서버 컴포넌트 / 클라이언트 컴포넌트

이 앱은 로그인 뒤에서만 돌고 SEO 가 필요 없다. 대부분 클라이언트 컴포넌트다.
`"use client"` 는 **필요한 가장 아래 컴포넌트에** 붙인다. 페이지 최상단에 붙여서 전부 끌고 내려가지 않는다.

### 타입

- `any` 금지. ESLint 가 막는다. 정말 필요하면 `eslint-disable` 주석에 이유를 쓴다
- 백엔드 응답 타입은 `src/lib/api/types.ts` 한 곳에서만 정의한다. 화면에서 다시 만들지 않는다
- 실제 API 가 올라오면 `npx openapi-typescript http://localhost:8080/v3/api-docs -o src/lib/api/schema.ts` 로 자동 생성으로 갈아탄다

### 스타일

- Tailwind. 디자인 토큰은 `src/app/globals.css` 의 `@theme` 에 있다
- 색은 토큰으로만 쓴다. `text-[#3b82f6]` 같은 임의값 금지
- 모바일 우선. 데스크톱은 가운데 정렬된 폰 너비 컨테이너로 본다
- 안전 영역(노치·홈 인디케이터)은 `env(safe-area-inset-*)` 로 처리한다

### UI 에서 하지 말 것

- **이모지를 UI 에 쓰지 않는다.** 아이콘은 `lucide-react` 를 쓴다
- **제목·라벨 앞에 세로 막대(accent bar) 를 붙이지 않는다**
- 로딩 상태를 스피너 하나로 때우지 않는다. 실제 레이아웃 모양의 스켈레톤을 쓴다
- 에러를 `alert()` 로 띄우지 않는다

## 협업 규칙

### 브랜치

| 브랜치 | 역할 |
|---|---|
| `main` | 항상 배포 가능한 상태. 운영 반영·태그 관리 |
| `develop` | 다음 릴리스를 위한 통합 브랜치. 기능 브랜치가 모이는 곳 |
| `feature/*` | 단일 기능 단위. 완료 후 PR 로 develop 에 병합 |
| `hotfix/*` | main 에서 발견된 긴급 이슈. 수정 후 main + develop 양쪽 반영 |
| `release/*` | 배포 전 최종 점검과 버전 태깅 |

GitHub Ruleset 정규식 — `.husky/check-branch-name.mjs` 가 push 전에 같은 걸 검사한다.

```
^(feature|hotfix|chore|docs|release)/[\w\-]+
```

`feat/` 이 아니라 `feature/` 다. 슬래시는 한 번만 쓴다.

```
feature/FE-12-login-page
chore/FE-3-update-dependencies
hotfix/FE-9-fix-null-crash
release/v1-0-0
```

### 작업 순서

1. 이슈를 먼저 연다 (`[FEAT]` / `[BUG]` 템플릿)
2. 이슈 번호를 넣어 브랜치를 판다 — `feature/FE-<이슈번호>-<설명>`
3. 커밋한다. `npm run verify` 가 통과해야 한다
4. develop 으로 PR 을 연다. PR 템플릿의 `Closes #<이슈번호>` 를 채운다
5. 리뷰 후 병합

### 커밋

GitHub Ruleset 정규식 — `.husky/check-commit-msg.mjs` 가 커밋할 때 같은 걸 검사한다.

```
^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([\w\p{Hangul}\-\.]+\))?(!)?: [\w\p{Hangul} ]+([\s\S]*)
```

무엇을 했는지가 제목에 있어야 한다.

| 나쁨 | 좋음 |
|---|---|
| `feat: 로그인` | `feat: 카카오 로그인 버튼 추가` |
| `fix: 버그 수정` | `fix: 측정 폼 선택 항목 검증 누락 수정` |
| `chore: 업데이트` | `chore(deps): TanStack Query 5.102 로 올림` |

### 커밋 전 확인

```bash
npm run verify     # format:check + lint + typecheck. CI 와 같은 검사
```
