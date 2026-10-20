/**
 * Measures conversations the director words from the mined bank against the
 * counts of real American talk in `data/english/counts/everyday.json`: median
 * words per turn, the share of turns three words or fewer, and the question
 * rate. A check on the output, never a dial. Developer tooling.
 *
 *   node --import tsx scripts/english-corpus/measure-conversations.ts <seed> ...
 */
import { readFileSync } from "node:fs";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { buildDeepPast } from "../../src/core2/deep-past";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { buildPopulation } from "../../src/core2/population";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  beliefsModule,
  openConversation,
  say,
} from "../../src/director/conversation";
import { createDirector } from "../../src/director/ledger";
import { MINED_CONVERSATION } from "../../src/english/mined/conversation-bank";

const real = JSON.parse(
  readFileSync("data/english/counts/everyday.json", "utf8"),
).counts;
const turns: string[] = [];
const places: string[] = [];
for (const seed of process.argv.slice(2)) {
  const base = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 500 }),
    ),
  );
  places.push(`${base.placeMetadata?.placeName} (${seed})`);
  const age = (birth: string) =>
    ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
  const player = base.people.find(
    (person) =>
      person.tier !== "husk" &&
      age(person.birthDate) >= 18 &&
      person.knownIds.length > 4,
  )!;
  const input = { ...base, playerId: player.id };
  const director = createDirector({ watch: [...initialFocusPeople(input)] });
  const core = createLifeCore(input, {
    modules: [beliefsModule, director.module],
  });
  director.start(core);
  advanceCore(core, "2021-01-03");
  const me = core.people.get(player.id)!;
  for (const [index, otherId] of [...me.knownIds].slice(0, 15).entries()) {
    if (!core.people.get(otherId)?.alive) continue;
    const data = MINED_CONVERSATION;
    const talk = openConversation(core, player.id, otherId, { data });
    for (let turn = 0; turn < 5 && talk.choices.length > 0; turn += 1)
      say(
        core,
        talk,
        talk.choices[(turn + index) % talk.choices.length]!.key,
        data,
      );
    turns.push(...talk.lines.map((line) => line.text));
  }
}
const words = turns
  .map((text) => text.split(/\s+/).length)
  .sort((a, b) => a - b);
const median = words[Math.floor(words.length / 2)];
const short = words.filter((n) => n <= 3).length / words.length;
const questions =
  turns.filter((text) => text.trim().endsWith("?")).length / turns.length;
console.log(
  JSON.stringify(
    {
      places,
      turns: turns.length,
      game: {
        medianTurnWords: median,
        shareTurnsThreeWordsOrFewer: +short.toFixed(3),
        questionRate: +questions.toFixed(3),
      },
      real: {
        medianTurnWords: real.medianTurnWords,
        shareTurnsThreeWordsOrFewer: real.shareTurnsThreeWordsOrFewer,
        questionRate: real.questionRate,
      },
    },
    null,
    1,
  ),
);
