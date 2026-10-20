/**
 * Prints the "My life" journal the story director writes from the mined bank
 * for a person in a generated place. Developer tooling.
 *
 *   node --import tsx scripts/english-corpus/show-journal.ts <seed>
 */
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { buildDeepPast } from "../../src/core2/deep-past";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { buildPopulation } from "../../src/core2/population";
import { composeJournal } from "../../src/director/journal";
import { createDirector } from "../../src/director/ledger";
import { journalDataFromBank } from "../../src/english/mined/journal-bank";

const seed = process.argv[2] ?? "words-journal";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 400 }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 30 &&
    person.jobId &&
    (person.pastFacts ?? []).some((fact) => fact.kind === "family:child"),
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, addDays(makeIsoDate(core.date), 120));
console.log(`# ${base.placeMetadata?.placeName} (seed ${seed})`);
for (const chapter of composeJournal(core, director, player.id, {
  data: journalDataFromBank(),
})) {
  console.log(`\n## ${chapter.title}`);
  for (const line of chapter.lines) console.log(line.text);
}
