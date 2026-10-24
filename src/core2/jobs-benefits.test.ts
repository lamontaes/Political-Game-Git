/**
 * Unemployment insurance reads the state's law in force: a random place from
 * all 56 jurisdictions, its program (or none, where the territory has none),
 * its weekly maximum and its weeks, as the starting law records them.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawInForce, openLaws } from "./modules/laws";
import { unemploymentTerms } from "./jobs-benefits";
import { JOBS_MODULE } from "./modules/jobs";
import { worldCoreData } from "./modules/world";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`ui-terms:${Date.now()}`).digest("hex");

function randomPlace() {
  const states = [...lifePlaceStateIdentities()]
    .map((s) => s.jurisdictionKey)
    .sort();
  const hash = createHash("sha256").update(seed).digest("hex");
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  return places[parseInt(hash.slice(8, 16), 16) % places.length]!;
}

describe("unemployment insurance terms", () => {
  it("come from the state's law in force", () => {
    const place = randomPlace();
    console.info(`ui-terms place=${place.key} seed=${seed}`);
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place.key,
        startedAt: "2026-02-02",
        minimumPeople: 200,
      }),
      { data: worldCoreData(), modules: [JOBS_MODULE] },
    );
    openLaws(core);
    const api = coreAPI(core);
    const law = lawInForce(api, "unemployment-insurance").governing;
    const terms = unemploymentTerms(
      api,
      core.people.values().next().value!.placeId,
    );
    const recorded = (law?.terms ?? {}) as Record<string, unknown>;
    expect(terms.hasProgram).toBe(
      Boolean(law) && recorded.hasProgram !== false,
    );
    if (!terms.hasProgram) return;
    const maximum = lawInForce(api, "unemployment-weekly-maximum").value;
    if (typeof maximum === "number")
      expect(terms.weeklyMaximumMinor).toBe(maximum * 100);
    if (typeof recorded.maxWeeks === "number")
      expect(terms.maxWeeks).toBe(recorded.maxWeeks);
    expect(terms.weeklyShare).toBeGreaterThan(0.3);
    expect(terms.weeklyShare).toBeLessThan(0.7);
  });
});
