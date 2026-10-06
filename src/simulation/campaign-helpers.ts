import {
  campaignById,
  campaignState,
  requireCampaign,
} from "./campaign-queries";
import { evaluateCampaignHelpDecision } from "./campaign-help-decision";
import { createWorkRelationship } from "./life";
import { kinshipRelationshipsAt } from "./life-queries";
import { peopleKnownTo, viewOfOfficial } from "./living-world/official-views";
import { readRelationshipStanding } from "./relationship-standing";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { workSchedulesFor } from "./living-world/work-schedules";
import { personName } from "./people";
import { recordWorldEvent } from "./world";
import { recordRelationshipInteraction } from "./records";
import type {
  DecisionConsideration,
  EntityId,
  MoneyAmount,
  World,
} from "./types";

export type CampaignHelperRole = "volunteer" | "manager";

export interface AddCampaignHelperInput {
  readonly campaignId: EntityId;
  readonly personId: EntityId;
  readonly role: CampaignHelperRole;
  /** A manager is paid; a volunteer has no salary. */
  readonly pay: MoneyAmount | null;
}

export interface AskToHelpResult {
  readonly world: World;
  readonly campaignId: EntityId;
  readonly personId: EntityId;
  readonly outcome: "help" | "decline" | "defer";
  readonly accepted: boolean;
  readonly reasonBeliefId: EntityId | null;
  readonly reasons: readonly string[];
  readonly eventId: EntityId;
}

/** Ask a person the candidate knows to volunteer for the active campaign. */
export function askToHelp(
  inputWorld: World,
  input: { readonly campaignId: EntityId; readonly personId: EntityId },
): AskToHelpResult {
  const campaign = requireCampaign(inputWorld, input.campaignId);
  if (campaignState(inputWorld, campaign.id).status !== "active") {
    throw new Error("A finished campaign cannot recruit helpers.");
  }
  if (!inputWorld.people[input.personId]) {
    throw new Error(`Campaign helper is missing: ${input.personId}`);
  }
  if (input.personId === campaign.candidatePersonId) {
    throw new Error("A candidate cannot be recruited as their own helper.");
  }
  if (
    !peopleKnownTo(inputWorld, campaign.candidatePersonId).includes(
      input.personId,
    )
  ) {
    throw new Error("Campaigns can ask only people the candidate knows.");
  }
  if (campaignHasHelper(inputWorld, campaign.id, input.personId)) {
    throw new Error("This person already helps the campaign.");
  }
  const requestKey = `${campaign.stableKey}:ask-help:${input.personId}`;
  const priorAttempts = inputWorld.history.events.filter((event) =>
    event.stableKey.startsWith(`${requestKey}:attempt:`),
  );
  if (
    priorAttempts.some(
      (event) =>
        event.tags.includes("campaign:accepted") ||
        event.tags.includes("campaign:declined"),
    )
  ) {
    throw new Error("This person has already answered the campaign's request.");
  }
  const latestDeferral = [...priorAttempts]
    .reverse()
    .find((event) => event.tags.includes("campaign:deferred"));
  if (latestDeferral?.occurredAt === inputWorld.currentDate) {
    throw new Error("This person needs time before being asked again.");
  }
  const stableKey = `${requestKey}:attempt:${priorAttempts.length + 1}`;

  // Trait facts are lazily established by the canonical PEOPLE writer before
  // they influence a consequential personal choice.
  const world = ensurePeopleTraits(inputWorld, [input.personId]);
  const view = viewOfOfficial(
    world,
    input.personId,
    campaign.candidatePersonId,
  );
  const considerations: DecisionConsideration[] = [];
  if (view.belief) {
    const importance =
      view.belief.salience === "central"
        ? "decisive"
        : view.belief.salience === "high"
          ? "strong"
          : view.belief.salience === "moderate"
            ? "moderate"
            : "slight";
    considerations.push({
      stableKey: `${stableKey}:candidate-view:${view.belief.id}`,
      optionKey: view.belief.position === "support" ? "help" : "decline",
      sourceType: "mind:political-belief",
      direction: "supports",
      importance,
      confidence: "high",
      explanation:
        view.belief.position === "support"
          ? "They have a favorable view of the candidate."
          : "They have reservations about the candidate.",
      sourceRefs: [{ kind: "private-belief", beliefId: view.belief.id }],
    });
  }

  const familyTie = kinshipRelationshipsAt(world, input.personId).find((tie) =>
    tie.personIds.includes(campaign.candidatePersonId),
  );
  if (familyTie) {
    considerations.push({
      stableKey: `${stableKey}:family:${familyTie.id}`,
      optionKey: "help",
      sourceType: "context:family-relationship",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `They are family (${familyTie.kind.replace(/^.*:/, "").replaceAll("-", " ")}).`,
      sourceRefs: [],
    });
  }

  const standing = readRelationshipStanding(
    world,
    input.personId,
    campaign.candidatePersonId,
  );
  const warmth = standing.readings.warmth;
  if (warmth.band !== "none") {
    const interactionId = warmth.basis.at(-1);
    considerations.push({
      stableKey: `${stableKey}:warmth:${interactionId ?? "recorded"}`,
      optionKey: warmth.adverse ? "decline" : "help",
      sourceType: "social:relationship",
      direction: "supports",
      importance:
        warmth.band === "strong"
          ? "strong"
          : warmth.band === "marked"
            ? "moderate"
            : "slight",
      confidence: "high",
      explanation: warmth.adverse
        ? "Their relationship has been strained."
        : "Their relationship has been warm.",
      sourceRefs: interactionId
        ? [{ kind: "relationship-interaction", interactionId }]
        : [],
    });
  }

  const scheduledHours = workSchedulesFor(world, input.personId).reduce(
    (sum, schedule) => sum + schedule.weeklyHours,
    0,
  );
  const freeHours = Math.max(0, 168 - scheduledHours);
  considerations.push({
    stableKey: `${stableKey}:available-hours`,
    optionKey: freeHours >= 96 ? "help" : "decline",
    sourceType: "context:work-schedule",
    direction: "supports",
    importance:
      freeHours >= 120 ? "strong" : freeHours >= 72 ? "moderate" : "slight",
    confidence: "medium",
    explanation:
      freeHours >= 96
        ? "Their work schedule leaves room for campaign work."
        : "Their work schedule leaves little free time for campaign work.",
    sourceRefs: [],
  });
  considerations.push(
    ...traitConsiderations(world, input.personId, `${stableKey}:traits`, [
      {
        trait: "sociability",
        pole: "high",
        optionKey: "help",
        explanation: "They are outgoing and comfortable working with people.",
      },
      {
        trait: "reliability",
        pole: "high",
        optionKey: "help",
        explanation: "They tend to follow through on commitments.",
      },
      {
        trait: "risk",
        pole: "high",
        optionKey: "help",
        explanation: "They are willing to take on a new commitment.",
      },
    ]),
  );
  const evaluation = evaluateCampaignHelpDecision(world, {
    stableKey,
    decisionType: "campaign.helper-request",
    actorPersonId: input.personId,
    subjectKey: `campaign-helper:${campaign.id}`,
    options: [
      {
        key: "help",
        label: "Help",
        description: "Join the campaign as a volunteer.",
      },
      {
        key: "decline",
        label: "Decline",
        description: "Turn down the request.",
      },
    ],
    considerations,
  });
  const outcome =
    evaluation.outcomeKind !== "selected" ||
    evaluation.selectedOptionKey === null
      ? "defer"
      : evaluation.selectedOptionKey === "help"
        ? "help"
        : "decline";
  const accepted = outcome === "help";
  const reasons = considerations
    .filter((row) => outcome === "defer" || row.optionKey === outcome)
    .map((row) => row.explanation);
  let next = world;
  if (accepted) {
    next = addCampaignHelper(next, {
      campaignId: campaign.id,
      personId: input.personId,
      role: "volunteer",
      pay: null,
    });
  }
  next = recordWorldEvent(next, {
    stableKey: `${stableKey}:event`,
    type: "campaign.helper-request-decided",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [
      campaign.id,
      campaign.candidatePersonId,
      input.personId,
    ],
    participants: [
      {
        personId: campaign.candidatePersonId,
        role: "agency:campaign-candidate",
        detail: "Asked someone they know to help.",
      },
      {
        personId: input.personId,
        role: accepted ? "agency:campaign-volunteer" : "focus:asked-of",
        detail: accepted
          ? "Agreed to help the campaign."
          : outcome === "decline"
            ? "Turned down the request."
            : "Needs time to decide about helping.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "campaign:helper-request",
      outcome === "help"
        ? "campaign:accepted"
        : outcome === "decline"
          ? "campaign:declined"
          : "campaign:deferred",
      ...(view.belief ? [`campaign:reason-belief:${view.belief.id}`] : []),
    ],
    summary: `${personName(next.people[input.personId]!)} ${outcome === "help" ? "agreed to help" : outcome === "decline" ? "declined to help" : "needs time to decide whether to help"}${reasons[0] ? ` because ${reasons[0].toLowerCase()}` : ""}.`,
    context: {
      location: null,
      socialContext: "A personal campaign request",
      pressure: null,
      choice: outcome,
      motivation: reasons[0] ?? null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  if (accepted) {
    next = recordRelationshipInteraction(next, {
      stableKey: `${stableKey}:relationship`,
      personIds: [campaign.candidatePersonId, input.personId],
      eventId,
      occurredAt: next.currentDate,
      kind: "support:campaign-help",
      change: "formed",
      significance: "meaningful",
      summary: `${personName(next.people[input.personId]!)} joined the campaign as a volunteer.`,
      tags: [`relationship.actor:${campaign.candidatePersonId}`],
    });
  }
  return {
    world: next,
    campaignId: campaign.id,
    personId: input.personId,
    outcome,
    accepted,
    reasonBeliefId: view.belief?.id ?? null,
    reasons,
    eventId,
  };
}

/** Record campaign staff in the canonical work relationship history. */
export function addCampaignHelper(
  inputWorld: World,
  input: AddCampaignHelperInput,
): World {
  const campaign = requireCampaign(inputWorld, input.campaignId);
  const person = inputWorld.people[input.personId];
  if (!person) throw new Error(`Campaign helper is missing: ${input.personId}`);
  if (input.personId === campaign.candidatePersonId) {
    throw new Error("A candidate cannot also be campaign staff.");
  }
  if (input.role === "manager" && (!input.pay || input.pay.minorUnits <= 0)) {
    throw new Error("A campaign manager requires a funded salary.");
  }
  if (input.role === "volunteer" && input.pay !== null) {
    throw new Error("A campaign volunteer cannot have a salary.");
  }
  if (
    campaign.staffWorkRelationshipIds.some(
      (id) =>
        inputWorld.history.workRelationships.find((row) => row.id === id)
          ?.personId === input.personId,
    )
  ) {
    throw new Error("This person already helps the campaign.");
  }

  const stableKey = `${campaign.stableKey}:work:${input.role}:${input.personId}`;
  if (
    inputWorld.history.workRelationships.some(
      (row) => row.stableKey === stableKey,
    )
  ) {
    throw new Error(
      `Campaign helper relationship already exists: ${stableKey}`,
    );
  }
  const work = createWorkRelationship(inputWorld, {
    stableKey,
    personId: input.personId,
    organizationId: campaign.organizationId,
    startedAt: inputWorld.currentDate,
    kind:
      input.role === "manager"
        ? "employment:campaign-staff"
        : "volunteer:campaign-staff",
    compensation: input.role === "manager" ? "paid" : "unpaid",
    authority: input.role === "manager" ? "directs-others" : "shared",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note:
        input.role === "manager"
          ? "A campaign manager was hired through the campaign's recorded payroll."
          : "Somebody who agreed to help, recorded as the work it is.",
    },
    initialRole: {
      title:
        input.role === "manager" ? "Campaign manager" : "Campaign volunteer",
      occupationClassification:
        input.role === "manager"
          ? "service:campaign-manager"
          : "service:campaign-volunteer",
      locationJurisdictionId: campaign.jurisdictionId,
      timeDemand:
        input.role === "manager"
          ? {
              expectedWeekly: { minimumHours: 20, maximumHours: 50 },
              attention: "high",
              concurrency: "mostly-exclusive",
              scheduleRigidity: "mixed",
              interruptibility: "limited",
              locationJurisdictionId: campaign.jurisdictionId,
            }
          : {
              expectedWeekly: { minimumHours: 2, maximumHours: 12 },
              attention: "moderate",
              concurrency: "partly-concurrent",
              scheduleRigidity: "flexible",
              interruptibility: "interruptible",
              locationJurisdictionId: campaign.jurisdictionId,
            },
    },
  });
  const workId = work.history.workRelationships.at(-1)?.id;
  if (!workId)
    throw new Error("Campaign helper work relationship was not created.");
  const campaignRows = work.history.campaigns ?? [];
  const campaignIndex = campaignRows.findIndex((row) => row.id === campaign.id);
  if (campaignIndex < 0)
    throw new Error("Campaign record disappeared while adding staff.");
  const records = [...campaignRows];
  records[campaignIndex] = {
    ...records[campaignIndex]!,
    staffWorkRelationshipIds: [...campaign.staffWorkRelationshipIds, workId],
  };
  return {
    ...work,
    history: { ...work.history, campaigns: records },
  };
}

/** Used by callers that need to distinguish a new hire from an existing one. */
export function campaignHasHelper(
  world: World,
  campaignId: EntityId,
  personId: EntityId,
): boolean {
  const campaign = campaignById(world, campaignId);
  return (
    campaign?.staffWorkRelationshipIds.some(
      (id) =>
        world.history.workRelationships.find((row) => row.id === id)
          ?.personId === personId,
    ) ?? false
  );
}

/** People the candidate knows who can still be asked for campaign help. */
export function campaignHelperCandidates(
  world: World,
  campaignId: EntityId,
): readonly { readonly personId: EntityId; readonly name: string }[] {
  const campaign = requireCampaign(world, campaignId);
  return peopleKnownTo(world, campaign.candidatePersonId)
    .filter((personId) => personId !== campaign.candidatePersonId)
    .filter((personId) => !campaignHasHelper(world, campaignId, personId))
    .filter((personId) => {
      const requestPrefix = `${campaign.stableKey}:ask-help:${personId}:attempt:`;
      const attempts = world.history.events.filter((event) =>
        event.stableKey.startsWith(requestPrefix),
      );
      if (
        attempts.some(
          (event) =>
            event.tags.includes("campaign:accepted") ||
            event.tags.includes("campaign:declined"),
        )
      )
        return false;
      const latestDeferral = [...attempts]
        .reverse()
        .find((event) => event.tags.includes("campaign:deferred"));
      return latestDeferral?.occurredAt !== world.currentDate;
    })
    .flatMap((personId) => {
      const person = world.people[personId];
      return person ? [{ personId, name: personName(person) }] : [];
    });
}
