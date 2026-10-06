import { makeIsoDate } from "../dates";
import {
  evidenceArtifactsRelatedToEntity,
  hasPersonDiscoveredEvidence,
  recordEvidenceDiscovery,
} from "../evidence";
import { activeWorkRelationshipsAt } from "../life-queries";
import type {
  EntityId,
  EvidenceArtifactRecord,
  EvidenceSemanticKey,
  World,
} from "../types";
import type {
  InquiryAuthorityScope,
  InquiryBodyKind,
  InquiryCause,
  InquiryRecord,
  InquiryStepRecord,
} from "./records";
import {
  appendPressRecord,
  pressRecordsOfKind,
  requirePressRecord,
} from "./store";
import { STORY_EFFORT_ESTIMATES } from "./story-effort-data";

export const INQUIRY_DISCOVERY_METHOD =
  "inquiry:artifact-review" as const satisfies EvidenceSemanticKey;

const PUBLIC_ONLY_BASIS =
  "Default step-1 scope: public records and voluntary interviews only; no unresearched compulsory authority is assumed.";

/**
 * Baseline rows are deliberately conservative. A researched jurisdiction row
 * may replace one at the call site; absence of research never grants power.
 */
export const INQUIRY_SCOPE_ROWS: Readonly<
  Record<InquiryBodyKind, InquiryAuthorityScope>
> = {
  prosecutor: publicOnly("prosecutor"),
  "state-ethics-board": publicOnly("state-ethics-board"),
  "city-auditor": publicOnly("city-auditor"),
  "legislative-committee": publicOnly("legislative-committee"),
  "inspector-general": publicOnly("inspector-general"),
  reporter: publicOnly("reporter"),
  "campaign-researcher": publicOnly("campaign-researcher"),
};

export interface OpenInquiryInput {
  readonly stableKey: string;
  readonly investigatorPersonId: EntityId;
  readonly subjectEntityId: EntityId;
  readonly cause: InquiryCause;
  readonly causeRecordId: EntityId | null;
  readonly authorityScope: InquiryAuthorityScope;
  readonly openedAt: string;
}

export interface AdvanceInquiryInput {
  readonly stableKey: string;
  readonly inquiryId: EntityId;
  readonly at: string;
  readonly hours: number;
}

export function openInquiry(
  world: World,
  input: OpenInquiryInput,
): { readonly world: World; readonly inquiry: InquiryRecord } {
  if (!world.people[input.investigatorPersonId]) {
    throw new Error(
      `Missing inquiry investigator: ${input.investigatorPersonId}`,
    );
  }
  if (input.cause === "investigator-goal" && input.causeRecordId !== null) {
    throw new Error("An investigator's own goal has no external cause record.");
  }
  if (input.cause !== "investigator-goal" && input.causeRecordId === null) {
    throw new Error("An external inquiry cause requires its record ID.");
  }
  validateScope(input.authorityScope);
  const hoursBudget = investigatorWorkHours(world, input.investigatorPersonId);
  if (!hoursBudget) {
    throw new Error(
      "An inquiry requires recorded work time for its investigator.",
    );
  }
  const openedAt = makeIsoDate(input.openedAt);
  if (openedAt > world.currentDate)
    throw new Error("Inquiry opens in the future.");
  const budgetBasis =
    "Recorded active work-role expected weekly hours; this inquiry cannot spend beyond that person's maximum.";
  const appended = appendPressRecord(world, "inquiry", {
    stableKey: input.stableKey,
    investigatorPersonId: input.investigatorPersonId,
    subjectEntityId: input.subjectEntityId,
    cause: input.cause,
    causeRecordId: input.causeRecordId,
    authorityScope: structuredClone(input.authorityScope),
    hoursBudget,
    budgetBasis,
    openedAt,
  });
  return { world: appended.world, inquiry: appended.record };
}

/**
 * Performs one dated unit of legwork. Artifacts are reached in their recorded
 * order. Existence, scope, and cumulative work time are the entire finding
 * rule: there is no probability or behavioral draw.
 */
export function advanceInquiry(
  world: World,
  input: AdvanceInquiryInput,
): { readonly world: World; readonly step: InquiryStepRecord } {
  const inquiry = requirePressRecord(world, "inquiry", input.inquiryId);
  const at = makeIsoDate(input.at);
  if (at < inquiry.openedAt || at > world.currentDate) {
    throw new Error("Inquiry step has impossible chronology.");
  }
  if (!Number.isFinite(input.hours) || input.hours <= 0) {
    throw new Error("Inquiry step hours must be positive and finite.");
  }
  const alreadyUsed = pressRecordsOfKind(world, "inquiry-step")
    .filter((step) => step.inquiryId === inquiry.id)
    .reduce((sum, step) => sum + step.hoursUsed, 0);
  if (alreadyUsed + input.hours > inquiry.hoursBudget.maximum) {
    throw new Error(
      "Inquiry step exceeds the investigator's work-time budget.",
    );
  }

  const cutoff = {
    asOfDate: at,
    historySequenceExclusive: world.history.nextSequence,
  };
  const artifacts = evidenceArtifactsRelatedToEntity(
    world,
    inquiry.subjectEntityId,
    cutoff,
  ).sort((a, b) => a.sequence - b.sequence);
  let remaining = input.hours;
  let working = world;
  const artifactIdsRead: EntityId[] = [];
  const discoveryIds: EntityId[] = [];
  for (const artifact of artifacts) {
    if (!insideScope(inquiry.authorityScope, artifact)) continue;
    if (
      hasPersonDiscoveredEvidence(
        working,
        inquiry.investigatorPersonId,
        artifact.id,
        {
          asOfDate: at,
          historySequenceExclusive: working.history.nextSequence,
        },
      )
    )
      continue;
    const effort = ARTIFACT_REVIEW_HOURS;
    if (effort > remaining) break;
    remaining -= effort;
    artifactIdsRead.push(artifact.id);
    const before = working.history.evidenceDiscoveries.length;
    working = recordEvidenceDiscovery(working, {
      stableKey: `${input.stableKey}:discovery:${artifact.id}`,
      personId: inquiry.investigatorPersonId,
      evidenceArtifactId: artifact.id,
      discoveredAt: at,
      recordedAt: working.currentDate,
      methodKey: INQUIRY_DISCOVERY_METHOD,
      provenance: { kind: "simulated", sourceEntityIds: [inquiry.id] },
    });
    discoveryIds.push(working.history.evidenceDiscoveries[before]!.id);
  }

  const appended = appendPressRecord(working, "inquiry-step", {
    stableKey: input.stableKey,
    inquiryId: inquiry.id,
    at,
    hoursUsed: input.hours,
    artifactIdsRead,
    discoveryIds,
  });
  return { world: appended.world, step: appended.record };
}

/** A154's admitted two-hour brief is the smallest recorded review unit. */
const ARTIFACT_REVIEW_HOURS = STORY_EFFORT_ESTIMATES.minutes.brief / 60;

function publicOnly(bodyKind: InquiryBodyKind): InquiryAuthorityScope {
  return {
    bodyKind,
    records: "public-only",
    people: "willing-only",
    compelledEvidenceKinds: [],
    basis: PUBLIC_ONLY_BASIS,
    estimated: true,
  };
}

function validateScope(scope: InquiryAuthorityScope): void {
  if (!scope.basis.trim()) throw new Error("Inquiry scope requires a basis.");
  if (
    scope.records === "public-only" &&
    scope.compelledEvidenceKinds.length > 0
  ) {
    throw new Error("Public-only inquiry scope cannot compel records.");
  }
  if (
    new Set(scope.compelledEvidenceKinds).size !==
    scope.compelledEvidenceKinds.length
  ) {
    throw new Error("Inquiry scope repeats a compelled evidence kind.");
  }
}

function investigatorWorkHours(
  world: World,
  personId: EntityId,
): { readonly minimum: number; readonly maximum: number } | null {
  const active = activeWorkRelationshipsAt(world, personId);
  if (active.length === 0) return null;
  return active.reduce(
    (sum, work) => ({
      minimum: sum.minimum + work.role.timeDemand.expectedWeekly.minimumHours,
      maximum: sum.maximum + work.role.timeDemand.expectedWeekly.maximumHours,
    }),
    { minimum: 0, maximum: 0 },
  );
}

function insideScope(
  scope: InquiryAuthorityScope,
  artifact: EvidenceArtifactRecord,
): boolean {
  if (artifact.access === "public") return true;
  return (
    scope.records === "public-plus-compelled" &&
    scope.compelledEvidenceKinds.includes(artifact.evidenceKind)
  );
}
