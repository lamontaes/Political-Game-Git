import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type * as Money from "./counted-money";
import type { CoreState } from "./types";
import { countedRecords } from "./tooling/counted-records";

// Two of the counted-group hooks, read in a played year (one model, two
// tiers): a counted tenant's rent is renewed by the same rule as a full
// tenant's lease, and payments between an organization and a place's counted
// residents go through the group accounts. The played bench world, a place
// drawn from all 56 on a seed nobody chose, thirteen months of days.
const calls: { id: string; reasonKey: string; placeId: string }[] = [];
vi.mock("./counted-money", async (importOriginal) => {
  const real = await importOriginal<typeof Money>();
  return {
    ...real,
    countedPayment: (
      ...args: Parameters<typeof real.countedPayment>
    ): ReturnType<typeof real.countedPayment> => {
      const input = args[1];
      calls.push({
        id: input.id,
        reasonKey: input.reasonKey,
        placeId: input.placeId,
      });
      return real.countedPayment(...args);
    },
  };
});

const seed = process.env.COUNTED_RENT_SEED ?? randomBytes(8).toString("hex");

/** The played year in one drawn place, and whether a counted tenant's rent renewed in it. */
function playYear(attempt: number) {
  const place = drawPlace(`${seed}:${attempt}`, "counted-rent-transfer");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as unknown as CoreState;
  const api = coreAPI(core);
  const start = core.date;
  advanceCore(core, addDays(makeIsoDate(core.date), 400));
  const rt = residentsRuntime(core)!;
  const renewed = (
    api.moduleState(HOUSING_MODULE_ID).table("renewals").rows() as unknown as {
      tier?: string;
      previousRentMinor?: number;
      renewedAt: string;
      householdId?: string;
    }[]
  ).some(
    (row) =>
      row.tier === "counted" &&
      row.previousRentMinor !== undefined &&
      row.renewedAt > start &&
      row.householdId !== undefined &&
      rt.households.has(row.householdId),
  );
  return { place, core, api, start, renewed };
}

// A small town may have no counted tenant whose lease comes up in the year, so
// another place is drawn (up to eight) before the checks run.
let played = playYear(0);
for (let attempt = 1; attempt < 8 && !played.renewed; attempt += 1)
  played = playYear(attempt);
const { place, core, api, start } = played;

describe(`counted rent and payments in a played year (${place.name}, seed ${seed})`, () => {
  it("renews a counted tenant's rent by the same rule as a full tenant's lease", () => {
    const rt = residentsRuntime(core)!;
    // Both tiers renew through renewRentalLeases (housing-occupancy.ts): a
    // counted tenant's renewal is keyed by its rent flow, tier "counted".
    const renewals = api
      .moduleState(HOUSING_MODULE_ID)
      .table("renewals")
      .rows() as unknown as {
      id: string;
      tier?: string;
      householdId?: string;
      renewedAt: string;
      rentMinor: number;
      previousRentMinor?: number;
    }[];
    const counted = renewals.filter(
      (row) =>
        row.tier === "counted" &&
        row.previousRentMinor !== undefined &&
        row.renewedAt > start &&
        row.householdId !== undefined &&
        countedRecords(core).has(row.householdId),
    );
    expect(counted.length, `${place.name} from ${start}`).toBeGreaterThan(0);
    for (const row of counted) {
      const flow = rt.flows.get(row.id);
      // The flow carries the renewed amount until it ends or a later renewal.
      if (flow && !flow.endedAt)
        expect(flow.amountMinor, row.id).toBe(row.rentMinor);
    }
    expect(
      counted.some((row) => row.rentMinor !== row.previousRentMinor),
      "a counted tenant's rent moved at renewal",
    ).toBe(true);
  });

  it("pays counted residents through their group accounts when an engine moves cash to them", () => {
    // transferCash (world-transfer.ts) hands any payment with a residents
    // party to countedPayment: a business owner's draw and unemployment
    // benefits are the engines that pay counted people here.
    const viaTransfer = calls.filter((c) =>
      ["owner-draw", "unemployment-benefit"].includes(c.reasonKey),
    );
    expect(
      viaTransfer.length,
      "payments to or from counted residents",
    ).toBeGreaterThan(0);
    for (const call of viaTransfer.slice(0, 20))
      expect(call.placeId, call.id).toBeTruthy();
  });
});
