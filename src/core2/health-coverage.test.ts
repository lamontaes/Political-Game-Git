import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { COVERAGE_MODULE_ID, type CoverageRow } from "./modules/coverage";
import { coreAPI } from "./state";

// Each full person holds a coverage record and the policyholder's household
// pays a monthly premium that reads it (people-coverage-record-monthly-pass).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "health-coverage");

it(`coverage records and a monthly premium in ${place.name} [${place.key}], seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name} [${place.key}], seed ${seed}`;
  const rowsNow = () =>
    (
      api
        .moduleState(COVERAGE_MODULE_ID)
        .table("coverage")
        .rows() as unknown as CoverageRow[]
    ).filter((row) => row.to === null);
  // Every living full person who is not an office holder holds one current record.
  const people = [...core.people.values()].filter(
    (p) => p.alive && !p.id.startsWith("official:"),
  );
  const opening = new Map(rowsNow().map((row) => [row.personId, row]));
  expect(opening.size, where).toBe(people.length);
  const holders = [...opening.values()].filter(
    (row) => row.plan === "employer" && row.holderId === row.personId,
  );
  expect(holders.length, `${where}: policyholders`).toBeGreaterThan(0);
  // Dependents on a policy name their holder, who lives in their household and has a job.
  for (const row of opening.values())
    if (row.plan === "employer") {
      const holder = core.people.get(row.holderId!)!;
      expect(holder.householdId, `${where} ${row.id}`).toBe(row.householdId);
      expect(holder.jobId, `${where} ${row.id}`).toBeDefined();
    }

  // The first of the next month the holder's household pays the premium to
  // the outside account by a journal record, and an uncovered neighbor pays none.
  const before = new Map(
    holders.map((h) => [h.personId, core.people.get(h.personId)!.liquidMinor]),
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 14));
  const paid = rowsNow().filter(
    (row) =>
      row.plan === "employer" &&
      row.holderId === row.personId &&
      row.lastPaidMinor > 0,
  );
  expect(paid.length, `${where}: premiums paid`).toBeGreaterThan(0);
  for (const row of paid) {
    expect(row.lastDueMinor, `${where} ${row.id}`).toBe(
      row.premiumMonthlyMinor,
    );
    expect(row.lastJournalId, `${where} ${row.id}`).toMatch(
      /^journal:\d{4}-\d{2}-\d{2}:\d+$/,
    );
    expect(before.has(row.personId)).toBe(true);
  }
  const uncovered = rowsNow().filter((row) => row.plan === "none");
  for (const row of uncovered) expect(row.lastDueMinor).toBe(0);
}, 900_000);
