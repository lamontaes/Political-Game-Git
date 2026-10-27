/**
 * Every full adult's work commitments pass the work-span check, so any of
 * them can become the controlled person and the clock can move. A commuter
 * job starts the day after its household is filled in; a household returned
 * to the counts the same day ended it before its first day, with an end
 * before its start (Washington, D.C., below). Played in that world and in a
 * place drawn from all 56; set GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ageOnDate } from "./kernel/dates";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { workSpansOnDateV1 } from "./work-spans-v1";

const DC = {
  name: "Washington, District of Columbia",
  key: "1150000",
  seed: "6b94f210b56e1581dc4aa4b9c03a5d03abb0770bbd038359cffa5146ce9db27b",
};
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ADULT_YEARS = 18;

/** Each living adult whose work spans fail to read, with why. */
function failures(core: CoreState): string[] {
  const api = coreAPI(core);
  const out: string[] = [];
  for (const person of core.people.values()) {
    if (!person.alive || ageOnDate(person.birthDate, core.date) < ADULT_YEARS)
      continue;
    try {
      workSpansOnDateV1(api, {
        controlledPersonId: person.id,
        date: core.date,
      });
    } catch (error) {
      out.push(`${person.id}: ${(error as Error).message}`);
    }
  }
  return out;
}

function open(place: { key: string; seed: string }) {
  setBookkeeping(false);
  return buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
}

it("every full adult's work spans read in Washington, D.C., where commuter jobs end before their first day", () => {
  const core = open(DC);
  const where = `${DC.name} (${DC.key}), place seed ${DC.seed}`;
  // The case behind the defect is in this world: a commuter job ended the
  // day before it would have started.
  const unstarted = [...core.work.commitments.values()].filter(
    (row) =>
      row.jobId.startsWith("job:commuter:") &&
      core.jobs.get(row.jobId)?.endsAt !== undefined &&
      core.jobs.get(row.jobId)!.endsAt! < row.startsAt,
  );
  expect(unstarted.length, where).toBeGreaterThan(0);
  for (const row of unstarted)
    expect(row.endsAt, `${where}: ${row.id}`).toBe(row.startsAt);
  expect(failures(core), where).toEqual([]);
}, 1_200_000);

it(`every full adult's work spans read in a drawn place (base ${base})`, () => {
  const place = drawPlace(base, "work-spans-full-adults");
  const where = `${place.name} (${place.key}), place seed ${place.seed}, base ${base}`;
  process.stdout.write(`work-spans-full-adults: ${where}\n`);
  expect(failures(open(place)), where).toEqual([]);
}, 1_200_000);
