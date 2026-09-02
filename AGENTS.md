<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 우리가족 체력키움 — 프론트엔드 작업 규칙

> 사람과 AI 개발 도구가 함께 읽는 파일이다. 새 화면·컴포넌트를 만들기 전에 먼저 읽는다.
> 규칙이 바뀌면 코드가 아니라 이 파일을 먼저 고친다.

## 이 프로젝트가 뭔가

국민체력100 공개데이터 기반 가족 체력 서비스. 한국스포츠정책과학원 공공데이터 활용 경진대회 출품작.
**앱스토어에 올리지 않는 웹(PWA)** 이다. 링크로 바로 들어오고, 홈 화면에 설치되면 앱처럼 보인다.

레포가 셋으로 나뉘어 있다.

| 레포                | 내용                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| `family-fitness-fe` | **여기.** Next.js 프론트엔드                                                        |
| `family-fitness-be` | Kotlin + Spring Boot. 기획 문서 `docs/user-flow.md`, `docs/erd.md` 원본이 여기 있다 |
| `family-fitness-ai` | Python AI 서비스 (RAG 검색·임베딩)                                                  |

## 폴더 구조

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

`components/ui` 와 `components/domain` 을 나누는 기준은 **이 서비스를 아느냐**다.
`Button` 은 다른 프로젝트에 그대로 옮겨도 되지만 `GradeBadge` 는 안 된다.

## 상태를 어디에 둘지

| 종류               | 어디에         | 예                                      |
| ------------------ | -------------- | --------------------------------------- |
| 서버에서 온 것     | TanStack Query | 가족 체력 지도, 측정 결과, 미션 목록    |
| URL 로 표현되는 것 | searchParams   | 선택된 탭, 필터                         |
| 그 외 전역         | Zustand        | 지금 보고 있는 프로필, 진행 중인 타이머 |

서버에서 받은 데이터를 `useState` 나 Zustand 에 복사해두지 않는다. 두 개가 어긋나기 시작한다.
"이 값이 서버에도 있나?" 를 먼저 묻고, 있으면 Query 에 맡긴다.

## 서버 컴포넌트와 클라이언트 컴포넌트

이 앱은 로그인 뒤에서만 돌고 검색 노출이 필요 없다. 대부분 클라이언트 컴포넌트다.

`"use client"` 는 **필요한 가장 아래 컴포넌트에** 붙인다. 페이지 최상단에 붙이면
그 아래 전부가 클라이언트 번들로 딸려 내려간다.

## 타입

- `any` 금지. ESLint 가 막는다. 정말 필요하면 `eslint-disable` 주석에 이유를 쓴다
- 백엔드 응답 타입은 `src/lib/api/types.ts` 한 곳에서만 정의한다. 화면에서 다시 만들지 않는다
- 실제 API 가 올라오면 손으로 쓴 타입을 버리고 OpenAPI 문서에서 자동 생성으로 갈아탄다

```bash
npx openapi-typescript http://localhost:8080/v3/api-docs -o src/lib/api/schema.ts
```

## 스타일

- Tailwind. 디자인 토큰은 `src/app/globals.css` 의 `@theme` 에 둔다
- 색은 토큰으로만 쓴다. `text-[#3b82f6]` 같은 임의값 금지
- 모바일 우선. 데스크톱은 가운데 정렬된 폰 너비 컨테이너로 본다
- 안전 영역(노치·홈 인디케이터)은 `env(safe-area-inset-*)` 로 처리한다

## UI 에서 하지 말 것

- **이모지를 UI 에 쓰지 않는다.** 아이콘은 `lucide-react` 를 쓴다
- **제목·라벨 앞에 세로 막대(accent bar) 를 붙이지 않는다**
- 로딩 상태를 스피너 하나로 때우지 않는다. 실제 레이아웃 모양의 스켈레톤을 쓴다
- 에러를 `alert()` 로 띄우지 않는다
