import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type * as Money from "./counted-money";
import type { CoreState } from "./types";

// Two of the counted-group hooks, read in a played year (one model, two
// tiers): a counted tenant's rent is renewed by the same rule as a full
// tenant's lease, and payments between an organization and a place's counted
// residents go through the group accounts. The played bench world at one
// pinned place, thirteen months of days.
//
// Pinned (Nov 16). Before, the test drew its seed at run time from
// COUNTED_RENT_SEED or randomBytes and drew up to eight places from it until
// one renewed a counted tenant's lease, so a red came and went with the draw.
// St. Edward, Nebraska was found once by running the old draw at seed
// pin-cr-2 (its first draw renews one); Polk City, Florida and Berry College,
// Georgia passed the same way.
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

const place = {
  key: "3143055",
  name: "St. Edward, Nebraska",
  seed: "b32785a069f0f8996bf5862f6390c654564a104f25426fc55b0ae5cd0c1cf028",
};
const seed = place.seed;

/** The played year at the pinned place, and whether a counted tenant's rent renewed in it. */
function playYear() {
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
  return { core, api, start, renewed };
}

type Played = ReturnType<typeof playYear>;
let core!: Played["core"];
let api!: Played["api"];
let start!: Played["start"];
let renewed!: Played["renewed"];

// Limit: the played year takes 233 s alone and 228 s beside group-quarters
// (Nov 16, Train 800ae520); twice the slower is about 480 s. It was built at
// load before, where no limit applied.
describe(`counted rent and payments in a played year (${place.name}, seed ${seed})`, () => {
  beforeAll(() => {
    ({ core, api, start, renewed } = playYear());
  }, 480_000);
  it("renews a counted tenant's rent by the same rule as a full tenant's lease", () => {
    // The pinned place renews a counted tenant's lease in the year.
    expect(renewed, `${place.name} (${place.key})`).toBe(true);
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
        rt.households.has(row.householdId),
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
