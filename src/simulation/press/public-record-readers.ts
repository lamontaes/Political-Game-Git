import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import {
  hasPersonDiscoveredEvidence,
  recordEvidenceDiscovery,
} from "../evidence";
import type { EvidenceArtifactRecord, EntityId, World } from "../types";
import {
  MISCONDUCT_FAMILY_ROWS,
  type FinancialOccurrenceRecord,
} from "./records";
import { pressRecordsOfKind } from "./store";

/** The public filings named by b14-p4. Other public artifacts keep their own readers. */
export const MISCONDUCT_PUBLIC_RECORD_KINDS = [
  "record:contract-award",
  "record:disclosure-filing",
  "record:payroll-posting",
] as const;

export interface PublicMisconductRecord {
  readonly occurrence: FinancialOccurrenceRecord;
  readonly artifact: EvidenceArtifactRecord;
}

/**
 * Index only records that the act itself saved and that are public by their
 * own access setting. A private occurrence or a private artifact never enters
 * the public reading path.
 */
export function publicMisconductRecords(
  world: World,
): readonly PublicMisconductRecord[] {
  const artifacts = new Map(
    world.history.evidenceArtifacts.map((artifact) => [artifact.id, artifact]),
  );
  const records: PublicMisconductRecord[] = [];
  for (const occurrence of pressRecordsOfKind(world, "financial-occurrence")) {
    const allowedKinds = new Set<string>(
      MISCONDUCT_FAMILY_ROWS[occurrence.family].actArtifactKinds,
    );
    for (const artifactId of occurrence.recordEvidenceArtifactIds) {
      const artifact = artifacts.get(artifactId);
      if (
        !artifact ||
        artifact.access !== "public" ||
        artifact.createdAt > world.currentDate ||
        artifact.recordedAt > world.currentDate ||
        !allowedKinds.has(artifact.evidenceKind) ||
        !(MISCONDUCT_PUBLIC_RECORD_KINDS as readonly string[]).includes(
          artifact.evidenceKind,
        ) ||
        !artifact.relatedEntityIds.includes(occurrence.occurrenceEventId)
      )
        continue;
      records.push({ occurrence, artifact });
    }
  }
  return records.sort(
    (left, right) =>
      left.artifact.sequence - right.artifact.sequence ||
      left.occurrence.sequence - right.occurrence.sequence,
  );
}

/**
 * A person reading a public filing gets knowledge of that artifact only; the
 * act's private event stays private. Repeated sweeps do not duplicate reads.
 */
export function readPublicMisconductRecords(
  world: World,
  readerPersonId: EntityId,
): { readonly world: World; readonly artifactIds: readonly EntityId[] } {
  if (!world.people[readerPersonId])
    throw new Error("A public record reader must be a person in this world.");
  let next = world;
  const artifactIds: EntityId[] = [];
  for (const { occurrence, artifact } of publicMisconductRecords(world)) {
    if (
      hasPersonDiscoveredEvidence(
        next,
        readerPersonId,
        artifact.id,
        currentHistoricalCutoff(next),
      )
    )
      continue;
    next = recordEvidenceDiscovery(next, {
      stableKey: `press:public-misconduct-record:${readerPersonId}:${artifact.id}`,
      personId: readerPersonId,
      evidenceArtifactId: artifact.id,
      discoveredAt: next.currentDate,
      recordedAt: next.currentDate,
      methodKey: "press:public-record-review",
      provenance: {
        kind: "simulated",
        sourceEntityIds: [artifact.id, occurrence.occurrenceEventId],
      },
    });
    artifactIds.push(artifact.id);
  }
  return { world: next, artifactIds };
}

/**
 * Public access gives a reader grounds to consider acting, but it is not a
 * finding. The reader decides whether to bring the filing to an institution;
 * a later matter must explicitly link the artifact before it can support a
 * proceeding.
 */
export function decidePublicMisconductRecordResponse(
  world: World,
  input: {
    readonly readerPersonId: EntityId;
    readonly occurrenceId: EntityId;
    readonly artifactId: EntityId;
  },
): { readonly world: World; readonly action: "refer" | "set-aside" | null } {
  const record = publicMisconductRecords(world).find(
    ({ occurrence, artifact }) =>
      occurrence.id === input.occurrenceId && artifact.id === input.artifactId,
  );
  if (!record || !world.people[input.readerPersonId])
    return { world, action: null };
  const key = `press:public-misconduct-review:${input.readerPersonId}:${input.artifactId}`;
  const prior = world.history.decisionTraces.find(
    (trace) => trace.stableKey === `${key}:trace`,
  );
  if (prior) {
    const selected = prior.selectedOptionKey;
    return {
      world,
      action:
        selected === "refer" || selected === "set-aside" ? selected : null,
    };
  }
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: "press.public-misconduct-record-review",
    actorPersonId: input.readerPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:public-record",
      key: record.artifact.stableKey,
      entityId: record.artifact.id,
    },
    options: [
      {
        key: "refer",
        label: "Bring the record to an institution",
        description: "Ask an institution to examine the recorded act.",
      },
      {
        key: "set-aside",
        label: "Set the record aside",
        description: "Take no action on this filing.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: "press:public-record-names-act",
        optionKey: "refer",
        sourceType: "context:public-record",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation:
          "The public filing records a transaction connected to an official act.",
        sourceRefs: [],
      },
      {
        stableKey: "press:record-does-not-prove-misconduct",
        optionKey: "set-aside",
        sourceType: "context:public-record",
        direction: "supports",
        importance: "moderate",
        confidence: "high",
        explanation:
          "A public record shows what was filed, but does not by itself establish misconduct.",
        sourceRefs: [],
      },
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  if (!isSelectedDecision(evaluation)) return { world, action: null };
  const next = recordDurableDecisionTrace(world, evaluation);
  return {
    world: next,
    action:
      evaluation.selectedOptionKey === "refer" ||
      evaluation.selectedOptionKey === "set-aside"
        ? evaluation.selectedOptionKey
        : null,
  };
}
