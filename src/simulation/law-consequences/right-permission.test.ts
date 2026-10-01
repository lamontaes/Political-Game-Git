import { describe, expect, it } from "vitest";
import { makeIsoDate, addDays, ageOnDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import {
  createHousehold,
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { loadedPolicyRegistry } from "../policy-pack-registry";
import { createLawConsequenceRegistry } from "../law-consequence-registry";
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
  it("admits the exact permission handler through the default seven-kind registry", () => {
    const registry = createLawConsequenceRegistry();
    expect(registry.handlers.get("right-permission")).toBe(
      RIGHT_PERMISSION_REGISTRATION,
    );
    expect([...registry.handlers.keys()].sort()).toEqual(
      [
        "pay",
        "legal-outcome",
        "coverage-eligibility",
        "price-cost",
        "service-delivered",
        "right-permission",
        "institution-rule",
      ].sort(),
    );
  });
  it("keeps production permission row absence explicit in loaded and saved catalogs", () => {
    const loaded = loadedPolicyRegistry().propositions.flatMap(
      (p) => p.consequences ?? [],
    );
    const saved = Object.values(
      createProductionPolicyCatalog().propositions,
    ).flatMap((p) => p.consequences ?? []);
    expect(loaded.filter((row) => row.kind === "right-permission")).toEqual([]);
    expect(saved.filter((row) => row.kind === "right-permission")).toEqual([]);
  });
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
    const next = applyLawConsequences(admitted, activity);
    assertWorldIntegrity(next);
    const saved = latestLawPermission(
      next,
      input.subject,
      context.questionKey,
    )!;
    expect(saved.status).toBe("permitted");
    expect(saved.sourceRecordIds).toContain(activityId);
    const resumed = deserializeWorld(serializeWorld(next));
    expect(applyLawConsequences(resumed, activity)).toBe(resumed);
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
  it("reads age from the recorded birth date at the review date without assuming a permit", () => {
    const { world, context, input, activityId } = fixture();
    const age = ageOnDate(
      world.people[input.subject.id]!.birthDate,
      world.currentDate,
    );
    const activity = {
      onDate: world.currentDate,
      activity: "renewal" as const,
      activityId,
      subjectIds: [input.subject.id],
      questionKey: context.questionKey,
    };
    const withAge = (years: number): LawConsequenceRow => ({
      ...row,
      who: {
        ...row.who,
        predicates: [
          { capability: "permission-minimum-age", parameters: { years } },
        ],
      },
    });
    expect(resolveRightPermission(world, withAge(age), activity)).toHaveLength(
      1,
    );
    expect(resolveRightPermission(world, withAge(age + 1), activity)).toEqual(
      [],
    );
    expect(() =>
      resolveRightPermission(
        world,
        {
          ...row,
          conditions: [
            { capability: "permission-issued-permit", parameters: {} },
          ],
        },
        activity,
      ),
    ).toThrow(/scope/);
    expect(() => resolveRightPermission(world, withAge(-1), activity)).toThrow(
      /years/,
    );
  });
  it("reads actual dated work/status/role and stamps their IDs; later ended work cannot alter an earlier review", () => {
    const f = fixture();
    const start = f.world.currentDate;
    const provenance = {
      kind: "authored",
      note: "Saved employment fixture, not permit issuance.",
    } as const;
    let world = createOrganization(f.world, {
      stableKey: "permission-fixture:employer",
      formedAt: start,
      provenance,
      initialProfile: {
        name: "Recorded fixture employer",
        classification: "sector:government",
        locationJurisdictionId: f.context.jurisdictionId,
      },
    });
    const organization = world.history.organizations.at(-1)!;
    world = createWorkRelationship(world, {
      stableKey: "permission-fixture:work-scope",
      personId: f.input.subject.id,
      organizationId: organization.id,
      startedAt: start,
      kind: "employment:staff",
      compensation: "unpaid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Recorded worker",
        occupationClassification: null,
        locationJurisdictionId: f.context.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 0, maximumHours: 0 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: f.context.jurisdictionId,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    const status = world.history.workStatuses.at(-1)!;
    const role = world.history.workRoles.at(-1)!;
    const activity = {
      onDate: start,
      activity: "renewal" as const,
      activityId: f.activityId,
      subjectIds: [f.input.subject.id],
      questionKey: f.context.questionKey,
    };
    const scoped = {
      ...row,
      who: {
        ...row.who,
        predicates: [
          {
            capability: "permission-active-work",
            parameters: { workKind: work.kind },
          },
        ],
      },
    };
    const resolved = resolveRightPermission(world, scoped, activity)[0]!;
    expect(resolved.sourceRecordIds).toEqual(
      expect.arrayContaining([work.id, status.id, role.id]),
    );
    const saved = applyRightPermission(world, resolved);
    expect(
      latestLawPermission(saved, f.input.subject, f.context.questionKey)
        ?.lawEffectStamps[0].sourceRecordIds,
    ).toEqual(expect.arrayContaining([work.id, status.id, role.id]));
    expect(
      applyRightPermission(deserializeWorld(serializeWorld(saved)), resolved)
        .history.lawPermissionRecords,
    ).toEqual(saved.history.lawPermissionRecords);
    world = advanceWorld(world, 1);
    world = recordWorkStatus(world, {
      stableKey: "permission-fixture:work-ended",
      workRelationshipId: work.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "Recorded end",
      provenance,
      supersedesStatusId: status.id,
    });
    expect(resolveRightPermission(world, scoped, activity)).toHaveLength(1);
    expect(
      resolveRightPermission(world, scoped, {
        ...activity,
        onDate: world.currentDate,
      }),
    ).toEqual([]);
    expect(
      resolveRightPermission(
        world,
        {
          ...scoped,
          who: {
            ...scoped.who,
            predicates: [
              {
                capability: "permission-active-work",
                parameters: { organizationId: world.id },
              },
            ],
          },
        },
        activity,
      ),
    ).toEqual([]);
  });
});
