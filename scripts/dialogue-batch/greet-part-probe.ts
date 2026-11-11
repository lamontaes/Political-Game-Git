/**
 * Plays talks between the player and the people they know in a drawn place
 * and prints each talk's greeting, main topic facts and goodbye
 * (words-home-greet-farewell-lines-are-composed). Usage:
 *   node --import tsx scripts/dialogue-batch/greet-part-probe.ts --seed <seed> [--talks 60]
 */
import { withPublicSchoolDistrict } from "../../src/core2/opening-public-schools";
import { defaultPreStart } from "../../src/core2/saves";
import { preStartWindow, runPreStart } from "../../src/core2/pre-start";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { newsModule } from "../../src/core2/modules/news";
import { viewsModule } from "../../src/core2/modules/views";
import { buildPopulation } from "../../src/core2/population";
import {
  beliefsModule,
  openConversation,
  say,
} from "../../src/director/conversation";
import { createDirector } from "../../src/director/ledger";
import type { PersonId } from "../../src/core2/types";

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1]! : fallback;
};
const seed = arg("seed", "greet-part-probe");
const talks = Number(arg("talks", "60"));
/** With --kind <subject kind>, every line of the talks whose first topic is of that kind. */
const kind = arg("kind", "");
const base = withPublicSchoolDistrict(
  enrichCivicInputs(
    buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 500 }),
  ),
).input;
const player = base.people.find(
  (row) => row.tier !== "husk" && row.jobId && row.knownIds.length > 3,
)!;
const input = { ...base, playerId: player.id };
const started = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, {
  modules: [viewsModule, newsModule, beliefsModule, started.module],
});
const history = defaultPreStart(core);
if (history)
  runPreStart(core, preStartWindow(core, history.from, history.step));
started.start(core);
advanceCore(core, "2021-01-03");
const out = (line: string) => process.stdout.write(`${line}\n`);
out(`${base.placeMetadata?.placeName} (seed ${seed}), player ${player.id}`);
const others = [...core.people.values()]
  .filter((row) => row.alive && row.tier !== "husk" && row.id !== player.id)
  .map((row) => row.id as PersonId);
const known = new Set(core.people.get(player.id)!.knownIds);
const order = [
  ...others.filter((id) => known.has(id)),
  ...others.filter((id) => !known.has(id)),
];
for (const round of [0, 1]) {
  if (round) advanceCore(core, "2021-01-20");
  for (const otherId of order.slice(0, talks)) {
    const talk = openConversation(core, player.id, otherId, {
      director: started,
    });
    for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
      say(core, talk, talk.choices[turn % talk.choices.length]!.key);
    const greet = talk.lines.find((row) => row.kind === "greet");
    const bye = talk.lines.find((row) => row.kind === "farewell");
    const facts = Object.entries(talk.topicFacts ?? {})
      .filter(([, fact]) => fact.text)
      .map(([key, fact]) => `${key}=${fact.text}`)
      .join("; ");
    if (kind) {
      if ((talk.topics[0] ?? "").replace(/^[^>]*>/, "").startsWith(`${kind}:`))
        out(
          `[${round}] ${talk.lines.map((line) => `${line.speakerId === player.id ? "P" : "O"}: ${line.text}`).join(" / ")}`,
        );
      continue;
    }
    out(
      `[${round}] ${otherId.slice(-6)} | ${greet?.text ?? "-"} | ${talk.topics[0] ?? "-"} {${facts}} | ${bye?.text ?? "-"}`,
    );
  }
}
