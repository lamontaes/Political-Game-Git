import { addDays } from "./dates";
/** Career content composes LIFE's canonical work, calendar and earned-pay writers. */
import type { EntityId, World, FutureTransitionHandlerRegistry } from "./types";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
  recordWorkRole,
} from "./life";
import { workStatusAt, workRoleAt } from "./life-queries";
import {
  createWorkCompensation,
  recordResourceFlowTerms,
  money,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { recordWorldEvent } from "./world";
import { lifePathDefinition } from "./life-paths2-catalog";
import {
  lifePathEntryReason,
  pathForRelationship,
  scheduleLifePathSession,
  performLifePathSession,
  changeLifePathStatus,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import type { LifePathResult } from "./life-paths2";
export interface CareerTask {
  readonly id: string;
  readonly text: string;
  readonly type: string;
}
export interface CareerProvider {
  readonly id: string;
  readonly pathId: string;
  readonly occupationCode: string;
  readonly sourceVersion: string;
  readonly tasks: readonly CareerTask[];
}
const authored = {
  kind: "authored",
  note: "CAREER-PATH7 v1 fictional civilian opportunity; employer contract and task duration are authored, not wage observations or legal qualification.",
} as const;
const actor = (w: World) =>
  w.control.kind === "person" ? w.control.personId : null;
const key = (w: World, s: string) =>
  `career-path7:${s}:${w.history.nextSequence}`;
const result = (
  world: World,
  ok: boolean,
  message: string,
): LifePathResult => ({ world, ok, message });
function event(
  w: World,
  type: string,
  ids: readonly EntityId[],
  summary: string,
): World {
  return recordWorldEvent(w, {
    stableKey: key(w, type),
    type: `career-path7.${type}`,
    occurredAt: w.currentDate,
    recordedAt: w.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [...new Set(ids)],
    participants: [...new Set(ids.filter((id) => !!w.people[id]))].map(
      (personId) => ({ personId, role: "agency:participant", detail: summary }),
    ),
    personFactConstraints: [],
    visibility: "private",
    tags: ["career-path7"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: summary,
      motivation: null,
      immediateReaction: null,
    },
  });
}
export function careerEligibility(w: World, p: CareerProvider): string | null {
  const a = actor(w);
  if (!a) return "Choose a person to seek work.";
  const path = lifePathDefinition(p.pathId);
  if (path.scope !== "personal" || path.kind !== "work")
    return "Public and campaign hiring require their own authority.";
  if (
    !["shop-assistant", "office-assistant", "repair-worker"].includes(path.id)
  )
    return "This provider has no authored civilian hiring context.";
  if (p.tasks.length === 0)
    return "No supported responsibilities are available.";
  return lifePathEntryReason(w, a, path);
}
/** Explicit inquiry creates an issued offer at a real canonical fictional employer, never on read. */
export function seekCareerOffer(w: World, p: CareerProvider): LifePathResult {
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const a = actor(w)!;
  const path = lifePathDefinition(p.pathId);
  if (
    w.history.workRelationships.some(
      (r) =>
        r.personId === a &&
        pathForRelationship(w, r.id)?.id === p.pathId &&
        workStatusAt(w, r.id)?.status !== "ended",
    )
  )
    return result(w, false, "You already have an offer or engagement here.");
  const orgKey = `life-paths2.organization:${path.organizationName}`;
  let org = w.history.organizations.find((o) => o.stableKey === orgKey);
  let n = w;
  if (!org) {
    n = createOrganization(n, {
      stableKey: orgKey,
      formedAt: n.currentDate,
      provenance: authored,
      initialProfile: {
        name: path.organizationName,
        classification: "community:cooperative",
        locationJurisdictionId: null,
      },
    });
    org = n.history.organizations.at(-1)!;
  }
  n = createWorkRelationship(n, {
    stableKey: key(n, p.id),
    personId: a,
    organizationId: org.id,
    startedAt: addDays(n.currentDate, 1),
    initialStatus: "expected",
    kind: `employment:life-paths2-${path.id}`,
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: path.title,
      occupationClassification: `custom:onet-${p.occupationCode.replace(/\./g, "-")}`,
      locationJurisdictionId: null,
      timeDemand: path.timeDemand,
    },
  });
  const work = n.history.workRelationships.at(-1)!;
  n = createWorkCompensation(n, {
    stableKey: key(n, "terms"),
    workRelationshipId: work.id,
    startsAt: work.startedAt,
    initialStatus: "expected",
    amount: money(path.sessionPayMinor, "USD"),
    cadenceKind: "work:completed-shift",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: authored,
  });
  n = event(
    n,
    "offer",
    [a, org.id, work.id],
    `${path.organizationName} offers ${path.title}: $${(path.sessionPayMinor / 100).toFixed(2)} for each completed ${path.sessionMinutes}-minute shift, paid the following day. Terms are game-authored. Source task context: O*NET ${p.sourceVersion}, ${p.occupationCode}.`,
  );
  return result(
    n,
    true,
    "The employer has issued an offer. Review its terms before accepting.",
  );
}
function owned(w: World, id: EntityId, p: CareerProvider) {
  return w.history.workRelationships.find(
    (r) =>
      r.id === id &&
      r.stableKey.startsWith(`career-path7:${p.id}:`) &&
      r.personId === actor(w) &&
      pathForRelationship(w, id)?.id === p.pathId &&
      w.history.events.some(
        (e) =>
          e.type === "career-path7.offer" && e.involvedEntityIds.includes(id),
      ),
  );
}
export function respondCareerOffer(
  w: World,
  id: EntityId,
  p: CareerProvider,
  accept: boolean,
): LifePathResult {
  const r = owned(w, id, p);
  if (!r || workStatusAt(w, id)?.status !== "expected")
    return result(w, false, "This offer is no longer available to you.");
  if (accept) {
    const reason = careerEligibility(w, p);
    if (reason) return result(w, false, reason);
  }
  if (
    w.history.events.some(
      (e) =>
        e.type === "career-path7.accepted" && e.involvedEntityIds.includes(id),
    )
  )
    return result(w, false, "You have already accepted these terms.");
  if (accept)
    return result(
      event(
        w,
        "accepted",
        [r.personId, id],
        "You accepted the employer terms. Work begins on " + r.startedAt + ".",
      ),
      true,
      "Accepted. Begin work on or after " + r.startedAt + ".",
    );
  const prev = workStatusAt(w, id)!;
  const n = recordWorkStatus(w, {
    stableKey: key(w, "refused"),
    workRelationshipId: id,
    effectiveAt: w.currentDate,
    status: "ended",
    reason: "Declined offered terms.",
    provenance: authored,
    supersedesStatusId: prev.id,
  });
  return result(
    event(n, "refused", [r.personId, id], "You declined the offered work."),
    true,
    "You declined. Other opportunities remain available.",
  );
}
export function startCareerWork(
  w: World,
  id: EntityId,
  p: CareerProvider,
): LifePathResult {
  const r = owned(w, id, p);
  if (
    !r ||
    workStatusAt(w, id)?.status !== "expected" ||
    r.startedAt > w.currentDate ||
    !w.history.events.some(
      (e) =>
        e.type === "career-path7.accepted" && e.involvedEntityIds.includes(id),
    )
  )
    return result(w, false, "Accept the offer and wait until its start date.");
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const prev = workStatusAt(w, id)!;
  let n = recordWorkStatus(w, {
    stableKey: key(w, "started"),
    workRelationshipId: id,
    effectiveAt: w.currentDate,
    status: "active",
    reason: "Began accepted work.",
    provenance: authored,
    supersedesStatusId: prev.id,
  });
  const flow = n.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === id,
  )!;
  const terms = resourceFlowTermsAt(n, flow.id)!;
  n = recordResourceFlowTerms(n, {
    stableKey: key(n, "active-terms"),
    resourceFlowId: flow.id,
    effectiveAt: n.currentDate,
    status: "active",
    amount: terms.amount,
    cadenceKind: terms.cadenceKind,
    reason: "Accepted employment began.",
    provenance: authored,
    supersedesTermsId: terms.id,
  });
  return result(n, true, "You began the accepted work.");
}

export function scheduleCareerTask(
  w: World,
  id: EntityId,
  p: CareerProvider,
  taskId: string,
): LifePathResult {
  const r = owned(w, id, p),
    task = p.tasks.find((t) => t.id === taskId);
  if (!r || !task || workStatusAt(w, id)?.status !== "active")
    return result(
      w,
      false,
      "This responsibility is not available in your active role.",
    );
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const scheduled = scheduleLifePathSession(w, id);
  if (!scheduled.ok) return scheduled;
  const activity = scheduled.world.history.scheduledActivities.at(-1)!;
  return result(
    event(
      scheduled.world,
      "task-planned",
      [r.personId, id, activity.id],
      `O*NET ${p.sourceVersion} task ${task.id}: ${task.text}`,
    ),
    true,
    "The responsibility is scheduled within your next shift.",
  );
}
export function completeCareerTask(
  w: World,
  id: EntityId,
  p: CareerProvider,
  activityId: EntityId,
  deliverable: string,
  handlers: FutureTransitionHandlerRegistry = LIFE_PATHS2_HANDLERS,
): LifePathResult {
  const r = owned(w, id, p);
  const planned = w.history.events.find(
    (e) =>
      e.type === "career-path7.task-planned" &&
      e.involvedEntityIds.includes(id) &&
      e.involvedEntityIds.includes(activityId),
  );
  if (
    !r ||
    !planned ||
    deliverable.trim().length < 10 ||
    deliverable.length > 2000
  )
    return result(
      w,
      false,
      "Describe the work you are submitting (10–2,000 characters).",
    );
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const performed = performLifePathSession(w, activityId, handlers);
  if (!performed.ok) return performed;
  let n = event(
    performed.world,
    "deliverable",
    [r.personId, id, activityId],
    deliverable.trim(),
  );
  n = event(
    n,
    "work-record",
    [r.personId, id, activityId],
    `Your completed responsibility and submission are retained in your work record. ${planned.summary}`,
  );
  return result(
    n,
    true,
    "Your work and submission are recorded. The completed shift is payable on the following day.",
  );
}
export function acceptCareerResponsibilities(
  w: World,
  id: EntityId,
  p: CareerProvider,
): LifePathResult {
  const r = owned(w, id, p);
  const work = w.history.events.filter(
    (e) =>
      e.type === "career-path7.work-record" && e.involvedEntityIds.includes(id),
  );
  if (
    !r ||
    workStatusAt(w, id)?.status !== "active" ||
    work.length < 2 ||
    w.history.events.some(
      (e) =>
        e.type === "career-path7.responsibilities" &&
        e.involvedEntityIds.includes(id),
    )
  )
    return result(
      w,
      false,
      "An expanded responsibility agreement requires two recorded shifts in this engagement.",
    );
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const previous = workRoleAt(w, id)!;
  const n = recordWorkRole(w, {
    stableKey: key(w, "responsibilities"),
    workRelationshipId: id,
    effectiveAt: w.currentDate,
    title: `${lifePathDefinition(p.pathId).title} — assignment coordination`,
    occupationClassification: previous.occupationClassification,
    locationJurisdictionId: previous.locationJurisdictionId,
    timeDemand: previous.timeDemand,
    provenance: authored,
    supersedesRoleId: previous.id,
  });
  return result(
    event(
      n,
      "responsibilities",
      [r.personId, id],
      "You accepted responsibility for organizing your assignment handoffs. Your earlier work remains the basis for this agreement; no professional credential is granted.",
    ),
    true,
    "Your role now includes organizing assignment handoffs.",
  );
}
export function resignCareer(
  w: World,
  id: EntityId,
  p: CareerProvider,
): LifePathResult {
  if (!owned(w, id, p)) return result(w, false, "This is not your engagement.");
  return changeLifePathStatus(w, id, "leave");
}
