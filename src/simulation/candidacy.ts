import {
  candidacyPackById,
  stateCandidacyPack,
  GAME_ADULT_CANDIDACY_AGE,
} from "./candidacy-packs";
import type { CandidacyPack, ElectiveOfficeOption } from "./candidacy-packs";
import { ageOnDate, completedMonthsBetween } from "./dates";
import { enactedRuleChangeAt } from "./enacted-rule-changes";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
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
import { governmentUnitsForPlace } from "./government-units";
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
  officeQualifications,
} from "./office-qualification-rules";
import type { QualificationAssessment } from "./office-qualification-rules";
import type { DistrictSeatBinding, EntityId, IsoDate, World } from "./types";
import {
  bindOfficeToDistrict,
  canonicalHomeDistrictKnowledge,
  districtResidenceSince,
  recordedDistrictResidenceSince,
} from "./district-residence";
import { gazetteerChamberForOfficeChamberKey } from "../districts/query";

/**
 * Whether a particular character may stand, and where.
 *
 * Which offices exist at all is next door in `candidacy-packs.ts`, which is a
 * leaf so the world's integrity pass can reach it without closing a cycle. This
 * half is free to know about places, because nothing inside the world module's
 * own import graph needs it — and knowing about places is the whole point:
 * which ballot somebody can be on is a fact about where they live.
 *
 * The refusals below are of two kinds and the difference is stated rather than
 * blurred. What a jurisdiction requires of a candidate is `unknown` in every
 * case, because no accepted source in this repository says. What the game
 * itself will not do is the adult rule, and a character turned away by it is
 * told that it was the game that turned them away.
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
  if (!place || place.scope !== "locality" || !place.sourceGeoid) return [];
  return governmentUnitsForPlace(place.sourceGeoid).flatMap(
    localElectedOffices,
  );
}

/**
 * Every office a person living here could stand for, in the order a ballot
 * reads upward: the state's offices the place reaches, then the town's own
 * governing body and, where the town elects one, its mayor. The governorship is offered on its own screen, as before.
 */
export function electiveOfficesForJurisdiction(
  jurisdictionId: EntityId,
): readonly ElectiveOfficeOption[] {
  return [
    ...(candidacyAuthority(jurisdictionId).pack?.offices ?? []),
    ...localGoverningBodiesForJurisdiction(jurisdictionId).flatMap(
      (identity) => localGoverningBodyCandidacyPack(identity).offices,
    ),
  ];
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

/**
 * The minimum age an unread state's generated pack carries, or null.
 *
 * Null for every sourced rule, deliberately. A read value belongs to the
 * sourced path, which words its refusal in the instrument's terms and carries
 * its citation; letting it back in through here would hold a candidate to the
 * same number twice and say the wrong thing about where it came from. The
 * `game-profile` verification is what distinguishes the two, and it is set by
 * the one function that draws these values, so a pack cannot present a drawn
 * number as anything else.
 *
 * Reading the pack rather than re-drawing matters: `standInQualification` is
 * deterministic, so a second call would agree today, and a gate that agrees by
 * coincidence stops agreeing the moment either side is changed alone. The
 * value a candidate is held to is the value the record shows, because it is
 * the same value.
 */
function profileDrawnMinimumAge(
  option: ElectiveOfficeOption | null,
): number | null {
  const rule = option?.qualification?.minimumAge;
  if (!rule || rule.kind !== "known") return null;
  if (rule.source.verification !== "game-profile") return null;
  return typeof rule.value === "number" ? rule.value : null;
}

/**
 * Why a character cannot file. Each carries the sentence a player should read;
 * none of them is a number the player is asked to beat.
 */
export type CandidacyBlockKind =
  | "no-sourced-office"
  | "below-game-adult-age"
  | "profile-minimum-age"
  | "sourced-minimum-age"
  | "sourced-state-residence"
  | "unproved-district-residence"
  | "unusable-district-binding"
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
  if (authority.pack === null) {
    return "The game has not read this state's elected offices yet, so there is nothing to stand for here. It will not borrow another state's rules to fill the gap.";
  }
  // A pack governs; the office asked for simply is not one of its seats.
  return "That office is not one the accepted rules for this place establish, so the game will not put it on a ballot.";
}

export interface CandidacyEligibility {
  readonly eligible: boolean;
  readonly personId: EntityId;
  /** The pack the jurisdiction itself declares, if it declares one. */
  readonly pack: CandidacyPack | null;
  readonly office: ElectiveOfficeOption | null;
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
   * Explicit Gazetteer district identity for this filing. Required where a
   * sourced district-residence rule exists. Never inferred from state
   * residence, and never treated as proved home membership by itself.
   */
  readonly districtBinding?: DistrictSeatBinding | null;
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
 * Eligibility reads the district a person already lives in, which answers
 * "could they stand at all". It does not answer "which seat", and a contest is
 * recorded against a Gazetteer identity, so filing still needs the binding
 * spelled out. Before this existed, an unbound filing was refused only as a
 * side effect of the district being unreadable — which was also why the
 * campaign screen refused everybody in these states.
 */
export function districtSeatMustBeNamed(
  jurisdictionId: EntityId,
  officeKey: string,
  onDate: IsoDate,
): boolean {
  const executive = stateExecutiveIdentityForOfficeKey(officeKey);
  if (executive) return false;
  // A House seat is named by its own key, and the Constitution asks only
  // that a Representative live in the state, so no district is inferred.
  if (congressSeatIdentityForOfficeKey(officeKey)) return false;
  // A town's governing body has no districts the game has read.
  if (localGoverningBodyIdentityForOfficeKey(officeKey)) return false;
  const authority = candidacyAuthority(jurisdictionId);
  // Two rule sources carry a district requirement and either one makes the
  // seat district-identified: the pack's own sourced rule set, and the
  // per-state qualification rows.
  const pack = authority.pack;
  if (pack) {
    const rules = candidateQualificationRuleSet(pack.packId, officeKey, onDate);
    const district = rules?.districtResidenceYears;
    if (
      district &&
      district.state !== "NOT_APPLICABLE" &&
      district.state !== "NO_REQUIREMENT_FOUND"
    ) {
      return true;
    }
  }
  const chamberKey = officeKey.split(":").at(-1) ?? null;
  const officeFamily =
    chamberKey === null ? null : officeFamilyForChamberKey(chamberKey);
  if (officeFamily === null) return false;
  return officeQualifications(
    authority.stateJurisdictionKey,
    officeFamily,
    onDate,
  ).some((row) => row.field === "DISTRICT_RESIDENCE");
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
        : `Too young to stand: ${law} this office has a minimum age of ${change.value}, and this character is ${person.age}.`,
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
        ? localGoverningBodyCandidacyPack(local)
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
  // A drawn rule that is recorded and never enforced is not the middle of the
  // three states a rule can be in — it is the refusal wearing the generated
  // rule's label. The pack for an unread state already carries a minimum age
  // drawn from the national spread, disclosed as the game's own; this reads
  // that same value rather than re-deriving it, so the number the record shows
  // and the number a candidate is held to cannot drift apart.
  const profileMinimumAge =
    qualificationRules === null && !sourcedMinimumAge
      ? profileDrawnMinimumAge(option)
      : null;
  if (profileMinimumAge !== null) {
    if (age < profileMinimumAge) {
      blocks.push({
        kind: "profile-minimum-age",
        // The requirement, and nothing else. A generated rule is shown exactly
        // as a sourced one is: the player is not told that this office's rule
        // was drawn, and the provenance stays in the record where an auditor
        // looks for it.
        reason: `This office asks for a candidate to be at least ${profileMinimumAge}.`,
      });
    }
  } else if (
    qualificationRules === null &&
    !sourcedMinimumAge &&
    age < GAME_ADULT_CANDIDACY_AGE
  ) {
    blocks.push({
      kind: "below-game-adult-age",
      reason: `The game has not read this state's minimum age for the office, so it holds to its own adult rule and will not put anyone under ${GAME_ADULT_CANDIDACY_AGE} on a ballot.`,
    });
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
      reason: "This character is already running for something.",
    });
  }

  return {
    eligible: blocks.length === 0,
    personId: input.personId,
    pack,
    office: boundOption,
    qualificationAssessments,
    blocks: distinctBlocks(blocks),
  };
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
