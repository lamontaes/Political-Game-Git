import {
  assertNpcAutonomousApplication,
  evaluateDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { favorRecords, recordFavor } from "./favors";
import { recordWorldEvent } from "./world";
import { appointmentCircle } from "./patronage/appointments";
import { projectEligiblePressReporters } from "./press-interview-producers";
import { projectCampaignLifeActivities } from "./campaign-life-activities";
import { personName } from "./people";
import type {
  DecisionConsideration,
  EntityId,
  MindSourceReference,
  PublicPositionRecord,
  World,
} from "./types";
import { currentHistoricalCutoff } from "./queries";

export interface AfterOfficeEndorsementCandidate {
  readonly campaignId: EntityId;
  readonly candidatePersonId: EntityId;
  readonly filingEventId: EntityId;
}

export interface AfterOfficeEndorsementResponse {
  readonly world: World;
  readonly decisionTraceId: EntityId | null;
  readonly responseEventId: EntityId | null;
  readonly endorsed: boolean | null;
  readonly returnedFavorId: EntityId | null;
}

export interface AfterOfficeEndorsementScene {
  readonly requestEventId: EntityId;
  readonly campaignId: EntityId;
  readonly candidatePersonId: EntityId;
  readonly candidateName: string;
  readonly facts: readonly [
    {
      readonly sourceEventId: EntityId;
      readonly occurredAt: World["currentDate"];
      readonly jurisdictionId: EntityId | null;
      readonly visibility: "private";
      readonly summary: string;
    },
  ];
  readonly peoplePresent: readonly {
    readonly personId: EntityId;
    readonly role: string;
  }[];
  readonly lines: readonly [
    {
      readonly speakerPersonId: EntityId;
      readonly speechAct: "request-endorsement";
      readonly sourceEventId: EntityId;
    },
  ];
  readonly replies: readonly AfterOfficeEndorsementReply[];
  readonly reasons: readonly DecisionConsideration[];
}

export type AfterOfficeEndorsementReply =
  | { readonly optionKey: "endorse"; readonly label: "Endorse" }
  | {
      readonly optionKey: `repay:${string}`;
      readonly label: "Endorse in return for earlier help";
    }
  | { readonly optionKey: "decline"; readonly label: "Decline" };

export interface AfterOfficeOpportunitySources {
  readonly eligibleAppointmentAppointerIds: readonly EntityId[];
  readonly eligibleReporters: ReturnType<typeof projectEligiblePressReporters>;
  readonly campaignActivities: ReturnType<typeof projectCampaignLifeActivities>;
}

/** Routes the former official through the existing opportunity producers. */
export function afterOfficeOpportunitySources(
  world: World,
  formerOfficialPersonId: EntityId,
  vacancyAppointerPersonIds: readonly EntityId[] = [],
): AfterOfficeOpportunitySources {
  const longViewEvents = world.history.events
    .filter(
      (event) =>
        event.occurredAt <= world.currentDate &&
        event.visibility === "public" &&
        event.involvedEntityIds.includes(formerOfficialPersonId),
    )
    .map((event) => event.id);
  const reporterByRole = new Map<
    string,
    ReturnType<typeof projectEligiblePressReporters>[number]
  >();
  for (const eventId of longViewEvents) {
    for (const reporter of projectEligiblePressReporters(world, {
      sourcePersonId: formerOfficialPersonId,
      questionBasisEventIds: [eventId],
    })) {
      reporterByRole.set(
        `${reporter.personId}:${reporter.workRoleId}`,
        reporter,
      );
    }
  }
  return {
    eligibleAppointmentAppointerIds: vacancyAppointerPersonIds.filter(
      (appointerPersonId) =>
        appointmentCircle(world, appointerPersonId, []).includes(
          formerOfficialPersonId,
        ),
    ),
    eligibleReporters: [...reporterByRole.values()],
    campaignActivities: projectCampaignLifeActivities(
      world,
      formerOfficialPersonId,
    ),
  };
}

export function recordAfterOfficeEndorsementRequest(
  world: World,
  input: {
    readonly stableKey: string;
    readonly formerOfficialPersonId: EntityId;
    readonly candidatePersonId: EntityId;
    readonly campaignId: EntityId;
  },
): { readonly world: World; readonly requestEventId: EntityId } {
  const eligible = afterOfficeEndorsementCandidates(
    world,
    input.formerOfficialPersonId,
  ).some(
    (row) =>
      row.campaignId === input.campaignId &&
      row.candidatePersonId === input.candidatePersonId,
  );
  if (!eligible) {
    throw new Error(
      "Only an active candidate already known to the former official can ask for an endorsement.",
    );
  }
  const campaign = world.history.campaigns!.find(
    (row) => row.id === input.campaignId,
  )!;
  const next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:request-event`,
    type: "career.endorsement-request",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [input.candidatePersonId, input.formerOfficialPersonId],
    participants: [
      {
        personId: input.candidatePersonId,
        role: "agency:asked",
        detail: "Asked for an endorsement.",
      },
      {
        personId: input.formerOfficialPersonId,
        role: "focus:asked-of",
        detail: "Was asked to endorse a candidate.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["career:after-office", `campaign:${campaign.id}`],
    summary: "The candidate asked the former officeholder for an endorsement.",
    context: {
      location: null,
      socialContext: "A campaign asked for public support.",
      pressure: null,
      choice: "Whether to endorse",
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, requestEventId: next.history.events.at(-1)!.id };
}

/** Active candidates the former official already knows, read from records. */
export function afterOfficeEndorsementCandidates(
  world: World,
  formerOfficialPersonId: EntityId,
): readonly AfterOfficeEndorsementCandidate[] {
  const active = new Map(
    (world.history.campaignStates ?? [])
      .filter((record) => record.effectiveAt <= world.currentDate)
      .sort((a, b) => a.sequence - b.sequence)
      .map((record) => [record.campaignId, record.status]),
  );
  return (world.history.campaigns ?? [])
    .filter(
      (campaign) =>
        active.get(campaign.id) === "active" &&
        candidateKnowsFormerOfficial(
          world,
          campaign.candidatePersonId,
          formerOfficialPersonId,
        ),
    )
    .map((campaign) => ({
      campaignId: campaign.id,
      candidatePersonId: campaign.candidatePersonId,
      filingEventId: campaign.filingEventId,
    }))
    .sort((a, b) => a.candidatePersonId.localeCompare(b.candidatePersonId));
}

/** An NPC answer is one recorded decision; a controlled person gets the same
 * reasons in a scene and the caller records the player's selected option. */
export function decideAfterOfficeEndorsement(
  world: World,
  input: {
    readonly stableKey: string;
    readonly formerOfficialPersonId: EntityId;
    readonly candidatePersonId: EntityId;
    readonly campaignId: EntityId;
    readonly requestEventId: EntityId;
  },
): AfterOfficeEndorsementResponse {
  assertNpcAutonomousApplication(world, input.formerOfficialPersonId);
  const campaign = (world.history.campaigns ?? []).find(
    (row) => row.id === input.campaignId,
  );
  if (
    !campaign ||
    campaign.candidatePersonId !== input.candidatePersonId ||
    !afterOfficeEndorsementCandidates(world, input.formerOfficialPersonId).some(
      (row) => row.campaignId === input.campaignId,
    ) ||
    !validEndorsementRequest(world, input) ||
    endorsementRequestAlreadyAnswered(world, input.requestEventId)
  ) {
    throw new Error(
      "An endorsement ask requires an active campaign by somebody the former official knows.",
    );
  }
  const reciprocalFavor = unreturnedFavorFrom(
    world,
    input.candidatePersonId,
    input.formerOfficialPersonId,
  );
  const considerations = endorsementConsiderations(
    world,
    input.formerOfficialPersonId,
    input.candidatePersonId,
    input.stableKey,
    reciprocalFavor,
  );
  const evaluation = evaluateDecision(world, {
    stableKey: `${input.stableKey}:decision`,
    decisionType: "career.after-office-endorsement",
    actorPersonId: input.formerOfficialPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:life",
      key: `endorsement:${input.campaignId}`,
      entityId: null,
    },
    options: [
      {
        key: "endorse",
        label: "Endorse",
        description: "Publicly back the candidate.",
      },
      ...(reciprocalFavor
        ? [
            {
              key: `repay:${reciprocalFavor.id}`,
              label: "Endorse in return for earlier help",
              description:
                "Publicly back the candidate and return their earlier help.",
            },
          ]
        : []),
      {
        key: "decline",
        label: "Decline",
        description: "Keep the decision to yourself.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  const next = recordDurableDecisionTrace(world, evaluation);
  const decisionTraceId = next.history.decisionTraces.at(-1)!.id;
  if (evaluation.selectedOptionKey === null) {
    return {
      world: next,
      decisionTraceId,
      responseEventId: null,
      endorsed: null,
      returnedFavorId: null,
    };
  }
  const reciprocityFavorId = evaluation.selectedOptionKey.startsWith("repay:")
    ? (evaluation.selectedOptionKey.slice("repay:".length) as EntityId)
    : null;
  const endorsed = evaluation.selectedOptionKey !== "decline";
  const outcome = recordEndorsementOutcome(next, {
    stableKey: input.stableKey,
    formerOfficialPersonId: input.formerOfficialPersonId,
    candidatePersonId: input.candidatePersonId,
    campaignId: input.campaignId,
    requestEventId: input.requestEventId,
    endorsed,
    reciprocityFavorId,
    decisionTraceId,
  });
  return outcome;
}

/** Session 4 scene-row adapter: request facts and the two player replies. */
export function projectAfterOfficeEndorsementScenes(
  world: World,
  formerOfficialPersonId: EntityId,
): readonly AfterOfficeEndorsementScene[] {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== formerOfficialPersonId
  )
    return [];
  const pending = world.history.events
    .filter(
      (event) =>
        event.type === "career.endorsement-request" &&
        event.involvedEntityIds.includes(formerOfficialPersonId),
    )
    .flatMap((event) => {
      const candidatePersonId = event.involvedEntityIds.find(
        (id) => id !== formerOfficialPersonId,
      );
      const campaignId = event.tags
        .find((tag) => tag.startsWith("campaign:"))
        ?.slice("campaign:".length) as EntityId | undefined;
      const campaign = (world.history.campaigns ?? []).find(
        (row) =>
          row.id === campaignId && row.candidatePersonId === candidatePersonId,
      );
      const active =
        (world.history.campaignStates ?? [])
          .filter(
            (row) =>
              row.campaignId === campaignId &&
              row.effectiveAt <= world.currentDate,
          )
          .sort((a, b) => b.sequence - a.sequence)[0]?.status === "active";
      const alreadyAnswered = world.history.events.some(
        (row) =>
          row.type === "career.endorsement-response" &&
          row.tags.includes(`request:${event.id}`),
      );
      if (!candidatePersonId || !campaign || !active || alreadyAnswered)
        return [];
      const request = {
        requestEventId: event.id,
        formerOfficialPersonId,
        candidatePersonId,
        campaignId: campaign.id,
      };
      if (!validEndorsementRequest(world, request)) return [];
      const reciprocalFavor = unreturnedFavorFrom(
        world,
        candidatePersonId,
        formerOfficialPersonId,
      );
      const reasons = endorsementConsiderations(
        world,
        formerOfficialPersonId,
        candidatePersonId,
        `after-office:scene:${event.id}`,
        reciprocalFavor,
      );
      const replies: AfterOfficeEndorsementReply[] = [
        { optionKey: "endorse", label: "Endorse" },
        ...(reciprocalFavor
          ? [
              {
                optionKey: `repay:${reciprocalFavor.id}` as const,
                label: "Endorse in return for earlier help" as const,
              },
            ]
          : []),
        { optionKey: "decline", label: "Decline" },
      ];
      return [
        {
          requestEventId: event.id,
          campaignId: campaign.id,
          candidatePersonId,
          candidateName: personName(world.people[candidatePersonId]!),
          facts: [
            {
              sourceEventId: event.id,
              occurredAt: event.occurredAt,
              jurisdictionId: event.jurisdictionId,
              visibility: "private" as const,
              summary: event.summary,
            },
          ] as const,
          peoplePresent: event.participants.map((participant) => ({
            personId: participant.personId,
            role: participant.role,
          })),
          lines: [
            {
              speakerPersonId: candidatePersonId,
              speechAct: "request-endorsement" as const,
              sourceEventId: event.id,
            },
          ] as const,
          replies,
          reasons,
        },
      ];
    });
  return pending;
}

/** Apply the controlled character's reply from the after-office scene. */
export function answerAfterOfficeEndorsementScene(
  world: World,
  input: {
    readonly stableKey: string;
    readonly formerOfficialPersonId: EntityId;
    readonly candidatePersonId: EntityId;
    readonly campaignId: EntityId;
    readonly requestEventId: EntityId;
    readonly optionKey?: string;
    readonly endorsed?: boolean;
  },
): AfterOfficeEndorsementResponse {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.formerOfficialPersonId
  ) {
    throw new Error(
      "Only the controlled former official can answer this scene.",
    );
  }
  const scene = projectAfterOfficeEndorsementScenes(
    world,
    input.formerOfficialPersonId,
  ).find(
    (candidate) =>
      candidate.requestEventId === input.requestEventId &&
      candidate.candidatePersonId === input.candidatePersonId &&
      candidate.campaignId === input.campaignId,
  );
  const optionKey = input.optionKey ?? (input.endorsed ? "endorse" : "decline");
  if (
    !scene ||
    !scene.replies.some((reply) => reply.optionKey === optionKey) ||
    (input.optionKey === undefined) === (input.endorsed === undefined) ||
    (input.optionKey !== undefined && input.endorsed !== undefined)
  ) {
    throw new Error("That endorsement request is no longer available.");
  }
  const reciprocityFavorId = optionKey.startsWith("repay:")
    ? (optionKey.slice("repay:".length) as EntityId)
    : null;
  const response = recordEndorsementOutcome(world, {
    ...input,
    endorsed: optionKey !== "decline",
    reciprocityFavorId,
  });
  return { ...response, decisionTraceId: null };
}

function recordEndorsementOutcome(
  world: World,
  input: {
    readonly stableKey: string;
    readonly formerOfficialPersonId: EntityId;
    readonly candidatePersonId: EntityId;
    readonly campaignId: EntityId;
    readonly requestEventId: EntityId;
    readonly endorsed: boolean;
    readonly reciprocityFavorId?: EntityId | null;
    readonly decisionTraceId?: EntityId;
  },
): Omit<AfterOfficeEndorsementResponse, "decisionTraceId"> & {
  readonly decisionTraceId: EntityId | null;
} {
  const campaign = (world.history.campaigns ?? []).find(
    (row) => row.id === input.campaignId,
  );
  if (
    !campaign ||
    campaign.candidatePersonId !== input.candidatePersonId ||
    !validEndorsementRequest(world, input) ||
    endorsementRequestAlreadyAnswered(world, input.requestEventId)
  )
    throw new Error("The endorsement request no longer matches this campaign.");
  const reciprocalFavor = input.reciprocityFavorId
    ? unreturnedFavorFrom(
        world,
        input.candidatePersonId,
        input.formerOfficialPersonId,
      )
    : null;
  if (
    input.reciprocityFavorId &&
    (reciprocalFavor?.id !== input.reciprocityFavorId || !input.endorsed)
  ) {
    throw new Error("The selected repayment is not an open favor to return.");
  }
  const endorsed = input.endorsed;
  const chosen = input.reciprocityFavorId
    ? "endorsed in return for earlier help"
    : endorsed
      ? "endorsed"
      : "declined";
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:response-event`,
    type: "career.endorsement-response",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [input.formerOfficialPersonId, input.candidatePersonId],
    participants: [
      {
        personId: input.formerOfficialPersonId,
        role: "agency:decided",
        detail: chosen,
      },
      {
        personId: input.candidatePersonId,
        role: "presence:asked",
        detail: "Asked for an endorsement.",
      },
    ],
    personFactConstraints: [],
    visibility: endorsed ? "public" : "private",
    tags: [
      "career:after-office",
      `request:${input.requestEventId}`,
      ...(input.decisionTraceId ? [`decision:${input.decisionTraceId}`] : []),
    ],
    summary: endorsed
      ? "The former officeholder endorsed the candidate."
      : "The former officeholder declined to endorse the candidate.",
    context: {
      location: null,
      socialContext: "A candidate's campaign asked for public support.",
      pressure: null,
      choice: input.reciprocityFavorId
        ? "Endorse in return for earlier help"
        : endorsed
          ? "Endorse"
          : "Decline",
      motivation: reciprocalFavor
        ? `Returned favor ${reciprocalFavor.id}.`
        : null,
      immediateReaction: null,
    },
  });
  const responseEventId = next.history.events.at(-1)!.id;
  let returnedFavorId: EntityId | null = null;
  if (reciprocalFavor) {
    next = recordFavor(next, {
      stableKey: `${input.stableKey}:reciprocal-favor`,
      giverPersonId: input.formerOfficialPersonId,
      receiverPersonId: input.candidatePersonId,
      kind: "political:endorsement",
      description: "endorsed the candidate in return for earlier help",
      givenAt: next.currentDate,
      eventId: responseEventId,
      subject: { kind: "none" },
      motive: "trade",
      weight: "moderate",
      audience: "public",
      witnessPersonIds: [input.candidatePersonId],
      inReturnForFavorId: reciprocalFavor.id,
      undertakingId: null,
    });
    returnedFavorId = next.history.favors?.at(-1)?.id ?? null;
  }
  return {
    world: next,
    decisionTraceId: input.decisionTraceId ?? null,
    responseEventId,
    endorsed,
    returnedFavorId,
  };
}

function candidateKnowsFormerOfficial(
  world: World,
  candidateId: EntityId,
  formerId: EntityId,
): boolean {
  return (
    world.history.relationshipInteractions.some(
      (record) =>
        record.occurredAt <= world.currentDate &&
        record.personIds.includes(candidateId) &&
        record.personIds.includes(formerId),
    ) ||
    favorRecords(world).some(
      (record) =>
        record.givenAt <= world.currentDate &&
        ((record.giverPersonId === candidateId &&
          record.receiverPersonId === formerId) ||
          (record.giverPersonId === formerId &&
            record.receiverPersonId === candidateId)),
    ) ||
    world.history.knowledge.some((knowledge) => {
      if (
        knowledge.personId !== candidateId ||
        knowledge.learnedAt > world.currentDate ||
        knowledge.accuracy === "inaccurate"
      )
        return false;
      const event = world.history.events.find(
        (row) => row.id === knowledge.eventId,
      );
      return event?.involvedEntityIds.includes(formerId) ?? false;
    })
  );
}

interface EndorsementRequestIdentity {
  readonly formerOfficialPersonId: EntityId;
  readonly candidatePersonId: EntityId;
  readonly campaignId: EntityId;
  readonly requestEventId: EntityId;
}

/** The request event is the authority for who asked whom, and for which campaign. */
function validEndorsementRequest(
  world: World,
  input: EndorsementRequestIdentity,
): boolean {
  const request = world.history.events.find(
    (row) => row.id === input.requestEventId,
  );
  const campaign = (world.history.campaigns ?? []).find(
    (row) => row.id === input.campaignId,
  );
  const filing = campaign
    ? world.history.events.find((row) => row.id === campaign.filingEventId)
    : undefined;
  if (
    !request ||
    !campaign ||
    !filing ||
    campaign.candidatePersonId !== input.candidatePersonId ||
    campaign.jurisdictionId !== request.jurisdictionId ||
    request.type !== "career.endorsement-request" ||
    request.visibility !== "private" ||
    request.occurredAt > world.currentDate ||
    request.recordedAt > world.currentDate ||
    request.occurredAt < filing.occurredAt ||
    request.recordedAt < request.occurredAt ||
    !request.tags.includes(`campaign:${input.campaignId}`) ||
    request.involvedEntityIds.length !== 2 ||
    !request.involvedEntityIds.includes(input.candidatePersonId) ||
    !request.involvedEntityIds.includes(input.formerOfficialPersonId)
  )
    return false;
  const asker = request.participants.filter(
    (row) => row.personId === input.candidatePersonId,
  );
  const askedOf = request.participants.filter(
    (row) => row.personId === input.formerOfficialPersonId,
  );
  return (
    asker.length === 1 &&
    asker[0]!.role === "agency:asked" &&
    askedOf.length === 1 &&
    askedOf[0]!.role === "focus:asked-of"
  );
}

function endorsementRequestAlreadyAnswered(
  world: World,
  requestEventId: EntityId,
): boolean {
  return world.history.events.some(
    (event) =>
      event.type === "career.endorsement-response" &&
      event.tags.includes(`request:${requestEventId}`),
  );
}

function endorsementConsiderations(
  world: World,
  formerId: EntityId,
  candidateId: EntityId,
  key: string,
  reciprocalFavor: ReturnType<typeof unreturnedFavorFrom> = null,
): readonly DecisionConsideration[] {
  const considerations: DecisionConsideration[] = [];
  const formerPositions = latestPositions(world, formerId);
  const candidatePositions = knownPositions(world, formerId, candidateId);
  for (const [propositionId, former] of formerPositions) {
    const knownCandidate = candidatePositions.get(propositionId);
    if (!knownCandidate) continue;
    const { position: candidate, knowledge } = knownCandidate;
    const same = former.stance === candidate.stance;
    const refs = [
      ...positionReference(former),
      ...positionReference(candidate),
      { kind: "event-knowledge" as const, knowledgeId: knowledge.id },
    ];
    considerations.push({
      stableKey: `${key}:agreement:${propositionId}`,
      optionKey: "endorse",
      sourceType: "context:recorded-agreement",
      direction: same ? "supports" : "opposes",
      importance: same ? "moderate" : "slight",
      confidence: "high",
      explanation: same
        ? "The candidate's recorded public position agrees with theirs."
        : "The candidate's recorded public position differs from theirs.",
      sourceRefs: refs,
    });
  }
  for (const interaction of world.history.relationshipInteractions) {
    if (
      interaction.occurredAt > world.currentDate ||
      !interaction.personIds.includes(formerId) ||
      !interaction.personIds.includes(candidateId)
    )
      continue;
    const positive =
      interaction.change === "formed" ||
      interaction.change === "strengthened" ||
      interaction.change === "maintained";
    considerations.push({
      stableKey: `${key}:relationship:${interaction.stableKey}`,
      optionKey: "endorse",
      sourceType: "social:relationship-interaction",
      direction: positive ? "supports" : "opposes",
      importance:
        interaction.significance === "major"
          ? "strong"
          : interaction.significance === "meaningful"
            ? "moderate"
            : "slight",
      confidence: "high",
      explanation: positive
        ? `They remember a ${interaction.significance} positive connection with the candidate.`
        : `They remember a ${interaction.significance} difficulty with the candidate.`,
      sourceRefs: [
        { kind: "relationship-interaction", interactionId: interaction.id },
      ],
    });
  }
  if (reciprocalFavor) {
    const repayOptionKey = `repay:${reciprocalFavor.id}`;
    considerations.push(
      ...considerations.map((consideration) => ({
        ...consideration,
        stableKey: `${consideration.stableKey}:repay`,
        optionKey: repayOptionKey,
      })),
      {
        stableKey: `${key}:reciprocity:${reciprocalFavor.id}`,
        optionKey: repayOptionKey,
        sourceType: "social:favor",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: `They can endorse ${candidateId} in return for earlier help (${reciprocalFavor.id}).`,
        sourceRefs: [
          { kind: "historical-event", eventId: reciprocalFavor.eventId },
        ],
      },
    );
  }
  return considerations;
}

function latestPositions(
  world: World,
  personId: EntityId,
): ReadonlyMap<EntityId, PublicPositionRecord> {
  const positions = new Map<EntityId, PublicPositionRecord>();
  for (const record of world.history.publicPositions
    .filter(
      (row) => row.personId === personId && row.statedAt <= world.currentDate,
    )
    .sort((a, b) => a.sequence - b.sequence)) {
    positions.set(record.propositionId, record);
  }
  return positions;
}

function knownPositions(
  world: World,
  observerId: EntityId,
  personId: EntityId,
): ReadonlyMap<
  EntityId,
  {
    readonly position: PublicPositionRecord;
    readonly knowledge: World["history"]["knowledge"][number];
  }
> {
  const learnedByEvent = new Map(
    world.history.knowledge
      .filter(
        (record) =>
          record.personId === observerId &&
          record.accuracy === "accurate" &&
          record.learnedAt <= world.currentDate,
      )
      .map((record) => [record.eventId, record]),
  );
  const positions = new Map<
    EntityId,
    {
      readonly position: PublicPositionRecord;
      readonly knowledge: World["history"]["knowledge"][number];
    }
  >();
  for (const position of world.history.publicPositions
    .filter(
      (row) =>
        row.personId === personId &&
        row.audience === "public" &&
        row.statedAt <= world.currentDate &&
        row.sourceEventId !== null,
    )
    .sort((a, b) => a.sequence - b.sequence)) {
    const knowledge = learnedByEvent.get(position.sourceEventId!);
    if (knowledge)
      positions.set(position.propositionId, { position, knowledge });
  }
  return positions;
}

function positionReference(
  position: PublicPositionRecord,
): readonly MindSourceReference[] {
  return position.sourceEventId
    ? [{ kind: "historical-event", eventId: position.sourceEventId }]
    : [];
}

function unreturnedFavorFrom(
  world: World,
  giverPersonId: EntityId,
  receiverPersonId: EntityId,
) {
  const returned = new Set(
    favorRecords(world)
      .map((row) => row.inReturnForFavorId)
      .filter((id): id is EntityId => id !== null),
  );
  return (
    favorRecords(world)
      .filter(
        (row) =>
          row.giverPersonId === giverPersonId &&
          row.receiverPersonId === receiverPersonId &&
          row.givenAt <= world.currentDate &&
          !returned.has(row.id),
      )
      .at(-1) ?? null
  );
}
