/**
 * The minimum wage's history since 2000 is law (owner's history ruling): in a
 * random place, the federal and state rows run unbroken from 2000 into the
 * starting rows, and the law in force at a past date reads that date's rate
 * (OPUS-WEB calibrates against 2024).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { LAWS_MODULE_ID, lawChain, lawInForce, openLaws } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import history from "../../data/research/laws/minimum-wage-history-2000-2026.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`wage-history:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
type Step = { effectiveDate: string; rateMinor: number };
const stepAt = (steps: readonly Step[], date: string) =>
  [...steps]
    .filter((s) => s.effectiveDate <= date)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    .at(-1)?.rateMinor ?? 0;

describe("the minimum wage's history since 2000", () => {
  it("runs unbroken into the starting law and answers past dates", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 60,
      }),
    );
    openLaws(core);
    const api = coreAPI(core);
    const rows = api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[];
    const chain = lawChain(api);
    for (const [jurisdiction, level] of [
      ["US", "federal"],
      [chain.stateKey, "state"],
    ] as const) {
      const steps = rows
        .filter(
          (r) =>
            r.series === "minimum-wage" &&
            r.tier === "general" &&
            r.level === level &&
            r.jurisdiction === jurisdiction,
        )
        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      if (!steps.length) continue;
      if (level === "federal")
        expect(steps[0]!.effectiveDate).toBe("2000-01-01");
      // Each step ends as the next begins.
      for (let i = 0; i + 1 < steps.length; i += 1)
        expect(steps[i]!.endDate, `${where} ${steps[i]!.id}`).toBe(
          steps[i + 1]!.effectiveDate,
        );
    }
    expect(
      lawInForce(api, "minimum-wage", "2005-01-01").value,
      where,
    ).toBeGreaterThanOrEqual(515);
    // In mid-2024, the higher of the federal and state rates (a local
    // ordinance may be higher still).
    const own = (history.places as Record<string, unknown>)[chain.stateKey];
    const expected = Math.max(
      725,
      Array.isArray(own) ? stepAt(own as Step[], "2024-07-01") : 0,
    );
    const at2024 = lawInForce(api, "minimum-wage", "2024-07-01").value;
    expect(at2024, where).toBeGreaterThanOrEqual(expected);
    govReport(
      "minimum-wage-history",
      JSON.stringify({
        where,
        at2005: lawInForce(api, "minimum-wage", "2005-01-01").value,
        at2024,
        expected,
      }),
    );
  }, 120_000);
});
