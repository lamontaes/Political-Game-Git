import { createDemoWorld } from "../../src/simulation/demo";
import { LEXINGTON_DEMO_CONTEXT } from "../../src/simulation/demo-jurisdiction-context";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { initializeExecutiveOfficePremiseForReview } from "../../src/simulation/executive-work-entry";
import { resolveExecutiveOffice } from "../../src/simulation/executive-work-context";
import { receiveExecutiveWork } from "../../src/simulation/executive-work";
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "../../src/simulation/executive-authority-rule-packs";
import { EXECUTIVE_GOVERNING_KERNELS } from "../../src/simulation/executive-governing-kernel-bank";
import { recordWorldEvent } from "../../src/simulation/world";
import {
  recordEvidenceArtifact,
  recordEvidenceDiscovery,
} from "../../src/simulation/evidence";
import { createWorkRelationship } from "../../src/simulation/life";
import type { World } from "../../src/simulation/types";
export function officeWorld(jurisdictionKey = "US-KY", seed = "exec-work2") {
  const jurisdiction = stateJurisdictionForKey(jurisdictionKey)!;
  let world = createDemoWorld(seed, {
    context: {
      ...LEXINGTON_DEMO_CONTEXT,
      jurisdiction,
      initialMoment: {
        date: "2026-01-05" as World["currentDate"],
        minuteOfDay: 550,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      },
      creationSummary: "Executive consumer test world.",
    },
  });
  world = {
    ...world,
    control: { kind: "person", personId: world.personOrder[0]! },
  };
  return initializeExecutiveOfficePremiseForReview(
    world,
    EXECUTIVE_AUTHORITY_RULE_PACKS.find(
      (p) => p.jurisdictionKey === jurisdictionKey,
    )!.packId,
    "2026-02-05",
  );
}
export function incoming(world: World) {
  const office = resolveExecutiveOffice(world)!;
  const existing = world.history.events.find((e) => e.stableKey === "incoming");
  if (!existing)
    world = recordWorldEvent(world, {
      ...office.entry,
      stableKey: "incoming",
      type: "executive.incoming",
      summary: "Review the recorded office work.",
    });
  return receiveExecutiveWork(
    world,
    world.history.events.find((e) => e.stableKey === "incoming")!.id,
    "Office work",
    "Review the recorded office work.",
  );
}
export function facts(world: World, keys: readonly string[]) {
  const office = resolveExecutiveOffice(world)!;
  const item = world.history.workItems.at(-1)!;
  for (const key of keys) {
    world = recordEvidenceArtifact(world, {
      stableKey: `fact:${key}`,
      evidenceKind: `executive-fact:${key}`,
      createdAt: world.currentDate,
      recordedAt: world.currentDate,
      relatedEntityIds: [
        item.focus.kind === "other" ||
        item.focus.kind === "legislative-material"
          ? item.focus.sourceEntityId
          : office.entry.id,
      ],
      access: "private",
      description: `Authored test fact for ${key}.`,
      provenance: {
        kind: "authored",
        note: "Synthetic binding proof, not production content or legal authority.",
      },
    });
    const evidence = world.history.evidenceArtifacts.at(-1)!;
    world = recordEvidenceDiscovery(world, {
      stableKey: `read:${key}`,
      personId: office.personId,
      evidenceArtifactId: evidence.id,
      discoveredAt: world.currentDate,
      recordedAt: world.currentDate,
      methodKey: "executive-work:test",
      provenance: { kind: "authored", note: "Synthetic receipt." },
    });
  }
  return { world, item };
}
export function staff(world: World) {
  const office = resolveExecutiveOffice(world)!;
  const roles = [
    ...new Set(EXECUTIVE_GOVERNING_KERNELS.flatMap((k) => k.roles)),
  ].filter((k) => k !== "principal" && k !== "family-member");
  for (const [i, role] of roles.entries())
    world = createWorkRelationship(world, {
      stableKey: `staff:${role}`,
      personId: world.personOrder[1 + (i % 5)]!,
      organizationId: office.organizationId,
      startedAt: world.currentDate,
      kind: "employment:executive-staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Synthetic employed staff with explicit roles.",
      },
      initialRole: {
        title: role,
        occupationClassification: `service:executive-${role}`,
        locationJurisdictionId: office.jurisdictionId,
        timeDemand: office.role.timeDemand,
      },
    });
  return world;
}
