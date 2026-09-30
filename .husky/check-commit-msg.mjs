/**
 * 커밋 메시지 검사.
 *
 * GitHub Ruleset 에 등록된 규칙과 같다. Ruleset 을 고치면 여기도 같이 고칠 것.
 * 다만 JavaScript 정규식에는 \p{Hangul} 이라는 속성이 없어서 \p{Script=Hangul} 로 쓴다.
 */
import { readFileSync } from "node:fs";

const PATTERN =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([\w\p{Script=Hangul}\-.]+\))?(!)?: [\w\p{Script=Hangul} ]+([\s\S]*)/u;

const message = readFileSync(process.argv[2], "utf8");
const subject = message.split("\n")[0].trim();

// 빈 메시지(커밋 취소)나 머지 커밋은 통과시킨다
if (!subject || subject.startsWith("#") || subject.startsWith("Merge ")) {
  process.exit(0);
}

if (!PATTERN.test(subject)) {
  console.error(`
  커밋 메시지가 팀 규칙에 맞지 않습니다.

    입력한 메시지:  ${subject}

    형식:  <type>(<scope>)?: <subject>
    type:  build chore ci docs feat fix perf refactor revert style test

    좋은 예)  feat: 가족 체력 지도 카드 추가
              fix: 측정 폼 선택 항목 검증 누락 수정
              chore(deps): TanStack Query 버전 올림

    나쁜 예)  feat: 로그인          <- 무엇을 했는지가 없다
              fix: 버그 수정         <- 어떤 버그인지가 없다
              update                <- type 이 없다
`);
  process.exit(1);
}
