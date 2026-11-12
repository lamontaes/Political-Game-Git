/**
 * News of a person's own life told through the words composer, proved in
 * played worlds (Words builder W1, Nov 12, 2026). Development tooling;
 * nothing here words anything, and shipped play never imports it.
 *
 *   node --import tsx scripts/words/told-talk-proof.ts --kind eviction|job-lost|death-news|illness-news|prison-news --seed <seed> [--days 365] [--draws 3] [--talks 2]
 *
 * Each draw takes a place from all 56 by the seed and plays the bench's world
 * (`buildBenchWorld`, two-level) day by day, the player's household watched
 * by the story director as the bench watches it. On the day the news happens
 * (eviction: a full household's case reaches `removed`, and an adult of it
 * talks with the player; job-lost: a watched person's ledger holds the money
 * moment of a job ending), the player talks with them through the engine
 * (`openConversation`, `say`): the line they tell, the replies offered and
 * each answer back, every reply said on its own copy of the opened talk.
 * Prints the place, seed, record ids and every line as played, and the facts
 * each line was composed from, so the words can be checked against the
 * records they cite.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState, PersonId } from "../../src/core2/types";
import { openConversation, say } from "../../src/director/conversation";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const kind = option("kind", "eviction");
/** The ledger label of each kind of a relative's news the house tells the player. */
const NEWS_LABELS: Readonly<Record<string, string>> = {
  "death-news": "feeling:event:life.death",
  "illness-news": "feeling:event:health.serious-illness",
  "prison-news": "feeling:event:justice.imprisoned",
};
const seed = option("seed", "told-talk");
const days = Number(option("days", "365"));
const draws = Number(option("draws", "1"));
const wanted = Number(option("talks", "2"));

const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

setBookkeeping(false);
for (let draw = 0; draw < draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "told-talk");
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
  // Watched as the bench watches the player's household.
  // For a job lost, the player's relatives are watched too (a lost job in
  // one household in a year is rare; the player hears a relative's).
  const player = core.people.get(playerId)!;
  const watched = [
    ...new Set([
      ...(core.households.get(player.householdId)?.memberIds ?? [playerId]),
      ...(kind === "job-lost" ? [...player.familyIds] : []),
    ]),
  ].filter((id) => core.people.has(id as PersonId)) as PersonId[];
  for (const id of watched)
    if (core.people.get(id)?.alive) director.watch(core, id);
  let talks = 0;
  for (let day = 0; day < days && talks < wanted; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const tellers: { id: PersonId; about: string }[] = [];
    if (kind === "eviction") {
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
        const adult = household.memberIds.find((id) => {
          const person = core.people.get(id);
          return (
            person?.alive &&
            id !== playerId &&
            ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >=
              18
          );
        });
        const status = coreAPI(core)
          .moduleState("housing")
          .table("statuses")
          .get(row.householdId) as { status?: string } | undefined;
        if (adult)
          tellers.push({
            id: adult,
            about: `case ${row.id}, removed ${row.removedAt}, owed ${row.owedAtRemovalMinor} cents, status ${status?.status ?? "none"}`,
          });
      }
    } else if (NEWS_LABELS[kind]) {
      // A relative's news is told to the player by an adult they live with.
      const moment = director.ledger.people
        .get(playerId)
        ?.moments.find(
          (row) =>
            row.label === NEWS_LABELS[kind] &&
            row.date === core.date &&
            !told.has(row.causeId),
        );
      const teller = moment
        ? (core.households.get(player.householdId)?.memberIds ?? []).find(
            (id) =>
              id !== playerId &&
              core.people.get(id)?.alive &&
              ageOnDate(
                makeIsoDate(core.people.get(id)!.birthDate),
                makeIsoDate(core.date),
              ) >= 18,
          )
        : undefined;
      if (moment) told.add(moment.causeId);
      if (moment && teller)
        tellers.push({
          id: teller,
          about: `${kind}, ${moment.causeId} (about ${nameOf(core, moment.counterpartIds[0] ?? "")})`,
        });
    } else
      for (const id of watched) {
        const moment = director.ledger.people
          .get(id)
          ?.moments.find(
            (row) =>
              row.label === "money:job-ended" &&
              row.date === core.date &&
              !row.counterpartIds.length,
          );
        if (!moment || told.has(moment.causeId) || id === playerId) continue;
        told.add(moment.causeId);
        tellers.push({ id, about: `job ended, ${moment.causeId}` });
      }
    for (const { id: adult, about } of tellers) {
      talks += 1;
      console.log(
        `\n### ${core.date}: ${about}; ${nameOf(core, adult)} (${adult}) talks with the player`,
      );
      const first = openConversation(core, playerId, adult, { director });
      const evicted = first.lines.find((line) => line.kind === kind);
      if (!evicted) {
        console.log(
          `  no ${kind} line; the talk opened: ${first.lines.map((line) => line.text).join(" / ") || "(nothing)"}`,
        );
        continue;
      }
      console.log(
        `  ${nameOf(core, adult)}: ${evicted.text}  [${evicted.wording?.facts.join(", ")}; ${evicted.sourceRecordIds.join(", ")}]`,
      );
      for (const choice of first.choices)
        console.log(`  - offered: ${choice.text} (${choice.move})`);
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
  if (!talks) console.log(`  no ${kind} news in ${days} days`);
}
