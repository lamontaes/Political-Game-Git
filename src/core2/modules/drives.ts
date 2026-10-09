import drivesJson from "../data/drives.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../../simulation/dates";
import { chooseAct } from "../choice";
import { availableActs } from "../life";
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
  baselineParameter?: string;
}

export interface DrivesData {
  version: string;
  stopgapId: string;
  causeGroupKind: string;
  volunteerAffordances: readonly string[];
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
  | "soughtStanding"
  | "strengthened";
type FactKey =
  | "responsible"
  | "drive"
  | "origin"
  | "condition"
  | "driveKind"
  | "sourceEvent"
  | "organization"
  | "strength"
  | "strengthAdded"
  | "response"
  | "role"
  | "originEvent";

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
  agency: number;
  pressure: number;
  event: {
    date: IsoDate;
    subjects: readonly PersonId[];
    topic?: string;
    desiredChange?: string;
    facts?: Readonly<Record<string, string>>;
  };
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

/**
 * Reasons for an act the drive served. For this module's own acts they are
 * scored before the effect, as the chooser scored them; for the life
 * module's civic acts they are reconstructed from current state at the event.
 */
export interface DriveActTrace {
  date: IsoDate;
  actionId: string;
  targetId?: string;
  /** "scored" before this module's effect; "reconstructed" at a civic event; "recorded" from the act's saved reason key. */
  basis: "scored" | "reconstructed" | "recorded";
  score?: number;
  reasons?: DecisionReason;
  reasonKey?: string;
  runnerUp?: { actionId: string; targetId: string; score: number };
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
  /** Most recent act traces (bounded); actCount is exact. */
  acts: DriveActTrace[];
  actCount: number;
  lastTracedAct?: string;
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
  /** Today's scored choice for each drive holder, matched against the act recorded. */
  predicted: Map<PersonId, PredictedChoice>;
}

interface PredictedChoice {
  date: IsoDate;
  actionId: string;
  targetId: string;
  reasonKey: string;
  score: number;
  reasons: DecisionReason;
  runnerUp?: { actionId: string; targetId: string; score: number };
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
      predicted: new Map(),
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

/** Fills a share of the drive's unfilled strength; strength levels off below one. */
function reinforce(api: CoreAPI, drive: HeldDrive, unfilledKept: number) {
  const before = currentStrength(api, drive);
  drive.anchorStrength =
    api.parameter("one") - (api.parameter("one") - before) * unfilledKept;
  drive.anchorDate = api.state.date;
  writeDrive(api, drive, drive.anchorStrength);
  return drive.anchorStrength - before;
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
  // Among every role the person holds toward this event, the weightiest counts.
  const role = data.roles
    .filter(
      (row) =>
        rule.roles.includes(row.id) &&
        (
          roleOperations[row.operation] ??
          (() => {
            throw new Error(`Unregistered perception role: ${row.operation}`);
          })
        )(api, actor, event),
    )
    .reduce<DrivesData["roles"][number] | undefined>(
      (best, row) =>
        !best ||
        api.parameter(row.weightParameter) > api.parameter(best.weightParameter)
          ? row
          : best,
      undefined,
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

const chooserDefinitions = new WeakMap<ResponseRow, ActionDefinition>();

/** A response row as a plain act row, in the field order the content rows use. */
function chooserDefinition(
  data: DrivesData,
  row: ResponseRow,
): ActionDefinition {
  let definition = chooserDefinitions.get(row);
  if (!definition) {
    // Parsed like the content rows, so the chooser sees one object layout.
    definition = JSON.parse(
      JSON.stringify({
        id: row.id,
        actKinds: row.actKinds,
        goalKinds: row.goalKinds,
        need: row.need,
        effortParameter: row.effortParameter,
        effectParameter: row.effectParameter,
        targetKind: row.targetKind,
        effect: row.effect,
        stopgapId: data.stopgapId,
        emotion: row.emotion,
      }),
    ) as ActionDefinition;
    chooserDefinitions.set(row, definition);
  }
  return definition;
}

const NO_URGENCY_OVERRIDES: Readonly<Record<string, number>> = Object.freeze(
  {},
);

/** A decision context in the same shape the life loop's projected contexts use. */
function chooserContext(
  actor: Readonly<PersonState>,
  goalRows: NonNullable<DecisionContext["goalRows"]> = [],
): DecisionContext {
  // The actor's own current needs and no urgency overrides: the same values
  // the chooser would read without them, in the shape it always receives.
  return {
    affect: actor.affect,
    needValues: actor.needs,
    goalUrgencies: NO_URGENCY_OVERRIDES,
    goalRows,
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
    // Agency to form a lasting drive of one's own rises smoothly through adolescence.
    const age =
      daysBetween(makeIsoDate(actor.birthDate), makeIsoDate(api.state.date)) /
      p("daysPerMeanYear");
    const agency =
      p("one") /
      (p("one") +
        Math.exp(
          (p("responseAgencyTurnAge") - age) / p("responseAgencyWidthYears"),
        ));
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
    // Built in the same shape as the life loop's offers, so the shared chooser stays on its fast path.
    const offers: ActOffer[] = rows.map((row) => {
      const offer: ActOffer = {
        definition: chooserDefinition(data, row),
        targetId: event.id,
        driveId: undefined,
        availableHours: p("hoursPerDay"),
      };
      offer.effortHours = p("zero");
      return offer;
    });
    // Traits lean the event's push toward each response through the shared trait-act table.
    const considered = offers.map((offer, position) => {
      const row = rows[position]!;
      // Scored with no context, exactly as an ordinary activation scores an offer.
      const alone = chooseAct(core(api), actor.id, [offer]);
      const lean =
        (alone.selectedReasons?.trait ?? p("zero")) / p("traitWeight");
      const fit = p(row.fitParameter);
      return {
        responseId: row.id,
        fit,
        lean,
        urgency:
          (row.baselineParameter ? p(row.baselineParameter) : p("zero")) +
          pressure *
            (row.driveKind ? agency : p("one")) *
            Math.max(p("zero"), fit + p("responseTraitLeanGain") * lean),
      };
    });
    const context = chooserContext(
      actor,
      rows.map((row, position) => {
        const [goalKind] = row.goalKinds;
        if (!goalKind)
          throw new Error(`Response row lacks a goal kind: ${row.id}`);
        return {
          id: goalKind,
          kind: goalKind,
          urgency: considered[position]!.urgency,
        };
      }),
    );
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
      agency,
      pressure,
      event: {
        date: event.date,
        subjects: event.personIds,
        ...(event.topic ? { topic: event.topic } : {}),
        ...(event.desiredChange ? { desiredChange: event.desiredChange } : {}),
        ...(event.facts ? { facts: event.facts } : {}),
      },
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
      const urgency = considered.find(
        (entry) => entry.responseId === row.id,
      )!.urgency;
      const identity = driveIdentity(data, kind, actor, event);
      trace.driveId = identity.id;
      let mine = runtime.byPerson.get(actor.id);
      if (!mine) runtime.byPerson.set(actor.id, (mine = new Map()));
      let drive = mine.get(identity.id);
      const isNew = !drive;
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
          actCount: p("zero"),
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
      trace.strengthAdded = reinforce(
        api,
        drive,
        Math.exp(-urgency * p("driveStrengthScale")),
      );
      // A moment for the story director: who, which event, how strong now.
      const momentKind = isNew
        ? data.eventKinds.formed
        : data.eventKinds.strengthened;
      const key = (name: FactKey) => `drive:${drive.id}:${data.factKeys[name]}`;
      api.emit({
        id: `${momentKind}:${actor.id}:${drive.id}:${event.id}`,
        date: api.state.date,
        kind: momentKind,
        personIds: [actor.id],
        placeId: actor.placeId,
        topic: drive.topic,
        desiredChange: drive.desiredChange,
        source: event.source,
        facts: {
          [key("driveKind")]: kind.id,
          [key("sourceEvent")]: event.id,
          [key("originEvent")]: drive.sourceEventId,
          [key("response")]: row.id,
          [key("role")]: seen.role,
          [key("strength")]: `${drive.anchorStrength}`,
          [key("strengthAdded")]: `${trace.strengthAdded}`,
        },
      });
    }
    retain(api, runtime.decisions, trace);
    out.push(trace);
  }
  return out;
}

/** Keeps the most recent traces within the registered budget; counts stay exact. */
function retain<T>(api: CoreAPI, rows: T[], row: T) {
  rows.push(row);
  const limit = api.parameter("driveTraceRetention");
  if (rows.length > limit + limit)
    rows.splice(api.parameter("zero"), rows.length - limit);
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

function recordAct(api: CoreAPI, drive: HeldDrive, row: DriveActTrace) {
  drive.actCount += api.parameter("one");
  drive.lastTracedAct = `${row.date}:${row.actionId}`;
  retain(api, drive.acts, row);
  reinforce(
    api,
    drive,
    api.parameter("one") - api.parameter("driveActReinforcement"),
  );
}

function traceAct(
  api: CoreAPI,
  actorId: PersonId,
  offer: ActOffer,
  drive: HeldDrive,
  basis: DriveActTrace["basis"] = "scored",
) {
  const decision = chooseAct(core(api), actorId, [offer]);
  const reasons = decision.selectedReasons!;
  recordAct(api, drive, {
    date: api.state.date,
    actionId: offer.definition.id,
    targetId: offer.targetId,
    basis,
    score: Object.values(reasons).reduce((a, b) => a + b),
    reasons,
    reasonKey: decision.reasonKey,
    strengthBefore: currentStrength(api, drive),
  });
}

/**
 * The scored choice the life loop makes if this person acts today, through
 * the same refresh, offers and chooser. Projecting needs and affect to today
 * is exact and repeated identically at activation, so it changes no outcome.
 */
function predict(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  refresh: (actor: PersonState) => unknown,
): PredictedChoice {
  refresh(actor as PersonState);
  const offers = availableActs(core(api), actor.id);
  const decision = chooseAct(core(api), actor.id, offers);
  const selected = decision.selected;
  const runner = selected
    ? chooseAct(
        core(api),
        actor.id,
        offers.filter((offer) => offer !== selected),
      )
    : undefined;
  const total = (reasons: DecisionReason | undefined) =>
    Object.values(reasons ?? {}).reduce((a, b) => a + b, api.parameter("zero"));
  return {
    date: api.state.date,
    actionId: selected?.definition.id ?? decision.reasonKey,
    targetId: selected?.targetId ?? actor.id,
    reasonKey: decision.reasonKey,
    score: total(decision.selectedReasons),
    reasons: decision.selectedReasons ?? {
      need: api.parameter("zero"),
      goal: api.parameter("zero"),
      drive: api.parameter("zero"),
      trait: api.parameter("zero"),
      emotion: api.parameter("zero"),
      effort: api.parameter("zero"),
    },
    ...(runner?.selected
      ? {
          runnerUp: {
            actionId: runner.selected.definition.id,
            targetId: runner.selected.targetId,
            score: total(runner.selectedReasons),
          },
        }
      : {}),
  };
}

/** Acts the life module chose with this drive attached; read from the saved reason key. */
function captureRecordedAct(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  drive: HeldDrive,
  predicted: PredictedChoice | undefined,
) {
  if (
    !actor.lastChoice ||
    !actor.lastReason ||
    actor.lastActDate >= api.state.date
  )
    return;
  if (!actor.lastReason.endsWith(`:${drive.id}`)) return;
  const key = `${actor.lastActDate}:${actor.lastChoice}`;
  if (drive.lastTracedAct === key || actor.lastActDate < drive.formedAt) return;
  const matched =
    predicted?.date === actor.lastActDate &&
    predicted.actionId === actor.lastChoice &&
    predicted.reasonKey === actor.lastReason
      ? predicted
      : undefined;
  recordAct(api, drive, {
    date: actor.lastActDate,
    actionId: actor.lastChoice,
    basis: matched ? "scored" : "recorded",
    reasonKey: actor.lastReason,
    ...(matched
      ? {
          targetId: matched.targetId,
          score: matched.score,
          reasons: matched.reasons,
          ...(matched.runnerUp ? { runnerUp: matched.runnerUp } : {}),
        }
      : {}),
    strengthBefore: currentStrength(api, drive),
  });
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
      [`event:${id}:${data.factKeys.strength}`]: `${currentStrength(api, drive)}`,
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
    // Only the events a rule answers or a drive act emits reach this module.
    eventKinds: [
      ...new Set([
        ...data.eventRules.map((rule) => rule.eventKind),
        ...data.civicActEvents.map((row) => row.eventKind),
      ]),
    ],
    onDay(api, _decide, refresh) {
      const runtime = runtimeFor(api.state);
      for (const [personId, mine] of runtime.byPerson) {
        if (!api.state.people.get(personId)?.alive) {
          runtime.byPerson.delete(personId);
          continue;
        }
        const actor = api.state.people.get(personId)!;
        const predicted = runtime.predicted.get(personId);
        for (const drive of mine.values()) {
          captureRecordedAct(api, actor, drive, predicted);
          const strength = currentStrength(api, drive);
          if (strength < api.parameter("driveRetireStrength")) {
            // Faded: written once at zero and no longer rewritten daily.
            writeDrive(api, drive, api.parameter("zero"));
            mine.delete(drive.id);
          } else writeDrive(api, drive, strength);
        }
        if (!mine.size) {
          runtime.byPerson.delete(personId);
          runtime.predicted.delete(personId);
        } else runtime.predicted.set(personId, predict(api, actor, refresh));
      }
    },
    onEvent(api, event, learnedBy) {
      const civic = data.civicActEvents.find(
        (row) => row.eventKind === event.kind,
      );
      if (civic) {
        const [actorId] = event.personIds;
        const definition = api.state.data.actions.find(
          (row) => row.id === civic.actionId,
        );
        // The drive the life module attached: its first drive goal serving this act.
        const actor = actorId ? api.state.people.get(actorId) : undefined;
        const attached =
          actor && definition
            ? [...actor.goals.values()].find(
                (goal) =>
                  goal.sourceDriveId &&
                  definition.goalKinds.includes(goal.kind),
              )?.sourceDriveId
            : undefined;
        const drive =
          actorId && attached
            ? heldFor(api, actorId)?.get(attached)
            : undefined;
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
            "reconstructed",
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
      "volunteer-place": (api, actor, action) => {
        const serving = servingDrives(api, actor, action);
        if (!serving.length) return [];
        const groups = runtimeFor(api.state).groupsByTopic;
        // Known associations in the person's place and county, by direct fact lookup.
        const associations: string[] = [];
        for (const placeId of new Set([
          actor.placeId,
          ...(actor.countyId ? [actor.countyId] : []),
        ]))
          for (const id of api.state.publicOrganizationsByPlace.get(placeId) ??
            [])
            if (
              api.state.publicOrganizations
                .get(id)
                ?.affordances?.some((kind) =>
                  data.volunteerAffordances.includes(kind),
                ) &&
              api.knows(actor.id, `organization:${id}:public`)
            )
              associations.push(id);
        associations.sort();
        const out: ActOffer[] = [];
        for (const drive of serving) {
          for (const id of [...(groups.get(drive.topic) ?? [])].sort())
            if (api.state.memberships.has(`${actor.id}:${id}`))
              out.push(driveOffer(api, action, id, drive));
          for (const id of associations)
            out.push(driveOffer(api, action, id, drive));
        }
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

/** Adds the drive act rows to the shared data; mods add rows the same way. */
export function withDrives(
  base: CoreData,
  data: DrivesData = DEFAULT_DRIVES_DATA,
): CoreData {
  return extendData(base, { actions: data.actions });
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
