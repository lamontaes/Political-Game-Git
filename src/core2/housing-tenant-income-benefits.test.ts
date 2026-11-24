// @vitest-environment node
/**
 * Rent help ranks renters by income per member, and the income counts the cash
 * assistance a household draws (24 CFR 5.609), full and counted households
 * alike (pool item housing-rent-help-income-omits-benefits). In a played world
 * in a place drawn from all 56, a renter household given a cash assistance
 * payment ranks by it: its tenant income rises by a twelfth of the year's.
 * Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { tenants } from "./housing-occupancy";
import { putRow } from "./law-reach/group-b-store";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

for (const n of [1, 2]) {
  it(`a renter household's tenant income counts its cash assistance (${replay}, draw ${n})`, () => {
    const draw = drawPlace(replay, `tenant-income-benefits:${n}`);
    const where = `${draw.name} (${draw.key}), place seed ${draw.seed}`;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const before = tenants(api);
    const full = before.find((t) => t.tier === "full");
    const counted = before.find((t) => t.tier === "counted");
    expect(full ?? counted, `${where}: no renter household`).toBeDefined();
    const yearly = 24_000_00;
    const months = api.parameter("macroMonthsPerYear");
    const planted = Object.fromEntries(
      [full, counted].flatMap((t) => (t ? [[t.id, yearly / months]] : [])),
    );
    putRow(api, "taken", {
      id: "assist|budget-line:welfareAndMedicaid",
      key: "assist|budget-line:welfareAndMedicaid",
      monthlyByHousehold: planted,
    });
    const after = tenants(api);
    for (const t of [full, counted]) {
      if (!t) continue;
      const now = after.find((row) => row.id === t.id)!;
      expect(
        now.incomeMinor - t.incomeMinor,
        `${where}: ${t.tier} household ${t.id}`,
      ).toBeCloseTo(yearly / months, 0);
    }
  }, 300_000);
}
