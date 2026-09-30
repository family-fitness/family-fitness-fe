/**
 * 목 서버의 운동 목록을 BE 마이그레이션에서 뽑는다.
 *
 *   node scripts/mock-exercises.mjs ../family-fitness-be/backend/src/main/resources/db/migration
 *
 * 만드는 파일은 둘이다.
 *   src/mocks/kspo-clips.json   공단 영상 452편(V165). 영상 한 편이 구간 하나이고, 어느 나이대에게 가는지 적는다
 *   src/mocks/youtube-ages.json 유튜브 영상마다 나이대(V132). 유튜브 구간(clips.json)은 영상의 나이대를 따른다
 *
 * 공단 영상의 첫 장면 주소는 V165 에 없어서 그 앞 마이그레이션(V161~V164)에서 찾는다.
 * AI 표가 바뀌어 BE 에 새 마이그레이션이 생기면 이 스크립트를 다시 돌린다.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("BE 마이그레이션 폴더를 알려 주세요");
  process.exit(1);
}
const file = (prefix) => {
  const name = readdirSync(dir).find((f) => f.startsWith(`${prefix}__`));
  if (!name) throw new Error(`${prefix} 마이그레이션이 없습니다`);
  return readFileSync(join(dir, name), "utf8");
};

const FACTOR = {
  CARDIO: "심폐지구력",
  STRENGTH: "근력",
  MUSCULAR_ENDURANCE: "근지구력",
  FLEXIBILITY: "유연성",
  AGILITY: "민첩성",
  POWER: "순발력",
  COORDINATION: "협응력",
  BALANCE: "평형성",
};

/** `'가', 1, null, true` 같은 SQL 값 줄을 JS 값으로 */
function values(text) {
  const out = [];
  const re = /'((?:[^']|'')*)'|(null)|(true|false)|(-?\d+)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1] !== undefined) out.push(m[1].replace(/''/g, "'"));
    else if (m[2]) out.push(null);
    else if (m[3]) out.push(m[3] === "true");
    else out.push(Number(m[4]));
  }
  return out;
}

/** `insert into video_exercises (...) select ...` 줄에서 구간 하나씩 */
function clipRows(sql) {
  const rows = [];
  const re = /^insert into video_exercises \(([^)]*)\) select (.*)$/gm;
  let m;
  while ((m = re.exec(sql))) {
    const cols = m[1].split(",").map((c) => c.trim());
    const vals = values(m[2]);
    rows.push(Object.fromEntries(cols.map((c, i) => [c, vals[i]])));
  }
  return rows;
}

// 유튜브: 영상마다 나이대 하나
const v132 = file("V132");
const youtubeAges = {};
for (const r of clipRows(v132)) {
  if (r.age_group) youtubeAges[r.video_id] ??= r.age_group;
}

// 공단: 구간과 나이대 줄
const v165 = file("V165");
const ages = new Map();
for (const m of v165.matchAll(/^insert into video_exercise_labels .* values (.*);$/gm)) {
  for (const t of m[1].matchAll(/\('([^']+)', \d+, '([A-Z]+)'/g)) {
    const list = ages.get(t[1]) ?? [];
    if (!list.includes(t[2])) list.push(t[2]);
    ages.set(t[1], list);
  }
}
const media = new Map();
for (const m of v165.matchAll(
  /media_url = '(https:\/\/openapi\.kspo\.or\.kr\/web\/video\/[^']+)'.*? where video_id = '([^']+)'/g,
)) {
  media.set(m[2], m[1]);
}
const thumbs = new Map();
for (const name of readdirSync(dir).filter((f) => /^V16[1-4]__/.test(f))) {
  const sql = readFileSync(join(dir, name), "utf8");
  for (const m of sql.matchAll(/https:\/\/openapi\.kspo\.or\.kr\/web\/image\/([^/']+)\/[^']+/g)) {
    thumbs.set(m[1], m[0]);
  }
}

const kspo = clipRows(v165)
  .filter((r) => r.is_exercise)
  .map((r) => ({
    id: r.clip_id,
    videoId: r.video_id,
    startSec: r.start_sec,
    endSec: r.end_sec,
    title: r.title,
    factor: r.fitness_factor ? FACTOR[r.fitness_factor] : null,
    phase: r.phase,
    homeOk: r.home_ok,
    quiet: r.quiet,
    props: r.needs_props,
    mediaUrl: media.get(r.video_id) ?? `https://openapi.kspo.or.kr/web/video/${r.video_id}.mp4`,
    ...(thumbs.has(r.video_id) ? { thumbnailUrl: thumbs.get(r.video_id) } : {}),
    ageGroups: ages.get(r.clip_id) ?? (r.age_group ? [r.age_group] : []),
  }));

writeFileSync("src/mocks/kspo-clips.json", `${JSON.stringify(kspo, null, 2)}\n`);
writeFileSync("src/mocks/youtube-ages.json", `${JSON.stringify(youtubeAges, null, 2)}\n`);
console.log(
  `공단 구간 ${kspo.length}개(첫 장면 있는 것 ${kspo.filter((k) => k.thumbnailUrl).length}개), 유튜브 영상 ${Object.keys(youtubeAges).length}편`,
);
