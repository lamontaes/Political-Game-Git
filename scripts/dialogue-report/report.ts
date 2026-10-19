/**
 * The dialogue report: seeded lives through the played world, as Markdown a
 * person can read. A development command; it words nothing.
 *
 *   npm run dialogue:report -- --lives 2 --days 3 --seed my-seed [--out file.md]
 *
 * Each life draws a place from all 56 by the seed `<seed>:<life>`, builds the
 * played world, and has the player talk to people they know and to filled-in
 * neighbors through the real writers (openConversation, say, bringItUp).
 * The report gives the repeated lines first, then each conversation turn by
 * turn: who said what, the speech act, the exact text, the bank:part:variant
 * key, the facts and stage that picked it, the record ids, and the player's
 * options (true choices and the lie set) with the chosen one marked.
 *
 * Building a world takes about a minute; the defaults keep a run short.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  headCommit,
  playLives,
  type PlayedLife,
  type RecordedChoice,
  type RecordedLine,
} from "../dialogue-batch/play-lives";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const lives = Number(option("lives", "2"));
const days = Number(option("days", "3"));
const seed = option("seed", "dialogue");
const out = option("out", `docs/grading/dialogue-report-${seed}.md`);

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
const wordingOf = (row: {
  wording?: { bank: string; parts: string[]; stage: string; facts: string[] };
}) =>
  row.wording
    ? `${row.wording.bank} : ${row.wording.parts.join(" + ")}`
    : "(no wording recorded)";
const pickedBy = (row: { wording?: { stage: string; facts: string[] } }) =>
  row.wording
    ? `stage ${row.wording.stage || "none"}; facts ${row.wording.facts.join(", ") || "none"}`
    : "";

function repeated(played: PlayedLife[]): string[] {
  const where = new Map<string, string[]>();
  for (const life of played)
    for (const talk of life.conversations)
      for (const turn of talk.turns)
        for (const line of [...talk.broughtUp, ...turn.said]) {
          const spot = `life ${life.life} day ${talk.day} with ${talk.other}`;
          where.set(line.text, [...(where.get(line.text) ?? []), spot]);
        }
  const rows = [...where.entries()]
    .filter(([, spots]) => spots.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (rows.length === 0) return ["No spoken line repeated in this run.", ""];
  return [
    "| Count | Exact text | Where |",
    "| --- | --- | --- |",
    ...rows
      .slice(0, 60)
      .map(
        ([text, spots]) =>
          `| ${spots.length} | ${cell(text)} | ${cell([...new Set(spots)].slice(0, 6).join("; "))}${new Set(spots).size > 6 ? "; ..." : ""} |`,
      ),
    ...(rows.length > 60
      ? ["", `${rows.length - 60} more repeated lines not shown.`]
      : []),
    "",
  ];
}

function lineRow(line: RecordedLine): string {
  const ids = line.sourceRecordIds.length
    ? line.sourceRecordIds.join(", ")
    : "none";
  return `- **${line.speaker}** (${line.act}): "${line.text}"\n  - words: ${wordingOf(line)}${line.wording ? `\n  - picked by: ${pickedBy(line)}` : ""}\n  - records: ${ids}`;
}

function choiceRow(choice: RecordedChoice): string {
  const ids = choice.sourceRecordIds.length
    ? choice.sourceRecordIds.join(", ")
    : "none";
  const claim = choice.claim
    ? ` (claims ${choice.claim.key} = ${choice.claim.value})`
    : "";
  return `  - ${choice.chosen ? "**[CHOSEN]** " : ""}"${choice.text}"${claim} -- key ${choice.key}; move ${choice.move}; words ${wordingOf(choice)}${choice.wording ? `; ${pickedBy(choice)}` : ""}; records ${ids}`;
}

const started = performance.now();
const played = playLives({
  seed,
  lives,
  days,
  onLife: (life) =>
    console.error(
      `life ${life.life}: ${life.placeName} (${life.placeKey}) ${life.error ? "FAILED" : `built ${life.buildSeconds.toFixed(0)}s, played ${life.runSeconds.toFixed(0)}s, ${life.conversations.length} conversations`}`,
    ),
});

const body: string[] = [
  `# Dialogue report: seed ${seed}`,
  "",
  `- Seed: ${seed} (each life draws its place from \`${seed}:<life>\`)`,
  `- Head commit: ${headCommit()}`,
  `- Lives: ${lives}; days per life: ${days}`,
  `- Run time: ${((performance.now() - started) / 1000).toFixed(0)} seconds`,
  `- Command: \`npm run dialogue:report -- --lives ${lives} --days ${days} --seed ${seed}\``,
  "- Places:",
  ...played.map(
    (life) =>
      `  - life ${life.life}: ${life.placeName} (state ${life.state}, place key ${life.placeKey}, jurisdiction ${life.placeId || "not built"}, world seed ${life.seed.slice(0, 12)}...)${life.error ? " -- FAILED" : ""}`,
  ),
  "",
  "## Repeated lines",
  "",
  ...repeated(played),
];
for (const life of played) {
  body.push(
    `## Life ${life.life}: ${life.placeName}`,
    "",
    `Player ${life.playerId ?? "none"}. ${life.conversations.length} conversations.`,
    "",
  );
  if (life.error)
    body.push("This life stopped early:", "", "```", life.error, "```", "");
  for (const talk of life.conversations) {
    body.push(
      `### Day ${talk.day} (${talk.date}): ${talk.player} (${talk.playerId}) talks with ${talk.other} (${talk.otherId})${talk.filledIn ? ", a neighbor filled in when met" : ""}`,
      "",
    );
    if (talk.broughtUp.length) {
      body.push("They bring it up:", "");
      for (const line of talk.broughtUp)
        body.push(
          `${lineRow(line)}\n  - change: ${line.kind}, about ${line.subjectId}`,
        );
      body.push("");
    }
    talk.turns.forEach((turn, at) => {
      body.push(`**Turn ${at + 1}**`, "");
      for (const line of turn.said) body.push(lineRow(line));
      if (turn.choices.length === 0 && turn.lies.length === 0)
        body.push("- (no replies offered: the talk ends here)");
      else {
        body.push("- Player's options:", "  - True choices:");
        body.push(...turn.choices.map(choiceRow));
        body.push(
          turn.lies.length
            ? "  - Lie set (scales):"
            : "  - Lie set: empty (scales dim)",
          ...turn.lies.map(choiceRow),
        );
      }
      body.push("");
    });
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${body.join("\n")}\n`);
console.error(`Wrote ${out}`);
