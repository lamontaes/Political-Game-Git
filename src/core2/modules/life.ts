import { makeIsoDate, daysBetweenText } from "../kernel/dates";
import { addDays } from "../kernel/dates";
import { ENCOUNTERS, meetAtJoin, meetAtVisit } from "../encounters";
import { plannedWorkMinutesOnDate } from "./work";
import { closenessBetween } from "../closeness";
import { VIEWS_MODULE_ID, stancesOf } from "./views";
import { appraiseEvent, affectAt } from "../emotion";
import { parameterValues } from "../parameters";
import type {
  ActOffer,
  ActionDefinition,
  CoreAPI,
  CoreEventInput,
  CoreModule,
  PersonState,
} from "../types";

const p = (api: CoreAPI, key: string) => api.parameter(key);
const zero = (api: CoreAPI) => p(api, "zero");
const positive = (api: CoreAPI, value: number) => Math.max(zero(api), value);

/** Shared offer builder; P15 people offers reuse it so drive selection stays identical. */
export function offer(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  action: ActionDefinition,
  targetId: string,
): ActOffer {
  let drive: string | undefined;
  for (const goal of actor.goals.values()) {
    const candidate = goal.sourceDriveId
      ? actor.drives.get(goal.sourceDriveId)
      : undefined;
    if (!candidate || !action.goalKinds.includes(goal.kind)) continue;
    const prior = drive ? actor.drives.get(drive) : undefined;
    if (
      !prior ||
      candidate.strength > prior.strength ||
      (candidate.strength === prior.strength && candidate.id < prior.id)
    )
      drive = candidate.id;
  }
  return {
    definition: action,
    targetId,
    driveId: drive,
    availableHours: p(api, "hoursPerDay"),
  };
}

function knownPublicTargets(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  action: ActionDefinition,
): readonly ActOffer[] {
  const out: ActOffer[] = [];
  for (const placeId of new Set([
    actor.placeId,
    ...(actor.countyId ? [actor.countyId] : []),
  ]))
    for (const id of api.state.publicOrganizationsByPlace.get(placeId) ?? []) {
      const row = api.state.publicOrganizations.get(id)!;
      if (
        row.affordances?.includes(action.targetKind) &&
        api.knows(actor.id, `organization:${id}:public`)
      )
        out.push(offer(api, actor, action, id));
    }
  return out;
}

function civicEvent(
  api: CoreAPI,
  actorId: string,
  chosen: ActOffer,
  kind: string,
): CoreEventInput {
  const actor = api.state.people.get(actorId)!;
  const drive = chosen.driveId ? actor.drives.get(chosen.driveId) : undefined;
  return {
    id: `${kind}:${api.state.date}:${actorId}:${chosen.targetId}`,
    date: api.state.date,
    kind,
    personIds: [actorId],
    placeId: actor.placeId,
    topic: drive?.topic,
    desiredChange: drive?.desiredChange,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation:
        "Prototype committed actor activity; this records the attempt, not institutional approval.",
    },
    facts: {
      organizationId: chosen.targetId,
      ...(drive ? { sourceEventId: drive.sourceEventId } : {}),
    },
  };
}

const eventConditions: Readonly<
  Record<string, (api: CoreAPI, value: unknown) => boolean>
> = {
  positive: (api, value) => typeof value === "number" && value > zero(api),
  negative: (api, value) => typeof value === "number" && value < zero(api),
  present: (_api, value) =>
    value !== undefined && value !== null && value !== "",
};

/** Available acts and consequences are registered operations; content identities remain data. */
/** P15: closeness today, faded since the last contact; zero for strangers. */
function relationAt(api: CoreAPI, a: string, b: string): number {
  return closenessBetween(api.state, a, b);
}

/**
 * The closest the person is to anyone the event names. A vote names a whole
 * chamber, so whichever list is shorter is walked: the person's own ties or
 * the names. Strangers count zero either way.
 */
function closestTo(
  api: CoreAPI,
  personId: string,
  subjects: readonly string[],
): number {
  let level = zero(api);
  const ties = api.state.relationshipsByPerson.get(personId);
  if (!ties || ties.size >= subjects.length) {
    for (const subject of subjects)
      level = Math.max(level, relationAt(api, personId, subject));
    return level;
  }
  const named = new Set(subjects);
  for (const id of ties) {
    const row = api.state.relationships.get(id);
    if (!row) continue;
    const other = row.actorId === personId ? row.otherId : row.actorId;
    if (named.has(other))
      level = Math.max(level, relationAt(api, personId, other));
  }
  return level;
}

/** What a resident knows the office answered about one cause. */
const replyKey = (officeId: string, topic: string) =>
  `office-reply:${officeId}:${topic}`;

/**
 * The office has answered this cause and nothing on it has reached the person
 * since: no event has moved their stance on the topic after the reply (the
 * views engine's dated causes). Going back needs something new to say.
 */
function answeredWithNothingNew(
  api: CoreAPI,
  personId: string,
  officeId: string,
  topic: string,
): boolean {
  const reply = api.knows(personId, replyKey(officeId, topic));
  if (!reply) return false;
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return true;
  return !stancesOf(api, personId).some(
    (stance) =>
      stance.topic === topic &&
      stance.causes.some((cause) => cause.date > reply.learnedAt),
  );
}

/**
 * The office answers a resident who came about a cause: the staff member
 * closest to them (by today's closeness, then by id) replies, the reply is an
 * event the story director and the journal read, and the approach gate reopens.
 * A resident who died meanwhile closes the callback unanswered; an office with
 * no one left on staff answers once someone is.
 */
function answerCallback(
  api: CoreAPI,
  callbackId: string,
  callback: CoreEventInput,
): void {
  const [residentId] = callback.personIds;
  const resident = residentId ? api.state.people.get(residentId) : undefined;
  if (!resident?.alive) {
    api.resolveCallback(callbackId);
    return;
  }
  const officeId = callback.facts?.organizationId;
  const office = officeId
    ? api.state.publicOrganizations.get(officeId)
    : undefined;
  const responder = (office?.staff ?? [])
    .filter((staff) => api.state.people.get(staff.personId)?.alive)
    .map((staff) => ({
      staff,
      closeness: closenessBetween(api.state, resident.id, staff.personId),
    }))
    .sort(
      (a, b) =>
        b.closeness - a.closeness ||
        a.staff.personId.localeCompare(b.staff.personId),
    )[0]?.staff;
  if (!office || !responder) return;
  api.emit({
    id: `office.replied:${api.state.date}:${resident.id}:${office.id}`,
    date: api.state.date,
    kind: "office.replied",
    personIds: [resident.id],
    witnessIds: [responder.personId],
    placeId: office.placeId,
    ...(callback.topic ? { topic: callback.topic } : {}),
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${office.name} answers ${callback.facts?.approachEventId ?? callbackId} within its response time.`,
      estimatedFrom: "officeReplyDays",
    },
    facts: {
      organizationId: office.id,
      office: office.name,
      responderId: responder.personId,
      responderTitle: responder.title,
      callbackId,
      ...(callback.facts?.approachEventId
        ? { approachEventId: callback.facts.approachEventId }
        : {}),
    },
  });
  if (callback.topic)
    api.observe(resident.id, {
      key: replyKey(office.id, callback.topic),
      value: responder.personId,
      learnedAt: api.state.date,
      sourceId: `office.replied:${api.state.date}:${resident.id}:${office.id}`,
      access: "told",
    });
  api.resolveCallback(callbackId);
}

export const LIFE_MODULE: CoreModule = {
  id: "core2-life-v2",
  eventKinds: ["*"],
  needEvaluators: {
    "resource-deficit": (api, actor, definition) => {
      const horizon = definition.parameters.horizon;
      if (!horizon) throw new Error("Resource need requires a tagged horizon.");
      const required = actor.livingCostDailyMinor * p(api, horizon);
      return required > zero(api)
        ? required / (required + actor.liquidMinor)
        : zero(api);
    },
    "time-load": (api, actor) => {
      const job = actor.jobId ? api.state.jobs.get(actor.jobId) : undefined;
      const commitments = new Set(
        [...(api.state.work.commitmentsByPerson.get(actor.id) ?? [])].filter(
          (id) => {
            const row = api.state.work.commitments.get(id)!;
            return (
              row.jobId === actor.jobId &&
              (row.endsAt === undefined || row.endsAt >= api.state.date)
            );
          },
        ),
      );
      const planned = commitments.size
        ? [...commitments].reduce(
            (sum, id) =>
              sum +
              plannedWorkMinutesOnDate(
                api,
                api.state.work.commitments.get(id)!,
              ),
            zero(api),
          ) / p(api, "minutesPerHour")
        : (job?.hoursDaily ?? zero(api));
      return (
        positive(api, actor.affect.stress) + planned / p(api, "hoursPerDay")
      );
    },
    "affect-load": (api, actor) =>
      positive(api, actor.affect.stress - actor.affect.mood) / p(api, "two"),
    "contact-gap": (api, actor, definition) => {
      api.stopgap("SG-P8-household-shared-time-contact");
      const horizon = definition.parameters.horizon;
      if (!horizon) throw new Error("Company need requires a tagged horizon.");
      const elapsed = daysBetweenText(actor.lastContactDate, api.state.date);
      return Math.min(p(api, "one"), positive(api, elapsed / p(api, horizon)));
    },
    "stress-pressure": (api, actor) => positive(api, actor.affect.stress),
  },
  offerProviders: {
    job: (api, actor, action) => {
      const job = actor.jobId ? api.state.jobs.get(actor.jobId) : undefined;
      if (!job || job.personId !== actor.id || job.hoursDaily <= zero(api))
        return [];
      return [offer(api, actor, action, job.id)];
    },
    self: (api, actor, action) => [offer(api, actor, action, actor.id)],
    "known-person": (api, actor, action) => {
      api.stopgap("SG-P8-school-acquaintance-contact-frequency");
      return [...actor.knownIds]
        .filter((id) => api.state.people.get(id)?.alive)
        .map((id) => offer(api, actor, action, id));
    },
    family: (api, actor, action) =>
      [...actor.familyIds]
        .filter((id) => api.state.people.get(id)?.alive)
        .map((id) => offer(api, actor, action, id)),
    "known-group": knownPublicTargets,
    "public-meeting-place": knownPublicTargets,
    "known-office": (api, actor, action) =>
      knownPublicTargets(api, actor, action).filter(
        (chosen) =>
          (api.state.publicOrganizations.get(chosen.targetId)?.staff?.length ??
            zero(api)) > zero(api),
      ),
    "public-directory": (api, actor, action) => {
      api.stopgap("SG-P8-directory-company-substitution");
      const out: ActOffer[] = [];
      for (const placeId of new Set([
        actor.placeId,
        ...(actor.countyId ? [actor.countyId] : []),
      ]))
        for (const id of api.state.publicOrganizationsByPlace.get(placeId) ??
          [])
          if (!api.knows(actor.id, `organization:${id}:public`))
            out.push(offer(api, actor, action, id));
      return out;
    },
  },
  eligibilityRules: {
    "not-member": (api, actor, chosen) =>
      !api.state.memberships.has(`${actor.id}:${chosen.targetId}`),
    "has-drive": (_api, actor, chosen) =>
      chosen.driveId !== undefined && actor.drives.has(chosen.driveId),
    "not-organized-topic": (api, actor, chosen) => {
      const drive = chosen.driveId
        ? actor.drives.get(chosen.driveId)
        : undefined;
      return (
        !!drive &&
        !api.state.organizedTopicsByPerson.get(actor.id)?.has(drive.topic)
      );
    },
    "has-organized-topic": (api, actor, chosen) => {
      const drive = chosen.driveId
        ? actor.drives.get(chosen.driveId)
        : undefined;
      return (
        !!drive &&
        api.state.organizedTopicsByPerson.get(actor.id)?.has(drive.topic) ===
          true &&
        !api.state.pendingCallbacks.has(
          `callback:${actor.id}:${chosen.targetId}:${drive.id}`,
        ) &&
        !answeredWithNothingNew(api, actor.id, chosen.targetId, drive.topic)
      );
    },
  },
  effectHandlers: {
    "paid-work": (api, actorId, chosen, date, days, decision) => {
      const result = api.settleLegacyWorkResult({
        personId: actorId,
        offer: chosen,
        date,
        days,
        decision,
      });
      return {
        recordedActId: result.sourceActId,
        recordedActivity: true,
        recordedLastActDate: true,
      };
    },
    recover: (api, actorId, chosen) => {
      const actor = api.state.people.get(actorId)!;
      const affect = affectAt(
        actor.affect,
        api.state.date,
        parameterValues(api.state.data.parameters),
      );
      affect.stress *= Math.exp(-p(api, chosen.definition.effectParameter));
      api.updatePerson(actorId, { affect });
    },
    contact: (api, actorId, chosen, _date, _days, decision) => {
      // P15: the visit's hours are time together, saved with their reason.
      const hours =
        chosen.effortHours ?? p(api, chosen.definition.effortParameter);
      api.relationship(actorId, chosen.targetId, "contact", hours, decision, {
        cause: ENCOUNTERS.causes.visit,
        sourceId: `visit:${api.state.date}:${actorId}:${chosen.targetId}`,
      });
      api.updatePerson(actorId, { lastContactDate: api.state.date });
      api.updatePerson(chosen.targetId, { lastContactDate: api.state.date });
      // P15 part 5: the visitor meets the people who live with the host.
      meetAtVisit(api, actorId, chosen.targetId, hours);
    },
    care: (api, actorId, chosen, _date, _days, decision) => {
      api.relationship(
        actorId,
        chosen.targetId,
        "family",
        chosen.effortHours ?? p(api, chosen.definition.effortParameter),
        decision,
        { cause: ENCOUNTERS.causes.care },
      );
      const actor = api.state.people.get(actorId)!;
      api.updatePerson(actorId, {
        affect: {
          ...actor.affect,
          stress:
            actor.affect.stress *
            Math.exp(-p(api, chosen.definition.effectParameter)),
        },
      });
    },
    "public-lookup": (api, actorId, chosen) =>
      api.lookupPublicOrganization(actorId, chosen.targetId),
    join: (api, actorId, chosen) => {
      const event = civicEvent(api, actorId, chosen, "association.requested");
      api.join(actorId, chosen.targetId, chosen.driveId);
      api.emit(event);
      // P15 part 5: joining a group meets its other members.
      meetAtJoin(
        api,
        actorId,
        chosen.targetId,
        chosen.effortHours ?? p(api, chosen.definition.effortParameter),
      );
    },
    organize: (api, actorId, chosen) => {
      api.stopgap("SG-P8-grief-action-response");
      const actor = api.state.people.get(actorId)!;
      const drive = chosen.driveId
        ? actor.drives.get(chosen.driveId)
        : undefined;
      if (!drive) throw new Error("Organizing requires a recorded cause.");
      api.markOrganized(actorId, drive.topic);
      api.emit(
        civicEvent(api, actorId, chosen, "initiative.organizing-started"),
      );
    },
    approach: (api, actorId, chosen) => {
      const actor = api.state.people.get(actorId)!;
      const drive = chosen.driveId
        ? actor.drives.get(chosen.driveId)
        : undefined;
      if (!drive) throw new Error("An approach requires a recorded cause.");
      const row = api.state.publicOrganizations.get(chosen.targetId);
      if (!row?.staff?.length)
        throw new Error(
          "An official approach requires a recorded staff member.",
        );
      const event = civicEvent(api, actorId, chosen, "office.approached");
      event.witnessIds = row.staff.map((staff) => staff.personId);
      api.emit(event);
      // The office answers within its response time (stress audit defect 1).
      api.requestCallback({
        ...event,
        id: `callback:${actorId}:${chosen.targetId}:${drive.id}`,
        date: addDays(makeIsoDate(api.state.date), p(api, "officeReplyDays")),
        facts: { ...event.facts, approachEventId: event.id },
      });
    },
  },
  onDay(api) {
    for (const [id, callback] of api.state.pendingCallbacks)
      if (callback.date <= api.state.date) answerCallback(api, id, callback);
    return undefined;
  },
  onEvent(api, event, learnedBy) {
    const params = parameterValues(api.state.data.parameters);
    api.stopgap("SG-P8-emotion-model");
    for (const id of learnedBy) {
      const actor = api.state.people.get(id)!;
      const relation = closestTo(api, id, event.personIds);
      const appraisal = appraiseEvent(
        actor,
        event,
        relation,
        params,
        api.state.data.appraisalTraits,
      );
      api.updatePerson(id, { affect: appraisal.affect });
      api.publishEventAppraisal(appraisal);
      for (const situation of api.state.data.situations) {
        if (
          !situation.requiredFields.every((field) =>
            eventConditions.present!(api, event[field as keyof CoreEventInput]),
          )
        )
          continue;
        if (
          !(situation.conditions ?? []).every((condition) => {
            const operation = eventConditions[condition.operation];
            if (!operation)
              throw new Error(
                `Unregistered situation condition: ${condition.operation}`,
              );
            return operation(
              api,
              event[condition.field as keyof CoreEventInput],
            );
          })
        )
          continue;
        if (!event.topic || !event.desiredChange)
          throw new Error("Cause requires explicit topic and desired change.");
        if (situation.stopgapId) api.stopgap(situation.stopgapId);
        const strength =
          Math.abs(appraisal.moodImpulse) +
          positive(api, appraisal.stressImpulse);
        const driveId = `${situation.driveKind}:${event.topic}:${event.id}`;
        api.updateDrive(id, {
          id: driveId,
          kind: situation.driveKind,
          sourceEventId: event.id,
          topic: event.topic,
          desiredChange: event.desiredChange,
          strength,
        });
        api.updateGoal(id, {
          id: `drive:${driveId}`,
          kind: situation.goalKind,
          urgency: strength,
          sourceDriveId: driveId,
        });
      }
    }
  },
};
