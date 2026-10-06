import { addDays } from "./dates";
import { scheduleFutureDueItem } from "./future-transitions";
import { organizationParticipationStateHistory } from "./life-queries";
import { recordOrganizationParticipationState } from "./life";
import { municipalGovernmentByKey } from "./municipal-government";
import {
  municipalLawOfficeKey,
  ruleValueInWorld,
} from "./enacted-rule-changes";
import {
  resolveMunicipalRecallRule,
  type MunicipalBallotRuleBasis,
  type MunicipalRecallBasis,
} from "./municipal-ballot-rules";
import {
  resolveRequiredSignatures,
  type MunicipalRecallDoctrine,
  type PetitionThreshold,
} from "./municipal-election-rules";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "./municipal-public-work";
import { stateName } from "./office-qualification-rules";
import { personName } from "./people";
import { viewOfOfficial } from "./official-view-reads";
import { isEligibleVoterIn } from "./issue-record";
import { nextTownElection } from "./nationwide-world/town-election-calendar";
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
 * it takes the rule the most read states name (no draw), ESTIMATED FROM
 * AVERAGE and labeled `national-estimated`. It is never another state's law.
 *
 * Under the owner-approved game mechanism, recorded recall supporters count
 * as signatures and recorded registered residents supply the base. The legal
 * percentage and its original base label remain recorded separately. Election
 * counts use saved official views; no turnout is extrapolated.
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
 * - A law that changes a state's recall rule mid-petition. The rule is read
 *   when a petition starts (a law enacted in play through
 *   `enacted-rule-changes.ts` included); a petition already circulating runs
 *   its course under the rule it started under.
 * - Anyone other than a resident starting a petition, and the world starting
 *   one on its own (no recorded cause exists yet).
 */

export const RECALL_VERSION = "recall/v1";
export const RECALL_PETITION_CLOSES = "civic:recall-petition-closes" as const;
export const RECALL_ELECTION = "civic:recall-election" as const;

export const RECALL_PETITION_STARTED = "civic.recall-petition-started";
export const RECALL_PETITION_CLOSED = "civic.recall-petition-closed";
export const RECALL_ELECTION_HELD = "civic.recall-election-held";

export type RecallRule =
  | {
      readonly available: true;
      readonly stateUsps: string;
      readonly doctrine: MunicipalRecallDoctrine;
      readonly doctrineBasis: MunicipalRecallBasis;
      readonly threshold: PetitionThreshold | null;
      readonly circulationDays: number;
      readonly circulationBasis: MunicipalBallotRuleBasis;
      readonly groundsRequired: boolean | null;
    }
  | { readonly available: false; readonly reason: string };

/**
 * The recall rule for a seat on one town's governing body, read through the
 * authorized municipal rule resolver: a law this World enacted on it where one
 * is in force, else the state's own reading where its pack settles it, else
 * the national modal rule, ESTIMATED FROM AVERAGE (no draw).
 *
 * Without a World only the compiled rule is read.
 */
export function municipalRecallRule(
  governmentKey: string,
  world?: World,
): RecallRule {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government)
    return {
      available: false,
      reason:
        "This town's government is not in the municipal government catalog.",
    };
  const state = stateName(government.state);
  const enacted = world
    ? ruleValueInWorld(
        world,
        {
          jurisdiction: government.state,
          officeKey: municipalLawOfficeKey(government.state),
          field: "municipal.recall.doctrine",
          onDate: world.currentDate,
        },
        null,
      )
    : null;
  const enactedDoctrine =
    enacted?.source === "enacted"
      ? (enacted.value as MunicipalRecallDoctrine)
      : null;
  const rule = resolveMunicipalRecallRule(government.state, enactedDoctrine);
  const since =
    enacted?.source === "enacted" ? ` since ${enacted.designation}` : "";
  if (rule.doctrine === "prohibited")
    return {
      available: false,
      reason: `Towns in ${state} cannot recall their officials${since}.`,
    };
  if (rule.doctrine === "judicial-cause-removal-trial")
    return {
      available: false,
      reason: `In ${state} a town official is removed by a court for cause, not by a recall vote${since}.`,
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
  readonly threshold?: PetitionThreshold | null;
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
        threshold:
          tagValue(event.tags, "threshold-percent:") === null
            ? undefined
            : {
                percent: Number(tagValue(event.tags, "threshold-percent:")),
                base: tagValue(
                  event.tags,
                  "threshold-base:",
                ) as PetitionThreshold["base"],
              },
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
        yes:
          tagValue(event.tags, "yes:") === null
            ? null
            : Number(tagValue(event.tags, "yes:")),
        no:
          tagValue(event.tags, "no:") === null
            ? null
            : Number(tagValue(event.tags, "no:")),
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
  const rule = municipalRecallRule(input.governmentKey, world);
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
      ...(rule.threshold
        ? [
            `threshold-percent:${rule.threshold.percent}`,
            `threshold-base:${rule.threshold.base}`,
          ]
        : []),
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
        rule.circulationBasis === "national-estimated"
          ? `The circulation window is the national modal window, ESTIMATED FROM AVERAGE; ${rule.stateUsps}'s own is not settled.`
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

/** Count only living adult residents with a dated saved view of this official. */
export function recallResidentViews(
  world: World,
  petition: Pick<RecallPetition, "jurisdictionId" | "targetPersonId">,
): {
  readonly yes: number;
  readonly no: number;
  readonly registeredVoters: number;
  readonly sourceRecordIds: readonly EntityId[];
} {
  let yes = 0;
  let no = 0;
  let registeredVoters = 0;
  const sourceRecordIds = new Set<EntityId>();
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  for (const personId of new Set(world.personOrder)) {
    const person = world.people[personId];
    if (
      !person ||
      person.homeJurisdictionId !== petition.jurisdictionId ||
      !isEligibleVoterIn(
        world,
        personId,
        petition.jurisdictionId,
        world.currentDate,
      )
    )
      continue;
    registeredVoters += 1;
    const view = viewOfOfficial(
      world,
      personId,
      petition.targetPersonId,
      cutoff,
    );
    if (view.points === 0) continue;
    if (view.points < 0) yes += 1;
    else no += 1;
    if (view.belief) sourceRecordIds.add(view.belief.id);
    else for (const row of view.rows) sourceRecordIds.add(row.id);
  }
  return { yes, no, registeredVoters, sourceRecordIds: [...sourceRecordIds] };
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
  countTags: readonly string[] = [],
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
      ...countTags,
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
  const startRule = municipalRecallRule(petition.governmentKey, {
    ...world,
    currentDate: petition.startedAt,
  });
  const threshold =
    petition.threshold ?? (startRule.available ? startRule.threshold : null);
  if (!threshold)
    return {
      world,
      status: "blocked",
      reasonKey: "recall:missing-legal-threshold",
      context:
        "The jurisdiction's recall rule does not supply a signature threshold.",
      outcomeEventId: null,
    };
  const counted = recallResidentViews(world, petition);
  const required = resolveRequiredSignatures(
    threshold,
    counted.registeredVoters,
  );
  const countTags = [
    `signatures:${counted.yes}`,
    `registered-voters:${counted.registeredVoters}`,
    `required-signatures:${required}`,
    `threshold-percent:${threshold.percent}`,
    `threshold-base:${threshold.base}`,
    "signature-mechanism:recorded-recall-supporters",
    "count-base:registered-voters",
    ...counted.sourceRecordIds.map((id) => `view-source:${id}`),
  ];
  if (counted.registeredVoters === 0 || counted.yes < required)
    return done(
      closingEvent(
        world,
        petition,
        "failed",
        null,
        `The petition to recall ${name} failed to qualify: ${counted.yes} recorded supporters, ${required} required from ${counted.registeredVoters} registered residents.`,
        countTags,
      ),
      "Recorded recall supporters fell short of the jurisdiction's threshold.",
    );
  const government = municipalGovernmentByKey(petition.governmentKey);
  const election =
    government?.placeGeoid && startRule.available
      ? nextTownElection(
          startRule.stateUsps,
          government.placeGeoid,
          world.currentDate,
        )
      : null;
  if (!election)
    return {
      world,
      status: "blocked",
      reasonKey: "recall:missing-election-calendar",
      context:
        "Recorded supporters meet the threshold, but the town's election date is not sourced.",
      outcomeEventId: null,
    };
  const electionAt = election.electionDate;
  const closed = closingEvent(
    world,
    petition,
    "qualified",
    electionAt,
    `The petition to recall ${name} qualified: ${counted.yes} recorded supporters, ${required} required from ${counted.registeredVoters} registered residents. The vote is scheduled for the town's sourced election date, ${electionAt}.`,
    countTags,
  );
  return done(
    scheduleFutureDueItem(closed, {
      stableKey: `${petition.stableKey}:election`,
      dueAt: electionAt,
      transitionKey: RECALL_ELECTION,
      entityIds: [petition.jurisdictionId],
      jurisdictionId: petition.jurisdictionId,
      provenance: {
        kind: "authored",
        note: `Recall scheduled through the town election calendar (${election.basis}).`,
      },
    }),
    "The recall petition qualified on recorded supporters and registered residents.",
  );
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
  const counted = recallResidentViews(world, petition);
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
        ...(tally
          ? counted.sourceRecordIds.map((id) => `view-source:${id}`)
          : []),
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
  const { yes, no } = counted;
  if (yes + no === 0)
    return {
      world,
      status: "blocked",
      reasonKey: "recall:no-recorded-resident-views",
      context:
        "No living adult resident has a recorded support or opposition view of this official. No recall count or turnout is inferred.",
      outcomeEventId: null,
    };
  const percent = (count: number) =>
    `${((count / (yes + no)) * 100).toFixed(1)}%`;
  if (yes <= no)
    return done(
      held(
        world,
        "retained",
        `Recorded resident views favored keeping ${name}: ${no} against recall (${percent(no)}), ${yes} for it (${percent(yes)}).`,
        [yes, no],
      ),
      "The official was retained.",
    );
  let next = held(
    world,
    "removed",
    `Recorded resident views favored recalling ${name}: ${yes} for recall (${percent(yes)}), ${no} against (${percent(no)}). The seat is empty until the town's next regular election.`,
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

export function recallHandlers() {
  return [
    [RECALL_PETITION_CLOSES, recallPetitionClosesHandler],
    [RECALL_ELECTION, recallElectionHandler],
  ] as const;
}
