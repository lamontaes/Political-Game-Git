import { activeLifePathWorkers } from "./life-paths2-workers";
import { isPersonAliveAt } from "./vitality-integrity";
/** EXEC-WORK2: read canonical office/work/evidence, never caller authority. */
import { EXECUTIVE_AUTHORITY_RULE_PACKS } from "./executive-authority-rule-packs";
import type { ExecutiveAuthorityRulePack } from "./executive-authority-rules";
import { stateExecutiveIdentityForOfficeKey } from "./nationwide-world/state-executive-candidacy-packs";
import { electionContestResult } from "./election-contests";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  organizationProfileAt,
  activePartnershipsAt,
  workStatusAt,
} from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
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
import type { EntityId, Jurisdiction, World } from "./types";

export const EXECUTIVE_TERM_END = "executive-work:term-end" as const;
export const EXECUTIVE_ENTRY = "executive.custom-start";
export const EXECUTIVE_ELECTION_RESULT = "election.contest-resolved";
export const EXECUTIVE_ELECTED_TERM_ENTRY =
  "election:executive-term-entry" as const;
export const EXECUTIVE_ELECTED_TERM_EXPIRY =
  "election:executive-term-expiry" as const;
export const EXECUTIVE_QUALIFICATION = "election.executive-qualification";
export type ExecutiveOfficeOrigin = "custom-start" | "elected-term";

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
      if (!entry || !entry.involvedEntityIds.includes(personId)) return [];
      const origin = originForEntry(world, personId, entry);
      if (!origin) return [];
      if (
        origin === "custom-start" &&
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
      let endsAt: string;
      if (origin === "custom-start") {
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
        endsAt = term.dueAt;
      } else {
        const evidence = activeElectedExecutiveTermEvidence(
          world,
          relationship.id,
        );
        if (
          !evidence ||
          evidence.contest.office.officeKey !== pack.office.officeKey ||
          evidence.governing.id !== jurisdiction.id
        )
          return [];
        endsAt = evidence.endsAt;
      }
      return [
        {
          personId,
          relationship,
          role,
          entry,
          pack,
          origin,
          jurisdictionId: jurisdiction.id,
          organizationId: relationship.organizationId,
          endsAt,
        },
      ];
    },
  );
  return offices.length === 1 ? offices[0]! : null;
}

/**
 * The elected executive office an office key names: an accepted authority
 * pack's office, or a state's governorship without one. A missing pack means
 * the office's advanced legal powers are not compiled; it does not mean the
 * office cannot be won, entered or worked.
 */
export interface ElectedExecutiveOfficeIdentity {
  readonly officeKey: string;
  readonly title: string;
  readonly jurisdictionKey: string;
  /** The stable key of the office body organization. */
  readonly bodyKey: string;
  readonly pack: ExecutiveAuthorityRulePack | null;
}

export function electedExecutiveOfficeForKey(
  officeKey: string,
): ElectedExecutiveOfficeIdentity | null {
  const pack = EXECUTIVE_AUTHORITY_RULE_PACKS.find(
    (candidate) => candidate.office.officeKey === officeKey,
  );
  if (pack)
    return {
      officeKey,
      title: pack.office.title,
      jurisdictionKey: pack.jurisdictionKey,
      bodyKey: `executive-office:${pack.packId}`,
      pack,
    };
  const identity = stateExecutiveIdentityForOfficeKey(officeKey);
  if (!identity) return null;
  return {
    officeKey,
    title: identity.title,
    jurisdictionKey: identity.jurisdictionKey,
    bodyKey: `executive-office:${identity.officeKey}`,
    pack: null,
  };
}

/**
 * The jurisdiction an elected executive office governs from.
 *
 * A state's key resolves to its state jurisdiction. The District of Columbia's
 * `US-DC` does not: its Mayor governs from the city jurisdiction the District's
 * one government already holds, and resolving the key directly yields a
 * district-wide placeholder no contest was ever run in. Every D.C. life froze
 * on the day before its first mayoral election because the term planner
 * compared the contest against that placeholder.
 */
export function electedExecutiveOfficeJurisdiction(
  jurisdictionKey: string,
): Jurisdiction | null {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey)?.[1];
  return usps
    ? chiefExecutiveJurisdiction(usps)
    : stateJurisdictionForKey(jurisdictionKey);
}

/** Frozen dates live on expected work and future-due records; no second office store. */
export function electedExecutiveTermForRelationship(
  world: World,
  relationshipId: EntityId,
) {
  const entry = world.history.futureDueItems.find(
    (due) =>
      due.transitionKey === EXECUTIVE_ELECTED_TERM_ENTRY &&
      due.entityIds.includes(relationshipId),
  );
  const expiry = world.history.futureDueItems.find(
    (due) =>
      due.transitionKey === EXECUTIVE_ELECTED_TERM_EXPIRY &&
      due.entityIds.includes(relationshipId),
  );
  const relationship = world.history.workRelationships.find(
    (record) => record.id === relationshipId,
  );
  const contest = (world.history.electionContests ?? []).find((record) =>
    entry?.entityIds.includes(record.id),
  );
  const result = contest ? electionContestResult(world, contest.id) : null;
  const outcome =
    result &&
    world.history.events.find((event) => event.id === result.outcomeEventId);
  const office =
    contest && electedExecutiveOfficeForKey(contest.office.officeKey);
  const governing =
    office && electedExecutiveOfficeJurisdiction(office.jurisdictionKey);
  if (
    !entry ||
    !expiry ||
    !relationship ||
    !contest ||
    !result ||
    !outcome ||
    !office ||
    !governing ||
    relationship.kind !== "employment:executive-office" ||
    relationship.personId !== result.winnerPersonId ||
    relationship.startedAt !== entry.dueAt ||
    entry.dueAt >= expiry.dueAt ||
    relationship.provenance.kind !== "simulated-event" ||
    relationship.provenance.eventId !== result.outcomeEventId ||
    outcome.type !== EXECUTIVE_ELECTION_RESULT ||
    outcome.occurredAt === relationship.startedAt ||
    contest.electionDate >= entry.dueAt ||
    !entry.entityIds.includes(contest.id) ||
    !entry.entityIds.includes(result.id) ||
    !expiry.entityIds.includes(contest.id) ||
    !expiry.entityIds.includes(result.id) ||
    entry.entityIds.length !== 3 ||
    expiry.entityIds.length !== 3 ||
    entry.jurisdictionId !== governing.id ||
    expiry.jurisdictionId !== governing.id ||
    contest.jurisdictionId !== governing.id
  )
    return null;
  return {
    relationship,
    contest,
    result,
    outcome,
    office,
    pack: office.pack,
    governing,
    entry,
    expiry,
    startsAt: entry.dueAt,
    endsAt: expiry.dueAt,
  };
}

export function recordedExecutiveQualification(
  world: World,
  relationshipId: EntityId,
) {
  const term = electedExecutiveTermForRelationship(world, relationshipId);
  if (!term) return null;
  return (
    world.history.events.find(
      (event) =>
        event.type === EXECUTIVE_QUALIFICATION &&
        event.recordedAt <= world.currentDate &&
        event.involvedEntityIds.includes(term.relationship.personId) &&
        event.involvedEntityIds.includes(term.contest.id) &&
        event.involvedEntityIds.includes(term.result.id),
    ) ?? null
  );
}

/** Evidence consumed by office readers; a result or plan alone grants nothing. */
export function activeElectedExecutiveTermEvidence(
  world: World,
  relationshipId: EntityId,
) {
  const term = electedExecutiveTermForRelationship(world, relationshipId);
  if (
    !term ||
    world.currentDate < term.startsAt ||
    world.currentDate >= term.endsAt ||
    workStatusAt(world, relationshipId)?.status !== "active" ||
    !recordedExecutiveQualification(world, relationshipId) ||
    !isPersonAliveAt(world, term.relationship.personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return null;
  const entered = world.history.futureDueItemStates.some(
    (state) => state.dueItemId === term.entry.id && state.status === "resolved",
  );
  return entered ? term : null;
}

function originForEntry(
  world: World,
  personId: EntityId,
  entry: World["history"]["events"][number],
): ExecutiveOfficeOrigin | null {
  if (entry.type === EXECUTIVE_ENTRY) return "custom-start";
  if (entry.type !== EXECUTIVE_ELECTION_RESULT) return null;
  const result = (world.history.electionContestResults ?? []).find(
    (record) => record.outcomeEventId === entry.id,
  );
  if (!result || result.winnerPersonId !== personId) return null;
  return "elected-term";
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
