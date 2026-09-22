import { describe, expect, it } from "vitest";

import { candidacyPacks } from "./candidacy-packs";
import { createScenarioWorld } from "./demo";
import { LEXINGTON_DEMO_CONTEXT } from "./demo-jurisdiction-context";
import { makeIsoDate } from "./dates";
import { OFFICE_QUALIFICATION_ROWS } from "./office-qualifications.generated";
import {
  QUALIFICATION_SOURCED_STATE_KEYS,
  assessOfficeQualifications,
  officeQualifications,
  qualificationRuleValue,
  qualificationTemporalApplicability,
  type QualificationOfficeFamily,
  type SourcedQualification,
} from "./office-qualification-rules";

/*
 * No sentence a player reads names where the game got it.
 *
 * The rule is about the sentence, not about the screen. An earlier pass took
 * the citation lists and "Sources and detail" blocks off the panels and left
 * the engine alone, and the engine was where most of it was: a refusal built
 * with `${row.citation}` carries a statute number onto every surface that
 * renders a refusal, and no amount of care on one panel catches it. So this
 * checks what the producers return, for every state whose authorities have
 * been read, and the needles are taken from the records themselves rather
 * than guessed: the exact citations, the authority URLs, the artifact ids and
 * the observation and retrieval dates that are in the data are the strings
 * that must not appear in the prose built from it.
 *
 * What this does NOT forbid: a date the game itself is keeping. The world has
 * its own clock, and the political map's `asOf` is a year of play the player
 * chose to look at. A later sweep that matches on "a date" alone would take
 * those out and the game would stop being able to say when anything happened.
 * The dates banned here are the ones that belong to the research — when a
 * document was observed, when a file was retrieved — and they are banned
 * because they are in these records, not because they are dates.
 *
 * The provenance itself stays in the records. That separation is the point:
 * a reviewer can still see exactly which provision a refusal rests on, on
 * `source`, on `evidenceNote`, and on the diagnostics surfaces. It is only
 * the rendering that stops.
 */

const ROWS = JSON.parse(
  OFFICE_QUALIFICATION_ROWS,
) as readonly SourcedQualification[];

const FAMILIES: readonly QualificationOfficeFamily[] = [
  "UPPER_CHAMBER",
  "LOWER_CHAMBER",
  "UNICAMERAL_CHAMBER",
  "GOVERNOR",
];

/** Dates around every recorded commencement, plus two ordinary starts. */
const DATES: readonly string[] = [
  ...new Set([
    "1900-01-01",
    "2026-01-05",
    "2026-09-09",
    "2026-09-22",
    ...ROWS.flatMap((row) => {
      const validity = row.provisionValidity;
      if (validity.state === "EXACT_INTERVAL") {
        return [
          shiftDay(validity.validFrom, -1),
          validity.validFrom,
          ...(validity.validThrough === null
            ? []
            : [validity.validThrough, shiftDay(validity.validThrough, 1)]),
        ];
      }
      if (validity.state === "CURRENT_OBSERVATION") {
        return [shiftDay(validity.observedOn, -1), validity.observedOn];
      }
      return [];
    }),
  ]),
].sort();

function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Every string in the records that would be a source reference in prose. */
function provenanceNeedles(): readonly string[] {
  const needles = new Set<string>();
  for (const row of ROWS) {
    for (const value of [
      row.citation,
      row.authorityUrl,
      row.researchBatch,
      row.researchArtifactId,
      row.researchArtifactSha256,
      row.sourceRetrievedAt,
      row.sourceStatedVintage,
      row.researchReportedEffectiveDate,
    ]) {
      if (typeof value === "string" && value.trim().length > 2) {
        needles.add(value.trim());
      }
    }
    const validity = row.provisionValidity;
    if (validity.state === "EXACT_INTERVAL") {
      needles.add(validity.basisArtifactId);
      needles.add(validity.basisLocator);
    }
    if (validity.state === "CURRENT_OBSERVATION") {
      needles.add(validity.observedOn);
    }
  }
  needles.delete("");
  return [...needles];
}

/*
 * Words that give the research away without quoting it.
 *
 * "Sourced", "observed in current source text", "the accepted corpus": each
 * one tells the player about the project rather than about the office. A
 * refusal may say the game does not know something. It may not say how the
 * knowing was supposed to have happened.
 */
const RESEARCH_VOCABULARY: readonly RegExp[] = [
  /\bsourced\b/i,
  /\bwas read\b/i,
  /\bhas been read\b/i,
  /\bacquired evidence\b/i,
  /\bthis repository\b/i,
  /\bcorpus\b/i,
  /\bretrieved\b/i,
  /\bsha-?256\b/i,
  /\bartifact\b/i,
  /\bprovenance\b/i,
  /current source text/i,
  /\bpublisher observation\b/i,
];

function offences(text: string, needles: readonly string[]): readonly string[] {
  const found: string[] = [];
  for (const needle of needles) {
    if (text.includes(needle)) found.push(needle);
  }
  for (const pattern of RESEARCH_VOCABULARY) {
    const match = pattern.exec(text);
    if (match) found.push(match[0]);
  }
  return found;
}

describe("player-facing text carries no source reference", () => {
  const needles = provenanceNeedles();

  it("derives its needles from the records rather than guessing", () => {
    expect(needles).toContain("NRS 218A.200");
    expect(needles.length).toBeGreaterThan(40);
    expect(DATES.length).toBeGreaterThan(10);
  });

  it("keeps every temporal refusal free of the provision it rests on", () => {
    const failures: string[] = [];
    for (const row of ROWS) {
      for (const onDate of DATES) {
        const applicability = qualificationTemporalApplicability(row, onDate);
        if (applicability.state !== "UNKNOWN") continue;
        const found = offences(applicability.reason, needles);
        if (found.length > 0) {
          failures.push(
            `${row.stateUsps} ${row.field} on ${onDate}: ${found.join(", ")} — "${applicability.reason}"`,
          );
        }
        // The provenance is kept, unrendered, for whoever reviews the refusal.
        expect(applicability.evidenceNote.length).toBeGreaterThan(0);
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps every assessed requirement free of the provision it rests on", () => {
    const world = createScenarioWorld(
      "player-facing-text-invariant",
      LEXINGTON_DEMO_CONTEXT,
      { peopleCount: 3 },
    );
    const person = world.people[world.personOrder[0]!]!;
    const failures: string[] = [];
    for (const stateKey of QUALIFICATION_SOURCED_STATE_KEYS) {
      for (const officeFamily of FAMILIES) {
        for (const onDate of DATES) {
          for (const residenceSince of [null, makeIsoDate("2000-01-01")]) {
            for (const priorTerms of [null, 0]) {
              const assessments = assessOfficeQualifications({
                person,
                stateJurisdictionKey: stateKey,
                officeFamily,
                stateResidenceSince: residenceSince,
                districtResidenceSince: residenceSince,
                onDate: makeIsoDate(onDate),
                priorTermsInOffice: priorTerms,
              });
              for (const assessment of assessments) {
                const found = offences(assessment.reason, needles);
                if (found.length > 0) {
                  failures.push(
                    `${stateKey} ${officeFamily} ${assessment.field} on ${onDate}: ${found.join(", ")} — "${assessment.reason}"`,
                  );
                }
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps the rule values the packs carry free of it too", () => {
    const failures: string[] = [];
    for (const stateKey of QUALIFICATION_SOURCED_STATE_KEYS) {
      for (const officeFamily of FAMILIES) {
        for (const onDate of DATES) {
          for (const row of officeQualifications(
            stateKey,
            officeFamily,
            makeIsoDate(onDate),
          )) {
            const value = qualificationRuleValue(row, "unread");
            const note = value.kind === "known" ? null : value.note;
            if (note === null) continue;
            const found = offences(note, needles);
            if (found.length > 0) {
              failures.push(
                `${stateKey} ${row.field} on ${onDate}: ${found.join(", ")} — "${note}"`,
              );
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps the authored candidacy packs' own unknown notes free of it", () => {
    const failures: string[] = [];
    for (const pack of candidacyPacks()) {
      for (const office of pack.offices) {
        for (const [field, rule] of Object.entries(office.qualification)) {
          const note =
            rule && typeof rule === "object" && "note" in rule
              ? (rule as { readonly note?: string }).note
              : undefined;
          if (typeof note !== "string") continue;
          const found = offences(note, needles);
          if (found.length > 0) {
            failures.push(
              `${pack.packId} ${office.officeKey} ${field}: ${found.join(", ")} — "${note}"`,
            );
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
