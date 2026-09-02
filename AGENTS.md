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
