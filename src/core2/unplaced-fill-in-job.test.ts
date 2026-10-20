/**
 * A met commuter has a job on the books: filling in a household that holds a
 * share of the place's unplaced workers gives its worker a job at the place's
 * outside account, paid and taxed by the work payroll, and takes the same
 * share out of the place's unplaced-wages flow (people-unplaced-fill-in-job).
 * Place and seed from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { withholdingOf } from "./modules/budgets";
import { residentsRuntime } from "./modules/residents";
import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { coreAPI, fillInPerson } from "./state";

it("gives a filled-in commuter a job at the outside account, paid and withheld by the work payroll", () => {
  setBookkeeping(false);
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
  const place = drawPlace(seed, "unplaced-fill-in-job");
  const where = `seed ${seed}, ${place.name} (${place.key})`;
  console.log(`unplaced-fill-in-job: ${where}`);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const home = [...rt.store.liveHouseholds()].find(
    (h) => h.unplacedWorkers >= 0.5,
  );
  // A place whose opening employment target leaves no one unplaced has no commuter to meet.
  expect(home, `${where}: no household holds an unplaced worker`).toBeDefined();
  const base = [...rt.flows.values()].find(
    (flow) => flow.financeKind === "work.unplaced-residents" && !flow.endedAt,
  )!;
  const before = base.amountMinor;
  const known = new Set(core.jobs.keys());
  const person = fillInPerson(
    core,
    rt.store.ids[rt.store.countedMembers(home!)[0]!]!,
  );
  // The household's working-age member who held the share is the commuter.
  const job = [...core.jobs.values()].find(
    (row) => row.id.startsWith("job:commute:") && !known.has(row.id),
  );
  expect(job, `${where}: no commuter job`).toBeDefined();
  const worker = core.people.get(job!.personId)!;
  expect(worker.householdId, where).toBe(person.householdId);
  expect(core.organizations.get(job!.organizationId)!.kind, where).toBe(
    OUTSIDE_MARKET_KIND,
  );
  // The share left the place's flow, and no flow of their own copies it.
  expect(base.amountMinor, where).toBeLessThan(before);
  expect(
    [...rt.flows.values()].filter((flow) => flow.payeeId === worker.id),
    where,
  ).toEqual([]);
  // The owner of the paycheck's why is asked for, so it is kept (bookkeeping).
  setBookkeeping(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 45));
  setBookkeeping(false);
  const taken = withholdingOf(coreAPI(core), worker.id);
  console.log(
    `unplaced-fill-in-job: ${job!.id} at ${job!.organizationId}, ${taken.length} withholding record(s): ${taken.map((row) => row.id).join(", ")}`,
  );
  expect(taken.length, `${where}: nothing withheld`).toBeGreaterThan(0);
  expect(core.organizations.get(job!.organizationId)!.liquidMinor, where).toBe(
    0,
  );
}, 900_000);
