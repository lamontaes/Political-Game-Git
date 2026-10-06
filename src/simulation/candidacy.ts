import { placeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { candidacyPackById, stateCandidacyPack } from "./candidacy-packs";
import { settledQualification } from "./settled-qualifications";
import { knownRule, unknownRule } from "./legislature-rules";
import type { RuleValue } from "./legislature-rules";
import type { QualificationOfficeFamily } from "./office-qualification-rules";
import type { CandidacyPack, ElectiveOfficeOption } from "./candidacy-packs";
import {
  municipalMinimumAgeSentence,
  type MunicipalMinimumAgeEstimate,
} from "./municipal-qualification-estimate";
import {
  assessSecondCommittee,
  campaignStateJurisdictionKey,
} from "./campaign-compliance-rules";
import { activeCampaignForCandidate } from "./campaign-queries";
import { ageOnDate, completedMonthsBetween, makeIsoDate } from "./dates";
import { enactedRuleChangeAt } from "./enacted-rule-changes";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "./life-places";
import { factsForPerson } from "./people";
import { birthConfersCitizenship, isTerritoryUsps } from "./state-reference";
import { chiefExecutiveJurisdictionId } from "./nationwide-world/government-jurisdiction";
import { stateExecutiveIdentityForOfficeKey } from "./nationwide-world/state-executive-candidacy-packs";
import {
  congressCandidacyPack,
  congressSeatIdentityForOfficeKey,
} from "./nationwide-world/congress-candidacy-packs";
import {
  localElectedOffices,
  localGoverningBodyCandidacyPack,
  localGoverningBodyIdentityForOfficeKey,
} from "./nationwide-world/local-governing-body-candidacy-packs";
import type { LocalGoverningBodyIdentity } from "./nationwide-world/local-governing-body-candidacy-packs";
import { municipalSeatChoices } from "./municipal-seat-identity";
import { stateResidenceSince } from "./nationwide-world/residence-duration";
import { recordedTermsInOffice } from "./nationwide-world/prior-terms";
import { checkExecutiveTermLimit } from "./nationwide-world/executive-term-limits";
import { nextFilableStateExecutiveTerm } from "./nationwide-world/state-executive-turnover-calendar";
import {
  assessCandidateQualification,
  candidateQualificationRuleSet,
} from "./candidate-qualification";
import {
  assessOfficeQualifications,
  officeFamilyForChamberKey,
} from "./office-qualification-rules";
import type { QualificationAssessment } from "./office-qualification-rules";
import type { DistrictSeatBinding, EntityId, IsoDate, World } from "./types";
import {
  bindOfficeToDistrict,
  canonicalHomeDistrictKnowledge,
  districtResidenceSince,
  recordedDistrictResidenceSince,
} from "./district-residence";
import { districtIdentityCatalog } from "../districts/catalog";
import {
  gazetteerChamberForOfficeChamberKey,
  listDistrictIdentities,
} from "../districts/query";
import candidateFilingData from "../../data/research/elections/candidate-filing-terms.json";

export type CandidateFilingOfficeFamily =
  "STATEWIDE" | "CONGRESSIONAL" | "STATE_LEGISLATIVE" | "LOCAL_COUNCIL";

export interface CandidateFilingTerms {
  readonly feeMinorUnits: number;
  readonly signatures:
    number | { readonly percent: number; readonly base: string };
  readonly feeInLieuOfSignatures: boolean;
  readonly circulationOpens: string;
  readonly deadline: string;
  readonly sameDistrictOnly: boolean;
  readonly onePerSigner: boolean;
  readonly estimated: boolean;
  readonly estimatedFrom: string;
}

interface CandidateFilingTermsData {
  readonly places: Readonly<
    Record<
      string,
      Partial<Record<CandidateFilingOfficeFamily, CandidateFilingTerms>>
    >
  >;
  readonly boundedFallbackByOfficeFamily: Readonly<
    Record<CandidateFilingOfficeFamily, CandidateFilingTerms>
  >;
}

const FILING_TERMS = candidateFilingData as CandidateFilingTermsData;

function filingTermsFor(
  placeKey: string | null,
  family: CandidateFilingOfficeFamily,
): CandidateFilingTerms {
  const place = placeKey?.replace(/^US-/, "") ?? "";
  return (
    FILING_TERMS.places[place]?.[family] ??
    FILING_TERMS.boundedFallbackByOfficeFamily[family]
  );
}

/** Filing terms projection shared by the candidacy gate and host guidance. */
export function candidateFilingTermsForOffice(
  jurisdictionId: EntityId,
  officeKey: string,
): CandidateFilingTerms {
  const authority = candidacyAuthority(jurisdictionId);
  const executive = stateExecutiveIdentityForOfficeKey(officeKey);
  const congress = executive
    ? null
    : congressSeatIdentityForOfficeKey(officeKey);
  const local =
    executive || congress
      ? null
      : localGoverningBodyHere(jurisdictionId, officeKey);
  const family: CandidateFilingOfficeFamily = local
    ? "LOCAL_COUNCIL"
    : executive
      ? "STATEWIDE"
      : congress
        ? "CONGRESSIONAL"
        : "STATE_LEGISLATIVE";
  return filingTermsFor(authority.stateJurisdictionKey, family);
}

/**
 * Whether a particular character may stand, and where.
 *
 * Which offices exist at all is next door in `candidacy-packs.ts`, which is a
 * leaf so the world's integrity pass can reach it without closing a cycle. This
 * half is free to know about places, because nothing inside the world module's
 * own import graph needs it — and knowing about places is the whole point:
 * which ballot somebody can be on is a fact about where they live.
 *
 * Qualifications come from the office records, dated source assessments and
 * laws enacted in this world. A missing age rule remains unresolved.
 */

/**
 * The pack that governs a jurisdiction, or nothing.
 *
 * Derived from the place rather than passed in, because a caller that supplies
 * its own pack id can supply the wrong one. Asking the place is the only way to
 * make "Lexington-Fayette runs under Kentucky's General Assembly rules"
 * unsayable rather than merely discouraged.
 */
export function candidacyPackForJurisdiction(
  jurisdictionId: EntityId,
): CandidacyPack | null {
  return candidacyAuthority(jurisdictionId).pack;
}

/**
 * The elected offices of the town governments this place has (the governing
 * body, and the mayor where the town elects one directly), as the Census
 * Government Units listing joins them to it. A place with no government of its
 * own (a census-designated place) has none and is never given one.
 *
 * A town the game has read in depth is offered the same way: what it read
 * about the body still governs seating, and nothing here contradicts it.
 */
export function localGoverningBodiesForJurisdiction(
  jurisdictionId: EntityId,
): readonly LocalGoverningBodyIdentity[] {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  const units = placeLocalGovernmentUnits(place);
  return [...units.municipal, ...units.counties].flatMap(localElectedOffices);
}

/**
 * Every office a person living here could stand for, in the order a ballot
 * reads upward: the state's offices the place reaches, then the town's own
 * governing body and, where the town elects one, its mayor. The governorship is offered on its own screen, as before.
 */
export function electiveOfficesForJurisdiction(
  jurisdictionId: EntityId,
  onDate?: string,
  world?: World,
): readonly ElectiveOfficeOption[] {
  const authority = candidacyAuthority(jurisdictionId);
  const offices = [
    ...(authority.pack?.offices ?? []),
    ...localGoverningBodiesForJurisdiction(jurisdictionId).flatMap(
      (identity) =>
        localGoverningBodyCandidacyPack(
          identity,
          stateCandidacyPack(authority.stateJurisdictionKey),
        ).offices,
    ),
  ];
  if (onDate === undefined) return offices;
  return offices.map((office) => {
    const minimumAge = recordedMinimumAge(
      office,
      authority.stateJurisdictionKey,
      officeFamilyForChamberKey(office.officeKey.split(":").at(-1)!),
      onDate,
      world,
    );
    const { minimumAgeEstimate, ...qualification } = office.qualification;
    return {
      ...office,
      qualification: {
        ...qualification,
        minimumAge,
        ...(minimumAge.kind === "known" &&
        minimumAge.source.verification === "game-profile" &&
        minimumAgeEstimate
          ? { minimumAgeEstimate }
          : {}),
      },
    };
  });
}

/** The town governing body this office names, if this place has it. */
function localGoverningBodyHere(
  jurisdictionId: EntityId,
  officeKey: string,
): LocalGoverningBodyIdentity | null {
  const identity = localGoverningBodyIdentityForOfficeKey(officeKey);
  if (!identity) return null;
  return localGoverningBodiesForJurisdiction(jurisdictionId).some(
    (candidate) => candidate.officeKey === identity.officeKey,
  )
    ? identity
    : null;
}

/** Whose authority an office here rests on, and how far it reaches. */
export type CandidacyAuthorityScope = "local" | "state";

export interface CandidacyAuthority {
  /** The pack that governs, or null when nothing sourced governs here. */
  readonly pack: CandidacyPack | null;
  /**
   * Whether the pack is the place's own or the state's above it. Null when
   * there is no pack at all.
   */
  readonly scope: CandidacyAuthorityScope | null;
  /**
   * True when this place's OWN offices are unsourced. Independent of the
   * state: a Lexington resident can stand for a Kentucky seat while the game
   * still knows nothing about Lexington's council, and both are true at once.
   */
  readonly localOfficesUnsourced: boolean;
  /** The state above this place, as the packs key it. */
  readonly stateJurisdictionKey: string | null;
}

/**
 * Which pack governs standing for office here, and on whose authority.
 *
 * A place is asked twice, in this order, because the two questions are
 * different: what does this place declare on its own, and what does the state
 * it sits inside declare? Living in a city has never put anybody outside their
 * state, so a locality with no offices of its own still reaches its state's.
 *
 * What this deliberately is NOT is a search for the nearest usable pack. The
 * state is followed by its declared key and nothing else, so Lexington reaches
 * Kentucky and reaches nowhere else. A place in a state with no accepted pack
 * gets null, exactly as before.
 */
export function candidacyAuthority(
  jurisdictionId: EntityId,
): CandidacyAuthority {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  const stateJurisdictionKey = place?.stateJurisdictionKey ?? null;
  const ownPackId = place?.capabilities.candidacyPackId ?? null;
  const ownPack = ownPackId === null ? null : candidacyPackById(ownPackId);
  if (ownPack) {
    return {
      pack: ownPack,
      // An authored state entry declaring its own pack IS the state speaking.
      scope: place?.scope === "locality" ? "local" : "state",
      localOfficesUnsourced: place?.scope === "locality" ? false : true,
      stateJurisdictionKey,
    };
  }
  const statePack = stateCandidacyPack(stateJurisdictionKey);
  return {
    pack: statePack,
    scope: statePack === null ? null : "state",
    localOfficesUnsourced: true,
    stateJurisdictionKey,
  };
}

/** The office's recorded age rule; source provenance does not change its value. */
function recordedMinimumAge(
  option: ElectiveOfficeOption,
  jurisdictionKey: string | null,
  officeFamily: QualificationOfficeFamily | null,
  onDate: string,
  world?: World,
): RuleValue<number> {
  const enacted =
    world && jurisdictionKey
      ? enactedRuleChangeAt(world, {
          stateUsps: jurisdictionKey.replace(/^US-/, ""),
          officeKey: option.officeKey,
          field: "qualification.minimumAge",
          onDate: makeIsoDate(onDate),
        })
      : null;
  if (enacted && typeof enacted.value === "number")
    return knownRule(enacted.value, {
      authority:
        enacted.instrument === "constitutional-amendment"
          ? "constitution"
          : "statute",
      citation: enacted.designation,
      sourceTitle: enacted.designation,
      sourceUrl: null,
      retrievedAt: null,
      verification: "verified",
      note: "Law recorded in this world and operative on this date.",
    });
  const row =
    jurisdictionKey === null || officeFamily === null
      ? null
      : settledQualification(jurisdictionKey, "MINIMUM_AGE", officeFamily);
  if (row !== null) {
    const dated = settledQualification(
      jurisdictionKey!,
      "MINIMUM_AGE",
      officeFamily!,
      onDate,
    );
    return dated === null
      ? unknownRule(
          "This office's minimum age has not been established for this date.",
        )
      : knownRule(dated.value, dated.source);
  }
  return option.qualification.minimumAge;
}

/**
 * Why a character cannot file. Each carries the sentence a player should read;
 * none of them is a number the player is asked to beat.
 */
export type CandidacyBlockKind =
  | "no-sourced-office"
  | "profile-minimum-age"
  | "sourced-minimum-age"
  | "sourced-state-residence"
  | "unproved-district-residence"
  | "unusable-district-binding"
  | "unusable-municipal-seat"
  | "office-does-not-exist"
  | "unproved-sourced-qualification"
  | "term-limit"
  | "lives-elsewhere"
  | "already-a-candidate";

export interface CandidacyBlock {
  readonly kind: CandidacyBlockKind;
  readonly reason: string;
  readonly citation?: string;
}

/**
 * Why there is nothing to stand for, in the words that are actually true here.
 *
 * The old single sentence said "nobody has written down which offices are
 * elected here" to a character living in a state whose General Assembly the
 * game has read in full. That was the owner-play failure: a true statement
 * about Lexington's council delivered as a false one about Kentucky.
 */
function noSourcedOfficeReason(authority: CandidacyAuthority): string {
  if (authority.stateJurisdictionKey === null) {
    return "The game has not read any elected office for this place, and it will not borrow another jurisdiction's rules to fill the gap.";
  }
  if (
    authority.pack === null &&
    isTerritoryUsps(authority.stateJurisdictionKey.slice(3))
  ) {
    // A territory's Governor stands apart from this list; its legislature and
    // local offices are not on record until the territory research lands.
    return "None of this territory's legislative or local offices is on record yet, so there is no seat to run for here. Its Governor is below.";
  }
  if (authority.pack === null) {
    return "The game has not read this state's elected offices yet, so there is nothing to run for here. It will not borrow another state's rules to fill the gap.";
  }
  // A pack governs; the office asked for simply is not one of its seats.
  return "That office is not one the accepted rules for this place establish, so the game will not put it on a ballot.";
}

export interface CandidacyEligibility {
  readonly eligible: boolean;
  readonly minimumAgeEstimate: MunicipalMinimumAgeEstimate | null;
  readonly minimumAgeRequirement: string | null;
  readonly personId: EntityId;
  /** The pack the jurisdiction itself declares, if it declares one. */
  readonly pack: CandidacyPack | null;
  readonly office: ElectiveOfficeOption | null;
  /** Filing terms from this place's row, or its explicitly estimated fallback. */
  readonly filingTerms: CandidateFilingTerms | null;
  /** Every production-compiled field checked for this candidate. */
  readonly qualificationAssessments: readonly QualificationAssessment[];
  readonly blocks: readonly CandidacyBlock[];
}

export interface CandidacyEligibilityInput {
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly officeKey: string;
  /** True when this person already holds an unfinished campaign. */
  readonly alreadyACandidate: boolean;
  /**
   * Explicit Gazetteer district identity for a numbered seat. Never inferred
   * from state residence or treated as proved home membership by itself.
   */
  readonly districtBinding?: DistrictSeatBinding | null;
  /** Explicit municipal ward or at-large seat; no residence fact is inferred. */
  readonly municipalSeatKey?: string | null;
}

/**
 * Whether this character may stand, said in whole sentences.
 *
 * Every reason is either something the world records or something the game
 * openly admits is its own rule. None of them is a hidden threshold, and none
 * of them tells the player how close they came.
 */
/**
 * Whether this office's seats are identified by district, so a filing has to
 * name one.
 *
 * Eligibility answers whether this person can stand. A numbered chamber seat
 * also needs a Gazetteer identity at filing so the contest and eventual winner
 * identify one actual seat. A district-residence rule is a separate question:
 * its absence does not turn a numbered election into an at-large election.
 */
export function districtSeatMustBeNamed(
  jurisdictionId: EntityId,
  officeKey: string,
): boolean {
  const executive = stateExecutiveIdentityForOfficeKey(officeKey);
  if (executive) return false;
  // A congressional House seat is already named by its own office/seat key;
  // its separate filing route need not claim the candidate lives in it.
  if (congressSeatIdentityForOfficeKey(officeKey)) return false;
  // A town's governing body has no districts the game has read.
  if (localGoverningBodyIdentityForOfficeKey(officeKey)) return false;
  const authority = candidacyAuthority(jurisdictionId);
  const pack = authority.pack;
  if (!pack?.offices.some((office) => office.officeKey === officeKey))
    return false;
  const chamberKey = officeKey.split(":").at(-1) ?? null;
  const chamber =
    chamberKey === null
      ? null
      : gazetteerChamberForOfficeChamberKey(chamberKey);
  if (
    chamber === null ||
    authority.stateJurisdictionKey === null ||
    isTerritoryUsps(authority.stateJurisdictionKey.replace(/^US-/, ""))
  )
    return false;
  // A state chamber with published numbered districts needs one named at
  // filing. An office with no such seat catalog remains on its existing
  // at-large route; local offices are handled above.
  return (
    listDistrictIdentities(districtIdentityCatalog(), {
      stateUsps: authority.stateJurisdictionKey.replace(/^US-/, ""),
      chamber,
    }).length > 0
  );
}

const ENACTED_QUALIFICATION_FIELDS = [
  {
    field: "qualification.minimumAge",
    ruleSetField: "minimumAge",
    assessmentField: "MINIMUM_AGE",
  },
  {
    field: "qualification.stateResidenceYears",
    ruleSetField: "stateResidenceYears",
    assessmentField: "STATE_RESIDENCE",
  },
  {
    field: "qualification.districtResidenceYears",
    ruleSetField: "districtResidenceYears",
    assessmentField: "DISTRICT_RESIDENCE",
  },
] as const;

type EnactedQualificationField = (typeof ENACTED_QUALIFICATION_FIELDS)[number];

interface EnactedQualification {
  readonly field: EnactedQualificationField["field"];
  readonly ruleSetField: EnactedQualificationField["ruleSetField"];
  readonly assessmentField: EnactedQualificationField["assessmentField"];
  readonly value: number;
  readonly designation: string;
}

/** The qualification rules a law passed in this world has set for an office, in force today. */
function enactedQualifications(
  world: World,
  stateJurisdictionKey: string | null,
  officeKey: string | null,
): readonly EnactedQualification[] {
  if (!stateJurisdictionKey || !officeKey) return [];
  return ENACTED_QUALIFICATION_FIELDS.flatMap((entry) => {
    const change = enactedRuleChangeAt(world, {
      stateUsps: stateJurisdictionKey.replace(/^US-/, ""),
      officeKey,
      field: entry.field,
      onDate: world.currentDate,
    });
    return change && typeof change.value === "number"
      ? [{ ...entry, value: change.value, designation: change.designation }]
      : [];
  });
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function assessEnactedQualification(
  change: EnactedQualification,
  person: {
    readonly age: number;
    readonly since: IsoDate | null;
    readonly districtIsUnknown: boolean;
    readonly onDate: IsoDate;
  },
): QualificationAssessment {
  const law = `under ${change.designation}, passed in this state,`;
  if (change.field === "qualification.minimumAge") {
    const meets = person.age >= change.value;
    return {
      field: change.assessmentField,
      verdict: meets ? "meets" : "fails",
      reason: meets
        ? `Old enough: ${law} this office has a minimum age of ${change.value}.`
        : `You must be at least ${change.value} to run for this office, ${law.slice(0, -1)}.`,
      source: null,
    };
  }
  const place =
    change.field === "qualification.stateResidenceYears"
      ? "the state"
      : "the district";
  const required = plural(change.value, "year");
  if (change.value === 0)
    return {
      field: change.assessmentField,
      verdict: "meets",
      reason: `No residence period: ${law} this office asks for none in ${place}.`,
      source: null,
    };
  if (person.since === null)
    return {
      field: change.assessmentField,
      verdict: "not-evaluated",
      reason:
        change.field === "qualification.districtResidenceYears" &&
        person.districtIsUnknown
          ? `This office requires ${required} of residence in the district, ${law.slice(0, -1)}. This character's town lies across more than one district, so the game cannot say which one they live in, and it will not pick one to answer for them.`
          : `This office requires ${required} of residence in ${place}, ${law.slice(0, -1)}. The game has not recorded when this character came to live here, so it will not guess whether they qualify.`,
      source: null,
    };
  const held = completedMonthsBetween(person.since, person.onDate);
  const meets = held >= change.value * 12;
  return {
    field: change.assessmentField,
    verdict: meets ? "meets" : "fails",
    reason: meets
      ? `Resident long enough: ${law} this office requires ${required} of residence in ${place}.`
      : `Not resident long enough: ${law} this office requires ${required} of residence in ${place}, and this character has lived there ${plural(Math.floor(held / 12), "year")} and ${plural(held % 12, "month")}.`,
    source: null,
  };
}

export function candidacyEligibility(
  world: World,
  input: CandidacyEligibilityInput,
): CandidacyEligibility {
  const blocks: CandidacyBlock[] = [];
  let minimumAgeEstimate: MunicipalMinimumAgeEstimate | null = null;
  let minimumAgeRequirement: string | null = null;
  const authority = candidacyAuthority(input.jurisdictionId);
  // A state's executive office is the state's own, whatever legislature pack
  // governs the place: it is filed for statewide, against its own pack.
  const executive = stateExecutiveIdentityForOfficeKey(input.officeKey);
  // A seat in Congress is filed for from the state, like the governorship:
  // the Constitution asks that a member live in the state, not the district.
  const congress = executive
    ? null
    : congressSeatIdentityForOfficeKey(input.officeKey);
  // A town's governing body is the town's own, whatever the state above it
  // has, and only somebody living in that town can stand for it.
  const local =
    executive || congress
      ? null
      : localGoverningBodyHere(input.jurisdictionId, input.officeKey);
  const pack = executive
    ? candidacyPackById(executive.candidacyPackId)
    : congress
      ? congressCandidacyPack(congress)
      : local
        ? localGoverningBodyCandidacyPack(
            local,
            stateCandidacyPack(authority.stateJurisdictionKey),
          )
        : authority.pack;
  const stateJurisdictionKey = executive
    ? executive.jurisdictionKey
    : congress
      ? congress.jurisdictionKey
      : authority.stateJurisdictionKey;
  const option =
    pack?.offices.find(
      (candidate) => candidate.officeKey === input.officeKey,
    ) ?? null;
  let boundOption = option;
  if (option && input.districtBinding) {
    const bound = bindOfficeToDistrict(
      option,
      input.districtBinding,
      authority.stateJurisdictionKey
        ? authority.stateJurisdictionKey.replace(/^US-/, "")
        : null,
    );
    if (bound.kind === "refused") {
      blocks.push({
        kind: "unusable-district-binding",
        reason: bound.reason,
      });
      boundOption = option;
    } else {
      boundOption = bound.option;
    }
  }
  if (input.municipalSeatKey) {
    const choice = municipalSeatChoices(
      world,
      input.personId,
      input.officeKey,
    ).find((seat) => seat.key === input.municipalSeatKey);
    if (!choice || !choice.eligible) {
      blocks.push({
        kind: "unusable-municipal-seat",
        reason: choice?.reason ?? "That council seat is not on this ballot.",
      });
    } else if (boundOption) {
      boundOption = {
        ...boundOption,
        office: {
          ...boundOption.office,
          seatKey: choice.key,
          title: `${boundOption.office.title}, ${choice.label}`,
        },
      };
    }
  }
  if (!option) {
    // Two different absences, said as two different sentences. A state the
    // game has never read is not the same as a city whose council it has never
    // read, and telling a Kentuckian the first when only the second is true is
    // the defect this replaced.
    blocks.push({
      kind: "no-sourced-office",
      reason: noSourcedOfficeReason(authority),
    });
  }

  const person = world.people[input.personId];
  if (!person) {
    throw new Error(
      "Candidacy eligibility asked about somebody who is not in the world.",
    );
  }
  const age = ageOnDate(person.birthDate, world.currentDate);
  // A law passed in this world can change who may stand for this office. One
  // in force replaces the compiled rule for its field outright, whichever
  // source that rule came from, and is assessed below on its own.
  const enacted = enactedQualifications(
    world,
    stateJurisdictionKey,
    option?.officeKey ?? null,
  );
  const compiledRules =
    pack && option
      ? candidateQualificationRuleSet(
          pack.packId,
          option.officeKey,
          world.currentDate,
        )
      : null;
  const qualificationRules =
    compiledRules === null
      ? null
      : {
          ...compiledRules,
          ...Object.fromEntries(
            enacted.map((change) => [
              change.ruleSetField,
              {
                state: "NOT_APPLICABLE",
                reason: "Replaced by a law passed in this state.",
              } as const,
            ]),
          ),
        };
  // Continuous residence in this state, read from the recorded homes and
  // residence facts this life already carries; never backdated.
  const stateResidenceStart =
    stateJurisdictionKey === null
      ? null
      : stateResidenceSince(world, input.personId, stateJurisdictionKey);
  const chamberKey = option?.officeKey.split(":").at(-1) ?? null;
  const officeFamily = executive
    ? "GOVERNOR"
    : congress
      ? null
      : chamberKey === null
        ? null
        : officeFamilyForChamberKey(chamberKey);
  const filingTerms = candidateFilingTermsForOffice(
    input.jurisdictionId,
    input.officeKey,
  );
  const boundDistrict = boundOption?.office.districtBinding ?? null;
  // A district-residence rule is asked about before any seat is bound, which
  // is every time the player looks at whether they could stand at all. With no
  // binding to measure against, this used to answer null, and null reads as
  // "the game has not recorded when this character came to live here" — so
  // every office whose rules carry a district-residence requirement refused
  // forever, in a world that had recorded the membership on its first day.
  // Falling back to the person's own recorded district for this chamber asks
  // the same question of the same records; it does not relax the rule.
  const gazetteerChamber =
    chamberKey === null || congress
      ? null
      : gazetteerChamberForOfficeChamberKey(chamberKey);
  const districtSince =
    boundDistrict === null
      ? gazetteerChamber === null
        ? null
        : recordedDistrictResidenceSince(
            world,
            input.personId,
            gazetteerChamber,
            world.currentDate,
          )
      : districtResidenceSince(
          world,
          input.personId,
          boundDistrict,
          world.currentDate,
        );
  // A missing district duration has two very different causes, and the
  // refusal should say which. A split town is the world declining to pick one
  // of several districts its resident might be in; anything else is the world
  // simply not having the record.
  const districtGap =
    districtSince !== null || gazetteerChamber === null
      ? undefined
      : canonicalHomeDistrictKnowledge(
            world,
            input.personId,
            gazetteerChamber,
          ) === "split"
        ? ("district-unknown" as const)
        : ("unrecorded" as const);
  const compiledAssessments =
    qualificationRules !== null || officeFamily === null
      ? []
      : assessOfficeQualifications({
          person,
          stateJurisdictionKey,
          officeFamily,
          stateResidenceSince: stateResidenceStart,
          citizenSince: citizenByBirthSince(world, input.personId),
          districtResidenceSince: districtSince,
          ...(districtGap ? { districtResidenceGap: districtGap } : {}),
          onDate: world.currentDate,
          // The World's own office records for this exact office. A term limit
          // cannot bar someone these records show has never held it.
          priorTermsInOffice: option
            ? recordedTermsInOffice(world, input.personId, option.officeKey)
            : null,
        });
  const enactedAssessments = enacted.map((change) =>
    assessEnactedQualification(change, {
      age,
      since:
        change.field === "qualification.minimumAge"
          ? null
          : change.field === "qualification.stateResidenceYears"
            ? stateResidenceStart
            : districtSince,
      districtIsUnknown: districtGap === "district-unknown",
      onDate: world.currentDate,
    }),
  );
  const qualificationAssessments: readonly QualificationAssessment[] = [
    ...compiledAssessments.filter(
      (assessment) =>
        !enacted.some((change) => change.assessmentField === assessment.field),
    ),
    ...enactedAssessments,
  ];
  for (const assessment of enactedAssessments) {
    if (assessment.verdict === "meets") continue;
    blocks.push({
      kind:
        assessment.field === "MINIMUM_AGE"
          ? "sourced-minimum-age"
          : assessment.field === "STATE_RESIDENCE"
            ? "sourced-state-residence"
            : "unproved-district-residence",
      reason: assessment.reason,
    });
  }
  if (qualificationRules) {
    const assessment = assessCandidateQualification(qualificationRules, {
      birthDate: person.birthDate,
      onDate: world.currentDate,
      stateResidenceSince: stateResidenceStart,
      districtResidenceSince: districtSince,
      districtIsUnknown: districtGap === "district-unknown",
    });
    for (const refusal of assessment.refusals) {
      blocks.push({
        kind:
          refusal.kind === "minimum-age"
            ? "sourced-minimum-age"
            : refusal.kind === "state-residence"
              ? "sourced-state-residence"
              : "unproved-district-residence",
        reason: refusal.reason,
      });
    }
  } else {
    for (const assessment of qualificationAssessments) {
      if (assessment.verdict === "meets") continue;
      if (enactedAssessments.includes(assessment)) continue;
      // A chief executive's term limit is decided below, against the term the
      // filing would win and under this World's own law, which can change it.
      if (executive && assessment.field === "TERM_LIMIT") continue;
      blocks.push({
        kind:
          // Only a failed existence reading says the office does not exist;
          // an existence row whose date is not established is an ordinary gap.
          assessment.field === "OFFICE_EXISTENCE" &&
          assessment.verdict === "fails"
            ? "office-does-not-exist"
            : "unproved-sourced-qualification",
        reason: assessment.reason,
        citation: assessment.source?.citation,
      });
    }
  }
  if (congress && age < congress.minimumAge) {
    blocks.push({
      kind: "sourced-minimum-age",
      reason: `${congress.title === "U.S. Senator" ? "A Senator" : "A Representative"} must be at least ${congress.minimumAge} years old.`,
    });
  }
  const sourcedMinimumAge =
    congress !== null ||
    qualificationAssessments.some(
      (assessment) => assessment.field === "MINIMUM_AGE",
    );
  // Dated compiled and enacted assessments above take precedence. Only an
  // office with no assessed age reads its own pack; no general adult floor.
  if (qualificationRules === null && !sourcedMinimumAge && option) {
    const rule = recordedMinimumAge(
      option,
      stateJurisdictionKey,
      officeFamily,
      world.currentDate,
    );
    if (local?.unit.unitType === "municipality" && rule.kind === "known") {
      minimumAgeEstimate =
        rule.source.verification === "game-profile"
          ? (option.qualification.minimumAgeEstimate ?? null)
          : null;
      minimumAgeRequirement = minimumAgeEstimate
        ? municipalMinimumAgeSentence(minimumAgeEstimate)
        : `You must be at least ${rule.value} to run for this office.`;
    }
    if (rule.kind === "known" && age < rule.value) {
      blocks.push({
        kind:
          rule.kind === "known" && rule.source.verification === "game-profile"
            ? "profile-minimum-age"
            : "sourced-minimum-age",
        reason:
          minimumAgeRequirement ??
          `You must be at least ${rule.value} to run for this office.`,
      });
    } else if (rule.kind === "unknown") {
      blocks.push({
        kind: "unproved-sourced-qualification",
        reason: rule.note,
      });
    }
  }
  // Every chief executive's office has a term limit in one of three states:
  // read from the state, changed by a law passed in this World, or the game's
  // disclosed draw for a state it has not read. It is measured against the
  // term the filing would win, so a law already passed that takes effect by
  // then is the law that decides.
  if (executive) {
    const term = nextFilableStateExecutiveTerm(world, executive.stateUsps);
    const limit = term
      ? checkExecutiveTermLimit(world, {
          stateUsps: executive.stateUsps,
          personId: input.personId,
          termStartsAt: term.startsAt,
        })
      : null;
    if (limit?.barredReason)
      blocks.push({ kind: "term-limit", reason: limit.barredReason });
  }
  const livesElsewhere = executive
    ? lifePlaceByJurisdictionId(person.homeJurisdictionId)
        ?.stateJurisdictionKey !== executive.jurisdictionKey ||
      input.jurisdictionId !== chiefExecutiveJurisdictionId(executive.stateUsps)
    : congress
      ? lifePlaceByJurisdictionId(person.homeJurisdictionId)
          ?.stateJurisdictionKey !== congress.jurisdictionKey ||
        input.jurisdictionId !==
          stateJurisdictionForKey(congress.jurisdictionKey)?.id
      : person.homeJurisdictionId !== input.jurisdictionId;
  if (livesElsewhere) {
    blocks.push({
      kind: "lives-elsewhere",
      reason: congress
        ? "A member of Congress must live in the state they represent, and this character lives somewhere else."
        : "This character does not live in the place holding the election, and the game has no sourced residency rule that would let them stand there anyway.",
    });
  }
  if (input.alreadyACandidate) {
    blocks.push({
      kind: "already-a-candidate",
      reason:
        secondCommitteeRefusal(world, input) ??
        "This character is already running for something.",
    });
  }

  return {
    eligible: blocks.length === 0,
    minimumAgeEstimate,
    minimumAgeRequirement,
    personId: input.personId,
    pack,
    office: boundOption,
    filingTerms,
    qualificationAssessments,
    blocks: distinctBlocks(blocks),
  };
}

/**
 * Where the state's law forbids a second committee for the office this
 * character is already running for, the law's own sentence; otherwise null,
 * and the game's rule against running twice at once speaks instead.
 */
function secondCommitteeRefusal(
  world: World,
  input: CandidacyEligibilityInput,
): string | null {
  const running = activeCampaignForCandidate(world, input.personId);
  if (!running || running.officeKey !== input.officeKey) return null;
  const ruling = assessSecondCommittee(world, {
    personId: input.personId,
    stateJurisdictionKey: campaignStateJurisdictionKey(running, world),
    officeKey: input.officeKey,
  });
  return ruling.decision === "refused" ? ruling.reason : null;
}

/**
 * One block per thing that is actually in the way.
 *
 * Several requirements can be blocked for the same reason — a state whose
 * rules cannot be placed in time blocks every one of them — and the surfaces
 * join the reasons into a paragraph. Repeating one sentence five times told
 * the player nothing the first sentence had not, so a sentence already said is
 * dropped. The first block keeps its place and its `kind`, because callers
 * read the kind to decide what to offer instead.
 */
function distinctBlocks(
  blocks: readonly CandidacyBlock[],
): readonly CandidacyBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    if (seen.has(block.reason)) return false;
    seen.add(block.reason);
    return true;
  });
}

/**
 * Since when the World's records show a person a United States citizen: their
 * birth date, when their recorded birthplace is in a state, the District of
 * Columbia or a territory whose births confer citizenship. A birth in
 * American Samoa confers nationality, not citizenship, and a birthplace the
 * World cannot place answers null; neither is guessed.
 */
export function citizenByBirthSince(
  world: World,
  personId: EntityId,
): IsoDate | null {
  const person = world.people[personId];
  if (!person) return null;
  const birthplace = factsForPerson(person).find(
    (fact) => fact.kind === "birthplace",
  );
  if (!birthplace || birthplace.kind !== "birthplace") return null;
  const jurisdiction = world.jurisdictions[birthplace.jurisdictionId];
  const stateKey =
    lifePlaceByJurisdictionId(birthplace.jurisdictionId)
      ?.stateJurisdictionKey ??
    (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null);
  if (stateKey === null || !birthConfersCitizenship(stateKey)) return null;
  return person.birthDate;
}

