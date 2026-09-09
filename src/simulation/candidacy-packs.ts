import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { knownRule, notApplicableRule, unknownRule } from "./legislature-rules";
import type {
  FormalSeatCount,
  LegislativeRulePack,
  RuleValue,
} from "./legislature-rules";
import type { ElectiveOfficeRef } from "./types";
import { candidateQualificationRuleSet } from "./candidate-qualification";
import {
  OFFICE_QUALIFICATIONS_META,
  officeFamilyForChamberKey,
  officeQualification as compiledOfficeQualification,
  officeQualifications as compiledOfficeQualifications,
  qualificationSourceRef,
} from "./office-qualification-rules";
import type {
  QualificationOfficeFamily,
  SourcedQualification,
} from "./office-qualification-rules";

/**
 * Which offices exist to be run for, and on whose authority.
 *
 * A leaf on purpose. This module reads the accepted legislative rule packs and
 * nothing else, so the integrity pass — which runs inside `world.ts` — can
 * check that a campaign cites a real office without dragging the place registry
 * and the scenario builder into a cycle around the world module. Who may stand,
 * and where, lives next door in `candidacy.ts`, which is free to know about
 * places because nothing in the world's own import graph needs it.
 *
 * The game now has a bounded candidate-qualification corpus. It is joined to
 * accepted legislative rule packs by exact jurisdiction and chamber keys; no
 * display name decides which rule applies. Missing filing rules and district
 * identity remain explicit gaps rather than being filled with something
 * plausible.
 *
 * So candidacy is offered exactly where a pack has been accepted, and nowhere
 * else. Lexington-Fayette has a jurisdiction and a household and an ordinary
 * life in it, and no sourced procedure for its own council — so a character
 * living there cannot file, and is told why. Nothing borrows Kentucky's rules
 * to cover the gap.
 */

/**
 * The game's own floor, not a jurisdiction's.
 *
 * Every real qualification below is `unknown`, and "unknown" must not resolve
 * to "anyone". So the game applies one conservative rule of its own and labels
 * it as its own: the same adult threshold the accepted setup screen already
 * uses before it will put a character to work in a legislature. When a
 * jurisdiction's real minimum age is sourced it replaces this, and a character
 * this rule turned away was turned away by the game, which is a different
 * sentence from "the law says no".
 */
export const GAME_ADULT_CANDIDACY_AGE = 21;

export interface ElectiveOfficeQualification {
  /** The age the jurisdiction requires. Unknown until a source says. */
  readonly minimumAge: RuleValue<number>;
  /** How long a candidate must have lived in the state or the district. */
  readonly residency: RuleValue<string>;
  /** How long the winner serves. */
  readonly termYears: RuleValue<number>;
  /** When candidacy papers are due, and to whom. */
  readonly filing: RuleValue<string>;
}

export interface ElectiveOfficeOption {
  /** Stable identity for this office within its pack. */
  readonly officeKey: string;
  readonly office: ElectiveOfficeRef;
  /** The chamber, by the name the accepted pack gives it. */
  readonly chamberName: string;
  /** Members elected to the chamber, as the accepted pack records it. */
  readonly seats: FormalSeatCount;
  /**
   * Where the seat count comes from: the accepted rule pack, by name.
   *
   * Deliberately not a `RuleSourceRef`. The packs cite instruments for the
   * procedural rules they were compiled for, and none of those citations
   * establishes the size of the chamber — attaching the nearest one to this
   * number would be a false attribution, which is the exact failure this lane
   * exists to avoid. So the claim made here is the true and smaller one: the
   * accepted pack records this many seats, and it is named so anybody can go
   * and check it.
   */
  readonly recordedBy: { readonly packId: string; readonly packName: string };
  readonly qualification: ElectiveOfficeQualification;
  /** What is not known about this office, carried rather than guessed. */
  readonly unresolvedGaps: readonly string[];
}

export interface CandidacyPack {
  readonly packId: string;
  readonly jurisdictionKey: string;
  readonly displayName: string;
  /** The accepted legislative pack every office below is derived from. */
  readonly legislativeRulePackId: string;
  readonly offices: readonly ElectiveOfficeOption[];
  readonly unresolvedGaps: readonly string[];
}

/**
 * An honest statement of how much of standing for office the game can support,
 * in the same shape `LifePlaceCoverage` uses for places.
 */
export interface CandidacyCoverage {
  readonly kind: "derived-from-accepted-rule-packs";
  readonly packCount: number;
  readonly officeCount: number;
  /** True only once real candidate qualifications back the offer. */
  readonly qualificationsAreSourced: boolean;
  readonly sourcedOfficeCount: number;
  readonly outstandingDependency: string;
  /** The same fact, said the way a player should hear it. */
  readonly playerNote: string;
}

const NO_QUALIFICATION_CORPUS =
  "No accepted source in this repository states this office's candidate qualifications. The legislative rule pack describes how a measure moves through the chamber, not who may stand for a seat in it.";

const NO_FILING_CORPUS =
  "No filing deadline, filing officer, primary, nomination, or ballot-access procedure has been read for this office.";

const NO_MEMBERSHIP_INSTRUMENT =
  "The seat count is the accepted rule pack's own recorded value. No instrument establishing the size of the chamber, or who may sit in it, has been read into this repository.";

const NO_DISTRICT_GEOGRAPHY =
  "The game has no district geography, so a seat in this chamber has no district identity and a contest is for a seat rather than for a numbered district.";

function officeQualification(
  packId: string,
  jurisdictionKey: string,
  chamberKey: string,
): ElectiveOfficeQualification {
  const rules = candidateQualificationRuleSet(
    `${packId}:candidacy`,
    `${packId}:${chamberKey}`,
  );
  if (rules) {
    const source = {
      authority: "constitution" as const,
      citation:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.legalLocator
          : "Qualification source unresolved",
      sourceTitle:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.sourceTitle
          : "Qualification source unresolved",
      sourceUrl:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.sourceUrl
          : null,
      retrievedAt:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.retrievedAt
          : null,
      verification: "verified" as const,
      note:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.researchLineage
          : null,
    };
    return {
      minimumAge:
        rules.minimumAge.state === "KNOWN"
          ? knownRule(rules.minimumAge.value, source)
          : unknownRule("Minimum age is not resolved."),
      residency:
        rules.stateResidenceYears.state === "KNOWN" &&
        rules.districtResidenceYears.state === "KNOWN"
          ? knownRule(
              `${rules.stateResidenceYears.value} years in the state and ${rules.districtResidenceYears.value} year in the district immediately preceding filing`,
              source,
            )
          : unknownRule("Residence qualification is not resolved."),
      termYears:
        rules.termYears.state === "KNOWN"
          ? knownRule(rules.termYears.value, source)
          : unknownRule("Term length is not resolved."),
      filing: unknownRule(
        "The qualification source establishes who may serve, not a filing deadline or filing authority.",
      ),
    };
  }

  const officeFamily = officeFamilyForChamberKey(chamberKey);
  if (officeFamily !== null) {
    const numericRule = (
      row: SourcedQualification | null,
    ): RuleValue<number> => {
      if (row === null) return unknownRule(NO_QUALIFICATION_CORPUS);
      if (row.sourceState === "NO_REQUIREMENT_FOUND") {
        return notApplicableRule(
          `${row.citation} was read and imposes no such requirement.`,
        );
      }
      if (row.sourceState === "NOT_APPLICABLE") {
        return notApplicableRule(
          `${row.citation} does not reach this office for this requirement.`,
        );
      }
      if (row.sourceState !== "KNOWN" || typeof row.value !== "number") {
        return unknownRule(
          `${row.citation} was read but does not provide a whole-number value the game can apply.`,
        );
      }
      return knownRule(row.value, qualificationSourceRef(row));
    };
    const textRule = (row: SourcedQualification | null): RuleValue<string> => {
      if (row === null) return unknownRule(NO_QUALIFICATION_CORPUS);
      if (row.sourceState === "NO_REQUIREMENT_FOUND") {
        return notApplicableRule(
          `${row.citation} was read and imposes no such requirement.`,
        );
      }
      if (row.sourceState === "NOT_APPLICABLE") {
        return notApplicableRule(
          `${row.citation} does not reach this office for this requirement.`,
        );
      }
      if (row.sourceState !== "KNOWN" || row.value === null) {
        return unknownRule(
          `${row.citation} was read but left this requirement unresolved.`,
        );
      }
      return knownRule(String(row.value), qualificationSourceRef(row));
    };
    if (
      compiledOfficeQualifications(jurisdictionKey, officeFamily).length > 0
    ) {
      return {
        minimumAge: numericRule(
          compiledOfficeQualification(
            jurisdictionKey,
            officeFamily,
            "MINIMUM_AGE",
          ),
        ),
        residency: textRule(
          compiledOfficeQualification(
            jurisdictionKey,
            officeFamily,
            "STATE_RESIDENCE",
          ) ??
            compiledOfficeQualification(
              jurisdictionKey,
              officeFamily,
              "DISTRICT_RESIDENCE",
            ),
        ),
        termYears: numericRule(
          compiledOfficeQualification(
            jurisdictionKey,
            officeFamily,
            "TERM_LENGTH",
          ),
        ),
        filing: unknownRule(NO_FILING_CORPUS),
      };
    }
  }
  return {
    minimumAge: unknownRule(NO_QUALIFICATION_CORPUS),
    residency: unknownRule(NO_QUALIFICATION_CORPUS),
    termYears: unknownRule(NO_QUALIFICATION_CORPUS),
    filing: unknownRule(NO_QUALIFICATION_CORPUS),
  };
}

/**
 * Turns an accepted legislative pack into the offices it demonstrably
 * establishes. One office per chamber, carrying that chamber's own citation.
 * Nothing is added that the pack does not already assert.
 */
export function candidacyPackFromRulePack(
  pack: LegislativeRulePack,
): CandidacyPack {
  const offices = pack.chambers.map((chamber): ElectiveOfficeOption => {
    const officeKey = `${pack.packId}:${chamber.chamberKey}`;
    return {
      officeKey,
      chamberName: chamber.name,
      office: {
        officeKey,
        // A description of the seat, not a claimed formal title. The packs do
        // not record what members of these chambers are styled, and guessing
        // "Representative" or "Senator" from a chamber name would be inventing
        // a fact about an institution.
        title: `Seat in the ${chamber.name}`,
        // No district corpus exists, so no district is claimed.
        seatKey: null,
        occupationClassification: "service:elected-legislator",
      },
      seats: chamber.seats,
      recordedBy: { packId: pack.packId, packName: pack.displayName },
      qualification: officeQualification(
        pack.packId,
        pack.jurisdictionKey,
        chamber.chamberKey,
      ),
      unresolvedGaps: [
        ...(officeHasSourcedQualifications(
          pack.packId,
          pack.jurisdictionKey,
          chamber.chamberKey,
        )
          ? [NO_FILING_CORPUS]
          : [NO_QUALIFICATION_CORPUS]),
        NO_MEMBERSHIP_INSTRUMENT,
        NO_DISTRICT_GEOGRAPHY,
      ],
    };
  });
  return {
    packId: `${pack.packId}:candidacy`,
    jurisdictionKey: pack.jurisdictionKey,
    displayName: pack.displayName,
    legislativeRulePackId: pack.packId,
    offices,
    unresolvedGaps: [
      ...(offices.some((office) =>
        officeHasSourcedQualifications(
          pack.packId,
          pack.jurisdictionKey,
          office.officeKey.split(":").at(-1) ?? "",
        ),
      )
        ? [NO_FILING_CORPUS]
        : [NO_QUALIFICATION_CORPUS]),
      NO_DISTRICT_GEOGRAPHY,
      "No primary, party nomination or ballot-access rule is sourced, so a filing here is a general-election candidacy and nothing more.",
    ],
  };
}

const CANDIDACY_PACKS: readonly CandidacyPack[] = LEGISLATIVE_RULE_PACKS.map(
  candidacyPackFromRulePack,
);

export function candidacyPacks(): readonly CandidacyPack[] {
  return CANDIDACY_PACKS;
}

export function candidacyPackById(packId: string): CandidacyPack | null {
  return CANDIDACY_PACKS.find((pack) => pack.packId === packId) ?? null;
}

/**
 * The candidacy pack a whole STATE carries, found by the state's own key.
 *
 * The packs already declare which jurisdiction they are for — `US-KY`,
 * `US-MN` — so a state is matched against that declaration rather than against
 * a name, a slug or anything a caller typed. A state with no accepted pack
 * returns null and the surfaces above say so; there is no nearest match and no
 * fallback, which is what keeps one state's rules out of another's election.
 */
export function stateCandidacyPack(
  stateJurisdictionKey: string | null,
): CandidacyPack | null {
  if (stateJurisdictionKey === null) return null;
  return (
    CANDIDACY_PACKS.find(
      (pack) => pack.jurisdictionKey === stateJurisdictionKey,
    ) ?? null
  );
}

export function requireCandidacyPack(packId: string): CandidacyPack {
  const pack = candidacyPackById(packId);
  if (!pack) {
    throw new Error(`No candidacy pack is registered as '${packId}'.`);
  }
  return pack;
}

export function electiveOfficeOption(
  packId: string,
  officeKey: string,
): ElectiveOfficeOption | null {
  return (
    candidacyPackById(packId)?.offices.find(
      (option) => option.officeKey === officeKey,
    ) ?? null
  );
}

export function candidacyCoverage(): CandidacyCoverage {
  const sourcedOfficeCount = CANDIDACY_PACKS.flatMap((pack) =>
    pack.offices.map((office) => ({ pack, office })),
  ).filter(({ pack, office }) =>
    officeHasSourcedQualifications(
      pack.legislativeRulePackId,
      pack.jurisdictionKey,
      office.officeKey.split(":").at(-1) ?? "",
    ),
  ).length;
  return {
    kind: "derived-from-accepted-rule-packs",
    packCount: CANDIDACY_PACKS.length,
    officeCount: CANDIDACY_PACKS.reduce(
      (total, pack) => total + pack.offices.length,
      0,
    ),
    qualificationsAreSourced: sourcedOfficeCount > 0,
    sourcedOfficeCount,
    outstandingDependency: NO_QUALIFICATION_CORPUS,
    playerNote: `${sourcedOfficeCount} offered legislative offices carry at least one source-verified qualification. Every other field remains explicitly unresolved; no jurisdiction borrows another's rule.`,
  };
}

function officeHasSourcedQualifications(
  packId: string,
  jurisdictionKey: string,
  chamberKey: string,
): boolean {
  if (
    candidateQualificationRuleSet(
      `${packId}:candidacy`,
      `${packId}:${chamberKey}`,
    )
  ) {
    return true;
  }
  const family: QualificationOfficeFamily | null =
    officeFamilyForChamberKey(chamberKey);
  return (
    family !== null &&
    compiledOfficeQualifications(jurisdictionKey, family).length > 0
  );
}

export { OFFICE_QUALIFICATIONS_META };
