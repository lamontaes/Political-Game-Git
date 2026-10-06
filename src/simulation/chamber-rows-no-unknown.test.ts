import { describe, expect, it } from "vitest";

import { US_CONGRESS_RULE_PACK } from "./congress-rule-pack";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { seatsForChamber } from "./legislature-game-profile";
import {
  assertRulePackIntegrity,
  type LegislativeRulePack,
  type RuleValue,
} from "./legislature-rules";

function ruleValues(node: unknown): RuleValue<unknown>[] {
  const values: RuleValue<unknown>[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      const kind = (value as { readonly kind?: unknown }).kind;
      if (kind === "known" || kind === "unknown" || kind === "not-applicable")
        values.push(value as RuleValue<unknown>);
      Object.values(value).forEach(visit);
    }
  };
  visit(node);
  return values;
}

function expectBodyRows(pack: LegislativeRulePack): void {
  expect(pack.chambers.length, pack.packId).toBeGreaterThan(0);
  expect(pack.chamberOrder).toHaveLength(pack.chambers.length);
  for (const chamber of pack.chambers) {
    expect(
      chamber.seats.kind,
      `${pack.packId}/${chamber.chamberKey} seats`,
    ).toMatch(/^(known|unknown)$/);
    expect(
      chamber.quorum.kind,
      `${pack.packId}/${chamber.chamberKey} quorum`,
    ).toBe("known");
    expect(
      chamber.floorStages.length,
      `${pack.packId}/${chamber.chamberKey} floor`,
    ).toBeGreaterThan(0);
    for (const stage of chamber.floorStages)
      expect(stage.vote.kind).toBe("known");
    for (const committee of chamber.committees) {
      expect(committee.appointedMembers).toBeGreaterThan(0);
      expect(committee.reportThreshold.numerator).toBeGreaterThan(0);
      expect(committee.reportThreshold.denominatorParts).toBeGreaterThan(0);
    }
  }
  expect(pack.session.adjournmentRule.kind).toMatch(
    /^(known|unknown|not-applicable)$/,
  );
  expect(pack.session.measuresDieAtAdjournment.kind).toMatch(
    /^(known|unknown|not-applicable)$/,
  );
}

describe("per-level legislative body rows", () => {
  it("keeps a complete chamber and session row set in every compiled state and federal pack", () => {
    const packs = [...LEGISLATIVE_RULE_PACKS, US_CONGRESS_RULE_PACK];
    expect(LEGISLATIVE_RULE_PACKS).toHaveLength(9);
    for (const pack of packs) {
      expect(() => assertRulePackIntegrity(pack), pack.packId).not.toThrow();
      expectBodyRows(pack);
    }
  });

  it("keeps unresolved law distinct from sourced and explicitly estimated values", () => {
    const values = [...LEGISLATIVE_RULE_PACKS, US_CONGRESS_RULE_PACK].flatMap(
      ruleValues,
    );
    const unknowns = values.filter((value) => value.kind === "unknown");
    expect(unknowns.length).toBeGreaterThan(0);
    for (const value of unknowns) {
      if (value.kind !== "unknown") continue;
      expect(value.note.trim()).not.toBe("");
      expect("value" in value).toBe(false);
      expect("source" in value).toBe(false);
    }

    for (const value of values) {
      if (value.kind !== "known") continue;
      const note = value.source.note ?? "";
      if (note.includes("ESTIMATED FROM AVERAGE")) {
        expect(note).toMatch(/basis|same|similar|average|compiled|class/i);
      }
    }
  });

  it("does not promote sourced current chamber counts into formal seat rules", () => {
    const cases = [
      { jurisdiction: "US-KY", chamberKey: "house", seats: 100 },
      { jurisdiction: "US-KY", chamberKey: "senate", seats: 38 },
      { jurisdiction: "US-NV", chamberKey: "assembly", seats: 42 },
      { jurisdiction: "US-NV", chamberKey: "senate", seats: 21 },
    ];
    for (const row of cases) {
      const pack = LEGISLATIVE_RULE_PACKS.find(
        (candidate) => candidate.jurisdictionKey === row.jurisdiction,
      )!;
      const formalSeats = pack.chambers.find(
        (chamber) => chamber.chamberKey === row.chamberKey,
      )!.seats;
      expect(formalSeats.kind).toBe("unknown");
      if (formalSeats.kind === "unknown") {
        expect("value" in formalSeats).toBe(false);
        expect("source" in formalSeats).toBe(false);
      }
      expect(seatsForChamber(pack, row.chamberKey)).toEqual({
        seats: row.seats,
        basis: "researched",
      });
    }
  });
});
