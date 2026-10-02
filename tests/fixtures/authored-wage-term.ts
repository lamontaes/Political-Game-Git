import { createStableId } from "../../src/simulation/ids";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import {
  recordWorldEvent,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  LegislativeProvisionRecord,
  World,
} from "../../src/simulation/types";

/** Authored legal-reader control. This does not prove passage through a desk. */
export function authoredWageTerm(
  base: World,
  input: {
    readonly key: string;
    readonly jurisdictionId: EntityId;
    readonly questionKey: string;
    readonly answer: "yes" | "no";
    readonly effectiveAt: IsoDate;
    readonly designation: string;
    readonly termKey: "floor" | "target";
    readonly amountMinor: number | null;
  },
): World {
  const question = Object.values(base.policyCatalog.propositions).find(
    (row) => row.stableKey === input.questionKey,
  );
  if (!question) throw new Error("The wage control needs its actual question");
  const measureId = createStableId("legislative-measure", input.key);
  const actual =
    input.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id &&
    !base.jurisdictions[input.jurisdictionId]
      ? {
          ...base,
          jurisdictions: {
            ...base.jurisdictions,
            [input.jurisdictionId]: NATIONAL_ELECTION_JURISDICTION,
          },
          jurisdictionOrder: [...base.jurisdictionOrder, input.jurisdictionId],
        }
      : base;
  // This authored reader control is not an integrity or desk-passage fixture.
  let world = withWorldIntegrityDeferred(() =>
    recordWorldEvent(actual, {
      stableKey: `${input.key}:event`,
      type: "legislation.measure-enacted",
      occurredAt: base.currentDate,
      recordedAt: base.currentDate,
      jurisdictionId: input.jurisdictionId,
      involvedEntityIds: [base.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["legislation", "legislation.enacted"],
      summary: `${input.designation}: authored adopted-text reader control.`,
      context: {
        location: {
          jurisdictionId: input.jurisdictionId,
          label: input.designation,
          setting: null,
        },
        socialContext: "Authored control, not an ordinary passage proof.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    }),
  );
  const eventId = world.history.events.at(-1)!.id;
  const sequence = world.history.nextSequence;
  const measure: LegislativeMeasureRecord = {
    id: measureId,
    stableKey: input.key,
    sequence,
    jurisdictionId: input.jurisdictionId,
    rulePackId: "authored-wage-reader-control",
    designation: input.designation,
    shortTitle: "Adopted wage term control",
    summary: "Authored wage reader control, not a natural passage result.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer: input.answer }],
  };
  const provision: LegislativeProvisionRecord = {
    id: createStableId("legislative-provision", `${input.key}:floor`),
    stableKey: `${input.key}:floor`,
    sequence: sequence + 1,
    measureId,
    provisionKey: "hourly-floor",
    sectionNumber: 1,
    heading: "Hourly floor",
    text: "The hourly floor is the explicit term of this authored control.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Covered workers",
    },
    applicationScope: {
      jurisdictionId: input.jurisdictionId,
      segmentKey: null,
    },
    fiscalExposureLabel: null,
    fiscalExposureMinorUnits: null,
    recordedAt: world.currentDate,
    supersedesProvisionId: null,
    originAmendmentId: null,
    eventId,
    answers: { propositionId: question.id, answer: input.answer },
    lawTerms:
      input.amountMinor === null
        ? []
        : [
            {
              questionKey: input.questionKey,
              key: input.termKey,
              value: input.amountMinor,
              unit: "minor/hour",
            },
          ],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: createStableId("legislative-enactment", `${input.key}:enacted`),
    stableKey: `${input.key}:enacted`,
    sequence: sequence + 2,
    measureId,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: input.designation,
    effectiveAt: input.effectiveAt,
    outcomeEventId: eventId,
  };
  world = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence + 3,
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
  return world;
}
