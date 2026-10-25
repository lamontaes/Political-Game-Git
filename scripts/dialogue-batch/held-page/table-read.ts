/**
 * Batch 22 in context: plays the bench's world in a drawn place and shows every
 * held hand-written line where play would say it, as a table read.
 *
 *   node --import tsx scripts/dialogue-batch/held-page/table-read.ts batch-22 <seed> <days> <out.json>
 *
 * Each staged scene is composed with the held lines first (the grading-only
 * `heldFirst` switch on every bank adapter), on the day it is staged: its
 * narration, and what the person across from you brings up. After the run
 * come the journals of the watched lives and a speech built from the held
 * stage lines. A held line is tagged with its number in the batch
 * (data/english/batches/<id>.json), so a voice note ("4b is wrong") maps to
 * its part. A development tool: it words nothing itself.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { stageWorldHeld } from "../stage-world";
import { composeScene } from "../../../src/director/scene";
import {
  bringDataFromBank,
  sceneWordsFromBank,
} from "../../../src/director/mined/scene-bank";
import { journalDataFromBank } from "../../../src/director/mined/journal-bank";
import { composeJournal } from "../../../src/director/journal";
import { bringItUp } from "../../../src/director/bring-it-up";
import {
  beginSpeech,
  chooseSpeechPart,
  type SpeechBuild,
} from "../../../src/director/speech-builder";
import type { CoreState, PersonId } from "../../../src/core2/types";
import type { Director } from "../../../src/director/ledger";

const [
  batchId = "batch-22",
  // One seed, or several joined by commas: each a world, read in turn.
  seed = randomBytes(8).toString("hex"),
  daysArg = "120",
  out = `data/english/batches/${batchId}-table-read.json`,
] = process.argv.slice(2);

interface Item {
  i: number;
  bank: string;
  text: string;
  parts: string[];
}
const batch = JSON.parse(
  readFileSync(`data/english/batches/${batchId}.json`, "utf8"),
) as { items: Item[] };

/** A held line as a pattern: its words, with any slot standing for some words. */
const held = batch.items.map((item) => ({
  ...item,
  re: new RegExp(
    item.text
      .split(/\{[^}]+\}/)
      .map((piece) => piece.replace(/[.*+?^$()|[\]\\]/g, "\\$&"))
      .join(".+?"),
    "i",
  ),
}));
const shown = new Map<number, number>();
/** Every held line said in this text (a narration line joins several sentences). */
const heldIn = (bank: string, text: string) => {
  const hits = held.filter((row) => row.bank === bank && row.re.test(text));
  for (const hit of hits) shown.set(hit.i, (shown.get(hit.i) ?? 0) + 1);
  return hits.length ? hits.map((hit) => hit.i) : undefined;
};

/** A narration line's sentences. */
const sentences = (text: string) =>
  (text.match(/[^.!?]+[.!?]+["”]?(?=\s|$)/g) ?? [text])
    .map((row) => row.trim())
    .filter(Boolean);
/** A moment's label as words: `feeling:event:speech.heard` is "speech heard". */
const plainKind = (label: string) =>
  label
    .replace(/^[a-z]+:(event:)?/, "")
    .replace(/[.:-]+/g, " ")
    .trim();

const WORDS = sceneWordsFromBank(undefined, undefined, true);
const BRING = bringDataFromBank(undefined, undefined, true);
const JOURNAL = journalDataFromBank(undefined, undefined, true);

interface Line {
  speaker: string;
  text: string;
  move: string;
  auto: boolean;
  held?: number[];
}
interface Node {
  lines: Line[];
  replies: { line: Line; next: Node }[];
  end?: { outcome: string };
}
interface TableScene {
  id: string;
  n: number;
  purpose: string;
  type: string;
  key: string;
  endpoint: string;
  asker: string;
  who: string;
  context: {
    asked: { name: string; facts: string[] };
    asker: { name: string; facts: string[] };
    relation: string;
    why: string[];
  };
  narration: { text: string; held?: number[] }[];
  root: Node;
}
const scenes: TableScene[] = [];
const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : "someone";
};
const factsOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  if (!row) return [];
  const age = Number(core.date.slice(0, 4)) - Number(row.birthDate.slice(0, 4));
  const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
  const employer = job
    ? core.organizations.get(job.organizationId)?.name
    : undefined;
  return [
    `About ${age} years old`,
    job ? `Works${employer ? ` at ${employer}` : ""}` : "No job on record",
  ];
};
const relationOf = (core: CoreState, a: string, b: string) => {
  const row = core.people.get(a as PersonId);
  const fact = (row?.pastFacts ?? []).find(
    (f) => f.kind.startsWith("family:") && f.facts?.otherPersonId === b,
  );
  if (fact) return fact.kind.slice("family:".length).replace(/-/g, " ");
  if (row?.householdId === core.people.get(b as PersonId)?.householdId)
    return "they live together";
  return row?.knownIds.has(b as PersonId)
    ? "they know each other"
    : "strangers";
};
const plainDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** One world: its staged scenes, then its journals and a speech. */
function playWorld(worldSeed: string) {
  let placeName = "";
  const report = stageWorldHeld(
    {
      id: batchId,
      seed: worldSeed,
      days: Number(daysArg),
      onStaged(staged, _scene, core: CoreState, director: Director) {
        const entry = director.ledger.people
          .get(staged.watchedId as PersonId)
          ?.schedule.find((row) => row.momentId === staged.momentId);
        if (!entry) return;
        const scene = composeScene(
          core,
          director,
          staged.watchedId as PersonId,
          entry,
          WORDS,
        );
        if (!scene) return;
        // Sentence by sentence, so each held line carries its own label.
        const narration = scene.narration
          .flatMap((line) => sentences(line.text))
          .map((text) => ({ text, held: heldIn("scene-words.json", text) }));
        // What the person across from you brings up, in the same scene.
        const other = scene.talkToId;
        const brought = other
          ? (bringItUp(core, other, staged.watchedId as PersonId, BRING)
              ?.lines ?? [])
          : [];
        const lines: Line[] = brought.map((line) => ({
          speaker: nameOf(core, other!),
          text: line.text,
          move: "bring-it-up",
          auto: false,
          held: heldIn("bring-it-up.json", line.text),
        }));
        // A scene is kept while it shows a held line for the first or second time.
        const fresh = [...narration, ...lines].some((row) =>
          (row.held ?? []).some((i) => (shown.get(i) ?? 0) <= 2),
        );
        if (!fresh) return;
        scenes.push({
          id: staged.momentId,
          n: scenes.length + 1,
          purpose: scene.typeKey,
          type: staged.typeKey,
          key: staged.label,
          endpoint: "personal",
          asker: other ? nameOf(core, other) : "",
          who: "",
          context: {
            asked: {
              name: nameOf(core, staged.watchedId),
              facts: factsOf(core, staged.watchedId),
            },
            asker: {
              name: other ? nameOf(core, other) : "Nobody else",
              facts: other ? factsOf(core, other) : [],
            },
            relation: other
              ? relationOf(core, staged.watchedId, other)
              : "alone in the scene",
            why: [
              `the ${plainKind(staged.label)} record of ${plainDate(staged.date)} in ${placeName}`,
              `record ${staged.causeId}`,
            ],
          },
          narration,
          root: { lines, replies: [], end: { outcome: "open" } },
        });
      },
    },
    (line) => {
      console.log(line);
      if (line.startsWith("building "))
        placeName = line.slice("building ".length);
    },
  );
  const { core, director, playerId } = report;
  placeName = report.report.place.name;
  places.push(`${placeName}, seed ${worldSeed}`);

  // The journals of the lives watched longest: each its own page.
  const lives = [...director.ledger.people.values()]
    .sort((a, b) => b.moments.length - a.moments.length)
    .slice(0, 6)
    .map((book) => book.personId as string);
  for (const id of [playerId, ...lives.filter((row) => row !== playerId)]) {
    const journal = composeJournal(core, director, id as PersonId, {
      data: JOURNAL,
    }) as unknown;
    const chapters = (
      Array.isArray(journal)
        ? journal
        : ((journal as { chapters?: unknown[] }).chapters ?? [])
    ) as { title: string; lines: { text: string }[] }[];
    const lines = chapters.flatMap((chapter) => chapter.lines);
    const marked = lines.map((line) => ({
      text: line.text,
      held: heldIn("journal.json", line.text),
    }));
    if (!marked.some((row) => row.held !== undefined)) continue;
    // Each held line with the entries around it, so it reads in its place.
    const keep = new Set<number>();
    marked.forEach((row, at) => {
      if (row.held === undefined) return;
      for (
        let k = Math.max(0, at - 1);
        k <= Math.min(marked.length - 1, at + 1);
        k++
      )
        keep.add(k);
    });
    scenes.push({
      id: `journal:${id}`,
      n: scenes.length + 1,
      purpose: "journal",
      type: "journal",
      key: "my-life",
      endpoint: "personal",
      asker: "",
      who: "",
      context: {
        asked: { name: nameOf(core, id), facts: factsOf(core, id) },
        asker: { name: "The journal", facts: ["My life, in the first person"] },
        relation: "their own journal",
        why: [`the journal through ${plainDate(core.date)}, in ${placeName}`],
      },
      narration: [...keep].sort((a, b) => a - b).map((k) => marked[k]!),
      root: { lines: [], replies: [], end: { outcome: "open" } },
    });
  }

  // A speech built from the held stage lines: every stage's four choices,
  // following the first through to the close.
  const speaker = [playerId, ...lives].find(
    (id) => beginSpeech(core, id as PersonId, { heldFirst: true }) !== null,
  );
  if (speaker) {
    const stageNode = (build: SpeechBuild, depth: number): Node => {
      if (build.done || !build.choices.length || depth > 8)
        return { lines: [], replies: [], end: { outcome: "resolved" } };
      return {
        lines: [],
        replies: build.choices.map((choice, at) => {
          const next = chooseSpeechPart(core, build, choice.key);
          return {
            line: {
              speaker: "You",
              text: choice.text,
              move: `speech ${choice.stage}`,
              auto: false,
              held: heldIn("speech-stages.json", choice.text),
            },
            next:
              at === 0
                ? stageNode(next, depth + 1)
                : { lines: [], replies: [], end: { outcome: "open" } },
          };
        }),
      };
    };
    const build = beginSpeech(core, speaker as PersonId, { heldFirst: true })!;
    scenes.push({
      id: `speech:${speaker}`,
      n: scenes.length + 1,
      purpose: "speech",
      type: "speech",
      key: "campaign-speech",
      endpoint: "political",
      asker: "",
      who: "",
      context: {
        asked: { name: nameOf(core, speaker), facts: factsOf(core, speaker) },
        asker: { name: "A crowd", facts: ["The people who came to hear you"] },
        relation: "speaker and audience",
        why: [
          `a speech you build stage by stage in ${placeName}: an opener, the core, a closer; the first choice at each stage leads on`,
        ],
      },
      narration: [],
      root: stageNode(build, 0),
    });
  }
}
const places: string[] = [];
for (const worldSeed of seed.split(",")) playWorld(worldSeed);

const missing = held
  .filter((row) => !shown.has(row.i))
  .map((row) => ({ i: row.i, bank: row.bank, text: row.text }));
writeFileSync(
  out,
  JSON.stringify(
    {
      id: batchId,
      place: places.join("; "),
      days: Number(daysArg),
      shown: shown.size,
      of: held.length,
      missing,
      scenes,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${scenes.length} scenes; ${shown.size} of ${held.length} held lines shown; ${missing.length} not met in this run -> ${out}`,
);
