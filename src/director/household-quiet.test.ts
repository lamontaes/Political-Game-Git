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
// subject whose facts come from records, the weekday from the calendar, the
// last time the two spent together from their relationship record (only
// when they have been apart some days), and a work day from the job's own hours. In a place drawn from all 56, two weeks
// of days, every household member every day. The talk it opens says the last
// time together in words: a slot the line never fills ("Haven't seen much of
// you since {last-together}.") never reaches the player.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "household-quiet");
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

it(`a household member's quiet day is the weekday, the last time together and a work day, from records, in ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, "2025-01-20", {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const player = core.people.get(playerId)!;
  const household = (core.households.get(player.householdId)?.memberIds ?? [])
    .filter((id) => id !== playerId && core.people.get(id)?.alive)
    .sort();
  expect(household.length, "a household to talk with").toBeGreaterThan(0);
  const seen = { lastTogether: 0, said: 0, dayDone: 0, workDays: 0 };
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
      // The last time together is said only when they have been apart some
      // days ("since yesterday" is never "not much"), read here from their
      // relationship records apart from the director.
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
      const together = quiet!.facts["last-together"];
      expect(!!together, `${core.date} ${id}: ${apart} days apart`).toBe(
        apart >= SEEN_LITTLE,
      );
      if (together) {
        seen.lastTogether += 1;
        expect(
          core.relationships.get(together.sourceRecordIds[0]!)?.lastContactDate,
          `${together.sourceRecordIds[0]} is their latest tie`,
        ).toBe(lastSeen);
      }
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
      if (said) {
        seen.said += 1;
        expect(said.text, `${core.date} ${id}`).toContain(together!.text);
      }
      const working = hasHours(core, id) || hasHours(core, playerId);
      if (working) seen.workDays += 1;
      expect(!!quiet!.facts.dayDone, `${core.date} ${id}: dayDone`).toBe(
        working,
      );
      if (quiet!.facts.dayDone) {
        seen.dayDone += 1;
        const jobId = quiet!.facts.dayDone.sourceRecordIds[0]!;
        expect(
          [core.people.get(id)!.jobId, player.jobId],
          `${jobId} is a job of one of them`,
        ).toContain(jobId);
      }
    }
  }
  process.stdout.write(
    `HOUSEHOLD QUIET ${place.name} ${seed}: ${household.length} members over ${DAYS} days, lastTogether ${seen.lastTogether} (said ${seen.said}), work days ${seen.workDays}, dayDone ${seen.dayDone}\n`,
  );
}, 900_000);
