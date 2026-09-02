# 우리가족 체력키움 — 프론트엔드

국민체력100 공개데이터 기반 가족 체력 서비스의 웹 프론트엔드.
국민대학교 2026-2학기 학생설계형 알파프로젝트 / 한국스포츠정책과학원 공공데이터 활용 경진대회 출품작.

> 아이와 부모가 함께 운동하는 웹 서비스(PWA). 앱스토어 심사 없이 링크 하나로 들어오고,
> 홈 화면에 설치하면 앱처럼 동작합니다.

## 관련 레포

| 레포 | 내용 |
|---|---|
| [family-fitness-fe](https://github.com/family-fitness/family-fitness-fe) | **여기.** Next.js 프론트엔드 |
| [family-fitness-be](https://github.com/family-fitness/family-fitness-be) | Kotlin + Spring Boot. 기획 문서(`docs/user-flow.md`, `docs/erd.md`) 원본 |
| [family-fitness-ai](https://github.com/family-fitness/family-fitness-ai) | Python AI 서비스 (RAG 검색·임베딩) |

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript |
| 서버 상태 | TanStack Query |
| 전역 상태 | Zustand |
| 스타일 | Tailwind CSS v4 |
| 차트 | Recharts |
| 폼 | React Hook Form + Zod |
| 애니메이션 | Motion |
| 목 서버 | MSW |
| PWA | Serwist |

## 시작하기

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

백엔드가 아직 구현 전이라 기본값은 **MSW 목 서버**입니다. `.env.local` 의
`NEXT_PUBLIC_API_MOCKING=enabled` 를 지우면 실제 백엔드(`BACKEND_ORIGIN`)로 붙습니다.

### 백엔드 연동

`/api/v1/*` 요청은 `next.config.ts` 의 rewrites 가 백엔드로 넘깁니다.
브라우저 입장에서는 프론트와 백엔드가 같은 출처라 세션 쿠키가 그대로 실려 가고,
백엔드에 CORS 설정을 부탁할 필요가 없습니다.

```
브라우저  →  /api/v1/families/...   (같은 출처로 보임)
Next 서버 →  http://localhost:8080/api/v1/families/...
```

## 명령어

| 명령어 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run verify` | **CI 와 같은 검사** — 포맷 + 린트 + 타입체크 |
| `npm run lint:fix` | 린트 자동 수정 |
| `npm run format` | 포맷 자동 정리 |

커밋하면 `pre-commit` 훅이 변경 파일만 자동으로 린트·포맷합니다.

## 작업 규칙

브랜치·커밋·PR 규칙과 화면을 만들 때 지켜야 할 도메인 규칙은 [AGENTS.md](./AGENTS.md) 에 있습니다.
새 화면을 만들기 전에 읽어 주세요. Claude Code 등 AI 도구도 이 파일을 읽고 규칙을 따릅니다.

간단 요약:

```bash
# 1. 이슈를 연다  →  이슈 번호 확인
# 2. 브랜치를 판다
git switch -c feature/FE-12-login-page

# 3. 작업하고 커밋한다
git commit -m "feat: 카카오 로그인 버튼 추가"

# 4. develop 으로 PR
gh pr create --base develop
```

## 팀

유범익 (PM · AI/ML) · 이상진 (Frontend · UX · 활동량 연동) · 최비성 (Backend · 데이터)
지도교수: 김정우 (교양대학)
