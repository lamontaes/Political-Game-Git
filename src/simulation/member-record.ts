import { eventById } from "./event-index";
import { recordById } from "./history-index";
import { knowsVote } from "./living-world/official-views";
import type { LawEffectStamp } from "./law-effect-stamp";
import type { EntityId, HistoricalCutoff, IsoDate, World } from "./types";

const LIVED_OUTCOME_REFLECTION = "people.lived-outcome-reflection";
const LIVED_OUTCOME_SOURCE = "lived-outcome-source:";
const LAW_REFLECTION = "people.law-reflection";

export interface MemberRecordReference {
  readonly id: EntityId;
  readonly at: IsoDate;
  readonly sequence: number;
}

export interface MemberDispositionRecord {
  readonly vote: MemberRecordReference;
  readonly measure: MemberRecordReference;
  readonly measureId: EntityId;
  readonly forum: NonNullable<
    World["history"]["legislativeVotes"]
  >[number]["forum"];
  readonly purpose: NonNullable<
    World["history"]["legislativeVotes"]
  >[number]["purpose"];
  readonly disposition: NonNullable<
    World["history"]["legislativeVotes"]
  >[number]["dispositions"][number]["disposition"];
  readonly reason: string | null;
  readonly memberKey: string;
}

export interface MemberSponsoredMeasureRecord {
  readonly measure: MemberRecordReference;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly shortTitle: string;
  readonly outcome: {
    readonly result: NonNullable<
      World["history"]["legislativeEnactments"]
    >[number]["outcome"];
    readonly record: MemberRecordReference;
    readonly eventId: EntityId;
  } | null;
}

export type MemberRecordAttribution =
  | {
      readonly kind: "saved-official-reflection";
      readonly officialId: EntityId;
      readonly reflection: MemberRecordReference;
      readonly belief: MemberRecordReference;
    }
  | {
      readonly kind: "recorded-measure-link";
      readonly officialId: EntityId;
      readonly reflection: MemberRecordReference;
      readonly belief: MemberRecordReference;
      readonly measure: MemberRecordReference;
      readonly enactment: MemberRecordReference;
      readonly action: {
        readonly kind: "sponsorship" | "disposition";
        readonly source: MemberRecordReference;
        readonly disposition?: string;
      };
      readonly knowledge: readonly MemberRecordReference[];
    }
  | {
      readonly kind: "missing-link";
      readonly reason:
        | "source-record-not-found"
        | "source-record-after-cutoff"
        | "measure-or-enactment-not-recorded"
        | "no-saved-official-attribution"
        | "no-recorded-member-action"
        | "vote-knowledge-not-recorded";
    };

export interface MemberRecordOutcome {
  readonly kind: string;
  readonly sourceRecord: MemberRecordReference | null;
  readonly reflection: MemberRecordReference;
  readonly attribution: MemberRecordAttribution;
}

export interface MemberLawEffectRecord {
  readonly exposure: MemberRecordReference;
  readonly measureId: EntityId;
  readonly measure: MemberRecordReference | null;
  readonly enactment: MemberRecordReference | null;
  readonly relation: "own" | "family" | "friend" | "news";
  readonly direction: "cost" | "gain" | "none";
  /** Raw saved amount and cadence. The reader does not normalize cadence. */
  readonly recordedAmount: NonNullable<
    World["history"]["lawExposures"]
  >[number]["amount"];
  readonly recordedCadence: NonNullable<
    World["history"]["lawExposures"]
  >[number]["cadence"];
  readonly sourceRecord: MemberRecordReference | null;
  readonly unresolvedSourceRecordIds: readonly EntityId[];
  readonly effectStamps: readonly {
    readonly stamp: LawEffectStamp;
    readonly sourceRecords: readonly MemberRecordReference[];
  }[];
  readonly attribution: MemberRecordAttribution;
}

export interface MemberRecord {
  readonly personId: EntityId;
  readonly since: IsoDate;
  readonly cutoff: HistoricalCutoff;
  readonly dispositions: readonly MemberDispositionRecord[];
  readonly sponsoredMeasures: readonly MemberSponsoredMeasureRecord[];
  readonly livedOutcomes: readonly MemberRecordOutcome[];
  readonly lawEffects: readonly MemberLawEffectRecord[];
}

type DatedSequence = {
  readonly sequence: number;
  readonly effectiveAt?: IsoDate | null;
  readonly recordedAt?: IsoDate;
  readonly occurredAt?: IsoDate;
  readonly takenAt?: IsoDate;
  readonly resolvedAt?: IsoDate;
  readonly learnedAt?: IsoDate;
  readonly formedAt?: IsoDate;
  readonly introducedAt?: IsoDate;
  readonly actedAt?: IsoDate;
  readonly at?: IsoDate;
};

function isAvailable(
  sequence: number,
  at: IsoDate,
  cutoff: HistoricalCutoff,
): boolean {
  return sequence < cutoff.historySequenceExclusive && at <= cutoff.asOfDate;
}

function ref<T extends { readonly id: EntityId } & DatedSequence>(
  record: T,
  at: IsoDate,
  cutoff: HistoricalCutoff,
): MemberRecordReference | null {
  return isAvailable(record.sequence, at, cutoff)
    ? { id: record.id, at, sequence: record.sequence }
    : null;
}

function tagValue(eventTags: readonly string[], prefix: string): string | null {
  const values = eventTags
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length));
  return values.length === 1 && values[0] ? values[0] : null;
}

function officialBeliefsForEvent(
  world: World,
  subjectPersonId: EntityId,
  officialId: EntityId,
  eventId: EntityId,
  eventAt: IsoDate,
  cutoff: HistoricalCutoff,
): readonly {
  readonly beliefId: EntityId;
  readonly at: IsoDate;
  readonly sequence: number;
}[] {
  return world.history.privateBeliefs
    .filter(
      (belief) =>
        belief.personId === subjectPersonId &&
        belief.subject?.kind === "official" &&
        belief.subject.personId === officialId &&
        belief.formation.relevantEventIds.includes(eventId) &&
        belief.formedAt >= eventAt &&
        isAvailable(belief.sequence, belief.formedAt, cutoff),
    )
    .map((belief) => ({
      beliefId: belief.id,
      at: belief.formedAt,
      sequence: belief.sequence,
    }));
}

function livedOutcomeSource(
  world: World,
  kind: string,
  sourceId: EntityId,
  subjectPersonId: EntityId,
  cutoff: HistoricalCutoff,
): { readonly at: IsoDate; readonly ref: MemberRecordReference } | null {
  if (kind === "job-lost") {
    const status = recordById(world.history.workStatuses, sourceId);
    const relationship = status
      ? recordById(world.history.workRelationships, status.workRelationshipId)
      : undefined;
    if (
      !status ||
      status.status !== "ended" ||
      !relationship ||
      relationship.personId !== subjectPersonId ||
      !isAvailable(relationship.sequence, relationship.recordedAt, cutoff)
    )
      return null;
    const statusRef = ref(status, status.effectiveAt, cutoff);
    return statusRef ? { at: status.effectiveAt, ref: statusRef } : null;
  }
  if (kind === "school-move") {
    const entry = recordById(world.history.childhoodRecords ?? [], sourceId);
    if (!entry || entry.kind !== "school-year-move") return null;
    const entryRef = ref(entry, entry.effectiveAt, cutoff);
    const sourceEvent = eventById(world, entry.sourceRecordId);
    if (
      !entryRef ||
      !sourceEvent ||
      !isAvailable(sourceEvent.sequence, sourceEvent.occurredAt, cutoff) ||
      !isAvailable(sourceEvent.sequence, sourceEvent.recordedAt, cutoff) ||
      !sourceEvent.involvedEntityIds.includes(subjectPersonId)
    )
      return null;
    return { at: entry.effectiveAt, ref: entryRef };
  }
  return null;
}

function sourceRecordById(
  world: World,
  id: EntityId,
  cutoff: HistoricalCutoff,
): {
  readonly ref: MemberRecordReference;
  readonly stamps: readonly LawEffectStamp[];
} | null {
  const histories: readonly {
    readonly kind: string;
    readonly records: readonly { readonly id: EntityId }[];
    readonly dateFields: readonly (keyof DatedSequence)[];
  }[] = [
    {
      kind: "event",
      records: world.history.events,
      dateFields: ["occurredAt", "recordedAt"],
    },
    {
      kind: "tax-collection",
      records: world.history.taxCollections ?? [],
      dateFields: ["recordedAt"],
    },
    {
      kind: "tax-assessment",
      records: world.history.taxAssessments ?? [],
      dateFields: ["recordedAt"],
    },
    {
      kind: "tax-base",
      records: world.history.taxBases ?? [],
      dateFields: ["recordedAt"],
    },
    {
      kind: "tax-policy",
      records: world.history.taxPolicies ?? [],
      dateFields: ["recordedAt"],
    },
    {
      kind: "tax-proposal",
      records: world.history.taxProposals ?? [],
      dateFields: ["recordedAt"],
    },
    {
      kind: "resource-flow-terms",
      records: world.history.resourceFlowTerms,
      dateFields: ["effectiveAt"],
    },
    {
      kind: "resource-transfer-outcome",
      records: world.history.resourceTransferOutcomes,
      dateFields: ["occurredAt"],
    },
    {
      kind: "measure",
      records: world.history.legislativeMeasures ?? [],
      dateFields: ["introducedAt"],
    },
    {
      kind: "enactment",
      records: world.history.legislativeEnactments ?? [],
      dateFields: ["resolvedAt"],
    },
    {
      kind: "vote",
      records: world.history.legislativeVotes ?? [],
      dateFields: ["takenAt"],
    },
    {
      kind: "knowledge",
      records: world.history.knowledge,
      dateFields: ["learnedAt"],
    },
  ];
  for (const history of histories) {
    const row = recordById(history.records, id) as
      | ({ readonly id: EntityId } & DatedSequence & {
            readonly lawEffectStamps?: readonly LawEffectStamp[];
          })
      | undefined;
    if (!row) continue;
    for (const dateField of history.dateFields) {
      const at = row[dateField];
      if (typeof at !== "string") continue;
      const sourceRef = ref(row, at as IsoDate, cutoff);
      if (!sourceRef) return null;
      if (
        history.dateFields.some((field) => {
          const linkedAt = row[field];
          return (
            typeof linkedAt === "string" &&
            !isAvailable(row.sequence, linkedAt as IsoDate, cutoff)
          );
        })
      )
        return null;
      return { ref: sourceRef, stamps: row.lawEffectStamps ?? [] };
    }
  }
  return null;
}

function measureAction(
  world: World,
  measureId: EntityId,
  officialId: EntityId,
  observerId: EntityId,
  exposure: NonNullable<World["history"]["lawExposures"]>[number],
  belief: World["history"]["privateBeliefs"][number],
  cutoff: HistoricalCutoff,
  before: IsoDate,
): {
  readonly action: Extract<
    MemberRecordAttribution,
    { kind: "recorded-measure-link" }
  >["action"];
  readonly knowledge: readonly MemberRecordReference[];
} | null {
  const measure = recordById(
    world.history.legislativeMeasures ?? [],
    measureId,
  );
  if (!measure || !isAvailable(measure.sequence, measure.introducedAt, cutoff))
    return null;
  if (measure.sponsorPersonId === officialId) {
    const introduction = world.history.events.find(
      (event) =>
        event.sequence + 1 === measure.sequence &&
        event.involvedEntityIds.includes(measureId) &&
        event.type.startsWith("legislation.") &&
        isAvailable(event.sequence, event.occurredAt, cutoff) &&
        isAvailable(event.sequence, event.recordedAt, cutoff),
    );
    const knowledge = introduction
      ? world.history.knowledge.find(
          (row) =>
            observerId === row.personId &&
            row.eventId === introduction.id &&
            belief.formation.eventKnowledgeIds.includes(row.id) &&
            row.sequence < belief.sequence &&
            row.learnedAt <= before &&
            isAvailable(row.sequence, row.learnedAt, cutoff),
        )
      : undefined;
    const introductionRef = introduction
      ? ref(introduction, introduction.occurredAt, cutoff)
      : null;
    const knowledgeRef = knowledge
      ? ref(knowledge, knowledge.learnedAt, cutoff)
      : null;
    if (introductionRef && knowledgeRef) {
      return {
        action: {
          kind: "sponsorship",
          source: {
            id: measure.id,
            at: measure.introducedAt,
            sequence: measure.sequence,
          },
        },
        knowledge: [introductionRef, knowledgeRef],
      };
    }
  }
  for (const vote of world.history.legislativeVotes ?? []) {
    if (vote.measureId !== measureId || vote.takenAt > before) continue;
    const voteRef = ref(vote, vote.takenAt, cutoff);
    const disposition = vote.dispositions.find(
      (row) =>
        row.personId === officialId &&
        (row.disposition === "yea" || row.disposition === "nay"),
    );
    if (!voteRef || !disposition) continue;
    const voteEvent = world.history.events.find(
      (event) =>
        event.sequence + 1 === vote.sequence &&
        event.involvedEntityIds.includes(measureId) &&
        event.type.startsWith("legislation.") &&
        isAvailable(event.sequence, event.occurredAt, cutoff) &&
        isAvailable(event.sequence, event.recordedAt, cutoff),
    );
    if (
      !voteEvent ||
      !isAvailable(voteEvent.sequence, voteEvent.occurredAt, cutoff)
    )
      continue;
    const knowledge = world.history.knowledge.find(
      (row) =>
        row.personId === observerId &&
        row.eventId === voteEvent.id &&
        belief.formation.eventKnowledgeIds.includes(row.id) &&
        row.sequence < belief.sequence &&
        row.learnedAt <= before &&
        isAvailable(row.sequence, row.learnedAt, cutoff),
    );
    // Older saved reflections do not always carry formation.eventKnowledgeIds.
    // Public chamber and joint-session roll calls still count when the saved
    // world shows the observer could know the member's vote by reflection time.
    const couldKnowPublicRollCall =
      vote.forum.kind !== "committee" &&
      knowsVote(
        {
          ...world,
          currentDate: before,
          history: {
            ...world.history,
            nextSequence: belief.sequence,
            relationshipInteractions:
              world.history.relationshipInteractions.filter(
                (row) => row.sequence < belief.sequence,
              ),
          },
        },
        exposure,
        officialId,
      );
    const knowledgeRef = knowledge
      ? ref(knowledge, knowledge.learnedAt, cutoff)
      : null;
    const eventRef = ref(voteEvent, voteEvent.occurredAt, cutoff);
    if ((!knowledgeRef && !couldKnowPublicRollCall) || !eventRef) continue;
    return {
      action: {
        kind: "disposition",
        source: voteRef,
        disposition: disposition.disposition,
      },
      knowledge: knowledgeRef ? [eventRef, knowledgeRef] : [eventRef],
    };
  }
  return null;
}

function enactmentFor(
  world: World,
  measureId: EntityId,
  cutoff: HistoricalCutoff,
): {
  readonly row: NonNullable<World["history"]["legislativeEnactments"]>[number];
  readonly ref: MemberRecordReference;
} | null {
  for (const row of world.history.legislativeEnactments ?? []) {
    if (row.measureId !== measureId || row.outcome !== "enacted") continue;
    const rowRef = ref(row, row.resolvedAt, cutoff);
    if (rowRef) return { row, ref: rowRef };
  }
  return null;
}

function availableStampSources(
  world: World,
  stamps: readonly LawEffectStamp[],
  cutoff: HistoricalCutoff,
): {
  readonly stamps: readonly {
    readonly stamp: LawEffectStamp;
    readonly sourceRecords: readonly MemberRecordReference[];
  }[];
  readonly unresolvedSourceRecordIds: readonly EntityId[];
} {
  const resolved: {
    stamp: LawEffectStamp;
    sourceRecords: MemberRecordReference[];
  }[] = [];
  const unresolvedSourceRecordIds: EntityId[] = [];
  for (const stamp of stamps) {
    const sourceRecords: MemberRecordReference[] = [];
    for (const id of stamp.sourceRecordIds ?? []) {
      const source = sourceRecordById(world, id, cutoff);
      if (!source) unresolvedSourceRecordIds.push(id);
      else sourceRecords.push(source.ref);
    }
    resolved.push({ stamp, sourceRecords });
  }
  return { stamps: resolved, unresolvedSourceRecordIds };
}

/** Read one member's saved record without writing or reconstructing feelings. */
export function recordOf(
  world: World,
  personId: EntityId,
  since: IsoDate,
  cutoff: HistoricalCutoff,
): MemberRecord {
  if (!world.people[personId]) throw new Error(`Missing person: ${personId}`);
  if (
    since > cutoff.asOfDate ||
    cutoff.asOfDate > world.currentDate ||
    cutoff.historySequenceExclusive > world.history.nextSequence ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0
  )
    throw new Error("Historical cutoff is outside the available world.");

  const dispositions: MemberDispositionRecord[] = [];
  for (const vote of world.history.legislativeVotes ?? []) {
    if (vote.takenAt < since) continue;
    const voteRef = ref(vote, vote.takenAt, cutoff);
    const measure = recordById(
      world.history.legislativeMeasures ?? [],
      vote.measureId,
    );
    const measureRef = measure
      ? ref(measure, measure.introducedAt, cutoff)
      : null;
    if (!voteRef || !measureRef) continue;
    for (const row of vote.dispositions) {
      if (!row.personId || row.personId !== personId) continue;
      dispositions.push({
        vote: voteRef,
        measure: measureRef,
        measureId: vote.measureId,
        forum: vote.forum,
        purpose: vote.purpose,
        disposition: row.disposition,
        reason: row.reason ?? null,
        memberKey: row.memberKey,
      });
    }
  }

  const sponsoredMeasures: MemberSponsoredMeasureRecord[] = [];
  for (const measure of world.history.legislativeMeasures ?? []) {
    if (measure.sponsorPersonId !== personId || measure.introducedAt < since)
      continue;
    const measureRef = ref(measure, measure.introducedAt, cutoff);
    if (!measureRef) continue;
    const outcome = (world.history.legislativeEnactments ?? []).find(
      (row) =>
        row.measureId === measure.id &&
        isAvailable(row.sequence, row.resolvedAt, cutoff),
    );
    sponsoredMeasures.push({
      measure: measureRef,
      measureId: measure.id,
      designation: measure.designation,
      shortTitle: measure.shortTitle,
      outcome: outcome
        ? {
            result: outcome.outcome,
            record: {
              id: outcome.id,
              at: outcome.resolvedAt,
              sequence: outcome.sequence,
            },
            eventId: outcome.outcomeEventId,
          }
        : null,
    });
  }

  const livedOutcomes: MemberRecordOutcome[] = [];
  for (const event of world.history.events) {
    if (
      event.type !== LIVED_OUTCOME_REFLECTION ||
      !isAvailable(event.sequence, event.occurredAt, cutoff) ||
      !isAvailable(event.sequence, event.recordedAt, cutoff)
    )
      continue;
    const kind = tagValue(event.tags, "lived-outcome:");
    const sourceId = tagValue(event.tags, LIVED_OUTCOME_SOURCE);
    const subjectPersonId = event.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    if (!kind || !sourceId || !subjectPersonId) continue;
    const source = livedOutcomeSource(
      world,
      kind,
      sourceId as EntityId,
      subjectPersonId,
      cutoff,
    );
    if (source && (source.at < since || source.at > event.occurredAt)) continue;
    if (!source && event.occurredAt < since) continue;
    const beliefs = officialBeliefsForEvent(
      world,
      subjectPersonId,
      personId,
      event.id,
      event.occurredAt,
      cutoff,
    );
    const eventRef: MemberRecordReference = {
      id: event.id,
      at: event.occurredAt,
      sequence: event.sequence,
    };
    for (const belief of source ? beliefs : []) {
      livedOutcomes.push({
        kind,
        sourceRecord: source?.ref ?? null,
        reflection: eventRef,
        attribution: {
          kind: "saved-official-reflection",
          officialId: personId,
          reflection: eventRef,
          belief: {
            id: belief.beliefId,
            at: belief.at,
            sequence: belief.sequence,
          },
        },
      });
    }
    if (!source) {
      livedOutcomes.push({
        kind,
        sourceRecord: null,
        reflection: eventRef,
        attribution: {
          kind: "missing-link",
          reason: "source-record-not-found",
        },
      });
    } else if (beliefs.length === 0) {
      livedOutcomes.push({
        kind,
        sourceRecord: source.ref,
        reflection: eventRef,
        attribution: {
          kind: "missing-link",
          reason: "no-saved-official-attribution",
        },
      });
    }
  }

  const lawEffects: MemberLawEffectRecord[] = [];
  const memberMeasureIds = new Set([
    ...dispositions.map((row) => row.measureId),
    ...sponsoredMeasures.map((row) => row.measureId),
    ...(world.history.legislativeVotes ?? [])
      .filter(
        (vote) =>
          vote.dispositions.some((row) => row.personId === personId) &&
          isAvailable(vote.sequence, vote.takenAt, cutoff),
      )
      .map((vote) => vote.measureId),
    ...(world.history.legislativeMeasures ?? [])
      .filter(
        (measure) =>
          measure.sponsorPersonId === personId &&
          isAvailable(measure.sequence, measure.introducedAt, cutoff),
      )
      .map((measure) => measure.id),
  ]);
  for (const exposure of world.history.lawExposures ?? []) {
    if (
      !memberMeasureIds.has(exposure.measureId) ||
      exposure.recordedAt < since
    )
      continue;
    const exposureRef = ref(exposure, exposure.recordedAt, cutoff);
    if (!exposureRef) continue;
    const measure = recordById(
      world.history.legislativeMeasures ?? [],
      exposure.measureId,
    );
    const enactment = enactmentFor(world, exposure.measureId, cutoff);
    const source = sourceRecordById(world, exposure.sourceRecordId, cutoff);
    const resolvedStamps = source
      ? availableStampSources(world, source.stamps, cutoff)
      : null;
    const event = measure
      ? world.history.events.find(
          (row) =>
            row.stableKey === `official-view:reflection:${exposure.id}` &&
            row.type === LAW_REFLECTION,
        )
      : undefined;
    const eventRef = event ? ref(event, event.occurredAt, cutoff) : null;
    const beliefs = eventRef
      ? officialBeliefsForEvent(
          world,
          exposure.personId,
          personId,
          event!.id,
          event!.occurredAt,
          cutoff,
        )
      : [];
    const belief = beliefs.at(-1);
    const measureRef = measure
      ? ref(measure, measure.introducedAt, cutoff)
      : null;
    const savedBelief = belief
      ? world.history.privateBeliefs.find((row) => row.id === belief.beliefId)
      : undefined;
    const action =
      eventRef && savedBelief
        ? measureAction(
            world,
            exposure.measureId,
            personId,
            exposure.personId,
            exposure,
            savedBelief,
            cutoff,
            event!.occurredAt,
          )
        : null;
    let attribution: MemberRecordAttribution;
    if (!source) {
      attribution = { kind: "missing-link", reason: "source-record-not-found" };
    } else if (!isAvailable(source.ref.sequence, source.ref.at, cutoff)) {
      attribution = {
        kind: "missing-link",
        reason: "source-record-after-cutoff",
      };
    } else if (!measureRef || !enactment) {
      attribution = {
        kind: "missing-link",
        reason: "measure-or-enactment-not-recorded",
      };
    } else if (!eventRef || !belief) {
      attribution = {
        kind: "missing-link",
        reason: "no-saved-official-attribution",
      };
    } else if (!action) {
      attribution = {
        kind: "missing-link",
        reason: dispositions.some((row) => row.measureId === exposure.measureId)
          ? "vote-knowledge-not-recorded"
          : "no-recorded-member-action",
      };
    } else {
      attribution = {
        kind: "recorded-measure-link",
        officialId: personId,
        reflection: eventRef,
        belief: {
          id: belief.beliefId,
          at: belief.at,
          sequence: belief.sequence,
        },
        measure: measureRef,
        enactment: enactment.ref,
        action: action.action,
        knowledge: action.knowledge,
      };
    }
    lawEffects.push({
      exposure: exposureRef,
      measureId: exposure.measureId,
      measure: measureRef,
      enactment: enactment?.ref ?? null,
      relation: exposure.relation,
      direction: exposure.direction,
      recordedAmount: exposure.amount,
      recordedCadence: exposure.cadence,
      sourceRecord: source?.ref ?? null,
      unresolvedSourceRecordIds:
        resolvedStamps?.unresolvedSourceRecordIds ?? [],
      effectStamps: resolvedStamps?.stamps ?? [],
      attribution,
    });
  }

  const byReference = <T>(
    rows: readonly T[],
    reference: (row: T) => MemberRecordReference,
  ): readonly T[] =>
    [...rows].sort((a, b) => {
      const left = reference(a);
      const right = reference(b);
      return (
        left.at.localeCompare(right.at) ||
        left.sequence - right.sequence ||
        left.id.localeCompare(right.id)
      );
    });

  return {
    personId,
    since,
    cutoff,
    dispositions: byReference(dispositions, (row) => row.vote),
    sponsoredMeasures: byReference(sponsoredMeasures, (row) => row.measure),
    livedOutcomes: [...livedOutcomes].sort(
      (a, b) =>
        a.reflection.at.localeCompare(b.reflection.at) ||
        a.reflection.sequence - b.reflection.sequence ||
        a.reflection.id.localeCompare(b.reflection.id),
    ),
    lawEffects: byReference(lawEffects, (row) => row.exposure),
  };
}
