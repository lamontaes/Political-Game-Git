// @vitest-environment node
/** Calibration classification and reader regression; direct writer call is not a vote. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import sales2025 from "../../data/research/laws/taxfoundation-2025-sales-tax.json";
import salesLater from "../../data/research/laws/local-starting-law/sales-tax.json";
import { buildBenchWorld } from "../bench/world";
import { provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import startingData from "./data/laws/starting-law.json";
import { gameStartDate } from "./game-start";
import {
  authorityFor,
  bodyJurisdiction,
  bodyReach,
  bodyRow,
  draftBill,
  memberKey,
} from "./modules/legislature";
import { enactLaw, LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
// Reuse the audit's draw so its failing place can be replayed here unchanged.
const place = drawPlace(replay, "starting-law-repeal-routes");
const series = "local-sales-tax-average";
it(`a statistical rate is not an enacted law: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const state = lawChain(api).stateKey;
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    expect(
      laws.query("bySeriesOnly", [series]),
      "An average is a calibration fact, not a statute",
    ).toEqual([]);
    const records = api
      .moduleState(LAWS_MODULE_ID)
      .table("calibrations")
      .query("bySeriesOnly", [series]) as unknown as LawRowInput[];
    const research = (
      salesLater.places as Record<
        string,
        { localAllowed?: boolean; avgLocalRate?: number | null }
      >
    )[state];
    const present =
      research?.localAllowed === true && research.avgLocalRate != null;
    expect(records.length > 0).toBe(present);
    for (const row of records) {
      expect(row.jurisdiction).toBe(state);
      expect(row.estimate).toBe(true);
      expect(row.id.startsWith("estimate:")).toBe(true);
      expect(
        api.moduleCalendar(LAWS_MODULE_ID).get(`effect:${row.id}`),
      ).toBeUndefined();
    }
    const source = startingData as unknown as {
      jurisdictions: Record<string, LawRowInput[]>;
      calibrations?: Record<string, LawRowInput[]>;
    };
    for (const row of (source.calibrations ?? source.jurisdictions)[state] ??
      []) {
      if (row.series !== series) continue;
      expect(
        api
          .moduleCalendar(LAWS_MODULE_ID)
          .get(
            `effect:law:${state}:${row.level}:${series}:${row.tier}:${row.effectiveDate}`,
          ),
      ).toBeUndefined();
    }
    const initial = lawInForce(api, "sales-tax");
    const local = initial.levels.filter((l) =>
      ["city", "county", "township"].includes(l.level),
    );
    const hasLocalLaw = local.some((l) => l.row?.series === "sales-tax");
    const fallback = local.find((l) => l.row?.series === series)?.row;
    if (present && !hasLocalLaw) {
      const old = (
        sales2025.places as Record<string, { avgLocalRate: number }>
      )[state];
      expect(fallback?.value).toBe(old?.avgLocalRate ?? research!.avgLocalRate);
      expect(fallback?.jurisdiction).toBe(state);
      expect(fallback?.source).toBeTruthy();
    } else expect(fallback).toBeUndefined();
    // A later calibration vintage is selected by date without a statute
    // taking effect or a calendar event being needed to make it visible.
    const futureFallback = lawInForce(
      api,
      "sales-tax",
      "2026-01-02",
    ).levels.find((level) => level.row?.series === series)?.row;
    if (futureFallback) {
      expect(futureFallback.value).toBe(research!.avgLocalRate);
      expect(futureFallback.estimate).toBe(true);
    }
    const provision = provisionFor({
      policyId: "law:sales-tax",
      operation: "lower",
      amount: 0,
    });
    expect(authorityFor(api, provision).allowed).toBe(present);
    const body = townSeats(api).find(
      (s) =>
        s.holder &&
        bodyRow(s.office.kind) &&
        ["county", "city"].includes(s.office.level),
    );
    let replacement: string | undefined;
    if (present && body) {
      const bill = draftBill(api, {
        bodyOfficeId: body.office.id,
        sponsorId: memberKey(body.holder!),
        provisions: [provision],
      });
      expect(bill.authority.every((a) => a.allowed)).toBe(true);
      const row = enactLaw(api, {
        jurisdiction: bodyJurisdiction(api, body.office.id),
        level: bodyReach(api, body.office.id),
        series: "sales-tax",
        value: 0,
        unit: "percent",
        effectiveDate: api.state.date,
        measureId: "reader-local-zero-rate",
        citation: "Calibration reader regression, not a vote",
        terms: { enactedByBill: bill.id },
      });
      replacement = row.id;
      const after = lawInForce(api, "sales-tax");
      expect(after.levels.some((l) => l.row?.id === row.id)).toBe(true);
      expect(after.levels.some((l) => l.row?.series === series)).toBe(false);
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        estimates: records.map((r) => ({
          id: r.id,
          value: r.value,
          date: r.effectiveDate,
        })),
        initialTax: initial.value,
        fallback: fallback?.id,
        localReplacement: replacement,
        localBody: body?.office.id,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
