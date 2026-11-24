// @vitest-environment node
/** Actual opening-law/catalog coverage; writer fixtures below are not votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import {
  draftBill,
  FEDERAL_HOUSE,
  members,
  memberKey,
} from "./modules/legislature";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-amount-replacement");
const series = "medicaid-match";

it(`Congress can replace the opening federal amount: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const date = gameStartDate();
    const world = buildBenchWorld(place.seed, date, {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const state = lawChain(api).stateKey;
    const original = lawInForce(api, series).governing!;
    expect(original.level).toBe("federal");
    expect(original.jurisdiction).toBe(state);
    expect(original.value).not.toBeNull();
    const amount = original.value!;
    const provision = provisionFor({
      policyId: `law:${series}`,
      operation: "lower",
      amount: amount - 1,
      effectiveDate: date,
    });
    const bill = draftBill(api, {
      bodyOfficeId: FEDERAL_HOUSE,
      sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
      provisions: [provision],
    });
    expect(bill.status).toBe("drafted");
    expect(bill.authority.every((a) => a.allowed)).toBe(true);
    const records = [original.id];
    const write = (
      jurisdiction: string,
      value: number,
      act: string,
      effectiveDate = date,
    ) => {
      const row = enactLaw(api, {
        jurisdiction,
        level: "federal",
        series,
        value,
        unit: "percent",
        effectiveDate,
        measureId: act,
        citation: "Federal amount reader fixture: 42 USC 1396d(b)",
        terms: { enactedByBill: act },
      });
      records.push(row.id);
      return row;
    };
    const nationwide = write("US", provision.value, bill.id);
    expect(lawInForce(api, series).governing?.id).toBe(nationwide.id);
    expect(lawInForce(api, series).value).toBe(amount - 1);
    const specific = write(state, amount - 2, "reader-later-specific-act");
    expect(lawInForce(api, series).governing?.id).toBe(specific.id);
    // Within the same act the specific section is an exception to its general
    // section, regardless of which section the writer encounters first.
    write("US", amount - 3, "reader-later-specific-act");
    expect(lawInForce(api, series).governing?.id).toBe(specific.id);
    const laterDate = addDays(date, 30);
    write(state, amount - 4, "reader-later-specific-act", laterDate);
    expect(lawInForce(api, series, laterDate).value).toBe(amount - 4);
    const restored = write("US", amount, "reader-subsequent-nationwide-act");
    expect(lawInForce(api, series).governing?.id).toBe(restored.id);
    expect(lawInForce(api, series, laterDate).governing?.id).toBe(restored.id);
    expect(lawInForce(api, series, laterDate).value).toBe(amount);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        billId: bill.id,
        records,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
