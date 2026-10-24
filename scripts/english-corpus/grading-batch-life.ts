/**
 * A grading batch of the journal, scenes, people bringing things up and the
 * filing clerk, worded by the story director from the mined banks in
 * generated places (one per seed). Every line is exactly what the director
 * returned; the part keys say which mined sentences made it. One axis per
 * line: whether it reads the way a person would say or write it there.
 *
 *   node --import tsx scripts/english-corpus/grading-batch-life.ts \
 *     --id batch-4 --size 100 <seed> [<seed> ...]
 *
 * Development tooling only; grading never blocks a merge.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { buildDeepPast } from "../../src/core2/deep-past";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { buildPopulation } from "../../src/core2/population";
import { applyCoreEvent } from "../../src/core2/state";
import { bringItUp } from "../../src/director/bring-it-up";
import { composeJournal } from "../../src/director/journal";
import { createDirector } from "../../src/director/ledger";
import { renderLine } from "../../src/english/bank-line";
import { composeScene } from "../../src/director/scene";
import {
  FILING_BANK,
  filingWordsFromBank,
} from "../../src/english/mined/filing-bank";
import {
  JOURNAL_BANK,
  journalDataFromBank,
} from "../../src/english/mined/journal-bank";
import {
  BRING_BANK,
  bringDataFromBank,
  SCENE_BANK,
  sceneWordsFromBank,
} from "../../src/english/mined/scene-bank";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1]! : fallback;
};
const id = option("id", "batch-4");
const size = Number(option("size", "100"));
const seeds = args.filter(
  (arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--"),
);

type Bank = { parts: { key: string; text: string }[] };
const matcher = (bank: Bank) => {
  const rows = [...bank.parts]
    .sort((a, b) => b.text.length - a.text.length)
    .map((part) => ({
      key: part.key,
      pattern: new RegExp(
        `^${part.text
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{host\}/g, ".+'s")
          .replace(/\{\w+\}/g, ".+")}$`,
        "i",
      ),
    }));
  return (text: string) => rows.find((row) => row.pattern.test(text))?.key;
};
const journalPart = matcher(JOURNAL_BANK);
const scenePart = matcher(SCENE_BANK);
const bringPart = matcher(BRING_BANK);
const filingPart = matcher(FILING_BANK as unknown as Bank);

interface Item {
  id: string;
  axis: string;
  situation: string;
  prior: string;
  reply: string;
  part: string | null;
  parts: string[];
  composer: string;
  kind: "journal" | "notices-and-screens" | "conversation";
  cell: Record<string, string | null>;
  seed: string;
}
const items: Item[] = [];
const places = new Set<string>();
const cell = (register: string, kind: string, place: string) => ({
  register,
  kind,
  relationship: "self",
  trait: null,
  mood: null,
  experience: null,
  belief: null,
  place,
  pose: null,
  ageBand: "adult",
});

for (const seed of seeds) {
  const base = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 600 }),
    ),
  );
  const place = base.placeMetadata?.placeName ?? seed;
  places.add(place);
  const age = (birth: string) =>
    ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
  const player = base.people.find(
    (person) =>
      person.tier !== "husk" &&
      age(person.birthDate) >= 30 &&
      person.jobId &&
      (person.pastFacts ?? []).some((fact) => fact.kind === "family:child"),
  );
  if (!player) continue;
  const input = { ...base, playerId: player.id };
  const director = createDirector({ watch: [...initialFocusPeople(input)] });
  const core = createLifeCore(input, { modules: [director.module] });
  director.start(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 60));
  const who = `${player.givenName} ${player.familyName} (${age(player.birthDate)})`;

  // The journal: each line after the one before it.
  for (const chapter of composeJournal(core, director, player.id, {
    data: journalDataFromBank(),
  }))
    chapter.lines.forEach((line, at) => {
      const key = journalPart(line.text);
      items.push({
        id: `${seed}:journal:${line.id}`,
        axis: "reads as the next line of a life story",
        situation: `The "My life" journal of ${who}, chapter "${chapter.title}", in ${place}.`,
        prior: at > 0 ? `Journal: ${chapter.lines[at - 1]!.text}` : "",
        reply: `Journal: ${line.text}`,
        part: key ?? null,
        parts: key ? [key] : [],
        composer:
          "composeJournal in src/director/journal.ts, words from data/english/parts/journal.json",
        kind: "journal",
        cell: cell("everyday", "journal", place),
        seed,
      });
    });

  // Scenes the director staged.
  const words = sceneWordsFromBank();
  for (const book of director.ledger.people.values())
    for (const entry of book.schedule) {
      if (!entry.bindings.length) continue;
      const scene = composeScene(core, director, book.personId, entry, words);
      scene?.narration.forEach((line, at) => {
        const key = scenePart(line.text);
        items.push({
          id: `${seed}:scene:${entry.momentId}:${at}`,
          axis: "sets the scene the way a narrator would",
          situation: `A scene the story director staged in ${place}.`,
          prior: at > 0 ? `Scene: ${scene.narration[at - 1]!.text}` : "",
          reply: `Scene: ${line.text}`,
          part: key ?? null,
          parts: key ? [key] : [],
          composer:
            "composeScene in src/director/scene.ts, words from data/english/parts/scene-words.json",
          kind: "notices-and-screens",
          cell: cell("everyday", "scene", place),
          seed,
        });
      });
    }

  // Someone brings up a closure they saw.
  const worker = [...core.people.values()].find(
    (row) =>
      row.tier !== "husk" && row.alive && row.jobId && row.knownIds.size > 2,
  );
  if (worker) {
    const org = core.jobs.get(worker.jobId!)!.organizationId;
    applyCoreEvent(core, {
      id: `organization.closed:${org}:${core.date}`,
      date: core.date,
      kind: "organization.closed",
      personIds: [worker.id],
      placeId: worker.placeId,
      publicRecord: true,
      source: {
        tag: "SOURCED",
        citation: "Closure as the finance writer records it.",
        asOf: core.date,
      },
      facts: { [`organization:${org}:status`]: "closed" },
    });
    for (const listener of [...worker.knownIds].slice(0, 3)) {
      const said = bringItUp(core, worker.id, listener, bringDataFromBank());
      said?.lines.forEach((line, at) => {
        const key = bringPart(line.text);
        items.push({
          id: `${seed}:bring:${listener}:${at}`,
          axis: "brings up the closure the way a neighbor would",
          situation: `${worker.givenName} ${worker.familyName}, who worked there, tells someone they know about a closure in ${place}.`,
          prior:
            at > 0 ? `${worker.givenName}: ${said.lines[at - 1]!.text}` : "",
          reply: `${worker.givenName}: ${line.text}`,
          part: key ?? null,
          parts: key ? [key] : [],
          composer:
            "bringItUp in src/director/bring-it-up.ts, words from data/english/parts/bring-it-up.json",
          kind: "conversation",
          cell: cell("everyday", "bring-it-up", place),
          seed,
        });
      });
    }
  }

  // The clerk at filing, with a contest's terms as GOV records them.
  const filing = filingWordsFromBank();
  const year = core.date.slice(0, 4);
  const facts = {
    office: { text: "City Council, Seat 2", sourceRecordIds: ["contest"] },
    deadline: {
      text: `March 5, ${Number(year) + 1}`,
      sourceRecordIds: ["contest"],
    },
    required: { text: "18", sourceRecordIds: ["rule"] },
    "filing-office": {
      text: "the city clerk's office",
      sourceRecordIds: ["office"],
    },
  };
  const clerk: [string, typeof filing.greet][] = [
    ["greet", filing.greet],
    ["terms", filing.terms],
    ...Object.entries(filing.rules).map(
      ([rule, variants]) =>
        [`rule:${rule}`, variants] as [string, typeof filing.greet],
    ),
  ];
  for (const [part, variants] of clerk)
    for (const variant of variants) {
      const line = renderLine({
        seed,
        surface: "dialogue",
        holderId: "clerk",
        bankKey: `filing-visit:${part}`,
        version: filing.version,
        variants: [variant],
        facts,
        momentKey: `${seed}:${part}:${variant.key}`,
        stage: "fee",
        fallbackSourceId: "contest",
      });
      if (!line) continue;
      const key = filingPart(line.text);
      items.push({
        id: `${seed}:clerk:${variant.key}`,
        axis: "sounds like a clerk at the filing counter",
        situation: `${who} comes to file for City Council, Seat 2, in ${place} (a stand-in contest until GOV's filing records reach this branch); the clerk speaks (${part.replace("rule:", "the rule ")}).`,
        prior: "",
        reply: `Clerk: ${line.text}`,
        part: key ?? null,
        parts: key ? [key] : [],
        composer:
          "the filing visit's renderer (src/director/render.ts), words from data/english/parts/filing-visit.json",
        kind: "conversation",
        cell: cell("workplace", "filing", place),
        seed,
      });
    }
}

// One item per distinct line, places in turn, each mined part first once.
const seen = new Set<string>();
const unique = items.filter((item) => {
  const key = `${item.prior}|${item.reply}`;
  if (seen.has(key) || !item.parts.length) return false;
  seen.add(key);
  return true;
});
const bySeed = seeds.map((seed) => unique.filter((item) => item.seed === seed));
const ordered: Item[] = [];
for (let at = 0; bySeed.some((rows) => at < rows.length); at += 1)
  for (const rows of bySeed) if (at < rows.length) ordered.push(rows[at]!);
const used = new Map<string, number>();
const chosen: Item[] = [];
for (let round = 0; chosen.length < size && round < 8; round += 1)
  for (const item of ordered) {
    if (chosen.length >= size || chosen.includes(item)) continue;
    if (item.parts.some((part) => (used.get(part) ?? 0) > round)) continue;
    chosen.push(item);
    for (const part of item.parts) used.set(part, (used.get(part) ?? 0) + 1);
  }
const kinds: Record<string, number> = {};
for (const item of chosen) kinds[item.kind] = (kinds[item.kind] ?? 0) + 1;
writeFileSync(
  `data/english/batches/${id}.json`,
  `${JSON.stringify(
    {
      id,
      title: `Mined journal, scenes, bring-it-up and clerk batch ${id} (${chosen.length} lines)`,
      at: new Date().toISOString(),
      head: execSync("git rev-parse HEAD").toString().trim(),
      status: "open",
      variety: {
        items: chosen.length,
        places: places.size,
        kinds,
        distinctSituationRelationship: new Set(
          chosen.map((item) => item.situation),
        ).size,
      },
      absent: [],
      items: chosen.map((item, i) => ({ i, ...item })),
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${chosen.length} lines from ${places.size} places (${[...places].join("; ")}); ${used.size} distinct parts`,
);
