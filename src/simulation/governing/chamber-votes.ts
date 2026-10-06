import { stateMemberSeatingEvidence } from "./member-seating";
import { considerationScore } from "../decisions";
import { decideMemberVote } from "./member-vote-decision";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalEntityAvailableAt,
  constitutionalPosition,
  stateAmendmentProfile,
} from "../constitutional-process";
import { institutionOfficeBindingAt } from "../enacted-rule-changes";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "../legislative-institutions";
import { legislativeRulePackForWorld } from "../legislative-procedure-world";
import { chamberByKey } from "../legislature-rules";
import { seatsForChamber } from "../legislature-game-profile";
import { organizationProfileAt, workStatusAt } from "../life-queries";
import { requireMeasure } from "../legislation";
import {
  memberVoteConsiderations,
  withParts,
} from "../legislative-member-decisions";
import { measureAnswersAt } from "../vote-bundle";
import {
  principleVoteConsideration,
  spendingPrincipleConsideration,
} from "./officeholder-principles";
import { budgetDeadlineConsideration } from "./budget-stakes";
import { constituentsConsideration } from "./constituent-views";
import type { MemberVoteQuestion } from "../legislative-member-decisions";
import type { SeatedBody, SeatedMember } from "../legislation-scenarios";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "../living-world/opening";
import {
  stateLegislatureEstablished,
  stateLegislators,
  stateLegislativeSeats,
} from "../nationwide-world/state-legislature-opening";
import { activeOrganizationParticipationsAt } from "../life-queries";
import { measureCosponsors, seatedCongressChamber } from "./congress-chambers";
import { personName } from "../people";
import { readRelationshipStanding } from "../relationship-standing";
import type { StandingBand } from "../relationship-standing";
import { currentHistoricalCutoff } from "../queries";
import { PEOPLE_MIND_VERSION } from "../people-trait-definitions";
import { readTrait } from "../trait-readings";
import { traitRegistryFor } from "../trait-registry";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  DecisionSubject,
  EntityId,
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
  MindSourceReference,
  World,
} from "../types";

/**
 * A whole chamber deciding a question, member by member.
 *
 * Before this, every state floor vote was a head count written in advance and
 * dealt out to seats in order. Where the home state's legislature has been
 * seated with real people, each of them now answers the question for their
 * own reasons, through the same evaluator the bargaining colleagues use:
 *
 * - what they have said on the record about this question (a commitment);
 * - whose bill it is: a bill carried by a member of their own party is a
 *   reason to support it. One carried by the other party is no reason to
 *   oppose it, except on an override of the governor's veto, where the
 *   parties do line up against each other. That is an organizational cue,
 *   not a conviction, and it is weighed below a promise, so a member who
 *   made one keeps it over the cue.
 *
 * A formed private belief can inform a vote when the bill records an explicit
 * answer to its policy question. The saved ballot cites that belief by ID;
 * a private reason is not by itself knowledge available to the player.
 *
 * PLACEHOLDER until research question
 * how-state-legislators-vote-without-a-stated-position is answered: the
 * party cue, the weights and the rule that only an override divides by party
 * are the game's own, not measured voting behavior.
 *
 * Nothing else is invented to fill the list. A member with no reason at all
 * answers present. A seat with nobody in it is a vacancy, not a voter, and
 * lowers the count of members. The player is never voted for: a player who
 * holds a seat and has not cast a ballot is recorded absent.
 *
 * Returns null where no legislature has been seated, so a caller keeps its
 * authored decisions for an older save rather than inventing a chamber.
 */

export interface SeatedChamber {
  readonly body: SeatedBody;
  /** Seats the chamber has, filled or not. */
  readonly seats: number;
}

export function seatedChamberForPack(
  world: World,
  rulePackId: string,
  chamberKey: string,
  chamberName: string,
): SeatedChamber | null {
  // Unregistered institutions still have no roster. The admitted pack reads
  // its declared saved source, including any active procedure overlay.
  if (!legislativePackForWorkKey(`institution:${rulePackId}`)) return null;
  const pack = legislativeRulePackForWorld(world, rulePackId);
  if (pack.seatRollSource?.kind === "national-election-seats")
    return seatedCongressChamber(world, chamberKey);
  const candidacyPackId = `${rulePackId}:candidacy`;
  if (!stateLegislatureEstablished(world, candidacyPackId)) return null;
  const officeKey = `${rulePackId}:${chamberKey}`;
  const opening = world.history.events.find((event) =>
    event.tags.includes(`pack:${candidacyPackId}`),
  );
  const sizeTag = opening?.tags.find((tag) =>
    tag.startsWith(`chamber:${chamberKey}:`),
  );
  const members = stateLegislators(world, candidacyPackId)
    .filter((member) => member.officeKey === officeKey)
    .sort((l, r) => l.ordinal - r.ordinal);
  const jurisdictionId = opening?.jurisdictionId;
  if (!sizeTag || !jurisdictionId) return null;
  const seats = Number(sizeTag.split(":")[2]);
  return {
    seats,
    body: {
      chamberKey,
      chamberName,
      members: members.map((member): SeatedMember => {
        const seating = stateMemberSeatingEvidence(
          world,
          candidacyPackId,
          jurisdictionId,
          member,
        );
        return {
          tenureStartedAt: seating?.occurredAt ?? null,
          seatingEventId: seating?.eventId ?? null,
          memberKey: `${officeKey}:seat:${member.ordinal}`,
          name: personName(world.people[member.personId]!),
          personId: member.personId,
          partyKey: member.party,
          caucusLabel: member.party
            ? `${member.party.charAt(0).toUpperCase()}${member.party.slice(1)}`
            : "No party",
        };
      }),
    },
  };
}

/** The public party a person holds now, by the national party they joined. */
export function publicPartyOf(world: World, personId: EntityId): string | null {
  let known = PUBLIC_PARTIES.get(world);
  if (!known) {
    known = new Map();
    PUBLIC_PARTIES.set(world, known);
  }
  if (known.has(personId)) return known.get(personId)!;
  const active = activeOrganizationParticipationsAt(world, personId);
  let found: string | null = null;
  for (const party of ["democratic", "republican"]) {
    const id = livingWorldOrganizationId(
      world,
      LIVING_WORLD_KEYS.nationalParty(party),
    );
    if (active.some((entry) => entry.participation.organizationId === id)) {
      found = party;
      break;
    }
  }
  known.set(personId, found);
  return found;
}

/**
 * Each world's answers, kept for that world: a world is never edited, and one
 * floor day asks the same members' parties for every question it predicts.
 */
const PUBLIC_PARTIES = new WeakMap<World, Map<EntityId, string | null>>();

interface ChamberVoteCommonInput {
  readonly stableKey: string;
  /** Actual vote writers may retain the evaluations; previews only read them. */
  readonly onDecision?: (evaluation: DecisionEvaluation) => void;
  readonly members: readonly SeatedMember[];
  /**
   * Decide only these members (by member key). The whole chamber still names
   * the parties, so each vote is the one it would be in a full count.
   */
  readonly only?: ReadonlySet<string>;
  /** The player, who is never voted for. */
  readonly playerPersonId?: EntityId | null;
  /** The player's own ballot, when they cast one. */
  readonly playerBallot?: LegislativeMemberDisposition | null;
}

/** The exact ephemeral evaluation used to produce one member's ballot. */
export interface ChamberVoteMemberEvaluation {
  readonly disposition: LegislativeVoteDisposition;
  readonly evaluation: DecisionEvaluation | null;
  readonly sourceRefs: readonly MindSourceReference[];
}

/** Optional evidence receiver for the domain roll-call writer. */
export interface ChamberVoteOptions {
  readonly onMemberEvaluation?: (row: ChamberVoteMemberEvaluation) => void;
}

export interface ChamberBillVoteInput extends ChamberVoteCommonInput {
  readonly kind?: "bill";
  readonly question: MemberVoteQuestion;
  /**
   * Whether the parties line up against each other on this question. Absent,
   * only a veto override divides by party.
   */
  readonly contested?: boolean;
  /**
   * The place whose voters every member answers to, for a body elected by
   * the whole place, a town council. Absent, members weigh no voters here.
   */
  readonly constituencyId?: EntityId | null;
  /**
   * Whoever holds the executive office the body's acts go to (a town's
   * mayor), whose known position is a cue to every member.
   */
  readonly executivePersonId?: EntityId | null;
  /**
   * The body's members are elected without party labels (the Nebraska
   * Legislature; most town councils, `body-partisanship.ts`), so a member's
   * party is no cue on its votes. A member still carries their own bill.
   */
  readonly nonpartisan?: boolean;
}

interface ChamberNominationVoteCommonInput extends ChamberVoteCommonInput {
  readonly kind: "nomination";
  readonly nominationEventId: EntityId;
  readonly nomineeId: EntityId;
  readonly officeKey: string;
  readonly considerationsByMember: ReadonlyMap<
    string,
    readonly DecisionConsideration[]
  >;
}

export type ChamberNominationVoteInput = ChamberNominationVoteCommonInput &
  (
    | { readonly nominationKind?: "judicial"; readonly presidentId: EntityId }
    | {
        readonly nominationKind: "clemency-board";
        readonly appointerId: EntityId;
        readonly jurisdictionId: EntityId;
        readonly boardKey: string;
        readonly seatOrdinal: number;
      }
  );

interface ChamberConstitutionalVoteCommonInput extends ChamberVoteCommonInput {
  readonly kind: "constitutional";
  readonly constitutionalMeasureId: EntityId;
  readonly bodyKey: string;
  readonly considerationsByMember: ReadonlyMap<
    string,
    readonly DecisionConsideration[]
  >;
}

export type ChamberConstitutionalVoteInput =
  ChamberConstitutionalVoteCommonInput &
    (
      | { readonly purpose: "proposal" }
      | {
          readonly purpose: "ratification";
          /** Actual state jurisdiction, distinct from the federal proposal. */
          readonly ratificationJurisdictionId: EntityId;
        }
    );

export type ChamberVoteInput =
  | ChamberBillVoteInput
  | ChamberNominationVoteInput
  | ChamberConstitutionalVoteInput;

interface ChamberVoteContext {
  readonly subject: DecisionSubject;
  readonly committee: DecisionConsideration | null;
  memberInputs(member: SeatedMember): {
    readonly views: readonly DecisionConsideration[];
    readonly cues: readonly DecisionConsideration[];
  };
}

/** The saved state body, including actual active seat and institution sources. */
export function stateConstitutionalBody(
  world: World,
  measureId: EntityId,
  bodyKey: string,
): {
  readonly seated: SeatedChamber;
  readonly sourceRecordIds: readonly EntityId[];
  readonly profileBasis: "sourced" | "game-profile";
} {
  const cutoff = currentHistoricalCutoff(world);
  const measure = world.history.constitutionalMeasures?.find(
    (row) => row.id === measureId,
  );
  const profile = measure && stateAmendmentProfile(measure.jurisdictionKey);
  const pack =
    measure && legislativePackForJurisdiction(measure.jurisdictionId);
  const chamber = pack?.chambers.find((row) => row.chamberKey === bodyKey);
  const ruleBody = profile?.bodies.find((row) => row.bodyKey === bodyKey);
  if (
    !measure ||
    measure.processKind !== "state-amendment" ||
    !constitutionalEntityAvailableAt(
      world,
      measure.id,
      cutoff.asOfDate,
      cutoff.historySequenceExclusive,
    ) ||
    !profile ||
    !pack ||
    pack.jurisdictionKey !== measure.jurisdictionKey ||
    !chamber ||
    !ruleBody ||
    measure.proposedBy === "convention" ||
    !measure.proposalRule
  )
    throw new Error(
      "A state constitutional vote requires its actual dated proposal, profile and chamber.",
    );
  const roster = stateConstitutionalRoster(
    world,
    measure.jurisdictionId,
    bodyKey,
  );
  if (!roster)
    throw new Error(
      "A state constitutional vote requires its saved body and dated institution binding.",
    );
  return {
    ...roster,
    sourceRecordIds: [measure.id, ...roster.sourceRecordIds],
  };
}

/** Missing recorded state bodies stay unsupported before an ordinary review files. */
export function stateConstitutionalRoster(
  world: World,
  jurisdictionId: EntityId,
  bodyKey: string,
  purpose: "proposal" | "ratification" = "proposal",
): {
  readonly seated: SeatedChamber;
  readonly sourceRecordIds: readonly EntityId[];
  readonly profileBasis: "sourced" | "game-profile";
} | null {
  const cutoff = currentHistoricalCutoff(world);
  const pack = legislativePackForJurisdiction(jurisdictionId);
  const profile =
    purpose === "proposal" && pack
      ? stateAmendmentProfile(pack.jurisdictionKey)
      : null;
  const chamber = pack?.chambers.find((row) => row.chamberKey === bodyKey);
  const ruleBody = profile?.bodies.find((row) => row.bodyKey === bodyKey);
  const actualSeats =
    purpose === "ratification" && pack ? seatsForChamber(pack, bodyKey) : null;
  // A federal amendment is ratified by the state's actual legislature, not
  // the bodies/thresholds of its separate state-amendment proposal profile.
  // The proposal arm retains its original profile guard and seat count.
  const expectedSeats =
    purpose === "ratification"
      ? (actualSeats?.seats ?? null)
      : (ruleBody?.members ?? null);
  if (
    !world.jurisdictions[jurisdictionId] ||
    !pack ||
    !chamber ||
    expectedSeats === null ||
    (purpose === "proposal" && (!profile || !ruleBody)) ||
    (purpose === "ratification" &&
      !ARTICLE_V_STATE_KEYS.includes(pack.jurisdictionKey))
  )
    return null;
  const seated = seatedChamberForPack(
    world,
    pack.packId,
    bodyKey,
    chamber.name,
  );
  const binding = institutionOfficeBindingAt(
    world,
    `${pack.packId}:${bodyKey}`,
    jurisdictionId,
    cutoff,
  );
  const organization =
    binding &&
    world.history.organizations.find(
      (row) => row.id === binding.organizationId,
    );
  const organizationProfile =
    binding && organizationProfileAt(world, binding.organizationId, cutoff);
  if (
    !seated ||
    seated.seats !== expectedSeats ||
    !binding ||
    !organization ||
    organization.sequence >= cutoff.historySequenceExclusive ||
    organization.formedAt > cutoff.asOfDate ||
    !organizationProfile ||
    organizationProfile.closed ||
    organizationProfile.locationJurisdictionId !== jurisdictionId
  )
    return null;
  const seatRecords = stateLegislativeSeats(
    world,
    `${pack.packId}:candidacy`,
  ).filter((row) => row.officeKey === binding.officeKey);
  if (
    seatRecords.length !== seated.seats ||
    new Set(seatRecords.map((row) => row.ordinal)).size !== seatRecords.length
  )
    return null;
  const body: SeatedChamber = {
    ...seated,
    body: {
      ...seated.body,
      members: seatRecords.map((seat): SeatedMember => ({
        memberKey: `${seat.officeKey}:seat:${seat.ordinal}`,
        name: seat.member
          ? personName(world.people[seat.member.personId]!)
          : "Vacant seat",
        personId: seat.member?.personId ?? null,
        partyKey: seat.member?.party ?? null,
        caucusLabel: seat.member?.party ?? "",
      })),
    },
  };
  const tenures = stateLegislators(world, `${pack.packId}:candidacy`).filter(
    (row) => row.officeKey === binding.officeKey,
  );
  const sources: EntityId[] = [
    binding.id,
    organization.id,
    organizationProfile.id,
  ];
  for (const member of body.body.members) {
    if (!member.personId) continue; // An actual saved empty seat has no voter.
    const tenure = tenures.find(
      (row) =>
        row.personId === member.personId &&
        member.memberKey === `${row.officeKey}:seat:${row.ordinal}`,
    );
    const work =
      tenure &&
      world.history.workRelationships.find(
        (row) => row.id === tenure.workRelationshipId,
      );
    if (
      !member.personId ||
      !world.people[member.personId] ||
      !work ||
      work.personId !== member.personId ||
      work.organizationId !== organization.id ||
      work.startedAt > cutoff.asOfDate ||
      work.recordedAt > cutoff.asOfDate ||
      work.sequence >= cutoff.historySequenceExclusive ||
      workStatusAt(world, work.id, cutoff)?.status !== "active"
    )
      return null;
    sources.push(member.personId, work.id);
  }
  return {
    seated: body,
    sourceRecordIds: [...new Set(sources)],
    profileBasis:
      purpose === "ratification"
        ? actualSeats!.basis === "researched"
          ? "sourced"
          : "game-profile"
        : profile!.basis,
  };
}

function constitutionalVoteContext(
  world: World,
  input: ChamberConstitutionalVoteInput,
): ChamberVoteContext {
  const cutoff = currentHistoricalCutoff(world);
  const measure = world.history.constitutionalMeasures?.find(
    (row) => row.id === input.constitutionalMeasureId,
  );
  const stateProposal = measure?.processKind === "state-amendment";
  const ratification = input.purpose === "ratification";
  const ratificationPack = ratification
    ? legislativePackForJurisdiction(input.ratificationJurisdictionId)
    : null;
  const ratificationRoster = ratification
    ? stateConstitutionalRoster(
        world,
        input.ratificationJurisdictionId,
        input.bodyKey,
        "ratification",
      )
    : null;
  const body = ratification
    ? ratificationRoster?.seated.body
    : stateProposal
      ? stateConstitutionalBody(
          world,
          input.constitutionalMeasureId,
          input.bodyKey,
        ).seated.body
      : seatedCongressChamber(world, input.bodyKey)?.body;
  const members = new Map(
    body?.members.map((member) => [member.memberKey, member.personId]),
  );
  if (
    !measure ||
    !constitutionalEntityAvailableAt(
      world,
      measure.id,
      cutoff.asOfDate,
      cutoff.historySequenceExclusive,
    ) ||
    (measure.processKind !== "federal-amendment" && !stateProposal) ||
    (!ratification && measure.proposedBy === "convention") ||
    (!ratification && measure.proposalRule === null) ||
    (ratification &&
      (measure.processKind !== "federal-amendment" ||
        measure.ratificationMode !== "state-legislatures" ||
        constitutionalPosition(world, measure.id).phase !== "ratification" ||
        !ratificationPack ||
        !ARTICLE_V_STATE_KEYS.includes(ratificationPack.jurisdictionKey) ||
        !ratificationRoster)) ||
    (!ratification &&
      !stateProposal &&
      input.bodyKey !== "house" &&
      input.bodyKey !== "senate") ||
    ((stateProposal || ratification) &&
      input.members.length !== body?.members.length) ||
    !body ||
    new Set(input.members.map((member) => member.memberKey)).size !==
      input.members.length ||
    input.members.some(
      (member) =>
        !members.has(member.memberKey) ||
        members.get(member.memberKey) !== member.personId,
    )
  )
    throw new Error(
      ratification
        ? "A constitutional ratification vote requires its actual federal proposal in ratification, dated state body and seated members."
        : stateProposal
          ? "A constitutional chamber vote requires its actual dated state proposal, body and seated members."
          : "A constitutional chamber vote requires its actual dated congressional proposal, body and seated members.",
    );
  return {
    subject: {
      kind: "context:constitutional-amendment",
      key: ratification
        ? `${measure.stableKey}:${input.ratificationJurisdictionId}:${input.bodyKey}:ratification`
        : `${measure.stableKey}:${input.bodyKey}:${input.purpose}`,
      entityId: null,
    },
    committee: null,
    memberInputs: (member) => ({
      views: input.considerationsByMember.get(member.memberKey) ?? [],
      cues: [],
    }),
  };
}

function nominationVoteContext(
  world: World,
  input: ChamberNominationVoteInput,
): ChamberVoteContext {
  const event = world.history.events.find(
    (row) => row.id === input.nominationEventId,
  );
  if (input.nominationKind === "clemency-board") {
    const traceTag = event?.tags.find((tag) =>
      tag.startsWith("appointment-decision:"),
    );
    const traceId = traceTag?.slice("appointment-decision:".length);
    const trace = world.history.decisionTraces.find(
      (row) => row.id === traceId,
    );
    if (
      !event ||
      event.recordedAt > world.currentDate ||
      event.occurredAt > world.currentDate ||
      event.type !== "justice.clemency-board-nominated" ||
      event.jurisdictionId !== input.jurisdictionId ||
      !world.jurisdictions[input.jurisdictionId] ||
      !world.people[input.appointerId] ||
      !world.people[input.nomineeId] ||
      !Number.isInteger(input.seatOrdinal) ||
      input.seatOrdinal < 1 ||
      input.officeKey !== `${input.boardKey}:seat:${input.seatOrdinal}` ||
      !event.tags.includes(`board-key:${input.boardKey}`) ||
      !event.tags.includes(`seat:${input.seatOrdinal}`) ||
      !event.participants.some(
        (row) =>
          row.role === "agency:appointer" && row.personId === input.appointerId,
      ) ||
      !event.participants.some(
        (row) =>
          row.role === "agency:nominee" && row.personId === input.nomineeId,
      ) ||
      !trace ||
      trace.sequence >= event.sequence ||
      trace.recordedAt > event.recordedAt ||
      trace.context.actorPersonId !== input.appointerId ||
      trace.selectedOptionKey !== `person:${input.nomineeId}`
    )
      throw new Error(
        "A board confirmation requires its actual dated nomination, appointer decision, nominee, jurisdiction and seat.",
      );
    return {
      subject: {
        kind: "context:clemency-board-nomination",
        key: event.stableKey,
        entityId: event.id,
      },
      committee: null,
      memberInputs: (member) => ({
        views: input.considerationsByMember.get(member.memberKey) ?? [],
        cues: [],
      }),
    };
  }
  const chief = input.officeKey === "us-chief-justice";
  if (
    !event ||
    event.recordedAt > world.currentDate ||
    event.occurredAt > world.currentDate ||
    !world.people[input.nomineeId] ||
    !world.people[input.presidentId] ||
    event.type !==
      (chief
        ? "governing.chief-justice-nominated"
        : "governing.supreme-court-nominated") ||
    !event.tags.includes(
      chief ? "office:us-chief-justice" : `judicial-seat:${input.officeKey}`,
    ) ||
    !event.participants.some(
      (row) => row.role === "focus:actor" && row.personId === input.presidentId,
    ) ||
    !event.participants.some(
      (row) => row.role === "focus:subject" && row.personId === input.nomineeId,
    )
  )
    throw new Error(
      "A chamber nomination vote requires its actual dated nomination event, actor, nominee and office.",
    );
  return {
    subject: {
      kind: "context:supreme-court-nomination",
      key: event.stableKey,
      entityId: null,
    },
    committee: null,
    memberInputs: (member) => ({
      views: input.considerationsByMember.get(member.memberKey) ?? [],
      cues: [],
    }),
  };
}

const OPTIONS = [
  { key: "vote-yea", label: "Vote yes", description: "Vote for the question." },
  { key: "vote-nay", label: "Vote no", description: "Vote against it." },
  {
    key: "withhold",
    label: "Answer present",
    description: "Be recorded present without voting either way.",
  },
] as const;

function billVoteContext(
  world: World,
  input: ChamberBillVoteInput,
): ChamberVoteContext {
  const measure = requireMeasure(world, input.question.question.measureId);
  const pack = legislativeRulePackForWorld(world, measure.rulePackId);
  // A pack can supply party cues from its entire saved institution. Supplied
  // members retain precedence; older packs still read only the voting body.
  const known = [
    ...input.members,
    ...(pack.seatRollSource?.partyCueScope === "institution"
      ? pack.chamberOrder.flatMap(
          (chamberKey) =>
            seatedChamberForPack(
              world,
              pack.packId,
              chamberKey,
              chamberByKey(pack, chamberKey).name,
            )?.body.members ?? [],
        )
      : []),
  ];
  const seatedByPerson = new Map<EntityId, SeatedMember>();
  for (const member of known)
    if (member.personId !== null && !seatedByPerson.has(member.personId))
      seatedByPerson.set(member.personId, member);
  const partyOf = (personId: EntityId): string | null => {
    const seated = seatedByPerson.get(personId);
    return seated?.partyKey !== undefined
      ? seated.partyKey
      : publicPartyOf(world, personId);
  };
  // Cosponsoring is a member's own commitment. The party cue follows only
  // the sponsor; one cross-party signature does not change either caucus.
  const cosponsors = measureCosponsors(world, measure.id);
  const sponsorParty = measure.sponsorPersonId
    ? partyOf(measure.sponsorPersonId)
    : null;
  const sponsorParties = new Set(sponsorParty ? [sponsorParty] : []);
  // On an amendment a member offered, the cue comes from the amendment's
  // author: the author votes for their own amendment, the author's party
  // with them. GAME ASSUMPTION (Build 25, hand-set until the research on
  // how floor amendments are decided is read): an amendment one party's
  // member offers to the other party's bill is a contest between the
  // parties, as the bill's floor manager opposes it.
  const author =
    input.question.question.purpose === "amendment"
      ? (input.question.offeredBy ?? null)
      : null;
  const cueSponsor = author ?? measure.sponsorPersonId;
  const cueCosponsors = author ? [] : cosponsors;
  const cueParties = author
    ? new Set(
        [partyOf(author)].filter((party): party is string => party !== null),
      )
    : sponsorParties;
  const acrossTheAisle =
    author !== null &&
    author !== measure.sponsorPersonId &&
    measure.sponsorPersonId !== null &&
    partyOf(author) !== partyOf(measure.sponsorPersonId);
  // A budget (an appropriation, not an amendment to one) is the majority's
  // bill and a contest between the parties: the party that carries it backs
  // it and the other does not. Every member also weighs what it spends
  // against their own principles, and the day the government's offices
  // close without one (`budget-stakes.ts`; CTO ruling, September 29,
  // 9:45 a.m.: "a budget can't pass").
  const budget =
    measure.subjectClass === "appropriation" &&
    input.question.question.purpose !== "amendment";
  const contested =
    input.contested ??
    (input.question.question.purpose === "veto-override" ||
      acrossTheAisle ||
      budget);
  // What the question puts on the table: an amendment's own sections, or the
  // bill as it reads (and would read, for a prediction), sections an adopted
  // amendment carried in included (Build 25 step 1).
  const asked = input.question.question;
  const answersOnTable =
    asked.purpose === "amendment" || input.question.pendingChange
      ? (input.question.pendingChange?.answers ?? [])
      : withParts(
          measureAnswersAt(world, measure.id, undefined, "all"),
          input.question.billAsItWouldRead ?? [],
        );
  // One reading of the voters for the whole body: every member answers to
  // the same place.
  const constituents = input.constituencyId
    ? constituentsConsideration(world, input.constituencyId, answersOnTable)
    : null;
  const deadline = budget
    ? budgetDeadlineConsideration(world, measure.jurisdictionId)
    : null;
  const executive =
    input.executivePersonId &&
    !input.members.some((member) => member.personId === input.executivePersonId)
      ? executivePosition(
          world,
          input.executivePersonId,
          measure,
          answersOnTable,
        )
      : null;

  return {
    subject: {
      kind: "context:legislative-question",
      key: `${measure.stableKey}:${input.question.question.purpose}`,
      entityId: measure.id,
    },
    committee: committeeRecommendation(world, measure.id, asked.purpose),
    memberInputs(member) {
      const party = partyCue(
        member.personId!,
        partyOf(member.personId!),
        cueSponsor,
        cueCosponsors,
        cueParties,
        contested,
        input.nonpartisan ?? false,
      );
      // A member's own view is worked out only when it is needed: when the
      // member decides, or when an undecided member who trusts them asks how
      // they voted. A named few (`only`) no longer costs every member's view.
      const personId = member.personId!;
      let views: readonly DecisionConsideration[] | undefined;
      const viewsOf = (): readonly DecisionConsideration[] =>
        (views ??= [
          ...weighRecordedPolicyBeliefs(
            world,
            personId,
            memberVoteConsiderations(world, {
              stableKey: `${input.stableKey}:${member.memberKey}`,
              personId,
              question: input.question,
            }).filter(
              (consideration) =>
                consideration.stableKey !== "member:nothing-decisive",
            ),
          ),
          // GAME ASSUMPTION (Build 25): a member's principles are what they are
          // known to stand for, so a colleague predicting the vote reads them;
          // a member's private views on a question are not known and are not.
          ...[
            principleVoteConsideration(
              world,
              personId,
              measure,
              answersOnTable,
            ),
            budget ? spendingPrincipleConsideration(world, personId) : null,
          ].filter((consideration) => consideration !== null),
          ...party.filter((consideration) =>
            OWN_BILL_KEYS.has(consideration.stableKey),
          ),
        ]);
      const cues = [
        ...party.filter(
          (consideration) => !OWN_BILL_KEYS.has(consideration.stableKey),
        ),
        ...(constituents ? [constituents] : []),
        ...(executive ? [executive] : []),
        ...(deadline ? [deadline] : []),
      ];
      return {
        get views() {
          return viewsOf();
        },
        cues,
      };
    },
  };
}

export function decideChamberVote(
  world: World,
  input: ChamberVoteInput,
  options: ChamberVoteOptions = {},
): readonly LegislativeVoteDisposition[] {
  const cutoff = currentHistoricalCutoff(world);
  const context =
    input.kind === "nomination"
      ? nominationVoteContext(world, input)
      : input.kind === "constitutional"
        ? constitutionalVoteContext(world, input)
        : billVoteContext(world, input);

  // First pass: each member's own view (their principles, what they said on
  // the record, a formed belief, their own bill) and the cues every member
  // hears (the party of whoever carries it, the voters, the executive).
  const first = input.members.map((member) => {
    if (member.personId === null)
      return {
        member,
        settled: {
          memberKey: member.memberKey,
          personId: null,
          disposition: "absent",
        } satisfies LegislativeVoteDisposition,
      };
    if (member.personId === input.playerPersonId)
      return {
        member,
        settled: (input.playerBallot
          ? {
              memberKey: member.memberKey,
              personId: member.personId,
              disposition: input.playerBallot,
              reason: "member:own-ballot",
            }
          : {
              memberKey: member.memberKey,
              personId: member.personId,
              disposition: "absent",
              reason: "member:player-not-present",
            }) satisfies LegislativeVoteDisposition,
      };
    const memberInputs = context.memberInputs(member);
    return {
      member,
      get views() {
        return memberInputs.views;
      },
      cues: memberInputs.cues,
      settled: null,
    };
  });

  // A member with a view of their own decides from it and the cues, decided
  // once and only when asked for: a named few (`only`) decide exactly as in a
  // full count without every other member's ballot being worked out.
  const byView = new Map<SeatedMember, ChamberVoteMemberEvaluation>();
  const decideByView = (row: (typeof first)[number]) => {
    if (row.settled)
      return {
        disposition: row.settled,
        evaluation: null,
        sourceRefs: [],
      } satisfies ChamberVoteMemberEvaluation;
    if (!row.views || row.views.length === 0) return null;
    let settled = byView.get(row.member);
    if (!settled) {
      settled = decideMember(row.member, [...row.views, ...(row.cues ?? [])]);
      byView.set(row.member, settled);
    }
    return settled;
  };
  const deciding = input.only
    ? first.filter((row) => input.only!.has(row.member.memberKey))
    : first;

  // Second pass: a member with no view of their own also takes the cues
  // real members use: the committee's report, and how the colleagues they
  // trust voted from views of their own. Nobody leans yes by default; a
  // member with no reason at all answers present.
  const committee = context.committee;
  const hasViews = (row: (typeof first)[number]): boolean =>
    !row.settled && row.views !== undefined && row.views.length > 0;
  const rowsOf = new Map<EntityId, (typeof first)[number][]>();
  for (const row of first)
    if (row.member.personId !== null)
      rowsOf.set(row.member.personId, [
        ...(rowsOf.get(row.member.personId) ?? []),
        row,
      ]);
  const trusted = trustAmong(
    world,
    deciding.flatMap((row) =>
      !row.settled && row.views?.length === 0 && row.member.personId
        ? [row.member.personId]
        : [],
    ),
    (personId) => (rowsOf.get(personId) ?? []).some(hasViews),
  );
  const colleagues = new Set(
    [...trusted.values()].flatMap((row) => [...row.keys()]),
  );
  const decidedByView = new Map<EntityId, LegislativeMemberDisposition>();
  for (const row of first) {
    if (row.member.personId === null || !colleagues.has(row.member.personId))
      continue;
    if (!hasViews(row)) continue;
    const disposition = decideByView(row)?.disposition.disposition;
    if (disposition === "yea" || disposition === "nay")
      decidedByView.set(row.member.personId, disposition);
  }
  return deciding.map((row) => {
    const settled = decideByView(row);
    const decision =
      settled ??
      (() => {
        const personId = row.member.personId!;
        return decideMember(row.member, [
          ...(row.cues ?? []),
          ...(committee ? [committee] : []),
          ...trustedColleagueCues(trusted.get(personId), decidedByView),
        ]);
      })();
    options.onMemberEvaluation?.(decision);
    return decision.disposition;
  });

  function decideMember(
    member: SeatedMember,
    considerations: readonly DecisionConsideration[],
  ): ChamberVoteMemberEvaluation {
    if (considerations.length === 0)
      return {
        disposition: {
          memberKey: member.memberKey,
          personId: member.personId,
          disposition: "present-not-voting",
          reason: "member:no-reason",
        },
        evaluation: null,
        sourceRefs: [],
      };
    const { evaluation, disposition } = decideMemberVote(world, {
      stableKey: `${input.stableKey}:${member.memberKey}:decision`,
      decisionType: "legislation.member-vote",
      actorPersonId: member.personId!,
      cutoff,
      subject: context.subject,
      options: [...OPTIONS],
      constraints: [],
      considerations: [...considerations],
      perceptionIds: [],
      randomness: "none",
      retention: "ephemeral",
    });
    input.onDecision?.(evaluation);
    const selected = evaluation.selectedOptionKey ?? "withhold";
    const decisive = considerations
      .filter((consideration) => consideration.optionKey === selected)
      .sort(
        (l, r) =>
          Math.abs(considerationScore(r)) - Math.abs(considerationScore(l)),
      )[0];
    return {
      disposition: {
        memberKey: member.memberKey,
        personId: member.personId,
        disposition,
        reason: decisive
          ? decisive.sourceType === "belief:formed-position" &&
            decisive.sourceRefs[0]?.kind === "private-belief"
            ? `member:private-belief:${decisive.sourceRefs[0].beliefId}`
            : KEPT_REASON_PREFIXES.some((prefix) =>
                  decisive.stableKey.startsWith(prefix),
                )
              ? decisive.stableKey
              : decisive.stableKey.split(":").slice(0, 2).join(":")
          : "member:no-reason",
      },
      evaluation,
      sourceRefs: evaluation.sourceSnapshots.map(
        (snapshot) => snapshot.reference,
      ),
    };
  }
}

const MEMBER_BELIEF_IMPORTANCE = [
  "slight",
  "moderate",
  "strong",
  "decisive",
] as const;

/**
 * A member's recorded deliberation changes the weight of their own recorded
 * policy belief; it never supplies a side to vote for. The low pole (thinks it
 * through) strengthens that belief by the recorded magnitude, while the high
 * pole (acts on impulse) weakens it by the same amount. Unrecorded and
 * balanced traits leave the established vote reasons exactly as they are.
 */
function weighRecordedPolicyBeliefs(
  world: World,
  personId: EntityId,
  considerations: readonly DecisionConsideration[],
): readonly DecisionConsideration[] {
  const trait = traitRegistryFor(world).traits.get(
    `${PEOPLE_MIND_VERSION}:deliberation`,
  );
  if (!trait) return considerations;
  const reading = readTrait(world, personId, trait);
  if (reading.state !== "recorded" || reading.value === 0)
    return considerations;

  const direction = reading.value < 0 ? 1 : -1;
  const steps = Math.abs(reading.value);
  return considerations.map((consideration) => {
    if (
      consideration.sourceType !== "belief:formed-position" ||
      !consideration.sourceRefs.some(
        (reference) => reference.kind === "private-belief",
      )
    )
      return consideration;
    const current = MEMBER_BELIEF_IMPORTANCE.indexOf(
      consideration.importance as (typeof MEMBER_BELIEF_IMPORTANCE)[number],
    );
    if (current < 0) return consideration;
    const next = Math.max(
      0,
      Math.min(
        MEMBER_BELIEF_IMPORTANCE.length - 1,
        current + direction * steps,
      ),
    );
    if (next === current) return consideration;
    return {
      ...consideration,
      importance: MEMBER_BELIEF_IMPORTANCE[next]!,
      explanation:
        consideration.explanation +
        (direction > 0
          ? " Their recorded deliberation gives this considered view more weight."
          : " Their recorded impulsiveness gives this considered view less weight."),
      sourceRefs: [
        ...consideration.sourceRefs,
        { kind: "personality-tendency", tendencyRecordId: reading.recordId },
      ],
    };
  });
}

/** A member's own bill, or one they put their name on: a view, not a cue. */
const OWN_BILL_KEYS: ReadonlySet<string> = new Set([
  "member:own-bill",
  "member:cosponsor",
]);

/** Reasons saved whole, with the side they took. */
const KEPT_REASON_PREFIXES = [
  "member:party-cue:",
  "member:principle:",
  "member:spending:",
  "member:constituents:",
  "member:executive:",
  "member:trusted-colleague:",
  "senator:",
];

/**
 * The executive's known position on what is on the table (a mayor's on an
 * ordinance), read from their principles as a colleague reads a member's.
 *
 * GAME ASSUMPTION (Build 25), hand-set until the research on how an
 * executive's stand moves a legislative body is read: a "slight" reason for
 * every member, whatever their party.
 */
function executivePosition(
  world: World,
  executivePersonId: EntityId,
  measure: ReturnType<typeof requireMeasure>,
  answers: Parameters<typeof principleVoteConsideration>[3],
): DecisionConsideration | null {
  const stand = principleVoteConsideration(
    world,
    executivePersonId,
    measure,
    answers,
  );
  if (!stand) return null;
  const favor = stand.optionKey === "vote-yea";
  return {
    stableKey: favor ? "member:executive:for" : "member:executive:against",
    optionKey: stand.optionKey,
    sourceType: "context:executive-position",
    direction: "supports",
    importance: "slight",
    confidence: "medium",
    explanation: favor
      ? "The executive is known to favor it."
      : "The executive is known to oppose it.",
    sourceRefs: [],
  };
}

/**
 * On a floor question, a committee that reported the bill favorably is a
 * reason for a member with no view of their own to follow it.
 *
 * GAME ASSUMPTION (Build 25): a "slight" reason.
 */
function committeeRecommendation(
  world: World,
  measureId: EntityId,
  purpose: string,
): DecisionConsideration | null {
  if (purpose !== "floor-stage") return null;
  const reported = (world.history.legislativeVotes ?? []).some(
    (vote) =>
      vote.measureId === measureId &&
      vote.purpose === "committee-report" &&
      vote.outcome === "passed",
  );
  if (!reported) return null;
  return {
    stableKey: "member:committee-recommends",
    optionKey: "vote-yea",
    sourceType: "context:committee-report",
    direction: "supports",
    importance: "slight",
    confidence: "medium",
    explanation:
      "The committee that studied it sent it to the floor with its backing.",
    sourceRefs: [],
  };
}

/**
 * How much each undecided member trusts each colleague who voted from a view
 * of their own, read from the relationship log (`relationship-standing.ts`).
 * Only pairs the log mentions are read.
 */
function trustAmong(
  world: World,
  undecided: readonly EntityId[],
  decided: (personId: EntityId) => boolean,
): ReadonlyMap<EntityId, ReadonlyMap<EntityId, StandingBand>> {
  const out = new Map<EntityId, Map<EntityId, StandingBand>>();
  if (undecided.length === 0) return out;
  const undecidedSet = new Set(undecided);
  // Asked only of people an undecided member has met, and remembered: a
  // colleague's own view is worked out only when it could be a cue.
  const decidedMemo = new Map<EntityId, boolean>();
  const isDecided = (personId: EntityId): boolean => {
    let known = decidedMemo.get(personId);
    if (known === undefined) {
      known = decided(personId);
      decidedMemo.set(personId, known);
    }
    return known;
  };
  const pairs = new Set<string>();
  for (const interaction of world.history.relationshipInteractions)
    for (const viewer of interaction.personIds)
      if (undecidedSet.has(viewer))
        for (const subject of interaction.personIds)
          if (subject !== viewer && isDecided(subject))
            pairs.add(`${viewer}\u0000${subject}`);
  for (const pair of pairs) {
    const [viewer, subject] = pair.split("\u0000") as [EntityId, EntityId];
    const trust = readRelationshipStanding(world, viewer, subject).readings
      .trust;
    if (trust.adverse || trust.band === "none") continue;
    const row = out.get(viewer) ?? new Map<EntityId, StandingBand>();
    row.set(subject, trust.band);
    out.set(viewer, row);
  }
  return out;
}

/**
 * The side the colleagues a member trusts most took, as a reason.
 *
 * GAME ASSUMPTION (Build 25): the reason is as strong as the trust ("slight"
 * trust a slight reason, "marked" a moderate one, "strong" a strong one), and
 * where trusted colleagues split, each side is weighed at its most trusted.
 */
function trustedColleagueCues(
  trust: ReadonlyMap<EntityId, StandingBand> | undefined,
  decidedByView: ReadonlyMap<EntityId, LegislativeMemberDisposition>,
): readonly DecisionConsideration[] {
  if (!trust) return [];
  const rank = { none: 0, slight: 1, marked: 2, strong: 3 } as const;
  const best = new Map<"yea" | "nay", StandingBand>();
  for (const [colleague, band] of trust) {
    const side = decidedByView.get(colleague);
    if (side !== "yea" && side !== "nay") continue;
    const held = best.get(side);
    if (!held || rank[band] > rank[held]) best.set(side, band);
  }
  return [...best].map(([side, band]) => ({
    stableKey: `member:trusted-colleague:${side}`,
    optionKey: side === "yea" ? "vote-yea" : "vote-nay",
    sourceType: "context:trusted-colleague",
    direction: "supports",
    importance:
      band === "strong" ? "strong" : band === "marked" ? "moderate" : "slight",
    confidence: "medium",
    explanation: `Colleagues the member trusts voted ${side === "yea" ? "for" : "against"} it.`,
    sourceRefs: [],
  }));
}

function partyCue(
  personId: EntityId,
  party: string | null,
  sponsorPersonId: EntityId | null,
  cosponsors: readonly EntityId[],
  sponsorParties: ReadonlySet<string>,
  contested: boolean,
  nonpartisan: boolean,
): readonly DecisionConsideration[] {
  if (sponsorPersonId === personId)
    return [
      {
        stableKey: "member:own-bill",
        optionKey: "vote-yea",
        sourceType: "context:own-bill",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: "The member is carrying this bill.",
        sourceRefs: [],
      },
    ];
  if (cosponsors.includes(personId))
    return [
      {
        stableKey: "member:cosponsor",
        optionKey: "vote-yea",
        sourceType: "context:own-bill",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: "The member put their name on this bill.",
        sourceRefs: [],
      },
    ];
  // A body elected without party labels has no party cue at all.
  if (nonpartisan) return [];
  // A member with no national party, as in Puerto Rico's chambers, or a bill
  // whose sponsor has none, carries no party cue either way.
  const same = party !== null && sponsorParties.has(party);
  if (contested && (!party || sponsorParties.size === 0)) return [];
  // A member of the other party on a question that is no contest between
  // the parties has no party reason either way. They no longer lean yes by
  // default (CTO ruling, September 29, 12:54 a.m.): with no view of their
  // own, they take the other cues (`decideChamberVote`).
  if (!same && !contested) return [];
  return [
    {
      stableKey: same ? "member:party-cue:same" : "member:party-cue:other",
      optionKey: same ? "vote-yea" : "vote-nay",
      sourceType: "context:sponsor-party",
      direction: "supports",
      importance: same ? "moderate" : "slight",
      confidence: "medium",
      explanation: same
        ? "The bill is carried by a member of the member's own party."
        : "The bill is carried by a member of the other party.",
      sourceRefs: [],
    },
  ];
}
