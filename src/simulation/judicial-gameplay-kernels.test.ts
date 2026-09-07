import { describe, expect, it } from "vitest";

import {
  addSimulationMinutes,
  assertWorldIntegrity,
  createDemoWorld,
  createOrganization,
  createScheduledActivity,
  createWorkRelationship,
  deserializeWorld,
  serializeWorld,
} from "./index";
import type { World } from "./index";
import {
  applyJudicialGameplayPlan,
  assertJudicialKernelBankIntegrity,
  compileJudicialGameplayKernel,
  JudicialKernelCompileError,
  judicialGameplayCoverageReport,
  judicialKernelDefinitionById,
  type JudicialKernelCompileContext,
  type JudicialKernelId,
  type JudicialRoleBinding,
} from "./judicial-gameplay-kernels";
import {
  JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS,
  JUDICIAL_GAMEPLAY_KERNEL_ROWS,
} from "./judicial-gameplay-kernel-bank";

const COMPILED_IDS: readonly JudicialKernelId[] = [
  "SEED-04",
  "SEED-08",
  "SEED-41",
  "SEED-42",
  "SEED-43",
  "SEED-45",
  "SEED-48",
  "SEED-49",
  "SEED-50",
  "SEED-59",
];

interface Fixture {
  readonly world: World;
  readonly context: JudicialKernelCompileContext;
}

function fixture(kernelId: JudicialKernelId): Fixture {
  let world = createDemoWorld(`92g-${kernelId.toLowerCase()}`);
  const principalId = world.personOrder[0]!;
  world = { ...world, control: { kind: "person", personId: principalId } };
  const jurisdictionId = world.jurisdictionOrder[0]!;
  world = createOrganization(world, {
    stableKey: `92g:${kernelId.toLowerCase()}:court-organization`,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "Synthetic 92G compiler test court.",
    },
    initialProfile: {
      name: "Synthetic Court Organization",
      classification: "service:court-workplace",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const courtOrganizationId = world.history.organizations.at(-1)!.id;
  const definition = judicialKernelDefinitionById(kernelId);
  if (!definition)
    throw new Error(`Test requires compiled kernel ${kernelId}.`);
  const roleBindings: JudicialRoleBinding[] = definition.roleRequirements.map(
    (requirement, index) => ({
      roleKey: requirement.roleKey,
      personId: world.personOrder[index]!,
    }),
  );
  const courtInsiderIds = new Set(
    definition.roleRequirements.flatMap((requirement, index) =>
      requirement.kind === "court-insider" ? [world.personOrder[index]!] : [],
    ),
  );
  for (const [index, personId] of [...courtInsiderIds].entries()) {
    world = createWorkRelationship(world, {
      stableKey: `92g:${kernelId.toLowerCase()}:court-work:${index}`,
      personId,
      organizationId: courtOrganizationId,
      startedAt: world.currentDate,
      kind: "employment:court-work",
      compensation: "paid",
      authority: index === 0 ? "directs-others" : "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Synthetic 92G role binding." },
      initialRole: {
        title: index === 0 ? "Synthetic Judge" : "Synthetic Court Participant",
        occupationClassification: "profession:court-work",
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 30, maximumHours: 50 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
  }

  const start = addSimulationMinutes(world.currentMoment, 60);
  const end = addSimulationMinutes(start, 45);
  const matterSourceEntityId = courtOrganizationId;
  return {
    world,
    context: {
      instanceKey: "fixture-1",
      worldId: world.id,
      currentMoment: world.currentMoment,
      jurisdictionId,
      courtOrganizationId,
      matterSourceEntityId,
      roleBindings,
      activityWindow: { start, end },
      location: {
        locationKey: "92g:synthetic-chambers",
        label: "Synthetic chambers",
        jurisdictionId,
      },
    },
  };
}

describe("92G judicial gameplay kernel bank", () => {
  it("transcribes every sequential seed row exactly once and derives the executable gate", () => {
    expect(() => assertJudicialKernelBankIntegrity()).not.toThrow();
    expect(JUDICIAL_GAMEPLAY_KERNEL_ROWS.map((row) => row.id)).toEqual(
      JUDICIAL_GAMEPLAY_KERNEL_ROWS.map(
        (_, index) => `SEED-${String(index + 1).padStart(2, "0")}`,
      ),
    );
    expect(JUDICIAL_GAMEPLAY_KERNEL_ROWS.at(0)?.id).toBe("SEED-01");
    expect(JUDICIAL_GAMEPLAY_KERNEL_ROWS.at(-1)?.id).toBe("SEED-60");
    expect(
      judicialGameplayCoverageReport()
        .filter((entry) => entry.status === "COMPILED_CURRENT_MECHANICS")
        .map((entry) => entry.id),
    ).toEqual(COMPILED_IDS);
    expect(
      judicialGameplayCoverageReport()
        .filter((entry) => entry.status === "MECHANIC_GATED")
        .every((entry) => entry.blockedBy.length > 0),
    ).toBe(true);
    expect(JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS).toHaveLength(
      COMPILED_IDS.length,
    );
  });

  it.each(COMPILED_IDS)(
    "compiles and applies %s through canonical writers",
    (kernelId) => {
      const { world, context } = fixture(kernelId);
      const before = serializeWorld(world);
      const plan = compileJudicialGameplayKernel(kernelId, context);
      expect(plan.steps.map((step) => step.kind)).toEqual([
        "historical-event",
        "evidence-artifact",
        "scheduled-activity",
        "work-item",
        "relationship-interaction",
      ]);
      expect(serializeWorld(world)).toBe(before);

      const applied = applyJudicialGameplayPlan(world, plan);
      expect(applied.history.events).toHaveLength(
        world.history.events.length + 1,
      );
      expect(applied.history.evidenceArtifacts).toHaveLength(
        world.history.evidenceArtifacts.length + 1,
      );
      expect(applied.history.scheduledActivities).toHaveLength(
        world.history.scheduledActivities.length + 1,
      );
      expect(applied.history.workItems).toHaveLength(
        world.history.workItems.length + 1,
      );
      expect(applied.history.relationshipInteractions).toHaveLength(
        world.history.relationshipInteractions.length + 1,
      );
      expect(applied.history.decisionTraces).toHaveLength(
        world.history.decisionTraces.length,
      );
      expect(() => assertWorldIntegrity(applied)).not.toThrow();
      expect(serializeWorld(deserializeWorld(serializeWorld(applied)))).toBe(
        serializeWorld(applied),
      );
    },
  );

  it("refuses every mechanic-gated row instead of compiling a thin court substitute", () => {
    const base = fixture("SEED-04");
    for (const entry of judicialGameplayCoverageReport().filter(
      (candidate) => candidate.status === "MECHANIC_GATED",
    )) {
      expect(() =>
        compileJudicialGameplayKernel(entry.id, base.context),
      ).toThrowError(JudicialKernelCompileError);
      try {
        compileJudicialGameplayKernel(entry.id, base.context);
      } catch (error) {
        expect((error as JudicialKernelCompileError).reason).toBe(
          "kernel-mechanic-gated",
        );
      }
    }
  });

  it("fails closed on missing roles, inactive court work, and stale world binding", () => {
    const { world, context } = fixture("SEED-41");
    expect(() =>
      compileJudicialGameplayKernel("SEED-41", {
        ...context,
        roleBindings: context.roleBindings.slice(0, -1),
      }),
    ).toThrow(/requires role/);

    const plan = compileJudicialGameplayKernel("SEED-41", {
      ...context,
      roleBindings: context.roleBindings.map((binding) =>
        binding.roleKey === "junior-law-clerk"
          ? { ...binding, personId: world.personOrder[5]! }
          : binding,
      ),
    });
    expect(() => applyJudicialGameplayPlan(world, plan)).toThrow(
      /active canonical court work/,
    );

    const laterWorld = {
      ...world,
      currentMoment: addSimulationMinutes(world.currentMoment, 1),
    };
    expect(() => applyJudicialGameplayPlan(laterWorld, plan)).toThrow(
      /world and moment/,
    );
  });

  it("requires the spouse role to share a canonical household with the principal", () => {
    const { world, context } = fixture("SEED-49");
    const plan = compileJudicialGameplayKernel("SEED-49", {
      ...context,
      roleBindings: context.roleBindings.map((binding) =>
        binding.roleKey === "spouse"
          ? { ...binding, personId: world.personOrder[3]! }
          : binding,
      ),
    });
    expect(() => applyJudicialGameplayPlan(world, plan)).toThrow(
      /canonical shared household/,
    );
  });

  it("lets the canonical schedule reject conflicts without mutating the input world", () => {
    const { world, context } = fixture("SEED-50");
    const principalId = context.roleBindings.find(
      (binding) => binding.roleKey === "principal",
    )!.personId;
    const sourceEventId = world.history.events[0]!.id;
    const conflicting = createScheduledActivity(world, {
      stableKey: "92g:conflicting-activity",
      title: "Existing commitment",
      summary: "A pre-existing canonical commitment occupies this interval.",
      kind: "confirmed",
      start: context.activityWindow.start,
      end: context.activityWindow.end,
      participantPersonIds: [principalId],
      responsiblePersonId: principalId,
      location: context.location,
      sourceEntityIds: [sourceEventId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [principalId] },
    });
    const plan = compileJudicialGameplayKernel("SEED-50", {
      ...context,
      worldId: conflicting.id,
      currentMoment: conflicting.currentMoment,
    });
    const before = serializeWorld(conflicting);
    expect(() => applyJudicialGameplayPlan(conflicting, plan)).toThrow(
      /conflicts with/,
    );
    expect(serializeWorld(conflicting)).toBe(before);
  });

  it("contains no scoring, ruling prediction, moral meter, or autonomous choice output", () => {
    expect(JSON.stringify(JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS)).not.toMatch(
      /ideology|moral.slider|predicted.ruling|ruling.score|probability|candidate.score/i,
    );
  });

  it("rejects duplicate bindings before a plan can become ambiguous", () => {
    const { context } = fixture("SEED-04");
    expect(() =>
      compileJudicialGameplayKernel("SEED-04", {
        ...context,
        roleBindings: [...context.roleBindings, context.roleBindings[0]!],
      }),
    ).toThrow(/Duplicate judicial role binding/);
  });
});
