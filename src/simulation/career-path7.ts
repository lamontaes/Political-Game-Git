import { addDays } from "./dates";
/** Career content composes LIFE's canonical work, calendar and earned-pay writers. */
import type {
  EntityId,
  IsoDate,
  World,
  FutureTransitionHandlerRegistry,
} from "./types";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
  recordWorkRole,
} from "./life";
import {
  organizationProfileAt,
  workStatusAt,
  workRoleAt,
} from "./life-queries";
import {
  createWorkCompensation,
  recordResourceFlowTerms,
  money,
} from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { recordWorldEvent } from "./world";
import { SeededRng } from "./rng";
import {
  JOB_MARKET_PLACEHOLDER,
  JOB_TIMING,
  leaveFirstJobFor,
  spoken,
} from "./job-market";
import { employerName, lifePathDefinition } from "./life-paths2-catalog";
import {
  lifePathEntryReason,
  pathForRelationship,
  scheduleLifePathSession,
  performLifePathSession,
  performLifePathWork,
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
  const clash = overlappingWork(w, a, path);
  if (clash) return clash;
  return lifePathEntryReason(w, a, path);
}

function clock(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  const minutes = minute % 60;
  const suffix = hour < 12 ? "a.m." : "p.m.";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return minutes === 0
    ? `${twelve} ${suffix}`
    : `${twelve}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

/**
 * A second job whose daily shift overlaps one already held or agreed to.
 * Both cannot be worked, and the routine would only ever work one of them,
 * so a Casper life held a repair job for three years that almost never paid.
 */
function overlappingWork(
  w: World,
  personId: EntityId,
  path: ReturnType<typeof lifePathDefinition>,
): string | null {
  const start = path.sessionStartMinute;
  const end = start + path.sessionMinutes;
  for (const work of w.history.workRelationships) {
    if (work.personId !== personId) continue;
    const held = pathForRelationship(w, work.id);
    if (!held || held.id === path.id) continue;
    if (held.kind !== "work" || held.scope !== "personal") continue;
    const status = workStatusAt(w, work.id)?.status;
    if (
      status !== "active" &&
      !(status === "expected" && careerOfferAccepted(w, work.id))
    )
      continue;
    const heldStart = held.sessionStartMinute;
    const heldEnd = heldStart + held.sessionMinutes;
    if (start < heldEnd && heldStart < end)
      return `This job's ${clock(start)} to ${clock(end)} shift overlaps the ${clock(heldStart)} to ${clock(heldEnd)} shift you work as ${held.title.toLowerCase()}.`;
  }
  return null;
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
        name: employerName(path),
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
    `${employerName(path)} offers ${path.title}: $${(path.sessionPayMinor / 100).toFixed(2)} for each completed ${path.sessionMinutes}-minute shift, paid the following day.`,
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
/**
 * Whether the character has accepted this offer's terms.
 *
 * Accepting records an event and leaves the work status at `expected` until
 * the character begins on or after the start date, so the status alone cannot
 * tell an accepted offer from an unanswered one. Everything that asks "is this
 * offer still waiting for an answer?" reads this instead.
 */
export function careerOfferAccepted(w: World, id: EntityId): boolean {
  return w.history.events.some(
    (e) =>
      e.type === "career-path7.accepted" && e.involvedEntityIds.includes(id),
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
  if (careerOfferAccepted(w, id))
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
    !careerOfferAccepted(w, id)
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
  n = leaveFirstJobFor(n, r.personId, workRoleAt(n, id)?.title ?? "new work");
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
      `Planned for your next shift: ${task.text}`,
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
  deliverable = "",
  handlers: FutureTransitionHandlerRegistry = LIFE_PATHS2_HANDLERS,
): LifePathResult {
  const r = owned(w, id, p);
  const planned = w.history.events.find(
    (e) =>
      e.type === "career-path7.task-planned" &&
      e.involvedEntityIds.includes(id) &&
      e.involvedEntityIds.includes(activityId),
  );
  const text = deliverable.trim();
  if (text.length > 0 && (text.length < 10 || deliverable.length > 2000))
    return result(
      w,
      false,
      "A written submission, if offered, must be 10–2,000 characters.",
    );
  if (!r || !planned)
    return result(w, false, "This responsibility is not scheduled for you.");
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const performed = performLifePathSession(w, activityId, handlers);
  if (!performed.ok) return performed;
  let n = performed.world;
  if (text.length > 0)
    n = event(n, "deliverable", [r.personId, id, activityId], text);
  n = event(
    n,
    "work-record",
    [r.personId, id, activityId],
    text.length > 0
      ? `Your completed responsibility and submission are retained in your work record. ${planned.summary}`
      : `Completed shift recorded. No written submission was required. ${planned.summary}`,
  );
  return result(
    n,
    true,
    "Your work is recorded. The completed shift is payable on the following day.",
  );
}

export function performCareerWork(
  w: World,
  id: EntityId,
  p: CareerProvider,
  handlers: FutureTransitionHandlerRegistry = LIFE_PATHS2_HANDLERS,
): LifePathResult {
  const r = owned(w, id, p);
  if (!r || workStatusAt(w, id)?.status !== "active")
    return result(w, false, "This work is not active for you.");
  const reason = careerEligibility(w, p);
  if (reason) return result(w, false, reason);
  const performed = performLifePathWork(w, id, handlers);
  if (!performed.ok) return performed;
  const activity = performed.world.history.scheduledActivities.find(
    (a) =>
      a.sourceEntityIds.includes(id) &&
      performed.world.history.events.some(
        (e) =>
          e.type === "life-paths2.work-session" &&
          e.involvedEntityIds.includes(a.id) &&
          e.involvedEntityIds.includes(id),
      ),
  );
  const n = event(
    performed.world,
    "work-record",
    [r.personId, id, ...(activity ? [activity.id] : [])],
    "Completed shift recorded. No written submission was required.",
  );
  return result(
    n,
    true,
    "Your work is recorded. The completed shift is payable on the following day.",
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
      e.type === "life-paths2.work-session" && e.involvedEntityIds.includes(id),
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

/** When an accepted offer's employer last expected the person to begin. */
function expectedStartOf(w: World, id: EntityId, startedAt: IsoDate): IsoDate {
  const followUps = w.history.events.filter(
    (e) =>
      e.type === "career-path7.followed-up" && e.involvedEntityIds.includes(id),
  );
  const latest = followUps.at(-1);
  return (
    (latest?.tags.find((tag) => tag.startsWith("start:"))?.slice(6) as
      IsoDate | undefined) ?? startedAt
  );
}

/** The date an older offer was answered by, drawn once from its own id. */
function replyByOf(w: World, id: EntityId, offeredOn: IsoDate): IsoDate {
  const rng = new SeededRng(`${w.seed}:career-reply:${id}`);
  const { minimum, maximum } = JOB_TIMING.offerReplyDays;
  return addDays(
    offeredOn,
    minimum + Math.floor(rng.next() * (maximum - minimum + 1)),
  );
}

function endOffer(
  w: World,
  id: EntityId,
  personId: EntityId,
  reason: string,
  type: string,
  summary: string,
): World {
  const prev = workStatusAt(w, id)!;
  const n = recordWorkStatus(w, {
    stableKey: key(w, type),
    workRelationshipId: id,
    effectiveAt: w.currentDate,
    status: "ended",
    reason,
    provenance: authored,
    supersedesStatusId: prev.id,
  });
  return event(n, type, [personId, id], summary);
}

/**
 * What an employer on the older work list does as days pass, by the rule the
 * owner set for every job (9/22, answer five): an offer nobody answers lapses
 * after its reply window, and an accepted job nobody begins gets one call
 * with a new start date, or is withdrawn. Before this, an accepted shop job
 * in San Antonio waited three years for someone to press Begin.
 */
export function settleCareerOffers(w: World, personId: EntityId): World {
  let n = w;
  const grace = JOB_MARKET_PLACEHOLDER.missedStartGraceDays;
  for (const r of w.history.workRelationships) {
    if (r.personId !== personId || !r.stableKey.startsWith("career-path7:"))
      continue;
    if (workStatusAt(n, r.id)?.status !== "expected") continue;
    if (
      !n.history.events.some(
        (e) =>
          e.type === "career-path7.offer" && e.involvedEntityIds.includes(r.id),
      )
    )
      continue;
    const employer =
      (r.organizationId && organizationProfileAt(n, r.organizationId)?.name) ||
      "The employer";
    const title = workRoleAt(n, r.id)?.title ?? "the job";
    if (!careerOfferAccepted(n, r.id)) {
      const replyBy = replyByOf(n, r.id, addDays(r.startedAt, -1));
      if (n.currentDate > replyBy)
        n = endOffer(
          n,
          r.id,
          personId,
          "The offer lapsed unanswered.",
          "offer-lapsed",
          `The offer of work as ${title.toLowerCase()} lapsed: you did not answer by ${spoken(replyBy)}.`,
        );
      continue;
    }
    const due = expectedStartOf(n, r.id, r.startedAt);
    if (n.currentDate <= addDays(due, grace)) continue;
    const calledAlready = n.history.events.some(
      (e) =>
        e.type === "career-path7.followed-up" &&
        e.involvedEntityIds.includes(r.id),
    );
    const rng = new SeededRng(`${n.seed}:career-missed-start:${r.id}`);
    if (!calledAlready && rng.next() < JOB_MARKET_PLACEHOLDER.followUpChance) {
      const { minimum, maximum } = JOB_MARKET_PLACEHOLDER.followUpStartDays;
      const startAt = addDays(
        n.currentDate,
        minimum + Math.floor(rng.next() * (maximum - minimum + 1)),
      );
      const summary = `${employer} called when you did not come in to start as ${title.toLowerCase()}. They still want you, starting ${spoken(startAt)}.`;
      n = recordWorldEvent(n, {
        stableKey: key(n, "followed-up"),
        type: "career-path7.followed-up",
        occurredAt: n.currentDate,
        recordedAt: n.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [personId, r.id],
        participants: [
          { personId, role: "agency:participant", detail: summary },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: ["career-path7", `start:${startAt}`],
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
      continue;
    }
    n = endOffer(
      n,
      r.id,
      personId,
      "The employer withdrew the offer after a missed start.",
      "withdrawn",
      `${employer} withdrew the offer of work as ${title.toLowerCase()} after you did not come in to start.`,
    );
  }
  return n;
}

/** The start date an accepted older offer is waiting on now. */
export function careerExpectedStart(w: World, id: EntityId): IsoDate | null {
  const r = w.history.workRelationships.find((row) => row.id === id);
  return r ? expectedStartOf(w, id, r.startedAt) : null;
}
