import { isPlannedOnce } from "../free-block";
import drivesJson from "../data/drives.json" with { type: "json" };
import { daysBetween, makeIsoDate } from "../kernel/dates";
import { chooseAct } from "../choice";
import { availableActs } from "../life";
import { extendData } from "../data";
import { appraiseEvent } from "../emotion";
import { parameter, parameterValues } from "../parameters";
import { discretionaryHours } from "./work";
import { closenessBetween } from "../closeness";
import { bookkeeping } from "../bookkeeping";
import { keepsWhy } from "../why-kept";
import { adTimeForSale, buyAdTime } from "./campaigns";
import { residentCounts, residentsAccountFor } from "./residents";
import type { CashJournalPosting, ResolvedCashJournalSource } from "../journal";
import type { CashJournalPostedMarker } from "../journal-state";
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
  donationJournalSourceKind: string;
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
    /** The impact used when the event's record holds no appraised impulse. */
    impulseParameter?: string;
  }[];
  actions: readonly ActionDefinition[];
  gaps: readonly string[];
  /** Event kinds whose topic is the responsible person or institution. */
  responsibleInTopic?: readonly string[];
  /** The fact key naming an institution an event's record holds responsible. */
  institutionFact?: { prefix: string; suffix: string };
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
  /** The change each cause group was founded to win (its founder's drive). */
  groupChange: Map<string, string>;
  formedByYearKind: Map<string, number>;
  responsesByRule: Map<string, number>;
  perceived: number;
  decisions: FormationTrace[];
  /** Today's scored choice for each drive holder, matched against the act recorded. */
  predicted: Map<PersonId, PredictedChoice>;
  /** Canonical donation records the cash journal resolves through this module's provider. */
  donations: Map<string, DonationRecord>;
  /** Whom each person has told about each cause, kept when a drive fades and forms again and across drives on one topic. */
  told: Map<string, Set<PersonId>>;
}

interface DonationRecord {
  resolved: ResolvedCashJournalSource;
  marker: CashJournalPostedMarker;
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
      groupChange: new Map(),
      formedByYearKind: new Map(),
      responsesByRule: new Map(),
      perceived: zero,
      decisions: [],
      predicted: new Map(),
      donations: new Map(),
      told: new Map(),
    };
    runtimes.set(state, row);
  }
  return row;
}

function toldFor(
  runtime: DrivesRuntime,
  personId: PersonId,
  topic: string,
): Set<PersonId> {
  // By cause, not by drive: two drives on one topic are one cause to the person.
  const key = `${personId}|${topic}`;
  let told = runtime.told.get(key);
  if (!told) runtime.told.set(key, (told = new Set()));
  return told;
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
    best = Math.max(best, closenessBetween(api.state, actorId, subject));
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
  const named = event.facts?.[`event:${event.id}:${data.factKeys.responsible}`];
  if (named) return named;
  // Some engines name the responsible party as the event's topic (the
  // employer behind a layoff, the landlord behind an eviction).
  if (data.responsibleInTopic?.includes(event.kind) && event.topic)
    return event.topic;
  if (!data.institutionFact) return named;
  // An institution the event's own record names (a business that closed).
  const { prefix, suffix } = data.institutionFact;
  const key = Object.keys(event.facts ?? {}).find(
    (row) => row.startsWith(prefix) && row.endsWith(suffix),
  );
  return key?.slice(prefix.length, key.length - suffix.length);
}

const requirementOperations: Readonly<Record<string, RequirementTest>> = {
  "event-topic": (_api, _data, _actor, event) =>
    !!event.topic && !!event.desiredChange,
  "event-responsible": (api, data, actor, event) => {
    const id = responsibleId(data, event);
    return (
      !!id &&
      id !== actor.id &&
      (api.state.people.has(id) || api.state.organizations.has(id))
    );
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

/**
 * The same response for the final choice among responses. Its trait lean is
 * already inside each response's urgency, and for a lasting drive it is
 * scaled by the person's agency (age and standing), so the chooser does not
 * add it again: otherwise a young child with an activist's traits takes up a
 * cause as readily as an adult (CTO ruling, Oct 14).
 */
const decisionDefinitions = new WeakMap<ResponseRow, ActionDefinition>();
function decisionDefinition(
  data: DrivesData,
  row: ResponseRow,
): ActionDefinition {
  let definition = decisionDefinitions.get(row);
  if (!definition) {
    definition = { ...chooserDefinition(data, row), actKinds: [] };
    decisionDefinitions.set(row, definition);
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
    // An event recorded without an appraised impact (a closure) carries the
    // rule's own sourced impact instead of none.
    const appraised =
      Math.abs(appraisal.moodImpulse) +
      Math.max(p("zero"), appraisal.stressImpulse);
    const magnitude =
      appraised > p("zero") || !rule.impulseParameter
        ? appraised
        : p(rule.impulseParameter) *
          (p("lifeEventMoodScale") + p("lifeEventStressScale"));
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
    const decided = offers.map((offer, position) => ({
      ...offer,
      definition: decisionDefinition(data, rows[position]!),
    }));
    const decision = chooseAct(core(api), actor.id, decided, context);
    const chosen = scored(decision);
    if (!chosen) continue;
    const runnerUp = scored(
      chooseAct(
        core(api),
        actor.id,
        decided.filter((offer) => offer !== decision.selected),
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
          // Who they have told about this cause outlives the drive itself.
          told: toldFor(runtime, actor.id, identity.topic),
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

/** A group meets where it was founded: a person reaches it only from their own place or county. */
function groupNearby(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  groupId: string,
): boolean {
  const placeId = api.state.organizations.get(groupId)?.placeId;
  return (
    placeId !== undefined &&
    (placeId === actor.placeId || placeId === actor.countyId)
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
      // Why the act was done (the drive, where it came from, how strong). Nobody
      // reads these but the player's circle asking why, so everyone else's
      // knowledge does not carry three facts for every act.
      ...(keepsWhy(api.state as CoreState, actorId, targetId)
        ? {
            [`event:${id}:${data.factKeys.drive}`]: drive.id,
            [`event:${id}:${data.factKeys.origin}`]: drive.sourceEventId,
            [`event:${id}:${data.factKeys.strength}`]: `${currentStrength(api, drive)}`,
          }
        : {}),
      ...extra.facts,
    },
  };
}

/** Eligibility already proved the donor can pay the whole gift, so the gift is paid in full. */
function payDonation(
  api: CoreAPI,
  data: DrivesData,
  donorId: PersonId,
  groupId: string,
  amount: number,
  /** Where the gift comes from, by account (the counted population's funds); the donor's own cash otherwise. */
  fromAccounts?: readonly { accountId: string; amountMinor: number }[],
): number {
  const state = core(api),
    journal = state.cashJournal;
  const own = journal.residualAccountByOwner.get(donorId);
  const from =
      fromAccounts ?? (own ? [{ accountId: own, amountMinor: amount }] : []),
    to = journal.residualAccountByOwner.get(groupId);
  if (!from.length || !to)
    throw new Error("Donation requires both cash accounts.");
  const id = `donation:${donorId}:${groupId}:${state.date}`;
  const postings: CashJournalPosting[] = [
    ...from.map((row, index) => ({
      id: `${id}:from${index ? `:${index}` : ""}`,
      accountId: row.accountId,
      deltaMinor: -row.amountMinor,
    })),
    { id: `${id}:to`, accountId: to, deltaMinor: amount },
  ];
  runtimeFor(api.state).donations.set(id, {
    resolved: {
      kind: data.donationJournalSourceKind,
      id,
      date: state.date,
      source: {
        tag: "ESTIMATED",
        citation: "P10 donation chosen by the shared chooser from a held drive",
        asOf: state.date,
        estimatedFrom: data.stopgapId,
      },
      expectedPostings: postings,
      requiredRelatedRefs: [],
      relatedRecords: [],
    },
    marker: {},
  });
  api.postJournal({
    id: `journal:${state.date}:${journal.nextSequence}`,
    date: state.date,
    expectedSequence: journal.nextSequence,
    sourceRef: { kind: data.donationJournalSourceKind, id },
    postings,
  });
  return amount;
}

/**
 * A gift sized by its giver: their cash above their buffer, times how
 * strongly they hold the cause, times donationShareOfSpare (calibrated to
 * what U.S. households give to advocacy and environmental causes). Someone
 * with nothing to spare gives nothing; nothing flips at a line.
 */
function giftOf(
  api: CoreAPI,
  actor: Readonly<PersonState>,
  strength: number,
): number {
  const zero = api.parameter("zero");
  const spare =
    actor.liquidMinor -
    actor.livingCostDailyMinor * api.parameter("moneyBufferDays");
  if (spare <= zero) return zero;
  return Math.floor(
    spare *
      api.parameter("donationShareOfSpare") *
      Math.min(api.parameter("one"), Math.max(zero, strength)),
  );
}

/**
 * Once a month a group also raises from the wider population of its place:
 * as many of its counted adults as the group's share of the place's full
 * adults, times the share of households that give at all, each giving the
 * mean of what the group's own full members' gift rule gives, from the
 * counted residents' account. Stopgap SG-CORE-counted-giving-stand-in: a
 * counted giver has no drive or cash of their own, so the members' mean gift
 * stands in for theirs, given monthly.
 */
function raiseFromCounted(
  api: CoreAPI,
  data: DrivesData,
  runtime: DrivesRuntime,
): void {
  const c = core(api);
  const counts = residentCounts(c);
  if (!counts.length) return;
  const zero = api.parameter("zero");
  const accounts = api.accounts();
  for (const groupId of [...runtime.groupFounder.keys()].sort()) {
    const group = api.state.organizations.get(groupId);
    const row = counts.find((place) => place.placeId === group?.placeId);
    if (!group?.topic || !row?.adults) continue;
    let adults = zero,
      members = zero,
      gifts = zero;
    for (const id of c.peopleByPlace.get(group.placeId) ?? []) {
      const person = c.people.get(id);
      // Adults, as the counted population's adults are counted.
      if (
        !person?.alive ||
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
          api.parameter("daysPerMeanYear") <
          api.parameter("benchmarkAdultMinimumAge")
      )
        continue;
      adults += api.parameter("one");
      if (!c.memberships.has(`${id}:${groupId}`)) continue;
      members += api.parameter("one");
      const drive = [...(heldFor(api, id)?.values() ?? [])].find(
        (held) => held.topic === group.topic,
      );
      if (drive) gifts += giftOf(api, person, currentStrength(api, drive));
    }
    if (!members || !adults || !gifts) continue;
    const givers = Math.floor(
      row.adults * (members / adults) * api.parameter("countedGivingShare"),
    );
    const pool = residentsAccountFor(c, group.placeId);
    const owner = pool ? c.cashJournal.accounts.get(pool)?.ownerId : undefined;
    if (!givers || !owner) continue;
    // The counted households' cash sits in one fund per kind of household;
    // the richer funds give more, in proportion to what each holds.
    const funds = [...(c.cashJournal.accountsByOwner.get(owner) ?? [])]
      .sort()
      .map((accountId) => ({ accountId, balance: accounts.balance(accountId) }))
      .filter((row) => row.balance > zero);
    const held = funds.reduce((n, row) => n + row.balance, zero);
    api.stopgap("SG-CORE-counted-giving-stand-in");
    const amount = Math.min(Math.floor((gifts / members) * givers), held);
    if (amount <= zero) continue;
    // Each fund gives its share, never more than it holds; what rounding
    // leaves over comes from the funds with room, so no fund goes below zero.
    let left = amount;
    const shares = funds.map((row) => {
      const share = Math.min(
        left,
        row.balance,
        Math.floor((amount * row.balance) / held),
      );
      left -= share;
      return { accountId: row.accountId, amountMinor: share, cap: row.balance };
    });
    for (const row of shares) {
      if (left <= zero) break;
      const more = Math.min(left, row.cap - row.amountMinor);
      row.amountMinor += more;
      left -= more;
    }
    const from = shares
      .map(({ accountId, amountMinor }) => ({ accountId, amountMinor }))
      .filter((row) => row.amountMinor > zero);
    payDonation(api, data, `counted:${group.placeId}`, groupId, amount, from);
  }
}

/**
 * A cause group spends what it raised (stress audit defect 2): on the first
 * of each month it spends a share of its balance on ad time through the
 * campaigns engine's purchase, every dollar on the journal. The ad is a
 * public record the news carries, and it reaches people with the group's
 * cause, which the views engine reads. Stopgap SG-CORE-cause-group-ads-only:
 * ads are the only thing a group buys yet.
 */
function spendGroupFunds(api: CoreAPI, runtime: DrivesRuntime): void {
  if (!adTimeForSale(api)) return;
  const accounts = api.accounts();
  for (const [groupId, founderId] of [...runtime.groupFounder].sort()) {
    const group = api.state.organizations.get(groupId);
    const change = runtime.groupChange.get(groupId);
    if (!group?.topic || !change) continue;
    const balance = accounts.balance(accounts.main(groupId));
    const amount = Math.floor(
      balance * api.parameter("causeGroupMonthlySpendShare"),
    );
    // An outlet sells no ad time below its smallest buy: the group saves
    // toward it.
    if (amount < api.parameter("causeGroupAdMinimumMinor")) continue;
    api.stopgap("SG-CORE-cause-group-ads-only");
    const id = `cause-group.ad:${groupId}:${api.state.date}`;
    const reached = buyAdTime(api, {
      buyerId: groupId,
      amountMinor: amount,
      recordId: id,
      citation: `${groupId} spends ${amount} of its ${balance} on ad time`,
    }).filter((person) => person.alive);
    const founder = api.state.people.get(founderId)?.alive ? [founderId] : [];
    api.emit({
      id,
      date: api.state.date,
      kind: "cause-group.ad-ran",
      personIds: founder,
      witnessIds: reached
        .map((person) => person.id)
        .filter((personId) => !founder.includes(personId)),
      placeId: group.placeId,
      topic: group.topic,
      desiredChange: change,
      publicRecord: true,
      news: true,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `Ad time bought by ${groupId}`,
        estimatedFrom: "causeGroupMonthlySpendShare",
      },
      facts: {
        organizationId: groupId,
        spentMinor: `${amount}`,
        balanceBeforeMinor: `${balance}`,
        reached: `${reached.length}`,
      },
    });
  }
}

function founderOf(api: CoreAPI, groupId: string) {
  return runtimeFor(api.state).groupFounder.get(groupId);
}

export function createDrivesModule(
  data: DrivesData = DEFAULT_DRIVES_DATA,
): CoreModule {
  return {
    id: "core2-drives-p10-v1",
    // A donation is paid through the cash journal from this module's own canonical record.
    journalSourceProviders: {
      [data.donationJournalSourceKind]: (api, reference) => {
        const row = runtimeFor(api.state).donations.get(reference.id);
        return (
          row && {
            resolved: row.resolved,
            marker: row.marker,
            retainFull: false,
          }
        );
      },
    },
    // Only the events a rule answers or a drive act emits reach this module.
    eventKinds: [
      ...new Set([
        ...data.eventRules.map((rule) => rule.eventKind),
        ...data.civicActEvents.map((row) => row.eventKind),
      ]),
    ],
    onDay(api, _decide, refresh) {
      const runtime = runtimeFor(api.state);
      if (api.state.date.endsWith("-01")) {
        raiseFromCounted(api, data, runtime);
        spendGroupFunds(api, runtime);
      }
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
        } else if (bookkeeping() || personId === api.state.playerId)
          // The scored "why" behind a drive act is kept for the player, and
          // for everyone only when bookkeeping is on (Keep it simple): a full
          // choice scored daily for every drive holder grew with the number
          // of holders, each year slower than the last.
          runtime.predicted.set(personId, predict(api, actor, refresh));
        else {
          // Their needs are still brought up to today, as the scoring did.
          refresh(actor as PersonState);
          runtime.predicted.delete(personId);
        }
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
        // Every confidant of one drive scores the same and ties go to the
        // lowest id, so only that one is offered: the choice is unchanged
        // and a person with many acquaintances scores one offer, not dozens.
        const out: ActOffer[] = [];
        const serving = servingDrives(api, actor, action).filter(
          (drive) => drive.shareable,
        );
        if (!serving.length) return out;
        const ids = [
          ...new Set([...actor.familyIds, ...actor.knownIds]),
        ].sort();
        for (const drive of serving) {
          const id = ids.find(
            (id) =>
              !drive.told.has(id) &&
              !isPlannedOnce(api.state, actor.id, action.effect, id) &&
              id !== actor.id &&
              api.state.people.get(id)?.alive,
          );
          if (id) out.push(driveOffer(api, action, id, drive));
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
            if (groupKnown(api, actor.id, id) && groupNearby(api, actor, id))
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
            if (
              api.state.memberships.has(`${actor.id}:${id}`) &&
              groupNearby(api, actor, id)
            )
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
        const drive = offer.driveId
          ? heldFor(api, actor.id)?.get(offer.driveId)
          : undefined;
        return (
          !!drive &&
          giftOf(api, actor, currentStrength(api, drive)) >
            api.parameter("zero")
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
        runtime.groupChange.set(id, drive.desiredChange);
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
        const amount = giftOf(api, actor, currentStrength(api, drive));
        const paid = payDonation(api, data, actorId, offer.targetId, amount);
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
