// @vitest-environment node
/** Generated-world drafting-reader regression; no law or vote fixtures. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  billLevelJurisdiction,
  billValueInForce,
  lawChain,
  lawInForce,
} from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-bill-baseline");
it(`Congress reads its current rate for the state: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const series = "medicaid-match";
    const current = lawInForce(api, series).governing!;
    expect(current.level).toBe("federal");
    expect(current.jurisdiction).toBe(lawChain(api).stateKey);
    const before = billValueInForce(
      api,
      { kind: "law-amount", series, unit: "percent" },
      billLevelJurisdiction(api, "federal"),
    );
    expect(before.recordId).toBe(current.id);
    expect(before.value).toBe(current.value);
    expect(before.unit).toBe(current.unit);
    const policy = billCatalog(api, "federal")
      .flatMap((s) => s.topics.flatMap((t) => t.policies))
      .find((p) => p.id === `law:${series}`)!;
    expect(policy.authority.allowed).toBe(true);
    expect(policy.inForceRecordId).toBe(current.id);
    expect(policy.inForce).toBe(current.value);
    // Ordinary own-level tax baselines still identify the same government's row.
    for (const level of ["federal", "state"] as const) {
      const expected = lawInForce(api, "income-tax").levels.find(
        (l) => l.level === level,
      )?.row;
      const tax = billValueInForce(
        api,
        { kind: "law-amount", series: "income-tax" },
        billLevelJurisdiction(api, level),
      );
      expect(tax.recordId).toBe(expected?.id ?? null);
      expect(tax.value).toBe(expected?.value ?? 0);
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        federalLawId: current.id,
        amount: current.value,
        catalogRecord: policy.inForceRecordId,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
