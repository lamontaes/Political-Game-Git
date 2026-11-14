/**
 * Eviction told through the words composer, proved in played worlds
 * (Words builder W1, Nov 12, 2026). Development tooling; nothing here words
 * anything, and shipped play never imports it.
 *
 *   node --import tsx scripts/words/eviction-talk-proof.ts --seed <seed> [--days 365] [--draws 3]
 *
 * Each draw takes a place from all 56 by the seed and plays the bench's world
 * (`buildBenchWorld`, two-level) day by day. The day a full household is put
 * out of its home (the housing engine's case reaches `removed`), the player
 * talks with an adult of it through the engine (`openConversation`, `say`):
 * the line it tells, the replies offered and each answer back, one talk per
 * reply. Prints the place, seed, case id and every line as played, and the
 * facts each line was composed from, so the words can be checked against the
 * records they cite.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState, PersonId } from "../../src/core2/types";
import { openConversation, say } from "../../src/director/conversation";
import { familyFactsOf } from "../../src/core2/modules/people";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "eviction-talk");
const days = Number(option("days", "365"));
const draws = Number(option("draws", "1"));
const wanted = Number(option("talks", "2"));
// Only households of two or more living members (the "we" tellings).
const manyOnly = option("many", "0") === "1";

const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

setBookkeeping(false);
for (let draw = 0; draw < draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "eviction-talk");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  console.log(
    `\n## ${place.name} (draw ${seed}:${draw}, place seed ${place.seed}), player ${nameOf(core, playerId)}`,
  );
  const told = new Set<string>();
  let talks = 0;
  for (let day = 0; day < days && talks < wanted; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const cases = coreAPI(core).moduleState("housing").table("cases");
    for (const row of cases.rows() as unknown as {
      id: string;
      stage?: string;
      householdId: string;
      removedAt?: string;
      owedAtRemovalMinor?: number;
    }[]) {
      if (row.stage !== "removed" || told.has(row.id)) continue;
      const household = core.households.get(row.householdId);
      if (!household) continue;
      told.add(row.id);
      if (
        manyOnly &&
        household.memberIds.filter((id) => core.people.get(id)?.alive).length <
          2
      )
        continue;
      const adult = household.memberIds.find((id) => {
        const person = core.people.get(id);
        return (
          person?.alive &&
          id !== playerId &&
          ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >= 18
        );
      });
      if (!adult) continue;
      talks += 1;
      const status = coreAPI(core)
        .moduleState("housing")
        .table("statuses")
        .get(row.householdId) as { status?: string } | undefined;
      console.log(
        `\n### ${core.date}: case ${row.id}, removed ${row.removedAt}, owed ${row.owedAtRemovalMinor} cents, status ${status?.status ?? "none"}; ${nameOf(core, adult)} (${adult}) talks with the player (to the player: ${familyFactsOf(core.people.get(playerId)!).get(adult)?.relation ?? "not family"})`,
      );
      const first = openConversation(core, playerId, adult, { director });
      const evicted = first.lines.find((line) => line.kind === "eviction");
      if (!evicted) {
        console.log(
          `  no eviction line; the talk opened: ${first.lines.map((line) => line.text).join(" / ") || "(nothing)"}`,
        );
        continue;
      }
      console.log(
        `  ${nameOf(core, adult)}: ${evicted.text}  [${evicted.wording?.facts.join(", ")}; ${evicted.sourceRecordIds.join(", ")}]`,
      );
      for (const choice of first.choices)
        console.log(`  - offered: ${choice.text} (${choice.move})`);
      // The talk whole and in order: the first reply each turn, from the
      // greeting to the last line.
      {
        const whole = openConversation(core, playerId, adult, { director });
        for (let turn = 0; turn < 6 && whole.choices.length; turn += 1)
          say(core, whole, whole.choices[0]!.key);
        console.log("  WHOLE TALK:");
        for (const line of whole.lines)
          console.log(
            `    ${line.speakerId === playerId ? "You" : nameOf(core, line.speakerId)} [${line.kind}/${line.act}]: ${line.text}`,
          );
      }
      // Each reply said on its own copy of the opened talk, so every
      // answer back is seen (a subject told once is not told again).
      for (const choice of first.choices) {
        const talk = Object.fromEntries(
          Object.entries(first).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value,
          ]),
        ) as typeof first;
        const from = talk.lines.length;
        say(core, talk, choice.key);
        const back = talk.lines
          .slice(from)
          .filter((line) => line.speakerId !== playerId)
          .map((line) => `${line.text} [${line.wording?.facts.join(", ")}]`);
        console.log(
          `  > You: ${choice.text}\n    ${nameOf(core, adult)}: ${back.join(" / ") || "(says nothing more)"}`,
        );
      }
    }
  }
  if (!talks) console.log(`  no full household put out in ${days} days`);
}
