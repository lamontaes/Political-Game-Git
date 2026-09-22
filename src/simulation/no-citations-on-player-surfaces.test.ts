import { describe, expect, it } from "vitest";

import {
  QUALIFICATION_SOURCED_STATE_KEYS,
  assessOfficeQualifications,
  officeQualifications,
  qualificationTemporalApplicability,
} from "./office-qualification-rules";
import type { QualificationOfficeFamily } from "./office-qualification-rules";
import type { Person } from "./types";
import { makeIsoDate } from "./dates";
import { allGovernmentUnits } from "./government-units";
import {
  resolveCapability,
  supplementalQualificationOfficeKeys,
} from "./rule-capability-resolver";
import { lifePlaceStateIdentities } from "./life-places";

/*
 * lamontae's rule, in his own words: "there should be NO references to sources
 * in the game. just display the info. this is player facing."
 *
 * A citation is provenance. Provenance belongs in the record — every
 * assessment carries its `source` row, which holds the citation, the
 * authority, the URL and the retrieval — and never in the sentence a player
 * reads.
 *
 * This was found by probing a refusal rather than by reading the code: an
 * ordinary character in Columbus was told "Ohio Const. art. XV, § 4 requires
 * that the candidate is a qualified elector". The broken half of that same
 * sentence ("requires true") had already been repaired once, and the citation
 * was left standing, which is how the quieter half of a two-part defect
 * survives a fix.
 */

/** Anything that looks like a legal citation in a sentence. */
const CITATION = new RegExp(
  [
    "Const\\.",
    "Constitution",
    "\\bart\\.",
    "\\bArticle\\b",
    "§",
    "\\bsec\\.",
    "\\bstat\\.",
    "\\bStatutes?\\b",
    "\\bRev\\.",
    "\\bAnn\\.",
    "\\bU\\.S\\.C\\.",
    "\\bch\\.",
    "https?://",
  ].join("|"),
  "i",
);

function personAged(years: number): Person {
  const birthYear = 2026 - years;
  return {
    id: "person-under-test",
    birthDate: `${birthYear}-01-05`,
  } as unknown as Person;
}

const FAMILIES: readonly QualificationOfficeFamily[] = [
  "GOVERNOR",
  "LIEUTENANT_GOVERNOR",
  "ATTORNEY_GENERAL",
  "SECRETARY_OF_STATE",
  "UPPER_CHAMBER",
  "LOWER_CHAMBER",
  "UNICAMERAL_CHAMBER",
];

const STATE_KEYS = QUALIFICATION_SOURCED_STATE_KEYS;

/** Every row the corpus carries, reached through the module's own accessor. */
const ALL_ROWS = STATE_KEYS.flatMap((stateKey) =>
  FAMILIES.flatMap((family) =>
    officeQualifications(stateKey, family, makeIsoDate("2026-01-05")),
  ),
);

describe("no player-facing sentence carries a citation", () => {
  it("has a corpus to check, so a silent zero cannot pass this file", () => {
    expect(STATE_KEYS.length).toBeGreaterThan(0);
    expect(ALL_ROWS.length).toBeGreaterThan(0);
  });

  it("holds across every state, office and age in the corpus", () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const stateKey of STATE_KEYS) {
      for (const family of FAMILIES) {
        for (const age of [18, 21, 26, 31, 40, 66]) {
          for (const since of [makeIsoDate("1990-01-05"), null] as const) {
            const assessments = assessOfficeQualifications({
              stateJurisdictionKey: stateKey,
              officeFamily: family,
              person: personAged(age),
              stateResidenceSince: since,
              districtResidenceSince: since,
              onDate: makeIsoDate("2026-01-05"),
              priorTermsInOffice: 0,
            });
            for (const assessment of assessments) {
              checked += 1;
              if (CITATION.test(assessment.reason)) {
                offenders.push(
                  `${stateKey} ${family} ${assessment.field}: ${assessment.reason}`,
                );
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("holds for a date the rule is not established on", () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const row of ALL_ROWS) {
      for (const onDate of ["1900-01-05", "1970-01-05", "2026-01-05"].map(
        makeIsoDate,
      )) {
        const applicability = qualificationTemporalApplicability(row, onDate);
        if (applicability.state === "UNKNOWN") {
          checked += 1;
          if (CITATION.test(applicability.reason)) {
            offenders.push(
              `${row.stateUsps} ${row.field}: ${applicability.reason}`,
            );
          }
        }
      }
    }
    // An empty sample passes every assertion below it. This is the branch the
    // test exists for, so reaching it zero times is a failure, not a pass.
    expect(checked).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("keeps the citation in the record, which is the point", () => {
    // Removing the citation from the sentence must not remove it from the
    // evidence. If this ever fails, the fix went too far.
    const rows = officeQualifications(
      STATE_KEYS[0]!,
      "LOWER_CHAMBER",
      makeIsoDate("2026-01-05"),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.citation.length).toBeGreaterThan(0);
    }
  });
});

/*
 * The resolver was invisible to this file until 2026-09-22, and the reason is
 * worth keeping next to the fix.
 *
 * This test had no file axis at all. It imported four symbols from one module
 * and swept states, offices, ages and dates through them — exhaustive in four
 * dimensions and hand-authored in the fifth. `rule-capability-resolver.ts`
 * could not have been reached by any input, because nothing here ever named a
 * second module. It is named like plumbing and it writes sentences a player
 * reads, which is exactly the shape that survives a net drawn this way.
 *
 * Adding it below closes this instance and not the class. The producers this
 * file knows about are:
 *
 *   qualificationTemporalApplicability, assessOfficeQualifications,
 *   qualificationRuleValue, candidacyPacks, resolveCapability
 *
 * Five known producers, completeness unproven. If there is a sixth, the same
 * hole is open and nothing here can report it. The durable fix is that a test
 * enumerating producers must DERIVE that list rather than author it — walk the
 * module's exports for functions returning a `reason`, or assert the covered
 * count against a declared total — so that a miss becomes a visible gap
 * instead of a silent hole.
 */

/** An internal identifier that must never reach a sentence. */
const INTERNAL_ID = /US-[A-Z]{2}\b|gus2025:|\bPID6\b/;

/**
 * Every jurisdiction the game seats, taken from the game's own list rather
 * than typed here. It is 52 — the fifty states, DC and Puerto Rico.
 */
const JURISDICTIONS = lifePlaceStateIdentities().map(
  (identity) => identity.usps,
);

describe("the capability resolver refuses without naming its source", () => {
  const DATES = [
    makeIsoDate("1900-01-05"),
    makeIsoDate("1970-01-05"),
    makeIsoDate("2026-01-05"),
  ];
  const ACTIONS = [
    "inspect",
    "stand-for-office",
    "enter-office-term",
    "introduce-ordinance",
    "pass-ordinance",
    "pass-appropriation",
  ] as const;

  /*
   * Office keys matter, and this is the sharper version of the lesson this
   * file already carries. The first version of this block called
   * resolveCapability only with `officeKey: null` — and the resolver takes a
   * whole branch, with its own sentences, only when it IS given an office
   * key. So the producer was missed once by not being called at all, and
   * missed again by being called down one path.
   *
   * Widening a net is not the same as widening it in the right dimension. A
   * count of producers covered says nothing about the argument space that
   * selects their branches.
   */
  const OFFICE_KEYS: readonly (string | null)[] = [
    null,
    ...supplementalQualificationOfficeKeys(),
  ];

  /** Each sentence the resolver can hand a player, with a label to report. */
  function sentencesOf(resolution: {
    refusal: string | null;
    fields: readonly { field: string; reason: string | null }[];
  }): [string, string][] {
    const out: [string, string][] = [];
    if (resolution.refusal) out.push(["refusal", resolution.refusal]);
    for (const field of resolution.fields) {
      if (field.reason) out.push([field.field, field.reason]);
    }
    return out;
  }

  it("has scopes to check, so a silent zero cannot pass this block", () => {
    // Derived, not authored. The first version of this block walked
    // US_STATE_NAMES, which is the fifty states WITH GOVERNORS and says so in
    // its own comment. The game's jurisdictions are 52: the fifty states, the
    // District of Columbia and Puerto Rico. Two of them were outside every
    // net in the repository, and adding DC by hand would have left Puerto
    // Rico exactly as unswept while looking complete.
    expect(JURISDICTIONS.length).toBeGreaterThanOrEqual(51);
    expect(JURISDICTIONS).toContain("DC");
    expect(allGovernmentUnits().length).toBeGreaterThan(0);
  });

  it("holds for every jurisdiction, action and date", () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const usps of JURISDICTIONS) {
      for (const action of ACTIONS) {
        for (const onDate of DATES) {
          for (const officeKey of OFFICE_KEYS) {
            const resolution = resolveCapability({
              scope: { kind: "state", stateUsps: usps },
              officeKey,
              action,
              onDate,
            });
            for (const [where, sentence] of sentencesOf(resolution)) {
              checked += 1;
              if (CITATION.test(sentence) || INTERNAL_ID.test(sentence)) {
                offenders.push(
                  `${usps} ${action} ${officeKey ?? "no-office"} ${where}: ${sentence}`,
                );
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("holds for a wide sample of real local governments", () => {
    const units = allGovernmentUnits();
    // Every 97th unit — a prime stride, so the sample is not one state.
    const sample = units.filter((_unit, index) => index % 97 === 0);
    expect(sample.length).toBeGreaterThan(20);
    const offenders: string[] = [];
    let checked = 0;
    for (const unit of sample) {
      for (const action of ACTIONS) {
        for (const officeKey of OFFICE_KEYS) {
          const resolution = resolveCapability({
            scope: { kind: "local", governmentUnitId: unit.id },
            officeKey,
            action,
            onDate: DATES[2]!,
          });
          for (const [where, sentence] of sentencesOf(resolution)) {
            checked += 1;
            if (CITATION.test(sentence) || INTERNAL_ID.test(sentence)) {
              offenders.push(
                `${unit.id} ${action} ${officeKey ?? "no-office"} ${where}: ${sentence}`,
              );
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
