import { makeIsoDate } from "../dates";
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
  stateExecutiveTermRuleProvenance,
  termDatesAfterElection,
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
    // The research still travels with the rule, and still says what it is.
    expect(rule.calibration?.disclosure).toContain(
      "not this jurisdiction's law as the game has read it",
    );
    // What the player reads is the term and nothing about where it came from.
    const note = stateExecutiveTermRuleNote(rule);
    expect(note).toContain("2 years");
    expect(note).not.toMatch(/research|checked on|game's own|law/i);
  });

  it("leaves a verified rule alone", () => {
    const wa = stateExecutiveTermRule("WA")!;
    expect(termRuleBasis(wa)).toBe("verified");
    expect(wa.calibration).toBeNull();
    expect(wa.sources.length).toBeGreaterThan(0);
    // A citation is a record, not a player-facing sentence. The player is told
    // Washington's real commencement; they are not told which statute says so.
    const note = stateExecutiveTermRuleNote(wa);
    expect(note).toContain("the Wednesday after the second Monday of January");
    expect(note).not.toContain("RCW");
    expect(stateExecutiveTermRuleProvenance(wa)).toContain("RCW 43.01.010");
  });

  it("dates the District's Mayor from the District's own Code, not the profile", () => {
    const dc = stateExecutiveTermRule("DC")!;
    expect(termRuleBasis(dc)).toBe("verified");
    expect(dc.calibration).toBeNull();
    expect(dc.sources.map((s) => s.citation)).toEqual([
      "D.C. Code \u00a7 1-204.21(b)",
    ]);
    expect(dc.sources[0]!.excerpt).toContain(
      "beginning at noon on January 2nd of the year following his election",
    );
    // The instrument's date, not the game profile's first Monday: a Mayor
    // elected in November 2026 takes office on January 2nd, 2027.
    const term = termDatesAfterElection(dc, makeIsoDate("2026-11-03"));
    expect(term.startsAt).toBe("2027-01-02");
    expect(term.endsAt).toBe("2031-01-02");
  });

  it("verifies Vermont per field, leaving the date its constitution does not fix", () => {
    const vt = stateExecutiveTermRule("VT")!;
    expect(vt.basis.termYears).toBe("verified");
    expect(vt.basis.election).toBe("verified");
    // Chapter II runs the term from when the Governor is "chosen and
    // qualified" and names no calendar day, so this field stays the profile's
    // rather than becoming a day nobody read.
    expect(vt.basis.commencement).toBe("game-profile");
    expect(termRuleBasis(vt)).toBe("game-profile");
    expect(vt.termYears).toBe(2);
    expect(vt.election.cycleYears).toBe(2);
  });

  it("has not compiled Puerto Rico's Governor, and invents nothing in its place", () => {
    // Puerto Rico elects a Governor. Nothing here says otherwise: this branch
    // has not compiled that office, so the rule is absent, and an absent
    // answer is not the claim that the office does not exist. The factual
    // compilation is parked and approved; when it lands it replaces this
    // absence outright. What must keep holding until then is that a territory
    // is never handed a manufactured US-state governorship to fill the hole.
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
