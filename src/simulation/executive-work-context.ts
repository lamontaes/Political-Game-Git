import { activeLifePathWorkers } from "./life-paths2-workers";
import { isPersonAliveAt } from "./vitality-integrity";
/** EXEC-WORK2: read canonical office/work/evidence, never caller authority. */
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "./executive-authority-rule-packs";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  organizationProfileAt,
  activePartnershipsAt,
} from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import { hasPersonDiscoveredEvidence } from "./evidence";
import {
  executiveGoverningKernelById,
  EXECUTIVE_GOVERNING_KERNELS,
} from "./executive-governing-kernel-bank";
import {
  compileExecutiveGoverningPlan,
  type ExecutiveGoverningContext,
  type ExecutiveKernelId,
  type ExecutiveRoleKey,
  type ExecutiveDispositionOptionKey,
} from "./executive-governing-kernels";
import { measurePosition } from "./legislation";
import { workItemState } from "./time-work";
import { addDays, addSimulationMinutes } from "./dates";
import type { EntityId, World } from "./types";

export const EXECUTIVE_TERM_END = "executive-work:term-end" as const;
export const EXECUTIVE_ENTRY = "executive.custom-start";

export function resolveExecutiveOffice(world: World) {
  if (world.control.kind !== "person") return null;
  const personId = world.control.personId;
  const cutoff = currentLifeCutoff(world);
  if (!isPersonAliveAt(world, personId, cutoff)) return null;
  const offices = activeWorkRelationshipsAt(world, personId).flatMap(
    ({ relationship, role }) => {
      if (
        relationship.kind !== "employment:executive-office" ||
        !relationship.organizationId ||
        relationship.provenance.kind !== "simulated-event"
      )
        return [];
      const entryId = relationship.provenance.eventId;
      const entry = world.history.events.find((e) => e.id === entryId);
      if (
        !entry ||
        entry.type !== EXECUTIVE_ENTRY ||
        !entry.involvedEntityIds.includes(personId) ||
        entry.occurredAt !== relationship.startedAt
      )
        return [];
      const profile = organizationProfileAt(
        world,
        relationship.organizationId,
        cutoff,
      );
      const pack = EXECUTIVE_AUTHORITY_RULE_PACKS.find(
        (p) =>
          role.occupationClassification === `service:${p.office.officeKey}` &&
          profile?.classification === `service:${p.office.officeKey}`,
      );
      if (!pack) return [];
      const jurisdiction = stateJurisdictionForKey(pack.jurisdictionKey);
      if (
        !jurisdiction ||
        jurisdiction.id !== role.locationJurisdictionId ||
        jurisdiction.id !== entry.jurisdictionId ||
        profile?.locationJurisdictionId !== jurisdiction.id
      )
        return [];
      const term = world.history.futureDueItems.find(
        (d) =>
          d.transitionKey === EXECUTIVE_TERM_END &&
          d.entityIds.includes(relationship.id) &&
          d.entityIds.includes(entry.id),
      );
      if (
        !term ||
        term.dueAt <= world.currentDate ||
        term.jurisdictionId !== jurisdiction.id
      )
        return [];
      return [
        {
          personId,
          relationship,
          role,
          entry,
          pack,
          jurisdictionId: jurisdiction.id,
          organizationId: relationship.organizationId,
          endsAt: term.dueAt,
        },
      ];
    },
  );
  return offices.length === 1 ? offices[0]! : null;
}

/** Stable role classification is capability, not a name/title match. Staffing
 * uses LIFE-PATHS2's underlying dated relationship/status/role interfaces. */
export function executiveStaffRoles(
  world: World,
  office: NonNullable<ReturnType<typeof resolveExecutiveOffice>>,
) {
  const roles: Partial<Record<ExecutiveRoleKey, EntityId>> = {
    principal: office.personId,
  };
  const keys = new Set(EXECUTIVE_GOVERNING_KERNELS.flatMap((k) => k.roles));
  for (const key of keys) {
    if (key === "principal" || key === "family-member") continue;
    const candidates = activeLifePathWorkers(world, office.organizationId)
      .filter(
        (w) =>
          isPersonAliveAt(world, w.personId, currentLifeCutoff(world)) &&
          w.relationship.kind === "employment:executive-staff" &&
          w.role.locationJurisdictionId === office.jurisdictionId &&
          w.role.occupationClassification === `service:executive-${key}`,
      )
      .map((w) => w.personId);
    const unique = [...new Set(candidates)];
    if (unique.length === 1) roles[key] = unique[0]!;
  }
  const partners = activePartnershipsAt(world, office.personId).flatMap((p) =>
    p.personIds.filter((id) => id !== office.personId),
  );
  if (partners.length === 1) roles["family-member"] = partners[0]!;
  // A partner is not automatically an adviser or an office employee.
  return roles;
}

export function bindExecutiveWork(
  world: World,
  workItemId: EntityId,
  kernelId: ExecutiveKernelId,
  option: ExecutiveDispositionOptionKey = "sign",
) {
  const office = resolveExecutiveOffice(world);
  if (!office)
    return {
      ok: false as const,
      reason: "No current supported executive office and term.",
    };
  const item = world.history.workItems.find((w) => w.id === workItemId);
  if (
    !item ||
    item.jurisdictionId !== office.jurisdictionId ||
    !item.sourceEntityIds.includes(office.entry.id)
  )
    return {
      ok: false as const,
      reason: "This work does not belong to the current office term.",
    };
  const state = workItemState(world, item.id);
  if (state.status === "cancelled" || state.status === "completed")
    return { ok: false as const, reason: "This work is no longer open." };
  const definition = executiveGoverningKernelById(kernelId);
  if (!definition)
    return {
      ok: false as const,
      reason:
        "This office practice needs a mechanic or source that is not available.",
    };
  // Jurisdiction-mandated reports cannot acquire legal authority from an
  // authored evidence description. The corresponding authority adapter is absent.
  if (definition.authority.kind === "supplied-canonical-fact")
    return {
      ok: false as const,
      reason: `No registered jurisdiction authority for ${definition.authority.factKey}.`,
    };
  const cutoff = currentLifeCutoff(world);
  const facts: Record<string, string> = {};
  const evidenceIds: EntityId[] = [];
  for (const key of definition.requiredFactKeys) {
    const matches = world.history.evidenceArtifacts.filter(
      (e) =>
        e.evidenceKind === `executive-fact:${key}` &&
        e.relatedEntityIds.some(
          (id) => item.sourceEntityIds.includes(id) && id !== office.entry.id,
        ) &&
        e.recordedAt <= world.currentDate &&
        e.description &&
        hasPersonDiscoveredEvidence(world, office.personId, e.id, cutoff),
    );
    // Conflicting reports need explicit resolution, never last-array-wins.
    if (matches.length === 1) {
      facts[key] = matches[0]!.description!;
      evidenceIds.push(matches[0]!.id);
    }
  }
  const measure = (world.history.legislativeMeasures ?? []).find(
    (m) =>
      item.focus.kind === "legislative-material" &&
      item.focus.targetKey === `executive-work:measure:${m.id}`,
  );
  let measureContext: ExecutiveGoverningContext["measure"] = null;
  if (measure) {
    const ref = office.pack.presentment.legislativeRulePackId;
    if (
      ref.kind !== "known" ||
      ref.value !== measure.rulePackId ||
      measure.jurisdictionId !== office.jurisdictionId
    )
      return {
        ok: false as const,
        reason: "The measure is outside this office’s represented authority.",
      };
    const presentment = (world.history.legislativeActions ?? []).find(
      (a) => a.measureId === measure.id && a.kind === "presented-to-executive",
    );
    if (
      !presentment ||
      (definition.authority.kind === "legislative-rule-pack" &&
        measurePosition(world, measure.id).phase !== "awaiting-executive")
    )
      return {
        ok: false as const,
        reason: "The measure is not awaiting executive action.",
      };
    measureContext = {
      measureId: measure.id,
      rulePackId: measure.rulePackId,
      presentmentEventId: presentment.eventId,
      chosenOption: option,
      rationale: "Recorded player disposition.",
    };
    facts["presentment-date"] = presentment.occurredAt;
  }
  const activityWindows: ExecutiveGoverningContext["activityWindows"] extends Readonly<
    infer T
  >
    ? T
    : never = {};
  const dueDates: Record<string, ReturnType<typeof addDays>> = {};
  let minutes = 0;
  for (const binding of definition.shell) {
    if (binding.kind !== "compiled") continue;
    if (binding.step.kind === "scheduled-activity") {
      activityWindows[binding.step.stepKey] = {
        start: addSimulationMinutes(world.currentMoment, minutes),
        end: addSimulationMinutes(world.currentMoment, minutes + 30),
      };
      minutes += 30;
    }
    if (binding.step.kind === "future-due-item")
      dueDates[binding.step.stepKey] = addDays(world.currentDate, 7);
  }
  const context: ExecutiveGoverningContext = {
    planKey: `exec-work:${item.id}`,
    worldId: world.id,
    officeJurisdictionId: office.jurisdictionId,
    moment: world.currentMoment,
    roles: executiveStaffRoles(world, office),
    facts,
    activityWindows,
    dueDates,
    location: {
      jurisdictionId: office.jurisdictionId,
      label: "Office work",
      locationKey: "executive-work:office",
    },
    matterEntityId: item.id,
    measure: measureContext,
  };
  const compiled = compileExecutiveGoverningPlan(definition, context);
  if (!compiled.ok)
    return {
      ok: false as const,
      reason: [compiled.reason, ...compiled.detail].join(": "),
    };
  return {
    ok: true as const,
    office,
    item,
    state,
    definition,
    context,
    plan: compiled.plan,
    evidenceIds,
  };
}
