import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import type { CoreState } from "../core2/types";
import { subjectsBetween } from "./conversation";

// Talk at home on a quiet day opens on the day itself
// (scene-household-quiet-day-talk): a household member has a `quiet`
// subject whose facts come from records, the weekday from the calendar, the
// last time the two spent together from their relationship record, and a
// work day from the job's own hours. In a place drawn from all 56, two weeks
// of days, every household member every day.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "household-quiet");
const DAYS = 14;
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
  const seen = { lastTogether: 0, dayDone: 0, workDays: 0 };
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
      const together = quiet!.facts["last-together"];
      if (together) {
        seen.lastTogether += 1;
        const tie = core.relationships.get(together.sourceRecordIds[0]!);
        expect(
          tie,
          `${together.sourceRecordIds[0]} is a relationship`,
        ).toBeTruthy();
        expect(tie!.lastContactDate < core.date).toBe(true);
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
  expect(seen.lastTogether, "a last time together").toBeGreaterThan(0);
  process.stdout.write(
    `HOUSEHOLD QUIET ${place.name} ${seed}: ${household.length} members over ${DAYS} days, lastTogether ${seen.lastTogether}, work days ${seen.workDays}, dayDone ${seen.dayDone}\n`,
  );
}, 900_000);
