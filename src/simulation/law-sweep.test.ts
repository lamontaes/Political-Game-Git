import { describe, expect, it } from "vitest";
import startingLaws from "../../data/research/laws/starting-law-2026/index";
import { makeIsoDate } from "./dates";
import { applyLawConsequences } from "./enacted-law-effects";
import { lawEffectPaths, unwiredQuestions } from "./governing/law-effect-paths";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { GOVERNMENT_OPERATIONS_QUESTION_KEYS } from "./law-consequences/government-operations-rows";
import { lawPermissionRecords } from "./law-consequences/permission-records";
import { createLightweightPerson } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { deserializeWorld, serializeWorld } from "./serialization";
import { createWorld, createWorldId, assertWorldIntegrity } from "./world";

describe("registered law paths", () => {
  it("admits all government-operation rules against each of the 56 source rows", () => {
    const catalog = createProductionPolicyCatalog();
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const questionKey of Object.values(
      GOVERNMENT_OPERATIONS_QUESTION_KEYS,
    )) {
      const proposition = Object.values(catalog.propositions).find(
        (row) => row.stableKey === questionKey,
      )!;
      expect(proposition.consequences).toHaveLength(1);
      expect(lawEffectPaths(catalog)).toContainEqual({
        questionKey,
        kind: "registered-consequence",
        via: proposition.consequences![0]!.id,
      });
      expect(unwiredQuestions(catalog).map((row) => row.key)).not.toContain(
        questionKey,
      );
      for (const place of places) {
        const question = Object.entries(startingLaws.questions).find(
          ([key]) => key === questionKey,
        )?.[1];
        const answer = Object.entries(question?.answers ?? {}).find(
          ([key]) => key === place.jurisdictionKey,
        )?.[1];
        expect(answer, `${questionKey}/${place.jurisdictionKey}`).toBeDefined();
        expect(["yes", "no"]).toContain(answer?.answer);
        expect(
          answer &&
            Object.entries(answer).some(
              ([key, value]) =>
                ["cite", "source", "estimated"].includes(key) &&
                typeof value === "string" &&
                value.trim(),
            ),
        ).toBeTruthy();
      }
    }
  });

  it("does not count a consequence without a registered selector as a wired path", () => {
    const original = createProductionPolicyCatalog();
    const question = Object.values(original.propositions).find(
      (row) => row.stableKey === GOVERNMENT_OPERATIONS_QUESTION_KEYS.lobbying,
    )!;
    const catalog = {
      ...original,
      propositions: {
        ...original.propositions,
        [question.id]: {
          ...question,
          consequences: question.consequences!.map((row) => ({
            ...row,
            who: { ...row.who, selector: "fixture:missing-selector" },
          })),
        },
      },
    };
    expect(
      lawEffectPaths(catalog).filter(
        (row) => row.questionKey === question.stableKey,
      ),
    ).toEqual([]);
    expect(unwiredQuestions(catalog).map((row) => row.key)).toContain(
      question.stableKey,
    );
  });

  it("applies the admitted lobbying rule to a named former official and retains its sources after reload", () => {
    const date = makeIsoDate("2027-01-14");
    const seed = "p2-e-former-official";
    const state = stateJurisdictionForKey(
      lifePlaceStateIdentities()[0]!.jurisdictionKey,
    )!;
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
      people: [person],
      jurisdictions: [state],
      policyCatalog: createProductionPolicyCatalog(),
    });
    const provenance = {
      kind: "authored" as const,
      note: "Explicit former-office fixture; no simulated retirement or lobbying attempt.",
    };
    world = createOrganization(world, {
      stableKey: "p2-e-body",
      formedAt: date,
      provenance,
      initialProfile: {
        name: "Fixture body",
        classification: "sector:government",
        locationJurisdictionId: state.id,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "p2-e-ended-office",
      personId: person.id,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: date,
      kind: "employment:legislative-member",
      compensation: "unpaid",
      authority: "directs-others",
      dependency: "independent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Fixture official",
        occupationClassification: null,
        locationJurisdictionId: state.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 0, maximumHours: 0 },
          attention: "low",
          concurrency: "mostly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: state.id,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    world = recordWorkStatus(world, {
      stableKey: "p2-e-office-ended",
      workRelationshipId: work.id,
      effectiveAt: date,
      status: "ended",
      reason: "fixture:term-ended",
      provenance,
      supersedesStatusId: world.history.workStatuses.at(-1)!.id,
    });
    const questionKey = GOVERNMENT_OPERATIONS_QUESTION_KEYS.lobbying;
    const applied = applyLawConsequences(world, {
      onDate: date,
      activity: "effective",
      activityId: work.id,
      subjectIds: [person.id],
      questionKey,
    });
    const saved = lawPermissionRecords(applied).find(
      (row) =>
        row.subject.id === person.id &&
        row.permissionKey === "lobbying.former-public-official",
    )!;
    expect(saved).toBeDefined();
    expect(saved.sourceRecordIds).toContain(work.id);
    expect(saved.lawEffectStamps[0]!.questionKey).toBe(questionKey);
    expect(saved.subject.id).toBe(person.id);
    const answer = Object.entries(startingLaws.questions).find(
      ([key]) => key === questionKey,
    )![1];
    const source = Object.entries(answer.answers).find(
      ([key]) => key === lifePlaceStateIdentities()[0]!.jurisdictionKey,
    )![1];
    expect(saved.status).toBe(
      source.answer === "yes" ? "prohibited" : "permitted",
    );
    assertWorldIntegrity(applied);
    const continued = deserializeWorld(serializeWorld(applied));
    expect(lawPermissionRecords(continued)).toContainEqual(saved);
    expect(
      applyLawConsequences(continued, {
        onDate: date,
        activity: "effective",
        activityId: work.id,
        subjectIds: [person.id],
        questionKey,
      }),
    ).toBe(continued);
  });
});
