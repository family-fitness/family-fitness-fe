/**
 * 브랜치 이름 검사.
 * GitHub Ruleset: ^(feature|hotfix|chore|docs|release)/[\w\-]+
 * feat/ 가 아니라 feature/ 다. 슬래시는 한 번만 쓴다.
 */
import { execSync } from "node:child_process";

const PROTECTED = ["main", "develop"];
const PATTERN = /^(feature|hotfix|chore|docs|release)\/[\w-]+$/;

const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();

if (PROTECTED.includes(branch)) process.exit(0);

if (!PATTERN.test(branch)) {
  console.error(`
  브랜치 이름이 팀 규칙에 맞지 않습니다.

    현재 브랜치:  ${branch}

    형식:  <type>/<이슈번호>-<설명>
    type:  feature hotfix chore docs release

    예)  feature/FE-12-login-page
         chore/FE-3-update-dependencies
         hotfix/FE-9-fix-null-crash
         release/v1-0-0

    이름 바꾸기:  git branch -m <새이름>
`);
  process.exit(1);
}
