/* eslint-disable @typescript-eslint/no-explicit-any -- module rows are read untyped by this tooling */
/**
 * The grade-reach report (`docs/reports/grade-reach.md`): one grade written
 * on one piece of a drawn place's played year, and every other piece it
 * moves, with before and after weights; the 128 shipped grades' reach; and a
 * speech composed before and after on fixed seeds. Development tooling; it
 * words nothing and writes no grade.
 *
 *   node --import tsx scripts/dialogue-batch/grade-reach-report.ts \
 *     [--seed grade-reach-oct27] [--days 365] [--out docs/reports/grade-reach.md]
 *
 * Places are drawn in turn (`drawPlace("<seed>:<n>", "grade-reach")`) until
 * one's year decides a race, so a victory and a concession can be composed
 * from its records. The graded piece is the first piece of the winner's
 * election-night speech whose pattern, voice and register group holds at least
 * ten other pieces in at least three banks.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import {
  CALIBRATION,
  gradeReach,
  pieceFactor,
  type CalibrationTable,
} from "../../src/english/calibration";
import { composeAddress } from "../../src/english/english-composition";
import { PART_GRADES } from "../../src/english/english-grades";
import { buildReach, groupKey } from "../../src/english/grade-reach";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { drawPlace } from "../core2-year/place";
import { addressMoves } from "../english-corpus/address-bank";
import { readPieces } from "./apply-grades";
import { OPENING_DATE } from "./play-lives";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "grade-reach-oct27");
const days = Number(option("days", "365"));
const out = option("out", "docs/reports/grade-reach.md");

const pieces = readPieces();
const classes = CALIBRATION.registerClasses!;
const WEIGHT = 1000; // the shares a voiced pick scales a piece's weight to
const weightOf = (key: string, table: CalibrationTable) =>
  Math.max(1, Math.round(WEIGHT * pieceFactor([key], table)));

/* ---- a drawn place whose year decides a race ---- */
interface Race {
  winner: string;
  loser: string;
  office: string;
}
const passedOver: string[] = [];
let core!: CoreState;
let place!: ReturnType<typeof drawPlace>;
let races: Race[] = [];
for (let life = 0; life < 12 && !races.length; life += 1) {
  place = drawPlace(`${seed}:${life}`, "grade-reach");
  setBookkeeping(false); // play runs without the debug checks (AGENTS.md)
  const world = buildBenchWorld(place.seed, OPENING_DATE, {
    twoLevel: true,
    placeKey: place.key,
  });
  core = world.core;
  for (let day = 0; day < days; day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const api = coreAPI(core);
  const filings = api
    .moduleState("core2-elections-v1")
    .table("filings")
    .rows() as any[];
  const contests = new Map<string, any>(
    (
      api.moduleState("core2-elections-v1").table("contests").rows() as any[]
    ).map((row) => [row.id as string, row]),
  );
  races = [];
  for (const result of api
    .moduleState("core2-voting-v1")
    .table("results")
    .rows() as any[]) {
    const field = filings.filter((f) => f.contestId === result.contestId);
    const winner = field.find(
      (f) => f.id === result.winnerId || f.personId === result.winnerId,
    )?.personId;
    const loser = field.find((f) => f.personId !== winner)?.personId;
    const office = contests.get(result.contestId)?.title;
    if (
      winner &&
      loser &&
      office &&
      core.people.get(winner) &&
      core.people.get(loser)
    )
      races.push({ winner, loser, office });
  }
  if (!races.length) passedOver.push(place.name);
}
if (!races.length) throw new Error("no drawn place decided a race in its year");

const nameOf = (id: string) => {
  const row = core.people.get(id as any);
  return row ? `${row.givenName} ${row.familyName}` : id;
};
const town = place.name.split(",")[0]!;
const packetFor = (
  race: Race,
  who: string,
  other: string,
  momentKey: string,
) => {
  const facts: Record<string, { text: string; sourceRecordIds: string[] }> = {
    name: { text: nameOf(who), sourceRecordIds: [who] },
    place: { text: town, sourceRecordIds: [who] },
    office: { text: race.office, sourceRecordIds: [who] },
    opponent: { text: nameOf(other), sourceRecordIds: [other] },
  };
  return {
    surface: "dialogue",
    momentKey,
    worldSeed: seed,
    bankVersion: "words-address-v1",
    stage: "chair-male",
    sourceRecordIds: Object.values(facts).flatMap((f) => f.sourceRecordIds),
    facts,
    speaker: { personId: "speaker", traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: "speaker",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
};
const speech = (
  register: "victory" | "concession",
  race: Race,
  momentKey: string,
  calibration: CalibrationTable,
) => {
  const card = addressMoves(register);
  const [who, other] =
    register === "victory"
      ? [race.winner, race.loser]
      : [race.loser, race.winner];
  const composed = composeAddress(
    packetFor(race, who, other, momentKey),
    card.register,
    card.moves,
    { calibration },
  );
  return composed.kind === "rendered" ? composed : null;
};

/* ---- the graded piece: one the winner's election-night speech said ---- */
const race = races[0]!;
const groups = new Map<string, string[]>();
for (const [key, piece] of pieces) {
  const group = groupKey(piece, classes);
  groups.set(group, [...(groups.get(group) ?? []), key]);
}
const reachOf = (graded: string) => {
  const group = groups.get(groupKey(pieces.get(graded)!, classes))!;
  const peers = group.filter((key) => key !== graded);
  return {
    group,
    peers,
    banks: new Set(peers.map((k) => pieces.get(k)!.bank)),
  };
};
// The pieces the year's speeches said: the winner's election night and the
// loser's concession, each on twenty moments of the year.
const saidInYear = [
  ...new Set(
    (["victory", "concession"] as const).flatMap((register) =>
      Array.from({ length: 20 }, (_, at) =>
        (
          speech(register, race, `${seed}:grade:${at}`, CALIBRATION)?.moves ??
          []
        ).flatMap((move) => move.parts.map((part) => part.variantKey)),
      ).flat(),
    ),
  ),
];
const gradedKey = saidInYear.find((key) => {
  const reach = pieces.has(key) ? reachOf(key) : undefined;
  return (
    reach &&
    reach.peers.length >= 10 &&
    reach.banks.size >= 3 &&
    !(key in PART_GRADES.parts)
  );
});
if (!gradedKey)
  throw new Error(
    `no piece of the speech reaches three banks: ${saidInYear.map((k) => `${k} ${pieces.has(k) ? `${groupKey(pieces.get(k)!, classes)} ${reachOf(k).peers.length}/${reachOf(k).banks.size}` : "unknown"}`).join("; ")}`,
  );
const reach = reachOf(gradedKey);

const after: CalibrationTable = {
  ...CALIBRATION,
  reach: buildReach(
    pieces,
    {
      ...PART_GRADES,
      parts: {
        ...PART_GRADES.parts,
        [gradedKey]: {
          good: 1,
          bad: 0,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    },
    classes,
  ),
};
const moved = reach.peers
  .map((key) => ({
    key,
    bank: pieces.get(key)!.bank,
    before: weightOf(key, CALIBRATION),
    after: weightOf(key, after),
  }))
  .filter((row) => row.before !== row.after)
  .sort((a, b) => a.bank.localeCompare(b.bank) || a.key.localeCompare(b.key));
const movedBanks = new Set(moved.map((row) => row.bank));

/* ---- a speech composed before and after, on fixed seeds ---- */
const SEEDS = 300;
const flips: Record<string, { count: number; first?: string }> = {};
for (const register of ["victory", "concession"] as const) {
  flips[register] = { count: 0 };
  for (let at = 0; at < SEEDS; at += 1) {
    const key = `${seed}:pick:${at}`;
    const was = speech(register, race, key, CALIBRATION);
    const now = speech(register, race, key, after);
    if (!was || !now || was.text === now.text) continue;
    flips[register]!.count += 1;
    flips[register]!.first ??=
      `moment \`${key}\`\n\n  before: ${was.text}\n\n  after:  ${now.text}`;
  }
}

/* ---- the shipped grades' reach ---- */
const ledgerKeys = Object.keys(PART_GRADES.parts);
const profiled = ledgerKeys.filter((key) => pieces.has(key));
const unprofiled = ledgerKeys.filter((key) => !pieces.has(key));
const shipped = CALIBRATION.reach!;
const reachedNow = Object.keys(shipped.profiles).filter(
  (key) => gradeReach([key], CALIBRATION) !== 1,
);
const byBank = new Map<string, number>();
for (const key of reachedNow)
  byBank.set(
    pieces.get(key)!.bank,
    (byBank.get(pieces.get(key)!.bank) ?? 0) + 1,
  );
const groupRows = Object.entries(shipped.groups)
  .map(([group, row]) => ({
    group,
    net: row.net,
    graded: Object.keys(row.graded).length,
    reached: (groups.get(group) ?? []).length,
    banks: new Set((groups.get(group) ?? []).map((k) => pieces.get(k)!.bank))
      .size,
    factor: (() => {
      const peer = (groups.get(group) ?? []).find((k) => !(k in row.graded));
      return peer ? gradeReach([peer], CALIBRATION) : 1;
    })(),
  }))
  .sort((a, b) => b.reached - a.reached);

const lines: string[] = [];
lines.push(
  "# Grade reach",
  "",
  `One grade on one piece moves every piece that shares its pattern, voice and register, across banks. Built by \`scripts/dialogue-batch/grade-reach-report.ts\` (\`${process.argv.slice(2).join(" ") || "defaults"}\`).`,
  "",
  `**Place:** ${place.name} (\`${place.key}\`), seed \`${place.seed}\`, drawn as \`drawPlace("${seed}:<n>", "grade-reach")\`; played ${days} days from ${OPENING_DATE}.${passedOver.length ? ` Drawn before it and passed over (no race decided in the year): ${passedOver.join("; ")}.` : ""}`,
  `**Race:** ${nameOf(race.winner)} won ${race.office} against ${nameOf(race.loser)} (the voting module's recorded result).`,
  "",
  "## What reaches what",
  "",
  "A piece carries three things a grade attaches to: its **pattern** (the speech act it makes, `tag.move`), its **voice** (the bearing the speaker's traits pull toward, or none) and its **register class** (public address, private talk, broadcast, narration, from `registerClasses` in `data/english/calibration.json`). Pieces sharing all three are one group. A group's grades add up (good +1, bad or fix −1, a grade shared with other parts of a line counts half). Every other piece in the group is weighted by the sum on a curve that slides between a floor of 0.8 and a ceiling of 1.25 (`reachFloor`, `reachCeiling`, `reachSaturation`, all TUNABLE): nothing is banned and nothing flips at a threshold. The piece's own grade still works as before (`pieceFactor`).",
  "",
  "## One grade, one played piece",
  "",
  `The graded piece is \`${gradedKey}\`, a line of the winner's election-night speech in ${place.name}: group \`${groupKey(pieces.get(gradedKey)!, classes)}\`. It is given one GOOD grade. The group holds ${reach.peers.length} other pieces in ${reach.banks.size} banks (${[...reach.banks].sort().join(", ")}). **${moved.length} pieces move, in ${movedBanks.size} banks (${[...movedBanks].sort().join(", ")}).** Weights are shares of 1,000 for a piece of authored weight 1, as a voiced pick scales them.`,
  "",
  "| piece | bank | weight before | weight after |",
  "|---|---|---|---|",
  ...moved.map(
    (row) => `| \`${row.key}\` | ${row.bank} | ${row.before} | ${row.after} |`,
  ),
  "",
  "## A speech picked differently on fixed seeds",
  "",
  `The same race's election-night speech and concession, composed by \`composeAddress\` on ${SEEDS} fixed moment keys before and after the grade:`,
  "",
  ...Object.entries(flips).map(
    ([register, row]) =>
      `- **${register}:** ${row.count} of ${SEEDS} differ.${row.first ? `\n\n  First: ${row.first}` : ""}`,
  ),
  "",
  "A concession speech nobody graded is picked differently because a victory line was. Read the count as a sign the grade arrived, not as how far it moved lines: the stable draw is `hash % total weight`, so when any weight in a move's tier moves, the cut points of every variant in it move too, and many picks change at once. The measure of reach is the weight table above, a few percent per piece, never a ban.",
  "",
  "## The 128 shipped grades, applied through this path",
  "",
  `\`node --import tsx scripts/dialogue-batch/apply-grades.ts\` folds the ledger and writes \`data/english/grade-reach.json\`. The ledger holds ${ledgerKeys.length} graded keys: ${profiled.length} are bank pieces and reach their groups; ${unprofiled.length} name no bank piece (retired keys and the old composition banks: \`bank:\`, \`day-opening:\`, \`journal:chapter:\`, \`life-reply\`) and keep their own grade only. **${reachedNow.length} pieces now carry a reach weight other than 1**, across ${byBank.size} banks: ${[
    ...byBank,
  ]
    .sort()
    .map(([bank, n]) => `${bank} ${n}`)
    .join(", ")}.`,
  "",
  "| group (pattern \\| voice \\| register) | net grades | graded pieces | pieces in group | banks | weight of an ungraded peer (1.0 = unchanged) |",
  "|---|---|---|---|---|---|",
  ...groupRows.map(
    (row) =>
      `| ${row.group.replaceAll("|", " \\| ")} | ${row.net} | ${row.graded} | ${row.reached} | ${row.banks} | ${row.factor.toFixed(3)} |`,
  ),
  "",
  "Ask why: a piece's weight is its own running grade times its group's reach, `pieceFactor` in `src/english/calibration.ts`; the group sums are in `data/english/grade-reach.json`.",
  "",
);
writeFileSync(out, lines.join("\n"));
execSync(`npx prettier --write ${out}`, { stdio: "ignore" });
console.log(
  `${place.name} seed ${place.seed}: graded ${gradedKey}; ${moved.length} pieces moved in ${movedBanks.size} banks; flips ${JSON.stringify(Object.fromEntries(Object.entries(flips).map(([k, v]) => [k, v.count])))}`,
);
