import { describe, expect, it } from "vitest";
import stateRules from "../../data/research/elections/state-initiative-rules.json" with { type: "json" };
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import { resolveMunicipalRecallRule } from "./municipal-ballot-rules";
import {
  municipalRecallRule,
  petitionFilingCheck,
  petitionRule,
  type PetitionKind,
} from "./recall";

const kinds: readonly PetitionKind[] = [
  "recall",
  "local-initiative",
  "protest-referendum",
  "state-initiative",
  "state-referendum",
  "constitutional-initiative",
];
describe("one petition rule gate", () => {
  it("returns complete nonblank rows for all six kinds in all56 places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    expect(Object.keys(stateRules.places)).toHaveLength(56);
    for (const place of places)
      for (const kind of kinds) {
        const row = petitionRule(kind, place.usps);
        expect(row.stateUsps).toBe(place.usps);
        expect(row.kind).toBe(kind);
        expect(row.reason.trim()).not.toBe("");
        expect(row.source.trim()).not.toBe("");
        for (const field of [
          row.threshold,
          row.window,
          row.distribution,
          row.review,
        ])
          expect(Object.keys(field).length).toBeGreaterThan(0);
        expect(JSON.stringify(row)).not.toContain("null,null");
      }
  });
  it("refuses an unauthorized initiative with the row's plain legal reason", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) => !place.kinds["constitutional-initiative"].available,
    )!;
    const row = petitionRule("constitutional-initiative", sample[0]);
    expect(row.basis).toBe("primary-text-read");
    expect(petitionFilingCheck(row)).toEqual({
      allowed: false,
      reason: sample[1].kinds["constitutional-initiative"].reason,
    });
    expect(row.reason).toContain("legislature");
    expect(row.reason).not.toContain("NOT_ESTABLISHED");
  });
  it("keeps unread states operational with explicit median estimate provenance", () => {
    const sample = Object.entries(stateRules.places).find(
      ([, place]) =>
        place.kinds["state-initiative"].basis === "estimated-from-average",
    )!;
    for (const kind of [
      "state-initiative",
      "state-referendum",
      "constitutional-initiative",
    ] as const) {
      const row = petitionRule(kind, sample[0]);
      expect(row.available).toBe(true);
      expect(row.reason).toContain("ESTIMATED FROM AVERAGE");
      expect(row.threshold.percent).toBeGreaterThan(0);
      expect(row.window.days).toBeGreaterThan(0);
      expect(petitionFilingCheck(row).allowed).toBe(true);
    }
  });
  it("retains each town recall resolver's availability, threshold and clock", () => {
    let checked = 0;
    for (const state of lifePlaceStateIdentities()) {
      const place = searchLifePlaces("", 1000, {
        stateJurisdictionKey: state.jurisdictionKey,
      }).find((row) => municipalGovernmentForLifePlace(row));
      if (!place) continue;
      const government = municipalGovernmentForLifePlace(place)!;
      const before = municipalRecallRule(government.key);
      const row = petitionRule("recall", state.usps, {
        governmentKey: government.key,
      });
      expect(row.available).toBe(before.available);
      if (before.available) {
        expect(row.window.days).toBe(before.circulationDays);
        expect(row.window.basis).toBe(before.circulationBasis);
        expect(row.basis).toBe(before.doctrineBasis);
        if (before.threshold) expect(row.threshold).toEqual(before.threshold);
      } else
        expect(petitionFilingCheck(row)).toEqual({
          allowed: false,
          reason: before.reason,
        });
      expect(resolveMunicipalRecallRule(state.usps).stateUsps).toBe(state.usps);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
