import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { SeededRng } from "../../simulation/rng";
import { makeIsoDate } from "../../simulation/dates";
import * as legacy from "../../simulation/office-qualification-rules";
import * as candidate from "../../simulation/candidate-qualification";
import * as profile from "../../simulation/office-qualification-profile";
import { resolveRequiredSignatures as legacySignatures } from "../../simulation/municipal-election-rules";
import {
  assessOfficeQualifications,
  qualificationTemporalApplicability,
  durationMonths,
} from "./qualification";
import {
  assessCandidateQualification,
  ruleSetApplicableOn,
} from "./candidate-qualification";
import {
  modalQualification,
  qualificationRange,
} from "./qualification-profile";
import { resolveRequiredSignatures } from "./signatures";

const places = Object.keys(STATES);
const families: readonly legacy.QualificationOfficeFamily[] = [
  "GOVERNOR",
  "LIEUTENANT_GOVERNOR",
  "ATTORNEY_GENERAL",
  "SECRETARY_OF_STATE",
  "UPPER_CHAMBER",
  "LOWER_CHAMBER",
  "UNICAMERAL_CHAMBER",
];
function decisions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decisions);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !["reason", "evidenceNote", "label"].includes(key))
        .map(([key, v]) => [key, decisions(v)]),
    );
  return value;
}
const onDate = makeIsoDate("2026-10-11");
function personInput(
  place: string,
  birthDate: string,
): legacy.QualificationAssessmentInput {
  return {
    person: {
      birthDate: makeIsoDate(birthDate),
    } as legacy.QualificationAssessmentInput["person"],
    stateJurisdictionKey: `US-${place}`,
    officeFamily: "LOWER_CHAMBER",
    stateResidenceSince: makeIsoDate("2020-01-31"),
    districtResidenceSince: makeIsoDate("2026-04-11"),
    citizenSince: makeIsoDate("2000-02-29"),
    citizenStatus: true,
    onDate,
    priorTermsInOffice: 0,
  };
}
describe("P14 offices: identical qualification and filing facts in all 56 places", () => {
  it("uses all jurisdiction identities", () => expect(places).toHaveLength(56));
  for (const place of places) {
    it(`${place}: dated qualification fields and missing facts match legacy`, () => {
      for (const officeFamily of families)
        for (const birthDate of ["2008-10-11", "2008-10-12", "1980-02-29"])
          for (const citizenStatus of [true, false, null]) {
            const input = {
              ...personInput(place, birthDate),
              officeFamily,
              citizenStatus,
            };
            const rows = legacy.officeQualifications(
              input.stateJurisdictionKey,
              officeFamily,
              onDate,
            );
            expect(decisions(assessOfficeQualifications(input, rows))).toEqual(
              decisions(legacy.assessOfficeQualifications(input)),
            );
            const missing = {
              ...input,
              stateResidenceSince: null,
              districtResidenceSince: null,
              citizenSince: null,
              priorTermsInOffice: null,
            };
            expect(
              decisions(assessOfficeQualifications(missing, rows)),
            ).toEqual(decisions(legacy.assessOfficeQualifications(missing)));
          }
    });
    it(`${place}: candidate rule states, time bounds and exact age/residence limits match`, () => {
      const source = {
        ...candidate.CANDIDATE_QUALIFICATION_RULE_SETS[0]!.source,
        provisionEffectiveOn: makeIsoDate("2026-01-01"),
        observedCurrentOn: onDate,
      };
      const known = (value: number) => ({
        state: "KNOWN" as const,
        value,
        source,
      });
      for (const minimumAge of [
        known(18),
        { state: "UNKNOWN" as const, reason: "missing" },
        { state: "NO_REQUIREMENT_FOUND" as const, source },
        { state: "NOT_APPLICABLE" as const, reason: "not applicable" },
      ]) {
        const rules: candidate.CandidateQualificationRuleSet = {
          ...candidate.CANDIDATE_QUALIFICATION_RULE_SETS[0]!,
          jurisdictionKey: `US-${place}`,
          ruleSetId: `${place}:qualification`,
          source,
          minimumAge,
          stateResidenceYears: known(1),
          districtResidenceYears: known(0),
        };
        for (const date of ["2025-12-31", "2026-01-01", "2026-10-11"])
          expect(
            decisions(ruleSetApplicableOn(rules, makeIsoDate(date))),
          ).toEqual(
            decisions(candidate.ruleSetApplicableOn(rules, makeIsoDate(date))),
          );
        for (const birthDate of ["2008-10-11", "2008-10-12", "2008-02-29"])
          for (const since of [
            makeIsoDate("2025-10-11"),
            makeIsoDate("2025-10-12"),
            null,
          ]) {
            const input = {
              birthDate: makeIsoDate(birthDate),
              onDate,
              stateResidenceSince: since,
              districtResidenceSince: since,
              districtIsUnknown: true,
            };
            expect(
              decisions(assessCandidateQualification(rules, input)),
            ).toEqual(
              decisions(candidate.assessCandidateQualification(rules, input)),
            );
          }
      }
    });
    it(`${place}: modal profiles preserve distinct-state counting and lower-value ties`, () => {
      const rows = legacy.qualificationRows();
      for (const family of families)
        for (const field of [
          "MINIMUM_AGE",
          "STATE_RESIDENCE",
          "DISTRICT_RESIDENCE",
        ] as const) {
          expect(modalQualification(field, family, rows)).toEqual(
            profile.modalQualification(field, family),
          );
          expect(qualificationRange(field, family, rows)).toEqual(
            profile.qualificationRange(field, family),
          );
        }
    });
    it(`${place}: exact signatures, zero base, fractional percentages and floating tolerance match`, () => {
      for (const percent of [0.1, 10, 25, 100])
        for (const baseCount of [0, 1, 3, 101, 1000]) {
          const threshold = { percent, base: "registered-voters" as const };
          expect(resolveRequiredSignatures(threshold, baseCount)).toBe(
            legacySignatures(threshold, baseCount),
          );
        }
    });
  }
  it("retains known temporal intervals, observation fallback and duration tokens", () => {
    for (const row of legacy.qualificationRows()) {
      for (const date of ["1900-01-01", "2026-10-11", "2099-12-31"])
        expect(qualificationTemporalApplicability(row, date).state).toBe(
          legacy.qualificationTemporalApplicability(row, date).state,
        );
      for (const value of [
        0,
        1,
        "6 months",
        "1 year",
        "RESIDENT_2_YEARS",
        "not a duration",
        null,
      ])
        expect(decisions(durationMonths({ ...row, value }))).toEqual(
          decisions(legacy.durationMonths({ ...row, value })),
        );
    }
  });
  it("preserves invalid signature refusals", () => {
    for (const percent of [0, -1, 101, NaN, Infinity])
      expect(() =>
        resolveRequiredSignatures({ percent, base: "registered-voters" }, 1),
      ).toThrow();
    for (const base of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        resolveRequiredSignatures(
          { percent: 10, base: "registered-voters" },
          base,
        ),
      ).toThrow();
  });
  it("draws a filing/qualification place from all 56 and names the seed", () => {
    const seed = "rules2-offices-20261011";
    const place = new SeededRng(seed).pick(places);
    console.info({ seed, place });
    const input = personInput(place, "2008-10-11");
    const rows = legacy.officeQualifications(
      input.stateJurisdictionKey,
      input.officeFamily,
      onDate,
    );
    expect(decisions(assessOfficeQualifications(input, rows))).toEqual(
      decisions(legacy.assessOfficeQualifications(input)),
    );
  });
});

import { filingWindowOpens as legacyOpens } from "../../simulation/nominations/field-entry";
import { seatTermWindow as legacyTerm } from "../../simulation/living-world/congress-seats";
import { filingWindowOpens } from "./filing-window";
import { seatTermWindow } from "./seat-term";
describe("filing opening and selected seat term references across all 56 identities", () => {
  for (const place of places)
    it(`${place}: filing years and inclusive commencement match`, () => {
      for (const year of [2024, 2025, 2026, 2028, 2030])
        expect(filingWindowOpens(year)).toBe(legacyOpens(year));
      for (const [chamberKey, senateClass, referenceStart, years] of [
        ["us-house", null, "2025-01-03", 2],
        ["us-senate", 1, "2025-01-03", 6],
        ["us-senate", 2, "2021-01-03", 6],
        ["us-senate", 3, "2023-01-03", 6],
      ] as const)
        for (const date of [
          "2021-01-02",
          "2021-01-03",
          "2025-01-02",
          "2025-01-03",
          "2027-01-03",
        ]) {
          // An identity exercises the formula; it asserts no seat exists in this place.
          const seat = {
            seatKey: `${place}:seat`,
            chamberKey,
            senateClass,
            stateUsps: place,
            district: null,
          };
          expect(seatTermWindow({ referenceStart, years }, date)).toEqual(
            legacyTerm(seat, makeIsoDate(date)),
          );
        }
    });
});
