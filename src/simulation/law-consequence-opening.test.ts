import { describe, expect, it, vi } from "vitest";
import { createWorld } from "./world";
import { STATES } from "./state-reference";
import { createPolicyCatalog } from "./policy";
import { loadPolicyPacks } from "./policy-packs";
import {
  applyLawConsequences,
  applyStartingLawConsequences,
} from "./enacted-law-effects";
import type {
  LawConsequenceKindRegistration,
  LawConsequenceRow,
} from "./law-consequence-types";
import type { World } from "./types";

const active = vi.hoisted(() => ({
  registrations: [] as LawConsequenceKindRegistration[],
}));
vi.mock("./law-consequence-registry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./law-consequence-registry")>()),
  LAW_CONSEQUENCE_REGISTRATIONS: active.registrations,
}));

const row: LawConsequenceRow = {
  id: "fixture-opening",
  kind: "right-permission",
  when: "effective",
  who: { selector: "fixture-place", predicates: [] },
  what: "fixture-permission",
  decision: { op: "term", key: "allowed", type: "boolean" },
  conditions: [],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["fixture"],
    population: "fixture",
    scope: "fixture",
    why: "dispatch contract fixture",
    uncertainty: "not a real law",
  },
};
function catalog() {
  const registry = loadPolicyPacks([
    {
      pack: "fixture",
      provenance: { kind: "authored-fiction", note: "Dispatch test only" },
      domains: [{ key: "rights", name: "Rights", description: "Fixture" }],
      issues: [
        {
          key: "permission",
          domain: "rights",
          name: "Permission",
          description: "Fixture",
        },
      ],
      propositions: [
        {
          key: "allowed",
          issue: "permission",
          name: "Allowed",
          question: "Allowed?",
          consequences: [row],
        },
      ],
    },
  ]);
  return createPolicyCatalog({ catalogVersion: "fixture", ...registry });
}
function registration(
  origin: "enacted" | "in-force-at-start",
  apply = vi.fn((world: World) => world),
): LawConsequenceKindRegistration {
  return {
    kind: row.kind,
    owner: "fixture",
    selectors: [row.who.selector],
    predicates: [],
    actions: [row.what],
    units: [],
    apply,
    resolve: (world, candidate, context) => [
      {
        row: candidate,
        law: {
          answer: "yes",
          measureId: "fixture-law",
          origin,
          level: "state",
          operativeAt: world.startedAt,
          operativeBasis: "enacted-date",
        },
        questionKey: context.questionKey!,
        jurisdictionId: world.jurisdictionOrder[0]!,
        subject: { kind: "place", id: world.jurisdictionOrder[0]! },
        activityId: context.activityId,
        effectiveAt: world.startedAt,
        sourceRecordIds: [],
        value: { type: "boolean", value: true },
      },
    ],
  };
}
function opening(key: string) {
  return createWorld({
    seed: `opening:${key}`,
    currentDate: "2026-01-01",
    people: [],
    policyCatalog: catalog(),
    jurisdictions: [
      {
        id: key,
        slug: key,
        name: STATES[key]!.name,
        kind: "state",
        parentName: null,
        provenance: {
          asOf: null,
          source: "test fixture",
          jurisdiction: key,
          status: "placeholder",
        },
      },
    ],
  });
}
describe("starting laws use the shared consequence entry", () => {
  it.each(Object.keys(STATES))(
    "dispatches opening once for %s without manufacturing enactment",
    (key) => {
      const apply = vi.fn((world: World) => world);
      active.registrations.splice(
        0,
        active.registrations.length,
        registration("in-force-at-start", apply),
      );
      try {
        const world = opening(key);
        expect(apply).toHaveBeenCalledTimes(1);
        expect(
          apply.mock.calls[0]![0].history.legislativeEnactments,
        ).toHaveLength(0);
        expect(world.currentDate).toBe("2026-01-01");
      } finally {
        active.registrations.splice(0);
      }
    },
  );
  it("filters enacted origin at opening but permits it at a matching later activity", () => {
    const apply = vi.fn((world: World) => world);
    const handler = registration("enacted", apply);
    active.registrations.push(handler);
    try {
      const world = opening(Object.keys(STATES)[0]!);
      expect(apply).not.toHaveBeenCalled();
      applyStartingLawConsequences(world, [handler]);
      expect(apply).not.toHaveBeenCalled();
      applyLawConsequences(
        world,
        {
          onDate: world.currentDate,
          activity: "effective",
          activityId: "fixture-enactment",
          subjectIds: [],
          origin: "enacted",
          governingLawId: "fixture-law",
        },
        [handler],
      );
      expect(apply).toHaveBeenCalledTimes(1);
      applyLawConsequences(
        world,
        {
          onDate: world.currentDate,
          activity: "payment",
          activityId: "fixture-payment",
          subjectIds: [],
        },
        [handler],
      );
      expect(apply).toHaveBeenCalledTimes(1);
    } finally {
      active.registrations.splice(0);
    }
  });
});
