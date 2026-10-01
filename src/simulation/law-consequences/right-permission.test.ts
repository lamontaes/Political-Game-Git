import { describe, expect, it } from "vitest";
import { makeIsoDate, addDays } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  advanceWorld,
} from "../world";
import {
  scheduleFutureDueItem,
  createFutureTransitionHandlerRegistry,
} from "../future-transitions";
import type { LawConsequenceRow } from "../law-consequence-types";
import { applyLawConsequences } from "../enacted-law-effects";
import { latestLawPermission } from "./permission-records";
import {
  applyRightPermission,
  resolveRightPermission,
  RIGHT_PERMISSION_REGISTRATION,
} from "./right-permission";
function fixture() {
  const seed = "permission-record-family";
  const date = makeIsoDate("2026-01-14");
  const state = stateJurisdictionForKey("US-NY")!;
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate: date,
    homeJurisdictionId: state.id,
  });
  let world = createWorld({
    seed,
    currentDate: date,
    jurisdictions: [state],
    people: [person],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createHousehold(world, {
    stableKey: "permission-fixture:source",
    formedAt: date,
    label: "Recorded source",
    provenance: {
      kind: "authored",
      note: "Append-family fixture; no policy interpretation is inferred.",
    },
  });
  const source = world.history.households.at(-1)!;
  const question = Object.values(world.policyCatalog!.propositions).find(
    (p) =>
      p.stableKey ===
      "us-policy-positions:health-human-services.expand-medicaid-eligibility",
  )!;
  const law = lawInForce(world, state.id, question.id, date)!;
  expect(law).not.toBeNull();
  const context = {
    effectKind: "right-permission",
    questionKey: question.stableKey,
    jurisdictionId: state.id,
    appliedAt: date,
  };
  const input = {
    subject: { kind: "person", id: person.id } as const,
    permissionKey: "fixture:resolved-permission",
    status: "permitted" as const,
    effectiveAt: date,
    sourceRecordIds: [source.id],
  };
  world = recordHouseholdLocation(world, {
    stableKey: "permission-fixture:home",
    householdId: source.id,
    effectiveAt: date,
    jurisdictionId: state.id,
    label: "Recorded home",
    kind: "residence:fixture",
    provenance: {
      kind: "authored",
      note: "Controlled legal permission mechanism fixture.",
    },
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: "permission-fixture:member",
    personId: person.id,
    householdId: source.id,
    startedAt: date,
    residenceRole: "primary",
    kind: "resident:fixture",
    provenance: {
      kind: "authored",
      note: "Controlled legal permission mechanism fixture.",
    },
  });
  world = scheduleFutureDueItem(world, {
    stableKey: "permission-fixture:review",
    dueAt: addDays(date, 1),
    transitionKey: "fixture:permission-review",
    entityIds: [person.id],
    jurisdictionId: state.id,
    provenance: {
      kind: "authored",
      note: "A saved fixture review, not an application or production admission.",
    },
  });
  const activityId = world.history.futureDueItems.at(-1)!.id;
  world = advanceWorld(
    world,
    1,
    createFutureTransitionHandlerRegistry([
      [
        "fixture:permission-review",
        (input) => ({
          world: input,
          status: "resolved",
          reasonKey: null,
          context: null,
          outcomeEventId: null,
        }),
      ],
    ]),
  );
  return { world, law, context, input, activityId };
}

const row: LawConsequenceRow = {
  id: "fixture:permission-yes",
  kind: "right-permission",
  when: "renewal",
  who: { selector: "recorded-person-permission", predicates: [] },
  what: "permit-on-yes",
  decision: { op: "term", key: "law-answer", type: "boolean" },
  conditions: [],
  lag: { days: 0, sourceIds: ["authored-unit-fixture"] },
  onRepeal: "recompute-prospective",
  evidence: {
    sourceIds: ["authored-unit-fixture"],
    population: "Saved review subjects only",
    scope: "Mechanism fixture; not a production law row",
    why: "Test explicit direction and canonical law attribution",
    uncertainty: "No production permission policy admitted",
  },
};
describe("right permission kind mechanism", () => {
  it("uses shared dispatch and saves the actual review, person and legal identity", () => {
    const { world, context, input, activityId } = fixture();
    const catalog = world.policyCatalog!;
    const question = Object.values(catalog.propositions).find(
      (q) => q.stableKey === context.questionKey,
    )!;
    const admitted = {
      ...world,
      policyCatalog: {
        ...catalog,
        propositions: {
          ...catalog.propositions,
          [question.id]: { ...question, consequences: [row] },
        },
      },
    };
    const activity = {
      onDate: world.currentDate,
      activity: "renewal" as const,
      activityId,
      subjectIds: [input.subject.id],
    };
    const next = applyLawConsequences(admitted, activity, [
      RIGHT_PERMISSION_REGISTRATION,
    ]);
    assertWorldIntegrity(next);
    const saved = latestLawPermission(
      next,
      input.subject,
      context.questionKey,
    )!;
    expect(saved.status).toBe("permitted");
    expect(saved.sourceRecordIds).toContain(activityId);
    const resumed = deserializeWorld(serializeWorld(next));
    expect(
      applyLawConsequences(resumed, activity, [RIGHT_PERMISSION_REGISTRATION]),
    ).toBe(resumed);
  });
  it("rejects unavailable legal authority/activity and stale resolved inputs", () => {
    const { world, context, input, activityId } = fixture();
    const activity = {
      onDate: world.currentDate,
      activity: "renewal" as const,
      activityId,
      subjectIds: [input.subject.id],
      questionKey: context.questionKey,
    };
    const resolved = resolveRightPermission(world, row, activity)[0]!;
    expect(
      resolveRightPermission(world, row, {
        ...activity,
        governingLawId: world.id,
      }),
    ).toEqual([]);
    expect(
      resolveRightPermission(world, row, { ...activity, activityId: world.id }),
    ).toEqual([]);
    expect(
      resolveRightPermission(world, row, {
        ...activity,
        questionKey: "missing:law",
      }),
    ).toEqual([]);
    expect(
      resolveRightPermission(world, row, {
        ...activity,
        onDate: makeIsoDate("2026-01-14"),
      }),
    ).toEqual([]);
    expect(
      applyRightPermission(world, {
        ...resolved,
        value: { type: "boolean", value: false },
      }),
    ).toBe(world);
  });
  it("requires explicit supported scope instead of silently ignoring eligibility predicates", () => {
    const { world, context, input, activityId } = fixture();
    expect(() =>
      resolveRightPermission(
        world,
        {
          ...row,
          who: {
            ...row.who,
            predicates: [
              { capability: "unimplemented-license", parameters: {} },
            ],
          },
        },
        {
          onDate: world.currentDate,
          activity: "renewal",
          activityId,
          subjectIds: [input.subject.id],
          questionKey: context.questionKey,
        },
      ),
    ).toThrow(/scope/);
  });
});
