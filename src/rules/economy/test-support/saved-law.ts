/** Explicit saved-law edge; no ordinary enactment claim. */
import { createStableId } from "../../../simulation/ids";
import { makeIsoDate } from "../../../simulation/dates";
import { NATIONAL_ELECTION_JURISDICTION } from "../../../simulation/national-election-geography";
import type {
  World,
  EntityId,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  LegislativeProvisionRecord,
} from "../../../simulation/types";
export function savedLaw(
  world: World,
  questionKey: string,
  jurisdictionId: EntityId,
  amount: number | null,
  termKey = "floor",
  termUnit = "minor",
): World {
  const q = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === questionKey,
  )!;
  const seq = world.history.nextSequence;
  const key = "rules2:" + questionKey;
  const measure = {
    id: createStableId("legislative-measure", world.id + key),
    stableKey: key,
    sequence: seq,
    jurisdictionId,
    rulePackId:
      jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
        ? "US:congress"
        : "fixture:state",
    designation: "HB 910",
    shortTitle: "Authored saved law",
    summary: "Explicit saved-law reader control; no ordinary enactment claim.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [q.id],
    propositionAnswers: [{ propositionId: q.id, answer: "yes" }],
  } as LegislativeMeasureRecord;
  const provision = {
    id: createStableId("legislative-provision", world.id + key + ":terms"),
    stableKey: key + ":terms",
    sequence: seq + 1,
    measureId: measure.id,
    provisionKey: key + ":floor",
    sectionNumber: 1,
    heading: "Authored numeric target",
    text: "Explicit adopted numeric control.",
    filedAt: makeIsoDate("2026-01-01"),
    recordedAt: makeIsoDate("2026-01-01"),
    supersedesProvisionId: null,
    applicationScope: { jurisdictionId, segmentKey: null },
    ...(amount === null
      ? {}
      : {
          lawTerms: [
            { questionKey, key: termKey, unit: termUnit, value: amount },
          ],
        }),
  } as unknown as LegislativeProvisionRecord;
  const enactment = {
    id: createStableId("legislative-enactment", world.id + key + ":enactment"),
    stableKey: key + ":enactment",
    sequence: seq + 2,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-01-02"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate("2026-01-03"),
    outcomeEventId: createStableId("event", world.id + key + ":event"),
  } as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: seq + 3,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeProvisions: [
        ...(world.history.legislativeProvisions ?? []),
        provision,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}
