# 우리가족 체력키움 — 프론트엔드

국민체력100 공개데이터 기반 가족 체력 서비스의 웹 프론트엔드.
국민대학교 2026-2학기 학생설계형 알파프로젝트 / 한국스포츠정책과학원 공공데이터 활용 경진대회 출품작.

> 아이와 부모가 함께 운동하는 웹 서비스(PWA). 앱스토어 심사 없이 링크 하나로 들어오고,
> 홈 화면에 설치하면 앱처럼 동작합니다.

## 관련 레포

| 레포 | 내용 |
|---|---|
| [family-fitness-fe](https://github.com/family-fitness/family-fitness-fe) | **여기.** 프론트엔드 |
| [family-fitness-be](https://github.com/family-fitness/family-fitness-be) | Kotlin + Spring Boot. 기획 문서(`docs/user-flow.md`, `docs/erd.md`) 원본 |
| [family-fitness-ai](https://github.com/family-fitness/family-fitness-ai) | Python AI 서비스 (RAG 검색·임베딩) |

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js (App Router) · React · TypeScript |
| 서버 상태 | TanStack Query |
| 전역 상태 | Zustand |
| 스타일 | Tailwind CSS |
| 차트 | Recharts |
| 폼 | React Hook Form + Zod |
| 목 서버 | MSW |
| PWA | Serwist |

Next.js 를 고른 이유는 공공데이터포털 API 가 CORS 를 열어주지 않기 때문입니다.
브라우저가 직접 호출할 수 없어 중계 서버가 필요한데, Next 의 라우트 핸들러로 프론트 안에서
해결됩니다. 서비스키도 브라우저에 노출되지 않습니다.

## 팀

유범익 (PM · AI/ML) · 이상진 (Frontend · UX · 활동량 연동) · 최비성 (Backend · 데이터)
지도교수: 김정우 (교양대학)
