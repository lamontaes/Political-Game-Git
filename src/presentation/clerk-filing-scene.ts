import {
  activeCampaignForCandidate,
  canPersonAccess,
  candidacyEligibility,
  compareSimulationMoments,
  createCampaignElectionTransitionRegistry,
  electiveOfficesForJurisdiction,
  personName,
  scheduledActivityState,
  type EntityId,
  type FutureTransitionHandlerRegistry,
  type RuleValue,
  type World,
} from "../simulation";
import {
  candidateFilingTerms,
  filingDeadlineBefore,
} from "../simulation/candidate-filing-terms";
import { filingOfficeForSeat } from "../simulation/filing-office";
import {
  FILING_OFFICE_JOURNEY_KEY,
  FILING_OFFICE_LOCATION_KEY,
  FILING_VISIT_REQUESTED,
  scheduledFilingVisits,
} from "../simulation/filing-visit";
import {
  municipalSeatChoices,
  type MunicipalSeatChoice,
} from "../simulation/municipal-seat-identity";
import { recordEventKnowledge } from "../simulation/records";
import { cancelScheduledActivity } from "../simulation/time-work";
import { recordWorldEvent } from "../simulation/world";
import {
  availableCampaignElectionDate,
  campaignElectionDateIsEstimated,
  fileForOffice,
} from "./campaign-projection";
import { meetingDepartureRoute, meetingHomeRoute } from "./meeting-home-route";
import { travelToPlace } from "./place-travel";
import { performVenueActivity, venueActivities } from "./venue-activity";

/**
 * At the clerk's counter: the conversation that teaches a new candidate what
 * a seat asks and files them for it.
 *
 * The player arrives at a filing visit (`filing-visit.ts`) and finds the clerk
 * who takes filings there. Each question is answered from the records the
 * game holds for the seats this office files — the age and residence a seat
 * asks, the fee, signatures and deadline, the election date, and who has
 * already filed — and the answer is saved on the record with what the player
 * now knows. Filing goes through the one filing writer (`fileForOffice`), at
 * the counter rather than from a form.
 */
export type ClerkQuestion = "requirements" | "filing" | "filed";

export const CLERK_QUESTIONS: readonly ClerkQuestion[] = [
  "requirements",
  "filing",
  "filed",
];

export const CLERK_SCENE_VERSION = "clerk-filing-scene-v1";
export const CLERK_SCENE_ENTERED = "civic.filing-visit-entered";
export const CLERK_SCENE_QUESTION = "civic.filing-visit-question";
export const CLERK_SCENE_FILED = "civic.filing-visit-filed";
export const CLERK_SCENE_LEFT = "civic.filing-visit-left";

const baseKey = (activityId: EntityId) =>
  `${CLERK_SCENE_VERSION}:${activityId}`;

/** One rule the way the counter states it: a value with its source, or what is missing. */
export type ClerkRuleRecord =
  | {
      readonly kind: "known";
      readonly value: number | string;
      readonly citation: string;
      readonly estimated: boolean;
    }
  | { readonly kind: "unknown" | "not-applicable" };

function ruleRecord<T extends number | string>(
  rule: RuleValue<T>,
): ClerkRuleRecord {
  return rule.kind === "known"
    ? {
        kind: "known",
        value: rule.value,
        citation: rule.source.citation,
        estimated: rule.source.verification === "game-profile",
      }
    : { kind: rule.kind };
}

/** What the clerk told the player about one seat, as saved. */
export interface ClerkSeatAnswer {
  readonly officeKey: string;
  readonly officeName: string;
  readonly minimumAge?: ClerkRuleRecord;
  readonly residency?: ClerkRuleRecord;
  readonly eligible?: boolean;
  readonly blockKinds?: readonly string[];
  readonly electionDate?: string | null;
  readonly electionDateEstimated?: boolean;
  readonly feeMinorUnits?: number;
  readonly signatures?:
    number | { readonly percent: number; readonly base: string };
  readonly feeInLieuOfSignatures?: boolean;
  readonly circulationOpens?: string;
  readonly deadline?: string;
  /** The deadline on this election's calendar; always an estimate. */
  readonly deadlineDate?: string | null;
  readonly termsEstimatedFrom?: string | null;
  readonly filed?: readonly {
    readonly personId: EntityId;
    readonly name: string;
    readonly filedAt: string;
  }[];
}

function recordedAnswer(value: string | undefined): readonly ClerkSeatAnswer[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ClerkSeatAnswer[]) : [];
  } catch {
    return [];
  }
}

/** The visit the player is standing in, with its clerk and arrival, or null. */
function visitHere(world: World, personId: EntityId, activityId: EntityId) {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const activity = world.history.scheduledActivities.find(
    (item) => item.id === activityId,
  );
  if (
    !activity ||
    activity.location.locationKey !== FILING_OFFICE_LOCATION_KEY ||
    activity.responsiblePersonId !== personId ||
    !canPersonAccess(activity.access, personId)
  )
    return null;
  const state = scheduledActivityState(world, activityId);
  if (
    state.status !== "scheduled" ||
    compareSimulationMoments(world.currentMoment, state.start) !== 0
  )
    return null;
  const clerkPersonId = activity.participantPersonIds.find(
    (id) => id !== personId,
  );
  if (
    !clerkPersonId ||
    !world.people[clerkPersonId] ||
    world.history.personDeaths.some(
      (death) =>
        death.personId === clerkPersonId && death.diedAt <= world.currentDate,
    )
  )
    return null;
  const request = world.history.events.find(
    (event) =>
      event.type === FILING_VISIT_REQUESTED &&
      activity.sourceEntityIds.includes(event.id),
  );
  const officeKey = request?.context.choice ?? null;
  if (!officeKey) return null;
  // The official's own title, as recorded when the visit was arranged; the
  // calendar entry carries the office's, which can be a board's name.
  const clerkTitle =
    request!.participants.find(
      (actor) =>
        actor.personId === clerkPersonId && actor.role === "agency:asked",
    )?.detail ?? activity.title;
  const arrival = world.history.events
    .filter(
      (event) =>
        event.type === "life.scene.arrived" &&
        event.participants.some(
          (actor) =>
            actor.personId === personId &&
            actor.role === "presence:participant",
        ),
    )
    .at(-1);
  if (
    !arrival ||
    !arrival.involvedEntityIds.includes(activityId) ||
    !arrival.tags.includes(`route:${FILING_OFFICE_JOURNEY_KEY}`) ||
    !arrival.tags.includes(`place:${FILING_OFFICE_LOCATION_KEY}`)
  )
    return null;
  return { activity, clerkPersonId, clerkTitle, officeKey, arrival };
}

/** The first arrival records the player at the counter, with the clerk. */
export function enterFilingVisit(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const here = visitHere(world, personId, activityId);
  const key = `${baseKey(activityId)}:entry`;
  if (!here || world.history.events.some((event) => event.stableKey === key))
    return world;
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: CLERK_SCENE_ENTERED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: here.activity.location.jurisdictionId,
    involvedEntityIds: [activityId, personId, here.clerkPersonId],
    participants: [
      { personId, role: "presence:participant", detail: null },
      {
        personId: here.clerkPersonId,
        role: "coordination:host",
        detail: here.clerkTitle,
      },
      {
        personId: here.clerkPersonId,
        role: "presence:participant",
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      CLERK_SCENE_VERSION,
      `activity:${activityId}`,
      `arrival:${here.arrival.id}`,
      `office:${here.officeKey}`,
    ],
    summary: CLERK_SCENE_ENTERED,
    context: {
      location: here.arrival.context.location,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const entry = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${key}:knowledge`,
    personId,
    eventId: entry.id,
    learnedAt: next.currentDate,
    believedSummary: entry.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

/** Attend: make the journey when it is still to make, then step up to the counter. */
export function arriveAtFilingVisit(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const entered = enterFilingVisit(world, personId, activityId);
  if (entered !== world) return entered;
  const offer = venueActivities(world, personId, handlers).find(
    (candidate) => candidate.activity.id === activityId,
  );
  if (!offer || offer.refusal || !offer.journey) return world;
  const arrived = offer.journey.alreadyCompleted
    ? world
    : performVenueActivity(
        world,
        personId,
        offer.journey.activity.id,
        handlers,
      );
  return enterFilingVisit(arrived, personId, activityId);
}

/** Whether attending this activity means stepping up to a clerk's counter. */
export function isFilingVisit(world: World, activityId: EntityId): boolean {
  return world.history.scheduledActivities.some(
    (activity) =>
      activity.id === activityId &&
      activity.location.locationKey === FILING_OFFICE_LOCATION_KEY,
  );
}

/** Every seat this office takes filings for that the player could stand for. */
function seatsFiledHere(
  world: World,
  personId: EntityId,
  officeKey: string,
): readonly {
  readonly officeKey: string;
  readonly officeName: string;
  readonly eligible: boolean;
  readonly blockKinds: readonly string[];
  /** The numbered seats a filing for this office names, where it names one. */
  readonly seatChoices: readonly MunicipalSeatChoice[];
}[] {
  const person = world.people[personId]!;
  const office = filingOfficeForSeat(world, officeKey);
  if (!office) return [];
  const campaign = activeCampaignForCandidate(world, personId);
  return electiveOfficesForJurisdiction(
    person.homeJurisdictionId,
    world.currentDate,
    world,
  )
    .filter(
      (option) =>
        filingOfficeForSeat(world, option.officeKey)?.unit.id ===
        office.unit.id,
    )
    .map((option) => {
      const eligibility = candidacyEligibility(world, {
        personId,
        jurisdictionId: person.homeJurisdictionId,
        officeKey: option.officeKey,
        alreadyACandidate: campaign !== null,
      });
      return {
        officeKey: option.officeKey,
        officeName: option.office.title,
        eligible:
          eligibility.eligible &&
          availableCampaignElectionDate(
            world,
            person.homeJurisdictionId,
            option.officeKey,
          ) !== null,
        blockKinds: eligibility.blocks.map((block) => block.kind),
        seatChoices: municipalSeatChoices(world, personId, option.officeKey),
      };
    });
}

/** Reading the counter: no write and no clock. */
export function projectClerkFilingScene(world: World, personId: EntityId) {
  const visit = scheduledFilingVisits(world, personId).find((activity) => {
    const state = scheduledActivityState(world, activity.id);
    return compareSimulationMoments(world.currentMoment, state.start) === 0;
  });
  if (!visit) return null;
  const here = visitHere(world, personId, visit.id);
  if (!here) return null;
  const entry = world.history.events.find(
    (event) =>
      event.stableKey === `${baseKey(visit.id)}:entry` &&
      event.tags.includes(`arrival:${here.arrival.id}`),
  );
  if (
    !entry ||
    !world.history.knowledge.some(
      (item) =>
        item.eventId === entry.id &&
        item.personId === personId &&
        item.accuracy === "accurate" &&
        item.source.kind === "direct",
    )
  )
    return null;
  const turns = world.history.events.filter(
    (event) =>
      (event.type === CLERK_SCENE_QUESTION ||
        event.type === CLERK_SCENE_FILED) &&
      event.tags.includes(`entry:${entry.id}`),
  );
  const asked = new Set(
    turns.flatMap((event) =>
      event.type === CLERK_SCENE_QUESTION && event.context.choice
        ? [event.context.choice]
        : [],
    ),
  );
  const questions = CLERK_QUESTIONS.filter((question) => !asked.has(question));
  const seats = seatsFiledHere(world, personId, here.officeKey);
  const campaign = activeCampaignForCandidate(world, personId);
  const fileable = campaign
    ? []
    : seats.filter((seat) => seat.eligible).map((seat) => seat.officeKey);
  return {
    phase: "active" as const,
    activityId: visit.id,
    eventId: entry.id,
    location: here.activity.location,
    actors: [
      {
        personId: here.clerkPersonId,
        name: personName(world.people[here.clerkPersonId]!),
        role: here.clerkTitle,
        recordIds: [entry.id],
      },
    ],
    seats,
    questions,
    turns: turns.map((event) => ({
      kind: event.type,
      question: event.context.choice,
      answer: recordedAnswer(event.context.campaignGuidanceAnswer),
      eventId: event.id,
    })),
    campaignId: campaign?.id ?? null,
    availableActions: [
      ...questions,
      ...fileable.map((officeKey) => `file:${officeKey}` as const),
      "stay",
      "leave",
    ] as readonly string[],
  };
}

export type ClerkFilingScene = NonNullable<
  ReturnType<typeof projectClerkFilingScene>
>;

/** The answer to one question, for each seat this office files, from the records. */
export function clerkAnswerRecords(
  world: World,
  personId: EntityId,
  officeKey: string,
  question: ClerkQuestion,
): readonly ClerkSeatAnswer[] {
  const person = world.people[personId];
  if (!person) return [];
  const seats = seatsFiledHere(world, personId, officeKey);
  const options = electiveOfficesForJurisdiction(
    person.homeJurisdictionId,
    world.currentDate,
    world,
  );
  return seats.map((seat) => {
    const option = options.find((row) => row.officeKey === seat.officeKey)!;
    const base = { officeKey: seat.officeKey, officeName: seat.officeName };
    if (question === "requirements")
      return {
        ...base,
        minimumAge: ruleRecord(option.qualification.minimumAge),
        residency: ruleRecord(option.qualification.residency),
        eligible: seat.eligible,
        blockKinds: seat.blockKinds,
      };
    if (question === "filing") {
      const office = filingOfficeForSeat(world, seat.officeKey)!;
      const terms = candidateFilingTerms(office.unit.stateUsps, "local");
      const electionDate = availableCampaignElectionDate(
        world,
        person.homeJurisdictionId,
        seat.officeKey,
      );
      return {
        ...base,
        electionDate,
        electionDateEstimated: campaignElectionDateIsEstimated(
          world,
          seat.officeKey,
        ),
        feeMinorUnits: terms.feeMinorUnits,
        signatures: terms.signatures,
        feeInLieuOfSignatures: terms.feeInLieuOfSignatures,
        circulationOpens: terms.circulationOpens,
        deadline: terms.deadline,
        deadlineDate: electionDate
          ? filingDeadlineBefore(office.unit.stateUsps, electionDate).date
          : null,
        termsEstimatedFrom: terms.estimated ? terms.estimatedFrom : null,
      };
    }
    const contests = (world.history.electionContests ?? []).filter(
      (contest) =>
        contest.jurisdictionId === person.homeJurisdictionId &&
        contest.office.officeKey === seat.officeKey &&
        contest.electionDate >= world.currentDate,
    );
    const filed = contests.flatMap((contest) =>
      contest.candidatePersonIds.flatMap((candidateId) => {
        const record = (world.history.campaigns ?? []).find(
          (campaign) =>
            campaign.contestId === contest.id &&
            campaign.candidatePersonId === candidateId,
        );
        return world.people[candidateId]
          ? [
              {
                personId: candidateId,
                name: personName(world.people[candidateId]!),
                filedAt: record?.filedAt ?? contest.electionDate,
              },
            ]
          : [];
      }),
    );
    return { ...base, filed };
  });
}

/** A question and the record data that answers it are saved together, once. */
export function askClerk(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  question: ClerkQuestion,
): World {
  const scene = projectClerkFilingScene(world, personId);
  if (
    !scene ||
    scene.activityId !== activityId ||
    !scene.questions.includes(question)
  )
    return world;
  const here = visitHere(world, personId, activityId)!;
  const answer = clerkAnswerRecords(world, personId, here.officeKey, question);
  const clerk = scene.actors[0]!;
  const key = `${baseKey(activityId)}:question:${question}`;
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: CLERK_SCENE_QUESTION,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [activityId, personId, clerk.personId],
    participants: [
      { personId, role: "agency:actor", detail: question },
      { personId: clerk.personId, role: "presence:participant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`entry:${scene.eventId}`, `question:${question}`],
    summary: question,
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "clerk's office",
      },
      socialContext: null,
      pressure: null,
      choice: question,
      motivation: null,
      immediateReaction: null,
      campaignGuidanceAnswer: JSON.stringify(answer),
    },
  });
  const turn = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${key}:knowledge`,
    personId,
    eventId: turn.id,
    learnedAt: next.currentDate,
    believedSummary: turn.context.campaignGuidanceAnswer ?? "[]",
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: clerk.personId, claimId: null },
  });
}

/**
 * File at the counter: the clerk takes the declaration through the one filing
 * writer, and the visit records which campaign it started. An office filed by
 * numbered seat takes the seat the player names. Returns the same World when
 * the seat cannot be filed for here.
 */
export function fileAtClerk(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  officeKey: string,
  seatChoiceKey: string | null = null,
): World {
  const scene = projectClerkFilingScene(world, personId);
  if (
    !scene ||
    scene.activityId !== activityId ||
    !scene.availableActions.includes(`file:${officeKey}`)
  )
    return world;
  const choices = municipalSeatChoices(world, personId, officeKey);
  const seat =
    choices.length === 0
      ? null
      : (choices.find(
          (choice) => choice.key === seatChoiceKey && choice.eligible,
        )?.key ?? null);
  if (choices.length > 0 && seat === null) return world;
  const filed = fileForOffice(world, personId, null, officeKey, null, seat);
  const campaign = activeCampaignForCandidate(filed, personId);
  if (!campaign) return world;
  const clerk = scene.actors[0]!;
  const key = `${baseKey(activityId)}:filed:${officeKey}`;
  // The counter shows the filing as it shows every answer: the seat and who
  // has now filed for it, the player among them.
  const answer = clerkAnswerRecords(filed, personId, officeKey, "filed").filter(
    (row) => row.officeKey === officeKey,
  );
  const next = recordWorldEvent(filed, {
    stableKey: key,
    type: CLERK_SCENE_FILED,
    occurredAt: filed.currentDate,
    recordedAt: filed.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [activityId, personId, clerk.personId, campaign.id],
    participants: [
      { personId, role: "agency:actor", detail: officeKey },
      {
        personId: clerk.personId,
        role: "presence:participant",
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `entry:${scene.eventId}`,
      `office:${officeKey}`,
      `campaign:${campaign.id}`,
    ],
    summary: CLERK_SCENE_FILED,
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "clerk's office",
      },
      socialContext: null,
      pressure: null,
      choice: `file:${officeKey}`,
      motivation: null,
      immediateReaction: null,
      campaignGuidanceAnswer: JSON.stringify(answer),
    },
  });
  const turn = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${key}:knowledge`,
    personId,
    eventId: turn.id,
    learnedAt: next.currentDate,
    believedSummary: turn.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

/** Leave the counter before the visit's time is up, by the same local route home. */
export function leaveFilingVisit(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry = createCampaignElectionTransitionRegistry(),
): World {
  const scene = projectClerkFilingScene(world, personId);
  if (scene?.activityId !== activityId) return world;
  if (meetingDepartureRoute(world, personId).kind !== "available") return world;
  const cancelled = cancelScheduledActivity(world, activityId);
  if (meetingHomeRoute(cancelled, personId).kind !== "available") return world;
  const noted = recordWorldEvent(cancelled, {
    stableKey: `${baseKey(activityId)}:left`,
    type: CLERK_SCENE_LEFT,
    occurredAt: cancelled.currentDate,
    recordedAt: cancelled.currentDate,
    jurisdictionId: scene.location.jurisdictionId,
    involvedEntityIds: [activityId, personId, scene.actors[0]!.personId],
    participants: [
      { personId, role: "agency:actor", detail: "leave" },
      {
        personId: scene.actors[0]!.personId,
        role: "presence:participant",
        detail: null,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`entry:${scene.eventId}`],
    summary: CLERK_SCENE_LEFT,
    context: {
      location: {
        jurisdictionId: scene.location.jurisdictionId,
        label: scene.location.label,
        setting: "clerk's office",
      },
      socialContext: null,
      pressure: null,
      choice: "leave",
      motivation: null,
      immediateReaction: null,
    },
  });
  const home = travelToPlace(
    noted,
    personId,
    "home",
    (current, actor, destination) =>
      destination === "home"
        ? meetingHomeRoute(current, actor)
        : { kind: "unavailable", reason: "This action returns home." },
    handlers,
  );
  return home === noted ? world : home;
}
