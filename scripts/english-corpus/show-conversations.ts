/**
 * Prints conversations the story director words from the mined bank in a
 * generated place, for reading and for grading batches. Developer tooling.
 *
 *   node --import tsx scripts/english-corpus/show-conversations.ts <seed> [count]
 */
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

const seed = process.argv[2] ?? "words-show";
const count = Number(process.argv[3] ?? 6);
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 500 }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 18 &&
    age(person.birthDate) < 60 &&
    person.jobId &&
    person.knownIds.length > 4,
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, {
  modules: [beliefsModule, director.module],
});
director.start(core);
advanceCore(core, "2021-01-03");
const name = (id: string) => core.people.get(id)!.givenName;
console.log(`# ${seed}: ${base.place?.displayName ?? ""}`);
const me = core.people.get(player.id)!;
for (const otherId of [...me.knownIds].slice(0, count)) {
  if (!core.people.get(otherId)?.alive) continue;
  const data = MINED_CONVERSATION;
  const talk = openConversation(core, player.id, otherId, { data });
  console.log(`\n## ${name(player.id)} and ${name(otherId)}`);
  let shown = 0;
  for (let turn = 0; turn < 4 && talk.choices.length > 0; turn += 1) {
    for (const line of talk.lines.slice(shown))
      console.log(`${name(line.speakerId)}: ${line.text}`);
    shown = talk.lines.length;
    console.log(
      `   choices: ${talk.choices.map((c) => `[${c.text}]`).join(" ")}${talk.lies.length ? `  lies: ${talk.lies.map((c) => `[${c.text}]`).join(" ")}` : ""}`,
    );
    say(core, talk, talk.choices[turn % talk.choices.length]!.key, data);
  }
  for (const line of talk.lines.slice(shown))
    console.log(`${name(line.speakerId)}: ${line.text}`);
}
