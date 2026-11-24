import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn } from "./law-reach/applied";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

// The sales tax's counted reach is the counted people it stands for, once: a
// law's counted groups add up to no more than the town's counted people (a
// buyer household stands for its own record's people, the residents account
// for the rest), never the whole town once per buyer.
const seed = process.env.PURCHASE_REACH_SEED ?? randomBytes(8).toString("hex");
const KEYS = [
  "sales-tax",
  "us-policy-positions:fiscal.exempt-groceries-from-sales-tax",
];

describe(`sales tax counted reach (seed ${seed})`, () => {
  it("never stands for more people than the town's counted residents", () => {
    const places = [
      { name: "Prescott, Michigan", key: "2666300", seed: "a91c03e7d2b84f10" },
      drawPlace(`${seed}:0`, "purchase-tax-reach"),
    ];
    for (const place of places) {
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 40));
      const whole =
        residentsRuntime(core)?.store.weightedPeople(
          [...core.visiblePlaceIds][0]!,
        ) ?? 0;
      let witnessed = 0;
      for (const key of KEYS) {
        const rows = appliedOn(api, key).filter((r) => r.target === "group");
        const byLaw = new Map<string, number>();
        for (const r of rows)
          byLaw.set(r.lawId, (byLaw.get(r.lawId) ?? 0) + r.count);
        for (const [lawId, people] of byLaw) {
          witnessed += 1;
          expect(
            people,
            `${where}: ${key} (${lawId}) counted groups stand for ${people} of ${whole} counted people`,
          ).toBeLessThanOrEqual(whole);
        }
      }
      expect(
        witnessed,
        `${where}: counted sales-tax reach rows`,
      ).toBeGreaterThan(0);
    }
  }, 900_000);
});
