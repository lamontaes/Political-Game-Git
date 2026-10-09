import drivesJson from "../data/drives.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../../simulation/dates";
import { chooseAct } from "../choice";
import { extendData } from "../data";
import { appraiseEvent } from "../emotion";
import { parameter, parameterValues } from "../parameters";
import { discretionaryHours } from "./work";
import type {
  ActOffer,
  ActionDefinition,
  CoreAPI,
  CoreData,
  CoreEventInput,
  CoreModule,
  CoreState,
  DecisionContext,
  DecisionReason,
  Drive,
  IsoDate,
  PersonId,
  PersonState,
} from "../types";

/**
 * P10 drives and causes. A salient event reaches a person; perception weighs
 * it by their role, closeness and traits; the shared chooser decides among
 * response rows whether a drive forms, which kind and how strongly; the drive
 * then fades over time, strengthens when acted on, and adds utility to act
 * rows through goals. Every kind, response, role, channel and act is a data
 * row in data/drives.json; this file registers operations only.
 */
export interface DriveKindRow {
  id: string;
  goalKind: string;
  halfLifeParameter: string;
  shareable: boolean;
}

export interface ResponseRow extends ActionDefinition {
  driveKind?: string;
  requires: readonly string[];
  fitParameter: string;
}

export interface DrivesData {
  version: string;
  stopgapId: string;
  causeGroupKind: string;
  replacedSituationIds: readonly string[];
  eventKinds: Readonly<Record<EventKindKey, string>>;
  civicActEvents: readonly { eventKind: string; actionId: string }[];
  factKeys: Readonly<Record<FactKey, string>>;
  driveKinds: readonly DriveKindRow[];
  responses: readonly ResponseRow[];
  roles: readonly { id: string; operation: string; weightParameter: string }[];
  perception: {
    stopgapId: string;
    traitWeightParameter: string;
    closenessWeightParameter: string;
    channels: readonly {
      id: string;
      traits: readonly { traitId: string; direction: string }[];
    }[];
  };
  eventRules: readonly {
    id: string;
    eventKind: string;
    roles: readonly string[];
    channels: readonly string[];
    responses: readonly string[];
  }[];
  actions: readonly ActionDefinition[];
  gaps: readonly string[];
}

type EventKindKey =
  | "formed"
  | "shared"
  | "confronted"
  | "founded"
  | "joined"
  | "donated"
  | "volunteered"
  | "soughtStanding";
type FactKey =
  | "responsible"
  | "drive"
  | "origin"
  | "condition"
  | "driveKind"
  | "sourceEvent"
  | "organization"
  | "sourceEventLegacy";

export const DEFAULT_DRIVES_DATA = drivesJson as unknown as DrivesData;

export interface ScoredResponse {
  responseId: string;
  score: number;
  reasons: DecisionReason;
}

/** Why a drive formed (or was reinforced): every factor the decision read. */
export interface FormationTrace {
  date: IsoDate;
  personId: PersonId;
  eventId: string;
  eventKind: string;
  ruleId: string;
  role: string;
  roleWeight: number;
  closeness: number;
  channelGain: number;
  traitTerms: readonly { traitId: string; channel: string; term: number }[];
  attention: number;
  magnitude: number;
  pressure: number;
  considered: readonly {
    responseId: string;
    fit: number;
    lean: number;
    urgency: number;
  }[];
  chosen: ScoredResponse;
  runnerUp?: ScoredResponse;
  driveId?: string;
  strengthAdded: number;
}

export interface DriveActTrace {
  date: IsoDate;
  actionId: string;
  targetId: string;
  score: number;
  reasons: DecisionReason;
  strengthBefore: number;
}

export interface HeldDrive {
  id: string;
  personId: PersonId;
  kind: string;
  goalKind: string;
  topic: string;
  desiredChange: string;
  targetId?: PersonId;
  sourceEventId: string;
  formedAt: IsoDate;
  anchorDate: IsoDate;
  anchorStrength: number;
  halfLifeDays: number;
  shareable: boolean;
  formations: FormationTrace[];
  acts: DriveActTrace[];
  told: Set<PersonId>;
}

interface DrivesRuntime {
  drives: Map<string, HeldDrive>;
  byPerson: Map<PersonId, Map<string, HeldDrive>>;
  groupsByTopic: Map<string, Set<string>>;
  groupFounder: Map<string, PersonId>;
  formedByYearKind: Map<string, number>;
  responsesByRule: Map<string, number>;
  perceived: number;
  decisions: FormationTrace[];
}

const runtimes = new WeakMap<object, DrivesRuntime>();

function runtimeFor(state: Readonly<CoreState>): DrivesRuntime {
  let row = runtimes.get(state);
  if (!row) {
    const zero = parameter("zero", state.data.parameters);
    row = {
      drives: new Map(),
      byPerson: new Map(),
      groupsByTopic: new Map(),
      groupFounder: new Map(),
      formedByYearKind: new Map(),
      responsesByRule: new Map(),
      perceived: zero,
      decisions: [],
    };
    runtimes.set(state, row);
  }
  return row;
}

const core = (api: CoreAPI) => api.state as CoreState;

function bump(map: Map<string, number>, key: string, api: CoreAPI) {
  map.set(key, (map.get(key) ?? api.parameter("zero")) + api.parameter("one"));
}

/** Exponential fading from the last anchor; exact whatever the read cadence. */
export function currentStrength(
  api: CoreAPI,
  drive: Readonly<HeldDrive>,
  date: IsoDate = api.state.date,
): number {
  const elapsed = daysBetween(makeIsoDate(drive.anchorDate), makeIsoDate(date));
  return (
    drive.anchorStrength *
    Math.pow(api.parameter("two"), -elapsed / drive.halfLifeDays)
  );
}

function writeDrive(api: CoreAPI, drive: HeldDrive, strength: number) {
  const row: Drive = {
    id: drive.id,
    kind: drive.kind,
    sourceEventId: drive.sourceEventId,
    topic: drive.topic,
    desiredChange: drive.desiredChange,
    strength,
  };
  api.updateDrive(drive.personId, row);
  api.updateGoal(drive.personId, {
    id: `drive:${drive.id}`,
    kind: drive.goalKind,
    urgency: strength,
    sourceDriveId: drive.id,
    ...(drive.targetId ? { targetId: drive.targetId } : {}),
  });
}

function reinforce(api: CoreAPI, drive: HeldDrive, added: number) {
  drive.anchorStrength = currentStrength(api, drive) + added;
  drive.anchorDate = api.state.date;
  writeDrive(api, drive, drive.anchorStrength);
}

function normalizedTrait(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  id: string,
) {
  const raw = actor.traits[id];
  if (raw === undefined) return api.parameter("zero");
  return Math.max(
    api.parameter("negativeOne"),
    Math.min(api.parameter("one"), raw / api.parameter("traitScale")),
  );
}

function closenessTo(
  api: CoreAPI,
  actorId: PersonId,
  subjects: readonly PersonId[],
): number {
  let best = api.parameter("zero");
  for (const subject of subjects) {
    const level =
      api.state.relationships.get([actorId, subject].sort().join(":"))?.level ??
      api.parameter("zero");
    best = Math.max(best, level);
  }
  return best;
}

type RoleTest = (
  api: CoreAPI,
  actor: Readonly<PersonState>,
  event: CoreEventInput,
) => boolean;

const roleOperations: Readonly<Record<string, RoleTest>> = {
  "event-subject": (_api, actor, event) => event.personIds.includes(actor.id),
  "family-of-subject": (api, actor, event) =>
    event.personIds.some(
      (id) =>
        actor.familyIds.has(id) ||
        api.state.people.get(id)?.familyIds.has(actor.id) === true,
    ),
  "household-of-subject": (api, actor, event) =>
    event.personIds.some(
      (id) =>
        id !== actor.id &&
        api.state.people.get(id)?.householdId === actor.householdId,
    ),
  "known-to-subject": (api, actor, event) =>
    event.personIds.some(
      (id) =>
        actor.knownIds.has(id) ||
        api.state.people.get(id)?.knownIds.has(actor.id) === true,
    ),
  "event-witness": (_api, actor, event) =>
    (event.witnessIds ?? []).includes(actor.id),
};

type RequirementTest = (
  api: CoreAPI,
  data: DrivesData,
  actor: Readonly<PersonState>,
  event: CoreEventInput,
) => boolean;

function responsibleId(data: DrivesData, event: CoreEventInput) {
  return event.facts?.[`event:${event.id}:${data.factKeys.responsible}`];
}

const requirementOperations: Readonly<Record<string, RequirementTest>> = {
  "event-topic": (_api, _data, _actor, event) =>
    !!event.topic && !!event.desiredChange,
  "event-responsible": (api, data, actor, event) => {
    const id = responsibleId(data, event);
    return !!id && id !== actor.id && api.state.people.has(id);
  },
  "has-living-family": (api, _data, actor) =>
    [...actor.familyIds].some((id) => api.state.people.get(id)?.alive),
};

/** Trait-weighted perception: a filter on decision inputs, not a mind. */
export function perceive(
  api: CoreAPI,
  data: DrivesData,
  actor: Readonly<PersonState>,
  event: CoreEventInput,
  rule: DrivesData["eventRules"][number],
) {
  const p = (key: string) => api.parameter(key);
  const role = data.roles.find(
    (row) =>
      rule.roles.includes(row.id) &&
      (
        roleOperations[row.operation] ??
        (() => {
          throw new Error(`Unregistered perception role: ${row.operation}`);
        })
      )(api, actor, event),
  );
  if (!role) return undefined;
  api.stopgap(data.perception.stopgapId);
  const traitTerms: { traitId: string; channel: string; term: number }[] = [];
  let gainSum = p("zero");
  for (const channelId of rule.channels) {
    const channel = data.perception.channels.find(
      (row) => row.id === channelId,
    );
    if (!channel)
      throw new Error(`Unregistered perception channel: ${channelId}`);
    let lean = p("zero");
    for (const trait of channel.traits) {
      const value = normalizedTrait(api, actor, trait.traitId);
      if (value === p("zero")) continue;
      const sign = trait.direction === "lowers" ? p("negativeOne") : p("one");
      const term = sign * value * p(data.perception.traitWeightParameter);
      traitTerms.push({ traitId: trait.traitId, channel: channelId, term });
      lean += term;
    }
    gainSum += Math.max(p("zero"), p("one") + lean);
  }
  const channelGain = rule.channels.length
    ? gainSum / rule.channels.length
    : p("one");
  const closeness = closenessTo(api, actor.id, event.personIds);
  const roleWeight = p(role.weightParameter);
  const attention =
    roleWeight *
    (p("one") + p(data.perception.closenessWeightParameter) * closeness) *
    channelGain;
  return {
    role: role.id,
    roleWeight,
    closeness,
    channelGain,
    traitTerms,
    attention,
  };
}

function driveIdentity(
  data: DrivesData,
  kind: DriveKindRow,
  actor: Readonly<PersonState>,
  event: CoreEventInput,
) {
  const responsible = responsibleId(data, event);
  const topic =
    kind.shareable && event.topic
      ? event.topic
      : responsible
        ? `${kind.id}:${responsible}`
        : `${kind.id}:${actor.householdId}`;
  return {
    id: `${kind.id}:${topic}`,
    topic,
    desiredChange: event.desiredChange ?? topic,
    targetId: kind.shareable ? undefined : responsible,
  };
}

function scored(
  decision: ReturnType<typeof chooseAct>,
): ScoredResponse | undefined {
  if (!decision.selected || !decision.selectedReasons) return undefined;
  return {
    responseId: decision.selected.definition.id,
    score: Object.values(decision.selectedReasons).reduce((a, b) => a + b),
    reasons: decision.selectedReasons,
  };
}

/** The person's own decision about one perceived event; no roll, no assignment. */
export function respond(
  api: CoreAPI,
  data: DrivesData,
  actorId: PersonId,
  event: CoreEventInput,
): FormationTrace[] {
  const p = (key: string) => api.parameter(key);
  const actor = api.state.people.get(actorId);
  if (!actor?.alive) return [];
  const out: FormationTrace[] = [];
  const params = parameterValues(api.state.data.parameters);
  for (const rule of data.eventRules) {
    if (rule.eventKind !== event.kind) continue;
    const seen = perceive(api, data, actor, event, rule);
    if (!seen) continue;
    api.stopgap(data.stopgapId);
    const appraisal = appraiseEvent(
      actor,
      event,
      Math.max(p("zero"), Math.min(p("one"), seen.closeness)),
      params,
      api.state.data.appraisalTraits,
    );
    const magnitude =
      Math.abs(appraisal.moodImpulse) +
      Math.max(p("zero"), appraisal.stressImpulse);
    const pressure = seen.attention * magnitude;
    const rows = rule.responses
      .map((id) => {
        const row = data.responses.find((response) => response.id === id);
        if (!row) throw new Error(`Unregistered drive response: ${id}`);
        return row;
      })
      .filter((row) =>
        row.requires.every((name) => {
          const test = requirementOperations[name];
          if (!test)
            throw new Error(`Unregistered response requirement: ${name}`);
          return test(api, data, actor, event);
        }),
      );
    const offers: ActOffer[] = rows.map((row) => ({
      definition: row,
      targetId: event.id,
      availableHours: p("hoursPerDay"),
      effortHours: p("zero"),
    }));
    // Traits lean the event's push toward each response through the shared trait-act table.
    const considered = offers.map((offer, position) => {
      const row = rows[position]!;
      const alone = chooseAct(core(api), actor.id, [offer], {
        affect: actor.affect,
      });
      const lean =
        (alone.selectedReasons?.trait ?? p("zero")) / p("traitWeight");
      const fit = p(row.fitParameter);
      return {
        responseId: row.id,
        fit,
        lean,
        urgency:
          pressure *
          Math.max(p("zero"), fit + p("responseTraitLeanGain") * lean),
      };
    });
    const context: DecisionContext = {
      affect: actor.affect,
      goalRows: rows.map((row, position) => {
        const [goalKind] = row.goalKinds;
        if (!goalKind)
          throw new Error(`Response row lacks a goal kind: ${row.id}`);
        return {
          id: goalKind,
          kind: goalKind,
          urgency: considered[position]!.urgency,
        };
      }),
    };
    const decision = chooseAct(core(api), actor.id, offers, context);
    const chosen = scored(decision);
    if (!chosen) continue;
    const runnerUp = scored(
      chooseAct(
        core(api),
        actor.id,
        offers.filter((offer) => offer !== decision.selected),
        context,
      ),
    );
    const row = rows.find((response) => response.id === chosen.responseId)!;
    const trace: FormationTrace = {
      date: api.state.date,
      personId: actor.id,
      eventId: event.id,
      eventKind: event.kind,
      ruleId: rule.id,
      role: seen.role,
      roleWeight: seen.roleWeight,
      closeness: seen.closeness,
      channelGain: seen.channelGain,
      traitTerms: seen.traitTerms,
      attention: seen.attention,
      magnitude,
      pressure,
      considered,
      chosen,
      ...(runnerUp ? { runnerUp } : {}),
      strengthAdded: p("zero"),
    };
    const runtime = runtimeFor(api.state);
    bump(runtime.responsesByRule, `${rule.id}:${row.id}`, api);
    runtime.perceived += p("one");
    const kind = row.driveKind
      ? data.driveKinds.find((entry) => entry.id === row.driveKind)
      : undefined;
    if (row.driveKind && !kind)
      throw new Error(`Unregistered drive kind: ${row.driveKind}`);
    if (kind) {
      const strength = considered.find(
        (entry) => entry.responseId === row.id,
      )!.urgency;
      trace.strengthAdded = strength;
      const identity = driveIdentity(data, kind, actor, event);
      trace.driveId = identity.id;
      let mine = runtime.byPerson.get(actor.id);
      if (!mine) runtime.byPerson.set(actor.id, (mine = new Map()));
      let drive = mine.get(identity.id);
      if (!drive) {
        drive = {
          id: identity.id,
          personId: actor.id,
          kind: kind.id,
          goalKind: kind.goalKind,
          topic: identity.topic,
          desiredChange: identity.desiredChange,
          ...(identity.targetId ? { targetId: identity.targetId } : {}),
          sourceEventId: event.id,
          formedAt: api.state.date,
          anchorDate: api.state.date,
          anchorStrength: p("zero"),
          halfLifeDays: p(kind.halfLifeParameter),
          shareable: kind.shareable,
          formations: [],
          acts: [],
          told: new Set(),
        };
        mine.set(drive.id, drive);
        runtime.drives.set(`${actor.id}|${drive.id}`, drive);
        bump(
          runtime.formedByYearKind,
          `${api.state.date.slice(p("zero"), p("isoYearCharacters"))}:${kind.id}`,
          api,
        );
      }
      drive.formations.push(trace);
      reinforce(api, drive, strength);
      api.emit({
        id: `${data.eventKinds.formed}:${actor.id}:${drive.id}:${api.state.date}`,
        date: api.state.date,
        kind: data.eventKinds.formed,
        personIds: [actor.id],
        placeId: actor.placeId,
        topic: drive.topic,
        desiredChange: drive.desiredChange,
        source: event.source,
        facts: {
          [`drive:${drive.id}:${data.factKeys.driveKind}`]: kind.id,
          [`drive:${drive.id}:${data.factKeys.sourceEvent}`]: event.id,
        },
      });
    }
    runtime.decisions.push(trace);
    out.push(trace);
  }
  return out;
}

function heldFor(api: CoreAPI, actorId: PersonId) {
  return runtimeFor(api.state).byPerson.get(actorId);
}

/** Drives whose goal kind the act row serves, strongest first, ties by id. */
function servingDrives(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  action: ActionDefinition,
): HeldDrive[] {
  const mine = heldFor(api, actor.id);
  if (!mine) return [];
  return [...mine.values()]
    .filter((drive) => action.goalKinds.includes(drive.goalKind))
    .map((drive) => ({ drive, strength: currentStrength(api, drive) }))
    .filter((row) => row.strength > api.parameter("zero"))
    .sort(
      (left, right) =>
        right.strength - left.strength ||
        left.drive.id.localeCompare(right.drive.id),
    )
    .map((row) => row.drive);
}

function driveOffer(
  api: CoreAPI,
  action: ActionDefinition,
  targetId: string,
  drive: HeldDrive,
): ActOffer {
  return {
    definition: action,
    targetId,
    driveId: drive.id,
    availableHours: api.parameter("hoursPerDay"),
  };
}

function groupKnown(api: CoreAPI, actorId: PersonId, groupId: string) {
  return (
    api.knows(actorId, `cause-group:${groupId}:known`) !== undefined ||
    api.state.memberships.has(`${actorId}:${groupId}`)
  );
}

function drivesOf(api: CoreAPI, actorId: PersonId, offer: ActOffer) {
  const drive = offer.driveId
    ? heldFor(api, actorId)?.get(offer.driveId)
    : undefined;
  if (!drive)
    throw new Error("A drive act requires the actor's recorded drive.");
  return drive;
}

function traceAct(
  api: CoreAPI,
  actorId: PersonId,
  offer: ActOffer,
  drive: HeldDrive,
) {
  const decision = chooseAct(core(api), actorId, [offer]);
  const reasons = decision.selectedReasons!;
  drive.acts.push({
    date: api.state.date,
    actionId: offer.definition.id,
    targetId: offer.targetId,
    score: Object.values(reasons).reduce((a, b) => a + b),
    reasons,
    strengthBefore: currentStrength(api, drive),
  });
  reinforce(api, drive, api.parameter("driveActReinforcement"));
}

function actEvent(
  api: CoreAPI,
  data: DrivesData,
  kind: string,
  actorId: PersonId,
  drive: HeldDrive,
  targetId: string,
  witnessIds: readonly PersonId[],
  extra: Partial<CoreEventInput> = {},
): CoreEventInput {
  const actor = api.state.people.get(actorId)!;
  const id = `${kind}:${api.state.date}:${actorId}:${targetId}:${drive.id}`;
  return {
    id,
    date: api.state.date,
    kind,
    personIds: [actorId],
    witnessIds,
    placeId: actor.placeId,
    topic: drive.topic,
    desiredChange: drive.desiredChange,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation:
        "P10 committed actor activity driven by a recorded drive; records the attempt, not its outcome.",
    },
    ...extra,
    facts: {
      [`event:${id}:${data.factKeys.drive}`]: drive.id,
      [`event:${id}:${data.factKeys.origin}`]: drive.sourceEventId,
      ...extra.facts,
    },
  };
}

function founderOf(api: CoreAPI, groupId: string) {
  return runtimeFor(api.state).groupFounder.get(groupId);
}

export function createDrivesModule(
  data: DrivesData = DEFAULT_DRIVES_DATA,
): CoreModule {
  return {
    id: "core2-drives-p10-v1",
    onDay(api) {
      const runtime = runtimeFor(api.state);
      for (const [personId, mine] of runtime.byPerson) {
        if (!api.state.people.get(personId)?.alive) continue;
        for (const drive of mine.values())
          writeDrive(api, drive, currentStrength(api, drive));
      }
    },
    onEvent(api, event, learnedBy) {
      const civic = data.civicActEvents.find(
        (row) => row.eventKind === event.kind,
      );
      if (civic) {
        const [actorId] = event.personIds;
        const sourceEvent = event.facts?.[data.factKeys.sourceEventLegacy];
        const drive = actorId
          ? [...(heldFor(api, actorId)?.values() ?? [])].find(
              (row) =>
                row.sourceEventId === sourceEvent && row.topic === event.topic,
            )
          : undefined;
        const definition = api.state.data.actions.find(
          (row) => row.id === civic.actionId,
        );
        if (drive && definition && actorId) {
          const override =
            api.state.data.work?.discretionaryDurationParameters?.[
              definition.effect
            ];
          traceAct(
            api,
            actorId,
            {
              definition,
              targetId:
                event.facts?.[data.factKeys.organization] ?? event.placeId,
              driveId: drive.id,
              availableHours: Math.min(
                api.parameter("hoursPerDay"),
                discretionaryHours(api, actorId),
              ),
              effortHours: api.parameter(
                override ?? definition.effortParameter,
              ),
            },
            drive,
          );
        }
      }
      if (!data.eventRules.some((rule) => rule.eventKind === event.kind))
        return;
      for (const id of learnedBy) respond(api, data, id, event);
    },
    offerProviders: {
      "drive-confidant": (api, actor, action) => {
        const out: ActOffer[] = [];
        for (const drive of servingDrives(api, actor, action)) {
          if (!drive.shareable) continue;
          for (const id of [
            ...new Set([...actor.familyIds, ...actor.knownIds]),
          ].sort()) {
            if (drive.told.has(id) || id === actor.id) continue;
            if (!api.state.people.get(id)?.alive) continue;
            out.push(driveOffer(api, action, id, drive));
          }
        }
        return out;
      },
      "drive-topic": (api, actor, action) =>
        servingDrives(api, actor, action)
          .filter((drive) => drive.shareable)
          .map((drive) => driveOffer(api, action, drive.id, drive)),
      "known-cause-group": (api, actor, action) => {
        const groups = runtimeFor(api.state).groupsByTopic;
        const out: ActOffer[] = [];
        for (const drive of servingDrives(api, actor, action))
          for (const id of [...(groups.get(drive.topic) ?? [])].sort())
            if (groupKnown(api, actor.id, id))
              out.push(driveOffer(api, action, id, drive));
        return out;
      },
      "member-cause-group": (api, actor, action) => {
        const groups = runtimeFor(api.state).groupsByTopic;
        const out: ActOffer[] = [];
        for (const drive of servingDrives(api, actor, action))
          for (const id of [...(groups.get(drive.topic) ?? [])].sort())
            if (api.state.memberships.has(`${actor.id}:${id}`))
              out.push(driveOffer(api, action, id, drive));
        return out;
      },
      "grudge-target": (api, actor, action) =>
        servingDrives(api, actor, action)
          .filter(
            (drive) =>
              drive.targetId && api.state.people.get(drive.targetId)?.alive,
          )
          .map((drive) => driveOffer(api, action, drive.targetId!, drive)),
      "known-public-figure": (api, actor, action) => {
        const out: ActOffer[] = [];
        for (const drive of servingDrives(api, actor, action))
          for (const id of [...actor.knownIds].sort())
            if (
              api.state.people.get(id)?.alive &&
              api.knows(actor.id, `person:${id}:public-role`)
            )
              out.push(driveOffer(api, action, id, drive));
        return out;
      },
      "unbuilt-system": () => [],
    },
    eligibilityRules: {
      "no-known-group-on-topic": (api, actor, offer) => {
        const drive = offer.driveId
          ? heldFor(api, actor.id)?.get(offer.driveId)
          : undefined;
        if (!drive) return false;
        return ![
          ...(runtimeFor(api.state).groupsByTopic.get(drive.topic) ?? []),
        ].some((id) => groupKnown(api, actor.id, id));
      },
      "can-afford-donation": (api, actor, offer) => {
        const amount = Math.round(
          actor.livingCostDailyMinor *
            api.parameter(offer.definition.effectParameter),
        );
        return (
          amount > api.parameter("zero") &&
          actor.liquidMinor - amount >=
            actor.livingCostDailyMinor * api.parameter("moneyBufferDays")
        );
      },
    },
    effectHandlers: {
      "share-drive": (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        traceAct(api, actorId, offer, drive);
        drive.told.add(offer.targetId);
        const impulse =
          currentStrength(api, drive) *
          api.parameter(offer.definition.effectParameter);
        const groups = [
          ...(runtimeFor(api.state).groupsByTopic.get(drive.topic) ?? []),
        ]
          .filter((id) => groupKnown(api, actorId, id))
          .sort();
        api.relationship(
          actorId,
          offer.targetId,
          "contact",
          api.parameter("relationContactGain"),
        );
        api.updatePerson(actorId, { lastContactDate: api.state.date });
        api.updatePerson(offer.targetId, { lastContactDate: api.state.date });
        api.emit(
          actEvent(
            api,
            data,
            data.eventKinds.shared,
            actorId,
            drive,
            offer.targetId,
            [offer.targetId],
            {
              stressImpulse: impulse,
              moodImpulse: -impulse,
              facts: Object.fromEntries(
                groups.map((id) => [`cause-group:${id}:known`, drive.topic]),
              ),
            },
          ),
        );
      },
      "found-cause-group": (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        const actor = api.state.people.get(actorId)!;
        traceAct(api, actorId, offer, drive);
        const id = `organization:${data.causeGroupKind}:${actorId}:${drive.id}`;
        api.stopgap("SG-P10-group-name-key");
        api.addOrganization({
          id,
          placeId: actor.placeId,
          name: id,
          kind: data.causeGroupKind,
          topic: drive.topic,
          liquidMinor: api.parameter("zero"),
          source: {
            tag: "SOURCED",
            asOf: api.state.date,
            citation:
              "Founded in the simulation by a resident acting on a recorded drive; no registration or charter process is modeled.",
          },
        });
        const runtime = runtimeFor(api.state);
        let set = runtime.groupsByTopic.get(drive.topic);
        if (!set) runtime.groupsByTopic.set(drive.topic, (set = new Set()));
        set.add(id);
        runtime.groupFounder.set(id, actorId);
        api.join(actorId, id, drive.id);
        api.observe(actorId, {
          key: `cause-group:${id}:known`,
          value: drive.topic,
          learnedAt: api.state.date,
          sourceId: id,
          access: "self",
        });
        api.emit(
          actEvent(api, data, data.eventKinds.founded, actorId, drive, id, []),
        );
      },
      "join-cause-group": (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        traceAct(api, actorId, offer, drive);
        api.join(actorId, offer.targetId, drive.id);
        const founder = founderOf(api, offer.targetId);
        if (
          founder &&
          founder !== actorId &&
          api.state.people.get(founder)?.alive
        )
          api.relationship(
            actorId,
            founder,
            "group",
            api.parameter("relationContactGain"),
          );
        api.emit(
          actEvent(
            api,
            data,
            data.eventKinds.joined,
            actorId,
            drive,
            offer.targetId,
            founder && founder !== actorId ? [founder] : [],
          ),
        );
      },
      donate: (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        const actor = api.state.people.get(actorId)!;
        traceAct(api, actorId, offer, drive);
        const amount = Math.round(
          actor.livingCostDailyMinor *
            api.parameter(offer.definition.effectParameter),
        );
        const paid = api.transfer(actorId, offer.targetId, amount);
        api.emit(
          actEvent(
            api,
            data,
            data.eventKinds.donated,
            actorId,
            drive,
            offer.targetId,
            [],
            {
              facts: {
                [`cause-group:${offer.targetId}:received-minor`]: `${paid}`,
              },
            },
          ),
        );
      },
      volunteer: (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        traceAct(api, actorId, offer, drive);
        const founder = founderOf(api, offer.targetId);
        if (
          founder &&
          founder !== actorId &&
          api.state.people.get(founder)?.alive
        )
          api.relationship(
            actorId,
            founder,
            "group",
            api.parameter("relationContactGain"),
          );
        api.emit(
          actEvent(
            api,
            data,
            data.eventKinds.volunteered,
            actorId,
            drive,
            offer.targetId,
            founder && founder !== actorId ? [founder] : [],
          ),
        );
      },
      confront: (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        traceAct(api, actorId, offer, drive);
        api.relationship(
          actorId,
          offer.targetId,
          "contact",
          -api.parameter(offer.definition.effectParameter),
        );
        const event = actEvent(
          api,
          data,
          data.eventKinds.confronted,
          actorId,
          drive,
          offer.targetId,
          [offer.targetId],
          {
            stressImpulse: api.parameter("confrontImpulse"),
            moodImpulse: -api.parameter("confrontImpulse"),
          },
        );
        api.emit({
          ...event,
          facts: {
            ...event.facts,
            [`event:${event.id}:${data.factKeys.responsible}`]: actorId,
          },
        });
      },
      "seek-standing": (api, actorId, offer) => {
        const drive = drivesOf(api, actorId, offer);
        traceAct(api, actorId, offer, drive);
        api.relationship(
          actorId,
          offer.targetId,
          "contact",
          api.parameter(offer.definition.effectParameter),
        );
        api.updatePerson(actorId, { lastContactDate: api.state.date });
        api.emit(
          actEvent(
            api,
            data,
            data.eventKinds.soughtStanding,
            actorId,
            drive,
            offer.targetId,
            [offer.targetId],
          ),
        );
      },
      "unbuilt-system": () => {
        throw new Error(
          "No core2 system exists for this act; it is never offered.",
        );
      },
    },
  };
}

export const DRIVES_MODULE = createDrivesModule();

/** Adds the drive act rows and replaces the undecided situation shortcut. */
export function withDrives(
  base: CoreData,
  data: DrivesData = DEFAULT_DRIVES_DATA,
): CoreData {
  const extended = extendData(base, { actions: data.actions });
  return {
    ...extended,
    situations: extended.situations.filter(
      (row) => !data.replacedSituationIds.includes(row.id),
    ),
  };
}

/** Read-only report for observers and proofs; writes nothing. */
export function drivesReport(core: Readonly<CoreState>) {
  const runtime = runtimes.get(core);
  return {
    drives: runtime ? [...runtime.drives.values()] : [],
    formedByYearKind: Object.fromEntries(runtime?.formedByYearKind ?? []),
    responsesByRule: Object.fromEntries(runtime?.responsesByRule ?? []),
    perceived: runtime?.perceived,
    decisions: runtime?.decisions ?? [],
    groups: runtime
      ? [...runtime.groupFounder].map(([id, founderId]) => ({ id, founderId }))
      : [],
  };
}
