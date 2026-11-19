import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import type { CoreState, PersonId } from "../core2/types";
import { openConversation, subjectsBetween } from "./conversation";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";

// Talk at home on a quiet day opens on the day itself
// (scene-household-quiet-day-talk): a household member has a `quiet`
// subject whose facts come from records: the weekday from the calendar, never
// "haven't seen much of you" (they live together and see each other every
// day, whatever the last talk was; #9875, lead Nov 12), and the listener's
// own work day from their job's hours (the day the line asks about is the
// listener's, #9875). In a place drawn from all 56, two weeks
// of days, every household member every day. The talk it opens never says
// the last time together, and a slot the line never fills (a brace) never
// reaches the player (Irwin, Missouri, seed
// 18cbbc424670d72c0f99cf9ae784eb8960301d7d: a member worked while the player
// had no job, and the day asked about is the player's). A player who lives
// alone has no one at home to talk with, so the draw moves on, bounded, and
// names each place it passed over (Livingston, Kentucky, seed
// 7838d14bd39634e894de1262cbee3aa0118b1392: an 18-year-old living alone).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 12;
const DAYS = 14;
const SEEN_LITTLE =
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkSeenLittleDays!.value;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Whether a person has hours at a job on the core's date, read independently of the director. */
function hasHours(core: CoreState, personId: string): boolean {
  try {
    return (
      workSpansOnDateV1(coreAPI(core), {
        controlledPersonId: personId,
        date: core.date,
      }).totalPlannedMinutes > 0
    );
  } catch {
    return false;
  }
}

function drawHousehold() {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(draw ? `${seed}:${draw}` : seed, "household-quiet");
    const world = buildBenchWorld(place.seed, "2025-01-20", {
      twoLevel: true,
      placeKey: place.key,
    });
    const playerId = world.playerId!;
    const player = world.core.people.get(playerId)!;
    const household = (
      world.core.households.get(player.householdId)?.memberIds ?? []
    )
      .filter((id) => id !== playerId && world.core.people.get(id)?.alive)
      .sort();
    if (household.length) {
      for (const where of passed)
        process.stdout.write(`HOUSEHOLD QUIET passed over: ${where}\n`);
      return { place, world, playerId, player, household };
    }
    passed.push(`${place.name} (${place.key}), the player lives alone`);
  }
  throw new Error(
    `No player with someone at home in ${DRAWS} places (seed ${seed}): ${passed.join("; ")}`,
  );
}

it(`a household member's quiet day is the weekday, the last time together and a work day, from records, in a drawn place, seed ${seed}`, () => {
  setBookkeeping(false);
  const { place, world, playerId, player, household } = drawHousehold();
  const { core, director } = world;
  const seen = { apart: 0, dayDone: 0, workDays: 0 };
  for (let day = 0; day < DAYS; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const weekday = WEEKDAYS[new Date(`${core.date}T00:00:00Z`).getUTCDay()]!;
    for (const id of household) {
      const subjects = subjectsBetween(core, id, playerId, director);
      const quiet = subjects.find((row) => row.kind === "quiet");
      expect(quiet, `${core.date} ${id}: no quiet subject`).toBeTruthy();
      // Last, so it never takes the place of a subject with a record behind it.
      expect(subjects.at(-1)).toBe(quiet);
      expect(quiet!.facts.weekday!.text).toBe(weekday);
      // A fact a line says is a slot, and the English engine's slots are
      // lowercase kebab case: any other key never fills.
      for (const [key, fact] of Object.entries(quiet!.facts))
        if (fact.text) expect(key, key).toMatch(/^[a-z][a-z0-9-]*$/);
      // Someone they live with is never someone they haven't seen much of,
      // however long since their last talk (read here from their
      // relationship records apart from the director).
      const lastSeen = [...core.relationships.values()]
        .filter(
          (tie) =>
            (tie.actorId === id && tie.otherId === playerId) ||
            (tie.actorId === playerId && tie.otherId === id),
        )
        .map((tie) => tie.lastContactDate)
        .sort()
        .at(-1);
      const apart = lastSeen
        ? daysBetween(makeIsoDate(lastSeen), makeIsoDate(core.date))
        : -1;
      if (apart >= SEEN_LITTLE) seen.apart += 1;
      expect(
        quiet!.facts["last-together"],
        `${core.date} ${id}: ${apart} days apart, same household`,
      ).toBeUndefined();
      const talk = openConversation(core, playerId, id as PersonId, {
        director,
      });
      for (const text of [
        ...talk.lines.map((line) => line.text),
        ...talk.choices.map((choice) => choice.text),
      ])
        expect(text, `${core.date} ${id}`).not.toMatch(/[{}]/);
      const said = talk.lines.find((line) =>
        line.wording?.facts.includes("last-together"),
      );
      expect(said, `${core.date} ${id}: ${said?.text}`).toBeUndefined();
      // The day the line asks about is the listener's (the player's): their
      // job's hours today, whatever the member's own hours.
      const working = !!player.jobId && hasHours(core, playerId);
      if (working) seen.workDays += 1;
      expect(!!quiet!.facts.dayDone, `${core.date} ${id}: dayDone`).toBe(
        working,
      );
      if (quiet!.facts.dayDone) {
        seen.dayDone += 1;
        expect(
          quiet!.facts.dayDone.sourceRecordIds[0],
          "the player's own job",
        ).toBe(player.jobId);
      }
    }
  }
  process.stdout.write(
    `HOUSEHOLD QUIET ${place.name} ${seed}: ${household.length} members over ${DAYS} days, apart ${SEEN_LITTLE}+ days ${seen.apart} (never said), work days ${seen.workDays}, dayDone ${seen.dayDone}\n`,
  );
}, 900_000);
