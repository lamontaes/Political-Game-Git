/**
 * The multi-axis grading batch: 100 real lines from 5 drawn places, each with
 * up to five real alternatives that differ on ONE axis (personality fit,
 * formality, word choice, sentence structure, length). Development tooling;
 * grading never blocks a merge, and nothing here words anything.
 *
 *   npm run dialogue:batch -- --seed <seed> [--id batch-6] [--places 5] \
 *     [--days 6] [--size 100]
 *
 * It plays the lives the dialogue report plays (`play-lives.ts`: a place drawn
 * from all 56 by `<seed>:<life>`, the played world, the real writers), samples
 * lines, and for each finds other parts of the same mined bank
 * (`data/english/parts/*.json`) usable at the same moment, with the line's own
 * slot values (`mined-variants.ts`). Writes `data/english/batches/<id>.json`
 * and the owner's page `docs/grading/words-<id>.md`.
 *
 * The owner's grades come back as `data/english/grades/<id>.json`; see the
 * page for the shape. `apply-grades.ts` folds them into the part ledger.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import {
  AXES,
  minedParts,
  slotValues,
  variantsFor,
  type Variant,
} from "./mined-variants";
import {
  hashOf,
  headCommit,
  playLives,
  type PlayedLife,
  type RecordedConversation,
} from "./play-lives";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const id = option("id", "batch-6");
const seed = option("seed", id);
const places = Number(option("places", "5"));
const days = Number(option("days", "6"));
const size = Number(option("size", "100"));

/** The parts that said a line when the director recorded no wording. */
const bankPatterns = [...minedParts().values()]
  .filter((part) => part.bank === "conversation")
  .sort((a, b) => b.text.length - a.text.length);
function partsFromText(text: string): string[] {
  const found = bankPatterns.find((part) => slotValues(part, text) !== null);
  return found ? [found.key] : [];
}

export interface Candidate {
  id: string;
  seed: string;
  life: number;
  place: string;
  day: number;
  situation: string;
  prior: string;
  speaker: string;
  text: string;
  kind: "conversation" | "choice";
  act: string;
  lineParts: string[];
  /** The director bank the line was worded from, when known. */
  moment?: string;
  stage: string;
  sociability: number | null;
  /** The scales' false version of a line (`conversation.lies`). */
  lie?: boolean;
}

/** Every line a life said and every true reply it offered, with the line before it. */
export function candidatesOf(
  life: PlayedLife,
  options: { lies?: boolean } = {},
): Candidate[] {
  const rows: Candidate[] = [];
  life.conversations.forEach((talk: RecordedConversation, at) => {
    let before = "";
    const situation = `${talk.player} talks with ${talk.other}${talk.filledIn ? ", a neighbor" : ""}, in ${life.placeName}, on day ${talk.day + 1}.`;
    const sociability = (who: string) => talk.reachesOut[who] ?? null;
    talk.turns.forEach((turn, turnAt) => {
      for (const line of turn.said) {
        rows.push({
          id: `${life.seed.slice(0, 8)}:${at}:${turnAt}:${rows.length}`,
          seed: life.seed,
          life: life.life,
          place: life.placeName,
          day: talk.day,
          situation,
          prior: before,
          speaker: line.speaker,
          text: line.text,
          kind: "conversation",
          act: line.act,
          lineParts: line.wording?.parts ?? partsFromText(line.text),
          moment: line.wording?.bank,
          stage: line.wording?.stage ?? "",
          sociability: sociability(line.speakerId),
        });
        before = `${line.speaker}: ${line.text}`;
      }
      for (const choice of options.lies
        ? [...turn.choices, ...turn.lies]
        : turn.choices) {
        rows.push({
          id: `${life.seed.slice(0, 8)}:${at}:${turnAt}:${rows.length}`,
          seed: life.seed,
          life: life.life,
          place: life.placeName,
          day: talk.day,
          situation,
          prior: before,
          speaker: talk.player,
          text: choice.text,
          kind: "choice",
          act: choice.move,
          lineParts: choice.wording?.parts ?? partsFromText(choice.text),
          moment: choice.wording?.bank,
          stage: choice.wording?.stage ?? "",
          sociability: sociability(talk.playerId),
          ...(choice.lie ? { lie: true } : {}),
        });
      }
    });
  });
  return rows;
}

interface Item extends Candidate {
  i: number;
  /** The part the variants swap: the grade is counted against it. */
  parts: string[];
  variedText: string;
  variants: {
    n: number;
    axis: string;
    parts: string[];
    partText: string;
    text: string;
  }[];
}

function sample(played: PlayedLife[], wanted: number): Item[] {
  const all = minedParts();
  const pools = played.map((life) => {
    const seenText = new Set<string>();
    const usedPart = new Map<string, number>();
    const rows = candidatesOf(life)
      .filter((row) => row.lineParts.length > 0)
      .flatMap((row) => {
        const made = variantsFor(
          row.text,
          row.lineParts,
          row.sociability ?? undefined,
          all,
          row.moment,
        );
        return made ? [{ row, made }] : [];
      })
      .sort(
        (a, b) =>
          b.made.variants.length - a.made.variants.length ||
          hashOf(seed, a.row.id) - hashOf(seed, b.row.id),
      );
    // One line per wording; a part is varied at most twice in a place.
    return rows.filter(({ row, made }) => {
      const key = `${row.prior}|${row.text}`;
      if (seenText.has(key)) return false;
      if ((usedPart.get(made.varied.key) ?? 0) >= 2) return false;
      seenText.add(key);
      usedPart.set(made.varied.key, (usedPart.get(made.varied.key) ?? 0) + 1);
      return true;
    });
  });
  const per = Math.ceil(wanted / Math.max(1, played.length));
  const chosen: (typeof pools)[number] = [];
  for (const pool of pools) chosen.push(...pool.slice(0, per));
  // Fill what a short place could not give from the others, in turn.
  for (let at = per; chosen.length < wanted; at += 1) {
    let added = false;
    for (const pool of pools)
      if (pool[at] && chosen.length < wanted) {
        chosen.push(pool[at]!);
        added = true;
      }
    if (!added) break;
  }
  return chosen.slice(0, wanted).map(({ row, made }, i) => ({
    ...row,
    i,
    parts: [made.varied.key],
    variedText: made.varied.text,
    variants: made.variants.map((variant: Variant, at) => ({
      n: at + 1,
      axis: variant.axis,
      parts: [variant.partKey],
      partText: variant.partText,
      text: variant.text,
    })),
  }));
}

export const cell = (text: string) => text.replace(/\|/g, "\\|");

export function pageFor(batch: string, items: Item[], placeNames: string[]) {
  const sections = items.map((item) => {
    const rows = item.variants.map(
      (variant) =>
        `| ${variant.n} | ${variant.axis} | ${cell(variant.text)} | | |`,
    );
    return [
      `### ${item.i}. ${item.place}`,
      "",
      item.prior
        ? `The line before: ${cell(item.prior)}`
        : "The line before: (the talk opens)",
      "",
      `The line${item.kind === "choice" ? " (a reply you could pick)" : ""}: **${cell(item.speaker)}: ${cell(item.text)}**`,
      "",
      "| # | Axis | Another way to say it | Grade the line on this axis | Better |",
      "| --- | --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n");
  });
  return `# Conversations, graded on five axes: grading batch ${batch}

These ${items.length} lines are what the story director says when its words come from the mined conversation bank. Each sentence was said in a public-domain federal record, with the names, employers and towns filled from a generated person's records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The lines come from ${placeNames.length} drawn places: ${placeNames.join("; ")}.

## How to grade

Each line has a few numbered alternatives. Each alternative is tagged with the one axis it differs on:

- **personality fit**: whether the words suit the person saying them (an outgoing person warmer, a reserved one briefer).
- **formality**: how formal or casual the words are.
- **word choice**: the same length and shape, but different words.
- **sentence structure**: a question against a statement, or one sentence against two.
- **length**: a much longer or shorter way to say it.

For each axis that appears, grade the line itself on that axis, as the owner hears it:

- **GOOD**: the line is right on this axis; keep it.
- **BAD**: the line is wrong on this axis; never say it in that spot.
- **FIX**: close, but it needs rewording.

Then, if one of the alternatives is better than the line on that axis, write its number. If the line is better, leave it blank. Skip any axis you have no opinion on. Grades never block a merge.

## Where the grades go

Write them to \`data/english/grades/${batch}.json\` in this shape. Axis names are exactly: personality fit, formality, word choice, sentence structure, length. \`prefer\` holds the number of the better alternative for that axis, and is left out when the line is better.

\`\`\`json
{
  "batch": "${batch}",
  "grades": [
    {
      "i": 0,
      "axes": { "formality": "GOOD", "length": "BAD" },
      "prefer": { "length": 2 },
      "note": "optional"
    }
  ]
}
\`\`\`

\`node --import tsx scripts/dialogue-batch/apply-grades.ts\` folds them into the part ledger (\`data/english/part-grades.json\`). A line graded BAD or FIX on an axis, and never GOOD there, is held back on that axis; an alternative you prefer counts as GOOD on its axis.

## The lines

${sections.join("\n")}`;
}

function main() {
  const played = playLives({
    seed,
    lives: places,
    days,
    onLife: (life) =>
      console.error(
        `life ${life.life}: ${life.placeName} ${life.error ? `FAILED ${life.error.split("\n")[0]}` : `${life.conversations.length} conversations`}`,
      ),
  });
  const items = sample(
    played.filter((life) => !life.error),
    size,
  );
  const placeNames = [
    ...new Set(
      played.filter((life) => !life.error).map((life) => life.placeName),
    ),
  ];
  const byAxis: Record<string, number> = {};
  for (const item of items)
    for (const variant of item.variants)
      byAxis[variant.axis] = (byAxis[variant.axis] ?? 0) + 1;
  const batch = {
    id,
    title: `Multi-axis conversation batch ${id} (${items.length} lines)`,
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD").toString().trim(),
    shortHead: headCommit(),
    seed,
    status: "open" as const,
    axes: AXES,
    variety: {
      items: items.length,
      places: placeNames.length,
      placeList: played.map((life) => ({
        life: life.life,
        key: life.placeKey,
        name: life.placeName,
        state: life.state,
        placeId: life.placeId,
        error: life.error ? life.error.split("\n")[0] : undefined,
      })),
      variantsByAxis: byAxis,
    },
    items,
  };
  writeFileSync(
    `data/english/batches/${id}.json`,
    `${JSON.stringify(batch, null, 2)}\n`,
  );
  writeFileSync(`docs/grading/words-${id}.md`, pageFor(id, items, placeNames));
  execSync(
    `npx prettier --write data/english/batches/${id}.json docs/grading/words-${id}.md`,
    { stdio: "ignore" },
  );
  console.error(
    `${items.length} lines from ${placeNames.length} places; variants by axis ${JSON.stringify(byAxis)}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
