/**
 * One model, two tiers: the counted tier's share of a place's unplaced
 * workers' pay has the law's taxes taken out (`payGroups`); a filled-in
 * household's share, paid to a worker of its own, is taxed by the same law.
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
import { coreAPI, fillInPerson } from "./state";

it("withholds a filled-in worker's share of the unplaced pay", () => {
  setBookkeeping(false);
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
  const place = drawPlace(seed, "unplaced-withholding");
  const where = `seed ${seed}, ${place.name} (${place.key})`;
  console.log(`unplaced-withholding: ${where}`);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const home = [...rt.store.liveHouseholds()].find(
    (h) => h.unplacedWorkers >= 0.5,
  );
  // A place whose opening employment target leaves no one unplaced has nothing to withhold.
  expect(home, `${where}: no household holds an unplaced worker`).toBeDefined();
  const member = rt.store.countedMembers(home!)[0]!;
  const person = fillInPerson(core, rt.store.ids[member]!);
  // The record of why a stranger's pay was taxed is kept only on request (bookkeeping).
  setBookkeeping(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 45));
  setBookkeeping(false);
  const api = coreAPI(core);
  const flows = [...rt.flows.values()].filter(
    (flow) =>
      flow.payeeId === person.id &&
      flow.financeKind === "work.unplaced-residents",
  );
  expect(flows.length, `${where}: no flow of their own`).toBe(1);
  const paid = flows[0]!.lastPaidMinor ?? 0;
  const taken = withholdingOf(api, person.id).filter((row) =>
    row.payrollReceiptId.startsWith(flows[0]!.id),
  );
  console.log(
    `unplaced-withholding: ${flows[0]!.id} paid ${paid}, ${taken.length} withholding record(s): ${taken.map((row) => row.id).join(", ")}`,
  );
  expect(paid, where).toBeGreaterThan(0);
  expect(taken.length, `${where}: nothing withheld`).toBeGreaterThan(0);
}, 900_000);
