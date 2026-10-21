/**
 * A counted household's open eviction case follows its people when one is
 * filled in (pool item core-fill-in-hook): the household's own lease takes up
 * the arrears its group had run up, and the case is no longer a counted one.
 * A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run. The
 * case is an edge fixture on a real counted renting household.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

type CaseRow = {
  leaseId: string;
  counted: boolean;
  open: boolean;
  settledAtFillInMinor: number;
  settledFrom: {
    cashMinor: number;
    livingMonthMinor: number;
    willingness: number;
    owedMinor: number;
  };
};

it("an open counted eviction case follows its household to the lease, and the household settles what its cash and traits allow", () => {
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "fill-in-hook");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    // Counted households that pay rent through the residents engine.
    const renting = [...rt.store.liveHouseholds()]
      .filter((h) => (rt.flows.get(`rent:${h.id}`)?.amountMinor ?? 0) > 0)
      .filter((h) => rt.store.countedMembers(h).length > 0);
    if (renting.length < 2) continue;
    // The case is an edge fixture on each: one owes little, one owes far
    // more than any household holds.
    const open = (
      household: (typeof renting)[number],
      owed: number,
    ): { caseId: string; householdId: string; personId: string } => {
      const caseId = `eviction:rent:${household.id}:${core.date}`;
      const householdId = household.id;
      const personId = rt.store.ids[
        rt.store.countedMembers(household)[0]!
      ] as string;
      api
        .moduleState(HOUSING_MODULE_ID)
        .table("cases")
        .put({
          id: caseId,
          leaseId: `rent:${household.id}`,
          householdId: household.id,
          landlordId: "fixture-landlord",
          counted: true,
          open: true,
          stage: "notice",
          owedAtNoticeMinor: owed,
          noticeAt: core.date,
          cureBy: core.date,
        } as never);
      return { caseId, householdId, personId };
    };
    const little = open(renting[0]!, 100);
    const much = open(renting[1]!, 1_000_000_000);
    for (const { caseId, householdId, personId } of [little, much]) {
      fillInPerson(core, personId as never);
      const lease = core.finance.contracts.get(`lease:${householdId}`);
      expect(lease, `${where}: the household's own lease`).toBeDefined();
      const row = api
        .moduleState(HOUSING_MODULE_ID)
        .table("cases")
        .get(caseId) as unknown as CaseRow;
      expect(row.leaseId, where).toBe(`lease:${householdId}`);
      expect(row.counted, where).toBe(false);
      // What it did not settle stays on the lease from the notice date.
      const owed = row.settledFrom.owedMinor;
      expect(lease!.arrearsMinor + row.settledAtFillInMinor, where).toBe(owed);
      expect(row.settledAtFillInMinor, where).toBeLessThanOrEqual(
        Math.round(
          Math.max(
            0,
            row.settledFrom.cashMinor - row.settledFrom.livingMonthMinor,
          ) * row.settledFrom.willingness,
        ) + 1,
      );
      expect(row.settledFrom.willingness, where).toBeGreaterThanOrEqual(0);
      expect(row.settledFrom.willingness, where).toBeLessThanOrEqual(1);
    }
    const settledLittle = api
      .moduleState(HOUSING_MODULE_ID)
      .table("cases")
      .get(little.caseId) as unknown as CaseRow;
    const settledMuch = api
      .moduleState(HOUSING_MODULE_ID)
      .table("cases")
      .get(much.caseId) as unknown as CaseRow;
    // A household behind by far more than it holds keeps owing; the sum it
    // settles is its spare cash times its willingness, so it cannot clear it.
    expect(
      core.finance.contracts.get(`lease:${much.householdId}`)!.arrearsMinor,
      where,
    ).toBeGreaterThan(0);
    // A household's settled sum never exceeds what it owed.
    expect(settledLittle.settledAtFillInMinor, where).toBeLessThanOrEqual(100);
    expect(settledMuch.settledAtFillInMinor, where).toBeLessThan(1_000_000_000);
    return;
  }
  throw new Error(`no two counted renting households in 8 places; ${seed}`);
}, 1_800_000);
