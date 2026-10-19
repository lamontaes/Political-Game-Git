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

it("an open counted eviction case follows its household to the lease it is filled in with", () => {
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
    // A counted household that pays rent through the residents engine.
    const household = rt.store
      .liveHouseholds()
      .find((h) => (rt.flows.get(`rent:${h.id}`)?.amountMinor ?? 0) > 0);
    if (!household) continue;
    const members = rt.store.countedMembers(household);
    if (!members.length) continue;
    const owed = 123_456;
    const caseId = `eviction:rent:${household.id}:${core.date}`;
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
    fillInPerson(core, rt.store.ids[members[0]!]! as never);
    const lease = core.finance.contracts.get(`lease:${household.id}`);
    expect(lease, `${where}: the household's own lease`).toBeDefined();
    expect(lease!.arrearsMinor, where).toBe(owed);
    expect(lease!.firstUnpaidAt, where).toBe(core.date);
    const row = api
      .moduleState(HOUSING_MODULE_ID)
      .table("cases")
      .get(caseId) as unknown as {
      leaseId: string;
      counted: boolean;
      open: boolean;
    };
    expect(row.leaseId, where).toBe(`lease:${household.id}`);
    expect(row.counted, where).toBe(false);
    expect(row.open, where).toBe(true);
    return;
  }
  throw new Error(`no counted renting household in 8 places; ${seed}`);
}, 1_800_000);
