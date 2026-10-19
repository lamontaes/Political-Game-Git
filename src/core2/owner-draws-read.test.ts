import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { BUSINESS_MODULE_ID } from "./modules/business";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// Owners draw from their firm through the business engine, within the firm's
// cash; the core keeps no stand-in payout of its own (SG-CORE-owner-distributions
// is resolved). The played bench world, a place drawn from all 56 on a seed
// nobody chose, 400 days.
const seed = process.env.OWNER_DRAWS_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "owner-draws");

describe(`owner draws in a played year (${place.name}, seed ${seed})`, () => {
  it("pays owners from their firms' cash through the business engine, with no core stand-in flow", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as unknown as CoreState;
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const api = coreAPI(core);
    const draws = api
      .moduleState(BUSINESS_MODULE_ID)
      .table("draws")
      .rows() as unknown as {
      id: string;
      organizationId: string;
      ownerId: string;
      drawnMinor: number;
      cashMinor: number;
    }[];
    const paid = draws.filter((row) => row.drawnMinor > 0);
    expect(paid.length, `${place.name}: draws paid in a year`).toBeGreaterThan(
      0,
    );
    for (const row of paid) {
      expect(row.drawnMinor, row.id).toBeLessThanOrEqual(row.cashMinor);
      const owner = core.people.get(row.ownerId);
      // A local owner is a full person with a household; an outside or
      // counted owner is paid through the residents' group accounts.
      if (owner) expect(owner.householdId, row.id).toBeTruthy();
    }
    const stood = [...(residentsRuntime(core)?.flows.values() ?? [])].filter(
      (flow) => (flow.kind as string) === "owner-distribution",
    );
    expect(stood, "the core's stand-in payout flows").toEqual([]);
  }, 900_000);
});
