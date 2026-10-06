import { addDays } from "./dates";
import { modelCampaignFieldReach } from "./campaign-contact-calibration";
import { askToSign } from "./candidate-petitions";
import { isEligibleVoterIn } from "./issue-record";
import { resolveRequiredSignatures } from "./municipal-election-rules";
import { municipalGovernmentByKey } from "./municipal-government";
import { municipalGovernmentJurisdictionId } from "./municipal-public-work";
import { scheduleFutureDueItem } from "./future-transitions";
import { recordWorldEvent } from "./world";
import { municipalCitizenPetitionRule } from "./citizen-petition-rules";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";

export const CITIZEN_PETITION_VERSION = "citizen-petition/v1";
export const CITIZEN_PETITION_CLOSES = "civic:citizen-petition-closes" as const;
export const CITIZEN_PETITION_STARTED = "civic.citizen-petition-started";
export const CITIZEN_PETITION_CLOSED = "civic.citizen-petition-closed";
export const CITIZEN_PETITION_FIELDWORK = "civic.citizen-petition-fieldwork";

export type CitizenPetitionKind = "local-initiative" | "protest-referendum";
export type CitizenPetitionPhase =
  "circulating" | "qualified" | "failed" | "lapsed";

export interface CitizenPetition {
  readonly stableKey: string;
  readonly kind: CitizenPetitionKind;
  readonly governmentKey: string;
  readonly jurisdictionId: EntityId;
  readonly petitionerPersonId: EntityId;
  readonly propositionId: EntityId;
  readonly requestedStance: "support" | "oppose";
  readonly startedAt: IsoDate;
  readonly closesAt: IsoDate;
  readonly phase: CitizenPetitionPhase;
  readonly thresholdPercent: number;
  readonly thresholdBase: string;
  readonly thresholdBasis: "compiled" | "estimated";
  readonly circulationDays: number;
  readonly circulationBasis: "compiled" | "estimated";
}

function value(tags: readonly string[], prefix: string): string | null {
  return (
    tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ?? null
  );
}

export function citizenPetitions(world: World): readonly CitizenPetition[] {
  const petitions = new Map<string, CitizenPetition>();
  for (const event of world.history.events) {
    if (!event.tags.includes(CITIZEN_PETITION_VERSION)) continue;
    const stableKey = value(event.tags, "petition:");
    if (!stableKey) continue;
    if (event.type === CITIZEN_PETITION_STARTED) {
      const kind = value(event.tags, "kind:");
      const propositionId = value(event.tags, "proposition:");
      const percent = value(event.tags, "threshold-percent:");
      const base = value(event.tags, "threshold-base:");
      const circulation = value(event.tags, "circulation-days:");
      if (!kind || !propositionId || !percent || !base || !circulation)
        continue;
      petitions.set(stableKey, {
        stableKey,
        kind: kind as CitizenPetitionKind,
        governmentKey: value(event.tags, "government:") ?? "",
        jurisdictionId: event.jurisdictionId!,
        petitionerPersonId: value(event.tags, "petitioner:") as EntityId,
        propositionId: propositionId as EntityId,
        requestedStance: value(event.tags, "requested-stance:") as
          "support" | "oppose",
        startedAt: event.occurredAt,
        closesAt: value(event.tags, "closes:") as IsoDate,
        phase: "circulating",
        thresholdPercent: Number(percent),
        thresholdBase: base,
        thresholdBasis: event.tags.includes("threshold-basis:estimated")
          ? "estimated"
          : "compiled",
        circulationDays: Number(circulation),
        circulationBasis: event.tags.includes("circulation-basis:estimated")
          ? "estimated"
          : "compiled",
      });
      continue;
    }
    if (event.type === CITIZEN_PETITION_CLOSED) {
      const prior = petitions.get(stableKey);
      const outcome = value(event.tags, "outcome:");
      if (
        prior &&
        (outcome === "qualified" ||
          outcome === "failed" ||
          outcome === "lapsed")
      )
        petitions.set(stableKey, { ...prior, phase: outcome });
    }
  }
  return [...petitions.values()];
}

export interface StartCitizenPetitionInput {
  readonly kind: CitizenPetitionKind;
  readonly governmentKey: string;
  readonly petitionerPersonId: EntityId;
  readonly propositionId: EntityId;
  readonly requestedStance: "support" | "oppose";
}

/** Begin a local initiative or protest referendum under the compiled state reading. */
export function startCitizenPetition(
  world: World,
  input: StartCitizenPetitionInput,
): World {
  const rule = municipalCitizenPetitionRule(
    world,
    input.governmentKey,
    input.kind,
  );
  if (!rule.available)
    throw new Error(rule.reason ?? "This petition is not available here.");
  if (!rule.threshold)
    throw new Error(
      "The petition threshold is unresolved; the compiled and estimated rule rows provide no usable value.",
    );
  if (!rule.circulationDays)
    throw new Error(
      "The petition circulation window is unresolved for this place.",
    );
  const government = municipalGovernmentByKey(input.governmentKey);
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    input.governmentKey,
  );
  const petitioner = world.people[input.petitionerPersonId];
  if (!government || !jurisdictionId || !petitioner)
    throw new Error("The petitioner or local government is not in this world.");
  if (petitioner.homeJurisdictionId !== jurisdictionId)
    throw new Error(
      "Only someone who lives in this town can start its petition.",
    );
  if (!world.policyCatalog.propositions[input.propositionId])
    throw new Error("The petition proposition is not in this world.");
  const stableKey = `${CITIZEN_PETITION_VERSION}:${input.kind}:${government.key}:${input.propositionId}:${world.currentDate}`;
  if (citizenPetitions(world).some((row) => row.stableKey === stableKey))
    throw new Error("This petition has already been started.");
  const closesAt = addDays(world.currentDate, rule.circulationDays);
  const next = recordWorldEvent(world, {
    stableKey: `${stableKey}:started`,
    type: CITIZEN_PETITION_STARTED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [input.petitionerPersonId],
    participants: [
      {
        personId: input.petitionerPersonId,
        role: "focus:actor",
        detail: "petition-petitioner",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CITIZEN_PETITION_VERSION,
      `petition:${stableKey}`,
      `kind:${input.kind}`,
      `government:${government.key}`,
      `petitioner:${input.petitionerPersonId}`,
      `proposition:${input.propositionId}`,
      `requested-stance:${input.requestedStance}`,
      `closes:${closesAt}`,
      `threshold-percent:${rule.threshold.percent}`,
      `threshold-base:${rule.threshold.base}`,
      `threshold-basis:${rule.thresholdBasis}`,
      `circulation-days:${rule.circulationDays}`,
      `circulation-basis:${rule.circulationBasis}`,
      `distribution:${rule.distribution.kind}:${rule.distribution.basis}`,
      `review:${rule.review.kind}`,
    ],
    summary: `A ${input.kind === "local-initiative" ? "citizen initiative" : "protest referendum"} petition began circulating. It closes on ${closesAt}; it needs ${rule.threshold.percent}% of ${rule.threshold.base}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return scheduleFutureDueItem(next, {
    stableKey: `${stableKey}:closes`,
    dueAt: closesAt,
    transitionKey: CITIZEN_PETITION_CLOSES,
    entityIds: [jurisdictionId],
    jurisdictionId,
    provenance: {
      kind: "authored",
      note: `${rule.circulationBasis === "estimated" ? "Estimated median" : "Compiled"} municipal circulation window (${rule.circulationDays} days).`,
    },
  });
}

function petitionForDue(
  world: World,
  due: FutureDueItem,
): CitizenPetition | null {
  const key = due.stableKey.replace(/:closes$/, "");
  return citizenPetitions(world).find((row) => row.stableKey === key) ?? null;
}

function eligibleResidentIds(
  world: World,
  petition: CitizenPetition,
): EntityId[] {
  return world.personOrder.filter(
    (personId) =>
      world.people[personId]?.homeJurisdictionId === petition.jurisdictionId &&
      isEligibleVoterIn(
        world,
        personId,
        petition.jurisdictionId,
        world.currentDate,
      ),
  );
}

function contactRank(petitionKey: string, personId: EntityId): string {
  const input = `${petitionKey}:${personId}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface CirculateCitizenPetitionResult {
  readonly world: World;
  readonly reachedPersonIds: readonly EntityId[];
  readonly decisions: readonly {
    readonly personId: EntityId;
    readonly decision: "sign" | "decline";
  }[];
  readonly fieldReach: ReturnType<typeof modelCampaignFieldReach>;
}

/** Use the campaign fieldwork calibration to choose actual neighbors to ask. */
export function circulateCitizenPetition(
  world: World,
  input: {
    readonly petitionKey: string;
    readonly circulatorPersonId: EntityId;
    readonly form: "door-canvass" | "phone-shift";
    readonly minutes: number;
  },
): CirculateCitizenPetitionResult {
  const petition = citizenPetitions(world).find(
    (row) => row.stableKey === input.petitionKey,
  );
  if (!petition || petition.phase !== "circulating")
    throw new Error("No circulating citizen petition matches.");
  const fieldReach = modelCampaignFieldReach(input.form, input.minutes);
  if (!fieldReach?.estimatedCompletedConversations)
    throw new Error("This fieldwork form has no voter-contact estimate.");
  const estimate = fieldReach.estimatedCompletedConversations;
  const contactCount = Math.floor((estimate.min + estimate.max) / 2);
  const alreadyAsked = new Set(
    world.history.events
      .filter(
        (event) =>
          event.tags.includes("civic:petition-ask") &&
          event.tags.includes(`petition:${petition.stableKey}`),
      )
      .flatMap((event) =>
        event.participants
          .filter((participant) => participant.role === "agency:signer")
          .map((participant) => participant.personId),
      ),
  );
  const reachedPersonIds = eligibleResidentIds(world, petition)
    .filter(
      (personId) =>
        personId !== input.circulatorPersonId && !alreadyAsked.has(personId),
    )
    .sort((left, right) =>
      contactRank(petition.stableKey, left).localeCompare(
        contactRank(petition.stableKey, right),
      ),
    )
    .slice(0, contactCount);
  let next = world;
  const decisions: { personId: EntityId; decision: "sign" | "decline" }[] = [];
  for (const signerPersonId of reachedPersonIds) {
    const result = askToSign(next, {
      petition: {
        petitionId: petition.stableKey,
        jurisdictionId: petition.jurisdictionId,
        subject: {
          kind: "proposition",
          propositionId: petition.propositionId,
          requestedStance: petition.requestedStance,
        },
      },
      signerPersonId,
      circulatorPersonId: input.circulatorPersonId,
      at: next.currentDate,
    });
    next = result.world;
    decisions.push({ personId: signerPersonId, decision: result.decision });
  }
  next = recordWorldEvent(next, {
    stableKey: `${petition.stableKey}:fieldwork:${next.history.nextSequence}`,
    type: CITIZEN_PETITION_FIELDWORK,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [input.circulatorPersonId],
    participants: [
      {
        personId: input.circulatorPersonId,
        role: "agency:circulator",
        detail: input.form,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CITIZEN_PETITION_VERSION,
      `petition:${petition.stableKey}`,
      `field-form:${input.form}`,
      `minutes:${input.minutes}`,
      `estimated-conversations:${estimate.min}-${estimate.max}`,
      `people-asked:${reachedPersonIds.length}`,
    ],
    summary: `${reachedPersonIds.length} residents were asked to sign during ${input.form} fieldwork.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, reachedPersonIds, decisions, fieldReach };
}

function eligibleSignatureEvents(world: World, petition: CitizenPetition) {
  const seen = new Set<EntityId>();
  return world.history.events.filter((event) => {
    if (
      event.type !== "civic.petition-signed" ||
      !event.tags.includes("civic:petition-ask") ||
      !event.tags.includes(`petition:${petition.stableKey}`) ||
      event.occurredAt < petition.startedAt ||
      event.occurredAt > petition.closesAt
    )
      return false;
    const signerId = event.participants.find(
      (participant) => participant.role === "agency:signer",
    )?.personId;
    if (!signerId || seen.has(signerId)) return false;
    if (
      world.people[signerId]?.homeJurisdictionId !== petition.jurisdictionId ||
      !isEligibleVoterIn(
        world,
        signerId,
        petition.jurisdictionId,
        event.occurredAt,
      )
    )
      return false;
    seen.add(signerId);
    return true;
  });
}

function eligibleVoterCount(world: World, petition: CitizenPetition): number {
  return eligibleResidentIds(world, petition).length;
}

function resolvedBaseCount(
  world: World,
  petition: CitizenPetition,
  registered: number,
) {
  const base = petition.thresholdBase;
  if (base === "registered-voters")
    return { count: registered, basis: "registered-voters" as const };
  const contests = new Map(
    (world.history.electionContests ?? []).map((row) => [row.id, row]),
  );
  const voteResults = (world.history.electionContestResults ?? [])
    .filter((result) => result.resolvedAt <= petition.startedAt)
    .map((result) => ({ result, contest: contests.get(result.contestId) }))
    .filter((row) => row.contest?.jurisdictionId === petition.jurisdictionId)
    .sort((left, right) =>
      right.result.resolvedAt.localeCompare(left.result.resolvedAt),
    );
  const recent = voteResults[0]?.result;
  if (recent)
    return {
      count: recent.tallies.reduce((sum, row) => sum + row.votes, 0),
      basis: "recorded-election-result" as const,
    };
  return { count: registered, basis: "estimated-electorate-proxy" as const };
}

function closeEvent(
  world: World,
  petition: CitizenPetition,
  outcome: "qualified" | "failed" | "lapsed",
  tags: readonly string[],
  summary: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `${petition.stableKey}:closed`,
    type: CITIZEN_PETITION_CLOSED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: petition.jurisdictionId,
    involvedEntityIds: [petition.petitionerPersonId],
    participants: [
      {
        personId: petition.petitionerPersonId,
        role: "focus:actor",
        detail: "petition-petitioner",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CITIZEN_PETITION_VERSION,
      `petition:${petition.stableKey}`,
      `outcome:${outcome}`,
      ...tags,
    ],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
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

export function citizenPetitionClosesHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const petition = petitionForDue(world, due);
  if (!petition || petition.phase !== "circulating")
    return done(world, "No circulating citizen petition matches.");
  const signers = eligibleSignatureEvents(world, petition);
  const registered = eligibleVoterCount(world, petition);
  const base = resolvedBaseCount(world, petition, registered);
  const required = resolveRequiredSignatures(
    {
      percent: petition.thresholdPercent,
      base: petition.thresholdBase as
        | "registered-voters"
        | "votes-cast-for-office"
        | "votes-cast-last-election"
        | "last-gubernatorial-vote",
    },
    base.count,
  );
  const countTags = [
    `signatures:${signers.length}`,
    `registered-voters:${registered}`,
    `signature-base:${base.count}`,
    `signature-base-source:${base.basis}`,
    `required-signatures:${required}`,
    `threshold-percent:${petition.thresholdPercent}`,
    `threshold-base:${petition.thresholdBase}`,
    ...signers.map((event) => `signature-source:${event.id}`),
  ];
  if (signers.length < required || registered === 0)
    return done(
      closeEvent(
        world,
        petition,
        "failed",
        countTags,
        `The petition gathered ${signers.length} valid signatures; ${required} are required.`,
      ),
      "The petition did not meet its signature threshold.",
    );
  return done(
    closeEvent(
      world,
      petition,
      "qualified",
      countTags,
      `The petition qualified with ${signers.length} valid signatures; ${required} are required.`,
    ),
    "The petition qualified on recorded, eligible signatures.",
  );
}

export function citizenPetitionHandlers() {
  return [[CITIZEN_PETITION_CLOSES, citizenPetitionClosesHandler]] as const;
}
