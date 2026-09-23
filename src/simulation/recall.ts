import { addDays } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { organizationParticipationStateHistory } from "./life-queries";
import { recordOrganizationParticipationState } from "./life";
import { municipalGovernmentByKey } from "./municipal-government";
import {
  resolveMunicipalRecallRule,
  type MunicipalBallotRuleBasis,
} from "./municipal-ballot-rules";
import type {
  MunicipalRecallDoctrine,
  PetitionThreshold,
} from "./municipal-election-rules";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "./municipal-public-work";
import { stateName } from "./office-qualification-rules";
import { personName } from "./people";
import { SeededRng } from "./rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * RECALL — voters removing an elected official before the term ends.
 *
 * A resident starts a petition against someone sitting on their town's
 * governing body. It circulates for the window the state's law gives; if it
 * gathers enough signatures, a recall election is held; if the voters vote to
 * remove, the official's seat ends that day. Every step is a public record,
 * dated on the ordinary clock, so a recall happens the same way whether the
 * player is watching or not.
 *
 * What is read from law: whether a state lets towns recall at all, and the
 * doctrine, signature threshold and circulation window, through the
 * authorized resolver `resolveMunicipalRecallRule` (`municipal-ballot-rules.ts`),
 * which reads the state's municipal rule pack. Where the pack is missing or
 * does not settle the doctrine or window, the owner's standing rule applies:
 * it is drawn from the range the read states span, stable per state, and
 * labeled `national-range-drawn`. It is never another state's law.
 *
 * PLACEHOLDERS, NOT RESEARCH, pending `recall-of-officials-52`:
 * - Whether a petition gathers enough signatures. The game has no count of a
 *   town's voters (place demography records population, not electors) and no
 *   measure of how people feel about an official, so qualification is a
 *   keyed draw at `RECALL_PROFILE.qualifyPermille`.
 * - The recall vote itself, a keyed draw in `RECALL_PROFILE.removeYesShare`,
 *   recorded as shares of 10,000 because turnout is not modeled.
 * - When the election is held: `electionLeadDays` after the petition closes.
 *
 * NOT MODELED, with the blanket rule applied meanwhile:
 * - Recall of state officers, legislators and judges. Refused with the reason
 *   until the research returns their rules.
 * - Grounds. Where a state requires stated grounds, the petition records that
 *   they are required; no court tests them.
 * - Who replaces the official. Every doctrine is treated as a bare
 *   keep-or-remove question, and the seat stays empty until the town's next
 *   regular election; a replacement race on the same ballot and a vacancy
 *   appointment are not modeled.
 * - Anyone other than a resident starting a petition, and the world starting
 *   one on its own (no recorded cause exists yet).
 */

export const RECALL_VERSION = "recall/v1";
export const RECALL_PETITION_CLOSES = "civic:recall-petition-closes" as const;
export const RECALL_ELECTION = "civic:recall-election" as const;

export const RECALL_PETITION_STARTED = "civic.recall-petition-started";
export const RECALL_PETITION_CLOSED = "civic.recall-petition-closed";
export const RECALL_ELECTION_HELD = "civic.recall-election-held";

/** Every value is a placeholder pending `recall-of-officials-52`. */
export const RECALL_PROFILE = {
  id: "ocd-recall-placeholder/v1",
  /** Chance, per mille, that a petition gathers enough valid signatures. */
  qualifyPermille: 350,
  /** The recall vote's yes share, in shares of 10,000, drawn from [min, max). */
  removeYesShare: [3_000, 6_500],
  /** Days from the petition closing to the recall election. */
  electionLeadDays: 75,
} as const;

const PLACEHOLDER_NOTE = `${RECALL_PROFILE.id}: a placeholder pending research (recall-of-officials-52), not any jurisdiction's record.`;

export type RecallRule =
  | {
      readonly available: true;
      readonly stateUsps: string;
      readonly doctrine: MunicipalRecallDoctrine;
      readonly doctrineBasis: MunicipalBallotRuleBasis;
      readonly threshold: PetitionThreshold | null;
      readonly circulationDays: number;
      readonly circulationBasis: MunicipalBallotRuleBasis;
      readonly groundsRequired: boolean | null;
    }
  | { readonly available: false; readonly reason: string };

/**
 * The recall rule for a seat on one town's governing body, read through the
 * authorized municipal rule resolver: the state's own reading where its pack
 * settles it, otherwise drawn from the national range, stable per state.
 */
export function municipalRecallRule(governmentKey: string): RecallRule {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government)
    return { available: false, reason: "This town's government is not known." };
  const state = stateName(government.state);
  const rule = resolveMunicipalRecallRule(government.state);
  if (rule.doctrine === "prohibited")
    return {
      available: false,
      reason: `Towns in ${state} cannot recall their officials.`,
    };
  if (rule.doctrine === "judicial-cause-removal-trial")
    return {
      available: false,
      reason: `In ${state} a town official is removed by a court for cause, not by a recall vote.`,
    };
  return {
    available: true,
    stateUsps: rule.stateUsps,
    doctrine: rule.doctrine,
    doctrineBasis: rule.doctrineBasis,
    threshold: rule.threshold,
    circulationDays: rule.circulationDays!,
    circulationBasis: rule.circulationBasis!,
    groundsRequired: rule.groundsRequired,
  };
}

export type RecallPhase =
  | "circulating"
  | "failed-to-qualify"
  | "awaiting-election"
  | "removed"
  | "retained"
  | "lapsed";

export interface RecallPetition {
  readonly stableKey: string;
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
  readonly petitionerPersonId: EntityId;
  readonly targetPersonId: EntityId;
  readonly startedAt: IsoDate;
  readonly closesAt: IsoDate;
  readonly phase: RecallPhase;
  readonly electionAt: IsoDate | null;
  readonly yes: number | null;
  readonly no: number | null;
}

function tagValue(tags: readonly string[], prefix: string): string | null {
  return (
    tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ?? null
  );
}

/** Every recall petition in this World, read from its public records. */
export function recallPetitions(world: World): readonly RecallPetition[] {
  const petitions = new Map<string, RecallPetition>();
  for (const event of world.history.events) {
    if (!event.tags.includes(RECALL_VERSION)) continue;
    const key = tagValue(event.tags, "petition:");
    if (!key) continue;
    if (event.type === RECALL_PETITION_STARTED) {
      petitions.set(key, {
        stableKey: key,
        governmentKey: tagValue(event.tags, "government:")!,
        jurisdictionId: event.jurisdictionId!,
        petitionerPersonId: tagValue(event.tags, "petitioner:")! as EntityId,
        targetPersonId: tagValue(event.tags, "target:")! as EntityId,
        startedAt: event.occurredAt,
        closesAt: tagValue(event.tags, "closes:") as IsoDate,
        phase: "circulating",
        electionAt: null,
        yes: null,
        no: null,
      });
      continue;
    }
    const petition = petitions.get(key);
    if (!petition) continue;
    const outcome = tagValue(event.tags, "outcome:");
    if (event.type === RECALL_PETITION_CLOSED)
      petitions.set(key, {
        ...petition,
        phase:
          outcome === "qualified"
            ? "awaiting-election"
            : outcome === "lapsed"
              ? "lapsed"
              : "failed-to-qualify",
        electionAt: (tagValue(event.tags, "election:") as IsoDate) ?? null,
      });
    if (event.type === RECALL_ELECTION_HELD)
      petitions.set(key, {
        ...petition,
        phase:
          outcome === "removed"
            ? "removed"
            : outcome === "lapsed"
              ? "lapsed"
              : "retained",
        yes: Number(tagValue(event.tags, "yes:") ?? NaN) || null,
        no: Number(tagValue(event.tags, "no:") ?? NaN) || null,
      });
  }
  return [...petitions.values()];
}

function openPetitionAgainst(
  world: World,
  targetPersonId: EntityId,
): RecallPetition | null {
  return (
    recallPetitions(world).find(
      (petition) =>
        petition.targetPersonId === targetPersonId &&
        (petition.phase === "circulating" ||
          petition.phase === "awaiting-election"),
    ) ?? null
  );
}

function seatOf(world: World, governmentKey: string, personId: EntityId) {
  return (
    municipalSeats(world, governmentKey).find(
      (seat) => seat.personId === personId,
    ) ?? null
  );
}

export type RecallStartCheck =
  | {
      readonly allowed: true;
      readonly rule: Extract<RecallRule, { available: true }>;
    }
  | { readonly allowed: false; readonly reason: string };

/** Whether this person may start a recall petition against this official. */
export function canStartRecallPetition(
  world: World,
  input: {
    readonly petitionerPersonId: EntityId;
    readonly governmentKey: string;
    readonly targetPersonId: EntityId;
  },
): RecallStartCheck {
  const rule = municipalRecallRule(input.governmentKey);
  if (!rule.available) return { allowed: false, reason: rule.reason };
  const petitioner = world.people[input.petitionerPersonId];
  if (!petitioner) return { allowed: false, reason: "No such person." };
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    input.governmentKey,
  );
  if (!jurisdictionId || petitioner.homeJurisdictionId !== jurisdictionId)
    return {
      allowed: false,
      reason:
        "Only someone who lives in the town can petition to recall its officials.",
    };
  if (input.petitionerPersonId === input.targetPersonId)
    return {
      allowed: false,
      reason: "An official cannot petition to recall themselves.",
    };
  if (!seatOf(world, input.governmentKey, input.targetPersonId))
    return {
      allowed: false,
      reason: "That person does not sit on the town's governing body.",
    };
  if (openPetitionAgainst(world, input.targetPersonId))
    return {
      allowed: false,
      reason: "A recall petition against this official is already under way.",
    };
  return { allowed: true, rule };
}

function eventContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}

/** Starts a recall petition. Refuses with the reason when it is not allowed. */
export function startRecallPetition(
  world: World,
  input: {
    readonly petitionerPersonId: EntityId;
    readonly governmentKey: string;
    readonly targetPersonId: EntityId;
  },
): World {
  const check = canStartRecallPetition(world, input);
  if (!check.allowed) throw new Error(check.reason);
  const { rule } = check;
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    input.governmentKey,
  )!;
  const key = recallPetitionKey(
    input.governmentKey,
    input.targetPersonId,
    world.currentDate,
  );
  const closesAt = addDays(world.currentDate, rule.circulationDays);
  const target = world.people[input.targetPersonId]!;
  const threshold = rule.threshold
    ? ` It needs signatures from ${rule.threshold.percent}% of ${thresholdBase(rule.threshold)}.`
    : "";
  let next = recordWorldEvent(world, {
    stableKey: `${key}:started`,
    type: RECALL_PETITION_STARTED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [input.petitionerPersonId, input.targetPersonId].sort(),
    participants: [
      {
        personId: input.petitionerPersonId,
        role: "focus:actor",
        detail: "recall-petitioner",
      },
      {
        personId: input.targetPersonId,
        role: "focus:subject",
        detail: "recall-target",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      RECALL_VERSION,
      `petition:${key}`,
      `government:${input.governmentKey}`,
      `petitioner:${input.petitionerPersonId}`,
      `target:${input.targetPersonId}`,
      `closes:${closesAt}`,
      `circulation:${rule.circulationBasis}`,
    ],
    summary: `A petition to recall ${personName(target)} began circulating. It closes on ${closesAt}.${threshold}${rule.groundsRequired ? " The law requires stated grounds." : ""}`,
    context: eventContext(),
  });
  next = scheduleFutureDueItem(next, {
    stableKey: `${key}:closes`,
    dueAt: closesAt,
    transitionKey: RECALL_PETITION_CLOSES,
    entityIds: [jurisdictionId],
    jurisdictionId,
    provenance: {
      kind: "authored",
      note:
        rule.circulationBasis === "national-range-drawn"
          ? `The circulation window is drawn from the national range; ${rule.stateUsps}'s own is not settled.`
          : `The petition circulates for ${rule.circulationDays} days under ${rule.stateUsps} law.`,
    },
  });
  return next;
}

/** The stable key of a petition started on this date against this official. */
export function recallPetitionKey(
  governmentKey: string,
  targetPersonId: EntityId,
  startedAt: IsoDate,
): string {
  return `${RECALL_VERSION}:${governmentKey}:${targetPersonId}:${startedAt}`;
}

/** PLACEHOLDER draw: whether the petition gathered enough signatures. */
export function recallPetitionQualifies(seed: string, petitionKey: string) {
  return (
    new SeededRng(seed).fork(`${petitionKey}:qualify`).integer(0, 1000) <
    RECALL_PROFILE.qualifyPermille
  );
}

/** PLACEHOLDER draw: the recall vote's yes share, in shares of 10,000. */
export function recallYesShare(seed: string, petitionKey: string): number {
  const [min, max] = RECALL_PROFILE.removeYesShare;
  return new SeededRng(seed).fork(`${petitionKey}:vote`).integer(min, max);
}

function thresholdBase(threshold: PetitionThreshold): string {
  switch (threshold.base) {
    case "registered-voters":
      return "the town's registered voters";
    case "votes-cast-for-office":
      return "the votes cast for the office";
    case "votes-cast-last-election":
      return "the votes cast at the last town election";
    case "last-gubernatorial-vote":
      return "the town's votes for governor at the last state election";
  }
}

function petitionForDue(world: World, due: FutureDueItem) {
  const key = due.stableKey.replace(/:(closes|election)$/, "");
  return recallPetitions(world).find((p) => p.stableKey === key) ?? null;
}

function done(world: World, context: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function closingEvent(
  world: World,
  petition: RecallPetition,
  outcome: "qualified" | "failed" | "lapsed",
  electionAt: IsoDate | null,
  summary: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `${petition.stableKey}:closed`,
    type: RECALL_PETITION_CLOSED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [petition.targetPersonId],
    participants: [
      {
        personId: petition.targetPersonId,
        role: "focus:subject",
        detail: "recall-target",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      RECALL_VERSION,
      `petition:${petition.stableKey}`,
      `outcome:${outcome}`,
      ...(electionAt ? [`election:${electionAt}`] : []),
    ],
    summary,
    context: eventContext(),
  });
}

/** The circulation window has closed: did the petition qualify? */
export function recallPetitionClosesHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const petition = petitionForDue(world, due);
  if (!petition || petition.phase !== "circulating")
    return done(world, "No circulating recall petition matches.");
  const name = personName(world.people[petition.targetPersonId]!);
  if (!seatOf(world, petition.governmentKey, petition.targetPersonId))
    return done(
      closingEvent(
        world,
        petition,
        "lapsed",
        null,
        `The petition to recall ${name} lapsed: they no longer hold the seat.`,
      ),
      "The official left office before the petition closed.",
    );
  const qualified = recallPetitionQualifies(world.seed, petition.stableKey);
  if (!qualified)
    return done(
      closingEvent(
        world,
        petition,
        "failed",
        null,
        `The petition to recall ${name} did not gather enough valid signatures.`,
      ),
      "The petition failed to qualify.",
    );
  const electionAt = addDays(
    world.currentDate,
    RECALL_PROFILE.electionLeadDays,
  );
  let next = closingEvent(
    world,
    petition,
    "qualified",
    electionAt,
    `The petition to recall ${name} qualified. The recall election is on ${electionAt}.`,
  );
  next = scheduleFutureDueItem(next, {
    stableKey: `${petition.stableKey}:election`,
    dueAt: electionAt,
    transitionKey: RECALL_ELECTION,
    entityIds: [petition.jurisdictionId],
    jurisdictionId: petition.jurisdictionId,
    provenance: { kind: "authored", note: PLACEHOLDER_NOTE },
  });
  return done(next, "The petition qualified.");
}

/** Election day: keep the official, or remove them. */
export function recallElectionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const petition = petitionForDue(world, due);
  if (!petition || petition.phase !== "awaiting-election")
    return done(world, "No recall election matches.");
  const name = personName(world.people[petition.targetPersonId]!);
  const seat = seatOf(world, petition.governmentKey, petition.targetPersonId);
  const held = (
    next: World,
    outcome: "removed" | "retained" | "lapsed",
    summary: string,
    tally: readonly [number, number] | null,
  ) =>
    recordWorldEvent(next, {
      stableKey: `${petition.stableKey}:election-held`,
      type: RECALL_ELECTION_HELD,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: petition.jurisdictionId,
      involvedEntityIds: [petition.targetPersonId],
      participants: [
        {
          personId: petition.targetPersonId,
          role: "focus:subject",
          detail: "recall-target",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        RECALL_VERSION,
        `petition:${petition.stableKey}`,
        `outcome:${outcome}`,
        ...(tally ? [`yes:${tally[0]}`, `no:${tally[1]}`] : []),
      ],
      summary,
      context: eventContext(),
    });
  if (!seat)
    return done(
      held(
        world,
        "lapsed",
        `The recall of ${name} was not held: they no longer hold the seat.`,
        null,
      ),
      "The official left office before the election.",
    );
  const yes = recallYesShare(world.seed, petition.stableKey);
  const no = 10_000 - yes;
  const percent = (share: number) => `${(share / 100).toFixed(1)}%`;
  if (yes <= no)
    return done(
      held(
        world,
        "retained",
        `Voters chose to keep ${name}: ${percent(no)} against the recall, ${percent(yes)} for it.`,
        [yes, no],
      ),
      "The official was retained.",
    );
  let next = held(
    world,
    "removed",
    `Voters recalled ${name}: ${percent(yes)} for the recall, ${percent(no)} against. The seat is empty until the town's next regular election.`,
    [yes, no],
  );
  const previous = organizationParticipationStateHistory(
    next,
    seat.participationId,
  ).at(-1)!;
  next = recordOrganizationParticipationState(next, {
    stableKey: `${petition.stableKey}:seat-ended`,
    participationId: seat.participationId,
    effectiveAt: next.currentDate,
    status: "ended",
    roleKind: previous.roleKind,
    context: "Removed by recall.",
    provenance: {
      kind: "simulated-event",
      eventId: next.history.events.at(-1)!.id,
    },
    supersedesStateId: previous.id,
  });
  return done(next, "The official was removed by recall.");
}

export const RECALL_HANDLERS = [
  [RECALL_PETITION_CLOSES, recallPetitionClosesHandler],
  [RECALL_ELECTION, recallElectionHandler],
] as const;
