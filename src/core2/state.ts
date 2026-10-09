import {
  emptyWorkRuntime,
  admitWorkCommitment,
  settleWorkResult,
  recordActivityTime,
  recordDiscretionaryTime,
} from "./work-state";
import { makeIsoDate } from "../simulation/dates";
import { CORE_API_VERSION, CORE_SCHEMA_VERSION, DEFAULT_DATA } from "./data";
import { parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import { initialFocusPeople } from "./focus";
import type {
  ActOffer,
  DecisionResult,
  CoreAPI,
  CoreData,
  CoreEventInput,
  CoreInput,
  CoreModule,
  CoreState,
  KnownFact,
  LogRecord,
  PersonInput,
  PersonState,
  Relationship,
} from "./types";

function index<K>(map: Map<K, Set<string>>, key: K, id: string): void {
  let ids = map.get(key);
  if (!ids) map.set(key, (ids = new Set()));
  ids.add(id);
}

function admitNumber(value: number, field: string, zero: number): void {
  if (!Number.isFinite(value) || value < zero)
    throw new Error(`Invalid nonnegative ${field}.`);
}

function admitCash(value: number, field: string, zero: number): void {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error(`Invalid integer minor units: ${field}.`);
}

function assertKnownIdSources(
  core: CoreState,
  row: Pick<
    PersonInput,
    "id" | "birthDate" | "knownIdSources" | "pastFacts"
  > & {
    knownIds: Iterable<string>;
  },
): void {
  if (!row.knownIdSources) return;
  const known = new Set(row.knownIds);
  const past = new Map((row.pastFacts ?? []).map((fact) => [fact.id, fact]));
  for (const [id, source] of Object.entries(row.knownIdSources)) {
    const learnedAt = makeIsoDate(source.learnedAt);
    const fact = past.get(source.sourceFactId);
    const other = core.people.get(id) ?? core.husks.get(id);
    if (
      !known.has(id) ||
      id === row.id ||
      !fact ||
      makeIsoDate(fact.date) > learnedAt ||
      learnedAt < row.birthDate ||
      (other?.birthDate !== undefined && learnedAt < other.birthDate) ||
      learnedAt > core.date
    )
      throw new Error(`Invalid opening name provenance: ${row.id}:${id}`);
  }
}

function initialNameProvenance(
  core: CoreState,
  actor: PersonState,
  knownId: string,
): Pick<KnownFact, "sourceId" | "learnedAt"> {
  const source = actor.knownIdSources?.[knownId];
  if (source) {
    const marker = actor.pastFacts?.find(
      (fact) => fact.id === source.sourceFactId,
    )?.facts?.stopgapId;
    if (marker) coreAPI(core).stopgap(marker);
  }
  return source
    ? { sourceId: source.sourceFactId, learnedAt: source.learnedAt }
    : {
        sourceId: core.households
          .get(actor.householdId)
          ?.memberIds.includes(knownId)
          ? actor.householdId
          : actor.id,
        learnedAt: core.date,
      };
}

export function createCore(
  input: CoreInput,
  options: {
    data?: CoreData;
    observer?: boolean;
    modules?: readonly CoreModule[];
  } = {},
): CoreState {
  const data = options.data ?? DEFAULT_DATA;
  const p = (key: string) => parameter(key, data.parameters);
  const date = makeIsoDate(input.startedAt);
  const core: CoreState = {
    schemaVersion: CORE_SCHEMA_VERSION,
    apiVersion: CORE_API_VERSION,
    seed: input.seed,
    startedAt: date,
    date,
    people: new Map(),
    husks: new Map(),
    households: new Map(),
    jobs: new Map(),
    work: emptyWorkRuntime(),
    organizations: new Map(),
    publicOrganizations: new Map(),
    publicOrganizationsByPlace: new Map(),
    relationships: new Map(),
    familyLinks: new Map(),
    memberships: new Map(),
    peopleByPlace: new Map(),
    peopleByTier: new Map(),
    organizationsByPlaceKind: new Map(),
    relationshipsByPerson: new Map(),
    membershipsByPerson: new Map(),
    pendingCallbacks: new Map(),
    durableLog: new Map(),
    logByPerson: new Map(),
    logByKind: new Map(),
    logByPlace: new Map(),
    latestPublicViews: new Map(),
    actCounters: new Map(),
    actCountersByMonth: new Map(),
    actsByMonthKind: new Map(),
    organizedTopicsByPerson: new Map(),
    eventIds: new Set(),
    calendarDates: new Set(input.calendarDates),
    focusPersonIds: initialFocusPeople(input),
    focusPlaceIds: new Set(input.focusPlaceIds),
    visiblePlaceIds: new Set(input.visiblePlaceIds ?? input.focusPlaceIds),
    playerId: input.playerId,
    observer: options.observer ?? false,
    sequence: p("zero"),
    gaps: new Set(input.gaps),
    placeMetadata: input.placeMetadata ?? {},
    stopgapHits: new Set(),
    knowledgeByPerson: new Map(),
    data,
    modules: new Map(),
  };
  for (const tier of data.tiers) core.peopleByTier.set(tier.id, new Set());
  for (const row of input.households) {
    if (core.households.has(row.id))
      throw new Error(`Duplicate household: ${row.id}`);
    core.households.set(row.id, { ...row, memberIds: [...row.memberIds] });
  }
  for (const row of input.people) admitPerson(core, row);
  for (const row of input.husks ?? []) {
    if (core.people.has(row.id) || core.husks.has(row.id))
      throw new Error(`Duplicate named person: ${row.id}`);
    core.husks.set(row.id, {
      ...row,
      said: [...row.said],
      looks: { ...row.looks },
    });
  }
  const api = coreAPI(core);
  for (const row of input.organizations) api.addOrganization(row);
  for (const row of input.jobs) {
    if (core.jobs.has(row.id)) throw new Error(`Duplicate job: ${row.id}`);
    if (
      !core.people.has(row.personId) ||
      !core.organizations.has(row.organizationId)
    )
      throw new Error(`Job references an absent actor or employer: ${row.id}`);
    admitNumber(row.wageDailyMinor, "job pay", p("zero"));
    admitNumber(row.hoursDaily, "job hours", p("zero"));
    core.jobs.set(row.id, { ...row });
  }
  for (const row of input.workCommitments ?? []) api.addWorkCommitment(row);
  for (const gap of core.data.work?.gaps ?? []) core.gaps.add(gap);
  for (const row of input.publicOrganizations ?? []) {
    if (core.publicOrganizations.has(row.id))
      throw new Error(`Duplicate public organization: ${row.id}`);
    if (
      row.staff?.some(
        (staff) =>
          !core.people.has(staff.personId) ||
          core.jobs.get(staff.jobId)?.personId !== staff.personId,
      )
    )
      throw new Error(`Public staff is not a recorded worker: ${row.id}`);
    core.publicOrganizations.set(row.id, {
      ...row,
      facts: { ...row.facts },
      affordances: [...(row.affordances ?? [])],
      staff: [...(row.staff ?? [])],
    });
    index(core.publicOrganizationsByPlace, row.placeId, row.id);
  }
  for (const row of input.familyLinks ?? []) {
    if (
      core.familyLinks.has(row.id) ||
      row.personIds.some((id) => !core.people.has(id))
    )
      throw new Error(`Invalid family link: ${row.id}`);
    core.familyLinks.set(row.id, {
      ...row,
      personIds: [...row.personIds] as typeof row.personIds,
    });
  }
  for (const actor of core.people.values()) {
    assertKnownIdSources(core, actor);
    if (!core.households.get(actor.householdId)?.memberIds.includes(actor.id))
      throw new Error(`Person has no consistent household: ${actor.id}`);
    for (const id of actor.familyIds) {
      if (!core.people.has(id)) throw new Error(`Absent family member: ${id}`);
      const relationshipId = [actor.id, id].sort().join(":");
      if (!core.relationships.has(relationshipId))
        api.relationship(actor.id, id, "family", p("relationInitial"));
    }
    for (const id of actor.knownIds) {
      const other = core.people.get(id);
      if (!other && !core.husks.has(id))
        throw new Error(`Absent named contact: ${id}`);
      api.observe(actor.id, {
        key: `person:${id}:name`,
        value: other
          ? `${other.givenName} ${other.familyName}`
          : `${core.husks.get(id)!.givenName} ${core.husks.get(id)!.familyName}`,
        ...initialNameProvenance(core, actor, id),
        access: "perceived",
      });
    }
    const job = actor.jobId ? core.jobs.get(actor.jobId) : undefined;
    if (actor.jobId && (!job || job.personId !== actor.id))
      throw new Error(`Person has no owned job: ${actor.id}`);
    if (job) {
      api.observe(actor.id, {
        key: `job:${job.id}:pay`,
        value: String(job.wageDailyMinor),
        learnedAt: date,
        sourceId: job.id,
        access: "self",
      });
      api.observe(actor.id, {
        key: `organization:${job.organizationId}:public`,
        value: job.organizationId,
        learnedAt: date,
        sourceId: job.id,
        access: "perceived",
      });
    }
  }
  for (const module of options.modules ?? []) registerModule(core, module);
  assertCoreIntegrity(core);
  return core;
}

function admitPerson(core: CoreState, row: PersonInput): PersonState {
  const p = (key: string) => parameter(key, core.data.parameters);
  if (core.people.has(row.id)) throw new Error(`Duplicate person: ${row.id}`);
  if (!core.peopleByTier.has(row.tier))
    throw new Error(`Unregistered tier: ${row.tier}`);
  makeIsoDate(row.birthDate);
  if (row.birthDate > core.date)
    throw new Error(`Person cannot be alive before birth: ${row.id}`);
  assertKnownIdSources(core, row);
  admitCash(row.liquidMinor, "opening liquid balance", p("zero"));
  admitNumber(row.livingCostDailyMinor, "opening living cost", p("zero"));
  for (const value of Object.values(row.traits))
    if (!Number.isFinite(value)) throw new Error(`Non-finite trait: ${row.id}`);
  const actor: PersonState = {
    ...row,
    traits: { ...row.traits },
    familyIds: new Set(row.familyIds),
    knownIds: new Set(row.knownIds),
    lastActDate: core.date,
    lastContactDate: core.date,
    alive: true,
    actCount: p("zero"),
    actsByKind: new Map(),
    affect: {
      at: core.date,
      mood: p("moodBaseline"),
      stress: p("stressBaseline"),
      moodBaseline: p("moodBaseline"),
      stressBaseline: p("stressBaseline"),
    },
    needs: Object.fromEntries(
      core.data.needs.map((need) => [need.id, p("zero")]),
    ),
    goals: new Map(),
    drives: new Map(),
  };
  core.people.set(row.id, actor);
  index(core.peopleByPlace, row.placeId, row.id);
  if (row.countyId) index(core.peopleByPlace, row.countyId, row.id);
  index(core.peopleByTier, row.tier, row.id);
  core.knowledgeByPerson.set(row.id, new Map());
  return actor;
}

export function registerModule(core: CoreState, module: CoreModule): void {
  if (core.modules.has(module.id))
    throw new Error(`Duplicate module: ${module.id}`);
  for (const category of [
    "needEvaluators",
    "offerProviders",
    "effectHandlers",
    "eligibilityRules",
  ] as const) {
    for (const name of Object.keys(module[category] ?? {})) {
      if ([...core.modules.values()].some((other) => other[category]?.[name]))
        throw new Error(`Duplicate engine operation: ${category}:${name}`);
    }
  }
  core.modules.set(module.id, module);
}

export function resolveOperation<
  K extends
    "needEvaluators" | "offerProviders" | "effectHandlers" | "eligibilityRules",
>(
  core: CoreState,
  category: K,
  name: string,
): NonNullable<CoreModule[K]>[string] | undefined {
  for (const module of core.modules.values()) {
    const operation = module[category]?.[name];
    if (operation) return operation as NonNullable<CoreModule[K]>[string];
  }
  return undefined;
}

export function retainLog(core: CoreState, event: LogRecord): void {
  const circle = [...event.personIds, ...(event.witnessIds ?? [])].some(
    (id) => core.focusPersonIds.has(id) || id === core.playerId,
  );
  const publicRecord =
    event.publicRecord && core.visiblePlaceIds.has(event.placeId);
  const news = event.news;
  if (!core.observer && !circle && !publicRecord && !news) return;
  if (core.durableLog.has(event.id)) return;
  const row: LogRecord = {
    ...event,
    visibility: core.observer
      ? "observer"
      : circle
        ? "circle"
        : publicRecord
          ? "public"
          : "news",
  };
  core.durableLog.set(row.id, row);
  for (const id of new Set([...row.personIds, ...(row.witnessIds ?? [])]))
    index(core.logByPerson, id, row.id);
  index(core.logByKind, row.kind, row.id);
  index(core.logByPlace, row.placeId, row.id);
}

/** Shared act admission is pure so coupled money writers can validate before payment. */
function validateCommittedAct(
  core: CoreState,
  actorId: string,
  offer: ActOffer,
  date: string,
  reason: DecisionResult,
): void {
  const p = (key: string) => parameter(key, core.data.parameters);
  const zero = p("zero"),
    one = p("one"),
    monthLength = p("isoMonthCharacters");
  if (makeIsoDate(date) !== core.date)
    throw new Error("Acts must be recorded on the current date.");
  const actor = core.people.get(actorId);
  if (
    !actor ||
    reason.actorId !== actorId ||
    reason.date !== date ||
    !offer.targetId ||
    !offer.definition.id
  )
    throw new Error("Invalid committed act identity or decision date.");
  if (!Number.isSafeInteger(actor.actCount + one) || actor.actCount < zero)
    throw new Error("Act count overflows or is malformed.");
  const month = date.slice(zero, monthLength),
    key = `${month}:${actorId}:${offer.definition.id}`;
  const total = `${month}:${offer.definition.id}`;
  const count = core.actCounters.get(key);
  if (
    ![
      (actor.actsByKind.get(offer.definition.id) ?? zero) + one,
      (core.actsByMonthKind.get(total) ?? zero) + one,
      (count?.count ?? zero) + one,
    ].every(Number.isSafeInteger)
  )
    throw new Error("Act counters overflow or are malformed.");
  if (
    Object.values(reason.selectedReasons ?? {}).some(
      (value) => !Number.isFinite(value),
    ) ||
    [
      (count?.needContribution ?? zero) +
        (reason.selectedReasons?.need ?? zero),
      (count?.goalContribution ?? zero) +
        (reason.selectedReasons?.goal ?? zero),
      (count?.driveContribution ?? zero) +
        (reason.selectedReasons?.drive ?? zero),
    ].some((value) => !Number.isFinite(value))
  )
    throw new Error("Act reason/counter contribution is non-finite.");
}

// Derived read index only; actor knowledge remains authoritative and private.
// Canonical fact writes enter through observe; new/replaced fact Maps get a new
// WeakMap entry. This index is never a CoreState field or serialized evidence.
const publicKnowledgeIds = new WeakMap<Map<string, KnownFact>, Set<string>>();
const noPublicKnowledgeIds: ReadonlySet<string> = new Set<string>();

function publicOrganizationId(key: string): string | undefined {
  const prefix = "organization:";
  const suffix = ":public";
  return typeof key === "string" &&
    key.length >= prefix.length + suffix.length &&
    key.startsWith(prefix) &&
    key.endsWith(suffix)
    ? key.slice(prefix.length, -suffix.length)
    : undefined;
}

/** Internal default-provider read; no fact is learned by building this index. */
export function knownPublicOrganizationIds(
  core: Readonly<CoreState>,
  personId: string,
): ReadonlySet<string> {
  const facts = core.knowledgeByPerson.get(personId);
  if (!facts) return noPublicKnowledgeIds;
  const prior = publicKnowledgeIds.get(facts);
  if (prior) return prior;
  const ids = new Set<string>();
  for (const [key, fact] of facts) {
    const id = publicOrganizationId(key);
    if (fact && id !== undefined) ids.add(id);
  }
  publicKnowledgeIds.set(facts, ids);
  return ids;
}

const writerAPIs = new WeakMap<CoreState, CoreAPI>();

/** Local writers validate their own rows; no whole-world pass occurs per act. */
export function coreAPI(core: CoreState): CoreAPI {
  const prior = writerAPIs.get(core);
  if (prior) return prior;
  const p = (key: string) => {
    const row = core.data.parameters[key];
    if (row?.stopgapId) stopgap(row.stopgapId, core);
    return parameter(key, core.data.parameters);
  };
  const api: CoreAPI = {
    version: core.apiVersion,
    state: core,
    parameter: p,
    stopgap: (id) => {
      stopgap(id, core);
    },
    observe(personId, fact) {
      const known = core.knowledgeByPerson.get(personId);
      if (!known) throw new Error(`Knowledge recipient is absent: ${personId}`);
      makeIsoDate(fact.learnedAt);
      if (fact.learnedAt > core.date)
        throw new Error("Cannot learn a future fact.");
      known.set(fact.key, { ...fact });
      const publicIds = publicKnowledgeIds.get(known);
      if (publicIds) {
        const id = publicOrganizationId(fact.key);
        if (id !== undefined) publicIds.add(id);
      }
    },
    knows: (personId, key) => core.knowledgeByPerson.get(personId)?.get(key),
    transfer(payerId, payeeId, minor) {
      if (!Number.isSafeInteger(minor) || minor < p("zero"))
        throw new Error("Transfers require nonnegative integer minor units.");
      const payer = core.people.get(payerId) ?? core.organizations.get(payerId);
      const payee = core.people.get(payeeId) ?? core.organizations.get(payeeId);
      if (!payer || !payee) throw new Error("Transfer endpoint is absent.");
      const paid = Math.min(minor, payer.liquidMinor);
      if (!Number.isSafeInteger(payee.liquidMinor + paid))
        throw new Error("Transfer overflows minor units.");
      payer.liquidMinor -= paid;
      payee.liquidMinor += paid;
      return paid;
    },
    addWorkCommitment(row) {
      admitWorkCommitment(core, api, row);
    },
    settleWorkResult(row) {
      return settleWorkResult(core, api, row);
    },
    recordActivityTime(personId, category, minutes, source) {
      recordActivityTime(core, api, personId, category, minutes, source);
    },
    recordDiscretionaryTime(personId, minutes) {
      recordDiscretionaryTime(core, api, personId, minutes);
    },
    relationship(actorId, otherId, kind, change) {
      if (
        !core.people.has(actorId) ||
        !core.people.has(otherId) ||
        actorId === otherId ||
        !Number.isFinite(change)
      )
        throw new Error("Invalid relationship endpoints or change.");
      const id = [actorId, otherId].sort().join(":");
      const previous = core.relationships.get(id);
      const row: Relationship = previous ?? {
        id,
        actorId,
        otherId,
        kind,
        level: p("zero"),
        lastContactDate: core.date,
      };
      row.level = Math.tanh(row.level + change);
      row.lastContactDate = core.date;
      core.relationships.set(id, row);
      index(core.relationshipsByPerson, actorId, id);
      index(core.relationshipsByPerson, otherId, id);
      if (actorId === core.playerId) core.focusPersonIds.add(otherId);
      if (otherId === core.playerId) core.focusPersonIds.add(actorId);
    },
    join(personId, organizationId, driveId) {
      if (
        !core.people.has(personId) ||
        (!core.organizations.has(organizationId) &&
          !core.publicOrganizations.has(organizationId))
      )
        throw new Error("Membership endpoint is absent.");
      const id = `${personId}:${organizationId}`;
      if (core.memberships.has(id)) return;
      core.memberships.set(id, {
        id,
        personId,
        organizationId,
        joinedAt: core.date,
        sourceDriveId: driveId,
        status: "requested",
      });
      index(core.membershipsByPerson, personId, id);
    },
    emit(event) {
      applyCoreEvent(core, event);
    },
    validateAct(actorId, offer, date, reason) {
      validateCommittedAct(core, actorId, offer, date, reason);
    },
    recordAct(actorId, offer, date, reason) {
      validateCommittedAct(core, actorId, offer, date, reason);
      if (makeIsoDate(date) !== core.date)
        throw new Error("Acts must be recorded on the current date.");
      const actor = core.people.get(actorId);
      if (!actor) throw new Error("Act actor is absent.");
      actor.lastChoice = offer.definition.id;
      actor.lastReason = reason.reasonKey;
      actor.actCount += p("one");
      actor.actsByKind.set(
        offer.definition.id,
        (actor.actsByKind.get(offer.definition.id) ?? p("zero")) + p("one"),
      );
      const committedId = `act:${date}:${actorId}:${actor.actCount}`;
      const month = date.slice(p("zero"), p("isoMonthCharacters"));
      const totalKey = `${month}:${offer.definition.id}`;
      core.actsByMonthKind.set(
        totalKey,
        (core.actsByMonthKind.get(totalKey) ?? p("zero")) + p("one"),
      );
      const key = `${month}:${actorId}:${offer.definition.id}`;
      let count = core.actCounters.get(key);
      if (!count)
        core.actCounters.set(
          key,
          (count = {
            month,
            actorId,
            actionId: offer.definition.id,
            count: p("zero"),
            needContribution: p("zero"),
            goalContribution: p("zero"),
            driveContribution: p("zero"),
          }),
        );
      count.count += p("one");
      count.needContribution += reason.selectedReasons?.need ?? p("zero");
      count.goalContribution += reason.selectedReasons?.goal ?? p("zero");
      count.driveContribution += reason.selectedReasons?.drive ?? p("zero");
      index(core.actCountersByMonth, month, key);
      if (
        core.observer ||
        core.focusPersonIds.has(actorId) ||
        actorId === core.playerId
      )
        retainLog(core, {
          id: committedId,
          date,
          kind: "person.acted",
          personIds: [actorId],
          placeId: actor.placeId,
          source: {
            tag: "SOURCED",
            asOf: date,
            citation: "Prototype committed decision result.",
          },
          actorId,
          actionId: offer.definition.id,
          targetId: offer.targetId,
          driveId: offer.driveId,
          reasonKey: reason.reasonKey,
          decision: reason,
        });
      return committedId;
    },
    updatePerson(personId, changes) {
      const actor = core.people.get(personId);
      if (!actor) throw new Error(`Absent person: ${personId}`);
      if (changes.tier !== undefined && !core.peopleByTier.has(changes.tier))
        throw new Error(`Unregistered tier: ${changes.tier}`);
      if (changes.affect) {
        if (
          Object.values(changes.affect).some(
            (value) => typeof value === "number" && !Number.isFinite(value),
          )
        )
          throw new Error("Non-finite affect update.");
        const affectDate = makeIsoDate(changes.affect.at);
        if (affectDate < actor.affect.at || affectDate > core.date)
          throw new Error("Affect must advance within the current date.");
      }
      if (
        changes.lastActDate !== undefined &&
        (makeIsoDate(changes.lastActDate) < actor.lastActDate ||
          changes.lastActDate > core.date)
      )
        throw new Error("Last act date must advance within the current date.");
      if (
        changes.jobId !== undefined &&
        core.jobs.get(changes.jobId)?.personId !== personId
      )
        throw new Error("A person can only hold their own recorded job.");
      if (changes.tier !== undefined && changes.tier !== actor.tier) {
        core.peopleByTier.get(actor.tier)!.delete(personId);
        index(core.peopleByTier, changes.tier, personId);
      }
      Object.assign(actor, changes);
    },
    addOrganization(row) {
      if (core.organizations.has(row.id))
        throw new Error(`Duplicate organization: ${row.id}`);
      admitCash(row.liquidMinor, "organization cash", p("zero"));
      core.organizations.set(row.id, { ...row });
      index(
        core.organizationsByPlaceKind,
        `${row.placeId}:${row.kind}`,
        row.id,
      );
    },
    lookupPublicOrganization(personId, organizationId) {
      const row = core.publicOrganizations.get(organizationId);
      const actor = core.people.get(personId);
      if (!row || !actor)
        throw new Error(
          "Public lookup requires a recorded person and institution.",
        );
      api.observe(personId, {
        key: `organization:${row.id}:public`,
        value: row.name,
        learnedAt: core.date,
        sourceId: row.id,
        access: "public",
      });
      for (const [key, value] of Object.entries(row.facts ?? {}))
        api.observe(personId, {
          key: `organization:${row.id}:${key}`,
          value,
          learnedAt: core.date,
          sourceId: row.id,
          access: "public",
        });
      for (const staff of row.staff ?? []) {
        const person = core.people.get(staff.personId)!;
        api.observe(personId, {
          key: `person:${person.id}:public-role`,
          value: staff.title,
          learnedAt: core.date,
          sourceId: staff.jobId,
          access: "public",
        });
        api.observe(personId, {
          key: `person:${person.id}:name`,
          value: `${person.givenName} ${person.familyName}`,
          learnedAt: core.date,
          sourceId: staff.jobId,
          access: "public",
        });
      }
    },
    updateNeeds(personId, values) {
      const actor = core.people.get(personId);
      if (!actor) throw new Error("Need actor is absent.");
      for (const [id, value] of Object.entries(values))
        if (
          !core.data.needs.some((row) => row.id === id) ||
          !Number.isFinite(value) ||
          value < p("zero")
        )
          throw new Error(`Invalid current need: ${id}`);
      Object.assign(actor.needs, values);
    },
    updateGoal(personId, goal) {
      const actor = core.people.get(personId);
      if (
        !actor ||
        !Number.isFinite(goal.urgency) ||
        goal.urgency < p("zero") ||
        (goal.sourceDriveId && !actor.drives.has(goal.sourceDriveId))
      )
        throw new Error("Invalid actor goal.");
      actor.goals.set(goal.id, { ...goal });
    },
    updateDrive(personId, drive) {
      const actor = core.people.get(personId);
      if (
        !actor ||
        !Number.isFinite(drive.strength) ||
        drive.strength < p("zero") ||
        !core.eventIds.has(drive.sourceEventId) ||
        !api.knows(personId, `event:${drive.sourceEventId}:experienced`)
      )
        throw new Error(
          "Drive requires a learned source event and a finite strength.",
        );
      actor.drives.set(drive.id, { ...drive });
    },
    markOrganized(personId, topic) {
      if (!core.people.has(personId)) throw new Error("Organizer is absent.");
      index(core.organizedTopicsByPerson, personId, topic);
    },
    requestCallback(event) {
      const date = makeIsoDate(event.date);
      if (
        date < core.date ||
        event.personIds.some(
          (id) => !core.people.has(id) && !core.husks.has(id),
        )
      )
        throw new Error(
          "Callback requires current or future time and recorded people.",
        );
      core.pendingCallbacks.set(event.id, { ...event });
    },
  };
  writerAPIs.set(core, api);
  return api;
}

export function applyCoreEvent(core: CoreState, event: CoreEventInput): void {
  if (makeIsoDate(event.date) !== core.date)
    throw new Error(
      "Events enter on the current date; future inputs use the calendar queue.",
    );
  if (core.eventIds.has(event.id)) return;
  if (
    [event.moodImpulse, event.stressImpulse].some(
      (value) => value !== undefined && !Number.isFinite(value),
    )
  )
    throw new Error("Event appraisal inputs must be finite.");
  for (const id of [...event.personIds, ...(event.witnessIds ?? [])])
    if (!core.people.has(id) && !core.husks.has(id))
      throw new Error(`Event names an absent person: ${id}`);
  core.eventIds.add(event.id);
  retainLog(core, event);
  const api = coreAPI(core);
  for (const id of new Set([...(event.witnessIds ?? []), ...event.personIds])) {
    if (!core.people.has(id)) continue;
    api.observe(id, {
      key: `event:${event.id}:experienced`,
      value: event.id,
      learnedAt: event.date,
      sourceId: event.id,
      access: "perceived",
    });
    for (const [key, value] of Object.entries(event.facts ?? {}))
      api.observe(id, {
        key,
        value,
        learnedAt: event.date,
        sourceId: event.id,
        access: "perceived",
      });
  }
  const learnedBy = [
    ...new Set([...(event.witnessIds ?? []), ...event.personIds]),
  ].filter((id) => core.people.has(id));
  for (const module of core.modules.values())
    module.onEvent?.(api, event, learnedBy);
}

export function inspectPerson(
  core: CoreState,
  viewerId: string,
  targetId: string,
): { id: string; facts: readonly KnownFact[] } {
  if (!core.people.has(targetId) && !core.husks.has(targetId))
    throw new Error("Inspection target is absent.");
  const ownFacts = core.knowledgeByPerson.get(viewerId);
  if (!ownFacts) throw new Error("Inspection viewer is absent.");
  return {
    id: targetId,
    facts: [...ownFacts.values()].filter(
      (row) =>
        row.key.startsWith(`person:${targetId}:`) ||
        (targetId === viewerId && row.access === "self"),
    ),
  };
}

/** Explicit click-time admission checks every retained identity and family constraint. */
export function promoteHusk(core: CoreState, input: PersonInput): PersonState {
  const husk = core.husks.get(input.id);
  if (!husk) throw new Error("Promotion requires a recorded husk.");
  for (const field of [
    "givenName",
    "familyName",
    "placeId",
    "countyId",
  ] as const)
    if (husk[field] !== input[field])
      throw new Error(`Promotion contradicts ${field}.`);
  if (husk.birthDate && husk.birthDate !== input.birthDate)
    throw new Error("Promotion contradicts birth date.");
  if (husk.familyIds?.some((id) => !input.familyIds.includes(id)))
    throw new Error("Promotion removes established family.");
  if (!core.households.get(input.householdId)?.memberIds.includes(input.id))
    throw new Error("Promotion requires a consistent household.");
  if (input.familyIds.some((id) => id === input.id || !core.people.has(id)))
    throw new Error("Promotion requires existing family members.");
  if (input.knownIds.some((id) => !core.people.has(id) && !core.husks.has(id)))
    throw new Error("Promotion requires recorded contacts.");
  const job = input.jobId ? core.jobs.get(input.jobId) : undefined;
  if (input.jobId && (!job || job.personId !== input.id))
    throw new Error("Promotion requires an owned job.");
  const actor = admitPerson(core, {
    ...input,
    said: husk.said,
    looks: husk.looks,
  });
  const api = coreAPI(core);
  for (const id of actor.familyIds)
    api.relationship(actor.id, id, "family", api.parameter("relationInitial"));
  for (const id of actor.knownIds) {
    const other = core.people.get(id) ?? core.husks.get(id)!;
    api.observe(actor.id, {
      key: `person:${id}:name`,
      value: `${other.givenName} ${other.familyName}`,
      ...initialNameProvenance(core, actor, id),
      access: "perceived",
    });
  }
  if (job) {
    api.observe(actor.id, {
      key: `job:${job.id}:pay`,
      value: String(job.wageDailyMinor),
      learnedAt: core.date,
      sourceId: job.id,
      access: "self",
    });
    api.observe(actor.id, {
      key: `organization:${job.organizationId}:public`,
      value: job.organizationId,
      learnedAt: core.date,
      sourceId: job.id,
      access: "perceived",
    });
  }
  core.husks.delete(input.id);
  return actor;
}

export function assertCoreIntegrity(core: CoreState): void {
  const fail = (condition: boolean, what: string) => {
    if (!condition) throw new Error(`Core invariant failed: ${what}`);
  };
  for (const actor of core.people.values()) {
    fail(
      core.peopleByTier.get(actor.tier)?.has(actor.id) === true,
      `tier:${actor.id}`,
    );
    fail(
      core.peopleByPlace.get(actor.placeId)?.has(actor.id) === true,
      `place:${actor.id}`,
    );
    if (actor.countyId)
      fail(
        core.peopleByPlace.get(actor.countyId)?.has(actor.id) === true,
        `county:${actor.id}`,
      );
  }
  for (const [id, row] of core.work.commitments) {
    fail(
      core.jobs.get(row.jobId)?.personId === row.personId &&
        core.jobs.get(row.jobId)?.organizationId === row.organizationId &&
        core.work.commitmentsByPerson.get(row.personId)?.has(id) === true,
      `work-commitment:${id}`,
    );
  }
  for (const [personId, ids] of core.work.commitmentsByPerson)
    for (const id of ids)
      fail(
        core.work.commitments.get(id)?.personId === personId,
        `work-person-index:${id}`,
      );
  for (const [period, residues] of core.work.byPeriodResidue)
    for (const ids of residues.values())
      for (const id of ids)
        fail(
          core.work.commitments.get(id)?.periodDays === period,
          `work-calendar-index:${id}`,
        );
  for (const [jobId, row] of core.work.lastResultByJob)
    fail(
      core.work.commitments.get(row.commitmentId)?.jobId === jobId &&
        row.paidMinor <= row.requestedMinor &&
        row.shortfallMinor === row.requestedMinor - row.paidMinor &&
        row.date <= core.date,
      `work-result:${jobId}`,
    );
  for (const [tier, ids] of core.peopleByTier)
    for (const id of ids)
      fail(core.people.get(id)?.tier === tier, `stale-tier:${id}`);
  for (const [id, row] of core.memberships)
    fail(
      core.membershipsByPerson.get(row.personId)?.has(id) === true &&
        core.people.has(row.personId) &&
        (core.organizations.has(row.organizationId) ||
          core.publicOrganizations.has(row.organizationId)),
      `membership:${id}`,
    );
  for (const [id, row] of core.durableLog) {
    fail(
      core.logByKind.get(row.kind)?.has(id) === true &&
        core.logByPlace.get(row.placeId)?.has(id) === true,
      `log:${id}`,
    );
    for (const actorId of row.personIds)
      fail(core.logByPerson.get(actorId)?.has(id) === true, `log-person:${id}`);
  }
}
