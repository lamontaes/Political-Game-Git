import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  countyGovernmentUnit,
  governmentUnitsForState,
} from "../government-units";
import { lifePlaceByKey } from "../life-places";
import {
  chiefExecutiveBaseline,
  chiefExecutiveBaselineRows,
  CHIEF_EXECUTIVE_BASELINE_META,
} from "./chief-executive-baseline";
import {
  DISTRICT_OF_COLUMBIA_COUNTY_GEOID,
  DISTRICT_OF_COLUMBIA_OFFICE_KEY,
  DISTRICT_OF_COLUMBIA_PLACE_GEOID,
  DISTRICT_OF_COLUMBIA_USPS,
  districtOfColumbiaGovernmentUnit,
  districtOfColumbiaJurisdiction,
} from "./district-of-columbia";
import { governingJurisdictionIdFor } from "./government-jurisdiction";
import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  US_STATE_USPS,
  stateExecutiveIdentity,
} from "./state-executive-candidacy-packs";
import {
  stateExecutiveTermRule,
  stateExecutiveTermRuleNote,
  termRuleBasis,
} from "./state-executive-term-rules";
import { stateExecutiveOffice } from "./state-executives";

const RESEARCH_PATH =
  "data/research/nationwide1/chief-executive-baseline-51.json";

describe("NATIONWIDE1 chief-executive baseline", () => {
  it("carries one row for each state and for the District, from the research file", () => {
    const research = JSON.parse(
      readFileSync(resolve(process.cwd(), RESEARCH_PATH), "utf-8"),
    ) as { readonly rows: readonly { readonly key: string }[] };
    const rows = chiefExecutiveBaselineRows();
    expect(rows).toHaveLength(51);
    expect(new Set(rows.map((row) => row.key)).size).toBe(51);
    expect([...rows].map((row) => row.key).sort()).toEqual(
      [...research.rows].map((row) => row.key).sort(),
    );
    expect([...US_STATE_USPS, DISTRICT_OF_COLUMBIA_USPS].sort()).toEqual(
      [...rows].map((row) => row.key).sort(),
    );
  });

  it("is research, and says so rather than claiming admitted law", () => {
    expect(CHIEF_EXECUTIVE_BASELINE_META.runtimeAdmitted).toBe(false);
    expect(CHIEF_EXECUTIVE_BASELINE_META.excerptRetrieved).toBe(false);
    for (const row of chiefExecutiveBaselineRows()) {
      expect(row.source.startsWith("https://")).toBe(true);
      expect(row.sourceLocator.length).toBeGreaterThan(0);
      expect(row.limits.length).toBeGreaterThan(0);
    }
  });

  it("gives the District a mayor, and every state a governor", () => {
    const dc = chiefExecutiveBaseline(DISTRICT_OF_COLUMBIA_USPS)!;
    expect(dc.officeKind).toBe("district-mayor");
    expect(dc.kind).toBe("federal-district");
    for (const usps of US_STATE_USPS)
      expect(chiefExecutiveBaseline(usps)!.officeKind).toBe("state-governor");
  });
});

describe("the game profile, calibrated by that research", () => {
  it("runs two-year terms in New Hampshire and Vermont, and four elsewhere", () => {
    for (const usps of ["NH", "VT"]) {
      const rule = stateExecutiveTermRule(usps)!;
      expect(rule.termYears).toBe(2);
      // An office is never left electing less often than its term ends.
      expect(rule.election.cycleYears).toBe(2);
    }
    expect(stateExecutiveTermRule("KY")!.termYears).toBe(4);
  });

  it("stays a disclosed game profile, with the research beside it and not inside it", () => {
    const rule = stateExecutiveTermRule("NH")!;
    expect(termRuleBasis(rule)).toBe("game-profile");
    expect(rule.basis.termYears).toBe("game-profile");
    expect(rule.sources).toHaveLength(0);
    expect(rule.calibration?.row.key).toBe("NH");
    const note = stateExecutiveTermRuleNote(rule);
    expect(note).toContain("2-year terms");
    expect(note).toContain(
      "not this jurisdiction's law as the game has read it",
    );
  });

  it("leaves a verified rule alone", () => {
    const wa = stateExecutiveTermRule("WA")!;
    expect(termRuleBasis(wa)).toBe("verified");
    expect(wa.calibration).toBeNull();
    expect(wa.sources.length).toBeGreaterThan(0);
    expect(stateExecutiveTermRuleNote(wa)).toContain("RCW 43.01.010");
  });

  it("has no rule for a jurisdiction that is neither a state nor the District", () => {
    expect(stateExecutiveTermRule("PR")).toBeNull();
  });
});

describe("the District of Columbia is one government, counted separately", () => {
  it("keeps the fifty-state lists at fifty and adds itself beside them", () => {
    expect(US_STATE_USPS).toHaveLength(50);
    expect([...US_STATE_USPS]).not.toContain(DISTRICT_OF_COLUMBIA_USPS);
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(51);
    expect([...CHIEF_EXECUTIVE_JURISDICTIONS]).toContain(
      DISTRICT_OF_COLUMBIA_USPS,
    );
  });

  it("has a mayor, not a governor", () => {
    const identity = stateExecutiveIdentity(DISTRICT_OF_COLUMBIA_USPS)!;
    expect(identity.title).toBe("Mayor");
    expect(identity.displayName).toBe("Mayor of the District of Columbia");
    expect(identity.officeKey).toBe(DISTRICT_OF_COLUMBIA_OFFICE_KEY);
    expect(identity.displayName).not.toContain("Governor");
  });

  it("has exactly one general-purpose government and no county government", () => {
    const units = governmentUnitsForState(DISTRICT_OF_COLUMBIA_USPS);
    expect(units).toHaveLength(1);
    expect(units[0]!.placeGeoid).toBe(DISTRICT_OF_COLUMBIA_PLACE_GEOID);
    expect(districtOfColumbiaGovernmentUnit()!.id).toBe(units[0]!.id);
    expect(countyGovernmentUnit(DISTRICT_OF_COLUMBIA_COUNTY_GEOID)).toBeNull();
  });

  it("names one jurisdiction district-wide and citywide, never two", () => {
    const unit = districtOfColumbiaGovernmentUnit()!;
    const districtWide = governingJurisdictionIdFor({
      kind: "state",
      stateUsps: DISTRICT_OF_COLUMBIA_USPS,
    });
    const cityWide = governingJurisdictionIdFor({ kind: "local", unit });
    expect(districtWide).toBe(cityWide);
    expect(districtWide).toBe(districtOfColumbiaJurisdiction()!.id);
    expect(districtWide).toBe(
      lifePlaceByKey(DISTRICT_OF_COLUMBIA_PLACE_GEOID)!.context.jurisdiction.id,
    );
  });

  it("compiles an office on that one jurisdiction", () => {
    const office = stateExecutiveOffice(DISTRICT_OF_COLUMBIA_USPS)!;
    expect(office.displayName).toBe("Mayor of the District of Columbia");
    expect(office.jurisdictionId).toBe(districtOfColumbiaJurisdiction()!.id);
    expect(office.sources[0]).toContain("code.dccouncil.gov");
  });
});
