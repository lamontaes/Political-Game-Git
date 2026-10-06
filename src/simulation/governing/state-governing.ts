import { inventedPersonBirthDate } from "../invented-person-age";
import {
  applyItemVetoes,
  executiveItemVetoSelectionProblem,
  type ExecutiveItemVetoSelection,
} from "./item-veto";
import { eventById } from "../event-index";
import { applyCharacterHistoryPlan } from "../character-history";
import { addDays, compareSimulationMoments, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createStableId } from "../ids";
import { createWorkRelationship, recordWorkStatus } from "../life";
import {
  currentLifeCutoff,
  workRelationshipHistoryForOrganization,
  workRoleAt,
  workStatusAt,
} from "../life-queries";
import { currentPresidentOf } from "../crisis/offices";
import { currentFederalTenure } from "../federal-tenures";
import { nationalOfficeHolder } from "../national-election-consumer";
import {
  municipalOrganizationFor,
  municipalGovernmentJurisdictionId,
  municipalSeats,
  municipalMeasures,
} from "../municipal-public-work";
import {
  municipalExecutiveHolder,
  recordCouncilExecutiveDecision,
  recordCouncilExecutiveInaction,
} from "../municipal-ordinance-procedure";
import {
  municipalGovernmentByKey,
  primaryReading,
} from "../municipal-government";
import { recordsByKey, recordById, stableKeysOf } from "../history-index";
import { publicGovernmentIdentityForRecord } from "../public-government-identity";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import { regularSessionYearForWorld } from "../legislative-procedure-world";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
  measureActions,
  recordExecutiveInaction,
  issueExecutiveInstrument,
  measurePosition,
} from "../legislation";
import { createWorkItem, workItemState } from "../time-work";
import type {
  EntityId,
  DecisionConsideration,
  DecisionEvaluation,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  LegislativeMeasureRecord,
  PublicGovernmentIdentity,
  PublicProgramAppropriationRecord,
  World,
  WorkItemStateRecord,
} from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  considerationScore,
  evaluateDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import { npcEligibleProgramConfigurations } from "../legislation-program-families";
import {
  BILL_SIGN,
  BILL_RETURN,
  executiveBillActionWindow,
  evaluateGovernorBill,
  ownPartyPassageVote,
} from "./governor-bill-decision";
import {
  advanceClemencyPetition,
  considerClemencyAfterExecutiveDesk,
} from "../justice/clemency";
import { CLEMENCY_KIND_TAG } from "../justice/jail-terms";
import {
  CLEMENCY_DENY,
  CLEMENCY_GRANT,
  clemencyQuestionFor,
  evaluateClemency,
} from "../justice/clemency-reasoning";
import { congressLawmakingHandlers, presidentDesk } from "./congress-lawmaking";
import {
  currentStateExecutiveHolders,
  type StateExecutiveHolderRecord,
} from "../nationwide-world/state-executives";
import {
  stateExecutiveTermRule,
  stateExecutiveTermRuleNote,
} from "../nationwide-world/state-executive-term-rules";
import { governingJurisdictionIdFor } from "../nationwide-world/government-jurisdiction";
import { stateExecutiveIdentityForOfficeKey } from "../nationwide-world/state-executive-candidacy-packs";
import {
  LEGISLATIVE_INSTITUTION_STEP,
  createInstitutionStepHandler,
  recordGovernorDecisionOnMeasure,
  scheduleInstitutionStep,
  type ExecutiveDeskHandler,
} from "./legislative-clock";
import {
  GOVERNING_SEASON,
  scheduleGoverningSeasons,
} from "./governing-calendar";
import {
  LEGISLATIVE_SESSION_COMPLETION_TRANSITION,
  legislativeSessionCompletionHandler,
} from "./legislative-session-completion";
import {
  ensureStateLegislatureOpening,
  STATE_LEGISLATURE_OPENING_TRANSITION,
  stateLegislatureOpeningHandler,
} from "../nationwide-world/state-legislature-opening";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { fileMemberAgendaBill } from "./member-agenda";
import {
  ensureOfficeholderPrinciples,
  principleAnswersConsideration,
} from "./officeholder-principles";
import { publicPartyOf } from "./chamber-votes";
import { decideExecutiveActionAuthority } from "../executive-action-authority";
import { executiveRulePackForJurisdiction } from "../executive-authority-rule-packs";
import { legislatureProfilePackId } from "../legislature-game-profile";

/**
 * STATE GOVERNING — the shared practical loop every governorship runs.
 *
 * One set of producers for every office, whoever holds it. A matter is opened
 * on the canonical clock; the player decides, delegates or lets it lapse; a
 * non-player holder decides in the ordinary course. Each decision is a
 * canonical record with a recorded consequence, and the public part of it is a
 * public event News and recaps can read. Nothing here runs on menu open.
 *
 * Families (ALIVE44 chunk 8, compiled from 92H):
 *   E2 chief-of-staff appointment -> staff relationship -> delegation
 *   E1 agenda priority            -> agency implementation matter
 *   G1 agency implementation      -> dated progress or problem report
 *   E4 budget priorities          -> legislature's response on the clock
 *   E3 bill presented             -> sign, return, or law without signature;
 *                                    a signed bill becomes agency work
 *
 * Budget season, bill presentment dates, the action deadline and what an
 * unsigned bill does are the disclosed calendar in
 * the shared session timetable, not compiled state law.
 *
 * These are the office's own staffing and management choices. They claim no
 * statutory power: hiring personal staff and directing a priority are ordinary
 * office work, and nothing here appoints anyone who needs confirmation.
 *
 * Records link to a matter by tag (`matter:<event id>`), because an event is
 * not an entity another event can involve.
 */

export const STATE_GOVERNING_VERSION = "state-governing/v1";

/** A sentence used as the opening clause of a longer one: no stop mid-sentence. */
function clause(sentence: string): string {
  return sentence.replace(/\.$/, "");
}

export const GOVERNING_MATTER_OPENED = "governing.matter-opened" as const;
export const GOVERNING_MATTER_DECIDED = "governing.matter-decided" as const;
export const GOVERNING_OUTCOME = "governing.outcome" as const;

export const GOVERNING_TRANSITION = "governing:transition" as const;
export const GOVERNING_DEADLINE = "governing:matter-deadline" as const;
export const GOVERNING_NPC_DECISION = "governing:npc-decision" as const;
export const GOVERNING_PROGRAM_AVAILABLE =
  "governing:program-available" as const;
export const GOVERNING_FOLLOW_UP = "governing:follow-up" as const;

export type GoverningMatterFamily =
  | "chief-of-staff"
  | "agenda"
  | "implementation"
  | "budget"
  | "bill"
  | "program"
  | "clemency"
  | "executive-order"
  | "regulation"
  | "emergency";

export interface GoverningOffice {
  readonly officeKey: string;
  readonly stateUsps: string;
  readonly title: string;
  readonly jurisdictionId: EntityId;
  readonly organizationId: EntityId | null;
  readonly holderPersonId: EntityId;
  /** The elected-term relationship or opening tenure event. */
  readonly termId: EntityId;
  readonly termStartedAt: IsoDate | null;
  readonly termEndsAt: IsoDate | null;
  readonly controlledByPlayer: boolean;
  /** Whether the office's calendar is compiled law or the game's profile. */
  readonly calendarBasis: "verified" | "game-profile" | "mixed";
  /** What to tell the holder about the rule dating this term. */
  readonly calendarNote: string | null;
  /** Program-only federal/local desks keep their actual authority identity. */
  readonly programOffice?: PublicProgramOffice;
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

function officeFromHolder(
  world: World,
  holder: StateExecutiveHolderRecord,
): GoverningOffice | null {
  // The one canonical identity for this government; for the District that is
  // its single consolidated jurisdiction, not a second district-wide one.
  const jurisdictionId = governingJurisdictionIdFor({
    kind: "state",
    stateUsps: holder.stateUsps,
  });
  if (!jurisdictionId) return null;
  const rule = stateExecutiveTermRule(holder.stateUsps);
  const bases = rule ? Object.values(rule.basis) : ["game-profile"];
  return {
    officeKey: holder.officeKey,
    stateUsps: holder.stateUsps,
    title: holder.title,
    jurisdictionId,
    organizationId: holder.organizationId,
    holderPersonId: holder.personId,
    termId: holder.termId,
    termStartedAt: holder.startedAt,
    termEndsAt: holder.endExclusive,
    controlledByPlayer: controlledPersonId(world) === holder.personId,
    calendarBasis: bases.every((b) => b === "verified")
      ? "verified"
      : bases.every((b) => b === "game-profile")
        ? "game-profile"
        : "mixed",
    calendarNote: rule ? stateExecutiveTermRuleNote(rule) : null,
  };
}

/** A municipal executive uses the government's existing organization and seat. */
function municipalGoverningOffice(
  world: World,
  governmentKey: string,
): GoverningOffice | null {
  const government = municipalGovernmentByKey(governmentKey);
  const organization = municipalOrganizationFor(world, governmentKey);
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    governmentKey,
  );
  const holderPersonId = municipalExecutiveHolder(world, governmentKey);
  if (!government || !organization || !jurisdictionId || !holderPersonId)
    return null;
  const seat = municipalSeats(world, governmentKey).find(
    (candidate) =>
      candidate.role === "mayor" && candidate.personId === holderPersonId,
  );
  if (!seat) return null;
  const participation = recordById(
    world.history.organizationParticipations,
    seat.participationId,
  );
  if (!participation) return null;
  const reading = primaryReading(government);
  return {
    officeKey: `program-office:local:${encodeURIComponent(governmentKey)}`,
    stateUsps: government.state,
    title: `${reading.mayor?.title ?? "Mayor"} of ${government.placeName ?? government.displayName}`,
    jurisdictionId,
    organizationId: organization.id,
    holderPersonId,
    termId: participation.id,
    termStartedAt: participation.startedAt,
    termEndsAt: null,
    controlledByPlayer: controlledPersonId(world) === holderPersonId,
    calendarBasis:
      reading.evidence === "game-profile" ? "game-profile" : "mixed",
    calendarNote: null,
    programOffice: { kind: "municipal", governmentKey },
  };
}

/** Only installed governments are inspected; the index follows organization appends. */
function municipalGoverningOffices(world: World): readonly GoverningOffice[] {
  const organizations = recordsByKey(
    world.history.organizations,
    "governing:municipal-organizations",
    (organization) =>
      /^(municipal-government|local-government):/.test(organization.stableKey)
        ? ["municipal"]
        : [],
    "municipal",
  );
  const offices = new Map<string, GoverningOffice>();
  for (const organization of organizations) {
    const key = organization.stableKey.replace(
      /^(municipal-government|local-government):/,
      "",
    );
    const government = municipalGovernmentByKey(key);
    if (!government) continue;
    const office = municipalGoverningOffice(world, government.key);
    if (office) offices.set(office.officeKey, office);
  }
  return [...offices.values()];
}

/** Every materialized governorship and municipal executive with a current holder. */
export function currentGoverningOffices(
  world: World,
): readonly GoverningOffice[] {
  const stateOffices = currentStateExecutiveHolders(world).flatMap((holder) => {
    const office = officeFromHolder(world, holder);
    return office ? [office] : [];
  });
  // A consolidated state/local executive already has one governing office.
  const holders = new Set(stateOffices.map((office) => office.holderPersonId));
  return [
    ...stateOffices,
    ...municipalGoverningOffices(world).filter(
      (office) => !holders.has(office.holderPersonId),
    ),
  ];
}

/** The recorded Presidency has a holder even when no staff organization exists. */
function presidentGoverningOffice(world: World): GoverningOffice | null {
  const president = currentPresidentOf(world);
  if (!president) return null;
  const election = nationalOfficeHolder(world, "president");
  const tenure = currentFederalTenure(world, "us-president");
  const termId = election?.plan.id ?? tenure?.event.id;
  if (!termId) return null;
  return {
    officeKey: "us-president",
    stateUsps: "",
    title: president.title,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    organizationId: null,
    holderPersonId: president.personId,
    termId,
    termStartedAt: null,
    termEndsAt: null,
    controlledByPlayer: controlledPersonId(world) === president.personId,
    calendarBasis: "verified",
    calendarNote: null,
  };
}

/** Opens a passed federal bill on the same bound matter as a state bill. */
export function openPresidentBillMatter(
  world: World,
  measure: Parameters<ExecutiveDeskHandler>[1],
): World {
  const office = presidentGoverningOffice(world);
  if (
    !office ||
    measurePosition(world, measure.id).phase !== "awaiting-executive"
  )
    return world;
  const next = openMatter(world, office, {
    family: "bill",
    instance: `measure:${measure.id}`,
    measureId: measure.id,
  });
  const window = executiveBillActionWindow(next, measure);
  if (!window || next.currentDate <= window.lastActionDate) return next;
  const matter = governingMatters(next, office.officeKey).find(
    (m) => m.measureId === measure.id && m.status === "open",
  );
  return matter ? applyExecutiveBillInaction(next, matter) : next;
}

/** A council's actual presentment joins the same bound executive bill matter. */
export function openMunicipalBillMatter(
  world: World,
  measure: LegislativeMeasureRecord,
  governmentKey: string,
): World {
  const holder = municipalExecutiveHolder(world, governmentKey);
  const office = holder ? governingOfficeForPerson(world, holder) : null;
  if (
    !office ||
    !municipalMeasures(world, governmentKey).some(
      (entry) => entry.id === measure.id,
    ) ||
    measurePosition(world, measure.id).phase !== "awaiting-executive"
  )
    return world;
  return openMatter(world, office, {
    family: "bill",
    instance: `measure:${measure.id}`,
    measureId: measure.id,
    extraTags: [`municipal-government:${encodeURIComponent(governmentKey)}`],
    sourceEventId: measureActions(world, measure.id).find(
      (action) => action.kind === "presented-to-executive",
    )?.eventId,
  });
}

export function governingOfficeForPerson(
  world: World,
  personId: EntityId,
): GoverningOffice | null {
  return (
    currentGoverningOffices(world).find(
      (office) => office.holderPersonId === personId,
    ) ??
    (presidentGoverningOffice(world)?.holderPersonId === personId
      ? presidentGoverningOffice(world)
      : null)
  );
}

function governingOfficeByKey(
  world: World,
  officeKey: string,
): GoverningOffice | null {
  const governor = currentGoverningOffices(world).find(
    (office) => office.officeKey === officeKey,
  );
  if (governor) return governor;
  if (officeKey === "us-president") return presidentGoverningOffice(world);
  // A program desk is resolved from the same saved appropriation and current
  // holder that opened it. It never joins the governor calendar or bill desk.
  for (const record of world.history.publicProgramRecords ?? []) {
    if (record.kind !== "appropriation") continue;
    const office = programOfficeForAppropriation(world, record);
    if (office?.officeKey === officeKey) return office;
  }
  return null;
}

function programOfficeForAppropriation(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
): GoverningOffice | null {
  const identity = publicGovernmentIdentityForRecord(appropriation);
  if (identity.kind === "local-government") {
    const descriptor: PublicProgramOffice = {
      kind: "municipal",
      governmentKey: identity.governmentKey,
    };
    const executive = municipalGoverningOffice(world, identity.governmentKey);
    if (
      executive &&
      programAuthority(
        world,
        executive.holderPersonId,
        descriptor,
        appropriation,
      ).status === "available"
    )
      return executive;
    const organization = municipalOrganizationFor(
      world,
      identity.governmentKey,
    );
    if (!organization) return null;
    const eligible = municipalSeats(world, identity.governmentKey).filter(
      (seat) =>
        (seat.role === "mayor" || seat.role === "professional-manager") &&
        programAuthority(world, seat.personId, descriptor, appropriation)
          .status === "available",
    );
    const holders = new Set(eligible.map((seat) => seat.personId));
    if (holders.size !== 1) return null;
    const seat = eligible[0]!;
    return {
      officeKey: `program-office:local:${encodeURIComponent(identity.governmentKey)}`,
      stateUsps: "",
      title: seat.role === "mayor" ? "Mayor" : "Manager",
      jurisdictionId: appropriation.jurisdictionId,
      organizationId: organization.id,
      holderPersonId: seat.personId,
      termId: seat.participationId,
      termStartedAt: null,
      termEndsAt: null,
      controlledByPlayer: controlledPersonId(world) === seat.personId,
      calendarBasis: "game-profile",
      calendarNote: null,
      programOffice: descriptor,
    };
  }
  if (appropriation.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id) {
    const president = currentPresidentOf(world);
    const descriptor: PublicProgramOffice = { kind: "federal-executive" };
    if (
      !president ||
      programAuthority(world, president.personId, descriptor, appropriation)
        .status !== "available"
    )
      return null;
    const termId =
      nationalOfficeHolder(world, "president")?.plan.id ??
      currentFederalTenure(world, "us-president")?.event.id ??
      president.personId;
    return {
      officeKey: "program-office:us-president",
      stateUsps: "",
      title: president.title,
      jurisdictionId: appropriation.jurisdictionId,
      // The public account is the saved federal organization available to a
      // program matter; the Presidency has no separate organization record.
      organizationId: appropriation.accountOrganizationId,
      holderPersonId: president.personId,
      termId,
      termStartedAt: null,
      termEndsAt: null,
      controlledByPlayer: controlledPersonId(world) === president.personId,
      calendarBasis: "game-profile",
      calendarNote: null,
      programOffice: descriptor,
    };
  }
  const office = currentGoverningOffices(world).find(
    (candidate) => candidate.jurisdictionId === appropriation.jurisdictionId,
  );
  return office &&
    programAuthority(
      world,
      office.holderPersonId,
      { kind: "state-executive" },
      appropriation,
    ).status === "available"
    ? office
    : null;
}

/* ------------------------------------------------------------------ *
 * Staff
 * ------------------------------------------------------------------ */

export const CHIEF_OF_STAFF_CLASSIFICATION =
  "service:executive-chief-of-staff" as const;

/** The office's current chief of staff, if one has been hired. */
export function chiefOfStaffFor(
  world: World,
  office: Pick<GoverningOffice, "organizationId">,
): EntityId | null {
  return office.organizationId
    ? (chiefOfStaffWork(world, office.organizationId)[0]?.personId ?? null)
    : null;
}

/** Every active chief-of-staff job in the office, in person order. */
function chiefOfStaffWork(
  world: World,
  organizationId: EntityId,
): readonly { readonly personId: EntityId; readonly workId: EntityId }[] {
  const cutoff = currentLifeCutoff(world);
  const active = workRelationshipHistoryForOrganization(
    world,
    organizationId,
    cutoff,
  ).filter(
    (relationship) =>
      relationship.organizationId === organizationId &&
      relationship.kind === "employment:executive-staff" &&
      relationship.sequence < cutoff.historySequenceExclusive &&
      (relationship.startedAt < relationship.recordedAt
        ? relationship.startedAt
        : relationship.recordedAt) <= cutoff.asOfDate &&
      relationship.startedAt <= cutoff.asOfDate &&
      workStatusAt(world, relationship.id, cutoff)?.status === "active" &&
      workRoleAt(world, relationship.id, cutoff)?.occupationClassification ===
        CHIEF_OF_STAFF_CLASSIFICATION,
  );
  // Most offices have no hired chief. Only build a person-order lookup when
  // there are actually two or more active jobs to order.
  const personOrder =
    active.length > 1
      ? new Map(world.personOrder.map((personId, index) => [personId, index]))
      : new Map<EntityId, number>();
  return active
    .sort(
      (left, right) =>
        (personOrder.get(left.personId) ?? Infinity) -
          (personOrder.get(right.personId) ?? Infinity) ||
        left.sequence - right.sequence,
    )
    .map((relationship) => ({
      personId: relationship.personId,
      workId: relationship.id,
    }));
}

/** Whether this person is already a chief of staff in this office. */
function isSittingChief(
  world: World,
  organizationId: EntityId,
  personId: EntityId,
): boolean {
  return chiefOfStaffWork(world, organizationId).some(
    (work) => work.personId === personId,
  );
}

/** Qualitative assessment read from the person's saved record. */
import { staffAssessment } from "./staff-evidence";
import type { StaffAssessment } from "./staff-evidence";
import { PROGRAM_FAMILIES, programFamilyTitle } from "./program-families";
import {
  openAppropriationsFor,
  programAlternativesFor,
  programOperatorOrganization,
  standingProgramUnsupported,
} from "./program-governing";
import {
  commitPublicProgram,
  forecastProgramAlternative,
  programAuthority,
  type PublicProgramOffice,
} from "./public-program";
import {
  establishOfficeStaffPositions,
  recordOfficeStaffIncumbency,
} from "./office-staffing";

export { PROGRAM_FAMILIES, programFamilyTitle } from "./program-families";
export {
  OFFICE_STAFFING_PROFILE,
  OFFICE_STAFF_POSITIONS,
  establishOfficeStaffPositions,
  officeStaffClass,
  officeStaffPositions,
  openOfficePositions,
} from "./office-staffing";
export type { StaffAssessment } from "./staff-evidence";
export {
  staffAssessment,
  staffCareerEvidence,
  staffKnowsLegislature,
} from "./staff-evidence";

/* ------------------------------------------------------------------ *
 * Agenda vocabulary
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Matter records
 * ------------------------------------------------------------------ */

export interface GoverningMatterOption {
  readonly key: string;
  readonly label: string;
  /** What choosing it does, in plain terms. */
  readonly effect: string;
  readonly tradeoff: string;
  readonly personId: EntityId | null;
  readonly assessment: StaffAssessment | null;
}

export interface GoverningMatter {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly family: GoverningMatterFamily;
  readonly officeKey: string;
  readonly holderPersonId: EntityId;
  readonly openedAt: IsoDate;
  readonly deadline: IsoDate | null;
  readonly title: string;
  readonly ask: string;
  /** What happens if nobody decides by the deadline. */
  readonly ifIgnored: string;
  readonly options: readonly GoverningMatterOption[];
  readonly subjectKey: string | null;
  /** The real bill this matter is about, where a legislature filed one. */
  readonly measureId: EntityId | null;
  /** The adopted appropriation this matter commits, for a program matter. */
  readonly appropriationId: EntityId | null;
  readonly openedEvent: HistoricalEvent;
  readonly workItemId: EntityId | null;
  readonly decision: HistoricalEvent | null;
  readonly status: "open" | "decided" | "lapsed";
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function measureTitle(world: World, measureId: EntityId | null): string | null {
  if (!measureId) return null;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === measureId,
  );
  return measure ? `${measure.designation}, ${measure.shortTitle}` : null;
}

/** The person a clemency matter is about, by name. */
function petitionerLabel(world: World, event: HistoricalEvent): string {
  const personId = event.participants.find(
    (participant) => participant.role === "focus:candidate",
  )?.personId;
  const person = personId ? world.people[personId] : undefined;
  return person ? personName(person) : "someone under sentence";
}

function subjectLabel(subjectKey: string | null): string {
  return (
    (subjectKey ? programFamilyTitle(subjectKey) : null) ?? "the priority"
  ).toLowerCase();
}

const BUDGET_FLAT = "budget:hold-flat";

function optionsFor(
  world: World,
  family: GoverningMatterFamily,
  event: HistoricalEvent,
): readonly GoverningMatterOption[] {
  switch (family) {
    case "chief-of-staff":
      return event.participants
        .filter((participant) => participant.role === "focus:candidate")
        .flatMap(({ personId }) => {
          const person = world.people[personId];
          if (!person) return [];
          const assessment = staffAssessment(world, personId);
          const sitting = event.involvedEntityIds.some((organizationId) =>
            isSittingChief(world, organizationId, personId),
          );
          return [
            {
              key: `hire:${personId}`,
              label: `${sitting ? "Keep" : "Hire"} ${personName(person)}`,
              effect: sitting
                ? "Stays on as chief of staff from the last administration, recommends choices and can take matters you hand over."
                : "Becomes chief of staff, recommends choices and can take matters you hand over.",
              tradeoff: `${clause(assessment.background)}; ${assessment.strength}, but ${assessment.caution}.`,
              personId,
              assessment,
            },
          ];
        });
    case "agenda": {
      const keys = event.tags
        .filter((tag) => tag.startsWith("program:"))
        .map((tag) => tag.slice("program:".length));
      return [
        ...keys.flatMap((familyKey) => {
          const title = programFamilyTitle(familyKey);
          return title
            ? [
                {
                  key: `priority:${familyKey}`,
                  label: title,
                  effect: `Agencies are told ${title.toLowerCase()} comes first this year.`,
                  tradeoff:
                    "Staff time and attention go here before other requests.",
                  personId: null,
                  assessment: null,
                },
              ]
            : [];
        }),
        {
          key: "priority:none",
          label: "No single priority",
          effect: "Agencies keep their current plans.",
          tradeoff: "Nothing is disrupted, and nothing is pushed forward.",
          personId: null,
          assessment: null,
        },
      ];
    }
    case "budget": {
      const keys = event.tags
        .filter((tag) => tag.startsWith("program:"))
        .map((tag) => tag.slice("program:".length));
      return [
        ...keys.flatMap((familyKey) => {
          const title = programFamilyTitle(familyKey);
          return title
            ? [
                {
                  key: `budget:${familyKey}`,
                  label: `Put more into ${title.toLowerCase()}`,
                  effect: `The budget request asks for more for ${title.toLowerCase()}.`,
                  tradeoff:
                    "Other requests wait, and the governing body may cut it back.",
                  personId: null,
                  assessment: null,
                },
              ]
            : [];
        }),
        {
          key: BUDGET_FLAT,
          label: "Hold spending where it is",
          effect: "The budget you send keeps this year's priorities.",
          tradeoff: "Easier to pass, and nothing new gets done.",
          personId: null,
          assessment: null,
        },
      ];
    }
    case "program": {
      const appropriationId = tagValue(
        event,
        "appropriation:",
      ) as EntityId | null;
      const appropriation = (world.history.publicProgramRecords ?? []).find(
        (record): record is PublicProgramAppropriationRecord =>
          record.id === appropriationId && record.kind === "appropriation",
      );
      if (!appropriation) return [];
      return programAlternativesFor(world, appropriation)
        .filter((alternative) =>
          alternative.installments.every(
            (plan) =>
              addDays(world.currentDate, plan.afterDays) <=
              appropriation.availableThrough,
          ),
        )
        .map((alternative) => {
          const forecast = forecastProgramAlternative(
            world,
            appropriation,
            alternative,
          );
          return {
            key: `program:${alternative.key}`,
            label: alternative.title,
            effect: forecast.lines[0] ?? "Nothing is committed.",
            tradeoff:
              forecast.lines.slice(1).join(" ") ||
              "The rest of the appropriation stays uncommitted.",
            personId: null,
            assessment: null,
          };
        });
    }
    case "bill":
      return [
        {
          key: "bill:sign",
          label: "Sign it",
          effect: "It becomes law, and the agencies are told to carry it out.",
          tradeoff:
            "Its supporters are pleased; the work lands on your office.",
          personId: null,
          assessment: null,
        },
        {
          key: "bill:return",
          label: "Send it back unsigned",
          effect:
            "It goes back to the legislature, which may try to pass it over your objection.",
          tradeoff: "You stop it for now, and its supporters notice.",
          personId: null,
          assessment: null,
        },
      ];
    case "clemency": {
      const commutation = event.tags.includes(
        `${CLEMENCY_KIND_TAG}commutation`,
      );
      return [
        {
          key: CLEMENCY_GRANT,
          label: commutation ? "Shorten the sentence" : "Grant the pardon",
          effect: commutation
            ? "The jail term ends now."
            : "The sentence ends now and is forgiven.",
          tradeoff: "Mercy is noticed, and so is who received it.",
          personId: null,
          assessment: null,
        },
        {
          key: CLEMENCY_DENY,
          label: "Turn it down",
          effect: "The sentence stands as it was handed down.",
          tradeoff: "Nothing changes, and the person asking knows you said no.",
          personId: null,
          assessment: null,
        },
      ];
    }
    case "implementation":
      return [
        {
          key: "pace:fast",
          label: "Start now with existing staff",
          effect:
            "Work begins at once; a first report is due in about two months.",
          tradeoff: "Quicker, with a real chance of early problems.",
          personId: null,
          assessment: null,
        },
        {
          key: "pace:careful",
          label: "Plan it carefully first",
          effect:
            "Agencies plan before acting; a first report is due in about four months.",
          tradeoff: "Slower, and less likely to stumble.",
          personId: null,
          assessment: null,
        },
        {
          key: "pace:hold",
          label: "Hold it until the budget is settled",
          effect: "Nothing starts yet; the priority stays on the list.",
          tradeoff: "No risk now, and no progress to show.",
          personId: null,
          assessment: null,
        },
      ];
    case "executive-order":
      return [
        {
          key: "order:agency-instructions",
          label: "Direct an agency's internal work",
          effect:
            "Issue an order about how the executive branch carries out its work.",
          tradeoff: "The order applies only within the executive branch.",
          personId: null,
          assessment: null,
        },
        {
          key: "order:independent-policy",
          label: "Set a new public policy by order",
          effect:
            "Ask to create policy without a statute or delegated authority.",
          tradeoff:
            "The authority check will refuse this request and explain why.",
          personId: null,
          assessment: null,
        },
      ];
    case "regulation":
      return [
        {
          key: "regulation:issue",
          label: "Issue the delegated rule",
          effect:
            "Record an agency rule under the statute that delegates its terms.",
          tradeoff: "The rule must stay within the statute's recorded terms.",
          personId: null,
          assessment: null,
        },
      ];
    case "emergency":
      return [
        {
          key: "emergency:declare",
          label: "Declare an emergency",
          effect:
            "Record a temporary declaration for the crisis affecting this jurisdiction.",
          tradeoff:
            "It lasts only for the period allowed by the jurisdiction's rules.",
          personId: null,
          assessment: null,
        },
        {
          key: "emergency:decline",
          label: "Do not declare an emergency",
          effect: "Leave the existing response in place.",
          tradeoff: "The crisis continues without emergency powers.",
          personId: null,
          assessment: null,
        },
      ];
  }
}

const FAMILY_TEXT: Record<
  GoverningMatterFamily,
  {
    readonly title: (subject: string) => string;
    readonly ask: string;
    readonly ifIgnored: string;
  }
> = {
  "chief-of-staff": {
    title: () => "Choose a chief of staff",
    ask: "The office needs someone to run it day to day. Three people are available.",
    ifIgnored:
      "The office runs without a chief of staff. Nothing can be handed off, and every matter waits for you.",
  },
  agenda: {
    title: () => "Set the first priority",
    ask: "Agencies are asking what the officeholder wants done first.",
    ifIgnored: "Agencies keep their current plans. No priority is set.",
  },
  budget: {
    title: () => "Set the budget request",
    ask: "The budget office needs your priorities before the request goes to the legislature.",
    ifIgnored:
      "The budget office sends a request that keeps this year's priorities.",
  },
  bill: {
    title: (subject) => `A bill on ${subject} is on your desk`,
    ask: "The legislature passed it and sent it to you.",
    ifIgnored:
      "In this game, a bill the governor does not act on becomes law without a signature.",
  },
  program: {
    title: (subject) => `Commit the money adopted for ${subject}`,
    ask: "Money has been adopted for this. What it pays for, and when, is your decision.",
    ifIgnored:
      "Nothing is committed, and the money stays unspent until the appropriation lapses.",
  },
  clemency: {
    title: (subject) => `A request for clemency from ${subject}`,
    ask: "They are asking you to use the clemency power on their sentence.",
    ifIgnored:
      "The request goes unanswered, and the sentence stands as it was handed down.",
  },
  "executive-order": {
    title: (subject) => `Executive order: ${subject}`,
    ask: "Choose whether to direct the executive branch on a matter within your office's authority.",
    ifIgnored: "No executive order is issued.",
  },
  regulation: {
    title: (subject) => `Agency rule: ${subject}`,
    ask: "Review the proposed rule and decide whether to issue it under the law that delegated the details.",
    ifIgnored: "The proposed rule is not issued.",
  },
  emergency: {
    title: (subject) => `Emergency declaration: ${subject}`,
    ask: "A recorded crisis may allow a temporary emergency declaration under this jurisdiction's rules.",
    ifIgnored: "No emergency declaration is made.",
  },
  implementation: {
    title: (subject) => `Direct the agencies on ${subject}`,
    ask: "The agencies are ready to act on your priority and need to know how fast to move.",
    ifIgnored: "The work does not start, and the priority stays unstarted.",
  },
};

const DEADLINE_DAYS: Record<Exclude<GoverningMatterFamily, "bill">, number> = {
  "chief-of-staff": 21,
  agenda: 30,
  implementation: 30,
  budget: 30,
  program: 45,
  // PLACEHOLDER: no state gives a governor a deadline on a clemency request
  // that the game has read; this is how long it waits on the desk.
  clemency: 60,
  "executive-order": 21,
  regulation: 30,
  emergency: 7,
};

// Preserve the existing NPC review pace; this is not a legal action window.
const BILL_REVIEW_DAYS = 9;

function isFamily(value: string | null): value is GoverningMatterFamily {
  return value !== null && value in FAMILY_TEXT;
}

function matterFromEvent(
  world: World,
  event: HistoricalEvent,
): GoverningMatter | null {
  const family = tagValue(event, "matter-family:");
  const officeKey = tagValue(event, "office:");
  const deadline = tagValue(event, "deadline:");
  if (!isFamily(family) || !officeKey || (!deadline && family !== "bill"))
    return null;
  const holderPersonId = event.participants.find(
    (participant) => participant.role === "agency:officeholder",
  )?.personId;
  if (!holderPersonId) return null;
  const subjectKey = tagValue(event, "subject:");
  const measureId = tagValue(event, "measure:") as EntityId | null;
  const measure =
    family === "bill" && measureId
      ? world.history.legislativeMeasures?.find((m) => m.id === measureId)
      : undefined;
  const executiveWindow = measure
    ? executiveBillActionWindow(world, measure)
    : null;
  const appropriationId = tagValue(event, "appropriation:") as EntityId | null;
  // A commitment made through the public-program route already answers this
  // appropriation's matter. Its own saved record is the decision evidence;
  // the later NPC due item must not make another choice for the same money.
  // A decision to commit nothing answers only the matter it was made on: the
  // review a month later is a new question.
  const programCommitted =
    family === "program" &&
    appropriationId !== null &&
    hasProgramCommitment(world, appropriationId, event.sequence);
  const decision =
    world.history.events.find(
      (candidate) =>
        candidate.type === GOVERNING_MATTER_DECIDED &&
        candidate.tags.includes(`matter:${event.id}`),
    ) ?? null;
  const workItem =
    world.history.workItems.find(
      (item) => item.stableKey === `${event.stableKey}:work`,
    ) ?? null;
  const text = FAMILY_TEXT[family];
  return {
    id: event.id,
    stableKey: event.stableKey,
    family,
    officeKey,
    holderPersonId,
    openedAt: event.occurredAt,
    deadline:
      family === "bill"
        ? (executiveWindow?.lastActionDate ?? null)
        : makeIsoDate(deadline!),
    title: text.title(
      family === "clemency"
        ? petitionerLabel(world, event)
        : (measureTitle(world, measureId) ?? subjectLabel(subjectKey)),
    ),
    ask: text.ask,
    ifIgnored:
      family === "bill" && measureId
        ? executiveWindow
          ? executiveWindow.inactionOutcome === "becomes-law-without-signature"
            ? "After the pack's action window ends, the bill becomes law without your signature."
            : "The action window is known, but its inaction outcome is unsupported; the bill stays pending."
          : "No executable action window is established, so the bill waits on your desk."
        : text.ifIgnored,
    options: optionsFor(world, family, event),
    subjectKey,
    measureId,
    appropriationId,
    openedEvent: event,
    workItemId: workItem?.id ?? null,
    decision,
    status:
      !decision && !programCommitted
        ? "open"
        : decision?.tags.includes("choice:lapsed")
          ? "lapsed"
          : "decided",
  };
}

/**
 * Whether money was committed from this appropriation, or, when `since` is
 * given, whether any decision on it (committing nothing included) was saved
 * after that history sequence.
 */
function hasProgramCommitment(
  world: World,
  appropriationId: EntityId,
  since = Number.POSITIVE_INFINITY,
): boolean {
  return (
    world.history.publicProgramRecords?.some(
      (record) =>
        record.kind === "commitment" &&
        record.appropriationId === appropriationId &&
        (record.installments.length > 0 || record.sequence > since),
    ) ?? false
  );
}

export function governingMatters(
  world: World,
  officeKey?: string,
): readonly GoverningMatter[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === GOVERNING_MATTER_OPENED &&
        event.recordedAt <= world.currentDate &&
        (!officeKey || event.tags.includes(`office:${officeKey}`)),
    )
    .flatMap((event) => {
      const matter = matterFromEvent(world, event);
      return matter ? [matter] : [];
    });
}

export function governingMatterById(
  world: World,
  matterId: EntityId,
): GoverningMatter | null {
  const event = eventById(world, matterId);
  return event && event.type === GOVERNING_MATTER_OPENED
    ? matterFromEvent(world, event)
    : null;
}

/**
 * The office's assigned decision work is completed only by its own recorded
 * action. This receipt says nothing about money spent or service delivered.
 * A lapse remains a cancelled work item, not fulfillment of the assignment.
 */
export function completedGoverningMatterWork(
  world: World,
  matterId: EntityId,
): WorkItemStateRecord | null {
  const matter = governingMatterById(world, matterId);
  const decision = matter?.decision;
  if (
    !matter ||
    !decision ||
    !matter.workItemId ||
    matter.status !== "decided" ||
    decision.occurredAt > world.currentDate ||
    decision.recordedAt > world.currentDate ||
    decision.sequence <= matter.openedEvent.sequence ||
    !decision.tags.includes(`office:${matter.officeKey}`) ||
    !decision.tags.includes(`matter-family:${matter.family}`) ||
    !decision.participants.some(
      (row) => row.role === "agency:decider" && world.people[row.personId],
    )
  )
    return null;
  const work = world.history.workItems.find(
    (item) => item.id === matter.workItemId,
  );
  if (
    !work ||
    !work.sourceEntityIds.includes(matter.id) ||
    work.focus.kind !== "other" ||
    work.focus.sourceEntityId !== matter.id ||
    !world.history.workItemStates.some((state) => state.workItemId === work.id)
  )
    return null;
  const state = workItemState(world, work.id);
  return state.status === "completed" &&
    state.outcomeEventId === decision.id &&
    state.sequence > decision.sequence &&
    compareSimulationMoments(state.recordedAt, world.currentMoment) <= 0
    ? state
    : null;
}

function billOpposedByOwnParty(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
): boolean {
  if (!matter.measureId) return false;
  const own = ownPartyPassageVote(
    world,
    matter.measureId,
    publicPartyOf(world, office.holderPersonId),
  );
  return own.nay > own.yea;
}

/** The bank declares exact answers; a subject title supplies no political view. */
export function evaluateAgendaPriority(
  world: World,
  matter: GoverningMatter,
  personId: EntityId,
  advice?: {
    readonly optionKey: string;
    readonly reason: string;
    readonly eventId: EntityId;
  },
): DecisionEvaluation | null {
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || matter.family !== "agenda" || matter.options.length < 2)
    return null;
  const level =
    office.programOffice?.kind === "municipal"
      ? "local"
      : office.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
        ? "federal"
        : office.stateUsps
          ? "state"
          : null;
  if (!level) return null;
  const considerations: DecisionConsideration[] = [];
  for (const option of matter.options) {
    if (!option.key.startsWith("priority:") || option.key === "priority:none")
      continue;
    const familyKey = option.key.slice("priority:".length);
    const seen = new Set<string>();
    const answers = npcEligibleProgramConfigurations().flatMap((entry) => {
      if (entry.familyKey !== familyKey || entry.governmentLevel !== level)
        return [];
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === entry.propositionKey,
      );
      if (!proposition) return [];
      const key = `${proposition.id}:${entry.answer}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ propositionId: proposition.id, answer: entry.answer }];
    });
    const view = principleAnswersConsideration(world, personId, answers);
    if (view)
      considerations.push({
        ...view,
        stableKey: `agenda:${familyKey}:${view.stableKey}`,
        optionKey: option.key,
        direction: view.optionKey === "vote-yea" ? "supports" : "opposes",
        explanation:
          view.optionKey === "vote-yea"
            ? `The recorded principles support the bank's declared policy answers for ${option.label.toLowerCase()}.`
            : `The recorded principles oppose the bank's declared policy answers for ${option.label.toLowerCase()}.`,
      });
  }
  if (
    advice &&
    matter.options.some((option) => option.key === advice.optionKey)
  )
    considerations.push({
      stableKey: "governing:staff-advice",
      optionKey: advice.optionKey,
      sourceType: "context:staff-advice",
      direction: "supports",
      // The existing executive-bill evaluator gives staff advice this weight.
      importance: "slight",
      confidence: "medium",
      explanation: `The chief of staff advised it: ${advice.reason}`,
      sourceRefs: [{ kind: "historical-event", eventId: advice.eventId }],
    });
  if (!considerations.length) return null;
  const stableKey = `${matter.stableKey}:agenda:${personId}:${world.currentDate}:${createStableId("decision", JSON.stringify(considerations))}`;
  const saved = world.history.decisionTraces.find(
    (trace) => trace.context.stableKey === stableKey,
  );
  if (saved) return saved;
  return evaluateDecision(world, {
    stableKey,
    decisionType: "governing:agenda-priority",
    actorPersonId: personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:governing-matter",
      key: matter.stableKey,
      entityId: null,
    },
    options: matter.options.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.effect,
    })),
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

/** A tie or an unsupported zero is not the engine's alphabetical first option. */
function supportedAgendaOption(
  evaluation: DecisionEvaluation | null,
): string | null {
  if (!evaluation || evaluation.outcomeKind !== "selected") return null;
  const scores = evaluation.context.options.map((option) => ({
    key: option.key,
    score: evaluation.context.considerations
      .filter((reason) => reason.optionKey === option.key)
      .reduce((total, reason) => total + considerationScore(reason), 0),
  }));
  const selected = scores.find(
    (option) => option.key === evaluation.selectedOptionKey,
  );
  return selected &&
    selected.score > 0 &&
    scores.every(
      (option) => option.key === selected.key || option.score < selected.score,
    )
    ? selected.key
    : null;
}

/** What the chief of staff would do, with a reason; null without one. */
export function staffRecommendation(
  world: World,
  matter: GoverningMatter,
): {
  readonly optionKey: string;
  readonly byPersonId: EntityId;
  readonly reason: string;
  readonly evaluation?: DecisionEvaluation;
} | null {
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office) return null;
  const chief = chiefOfStaffFor(world, office);
  if (!chief || matter.options.length === 0) return null;
  const assessment = staffAssessment(world, chief);
  switch (matter.family) {
    // Clemency is the officeholder's own power; nobody decides it for them.
    case "chief-of-staff":
    case "clemency":
    case "executive-order":
    case "regulation":
    case "emergency":
      return null;
    case "agenda": {
      const priority = currentPriority(world, office);
      const recorded =
        matter.status === "decided" && priority
          ? matter.options.find(
              (option) => option.key === `priority:${priority}`,
            )
          : undefined;
      if (recorded)
        return {
          optionKey: recorded.key,
          byPersonId: chief,
          reason: "It matches the priority the officeholder already recorded.",
        };
      const evaluation = evaluateAgendaPriority(world, matter, chief);
      const optionKey = supportedAgendaOption(evaluation);
      if (!optionKey || !evaluation) return null;
      return {
        optionKey,
        byPersonId: chief,
        reason: evaluation.context.considerations.find(
          (reason) => reason.optionKey === optionKey,
        )!.explanation,
        evaluation,
      };
    }
    case "budget": {
      const priority = currentPriority(world, office);
      const match = priority
        ? matter.options.find((o) => o.key === `budget:${priority}`)
        : undefined;
      return match
        ? {
            optionKey: match.key,
            byPersonId: chief,
            reason: "It matches the priority you already set.",
          }
        : {
            optionKey: BUDGET_FLAT,
            byPersonId: chief,
            reason: "Nothing on the list is a stated priority yet.",
          };
    }
    case "bill":
      return matter.subjectKey &&
        currentPriority(world, office) === matter.subjectKey
        ? {
            optionKey: "bill:sign",
            byPersonId: chief,
            reason: "It moves the office's own priority.",
          }
        : // The chief reads the floor vote: a bill the governor's own party
          // voted down is one to send back; any other is not worth a fight.
          billOpposedByOwnParty(world, office, matter)
          ? {
              optionKey: "bill:return",
              byPersonId: chief,
              reason:
                "The governor's own party voted against it in the legislature.",
            }
          : {
              optionKey: "bill:sign",
              byPersonId: chief,
              reason: `${clause(assessment.background)}, and sees no reason to pick this fight.`,
            };
    case "program": {
      if (assessment.steadiness === null) return null;
      // The advice is about money that exists: a steady chief spreads it over
      // months; a cautious one waits. Either way it is one fallible view.
      const spread = matter.options.find(
        (option) => option.key === "program:operate-three-months",
      );
      const hold = matter.options.find(
        (option) => option.key === "program:no-action",
      );
      const pick =
        assessment.steadiness >= 2 ? (spread ?? hold) : (hold ?? spread);
      return pick
        ? {
            optionKey: pick.key,
            byPersonId: chief,
            reason:
              pick.key === "program:no-action"
                ? "Nothing here has to be committed this week, and the money keeps."
                : "Paying it out month by month keeps a failed payment from taking the whole year with it.",
          }
        : null;
    }
    case "implementation":
      if (assessment.steadiness === null) return null;
      return assessment.steadiness >= 2
        ? {
            optionKey: "pace:careful",
            byPersonId: chief,
            reason: "Would rather plan first than explain an early stumble.",
          }
        : {
            optionKey: "pace:fast",
            byPersonId: chief,
            reason: "Thinks the agencies are ready and delay costs momentum.",
          };
  }
}

/** The office's current first priority, from its latest agenda decision. */
export function currentPriority(
  world: World,
  office: GoverningOffice,
): string | null {
  const decision = [...world.history.events]
    .reverse()
    .find(
      (event) =>
        event.type === GOVERNING_MATTER_DECIDED &&
        event.tags.includes(`office:${office.officeKey}`) &&
        event.tags.includes("matter-family:agenda") &&
        event.involvedEntityIds.includes(office.holderPersonId),
    );
  const choice = decision ? tagValue(decision, "choice:priority:") : null;
  return choice && choice !== "none" ? choice : null;
}

function authorityJurisdictionForOffice(
  world: World,
  office: GoverningOffice,
): string | null {
  if (office.officeKey === "us-president") return "US";
  const holder = currentStateExecutiveHolders(world).find(
    (candidate) => candidate.personId === office.holderPersonId,
  );
  return holder ? `US-${holder.stateUsps}` : null;
}

/** Open an executive order on the office's existing governing inbox. */
export function openExecutiveOrderMatter(
  world: World,
  officeKey: string,
  input: {
    readonly instance: string;
    readonly subject: string;
    readonly subjectKey?: string;
    readonly sourceEventId: EntityId;
  },
): World {
  const office = governingOfficeByKey(world, officeKey);
  if (!office || !authorityJurisdictionForOffice(world, office)) return world;
  return openMatter(world, office, {
    family: "executive-order",
    instance: input.instance,
    titleSubject: input.subject,
    subjectKey: input.subjectKey ?? input.subject,
    sourceEventId: input.sourceEventId,
  });
}

/**
 * A recorded condition can prompt an NPC officeholder to issue an order. The
 * decision reads the recorded agenda priority and any principle answers the
 * caller can ground in the condition; the order still passes through this
 * office's shared matter records and authority check.
 */
export function considerExecutiveOrderCondition(
  world: World,
  officeKey: string,
  input: {
    readonly instance: string;
    readonly subject: string;
    readonly subjectKey: string;
    readonly sourceEventId: EntityId;
    readonly principleAnswers: readonly {
      readonly propositionId: EntityId;
      readonly answer: "yes" | "no";
    }[];
  },
): World {
  const office = governingOfficeByKey(world, officeKey);
  if (!office || !authorityJurisdictionForOffice(world, office)) return world;
  if (controlledPersonId(world) === office.holderPersonId)
    return openExecutiveOrderMatter(world, officeKey, input);

  const considerations: DecisionConsideration[] = [];
  const priority = currentPriority(world, office);
  if (priority)
    considerations.push({
      stableKey: `executive-order:priority:${office.officeKey}:${input.subjectKey}`,
      optionKey: "issue",
      sourceType: "context:agenda-priority",
      direction: priority === input.subjectKey ? "supports" : "opposes",
      importance: "strong",
      confidence: "high",
      explanation:
        priority === input.subjectKey
          ? "The recorded condition concerns the officeholder's first priority."
          : "The recorded condition concerns a different subject than the officeholder's first priority.",
      sourceRefs: [{ kind: "historical-event", eventId: input.sourceEventId }],
    });
  const principles = principleAnswersConsideration(
    world,
    office.holderPersonId,
    input.principleAnswers,
  );
  if (principles)
    considerations.push({
      ...principles,
      stableKey: `executive-order:${principles.stableKey}`,
      optionKey: principles.optionKey === "vote-yea" ? "issue" : "pass",
      direction: principles.optionKey === "vote-yea" ? "supports" : "opposes",
      explanation:
        principles.optionKey === "vote-yea"
          ? `The officeholder's recorded principles support action on ${input.subject}.`
          : `The officeholder's recorded principles oppose action on ${input.subject}.`,
    });
  const stableKey = `${STATE_GOVERNING_VERSION}:${office.officeKey}:${office.termId}:executive-order-decision:${input.instance}`;
  const saved = world.history.decisionTraces.find(
    (trace) => trace.context.stableKey === stableKey,
  );
  if (saved) return world;
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "governing:executive-order-condition",
    actorPersonId: office.holderPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:governing-matter",
      key: `${office.officeKey}:${input.subjectKey}`,
      entityId: null,
    },
    options: [
      {
        key: "issue",
        label: "Issue the executive order",
        description: `Direct the executive branch on ${input.subject}.`,
      },
      {
        key: "pass",
        label: "Take no action by order",
        description: "Leave the executive branch's existing work in place.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const traced = recordDurableDecisionTrace(world, evaluation);
  if (
    evaluation.outcomeKind !== "selected" ||
    evaluation.selectedOptionKey !== "issue"
  )
    return traced;
  const opened = openExecutiveOrderMatter(traced, officeKey, input);
  const matter = governingMatters(opened, officeKey).find(
    (candidate) =>
      candidate.family === "executive-order" &&
      candidate.stableKey.endsWith(`:executive-order:${input.instance}`),
  );
  const orderOption = matter?.options.find(
    (option) => option.key === "order:agency-instructions",
  );
  return matter && orderOption
    ? recordDecision(
        opened,
        matter,
        orderOption,
        "officeholder",
        office.holderPersonId,
        `The recorded condition concerns ${input.subject}, and the officeholder's priority and principles support directing the agency.`,
      )
    : opened;
}

/** Delegated rule drafts matching the office's agenda priority come first. */
export function orderDelegatedRuleDrafts<
  T extends { readonly subjectKey: string },
>(world: World, officeKey: string, drafts: readonly T[]): readonly T[] {
  const office = governingOfficeByKey(world, officeKey);
  const priority = office ? currentPriority(world, office) : null;
  return priority
    ? [...drafts].sort(
        (left, right) =>
          Number(right.subjectKey === priority) -
          Number(left.subjectKey === priority),
      )
    : drafts;
}

export interface DelegatedRuleDraftMatterInput {
  readonly instance: string;
  readonly subjectKey: string;
  readonly title: string;
  readonly sourceEventId: EntityId;
  readonly measureId: EntityId;
}

/** Open delegated-rule work on the shared inbox in the office's priority order. */
export function openDelegatedRuleDraftMatters(
  world: World,
  officeKey: string,
  drafts: readonly DelegatedRuleDraftMatterInput[],
): World {
  const office = governingOfficeByKey(world, officeKey);
  if (!office) return world;
  return orderDelegatedRuleDrafts(world, officeKey, drafts).reduce(
    (next, draft) =>
      openMatter(next, office, {
        family: "regulation",
        instance: `delegation:${draft.instance}`,
        subjectKey: draft.subjectKey,
        titleSubject: draft.title,
        sourceEventId: draft.sourceEventId,
        measureId: draft.measureId,
      }),
    world,
  );
}

export type ExecutiveEnforcementPriority = "first" | "ordinary" | "lowest";

/** An officeholder's recorded priority changes which law agencies enforce first. */
export function enforcementPriorityForLaw(
  world: World,
  officeKey: string,
  subjectKey: string,
): ExecutiveEnforcementPriority {
  const office = governingOfficeByKey(world, officeKey);
  const priority = office ? currentPriority(world, office) : null;
  if (!priority) return "ordinary";
  return subjectKey === priority ? "first" : "lowest";
}

/* ------------------------------------------------------------------ *
 * Opening matters
 * ------------------------------------------------------------------ */

function emptyContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}

export function createCandidates(
  world: World,
  office: Pick<GoverningOffice, "holderPersonId" | "jurisdictionId">,
  matterKey: string,
  count: number,
): { world: World; personIds: EntityId[] } {
  let next = world;
  const personIds: EntityId[] = [];
  const anchorYear = Number(world.currentDate.slice(0, 4));
  for (let index = 0; index < count; index += 1) {
    const stableKey = `${matterKey}:candidate:${index}`;
    const rng = new SeededRng(world.seed).fork(stableKey);
    next = applyCharacterHistoryPlan(next, {
      stableKey,
      mode: "quick-generated",
      personId: office.holderPersonId,
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey,
            ...drawCanonicalNamedIdentity(
              rng.fork("name"),
              generatePersonIdentity(rng.fork("identity")),
            ),
            birthDate: inventedPersonBirthDate(rng, {
              role: "appointment-candidate",
              referenceDate: makeIsoDate(`${anchorYear}-01-01`),
            }),
            homeJurisdictionId: office.jurisdictionId,
          },
        },
      ],
    }).world;
    const personId = createStableId(
      "person",
      `${next.id}:life-context-v1:${stableKey}`,
    );
    // Offering a candidate supplies no career or degree. The assessment reads
    // existing records and names absent experience as absent evidence.
    personIds.push(personId);
  }
  return { world: next, personIds };
}

interface OpenMatterInput {
  readonly family: GoverningMatterFamily;
  readonly instance: string;
  readonly candidatePersonIds?: readonly EntityId[];
  readonly programKeys?: readonly string[];
  readonly subjectKey?: string | null;
  readonly sourceEventId?: EntityId | null;
  readonly measureId?: EntityId | null;
  readonly appropriationId?: EntityId | null;
  /** What the title is about, where it is not a measure or a program. */
  readonly titleSubject?: string;
  readonly extraTags?: readonly string[];
}

function matterStableKey(
  office: GoverningOffice,
  family: GoverningMatterFamily,
  instance: string,
): string {
  return `${STATE_GOVERNING_VERSION}:${office.officeKey}:${office.termId}:${family}:${instance}`;
}

function openMatter(
  world: World,
  office: GoverningOffice,
  input: OpenMatterInput,
): World {
  const stableKey = matterStableKey(office, input.family, input.instance);
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const measure =
    input.family === "bill" && input.measureId
      ? world.history.legislativeMeasures?.find((m) => m.id === input.measureId)
      : undefined;
  const executiveWindow = measure
    ? executiveBillActionWindow(world, measure)
    : null;
  const deadline =
    input.family === "bill"
      ? (executiveWindow?.lastActionDate ?? null)
      : addDays(world.currentDate, DEADLINE_DAYS[input.family]);
  const text = FAMILY_TEXT[input.family];
  const title = text.title(
    input.titleSubject ??
      measureTitle(world, input.measureId ?? null) ??
      subjectLabel(input.subjectKey ?? null),
  );
  let next = recordWorldEvent(world, {
    stableKey,
    type: GOVERNING_MATTER_OPENED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      office.holderPersonId,
      ...(office.organizationId ? [office.organizationId] : []),
      ...(input.candidatePersonIds ?? []),
    ],
    participants: [
      {
        personId: office.holderPersonId,
        role: "agency:officeholder",
        detail: office.title,
      },
      ...(input.candidatePersonIds ?? []).map((personId) => ({
        personId,
        role: "focus:candidate" as const,
        detail: null,
      })),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      STATE_GOVERNING_VERSION,
      `matter-family:${input.family}`,
      `office:${office.officeKey}`,
      ...(deadline ? [`deadline:${deadline}`] : []),
      ...(input.subjectKey ? [`subject:${input.subjectKey}`] : []),
      ...(input.sourceEventId ? [`source-event:${input.sourceEventId}`] : []),
      ...(input.measureId ? [`measure:${input.measureId}`] : []),
      ...(input.appropriationId
        ? [`appropriation:${input.appropriationId}`]
        : []),
      ...(input.programKeys ?? []).map((key) => `program:${key}`),
      ...(input.extraTags ?? []),
    ],
    summary: `${office.title}: ${title}.`,
    context: emptyContext(),
  });
  const opened = next.history.events.at(-1)!;
  if (
    measure &&
    executiveWindow &&
    executiveWindow.inactionAt > next.currentDate
  ) {
    next = scheduleFutureDueItem(next, {
      stableKey: `${stableKey}:deadline`,
      dueAt:
        executiveWindow.inactionAt < next.currentDate
          ? next.currentDate
          : executiveWindow.inactionAt,
      transitionKey: GOVERNING_DEADLINE,
      entityIds: [opened.id],
      jurisdictionId: office.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [opened.id] },
    });
  }
  if (office.controlledByPlayer) {
    next = createWorkItem(next, {
      stableKey: `${stableKey}:work`,
      title,
      summary: text.ask,
      jurisdictionId: office.jurisdictionId,
      sourceEntityIds: [opened.id],
      focus: {
        kind: "other",
        targetKey: `governing-matter:${opened.id}`,
        sourceEntityId: opened.id,
      },
      effort: null,
      access: { kind: "private", personIds: [office.holderPersonId] },
      assignedPersonIds: [office.holderPersonId],
      playerRequirement: "decision",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
    // A real bill lapses only through an executable, declared legal window.
    if (input.family === "bill") return next;
    return scheduleFutureDueItem(next, {
      stableKey: `${stableKey}:deadline`,
      dueAt: deadline!,
      transitionKey: GOVERNING_DEADLINE,
      entityIds: [opened.id],
      jurisdictionId: office.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [opened.id] },
    });
  }
  if (
    measure &&
    executiveWindow &&
    world.currentDate > executiveWindow.lastActionDate
  )
    return next;
  // Keep the existing workflow interval, bounded by the actual legal last day.
  const workflowDate = addDays(
    world.currentDate,
    input.family === "bill"
      ? BILL_REVIEW_DAYS
      : Math.max(3, DEADLINE_DAYS[input.family] - 1),
  );
  const npcDate =
    executiveWindow && executiveWindow.lastActionDate < workflowDate
      ? executiveWindow.lastActionDate
      : workflowDate;
  return scheduleFutureDueItem(next, {
    stableKey: `${stableKey}:npc`,
    dueAt:
      npcDate <= world.currentDate ? addDays(world.currentDate, 1) : npcDate,
    transitionKey: GOVERNING_NPC_DECISION,
    entityIds: [opened.id],
    jurisdictionId: office.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [opened.id] },
  });
}

/**
 * A request for clemency on the officeholder's desk, opened by the clemency
 * route (`justice/clemency.ts`) when the law needs this office's answer. The
 * player decides it; a governor the game plays decides it on their own
 * principles, relationships and calendar. Idempotent on the instance.
 */
export function openClemencyMatter(
  world: World,
  officeKey: string,
  input: {
    readonly instance: string;
    readonly petitionEventId: EntityId;
    readonly petitionerId: EntityId;
    readonly kind: "pardon" | "commutation";
  },
): World {
  const office = governingOfficeByKey(world, officeKey);
  const petitioner = world.people[input.petitionerId];
  if (!office || !petitioner) return world;
  return openMatter(world, office, {
    family: "clemency",
    instance: input.instance,
    candidatePersonIds: [input.petitionerId],
    sourceEventId: input.petitionEventId,
    titleSubject: personName(petitioner),
    extraTags: [`${CLEMENCY_KIND_TAG}${input.kind}`],
  });
}

/**
 * The first days in office: the office needs a chief of staff and a first
 * priority. Opened once per term, the day after entry.
 */
export function openTransitionMatters(world: World, officeKey: string): World {
  const office = governingOfficeByKey(world, officeKey);
  if (!office || !office.organizationId) return world;
  const key = matterStableKey(office, "chief-of-staff", "transition");
  if (world.history.events.some((event) => event.stableKey === key))
    return world;
  // The office's positions exist before anybody is hired into them: that is
  // what makes an unfilled one findable by somebody looking for the work.
  const staffed = establishOfficeStaffPositions(world, office);
  const candidates = createCandidates(staffed.world, office, key, 3);
  // A chief of staff who served the last holder is still employed; the new
  // holder keeps them or replaces them, and does not end up with two.
  const sitting = chiefOfStaffFor(staffed.world, office);
  let next = openMatter(candidates.world, office, {
    family: "chief-of-staff",
    instance: "transition",
    candidatePersonIds: sitting
      ? [sitting, ...candidates.personIds]
      : candidates.personIds,
  });
  // The content bank supplies the available subjects. A draw must not hide
  // the one subject the holder's or chief's recorded principles support.
  const programKeys = PROGRAM_FAMILIES.map((family) => family.familyKey);
  next = openMatter(next, office, {
    family: "agenda",
    instance: "first-year",
    programKeys,
  });
  // Money the government has already adopted is waiting for this office.
  return openProgramMatters(next, office);
}

/* ------------------------------------------------------------------ *
 * Deciding
 * ------------------------------------------------------------------ */

/**
 * Every appropriation this office could still commit gets one matter. The
 * money exists because a measure enacted it; the decision is what it pays for.
 */
export function openProgramMatters(
  world: World,
  office: GoverningOffice,
  identity?: PublicGovernmentIdentity,
): World {
  let next = world;
  for (const appropriation of openAppropriationsFor(
    world,
    office.jurisdictionId,
    identity,
  )) {
    next = openProgramMatter(next, office, appropriation);
  }
  return next;
}

function openProgramMatter(
  world: World,
  office: GoverningOffice,
  appropriation: PublicProgramAppropriationRecord,
): World {
  if (hasProgramCommitment(world, appropriation.id)) return world;
  if (world.currentDate < appropriation.availableFrom)
    return scheduleProgramAvailability(world, appropriation);
  const instance = programMatterInstance(world, office, appropriation);
  if (!instance) return world;
  const authority = programAuthority(
    world,
    office.holderPersonId,
    office.programOffice ?? { kind: "state-executive" },
    appropriation,
  );
  if (authority.status !== "available") return world;
  return openMatter(world, office, {
    family: "program",
    instance,
    appropriationId: appropriation.id,
    subjectKey: appropriation.programKey.split(":")[0] ?? null,
  });
}

/**
 * Which program question this office should be asked about this money now,
 * or null when none is due. The first is asked once the money is available.
 * An office that committed nothing, or let the question lapse, is asked again
 * PROGRAM_REVIEW_DAYS after that decision, for as long as uncommitted money
 * remains and the appropriation has not lapsed: "Commit nothing for now" is
 * not a decision never to spend it.
 */
function programMatterInstance(
  world: World,
  office: GoverningOffice,
  appropriation: PublicProgramAppropriationRecord,
): string | null {
  const base = `appropriation:${appropriation.id}`;
  let instance = base;
  for (;;) {
    const key = matterStableKey(office, "program", instance);
    const opened = world.history.events.some(
      (event) =>
        event.type === GOVERNING_MATTER_OPENED && event.stableKey === key,
    );
    if (!opened) return instance;
    const decided = world.history.events.find(
      (event) =>
        event.type === GOVERNING_MATTER_DECIDED &&
        event.stableKey === `${key}:decided`,
    );
    if (!decided) return null;
    const reviewOn = programReviewDate(decided.occurredAt);
    if (world.currentDate < reviewOn) return null;
    instance = `${base}:review:${reviewOn}`;
  }
}

/** A month after an office commits nothing, the money is put to it again. */
const PROGRAM_REVIEW_DAYS = 30;

function programReviewDate(decidedOn: IsoDate): IsoDate {
  return addDays(decidedOn, PROGRAM_REVIEW_DAYS);
}

function scheduleProgramAvailability(
  world: World,
  appropriation: PublicProgramAppropriationRecord,
  dueAt: IsoDate = appropriation.availableFrom,
): World {
  const stableKey =
    dueAt === appropriation.availableFrom
      ? `${STATE_GOVERNING_VERSION}:program-available:${appropriation.id}`
      : `${STATE_GOVERNING_VERSION}:program-review:${appropriation.id}:${dueAt}`;
  return world.history.futureDueItems.some((due) => due.stableKey === stableKey)
    ? world
    : scheduleFutureDueItem(world, {
        stableKey,
        dueAt,
        transitionKey: GOVERNING_PROGRAM_AVAILABLE,
        entityIds: [appropriation.eventId],
        jurisdictionId: appropriation.jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [appropriation.eventId],
        },
      });
}

/** Open adopted money for its current authorized holder on the normal clock. */
export function openProgramMattersForAllOffices(
  world: World,
  onlyRecordIds?: ReadonlySet<EntityId>,
): World {
  let next = world;
  for (const appropriation of world.history.publicProgramRecords ?? []) {
    if (
      appropriation.kind !== "appropriation" ||
      (onlyRecordIds && !onlyRecordIds.has(appropriation.id))
    )
      continue;
    if (next.currentDate < appropriation.availableFrom) {
      // The holder may change before money becomes available. Schedule the
      // opening, then resolve the current authorized office on that date.
      // This comes before the open-money test, which counts only money
      // already available: asked first, it skipped every law with a later
      // effective date, and that money never reached an office.
      next = scheduleProgramAvailability(next, appropriation);
      continue;
    }
    const identity = publicGovernmentIdentityForRecord(appropriation);
    if (
      !openAppropriationsFor(
        world,
        appropriation.jurisdictionId,
        identity,
      ).some((record) => record.id === appropriation.id)
    )
      continue;
    const office = programOfficeForAppropriation(next, appropriation);
    if (!office) continue;
    next = openProgramMatter(next, office, appropriation);
  }
  return next;
}

export function governingProgramAvailableHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const appropriation = (world.history.publicProgramRecords ?? []).find(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" && due.entityIds.includes(record.eventId),
  );
  if (!appropriation)
    return resolved(world, "The appropriation for this date is unavailable.");
  return resolved(
    openProgramMattersForAllOffices(world, new Set([appropriation.id])),
    "Available appropriations reached their current offices.",
  );
}

export type GoverningDecisionMode = "player" | "delegated" | "officeholder";

function completeWork(
  world: World,
  matter: GoverningMatter,
  outcomeEventId: EntityId,
  status: "completed" | "cancelled",
): World {
  if (!matter.workItemId) return world;
  const previous = workItemState(world, matter.workItemId);
  if (previous.status === "completed" || previous.status === "cancelled")
    return world;
  const stableKey = `${matter.stableKey}:work:${status}`;
  const state: WorkItemStateRecord = {
    ...previous,
    id: createStableId("work-item-state", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentMoment,
    status,
    playerRequirement: "none",
    waitingOnPersonIds: [],
    blocker: null,
    outcomeEventId,
    supersedesStateId: previous.id,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [...world.history.workItemStates, state],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function decisionSummary(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
  option: GoverningMatterOption | null,
): { summary: string; visibility: "public" | "limited" } {
  const holder = world.people[office.holderPersonId];
  const who = holder ? personName(holder) : office.title;
  if (!option)
    return {
      summary:
        matter.family === "bill"
          ? `A bill on ${subjectLabel(matter.subjectKey)} became law without the signature of ${who}, ${office.title}.`
          : `${matter.title}: no decision was made by the deadline. ${matter.ifIgnored}`,
      visibility: matter.family === "bill" ? "public" : "limited",
    };
  switch (matter.family) {
    case "chief-of-staff": {
      const hired = option.personId ? world.people[option.personId] : null;
      if (
        hired &&
        office.organizationId &&
        isSittingChief(world, office.organizationId, option.personId!)
      )
        return {
          summary: `${who}, ${office.title}, kept ${personName(hired)} on as chief of staff.`,
          visibility: "public",
        };
      return {
        summary: `${who}, ${office.title}, named ${hired ? personName(hired) : "a new"} chief of staff.`,
        visibility: "public",
      };
    }
    case "agenda":
      return option.key === "priority:none"
        ? {
            summary: `${who}, ${office.title}, left agency plans as they were.`,
            visibility: "limited",
          }
        : {
            summary: `${who}, ${office.title}, made ${option.label.toLowerCase()} the office's first priority.`,
            visibility: "public",
          };
    case "budget":
      return option.key === BUDGET_FLAT
        ? {
            summary: `${who}, ${office.title}, sent the legislature a budget that holds spending where it is.`,
            visibility: "public",
          }
        : {
            summary: `${who}, ${office.title}, asked the legislature for more money for ${subjectLabel(option.key.slice("budget:".length))}.`,
            visibility: "public",
          };
    case "bill":
      return option.key === "bill:sign"
        ? {
            summary: `${who}, ${office.title}, signed ${measureTitle(world, matter.measureId) ?? `a bill on ${subjectLabel(matter.subjectKey)}`} into law.`,
            visibility: "public",
          }
        : {
            summary: `${who}, ${office.title}, ${matter.measureId ? `vetoed ${measureTitle(world, matter.measureId) ?? "the bill"}` : `sent back a bill on ${subjectLabel(matter.subjectKey)} unsigned`}.`,
            visibility: "public",
          };
    case "program":
      return option.key === "program:no-action"
        ? {
            summary: `${who}, ${office.title}, committed none of the money adopted for ${subjectLabel(matter.subjectKey)} yet.`,
            visibility: "limited",
          }
        : {
            summary: `${who}, ${office.title}, committed money adopted for ${subjectLabel(matter.subjectKey)}: ${option.label.toLowerCase()}.`,
            visibility: "public",
          };
    case "clemency": {
      const petitioner = petitionerLabel(world, matter.openedEvent);
      return option.key === CLEMENCY_GRANT
        ? {
            summary: `${who}, ${office.title}, agreed to a request for clemency from ${petitioner}.`,
            visibility: "limited",
          }
        : {
            summary: `${who}, ${office.title}, turned down a request for clemency from ${petitioner}.`,
            visibility: "limited",
          };
    }
    case "implementation":
      return option.key === "pace:hold"
        ? {
            summary: `${office.title} held work on ${subjectLabel(matter.subjectKey)} until the budget is settled.`,
            visibility: "limited",
          }
        : {
            summary: `${office.title} directed agencies to begin work on ${subjectLabel(matter.subjectKey)}.`,
            visibility: "public",
          };
    case "executive-order": {
      const jurisdictionKey = authorityJurisdictionForOffice(world, office);
      const clause =
        option.key === "order:independent-policy"
          ? ({
              kind: "independent-policy",
              topicKey: matter.subjectKey ?? "unspecified-policy",
            } as const)
          : ({
              kind: "executive-branch-management",
              topicKey: "agency-instructions",
            } as const);
      const authority = jurisdictionKey
        ? decideExecutiveActionAuthority(
            executiveRulePackForJurisdiction(jurisdictionKey),
            clause,
            null,
          )
        : {
            allowed: false,
            reason: "This office has no recorded executive-order authority.",
          };
      return authority.allowed
        ? {
            summary: `${who}, ${office.title}, directed an agency's internal work by executive order.`,
            visibility: "public",
          }
        : {
            summary: `${who}, ${office.title}, requested an executive order on ${matter.subjectKey ?? "this matter"}. The request was refused: ${authority.reason}`,
            visibility: "limited",
          };
    }
    case "regulation":
      return {
        summary: `${who}, ${office.title}, reviewed the proposed rule: ${option.label.toLowerCase()}.`,
        visibility: "public",
      };
    case "emergency":
      return option.key === "emergency:declare"
        ? {
            summary: `${who}, ${office.title}, declared an emergency for ${matter.subjectKey ?? "the recorded crisis"}.`,
            visibility: "public",
          }
        : {
            summary: `${who}, ${office.title}, declined to declare an emergency for ${matter.subjectKey ?? "the recorded crisis"}.`,
            visibility: "public",
          };
  }
}

function applyConsequence(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
  option: GoverningMatterOption | null,
  decisionEventId: EntityId,
  billReasons?: string,
  itemSelection?: ExecutiveItemVetoSelection,
): World {
  if (!option) {
    if (matter.family === "bill" && matter.measureId) return world;
    // Legacy abstract matters retain their existing agency workflow.
    return matter.family === "bill" && matter.subjectKey
      ? openMatter(world, office, {
          family: "implementation",
          instance: `law:${matter.id}`,
          subjectKey: matter.subjectKey,
          sourceEventId: decisionEventId,
        })
      : world;
  }
  switch (matter.family) {
    // The grant itself is written by the clemency route, which reads this
    // decision on its own clock with every other body's answer.
    case "clemency":
      return world;
    case "executive-order": {
      const jurisdictionKey = authorityJurisdictionForOffice(world, office);
      if (!jurisdictionKey) return world;
      const pack = executiveRulePackForJurisdiction(jurisdictionKey);
      const clause =
        option.key === "order:independent-policy"
          ? ({
              kind: "independent-policy",
              topicKey: matter.subjectKey ?? "unspecified-policy",
            } as const)
          : ({
              kind: "executive-branch-management",
              topicKey: "agency-instructions",
            } as const);
      const authority = decideExecutiveActionAuthority(pack, clause, null);
      if (!authority.allowed) return world;
      const instrumentKey = `${matter.stableKey}:instrument`;
      const next = issueExecutiveInstrument(world, {
        stableKey: instrumentKey,
        jurisdictionKey,
        jurisdictionId: office.jurisdictionId,
        legislativeRulePackId: legislatureProfilePackId(jurisdictionKey),
        instrument: "executive-order",
        designation: `Executive Order ${
          (world.history.legislativeMeasures ?? []).filter(
            (measure) =>
              measure.governmentInstrument === "executive-order" &&
              measure.jurisdictionId === office.jurisdictionId,
          ).length + 1
        }`,
        shortTitle: matter.title,
        summary: option.effect,
        actorLabel: pack.displayName,
        actorPersonId: office.holderPersonId,
        rationale: billReasons?.trim() || option.effect,
        sourceDocumentKey: `session9:executive-order:${jurisdictionKey}:${matter.subjectKey ?? matter.id}`,
        publishedAt: world.currentDate,
        effectiveAt: world.currentDate,
        expiresAt: null,
        propositionIds: [],
        propositionAnswers: [],
        authorityChecks: [{ clause }],
      });
      return next;
    }
    case "regulation":
    case "emergency":
      // Their canonical writers are added by the regulation and emergency
      // steps; these families already share this inbox and decision record.
      return world;
    case "chief-of-staff": {
      if (!office.organizationId) return world;
      if (!option.personId || !world.people[option.personId]) return world;
      if (isSittingChief(world, office.organizationId, option.personId))
        return world;
      // Whoever held the job before leaves it when somebody else is hired.
      let replaced = world;
      for (const departing of chiefOfStaffWork(world, office.organizationId)) {
        const status = workStatusAt(replaced, departing.workId);
        if (!status) continue;
        replaced = recordWorkStatus(replaced, {
          stableKey: `${matter.stableKey}:replaced:${departing.personId}`,
          workRelationshipId: departing.workId,
          effectiveAt: replaced.currentDate,
          status: "ended",
          reason: "Replaced as chief of staff by the new officeholder.",
          supersedesStatusId: status.id,
          provenance: { kind: "simulated-event", eventId: decisionEventId },
        });
      }
      const workStableKey = `${matter.stableKey}:hire`;
      const employed = createWorkRelationship(replaced, {
        stableKey: workStableKey,
        personId: option.personId,
        organizationId: office.organizationId,
        startedAt: world.currentDate,
        initialStatus: "active",
        kind: "employment:executive-staff",
        compensation: "paid",
        authority: "directs-others",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "simulated-event", eventId: decisionEventId },
        initialRole: {
          title: "Chief of Staff",
          occupationClassification: CHIEF_OF_STAFF_CLASSIFICATION,
          locationJurisdictionId: office.jurisdictionId,
          timeDemand: {
            expectedWeekly: { minimumHours: 45, maximumHours: 60 },
            attention: "high",
            concurrency: "mostly-exclusive",
            scheduleRigidity: "mixed",
            interruptibility: "limited",
            locationJurisdictionId: office.jurisdictionId,
          },
        },
      });
      // The employment is the job; the incumbency is which authorized
      // position it fills. An office whose positions were never authorized
      // keeps the employment and records no incumbency.
      const work = employed.history.workRelationships.find(
        (relationship) => relationship.stableKey === workStableKey,
      );
      return work
        ? recordOfficeStaffIncumbency(employed, office, {
            classKey: "office-chief-of-staff",
            workRelationshipId: work.id,
            note: "Hired into the office's chief of staff position at the transition.",
          }).world
        : employed;
    }
    case "agenda": {
      if (option.key === "priority:none") return world;
      const subjectKey = option.key.slice("priority:".length);
      return openMatter(world, office, {
        family: "implementation",
        instance: subjectKey,
        subjectKey,
        sourceEventId: decisionEventId,
      });
    }
    case "budget":
      return scheduleFollowUp(world, office, matter, decisionEventId, 90);
    case "bill": {
      if (matter.measureId) {
        // A real bill: the decision is the governor's legislative act, and
        // what follows (enactment, or the legislature's override) runs
        // through the legislature's own steps.
        const signed = option.key === "bill:sign";
        const municipalKey = tagValue(
          matter.openedEvent,
          "municipal-government:",
        );
        if (municipalKey) {
          const measure = world.history.legislativeMeasures?.find(
            (entry) => entry.id === matter.measureId,
          );
          return measure
            ? recordCouncilExecutiveDecision(
                world,
                decodeURIComponent(municipalKey),
                measure,
                signed ? "signed" : "vetoed",
                billReasons?.trim() ||
                  (signed
                    ? "The executive signed the council act."
                    : "The executive returned the council act with reasons for disapproval."),
                office.holderPersonId,
              )
            : world;
        }
        let next = recordGovernorDecisionOnMeasure(
          world,
          matter.measureId,
          signed ? "signed" : "vetoed",
          signed
            ? "The executive signed the bill."
            : "The executive vetoed the bill and returned it.",
          office.holderPersonId,
        );
        // A signing governor with an item veto strikes the floor-added
        // sections they cannot accept (Build 25 step 5).
        if (signed)
          next = applyItemVetoes(
            next,
            matter.measureId,
            office.holderPersonId,
            itemSelection,
          );
        next = scheduleInstitutionStep(next, matter.measureId);
        return signed && office.organizationId
          ? openMatter(next, office, {
              family: "implementation",
              instance: `law:${matter.id}`,
              subjectKey: matter.subjectKey,
              measureId: matter.measureId,
              sourceEventId: decisionEventId,
            })
          : next;
      }
      return option.key === "bill:sign"
        ? openMatter(world, office, {
            family: "implementation",
            instance: `law:${matter.id}`,
            subjectKey: matter.subjectKey,
            sourceEventId: decisionEventId,
          })
        : scheduleFollowUp(world, office, matter, decisionEventId, 21);
    }
    case "program": {
      const appropriation = (world.history.publicProgramRecords ?? []).find(
        (record): record is PublicProgramAppropriationRecord =>
          record.id === matter.appropriationId &&
          record.kind === "appropriation",
      );
      if (!appropriation) return world;
      const alternative = programAlternativesFor(world, appropriation).find(
        (candidate) => `program:${candidate.key}` === option.key,
      );
      if (!alternative) return world;
      // A standing service program with no lawful provider on record stays
      // unsupported: nothing is committed and no provider is made up.
      const paysOperator = alternative.installments.length > 0;
      const unsupported = standingProgramUnsupported(
        world,
        appropriation.programKey,
        appropriation.jurisdictionId,
      );
      const operator = unsupported
        ? null
        : programOperatorOrganization(
            world,
            appropriation.programKey,
            appropriation.jurisdictionId,
            publicGovernmentIdentityForRecord(appropriation),
          );
      const committed =
        paysOperator && !operator
          ? ({ ok: false } as const)
          : commitPublicProgram(operator?.world ?? world, {
              appropriationId: appropriation.id,
              alternative,
              personId: office.holderPersonId,
              office: office.programOffice ?? { kind: "state-executive" },
              recipientOrganizationId:
                paysOperator && operator ? operator.organizationId : null,
            });
      // A refusal is truthful: the money stays uncommitted and the office is
      // told why through the decision record already written.
      const next = committed.ok ? committed.world : world;
      // Money left uncommitted comes back to the office a month later while
      // the appropriation can still be spent.
      const reviewOn = programReviewDate(next.currentDate);
      return hasProgramCommitment(next, appropriation.id) ||
        reviewOn > appropriation.availableThrough
        ? next
        : scheduleProgramAvailability(next, appropriation, reviewOn);
    }
    case "implementation": {
      if (option.key === "pace:hold") return world;
      const days = option.key === "pace:fast" ? 60 : 120;
      return scheduleFutureDueItem(world, {
        stableKey: `${matter.stableKey}:report`,
        dueAt: addDays(world.currentDate, days),
        transitionKey: GOVERNING_FOLLOW_UP,
        entityIds: [matter.id, decisionEventId].sort(),
        jurisdictionId: office.jurisdictionId,
        provenance: {
          kind: "simulated",
          sourceEntityIds: [matter.id, decisionEventId].sort(),
        },
      });
    }
  }
}

function scheduleFollowUp(
  world: World,
  office: GoverningOffice,
  matter: GoverningMatter,
  decisionEventId: EntityId,
  days: number,
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${matter.stableKey}:report`,
    dueAt: addDays(world.currentDate, days),
    transitionKey: GOVERNING_FOLLOW_UP,
    entityIds: [matter.id, decisionEventId].sort(),
    jurisdictionId: office.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [matter.id, decisionEventId].sort(),
    },
  });
}

function recordDecision(
  world: World,
  matter: GoverningMatter,
  option: GoverningMatterOption | null,
  mode: GoverningDecisionMode | "lapsed",
  deciderPersonId: EntityId,
  billReasons?: string,
  itemSelection?: ExecutiveItemVetoSelection,
): World {
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    throw new Error("This matter no longer belongs to a current office.");
  const { summary, visibility } = decisionSummary(
    world,
    office,
    matter,
    option,
  );
  let next = recordWorldEvent(world, {
    stableKey: `${matter.stableKey}:decided`,
    type: GOVERNING_MATTER_DECIDED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [
      office.holderPersonId,
      ...(office.organizationId ? [office.organizationId] : []),
      ...(matter.workItemId ? [matter.workItemId] : []),
      ...(option?.personId ? [option.personId] : []),
      ...(deciderPersonId !== office.holderPersonId ? [deciderPersonId] : []),
    ],
    participants: [
      { personId: deciderPersonId, role: "agency:decider", detail: mode },
      ...(option?.personId
        ? [
            {
              personId: option.personId,
              role: "impact:appointed" as const,
              detail: "Chief of Staff",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility,
    tags: [
      STATE_GOVERNING_VERSION,
      `matter-family:${matter.family}`,
      `office:${matter.officeKey}`,
      `matter:${matter.id}`,
      `choice:${option?.key ?? "lapsed"}`,
      `decided-by:${mode}`,
      ...(itemSelection
        ? [
            `item-veto-snapshot:${itemSelection.measureActionSequence}`,
            ...itemSelection.provisionIds.map((id) => `item-veto-item:${id}`),
          ]
        : []),
    ],
    summary,
    context: { ...emptyContext(), choice: option?.label ?? "No decision" },
  });
  const decision = next.history.events.at(-1)!;
  next = completeWork(
    next,
    matter,
    decision.id,
    option ? "completed" : "cancelled",
  );
  const outcome = applyConsequence(
    next,
    office,
    matter,
    option,
    decision.id,
    billReasons,
    itemSelection,
  );
  if (matter.family === "clemency" && option) {
    const petitionId = tagValue(matter.openedEvent, "source-event:");
    if (petitionId)
      return advanceClemencyPetition(outcome, petitionId as EntityId);
  }
  // The commitment writer may refuse when authority, cash plans, or the
  // availability window changed. A refused commitment is no decision.
  return matter.family === "program" && option && outcome === next
    ? world
    : outcome;
}

export type GoverningActionResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };

function openMatterForPlayer(
  world: World,
  matterId: EntityId,
): GoverningMatter | string {
  const matter = governingMatterById(world, matterId);
  if (!matter) return "That matter is not on record.";
  if (matter.status !== "open") return "That matter has already been settled.";
  if (controlledPersonId(world) !== matter.holderPersonId)
    return "Only the officeholder can decide this.";
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    return "This matter no longer belongs to a current office.";
  const measure =
    matter.family === "bill" && matter.measureId
      ? world.history.legislativeMeasures?.find(
          (m) => m.id === matter.measureId,
        )
      : undefined;
  const window = measure ? executiveBillActionWindow(world, measure) : null;
  if (
    measure &&
    measurePosition(world, measure.id).phase !== "awaiting-executive"
  )
    return "This bill is no longer awaiting executive action.";
  if (measure && !window)
    return "No executable action window is recorded for this bill.";
  const deadline =
    matter.family === "bill" ? window?.lastActionDate : matter.deadline;
  if (deadline && world.currentDate > deadline)
    return "The deadline has passed.";
  return matter;
}

/** The player's own decision. */
export function decideGoverningMatter(
  world: World,
  matterId: EntityId,
  optionKey: string,
  billReasons?: string,
  itemSelection?: ExecutiveItemVetoSelection,
): GoverningActionResult {
  const matter = openMatterForPlayer(world, matterId);
  if (typeof matter === "string") return { ok: false, world, reason: matter };
  const option = matter.options.find((o) => o.key === optionKey);
  if (!option)
    return { ok: false, world, reason: "That choice is not available." };
  if (itemSelection) {
    if (
      matter.family !== "bill" ||
      !matter.measureId ||
      option.key !== BILL_SIGN ||
      itemSelection.matterId !== matter.openedEvent.id
    )
      return {
        ok: false,
        world,
        reason:
          "An item-veto selection belongs to this bill's signature decision only.",
      };
    const problem = executiveItemVetoSelectionProblem(
      world,
      matter.measureId,
      itemSelection,
    );
    if (problem) return { ok: false, world, reason: problem };
  }
  let next = world;
  if (matter.family === "bill" && matter.measureId) {
    const measure = world.history.legislativeMeasures?.find(
      (m) => m.id === matter.measureId,
    );
    if (!measure || (option.key !== BILL_SIGN && option.key !== BILL_RETURN))
      return { ok: false, world, reason: "This bill action is not supported." };
    const evaluation = evaluateGovernorBill(world, {
      stableKey: matter.stableKey,
      governorId: matter.holderPersonId,
      executiveTitle: governingOfficeByKey(world, matter.officeKey)?.title,
      measure,
      staff: staffRecommendation(world, matter),
      playerChoice: {
        optionKey: option.key,
        matterEventId: matter.openedEvent.id,
      },
    });
    next = recordDurableDecisionTrace(world, evaluation);
    if (
      evaluation.outcomeKind !== "selected" ||
      evaluation.selectedOptionKey !== option.key
    )
      return {
        ok: false,
        world: next,
        reason: "The executive decision remains pending.",
      };
  }
  const decided = recordDecision(
    next,
    matter,
    option,
    "player",
    matter.holderPersonId,
    billReasons,
    itemSelection,
  );
  if (decided === world)
    return {
      ok: false,
      world,
      reason: "This funding choice cannot be committed on the current record.",
    };
  return {
    ok: true,
    world: decided,
  };
}

/** Hand the matter to the chief of staff, who takes their own recommendation. */
export function delegateGoverningMatter(
  world: World,
  matterId: EntityId,
): GoverningActionResult {
  const matter = openMatterForPlayer(world, matterId);
  if (typeof matter === "string") return { ok: false, world, reason: matter };
  const recommendation = staffRecommendation(world, matter);
  if (!recommendation)
    return {
      ok: false,
      world,
      reason:
        matter.family === "chief-of-staff"
          ? "Choosing the chief of staff is yours to do."
          : matter.family === "clemency"
            ? "The clemency power is yours alone to use."
            : "There is no chief of staff to hand this to.",
    };
  const option = matter.options.find(
    (o) => o.key === recommendation.optionKey,
  )!;
  const decided = recordDecision(
    world,
    matter,
    option,
    "delegated",
    recommendation.byPersonId,
  );
  if (decided === world)
    return {
      ok: false,
      world,
      reason: "This funding choice cannot be committed on the current record.",
    };
  return {
    ok: true,
    world: decided,
  };
}

/* ------------------------------------------------------------------ *
 * Canonical-time handlers
 * ------------------------------------------------------------------ */

function resolved(
  world: World,
  context: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function matterForDue(world: World, due: FutureDueItem) {
  for (const id of due.entityIds) {
    const matter = governingMatterById(world, id);
    if (matter) return matter;
  }
  return null;
}

/** Scheduled by term entry for the next day, when the office is on record. */
export function scheduleGoverningTransition(
  world: World,
  input: {
    readonly relationshipId: EntityId;
    readonly entryDate: IsoDate;
    readonly jurisdictionId: EntityId;
  },
): World {
  const stableKey = `${STATE_GOVERNING_VERSION}:transition:${input.relationshipId}`;
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(input.entryDate, 1),
    transitionKey: GOVERNING_TRANSITION,
    entityIds: [input.relationshipId],
    jurisdictionId: input.jurisdictionId,
    provenance: {
      kind: "simulated",
      sourceEntityIds: [input.relationshipId],
    },
  });
}

/** Clock adapter: admit each municipal term once, including older saved seats. */
export function synchronizeMunicipalGoverningOffices(world: World): World {
  let next = world;
  const keys = stableKeysOf(world.history.events);
  for (const office of currentGoverningOffices(world)) {
    if (office.programOffice?.kind !== "municipal") continue;
    const key = matterStableKey(office, "agenda", "first-year");
    if (keys.has(key)) continue;
    next = openTransitionMatters(next, office.officeKey);
    next = openMatter(next, office, {
      family: "budget",
      instance: `entry:${office.termId}`,
      programKeys: PROGRAM_FAMILIES.map((family) => family.familyKey),
    });
    next = scheduleGoverningSeasons(
      next,
      office.officeKey,
      office.jurisdictionId,
      office.programOffice,
    );
  }
  return next;
}

export function governingTransitionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const office = currentGoverningOffices(world).find((candidate) =>
    due.entityIds.includes(candidate.termId),
  );
  if (!office)
    return resolved(
      world,
      "The term this transition belonged to is not current.",
    );
  return resolved(
    considerClemencyAfterExecutiveDesk(
      openTransitionMatters(world, office.officeKey),
      office.termId,
    ),
    "The new office's first matters were opened.",
  );
}

function applyExecutiveBillInaction(
  world: World,
  matter: GoverningMatter,
): World {
  const measure = matter.measureId
    ? world.history.legislativeMeasures?.find((m) => m.id === matter.measureId)
    : undefined;
  if (
    !measure ||
    measurePosition(world, measure.id).phase !== "awaiting-executive"
  )
    return world;
  const window = executiveBillActionWindow(world, measure);
  if (
    !window ||
    window.inactionOutcome !== "becomes-law-without-signature" ||
    world.currentDate <= window.lastActionDate
  )
    return world;
  const municipalKey = tagValue(matter.openedEvent, "municipal-government:");
  if (municipalKey) {
    const enacted = recordCouncilExecutiveInaction(
      world,
      decodeURIComponent(municipalKey),
      measure,
    );
    return enacted === world
      ? world
      : recordDecision(enacted, matter, null, "lapsed", matter.holderPersonId);
  }
  const inactive = recordExecutiveInaction(world, {
    stableKey: `${matter.stableKey}:executive-inaction`,
    measureId: measure.id,
    rationale:
      "The declared executive action window ended without a decision; the pack makes the bill law without a signature.",
  });
  return scheduleInstitutionStep(
    recordDecision(inactive, matter, null, "lapsed", matter.holderPersonId),
    measure.id,
  );
}

export function governingDeadlineHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const matter = matterForDue(world, due);
  if (!matter || matter.status !== "open")
    return resolved(world, "The matter was already settled.");
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    return resolved(world, "The office changed hands before the deadline.");
  if (matter.family === "bill" && matter.measureId) {
    const next = applyExecutiveBillInaction(world, matter);
    return resolved(
      next,
      next === world
        ? "No executable inaction rule is due; the bill stays pending."
        : "The legal window ended without executive action.",
    );
  }
  return resolved(
    recordDecision(world, matter, null, "lapsed", matter.holderPersonId),
    "The deadline passed without a decision.",
  );
}

export function governingNpcDecisionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const matter = matterForDue(world, due);
  if (!matter || matter.status !== "open")
    return resolved(world, "The matter was already settled.");
  const office = governingOfficeByKey(world, matter.officeKey);
  if (!office || office.holderPersonId !== matter.holderPersonId)
    return resolved(world, "The office changed hands.");
  if (matter.options.length === 0)
    return resolved(
      recordDecision(world, matter, null, "lapsed", matter.holderPersonId),
      "No available choice.",
    );
  if (matter.family === "clemency") {
    const petitionId = tagValue(matter.openedEvent, "source-event:");
    const petition = petitionId
      ? eventById(world, petitionId as EntityId)
      : null;
    const question = petition ? clemencyQuestionFor(world, petition) : null;
    if (!question)
      return resolved(
        recordDecision(world, matter, null, "lapsed", matter.holderPersonId),
        "The request is no longer on record.",
      );
    // The governor weighs their own principles, drawn once like a bill's.
    const principled = ensureOfficeholderPrinciples(world, [
      matter.holderPersonId,
    ]);
    const evaluation = evaluateClemency(
      principled,
      matter.holderPersonId,
      question,
      {
        stateUsps: office.stateUsps,
        termEndsAt: office.termEndsAt,
      },
    );
    // Replaying this same pending context reuses its saved nonselected trace.
    // Appending that trace changed only the history-sequence cutoff; a changed
    // actor, petition, date, option or consideration is not the same context.
    const savedPending = principled.history.decisionTraces.some(
      (trace) =>
        trace.stableKey === `${evaluation.context.stableKey}:trace` &&
        trace.outcomeKind !== "selected" &&
        trace.selectedOptionKey === null &&
        JSON.stringify({
          ...trace.context,
          cutoff: {
            ...trace.context.cutoff,
            historySequenceExclusive:
              evaluation.context.cutoff.historySequenceExclusive,
          },
        }) === JSON.stringify(evaluation.context),
    );
    if (savedPending)
      return resolved(world, "The executive decision remains pending.");
    const traced = recordDurableDecisionTrace(principled, evaluation);
    if (evaluation.outcomeKind !== "selected" || !evaluation.selectedOptionKey)
      return resolved(traced, "The executive decision remains pending.");
    const option = matter.options.find(
      (o) => o.key === evaluation.selectedOptionKey,
    );
    if (!option)
      return resolved(
        traced,
        "The selected executive choice is unavailable; the matter remains pending.",
      );
    return resolved(
      recordDecision(
        traced,
        matter,
        option ?? null,
        option ? "officeholder" : "lapsed",
        matter.holderPersonId,
      ),
      "The officeholder decided.",
    );
  }
  const measure =
    matter.family === "bill" && matter.measureId
      ? world.history.legislativeMeasures?.find(
          (entry) => entry.id === matter.measureId,
        )
      : undefined;
  if (measure) {
    // The governor signs or vetoes for reasons, all of them written down:
    // their principles, the bill's backers, their party's floor vote, the
    // sponsor, the override count and the staff's advice
    // (governor-bill-decision.ts).
    const principled = ensureOfficeholderPrinciples(world, [
      matter.holderPersonId,
    ]);
    const advice = staffRecommendation(principled, matter);
    const evaluation = evaluateGovernorBill(principled, {
      stableKey: matter.stableKey,
      governorId: matter.holderPersonId,
      measure,
      staff: advice,
    });
    const traced = recordDurableDecisionTrace(principled, evaluation);
    if (evaluation.outcomeKind !== "selected" || !evaluation.selectedOptionKey)
      return resolved(traced, "The executive decision remains pending.");
    const option = matter.options.find(
      (o) => o.key === evaluation.selectedOptionKey,
    );
    if (!option)
      return resolved(
        traced,
        "The selected executive choice is unavailable; the matter remains pending.",
      );
    return resolved(
      recordDecision(
        traced,
        matter,
        option ?? null,
        option ? "officeholder" : "lapsed",
        matter.holderPersonId,
      ),
      "The officeholder decided.",
    );
  }
  // Other matters: the officeholder takes the advice of the staff they
  // hired, and a new officeholder keeps or hires the steadiest candidate
  // for chief of staff by their record.
  let next = world;
  if (matter.family === "agenda") {
    const chief = chiefOfStaffFor(next, office);
    next = ensureOfficeholderPrinciples(next, [
      matter.holderPersonId,
      ...(chief ? [chief] : []),
    ]);
    const advice = staffRecommendation(next, matter);
    let recordedAdvice:
      { optionKey: string; reason: string; eventId: EntityId } | undefined;
    if (advice?.evaluation) {
      let trace = next.history.decisionTraces.find(
        (row) => row.decisionId === advice.evaluation!.decisionId,
      );
      if (!trace) {
        next = recordDurableDecisionTrace(next, advice.evaluation);
        trace = next.history.decisionTraces.at(-1)!;
      }
      const adviceKey = `${matter.stableKey}:staff-advice:${trace.id}`;
      next = recordWorldEvent(next, {
        stableKey: adviceKey,
        type: "governing.staff-advice",
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: office.jurisdictionId,
        involvedEntityIds: [matter.holderPersonId, advice.byPersonId],
        participants: [
          {
            personId: advice.byPersonId,
            role: "agency:advisor",
            detail: advice.optionKey,
          },
        ],
        personFactConstraints: [],
        visibility: "limited",
        tags: [
          STATE_GOVERNING_VERSION,
          `office:${office.officeKey}`,
          `matter:${matter.id}`,
          `choice:${advice.optionKey}`,
          `decision-trace:${trace.id}`,
        ],
        summary: `${personName(next.people[advice.byPersonId]!)}, chief of staff, advised ${matter.options.find((option) => option.key === advice.optionKey)!.label.toLowerCase()}: ${advice.reason}`,
        context: { ...emptyContext(), choice: advice.reason },
      });
      recordedAdvice = {
        optionKey: advice.optionKey,
        reason: advice.reason,
        eventId: next.history.events.find(
          (event) => event.stableKey === adviceKey,
        )!.id,
      };
    }
    const own = evaluateAgendaPriority(
      next,
      matter,
      matter.holderPersonId,
      recordedAdvice,
    );
    const chosenKey = supportedAgendaOption(own);
    const chosen = matter.options.find((option) => option.key === chosenKey);
    if (!chosen || !own)
      return resolved(
        next,
        "No recorded view or advice selects an agenda priority; the matter remains open.",
      );
    if (
      !next.history.decisionTraces.some(
        (trace) => trace.decisionId === own.decisionId,
      )
    )
      next = recordDurableDecisionTrace(next, own);
    return resolved(
      recordDecision(
        next,
        matter,
        chosen,
        "officeholder",
        matter.holderPersonId,
      ),
      "The officeholder chose an agenda priority from recorded views or advice.",
    );
  }
  const recommendation = staffRecommendation(next, matter);
  const recommended = recommendation
    ? matter.options.find((o) => o.key === recommendation.optionKey)
    : undefined;
  const steadiest =
    matter.family === "chief-of-staff"
      ? [...matter.options]
          .filter((option) => option.assessment?.steadiness != null)
          .sort(
            (a, b) => b.assessment!.steadiness! - a.assessment!.steadiness!,
          )[0]
      : undefined;
  if (matter.family === "chief-of-staff" && !recommended && !steadiest)
    return resolved(
      next,
      "No recorded advice or candidate assessment selects a choice; the matter remains open.",
    );
  const option = recommended ?? steadiest;
  if (!option)
    return resolved(
      next,
      "No recorded advice or assessment selects a choice; the matter remains open.",
    );
  const decided = recordDecision(
    next,
    matter,
    option,
    "officeholder",
    matter.holderPersonId,
  );
  if (decided === next && matter.family === "program")
    return resolved(
      recordDecision(next, matter, null, "lapsed", matter.holderPersonId),
      "The funding choice could not be committed.",
    );
  return resolved(decided, "The officeholder decided.");
}

export type ImplementationResult = "progress" | "problem" | "stalled";

interface FollowUpOutcome {
  readonly tag: string;
  readonly summary: string;
  readonly sourceEventId?: EntityId;
  readonly sourceRecordIds?: readonly EntityId[];
}

/** A source-linked receipt, never a prediction from party, staff or pace. */
function recordedProgramFollowUp(
  world: World,
  matter: GoverningMatter,
  decision: HistoricalEvent,
  outturnIds?: ReadonlySet<EntityId>,
): FollowUpOutcome | null {
  const records = (world.history.publicProgramRecords ?? []).filter(
    (record) => record.recordedAt <= world.currentDate,
  );
  const appropriations = records.filter(
    (record): record is PublicProgramAppropriationRecord =>
      record.kind === "appropriation" &&
      record.jurisdictionId === matter.openedEvent.jurisdictionId &&
      (matter.appropriationId !== null
        ? record.id === matter.appropriationId
        : matter.measureId !== null &&
          record.sourceMeasureId === matter.measureId),
  );
  if (matter.family === "budget") {
    const adopted = [...appropriations]
      .reverse()
      .find(
        (record) =>
          record.sequence > decision.sequence &&
          record.sourceMeasureId !== null &&
          record.sourceMeasureId !== undefined &&
          (world.history.legislativeEnactments ?? []).some(
            (enactment) =>
              enactment.measureId === record.sourceMeasureId &&
              enactment.outcome === "enacted" &&
              enactment.resolvedAt <= world.currentDate,
          ),
      );
    const event = adopted ? eventById(world, adopted.eventId) : null;
    return event && adopted
      ? {
          tag: "budget:appropriation-recorded",
          summary: event.summary,
          sourceEventId: event.id,
          sourceRecordIds: [adopted.id],
        }
      : null;
  }
  const appropriationIds = new Set(appropriations.map((record) => record.id));
  const commitmentIds = new Set(
    records.flatMap((record) =>
      record.kind === "commitment" &&
      appropriationIds.has(record.appropriationId)
        ? [record.id]
        : [],
    ),
  );
  const installmentIds = new Set(
    records.flatMap((record) =>
      record.kind === "installment" &&
      record.status === "posted" &&
      commitmentIds.has(record.commitmentId)
        ? [record.id]
        : [],
    ),
  );
  const delivered = [...records]
    .reverse()
    .find(
      (record) =>
        record.kind === "capacity-outturn" &&
        record.restoredUnits !== null &&
        record.restoredUnits > 0 &&
        (!outturnIds || outturnIds.has(record.id)) &&
        record.sequence > decision.sequence &&
        commitmentIds.has(record.commitmentId) &&
        installmentIds.has(record.installmentId),
    );
  const event = delivered ? eventById(world, delivered.eventId) : null;
  return event && delivered
    ? {
        tag: "implementation:delivery-recorded",
        summary: event.summary,
        sourceEventId: event.id,
        sourceRecordIds: [delivered.id],
      }
    : null;
}

function returnedBillOutcome(
  matter: GoverningMatter,
): FollowUpOutcome & { readonly overridden: boolean } {
  const subject = subjectLabel(matter.subjectKey);
  // Only an older save still holds a bill with no measure behind it, so no
  // member can vote to override it. ESTIMATED FROM AVERAGE: most vetoes are
  // not overridden, so the veto stands. A real bill's override is its
  // members' own vote (legislative-clock.ts).
  const overridden = false;
  return overridden
    ? {
        tag: "bill:overridden",
        summary: `The legislature passed the bill on ${subject} over the governor's objection.`,
        overridden,
      }
    : {
        tag: "bill:returned-stands",
        summary: `The legislature did not pass the bill on ${subject} again; it does not become law.`,
        overridden,
      };
}

function recordGoverningFollowUp(
  world: World,
  matter: GoverningMatter,
  decision: HistoricalEvent,
  outcome: FollowUpOutcome,
  stableKey: string,
  jurisdictionId: EntityId | null = matter.openedEvent.jurisdictionId,
): World {
  if (
    outcome.sourceRecordIds?.length &&
    world.history.events.some(
      (event) =>
        event.type === GOVERNING_OUTCOME &&
        event.tags.includes(`matter:${matter.id}`) &&
        event.tags.includes(`decision:${decision.id}`) &&
        outcome.sourceRecordIds!.every((id) =>
          event.tags.includes(`source-record:${id}`),
        ),
    )
  )
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: GOVERNING_OUTCOME,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [matter.holderPersonId],
    participants: [
      {
        personId: matter.holderPersonId,
        role: "focus:responsible-office",
        detail: outcome.tag,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      STATE_GOVERNING_VERSION,
      `office:${matter.officeKey}`,
      outcome.tag,
      `matter:${matter.id}`,
      `decision:${decision.id}`,
      ...(matter.subjectKey ? [`subject:${matter.subjectKey}`] : []),
      ...(outcome.sourceEventId
        ? [`source-event:${outcome.sourceEventId}`]
        : []),
      ...(outcome.sourceRecordIds ?? []).map((id) => `source-record:${id}`),
    ],
    summary: outcome.summary,
    context: emptyContext(),
  });
}

/** Called at a saved delivery boundary, never as a daily or dated review. */
export function reviewGoverningOutturns(
  world: World,
  newlySavedOutturnIds: ReadonlySet<EntityId>,
): World {
  if (newlySavedOutturnIds.size === 0) return world;
  const records = world.history.publicProgramRecords ?? [];
  const commitmentIds = new Set<EntityId>();
  const outturnIds = new Set(
    records.flatMap((record) => {
      if (
        !newlySavedOutturnIds.has(record.id) ||
        record.kind !== "capacity-outturn" ||
        record.recordedAt !== world.currentDate ||
        record.restoredUnits === null ||
        record.restoredUnits <= 0
      )
        return [];
      commitmentIds.add(record.commitmentId);
      return [record.id];
    }),
  );
  if (outturnIds.size === 0) return world;
  const appropriationIds = new Set(
    records.flatMap((record) =>
      record.kind === "commitment" && commitmentIds.has(record.id)
        ? [record.appropriationId]
        : [],
    ),
  );
  const measureIds = new Set(
    records.flatMap((record) =>
      record.kind === "appropriation" &&
      appropriationIds.has(record.id) &&
      record.sourceMeasureId
        ? [record.sourceMeasureId]
        : [],
    ),
  );
  let next = world;
  for (const event of world.history.events) {
    if (event.type !== GOVERNING_MATTER_OPENED) continue;
    const appropriationId = tagValue(event, "appropriation:");
    const measureId = tagValue(event, "measure:");
    if (
      !(appropriationId && appropriationIds.has(appropriationId as EntityId)) &&
      !(measureId && measureIds.has(measureId as EntityId))
    )
      continue;
    const matter = matterFromEvent(world, event);
    if (
      !matter ||
      (matter.family !== "program" && matter.family !== "implementation") ||
      matter.status !== "decided" ||
      !matter.decision ||
      (matter.workItemId && !completedGoverningMatterWork(world, matter.id))
    )
      continue;
    const outcome = recordedProgramFollowUp(
      next,
      matter,
      matter.decision,
      outturnIds,
    );
    if (outcome)
      next = recordGoverningFollowUp(
        next,
        matter,
        matter.decision,
        outcome,
        `${matter.stableKey}:delivery:${outcome.sourceRecordIds!.join(":")}`,
      );
  }
  return next;
}

/** A dated follow-up: the recorded consequence of an earlier decision. */
export function governingFollowUpHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const matter = matterForDue(world, due);
  const decision = matter?.decision;
  if (!matter || !decision)
    return resolved(world, "No decided matter stands behind this report.");
  if (
    matter.status !== "decided" ||
    (matter.workItemId && !completedGoverningMatterWork(world, matter.id))
  )
    return {
      world,
      status: "blocked",
      reasonKey: "governing:no-completed-action",
      context: "No completed recorded action stands behind this report.",
      outcomeEventId: null,
    };
  const office = governingOfficeByKey(world, matter.officeKey);
  const currentOffice =
    office && office.holderPersonId === matter.holderPersonId ? office : null;
  let outcome: FollowUpOutcome;
  let reopen: "implementation" | null = null;
  if (matter.family === "bill") {
    const returned = returnedBillOutcome(matter);
    outcome = returned;
    if (returned.overridden) reopen = "implementation";
  } else {
    const receipt = recordedProgramFollowUp(world, matter, decision);
    if (!receipt)
      return {
        world,
        status: "blocked",
        reasonKey:
          matter.family === "budget"
            ? "governing:no-appropriation-receipt"
            : "governing:no-delivery-receipt",
        context:
          matter.family === "budget"
            ? "No enacted appropriation is linked to this budget request yet."
            : "No recorded delivery is linked to this matter yet.",
        outcomeEventId: null,
      };
    outcome = receipt;
  }
  let next = recordGoverningFollowUp(
    world,
    matter,
    decision,
    outcome,
    `${due.stableKey}:outcome`,
    due.jurisdictionId ?? matter.openedEvent.jurisdictionId,
  );
  if (reopen && currentOffice && matter.subjectKey)
    next = openMatter(next, currentOffice, {
      family: "implementation",
      instance: `law:${matter.id}`,
      subjectKey: matter.subjectKey,
      sourceEventId: next.history.events.at(-1)!.id,
    });
  return resolved(next, outcome.summary);
}

/**
 * Said once a year, in the office's own record: this state's legislature has
 * no written measures, so no bill reaches this desk. It names what is missing
 * rather than filling the desk with an unbound bill.
 */
function recordMissingLegislatureNote(
  world: World,
  office: GoverningOffice,
  onDate: IsoDate,
): World {
  const stableKey = `${STATE_GOVERNING_VERSION}:${office.officeKey}:no-legislature:${onDate.slice(0, 4)}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  return recordWorldEvent(world, {
    stableKey,
    type: GOVERNING_OUTCOME,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [office.holderPersonId],
    participants: [],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      STATE_GOVERNING_VERSION,
      `office:${office.officeKey}`,
      "governing:no-compiled-legislature",
    ],
    // What is missing is bills for the legislature's members to file; the
    // tag says so for development. The player reads only what the office
    // saw, never how the game is built.
    summary: `No bill reached ${office.title} this session.`,
    context: emptyContext(),
  });
}

/* ------------------------------------------------------------------ *
 * Seasons
 * ------------------------------------------------------------------ */

export function governingSeasonHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match =
    /^state-governing\/v1:season:(.+):(budget|bill):(\d{4}-\d{2}-\d{2})$/.exec(
      due.stableKey,
    );
  if (!match) return resolved(world, "Not a season item.");
  const [, officeKey, kind] = match;
  const office = governingOfficeByKey(world, officeKey!);
  const identity = stateExecutiveIdentityForOfficeKey(officeKey!);
  const stateUsps = office?.stateUsps ?? identity?.stateUsps ?? null;
  const jurisdictionId =
    office?.jurisdictionId ??
    (stateUsps
      ? governingJurisdictionIdFor({ kind: "state", stateUsps })
      : null);
  let next = world;
  const offCycleBill =
    kind === "bill" &&
    jurisdictionId !== null &&
    !regularSessionYearForWorld(
      world,
      jurisdictionId,
      Number(due.dueAt.slice(0, 4)),
    );
  if (kind === "budget" && office) {
    const pool = PROGRAM_FAMILIES.map((family) => family.familyKey);
    const priority = currentPriority(world, office);
    const programKeys = [
      ...(priority ? [priority] : []),
      ...pool.filter((key) => key !== priority),
    ];
    next = openMatter(next, office, {
      family: "budget",
      instance: due.dueAt,
      programKeys,
    });
  } else if (
    kind === "bill" &&
    office?.programOffice?.kind !== "municipal" &&
    !offCycleBill &&
    jurisdictionId !== null &&
    stateUsps
  ) {
    const intake = {
      jurisdictionId,
      intakeKey: `${officeKey}:${due.dueAt}`,
    };
    // Legislative business belongs to the seated chamber even while its
    // executive office is vacant. A current save can still need a roster
    // on this date if it began after the paced opening calendar.
    const subjectPersonId =
      office?.holderPersonId ??
      (next.control.kind === "person"
        ? next.control.personId
        : next.personOrder.find((id) => !!next.people[id]));
    if (
      worldOpeningVersionOf(next) === CRUNCH46_WORLD_OPENING_VERSION &&
      subjectPersonId
    )
      next = ensureStateLegislatureOpening(next, subjectPersonId, stateUsps);
    const filedBefore = next.history.legislativeMeasures?.length ?? 0;
    // Only seated members file, from their own recorded principles.
    next = fileMemberAgendaBill(next, intake);
    // Where nobody filed anything, no bill is invented. The office's other
    // work continues, and the gap is stated once a year.
    if (
      office &&
      (next.history.legislativeMeasures?.length ?? 0) === filedBefore
    )
      next = recordMissingLegislatureNote(next, office, due.dueAt);
  }
  if (office) next = openProgramMatters(next, office);
  if (jurisdictionId)
    next = scheduleGoverningSeasons(
      next,
      officeKey!,
      jurisdictionId,
      office?.programOffice?.kind === "municipal"
        ? office.programOffice
        : undefined,
    );
  return resolved(
    next,
    offCycleBill
      ? "The off-cycle bill date was skipped."
      : `The ${kind} season arrived.`,
  );
}

/**
 * The seated governorship a state legislature's bills go to ("US-NE"), or
 * null where none has been materialized.
 */
export function governorOfficeForJurisdiction(
  world: World,
  jurisdictionKey: string,
): GoverningOffice | null {
  const stateUsps = jurisdictionKey.replace(/^US-/, "");
  return (
    currentGoverningOffices(world).find(
      (candidate) =>
        candidate.stateUsps === stateUsps &&
        candidate.programOffice?.kind !== "municipal",
    ) ?? null
  );
}

/**
 * A bill on the governor's desk. Whoever holds the governorship, player or
 * not, decides it through the same bound matter. Without an actual seated
 * executive, the bill stays pending. An authored scenario ending cannot
 * supply a governor's signature or veto.
 */
export const governorDesk: ExecutiveDeskHandler = (
  world,
  measure,
  blueprint,
) => {
  const office = governorOfficeForJurisdiction(
    world,
    blueprint.pack.jurisdictionKey,
  );
  const alreadyOpen = world.history.events.some(
    (event) =>
      event.type === GOVERNING_MATTER_OPENED &&
      event.tags.includes(`measure:${measure.id}`) &&
      event.tags.includes("matter-family:bill"),
  );
  if (alreadyOpen) return world;
  if (office)
    return openMatter(world, office, {
      family: "bill",
      instance: `measure:${measure.id}`,
      measureId: measure.id,
    });
  return world;
};

/**
 * The legislature's own step, plus the office consequence of it: a bill that
 * enacted an appropriation puts that money in front of its executive the same
 * day, rather than waiting for the next season.
 */
/** The governor's desk for a state bill, the President's for a federal one. */
export const executiveDesk: ExecutiveDeskHandler = (
  world,
  measure,
  blueprint,
) =>
  world.jurisdictions[measure.jurisdictionId]?.kind === "federal"
    ? presidentDesk(world, measure)
    : governorDesk(world, measure, blueprint);

/**
 * The governing handlers, built when a registry asks for them rather than when
 * this module loads: several of the keys belong to modules that import this
 * one, and are not defined yet while it is loading.
 */
export function stateGoverningHandlers() {
  // Any of these can enact money: the legislative step, Congress's sittings,
  // and a governor's or President's signature on the desk.
  return [
    [STATE_LEGISLATURE_OPENING_TRANSITION, stateLegislatureOpeningHandler],
    [LEGISLATIVE_INSTITUTION_STEP, createInstitutionStepHandler(executiveDesk)],
    ...congressLawmakingHandlers(),
    [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
    [
      LEGISLATIVE_SESSION_COMPLETION_TRANSITION,
      legislativeSessionCompletionHandler,
    ],
    [GOVERNING_SEASON, governingSeasonHandler],
    [GOVERNING_TRANSITION, governingTransitionHandler],
    [GOVERNING_DEADLINE, governingDeadlineHandler],
    [GOVERNING_NPC_DECISION, governingNpcDecisionHandler],
    [GOVERNING_PROGRAM_AVAILABLE, governingProgramAvailableHandler],
    [GOVERNING_FOLLOW_UP, governingFollowUpHandler],
  ] as const;
}

/** Recorded decisions and outcomes for an office, newest first. */
export function governingOutcomes(
  world: World,
  officeKey: string,
): readonly HistoricalEvent[] {
  return world.history.events
    .filter(
      (event) =>
        (event.type === GOVERNING_OUTCOME ||
          event.type === GOVERNING_MATTER_DECIDED) &&
        event.tags.includes(`office:${officeKey}`) &&
        event.recordedAt <= world.currentDate,
    )
    .reverse();
}
