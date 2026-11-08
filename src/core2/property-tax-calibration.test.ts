// @vitest-environment node
/** Statistical property-tax fallback; direct enactment fixture is not a vote. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import acs from "../../data/research/laws/local-starting-law/property-tax-effective.json";
import starting from "./data/laws/starting-law.json";
import { provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import type { LawRowInput } from "./laws-starting";
import {
  bodyJurisdiction,
  bodyReach,
  bodyRow,
  draftBill,
  memberKey,
} from "./modules/legislature";
import { enactLaw, LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "starting-law-repeal-routes");
const series = "property-tax";
it(`combined survey taxes are calibration, not county law: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const chain = lawChain(api);
    expect(
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .query("bySeriesOnly", [series]),
      "A combined survey rate is not an enacted county statute",
    ).toEqual([]);
    const facts = api
      .moduleState(LAWS_MODULE_ID)
      .table("calibrations")
      .query("bySeriesOnly", [series]) as unknown as LawRowInput[];
    const current = lawInForce(api, series);
    const counties = acs.counties as Record<string, number>;
    const county = chain.countyGeoids.find((id) => counties[id] !== undefined);
    const state = (
      starting.propertyTax.states as Record<string, { rate: number }>
    )[chain.stateKey];
    const expected = county ? counties[county] : (state?.rate ?? null);
    expect(current.value).toBe(expected);
    if (expected === null) {
      expect(facts).toEqual([]);
      return;
    }
    expect(current.governing?.estimate).toBe(true);
    expect(current.governing?.id.startsWith("estimate:")).toBe(true);
    expect(current.governing?.source).toBeTruthy();
    for (const fact of facts) {
      expect(
        api.moduleCalendar(LAWS_MODULE_ID).get(`effect:${fact.id}`),
      ).toBeUndefined();
      expect(
        api
          .moduleCalendar(LAWS_MODULE_ID)
          .get(
            `effect:law:${fact.jurisdiction}:${fact.level}:${series}:${fact.tier}:2026-01-01`,
          ),
      ).toBeUndefined();
    }
    const body = townSeats(api).find(
      (s) => s.holder && bodyRow(s.office.kind) && s.office.level !== "federal",
    );
    expect(body).toBeDefined();
    const provision = provisionFor({
      policyId: "law:property-tax",
      operation: "lower",
      amount: 0,
    });
    const bill = draftBill(api, {
      bodyOfficeId: body!.office.id,
      sponsorId: memberKey(body!.holder!),
      provisions: [provision],
    });
    expect(bill.authority.every((a) => a.allowed)).toBe(true);
    const row = enactLaw(api, {
      jurisdiction: bodyJurisdiction(api, body!.office.id),
      level: bodyReach(api, body!.office.id),
      series,
      value: 0,
      unit: "percent of home value per year",
      effectiveDate: api.state.date,
      measureId: "reader-property-zero",
      citation: "Property-tax calibration reader fixture, not a vote",
      terms: { enactedByBill: bill.id },
    });
    const after = lawInForce(api, series);
    expect(after.governing?.id).toBe(row.id);
    expect(after.value).toBe(0);
    expect(after.levels.some((l) => l.row?.id.startsWith("estimate:"))).toBe(
      false,
    );
    expect(lawInForce(api, series, "2027-01-01").governing?.id).toBe(row.id);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        originalRate: current.value,
        originalRecord: current.governing?.id,
        body: body!.office.id,
        bill: bill.id,
        replacement: row.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
