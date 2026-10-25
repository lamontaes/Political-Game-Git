/**
 * A grading batch of conversation lines the story director words from the
 * mined bank, for the owner. Plays conversations in generated places (one
 * per seed, each a place drawn from all 56), captures every line said and
 * every choice offered with the line before it, and names the mined parts
 * that made it, so the owner's grades fold into `data/english/part-grades.json`
 * through `scripts/dialogue-batch/apply-grades.ts` like any batch.
 *
 * Every line is exactly what the director returned; nothing here words
 * anything. One axis per line: whether it fits the line before it.
 *
 *   node --import tsx scripts/english-corpus/grading-batch.ts \
 *     --id batch-3 --size 100 <seed> [<seed> ...]
 *
 * Development tooling only; grading never blocks a merge.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { buildDeepPast } from "../../src/core2/deep-past";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { buildPopulation } from "../../src/core2/population";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { spokenDate } from "../../src/director/words";
import {
  beliefsModule,
  openConversation,
  say,
} from "../../src/director/conversation";
import { createDirector } from "../../src/director/ledger";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
  type MinedPart,
} from "../../src/english/mined/conversation-bank";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1]! : fallback;
};
const id = option("id", "batch-3");
const size = Number(option("size", "100"));
const seeds = args.filter(
  (arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--"),
);

/** The mined parts a line is made of: one sentence, or an answer and a raise. */
const patterns = [...CONVERSATION_BANK.parts]
  .sort((a, b) => b.text.length - a.text.length)
  .map((part) => ({
    part,
    pattern: new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
  }));
const partOf = (sentence: string): MinedPart | undefined =>
  patterns.find((row) => row.pattern.test(sentence))?.part;
function partsOf(text: string): string[] {
  const whole = partOf(text);
  if (whole) return [whole.key];
  for (const match of text.matchAll(/[.?!] /g)) {
    const cut = match.index! + 1;
    const first = partOf(text.slice(0, cut));
    const second = partOf(text.slice(cut + 1));
    if (first && second) return [first.key, second.key];
  }
  return [];
}

interface Item {
  id: string;
  axis: string;
  situation: string;
  prior: string;
  reply: string;
  part: string | null;
  parts: string[];
  composer: string;
  kind: "conversation" | "choice";
  cell: Record<string, string | null>;
  seed: string;
  choices?: string[];
  lieOffered?: boolean;
}
const items: Item[] = [];
const places = new Set<string>();

for (const seed of seeds) {
  const base = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 500 }),
    ),
  );
  const placeName = base.placeMetadata?.placeName ?? seed;
  places.add(placeName);
  const age = (birth: string) =>
    ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
  // Golden-path steps 1 and 2: a new adult meeting people, and an older
  // working adult among people they know.
  const players = [
    base.people.find(
      (person) =>
        person.tier !== "husk" &&
        age(person.birthDate) >= 18 &&
        age(person.birthDate) < 22 &&
        person.knownIds.length > 2,
    ),
    base.people.find(
      (person) =>
        person.tier !== "husk" &&
        age(person.birthDate) >= 25 &&
        age(person.birthDate) < 65 &&
        person.jobId &&
        person.knownIds.length > 4,
    ),
  ].filter((row) => row !== undefined);
  for (const player of players) {
    const input = { ...base, playerId: player.id };
    const director = createDirector({ watch: [...initialFocusPeople(input)] });
    const core = createLifeCore(input, {
      modules: [beliefsModule, director.module],
    });
    director.start(core);
    advanceCore(core, "2021-01-03");
    const me = core.people.get(player.id)!;
    const name = (personId: string) => {
      const row = core.people.get(personId)!;
      return `${row.givenName} ${row.familyName}`;
    };
    const relation = (otherId: string) =>
      [...me.familyIds].includes(otherId) ? "family" : "acquaintance";
    const others = [...me.knownIds]
      .filter((otherId) => core.people.get(otherId)?.alive)
      .slice(0, 14);
    for (const [index, otherId] of others.entries()) {
      const data = MINED_CONVERSATION;
      const talk = openConversation(core, player.id, otherId, { data });
      const voice = (speakerId: string) =>
        speakerId === player.id ? "You" : name(speakerId).split(" ")[0]!;
      const situation = `${name(player.id)} (${age(me.birthDate)}) talks with ${name(otherId)}, ${relation(otherId) === "family" ? "a relative" : "someone they know"}, in ${placeName}, on ${spokenDate(core.date, "1900-01-01")}.`;
      const cell = (kind: string) => ({
        register: relation(otherId) === "family" ? "family" : "everyday",
        kind,
        relationship: relation(otherId),
        trait: null,
        mood: null,
        experience: null,
        belief: null,
        place: placeName,
        pose: null,
        ageBand: age(me.birthDate) < 22 ? "young-adult" : "adult",
      });
      let said = 0;
      for (let turn = 0; turn < 4; turn += 1) {
        for (const line of talk.lines.slice(said)) {
          const prior = talk.lines[talk.lines.indexOf(line) - 1];
          if (line.speakerId === player.id) continue;
          items.push({
            id: `${seed}:${otherId}:line:${talk.lines.indexOf(line)}`,
            axis: prior ? "follows the line before it" : "opens the talk",
            situation,
            prior: prior ? `${voice(prior.speakerId)}: ${prior.text}` : "",
            reply: `${voice(line.speakerId)}: ${line.text}`,
            part: partsOf(line.text).at(-1) ?? null,
            parts: partsOf(line.text),
            composer:
              "openConversation and say in src/director/conversation.ts, words from data/english/parts/conversation.json",
            kind: "conversation",
            cell: cell(line.act),
            seed,
            choices: talk.choices.map((choice) => choice.text),
            lieOffered: talk.lies.length > 0,
          });
        }
        said = talk.lines.length;
        const last = talk.lines.at(-1);
        for (const choice of [...talk.choices, ...talk.lies])
          items.push({
            id: `${seed}:${otherId}:choice:${choice.key}`,
            axis: choice.lie
              ? "the lie answers the question"
              : "the choice answers the line before it",
            situation,
            prior: last ? `${voice(last.speakerId)}: ${last.text}` : "",
            reply: `You could say: ${choice.text}`,
            part: partsOf(choice.text).at(-1) ?? null,
            parts: partsOf(choice.text),
            composer:
              "offerChoices in src/director/conversation.ts, words from data/english/parts/conversation.json",
            kind: "choice",
            cell: cell(choice.lie ? "lie" : choice.move),
            seed,
          });
        if (talk.choices.length === 0) break;
        say(
          core,
          talk,
          talk.choices[(turn + index) % talk.choices.length]!.key,
          data,
        );
      }
    }
  }
}

// One line per distinct wording and parts, spreading across places and parts:
// a part already in the batch is taken again only when nothing new is left.
const seen = new Set<string>();
const usedParts = new Map<string, number>();
const unique = items.filter((item) => {
  const key = `${item.prior}|${item.reply.replace(/^[^:]+: /, "")}`;
  if (seen.has(key) || item.parts.length === 0) return false;
  seen.add(key);
  return true;
});
// Take the places in turn, so no one town fills the batch.
const bySeed = seeds.map((seed) => unique.filter((item) => item.seed === seed));
const distinct: Item[] = [];
for (let at = 0; bySeed.some((rows) => at < rows.length); at += 1)
  for (const rows of bySeed) if (at < rows.length) distinct.push(rows[at]!);
const chosen: Item[] = [];
for (let round = 0; chosen.length < size && round < 6; round += 1)
  for (const item of distinct) {
    if (chosen.length >= size || chosen.includes(item)) continue;
    if (item.parts.some((part) => (usedParts.get(part) ?? 0) > round)) continue;
    chosen.push(item);
    for (const part of item.parts)
      usedParts.set(part, (usedParts.get(part) ?? 0) + 1);
  }

const kinds: Record<string, number> = { conversation: 0, choice: 0 };
for (const item of chosen) kinds[item.kind] = (kinds[item.kind] ?? 0) + 1;
const batch = {
  id,
  title: `Mined conversation batch ${id} (${chosen.length} lines)`,
  at: new Date().toISOString(),
  head: execSync("git rev-parse HEAD").toString().trim(),
  status: "open" as const,
  variety: {
    items: chosen.length,
    places: places.size,
    kinds,
    distinctSituationRelationship: new Set(
      chosen.map((item) => `${item.situation}|${item.cell.relationship}`),
    ).size,
  },
  absent: [],
  items: chosen.map((item, i) => ({ i, ...item })),
};
writeFileSync(
  `data/english/batches/${id}.json`,
  `${JSON.stringify(batch, null, 2)}\n`,
);
console.log(
  `${chosen.length} lines from ${places.size} places (${[...places].join("; ")}); ${usedParts.size} distinct parts`,
);
