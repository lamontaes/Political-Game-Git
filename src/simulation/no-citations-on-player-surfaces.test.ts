import { describe, expect, it } from "vitest";

import {
  QUALIFICATION_SOURCED_STATE_KEYS,
  assessOfficeQualifications,
  officeQualifications,
  qualificationTemporalApplicability,
} from "./office-qualification-rules";
import type { QualificationOfficeFamily } from "./office-qualification-rules";
import type { Person } from "./types";

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
    officeQualifications(stateKey, family, "2026-01-05"),
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
          for (const since of ["1990-01-05", null] as const) {
            const assessments = assessOfficeQualifications({
              stateJurisdictionKey: stateKey,
              officeFamily: family,
              person: personAged(age),
              stateResidenceSince: since,
              districtResidenceSince: since,
              onDate: "2026-01-05",
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
    for (const row of ALL_ROWS) {
      for (const onDate of ["1900-01-05", "1970-01-05", "2026-01-05"]) {
        const applicability = qualificationTemporalApplicability(row, onDate);
        if (applicability.state === "UNKNOWN") {
          if (CITATION.test(applicability.reason)) {
            offenders.push(`${row.stateUsps} ${row.field}: ${applicability.reason}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the citation in the record, which is the point", () => {
    // Removing the citation from the sentence must not remove it from the
    // evidence. If this ever fails, the fix went too far.
    const rows = officeQualifications(STATE_KEYS[0]!, "LOWER_CHAMBER", "2026-01-05");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.citation.length).toBeGreaterThan(0);
    }
  });
});
