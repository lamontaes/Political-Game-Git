import { daysBetween, makeIsoDate } from "../../simulation/dates";
import { plannedWorkMinutesOnDate } from "./work";
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

function offer(
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
      const elapsed = daysBetween(
        makeIsoDate(actor.lastContactDate),
        makeIsoDate(api.state.date),
      );
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
        )
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
    contact: (api, actorId, chosen) => {
      api.relationship(
        actorId,
        chosen.targetId,
        "contact",
        p(api, "relationContactGain"),
      );
      api.updatePerson(actorId, { lastContactDate: api.state.date });
      api.updatePerson(chosen.targetId, { lastContactDate: api.state.date });
    },
    care: (api, actorId, chosen) => {
      api.relationship(
        actorId,
        chosen.targetId,
        "family",
        p(api, "relationContactGain"),
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
      api.requestCallback({
        ...event,
        id: `callback:${actorId}:${chosen.targetId}:${drive.id}`,
      });
    },
  },
  onEvent(api, event, learnedBy) {
    const params = parameterValues(api.state.data.parameters);
    api.stopgap("SG-P8-emotion-model");
    for (const id of learnedBy) {
      const actor = api.state.people.get(id)!;
      const relation = event.personIds.reduce(
        (level, subject) =>
          Math.max(
            level,
            api.state.relationships.get([id, subject].sort().join(":"))
              ?.level ?? zero(api),
          ),
        zero(api),
      );
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
