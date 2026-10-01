import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import type { EntityId, World } from "../types";
import type { LawInForce } from "../governing/law-in-force";
import {
  MINIMUM_CUSTODY_QUESTION,
  readMinimumCustodyTerm,
} from "./legal-outcome";

// Controlled saved-record unit fixtures; these do not prove a live law admission.
const questionKey = MINIMUM_CUSTODY_QUESTION;
const measureId = "legislative-measure_numeric-fixture" as EntityId;
const provisionId = "legislative-provision_numeric-fixture" as EntityId;
const enactmentId = "legislative-enactment_numeric-fixture" as EntityId;
const propositionId = "proposition_numeric-fixture" as EntityId;
const date = makeIsoDate("2026-07-01");
const law: LawInForce = {
  answer: "yes",
  origin: "enacted",
  measureId,
  level: "state-statute",
  operativeAt: date,
  operativeBasis: "enacted-date",
};
function fixture(value = 120): World {
  return {
    currentDate: date,
    policyCatalog: {
      propositions: {
        [propositionId]: {
          id: propositionId,
          stableKey: questionKey,
        },
      },
    },
    history: {
      events: [],
      legislativeMeasures: [
        {
          id: measureId,
          sequence: 1,
          propositionIds: [propositionId],
          propositionAnswers: [{ propositionId, answer: "yes" }],
        },
      ],
      legislativeEnactments: [
        {
          id: enactmentId,
          measureId,
          sequence: 4,
          outcome: "enacted",
          resolvedAt: date,
        },
      ],
      legislativeProvisions: [
        {
          id: provisionId,
          measureId,
          sequence: 2,
          recordedAt: date,
          supersedesProvisionId: null,
          applicationScope: { segmentKey: null },
          lawTerms: [{ questionKey, key: "floor", value, unit: "months" }],
        },
      ],
    },
  } as unknown as World;
}

describe("minimum custody consumes final numeric provisions", () => {
  it("preserves the final provision and cause IDs without supplying offense coverage", () => {
    expect(readMinimumCustodyTerm(fixture(), law)).toEqual({
      value: 120,
      unit: "months",
      measureId,
      provisionId,
      sourceRecordIds: [measureId, enactmentId, provisionId],
    });
  });
  it("uses the replacement adopted before enactment, not the filed amount", () => {
    const world = fixture();
    const original = world.history.legislativeProvisions![0]!;
    const revisedId = "legislative-provision_numeric-revised" as EntityId;
    const revised = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [
          original,
          {
            ...original,
            id: revisedId,
            sequence: 3,
            supersedesProvisionId: provisionId,
            lawTerms: [
              { questionKey, key: "floor", value: 84, unit: "months" as const },
            ],
          },
        ],
      },
    };
    expect(readMinimumCustodyTerm(revised, law)).toMatchObject({
      value: 84,
      provisionId: revisedId,
      sourceRecordIds: [measureId, enactmentId, revisedId],
    });
  });
  it("does not use a revision recorded after enactment", () => {
    const world = fixture();
    const original = world.history.legislativeProvisions![0]!;
    const revised = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [
          original,
          {
            ...original,
            sequence: 5,
            id: "legislative-provision_numeric-late" as EntityId,
            supersedesProvisionId: provisionId,
            lawTerms: [
              { questionKey, key: "floor", value: 84, unit: "months" as const },
            ],
          },
        ],
      },
    };
    expect(readMinimumCustodyTerm(revised, law)).toMatchObject({
      value: 120,
      provisionId,
    });
  });
  it("keeps missing final terms unsupported even when old lineage has a floor", () => {
    const world = fixture();
    const missing = {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [],
        legislativeDraftLineages: [
          {
            parameters: [
              { parameterKey: "floor", kind: "integer", value: 120 },
            ],
          },
        ],
      },
    } as unknown as World;
    expect(readMinimumCustodyTerm(missing, law)).toBeNull();
  });
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid sentence-month value %s",
    (value) => {
      expect(readMinimumCustodyTerm(fixture(value), law)).toBeNull();
    },
  );
  it("does not invent a starting-law amount", () => {
    expect(
      readMinimumCustodyTerm(fixture(), {
        ...law,
        origin: "in-force-at-start",
      }),
    ).toBeNull();
  });
});
