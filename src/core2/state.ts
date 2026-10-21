import { initialPersonState } from "./person-state";
import { closenessAfter, openingClosenessHours } from "./closeness";
import { validateCompactChoice } from "./compact-choice";
import { bookkeeping } from "./bookkeeping";
import { queueDecisionDetail } from "./decision-detail";
export { condenseCircleDecisions } from "./decision-detail";
import { buildDeepPast } from "./deep-past";
import { publicPayTreasuries } from "./public-work-pay";
import {
  countedJob,
  peerCohortSize,
  residentsRuntime,
  enterResidentMarket,
  countedSinceOpening,
  releaseResidentHousehold,
  residentPerson,
  takeResidentHousehold,
} from "./modules/residents";
import { rerateCountedJobs } from "./residents-economy";
import { endPurchaseTax, setPurchaseTax } from "./modules/purchase-tax";
import { openingTemperaments } from "./opening-personality";
import { giveHealthRecord } from "./modules/health";
import { COUNTED_PLACE_PREFIX, isDemoted } from "./counted-groups";
import {
  prepareModuleState,
  installModuleState,
  moduleState,
} from "./module-state";
import { moduleCalendar } from "./module-calendar";
import { accountsFacade } from "./accounts";
import {
  emptyWorkRuntime,
  admitWorkCommitment,
  settleWorkResult,
  recordActivityTime,
  recordDiscretionaryTime,
} from "./work-state";
import {
  admitWorkAttendanceOwner,
  admitWorkPayrollCalendar,
  recordWorkAttendance,
} from "./work-attendance";
import { settleWorkPayrollAndNotify } from "./work-payroll-dispatch";
import {
  endRecordedJob,
  startRecordedJob,
  startSalariedPost,
} from "./job-lifecycle";
import {
  emptyFinanceRuntime,
  financeIndex,
  admitFinanceContract,
  preflightOpeningSalesBudgets,
  prepareFinanceProcurement,
  admitCreditFacility,
  repriceCreditFacility,
  moveHouseholdPayers,
  attachBusinessCredit,
  endStandingContract,
  setStandingContractAmount,
  reduceStandingArrears,
  carryStandingArrears,
  admitBusinessBooks,
  admitFinanceCondition,
  settleFinanceContract,
  retireFinanceBudget,
  transferCredit,
  reviewBusiness,
  closeBusinessByChoice,
  closeEmployer,
  finishFinanceDay,
} from "./finance-state";
import {
  preflightModuleNotifications,
  registerModuleNotifications,
  subscribeEventAppraisals,
  subscribeRelationshipChanges,
  beginEventNotifications,
  publishEventAppraisal,
  notifyRelationshipChange,
} from "./module-notifications";
import {
  emptyCashJournalRuntime,
  postCashJournal,
  completeCashJournalSource,
  registerCashAccount as admitCashAccountMetadata,
  registerCashJournalSourceProviders,
  releaseCashJournalSource,
} from "./journal-state";
import { cashJournalHost } from "./cash-host";
import { settleLegacyWorkResultJournal } from "./work-cash";
import { admitPublicPayAuthority } from "./public-work-pay";
import type { CashJournalSourceRef } from "./journal";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { moveLivingShare } from "./cost-of-living";
import { CORE_API_VERSION, CORE_SCHEMA_VERSION, DEFAULT_DATA } from "./data";
import { parameter, parameterValues } from "./parameters";
import {
  isExplicitlyControlledPersonV1,
  prepareControlledActTraceV1,
} from "./player-control-state-v1";
import { stopgap } from "./stopgaps";
import { initialFocusPeople } from "./focus";
import { nativityFact } from "./nativity";
import type {
  ActOffer,
  CompactChoiceTraceV1,
  DecisionResult,
  CoreAPI,
  CoreData,
  CoreEventInput,
  CoreEventListener,
  CoreInput,
  CoreModule,
  CoreState,
  KnownFact,
  LogRecord,
  PersonId,
  PersonInput,
  PersonState,
  Relationship,
  RelationshipChangeEvidence,
  RelationshipMeasureChange,
  Source,
  IsoDate,
  PlaceId,
} from "./types";

// Exact successful factory identity, private to this module. No caller can admit a host.
const actualCore = new WeakSet<CoreState>(),
  nativeFactoryCoreAdd = WeakSet.prototype.add,
  nativeFactoryCoreHas = WeakSet.prototype.has;

/** Part1b boundary only; legacy writer/fixture hosts keep their existing contracts. */
export function assertFactoryCoreV1(core: CoreState): void {
  if (!nativeFactoryCoreHas.call(actualCore, core))
    throw new Error("Part1b requires its actual factory-owned core.");
}

const freezeRelationshipEvidence = Object.freeze,
  defineRelationshipEvidence = Object.defineProperty,
  createRelationshipEvidence = Object.create;

// Copy original evidence before changing a tie; do not invoke caller getters or retain aliases.
function copyRelationshipEvidence<T>(value: T, active = new Set<object>()): T {
  // Play keeps the caller's freshly built evidence; bookkeeping copies and freezes it.
  if (!bookkeeping()) return value;
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "boolean"
  )
    return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || active.has(value))
    throw new Error("Invalid relationship evidence value or cycle.");
  const array = Array.isArray(value),
    prototype = Object.getPrototypeOf(value);
  if (
    prototype !== (array ? Array.prototype : Object.prototype) &&
    prototype !== null
  )
    throw new Error("Relationship evidence requires plain saved data.");
  if (array) {
    const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
    if (
      prototype !== Array.prototype ||
      !Number.isSafeInteger(length) ||
      length < 0 ||
      Reflect.ownKeys(value).length !== length + 1
    )
      throw new Error(
        "Relationship evidence arrays must be ordinary dense arrays.",
      );
    for (let index = 0; index < length; index++)
      if (!Object.prototype.hasOwnProperty.call(value, String(index)))
        throw new Error(
          "Relationship evidence array has a missing recorded element.",
        );
  }
  active.add(value);
  const result = array ? [] : createRelationshipEvidence(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string")
      throw new Error("Invalid relationship evidence key.");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor))
      throw new Error("Relationship evidence requires own data fields.");
    if (array && key === "length") continue;
    defineRelationshipEvidence(result, key, {
      value: copyRelationshipEvidence(descriptor.value, active),
      enumerable: descriptor.enumerable,
    });
  }
  active.delete(value);
  return freezeRelationshipEvidence(result) as T;
}

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

/** Source-derived metadata identity; undefined allocation is the owner's one residual. */
function admitOwnerCashAccount(
  core: CoreState,
  owner: { id: string; source: Source },
): void {
  admitCashAccountMetadata(core.cashJournal, cashJournalHost(core), {
    id: "cash:" + owner.id + ":residual",
    ownerId: owner.id,
    name: owner.id,
    source: owner.source,
    ...(core.organizations.get(owner.id)?.outsideFlow
      ? { outsideFlow: true as const }
      : {}),
  });
}

/** Opening family ties: closeness from the kind of tie (P15 part 2). */
const OPENING_FAMILY_CAUSE = "opening-family";

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
    finance: emptyFinanceRuntime(date),
    cashJournal: emptyCashJournalRuntime(
      Object.freeze(parameterValues(data.parameters)),
    ),
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
    quietChoices: new Map(),
    quietChoiceByPerson: new Map(),
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
    reasonProviders: new Map(),
    eventSubscribers: new Map(),
    eventSubscribersByKind: new Map(),
    eventAppraisalSubscribers: new Map(),
    eventAppraisalSubscribersByKind: new Map(),
    relationshipSubscribers: new Map(),
    relationshipSubscribersByKind: new Map(),
  };
  admitWorkAttendanceOwner(core);
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
    if (row.endsAt !== undefined && makeIsoDate(row.endsAt) > core.date)
      throw new Error(
        `Opening job end cannot be a future completed fact: ${row.id}`,
      );
    core.jobs.set(row.id, { ...row });
    financeIndex(core.finance.jobsByOrganization, row.organizationId, row.id);
  }
  for (const row of input.workCommitments ?? []) api.addWorkCommitment(row);
  for (const row of input.workPayrollCalendars ?? [])
    api.addWorkPayrollCalendar(row);
  const openingFinanceBooks = preflightOpeningSalesBudgets(
    core,
    api,
    input.finance,
  );
  for (const row of input.finance?.facilities ?? []) api.addCreditFacility(row);
  for (const row of input.finance?.contracts ?? [])
    admitFinanceContract(
      core,
      api,
      row,
      openingFinanceBooks.get(row.payerIds[p("zero")]!),
    );
  for (const row of input.finance?.businesses ?? []) api.addBusinessBooks(row);
  for (const row of input.finance?.conditions ?? [])
    api.addFinanceCondition(row);
  for (const gap of input.finance?.gaps ?? []) core.gaps.add(gap);
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
    api.stopgap("SG-P8-opening-family-closeness");
    if (!core.households.get(actor.householdId)?.memberIds.includes(actor.id))
      throw new Error(`Person has no consistent household: ${actor.id}`);
    for (const id of actor.familyIds) {
      // Relatives in the counts are husks until met (two-level population).
      if (!core.people.has(id) && !core.husks.has(id))
        throw new Error(`Absent family member: ${id}`);
      const relationshipId = [actor.id, id].sort().join(":");
      if (!core.relationships.has(relationshipId))
        api.relationship(
          actor.id,
          id,
          "family",
          openingClosenessHours(core, actor.id, id),
          undefined,
          { cause: OPENING_FAMILY_CAUSE },
        );
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
    if (
      actor.jobId &&
      (!job || job.personId !== actor.id || job.endsAt !== undefined)
    )
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
  const restoredModules = new Set<string>();
  for (const snapshot of input.moduleState ?? []) {
    if (restoredModules.has(snapshot.moduleId))
      throw new Error("Duplicate opening module snapshot.");
    moduleState(core, snapshot.moduleId).restore(snapshot);
    restoredModules.add(snapshot.moduleId);
  }
  assertCoreIntegrity(core);
  nativeFactoryCoreAdd.call(actualCore, core);
  return core;
}

function admitPerson(core: CoreState, row: PersonInput): PersonState {
  const p = (key: string) => parameter(key, core.data.parameters);
  if (core.people.has(row.id) || core.organizations.has(row.id))
    throw new Error(`Duplicate cash endpoint/person: ${row.id}`);
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
  const actor = initialPersonState(core, row);
  core.people.set(row.id, actor);
  try {
    admitOwnerCashAccount(core, actor);
  } catch (error) {
    // Account admission performs all validation before its own first metadata write.
    // Keep a failed new person out of every person/place/tier/knowledge index.
    core.people.delete(row.id);
    throw error;
  }
  index(core.peopleByPlace, row.placeId, row.id);
  if (row.countyId) index(core.peopleByPlace, row.countyId, row.id);
  index(core.peopleByTier, row.tier, row.id);
  core.knowledgeByPerson.set(row.id, new Map());
  return actor;
}

export function registerModule(core: CoreState, module: CoreModule): void {
  if (!module.id.trim()) throw new Error("Module identity is empty.");
  const preparedState = prepareModuleState(module);
  if (
    module.onCalendarWork !== undefined &&
    typeof module.onCalendarWork !== "function"
  )
    throw new Error("Invalid institutional calendar handler.");
  if (core.modules.has(module.id))
    throw new Error(`Duplicate module: ${module.id}`);
  if (module.onEvent && !module.eventKinds)
    throw new Error(
      "Event handlers require explicit event-kind subscriptions.",
    );
  if (module.eventKinds && !module.onEvent)
    throw new Error("Event-kind subscriptions require a handler.");
  if (module.onEvent)
    preflightEventSubscription(
      core,
      `module:${module.id}`,
      module.eventKinds!,
      module.onEvent,
    );
  preflightModuleNotifications(core, module);
  for (const [name, provider] of Object.entries(module.reasonProviders ?? {})) {
    if (!name.trim() || typeof provider !== "function")
      throw new Error("Invalid reason provider.");
    if (core.reasonProviders.has(name))
      throw new Error(`Duplicate reason provider: ${name}`);
  }
  const journalProviders = Object.entries(module.journalSourceProviders ?? {});
  for (const [kind, provider] of journalProviders) {
    if (!kind.trim() || kind !== kind.trim() || typeof provider !== "function")
      throw new Error("Invalid journal source provider.");
    if (core.cashJournal.sourceProviders.has(kind))
      throw new Error(`Duplicate journal source provider: ${kind}`);
  }
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
  // Every module/subscription/reason/operation/journal key is valid before installation.
  // Capture the canonical cached API, not a copied state or a caller-provided facade.
  const api = coreAPI(core);
  registerCashJournalSourceProviders(
    core.cashJournal,
    Object.fromEntries(
      journalProviders.map(([kind, provider]) => [
        kind,
        (reference: Readonly<CashJournalSourceRef>) => provider(api, reference),
      ]),
    ),
  );
  if (module.onEvent)
    subscribeEvents(
      core,
      `module:${module.id}`,
      module.eventKinds!,
      module.onEvent,
    );
  registerModuleNotifications(core, module);
  core.modules.set(module.id, module);
  installModuleState(core, preparedState);
  for (const [name, provider] of Object.entries(module.reasonProviders ?? {}))
    core.reasonProviders.set(name, provider);
}

function preflightEventSubscription(
  core: CoreState,
  id: string,
  kinds: readonly string[],
  listener: CoreEventListener,
): void {
  if (
    !id.trim() ||
    typeof listener !== "function" ||
    !kinds.length ||
    kinds.some((kind) => !kind.trim() || kind !== kind.trim())
  )
    throw new Error("Invalid event subscription.");
  if (core.eventSubscribers.has(id))
    throw new Error(`Duplicate event subscriber: ${id}`);
}

function subscribeEvents(
  core: CoreState,
  id: string,
  kinds: readonly string[],
  listener: CoreEventListener,
): () => void {
  preflightEventSubscription(core, id, kinds, listener);
  const uniqueKinds = new Set(kinds);
  let active = true;
  core.eventSubscribers.set(id, listener);
  for (const kind of uniqueKinds) index(core.eventSubscribersByKind, kind, id);
  return () => {
    if (!active) return;
    active = false;
    if (core.eventSubscribers.get(id) !== listener) return;
    core.eventSubscribers.delete(id);
    for (const kind of uniqueKinds) {
      const ids = core.eventSubscribersByKind.get(kind);
      ids?.delete(id);
      if (!ids?.size) core.eventSubscribersByKind.delete(kind);
    }
  };
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
    (id) =>
      core.focusPersonIds.has(id) ||
      id === core.playerId ||
      (event.kind === "person.acted" &&
        event.actorId === id &&
        isExplicitlyControlledPersonV1(core, id)),
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
  // The player's own reasons are kept whole; the circle's are condensed once
  // they're older than the detail window (condenseCircleDecisions).
  if (row.decision && row.actorId !== core.playerId)
    queueDecisionDetail(core, core.date, row.id);
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

/** Read-only inspection helper. Normal providers use direct fact lookups. */
export function knownPublicOrganizationIds(
  core: Readonly<CoreState>,
  personId: string,
): ReadonlySet<string> {
  const facts = core.knowledgeByPerson.get(personId);
  if (!facts) return noPublicKnowledgeIds;
  const ids = new Set<string>();
  for (const [key, fact] of facts) {
    const id = publicOrganizationId(key);
    if (fact && id !== undefined) ids.add(id);
  }
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
  const journalHost = cashJournalHost(core);
  const api: CoreAPI = {
    addBornPersonV1(input, parents, relations) {
      const zero = parameter("zero", core.data.parameters);
      const household = core.households.get(input.householdId);
      if (
        input.birthDate !== core.date ||
        input.liquidMinor !== zero ||
        input.livingCostDailyMinor !== zero ||
        input.jobId !== undefined ||
        parents[0] === parents[1] ||
        !household ||
        household.placeId !== input.placeId ||
        household.memberIds.includes(input.id) ||
        core.husks.has(input.id) ||
        parents.some(
          (id) =>
            !core.people.has(id) ||
            core.people.get(id)!.householdId !== input.householdId ||
            !household.memberIds.includes(id),
        ) ||
        relations.some(
          (row) => row.otherId === input.id || !core.people.has(row.otherId),
        ) ||
        new Set(relations.map((row) => row.otherId)).size !==
          relations.length ||
        input.familyIds.some(
          (id) => !relations.some((row) => row.otherId === id),
        ) ||
        relations.some((row) => !input.familyIds.includes(row.otherId)) ||
        new Set(input.familyIds).size !== input.familyIds.length ||
        parents.some(
          (id) =>
            !relations.some(
              (row) =>
                row.otherId === id &&
                row.relation === "parent" &&
                row.inverse === "child",
            ),
        ) ||
        input.knownIds.some((id) => !core.people.has(id))
      )
        throw new Error("Invalid newborn family admission.");
      const links = parents.map((parentId) => ({
        id: `${input.id}:parent:${parentId}`,
        kind: "parent-child" as const,
        personIds: [parentId, input.id] as const,
      }));
      if (links.some((row) => core.familyLinks.has(row.id)))
        throw new Error("Duplicate newborn parent link.");
      // admitPerson validates identity, cash, tier, traits and knowledge before indexing.
      const child = admitPerson(core, input);
      core.households.set(household.id, {
        ...household,
        memberIds: [...household.memberIds, child.id],
      });
      for (const link of links) core.familyLinks.set(link.id, link);
      for (const row of relations) {
        const relative = core.people.get(row.otherId)!;
        relative.familyIds.add(child.id);
        relative.pastFacts = [
          ...(relative.pastFacts ?? []),
          {
            id: `${child.id}:kin:${relative.id}:inverse`,
            date: core.date,
            kind: `family:${row.inverse}`,
            summary: row.inverse,
            source: input.source,
            facts: { otherPersonId: child.id },
          },
        ];
        api.relationship(child.id, relative.id, "family", zero);
      }
      // Names are learned by household adults from the birth, never by the infant.
      for (const parentId of parents) {
        const parent = core.people.get(parentId)!;
        if (!parent.alive) continue;
        parent.knownIds.add(child.id);
        api.observe(parentId, {
          key: `person:${child.id}:name`,
          value: `${child.givenName} ${child.familyName}`,
          learnedAt: core.date,
          sourceId: `${child.id}:birth`,
          access: "perceived",
        });
      }
      return child;
    },
    moduleState: (moduleId) => moduleState(core, moduleId),
    moduleCalendar: (moduleId) => moduleCalendar(core, moduleId),
    accounts: () => accountsFacade(core, api),
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
    },
    knows: (personId, key) => core.knowledgeByPerson.get(personId)?.get(key),
    postJournal(input) {
      return postCashJournal(core.cashJournal, journalHost, input);
    },
    completeJournalSource(reference) {
      return completeCashJournalSource(
        core.cashJournal,
        journalHost,
        reference,
      );
    },
    registerCashAccount(input) {
      admitCashAccountMetadata(core.cashJournal, journalHost, input);
    },
    releaseJournalSource(reference) {
      releaseCashJournalSource(core.cashJournal, reference);
    },
    addWorkCommitment(row) {
      admitWorkCommitment(core, api, row);
    },
    addFinanceContract(row) {
      admitFinanceContract(core, api, row);
    },
    addFinanceCondition(row) {
      admitFinanceCondition(core, api, row);
    },
    addCreditFacility(row) {
      admitCreditFacility(core, api, row);
    },
    reduceStandingArrears(id, paidMinor) {
      reduceStandingArrears(core, api, id, paidMinor);
    },
    carryStandingArrears(id, owedMinor, since) {
      carryStandingArrears(core, api, id, owedMinor, since);
    },
    setStandingContractAmount(id, amountMinor) {
      setStandingContractAmount(core, api, id, amountMinor);
    },
    endStandingContract(id) {
      endStandingContract(core, api, id);
    },
    attachBusinessCredit(id, facilityId) {
      attachBusinessCredit(core, api, id, facilityId);
    },
    startJob(job, commitment, calendar) {
      startRecordedJob(core, api, job, commitment, calendar);
    },
    endJob(id, sourceId) {
      endRecordedJob(core, api, id, sourceId);
    },
    startSalariedPost(job) {
      startSalariedPost(core, api, job);
    },
    repriceCreditFacility(id, rate, source) {
      repriceCreditFacility(core, api, id, rate, source);
    },
    addBusinessBooks(row) {
      admitBusinessBooks(core, api, row);
    },
    settleFinanceContract(id) {
      return settleFinanceContract(core, api, id);
    },
    retireFinanceBudget(id) {
      retireFinanceBudget(core, api, id);
    },
    prepareFinanceProcurement(ids) {
      prepareFinanceProcurement(core, api, ids);
    },
    drawCredit(id, minor, reason, sourceId) {
      return transferCredit(core, api, id, minor, reason, sourceId);
    },
    repayCredit(id, minor, reason, sourceId) {
      return transferCredit(core, api, id, minor, reason, sourceId, true);
    },
    reviewBusiness(id) {
      reviewBusiness(core, api, id);
    },
    closeBusinessByChoice(input) {
      return closeBusinessByChoice(core, api, input);
    },
    setPurchaseTax(input) {
      setPurchaseTax(core, input);
    },
    endPurchaseTax(id) {
      endPurchaseTax(core, id);
    },
    closeEmployer(id, sourceId, reason) {
      return closeEmployer(core, api, id, sourceId, reason);
    },
    finishFinanceDay() {
      finishFinanceDay(core, api);
    },
    addWorkPayrollCalendar(row) {
      admitWorkPayrollCalendar(core, api, row);
    },
    recordWorkAttendance(row) {
      return recordWorkAttendance(core, api, row);
    },
    settleWorkPayroll(id) {
      return settleWorkPayrollAndNotify(core, api, id);
    },
    settleWorkResult(row) {
      return settleWorkResult(core, api, row);
    },
    settleLegacyWorkResult(row) {
      return settleLegacyWorkResultJournal(core, api, row);
    },
    recordActivityTime(personId, category, minutes, source) {
      recordActivityTime(core, api, personId, category, minutes, source);
    },
    recordDiscretionaryTime(personId, minutes) {
      recordDiscretionaryTime(core, api, personId, minutes);
    },
    relationship(actorId, otherId, kind, change, decision, reason) {
      if (
        !core.people.has(actorId) ||
        (!core.people.has(otherId) &&
          !(
            core.husks.has(otherId) &&
            (core.people.get(actorId)?.familyIds.has(otherId) ||
              core.people.get(actorId)?.knownIds.has(otherId))
          )) ||
        actorId === otherId ||
        !Number.isFinite(change)
      )
        throw new Error("Invalid relationship endpoints or change.");
      if (
        reason &&
        (typeof reason.cause !== "string" ||
          !reason.cause.trim() ||
          (reason.sourceId !== undefined &&
            (typeof reason.sourceId !== "string" || !reason.sourceId.trim())))
      )
        throw new Error("Invalid relationship change reason.");
      const id = [actorId, otherId].sort().join(":");
      const previous = core.relationships.get(id);
      const beforeLevel = previous?.level ?? p("zero");
      const beforeContactDate = previous?.lastContactDate;
      const row: Relationship = previous ?? {
        id,
        actorId,
        otherId,
        kind,
        level: p("zero"),
        lastContactDate: core.date,
      };
      const at = core.date,
        // P15: `change` is hours of time together; closeness fades between contacts.
        nextLevel = closenessAfter(core, previous, row.kind, change),
        actualActor = core.people.get(actorId),
        actualOther = core.people.get(otherId) ?? core.husks.get(otherId),
        storedKind = row.kind;
      const originalDecision =
        decision === undefined ? undefined : copyRelationshipEvidence(decision);
      const selected = originalDecision?.selected,
        compact = originalDecision?.compactChoice;
      if (compact) {
        validateCompactChoice(compact);
        const reasons = originalDecision!.selectedReasons;
        if (
          !reasons ||
          Object.keys(reasons).length !==
            Object.keys(compact.chosen.contributions).length ||
          Object.keys(reasons).some(
            (key) =>
              reasons[key as keyof typeof reasons] !==
              compact.chosen.contributions[key as keyof typeof reasons],
          )
        )
          throw new Error(
            "Relationship compact choice differs from its selected reasons.",
          );
      }
      if (
        originalDecision &&
        (originalDecision.actorId !== actorId ||
          originalDecision.date !== at ||
          !selected?.definition?.id ||
          selected.targetId !== otherId ||
          typeof originalDecision.reasonKey !== "string" ||
          !originalDecision.reasonKey.trim() ||
          (compact &&
            (compact.version !== "core2-compact-choice-v1" ||
              compact.actorId !== actorId ||
              compact.date !== at ||
              compact.chosen?.actionId !== selected.definition.id ||
              compact.chosen?.targetId !== otherId)))
      )
        throw new Error(
          "Invalid relationship decision identity, date or selected target.",
        );
      const fullTrace =
        core.observer ||
        actorId === core.playerId ||
        core.focusPersonIds.has(actorId) ||
        isExplicitlyControlledPersonV1(core, actorId);
      const savedDecision = !originalDecision
        ? undefined
        : fullTrace
          ? originalDecision
          : copyRelationshipEvidence({
              actorId,
              date: at,
              reasonKey: originalDecision.reasonKey,
              ...(originalDecision.selectedReasons
                ? { selectedReasons: originalDecision.selectedReasons }
                : {}),
              ...(!compact && originalDecision.selectedReasonTerms
                ? { selectedReasonTerms: originalDecision.selectedReasonTerms }
                : {}),
              ...(compact ? { compactChoice: compact } : {}),
              ...(originalDecision.controlledChoice
                ? { controlledChoice: originalDecision.controlledChoice }
                : {}),
            });
      const retainRelationshipEvidence =
        fullTrace ||
        otherId === core.playerId ||
        core.focusPersonIds.has(otherId) ||
        isExplicitlyControlledPersonV1(core, otherId);
      const latestChange = retainRelationshipEvidence
        ? copyRelationshipEvidence({
            version: "core2-relationship-change-v1",
            date: at,
            actorId,
            otherId,
            kind: row.kind,
            requestedKind: kind,
            requestedChange: change,
            created: previous === undefined,
            before: {
              level: beforeLevel,
              ...(beforeContactDate === undefined
                ? {}
                : { lastContactDate: beforeContactDate }),
            },
            after: { level: nextLevel, lastContactDate: at },
            cause: originalDecision
              ? "chosen-act"
              : "recorded-relationship-update",
            ...(selected ? { actionId: selected.definition.id } : {}),
            sourceRecordRefs: [
              { kind: "person", id: actorId },
              { kind: "person", id: otherId },
            ],
            ...(savedDecision ? { decision: savedDecision } : {}),
            ...(reason
              ? {
                  reason: {
                    cause: reason.cause,
                    ...(reason.sourceId === undefined
                      ? {}
                      : { sourceId: reason.sourceId }),
                  },
                }
              : {}),
          } satisfies RelationshipChangeEvidence)
        : undefined;
      if (
        core.date !== at ||
        core.people.get(actorId) !== actualActor ||
        (core.people.get(otherId) ?? core.husks.get(otherId)) !== actualOther ||
        core.relationships.get(id) !== previous ||
        row.level !== beforeLevel ||
        row.lastContactDate !== (beforeContactDate ?? at) ||
        row.kind !== storedKind
      )
        throw new Error("Stale relationship change basis.");
      api.stopgap("SG-P8-relationship-closeness-update");
      row.level = nextLevel;
      row.lastContactDate = at;
      row.latestChange = latestChange;
      core.relationships.set(id, row);
      index(core.relationshipsByPerson, actorId, id);
      index(core.relationshipsByPerson, otherId, id);
      if (actorId === core.playerId) core.focusPersonIds.add(otherId);
      if (otherId === core.playerId) core.focusPersonIds.add(actorId);
      if (!core.relationshipSubscribers.size) return;
      const changes: RelationshipMeasureChange[] = [];
      if (!previous || beforeLevel !== row.level)
        changes.push({
          measure: "level",
          before: beforeLevel,
          after: row.level,
        });
      if (beforeContactDate !== row.lastContactDate)
        changes.push({
          measure: "lastContactDate",
          before: beforeContactDate,
          after: row.lastContactDate,
        });
      notifyRelationshipChange(core, api, {
        date: core.date,
        relationshipId: id,
        actorId,
        otherId,
        kind: row.kind,
        requestedKind: kind,
        created: previous === undefined,
        changes,
        ...(reason ? { reason } : {}),
      });
    },
    meet(actorId, otherId, encounter) {
      const actor = core.people.get(actorId);
      const other = core.people.get(otherId);
      if (!actor || !other || actorId === otherId)
        throw new Error("Invalid meeting endpoints.");
      if (!encounter.placeId.trim() || !encounter.sourceId.trim())
        throw new Error("A meeting needs its place and its record.");
      if (!Number.isFinite(encounter.hours) || encounter.hours < p("zero"))
        throw new Error("Invalid meeting hours.");
      if (actor.knownIds.has(otherId) && other.knownIds.has(actorId))
        return false;
      for (const [self, peer] of [
        [actor, other],
        [other, actor],
      ] as const) {
        self.knownIds.add(peer.id);
        api.observe(self.id, {
          key: `person:${peer.id}:name`,
          value: `${peer.givenName} ${peer.familyName}`,
          learnedAt: core.date,
          sourceId: encounter.sourceId,
          access: "perceived",
        });
        api.observe(self.id, {
          key: `person:${peer.id}:met`,
          value: encounter.placeId,
          learnedAt: core.date,
          sourceId: encounter.sourceId,
          access: "perceived",
        });
      }
      api.relationship(
        actorId,
        otherId,
        "contact",
        encounter.hours,
        undefined,
        {
          cause: encounter.cause,
          sourceId: encounter.sourceId,
        },
      );
      return true;
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
    leave(personId, organizationId) {
      const id = `${personId}:${organizationId}`;
      if (!core.memberships.delete(id)) return;
      core.membershipsByPerson.get(personId)?.delete(id);
    },
    emit(event) {
      applyCoreEvent(core, event);
    },
    subscribeEvents(id, kinds, listener) {
      if (!id.trim() || id !== id.trim())
        throw new Error("Invalid event subscriber identity.");
      return subscribeEvents(core, `consumer:${id}`, kinds, listener);
    },
    publishEventAppraisal(appraisal) {
      publishEventAppraisal(core, api, appraisal);
    },
    subscribeEventAppraisals(id, kinds, listener) {
      if (!id.trim() || id !== id.trim())
        throw new Error("Invalid appraisal subscriber identity.");
      return subscribeEventAppraisals(core, `consumer:${id}`, kinds, listener);
    },
    subscribeRelationshipChanges(id, kinds, listener) {
      if (!id.trim() || id !== id.trim())
        throw new Error("Invalid relationship subscriber identity.");
      return subscribeRelationshipChanges(
        core,
        `consumer:${id}`,
        kinds,
        listener,
      );
    },
    validateAct(actorId, offer, date, reason) {
      validateCommittedAct(core, actorId, offer, date, reason);
    },
    recordAct(actorId, offer, date, reason) {
      const controlled = isExplicitlyControlledPersonV1(core, actorId),
        prepared = controlled
          ? prepareControlledActTraceV1(core, actorId, offer, date, reason)
          : undefined;
      if (prepared) {
        offer = prepared.offer;
        reason = prepared.decision;
      }
      validateCommittedAct(core, actorId, offer, date, reason);
      if (makeIsoDate(date) !== core.date)
        throw new Error("Acts must be recorded on the current date.");
      const actor = prepared?.actor ?? core.people.get(actorId);
      if (!actor) throw new Error("Act actor is absent.");
      const fullTrace =
        core.observer ||
        core.focusPersonIds.has(actorId) ||
        actorId === core.playerId ||
        controlled;
      const originalCount = actor.actCount,
        originalDate = core.date;
      // Dropping outsider storage does not waive admission of supplied evidence.
      const decisionPrototype = Object.getPrototypeOf(reason);
      if (decisionPrototype !== Object.prototype && decisionPrototype !== null)
        throw new Error("Saved compact choice requires an ordinary decision.");
      const compactDescriptor = Object.getOwnPropertyDescriptor(
        reason,
        "compactChoice",
      );
      if (compactDescriptor && !("value" in compactDescriptor))
        throw new Error("Saved compact choice requires an own data field.");
      const compact =
        !fullTrace && compactDescriptor?.value !== undefined
          ? copyRelationshipEvidence(
              compactDescriptor.value as Readonly<CompactChoiceTraceV1>,
            )
          : undefined;
      if (compact) {
        validateCompactChoice(compact);
        const contributions = reason.selectedReasons;
        if (
          compact.actorId !== actorId ||
          compact.date !== date ||
          compact.chosen.actionId !== offer.definition.id ||
          compact.chosen.targetId !== offer.targetId ||
          compact.chosen.driveId !== offer.driveId ||
          compact.chosen.availableHours !== offer.availableHours ||
          compact.chosen.effortHours !==
            (offer.effortHours ?? p(offer.definition.effortParameter)) ||
          !contributions ||
          Object.keys(contributions).length !==
            Object.keys(compact.chosen.contributions).length ||
          Object.keys(contributions).some(
            (key) =>
              contributions[key as keyof typeof contributions] !==
              compact.chosen.contributions[key as keyof typeof contributions],
          )
        )
          throw new Error(
            "Saved quiet choice differs from its actual committed selection.",
          );
      }
      const committedId = `act:${date}:${actorId}:${originalCount + p("one")}`;
      if (
        core.date !== originalDate ||
        core.people.get(actorId) !== actor ||
        actor.actCount !== originalCount
      )
        throw new Error("Stale saved quiet choice basis.");
      prepared?.verify();
      actor.lastChoice = offer.definition.id;
      actor.lastReason = reason.reasonKey;
      actor.actCount += p("one");
      actor.actsByKind.set(
        offer.definition.id,
        (actor.actsByKind.get(offer.definition.id) ?? p("zero")) + p("one"),
      );
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
      if (fullTrace)
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
      if (
        changes.discretionaryEligibleV1 !== undefined &&
        typeof changes.discretionaryEligibleV1 !== "boolean"
      )
        throw new Error("Choice eligibility must be a boolean or absent.");
      if (changes.tier !== undefined && !core.peopleByTier.has(changes.tier))
        throw new Error(`Unregistered tier: ${changes.tier}`);
      if (changes.livingCostDailyMinor !== undefined)
        admitNumber(
          changes.livingCostDailyMinor,
          "living cost",
          parameter("zero", core.data.parameters),
        );
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
        (core.jobs.get(changes.jobId)?.personId !== personId ||
          core.jobs.get(changes.jobId)?.endsAt !== undefined ||
          core.finance.businesses.get(
            core.jobs.get(changes.jobId)!.organizationId,
          )?.closedAt !== undefined)
      )
        throw new Error("A person can only hold their own recorded job.");
      if (changes.tier !== undefined && changes.tier !== actor.tier) {
        core.peopleByTier.get(actor.tier)!.delete(personId);
        index(core.peopleByTier, changes.tier, personId);
      }
      Object.assign(actor, changes);
      // Explicitly clearing the optional flag restores the core's default rule.
      if (
        "discretionaryEligibleV1" in changes &&
        changes.discretionaryEligibleV1 === undefined
      )
        delete actor.discretionaryEligibleV1;
    },
    chooseIdentityV1(personId, identity) {
      const actor = core.people.get(personId);
      if (!actor) throw new Error(`Absent person: ${personId}`);
      if (personId !== core.playerId)
        throw new Error("Only the controlled player chooses an identity.");
      if (core.date !== core.startedAt)
        throw new Error("An identity is chosen before the first day passes.");
      const given = identity.givenName.trim();
      const family = identity.familyName.trim();
      if (!given || !family) throw new Error("A name is needed.");
      if (makeIsoDate(identity.birthDate) > core.date)
        throw new Error("A birth date cannot be in the future.");
      actor.givenName = given;
      actor.familyName = family;
      actor.birthDate = identity.birthDate;
      actor.looks = { ...(actor.looks ?? {}), ...identity.looks };
    },
    relocatePeopleV1(input) {
      const ids = [...input.personIds];
      const movers = ids.map((id) => core.people.get(id));
      const first = movers[0];
      const household = first && core.households.get(first.householdId);
      if (
        !household ||
        new Set(ids).size !== ids.length ||
        movers.some(
          (row) =>
            !row?.alive ||
            row.householdId !== household.id ||
            !household.memberIds.includes(row.id) ||
            // A person with a job does not move to another place; coming back
            // from the counts to the place they are counted in
            // (`fillInPerson`) keeps the job.
            (row.jobId !== undefined &&
              row.placeId.replace(COUNTED_PLACE_PREFIX, "") !== input.placeId &&
              core.jobs.get(row.jobId)?.endsAt === undefined),
        )
      )
        throw new Error(
          "Invalid relocation: one living household, no job held.",
        );
      makeIsoDate(input.source.asOf);
      const whole = household.memberIds.every((id) => ids.includes(id));
      if (whole) {
        if (input.householdId !== household.id)
          throw new Error("A whole household moves under its own id.");
        core.households.set(household.id, {
          ...household,
          placeId: input.placeId,
          source: input.source,
        });
      } else {
        if (core.households.has(input.householdId))
          throw new Error(`Household already present: ${input.householdId}`);
        core.households.set(household.id, {
          ...household,
          memberIds: household.memberIds.filter((id) => !ids.includes(id)),
        });
        core.households.set(input.householdId, {
          id: input.householdId,
          placeId: input.placeId,
          memberIds: ids,
          source: input.source,
        });
        // Those who leave stop paying the home obligations they shared; the
        // people who stay keep them, or take them over.
        moveHouseholdPayers(core, api, household.id, input.householdId, ids);
      }
      for (const actor of movers as PersonState[]) {
        core.peopleByPlace.get(actor.placeId)?.delete(actor.id);
        if (actor.countyId)
          core.peopleByPlace.get(actor.countyId)?.delete(actor.id);
        actor.placeId = input.placeId;
        if (input.countyId) actor.countyId = input.countyId;
        else delete actor.countyId;
        actor.householdId = input.householdId;
        index(core.peopleByPlace, actor.placeId, actor.id);
        if (actor.countyId) index(core.peopleByPlace, actor.countyId, actor.id);
      }
    },
    changeHouseholdV1(input) {
      const ids = [...input.personIds];
      const movers = ids.map((id) => core.people.get(id));
      const target = core.households.get(input.householdId);
      const placeId = target?.placeId ?? movers[0]?.placeId;
      if (
        !ids.length ||
        new Set(ids).size !== ids.length ||
        placeId === undefined ||
        movers.some(
          (row) =>
            !row?.alive ||
            row.placeId !== placeId ||
            row.householdId === input.householdId,
        )
      )
        throw new Error(
          "Invalid household change: living people of one place, not already members.",
        );
      makeIsoDate(input.source.asOf);
      const bySource = new Map<string, string[]>();
      for (const mover of movers as PersonState[])
        bySource.set(mover.householdId, [
          ...(bySource.get(mover.householdId) ?? []),
          mover.id,
        ]);
      // Nobody leaves a child in a household with no adult.
      const adultAge = api.parameter("benchmarkAdultMinimumAge");
      for (const [fromId, leaving] of bySource) {
        const staying = core.households
          .get(fromId)!
          .memberIds.filter((id) => !leaving.includes(id))
          .map((id) => core.people.get(id));
        if (
          staying.length &&
          !staying.some(
            (row) =>
              row?.alive &&
              ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >=
                adultAge,
          )
        )
          throw new Error(
            `Invalid household change: ${fromId} would keep only children.`,
          );
      }
      core.households.set(
        input.householdId,
        target
          ? { ...target, memberIds: [...target.memberIds, ...ids] }
          : {
              id: input.householdId,
              placeId,
              memberIds: ids,
              source: input.source,
            },
      );
      for (const [fromId, leaving] of [...bySource].sort((a, b) =>
        a[0].localeCompare(b[0]),
      )) {
        const from = core.households.get(fromId)!;
        moveLivingShare(
          core,
          fromId,
          input.householdId,
          leaving.length / Math.max(1, from.memberIds.length),
        );
        moveHouseholdPayers(core, api, fromId, input.householdId, leaving);
        core.households.set(fromId, {
          ...from,
          memberIds: from.memberIds.filter((id) => !leaving.includes(id)),
        });
      }
      for (const mover of movers as PersonState[])
        mover.householdId = input.householdId;
    },
    fundPublicPay(authorityId, treasuryId, source) {
      makeIsoDate(source.asOf);
      if (source.asOf > core.date)
        throw new Error("Treasury funding cannot cite a later source.");
      const authority = [...core.organizations.values()].find(
        (row) => row.publicPayAuthority?.id === authorityId,
      )?.publicPayAuthority;
      if (!authority)
        throw new Error(`No recorded public pay authority: ${authorityId}`);
      const treasury = core.organizations.get(treasuryId);
      if (
        !treasury ||
        treasury.outsideFlow ||
        !["government", "government-treasury"].includes(treasury.kind)
      )
        throw new Error(
          `A treasury must be a recorded government with its own cash: ${treasuryId}`,
        );
      const links = publicPayTreasuries(core),
        prior = links.get(authorityId);
      links.set(authorityId, {
        treasuryId,
        source: { ...source },
        shortfalls: prior?.shortfalls ?? new Map(),
      });
    },
    publicPayShortfallMinor(authorityId) {
      let total = 0;
      for (const row of publicPayTreasuries(core)
        .get(authorityId)
        ?.shortfalls.values() ?? [])
        total += row.amountMinor;
      return total;
    },
    enterMarket(entry) {
      if (!Number.isFinite(entry.capacityMinor) || entry.capacityMinor < 0)
        throw new Error("Market capacity must be a nonnegative amount.");
      return enterResidentMarket(core, entry);
    },
    rerateJob(jobId, hourlyMinor, source) {
      if (!Number.isSafeInteger(hourlyMinor) || hourlyMinor <= 0)
        throw new Error("A new hourly rate must be a positive whole amount.");
      makeIsoDate(source.asOf);
      if (source.asOf > core.date)
        throw new Error("A pay change cannot cite a later source.");
      const job = core.jobs.get(jobId);
      if (!job) {
        if (rerateCountedJobs(core, new Map([[jobId, hourlyMinor]])) > 0)
          return;
        throw new Error(`No recorded job to re-rate: ${jobId}`);
      }
      if (job.endsAt !== undefined) throw new Error("The job has ended.");
      const commitments = [
        ...(core.work.commitmentsByPerson.get(job.personId) ?? []),
      ]
        .map((id) => core.work.commitments.get(id)!)
        .filter((row) => row.jobId === jobId && row.endsAt === undefined);
      const old = job.hourlyMinor ?? commitments[0]?.hourlyMinor;
      // The commitment keeps its original pay source (an open pay period cites
      // it); the change and its source are recorded on the job.
      for (const row of commitments) row.hourlyMinor = hourlyMinor;
      core.work.payChanges.set(jobId, [
        ...(core.work.payChanges.get(jobId) ?? []),
        { date: core.date, hourlyMinor, source: { ...source } },
      ]);
      const ratio = old ? hourlyMinor / old : 1;
      job.hourlyMinor = hourlyMinor;
      job.wageDailyMinor = Math.round(job.wageDailyMinor * ratio);
      if (core.people.has(job.personId))
        api.observe(job.personId, {
          key: `job:${job.id}:pay`,
          value: String(job.wageDailyMinor),
          learnedAt: core.date,
          sourceId: job.id,
          access: "self",
        });
    },
    addOrganization(row) {
      if (
        core.organizations.has(row.id) ||
        core.people.has(row.id) ||
        core.husks.has(row.id)
      )
        throw new Error(`Duplicate organization: ${row.id}`);
      admitCash(row.liquidMinor, "organization cash", p("zero"));
      const admitted = {
        ...row,
        ...(row.publicPayAuthority
          ? {
              publicPayAuthority: admitPublicPayAuthority(
                row.publicPayAuthority,
                core.date,
              ),
            }
          : {}),
      };
      core.organizations.set(row.id, admitted);
      try {
        admitOwnerCashAccount(core, admitted);
      } catch (error) {
        core.organizations.delete(row.id);
        throw error;
      }
      index(
        core.organizationsByPlaceKind,
        `${row.placeId}:${row.kind}`,
        row.id,
      );
      recordEntry(core, {
        id: row.id,
        kind: "organization",
        reason: row.kind,
        placeId: row.placeId,
      });
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
    resolveCallback(callbackId) {
      if (!core.pendingCallbacks.delete(callbackId))
        throw new Error(`No pending callback: ${callbackId}`);
    },
  };
  writerAPIs.set(core, api);
  return api;
}

/**
 * Everyone and everything that enters the world after its opening day leaves a
 * record (trace audit item 2): who or what came in, why, and where. In the
 * town's own places it is a public record; elsewhere a plain one.
 */
function recordEntry(
  core: CoreState,
  entry: {
    readonly id: string;
    readonly kind: "person" | "organization";
    readonly reason: string;
    readonly placeId: string;
  },
): void {
  // The opening's own people and organizations are the world as it began.
  if (core.date <= core.startedAt) return;
  const id = `${entry.kind}.recorded:${entry.id}:${core.date}`;
  if (core.eventIds.has(id)) return;
  coreAPI(core).emit({
    id,
    date: core.date,
    kind: `${entry.kind}.recorded`,
    personIds: entry.kind === "person" ? [entry.id] : [],
    placeId: entry.placeId,
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation: `Entered the world: ${entry.reason}`,
    },
    publicRecord: core.visiblePlaceIds.has(entry.placeId),
    facts: { recordId: entry.id, reason: entry.reason },
  });
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
  const subscribers = new Set([
    ...(core.eventSubscribersByKind.get(event.kind) ?? []),
    ...(core.eventSubscribersByKind.get("*") ?? []),
  ]);
  const finishNotifications = beginEventNotifications(core, event, learnedBy);
  try {
    for (const id of subscribers)
      core.eventSubscribers.get(id)?.(api, event, learnedBy);
  } finally {
    finishNotifications();
  }
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
/**
 * Fill in a person from the wider population (two-level population): their
 * whole household leaves the counts and becomes full people, with the same
 * records the counts held: names, birth dates, past, traits and the job the
 * employer's books count. Their share of the residents' cash moves to them,
 * their jobs become scheduled work on the employer's pay cadence, and their
 * household purchases become their own contracts, and retirees are paid
 * their own award; the merged flows shrink by the same amounts. Returns the
 * person.
 */
/**
 * The person behind an id the player clicked or met: a full person as is, or
 * someone in the counts (a husk relative included) filled in now. Undefined
 * only for an id no record holds.
 */
export function personOrFillIn(
  core: CoreState,
  personId: PersonId,
): PersonState | undefined {
  const full = core.people.get(personId);
  // Someone returned to the counts comes back as the same person.
  if (full && !isDemoted(full)) return full;
  if (!residentPerson(core, personId)) return full;
  return fillInPerson(core, personId);
}

export function fillInPerson(core: CoreState, personId: PersonId): PersonState {
  const existing = core.people.get(personId);
  if (existing && !isDemoted(existing)) return existing;
  // A household returned to the counts comes back with its own records.
  const returning = existing !== undefined;
  const taken = takeResidentHousehold(core, personId);
  if (!taken) throw new Error(`Not in the wider population: ${personId}`);
  // Their past exists only from now: rebuilt from the world's seed, as the
  // opening would have built it.
  // Counted people carry no past at all (one model, two tiers): everyone in
  // the household gets theirs now.
  const build = returning ? undefined : residentsRuntime(core)?.input.pastBuild;
  const rebuild = build
    ? taken.people.filter((row) => countedSinceOpening(core, row.id))
    : [];
  let record = taken;
  if (build && rebuild.length) {
    const before = new Map(
      rebuild.map((row) => [
        row.id,
        {
          head: row.pastFacts ?? [],
          tail: [],
        },
      ]),
    );
    const rebuilt = new Map(
      buildDeepPast(
        {
          seed: build.seed,
          startedAt: build.startedAt,
          people: rebuild.map((row) => ({
            ...row,
            pastFacts: before.get(row.id)!.head,
          })),
          households: [taken.household],
          jobs: taken.jobs,
          gaps: [],
        } as unknown as CoreInput,
        {
          // The opening's class and workgroup sizes, so the same peer groups form.
          peerCohortSize: (circle, contextKey, present) =>
            peerCohortSize(core, circle, contextKey) ?? present,
        },
      ).people.map((row) => [row.id, row]),
    );
    record = {
      ...taken,
      people: taken.people.map((row) => {
        const built = rebuilt.get(row.id);
        return built
          ? {
              ...row,
              pastFacts: [
                ...(built.pastFacts ?? []),
                ...before.get(row.id)!.tail,
              ],
            }
          : row;
      }),
    };
  }
  const api = coreAPI(core);
  const home = record.household;
  if (returning) {
    // A member born or married into the household while it was in the counts has no full record yet: they are admitted below, as in a first fill-in.
    const back = record.people.filter((row) => core.people.has(row.id));
    for (const row of back) api.updatePerson(row.id, { tier: row.tier });
    // A member still on file in the counted place whom the counted record no
    // longer holds comes back with the household too, so it moves whole.
    const unrecorded = (core.households.get(home.id)?.memberIds ?? []).filter(
      (id) => {
        const kept = core.people.get(id);
        return (
          kept !== undefined &&
          kept.alive &&
          isDemoted(kept) &&
          !back.some((row) => row.id === id)
        );
      },
    );
    api.relocatePeopleV1({
      personIds: [...back.map((row) => row.id), ...unrecorded],
      placeId: home.placeId,
      ...(record.people[0]?.countyId
        ? { countyId: record.people[0].countyId }
        : {}),
      householdId: home.id,
      source: home.source,
    });
  } else {
    if (core.households.has(home.id))
      throw new Error(`Household already present: ${home.id}`);
    core.households.set(home.id, { ...home, memberIds: [...home.memberIds] });
  }
  const jobs = new Map(record.jobs.map((row) => [row.id, row]));
  // Ties to people still counted become husks, met and filled in later.
  const husk = (id: PersonId) => {
    if (core.people.has(id) || core.husks.has(id)) return;
    const other =
      record.people.find((row) => row.id === id) ?? residentPerson(core, id);
    if (!other) return;
    core.husks.set(id, {
      id,
      givenName: other.givenName,
      familyName: other.familyName,
      placeId: other.placeId,
      ...(other.countyId ? { countyId: other.countyId } : {}),
      looks: { ...(other.looks ?? {}) },
      said: [...(other.said ?? [])],
      birthDate: other.birthDate,
      familyIds: [...other.familyIds],
      source: other.source,
    });
  };
  const admitted: PersonState[] = [];
  for (const row of record.people) {
    core.husks.delete(row.id);
    if (returning && core.people.has(row.id)) {
      // Their counted job, if any, is theirs again.
      const job = record.jobs.find(
        (j) => j.personId === row.id && countedJob(core, j.id) !== undefined,
      );
      if (job) {
        core.jobs.set(job.id, { ...(countedJob(core, job.id) ?? job) });
        financeIndex(
          core.finance.jobsByOrganization,
          job.organizationId,
          job.id,
        );
        api.updatePerson(row.id, { jobId: job.id });
      }
      admitted.push(core.people.get(row.id)!);
      continue;
    }
    const recorded = row.jobId ? jobs.get(row.jobId) : undefined;
    // The counted job as it stands today (pay may have changed since the opening).
    const job = recorded
      ? (countedJob(core, recorded.id) ?? recorded)
      : undefined;
    const active = recorded
      ? countedJob(core, recorded.id) !== undefined
      : false;
    admitted.push(
      admitPerson(core, {
        ...row,
        liquidMinor: 0,
        ...(active ? {} : { jobId: undefined }),
      }),
    );
    if (returning) {
      const household = core.households.get(home.id)!;
      core.households.set(home.id, {
        ...household,
        memberIds: [...household.memberIds, row.id],
      });
    }
    if (job && active) {
      core.jobs.set(job.id, { ...job });
      financeIndex(core.finance.jobsByOrganization, job.organizationId, job.id);
    }
  }
  // Their economic life moves from the merged flows to their own records.
  const released = releaseResidentHousehold(core, record);
  if (released.accountId) {
    const accounts = api.accounts(),
      from = accounts.main(released.accountId),
      pool = accounts.balance(from),
      household = record.people.reduce((n, row) => n + row.liquidMinor, 0);
    for (const row of record.people) {
      const amount =
        household > 0
          ? Math.floor(
              (pool * released.cashShare * row.liquidMinor) / household,
            )
          : 0;
      if (amount > 0)
        accounts.transfer({
          id: `fill-in:${row.id}:${released.sequence}:cash`,
          from,
          to: accounts.main(row.id),
          amountMinor: amount,
          reasonKey: "residents.fill-in.cash",
          source: row.source,
        });
    }
  }
  for (const commitment of record.workCommitments) {
    const job = core.jobs.get(commitment.jobId);
    const original = commitment.payrollCalendarId
      ? released.calendars.get(commitment.payrollCalendarId)
      : undefined;
    if (!job || job.endsAt !== undefined || !original) continue;
    const calendarId = `${original.id}:filled:${commitment.id}`;
    api.addWorkCommitment({
      ...commitment,
      startsAt: makeIsoDate(core.date),
      hourlyMinor: job.hourlyMinor ?? commitment.hourlyMinor,
      payrollCalendarId: calendarId,
    });
    api.addWorkPayrollCalendar({
      ...original,
      id: calendarId,
      workCommitmentIds: [commitment.id],
      basisRecordIds: [job.organizationId, job.id, commitment.id],
      effectiveFrom: makeIsoDate(core.date),
    });
  }
  for (const contract of record.contracts) {
    if (contract.recipientIncome) continue; // paid by the residents engine's own flow
    const day = Number(contract.dueAt.slice(8, 10));
    let dueAt = makeIsoDate(contract.dueAt);
    while (dueAt <= core.date) {
      const next = new Date(`${dueAt}T00:00:00.000Z`);
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + contract.periodMonths);
      const last = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(day, last));
      dueAt = makeIsoDate(next.toISOString().slice(0, 10));
    }
    api.addFinanceContract({
      ...contract,
      dueAt,
    });
  }
  // Full people who already name a newcomer as family (it was their husk).
  const newcomers = new Set(admitted.map((actor) => actor.id));
  for (const other of core.people.values())
    if (!newcomers.has(other.id))
      for (const id of other.familyIds)
        if (newcomers.has(id)) {
          core.people.get(id)!.familyIds.add(other.id);
          const relationshipId = [other.id, id].sort().join(":");
          if (!core.relationships.has(relationshipId))
            api.relationship(
              other.id,
              id,
              "family",
              api.parameter("relationInitial"),
            );
        }
  for (const actor of admitted) {
    // Counted all along; now followed in full, with a record of it.
    recordEntry(core, {
      id: actor.id,
      kind: "person",
      reason: returning ? "returned" : "filled-in",
      placeId: actor.placeId,
    });
    for (const id of [...actor.familyIds, ...actor.knownIds]) husk(id);
    for (const id of actor.familyIds)
      if (core.people.has(id)) {
        const relationshipId = [actor.id, id].sort().join(":");
        if (!core.relationships.has(relationshipId))
          api.relationship(
            actor.id,
            id,
            "family",
            api.parameter("relationInitial"),
          );
      }
    for (const id of actor.knownIds) {
      const other = core.people.get(id) ?? core.husks.get(id);
      if (!other) continue;
      api.observe(actor.id, {
        key: `person:${id}:name`,
        value: `${other.givenName} ${other.familyName}`,
        ...initialNameProvenance(core, actor, id),
        access: "perceived",
      });
    }
    const job = actor.jobId ? core.jobs.get(actor.jobId) : undefined;
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
  }
  // Their health comes from the health engine's model, seeded by the world
  // and the person, as the opening's people's did.
  for (const actor of admitted) giveHealthRecord(api, actor.id);
  for (const module of core.modules.values())
    module.onFillIn?.(api, {
      householdId: home.id,
      memberIds: record.people.map((row) => row.id),
    });
  return core.people.get(personId)!;
}

/** A recorded identity from another engine (e.g. an officeholder in GOV's offices table). */
export interface RecordedIdentity {
  id: PersonId;
  givenName: string;
  familyName: string;
  birthDate: IsoDate;
  placeId: PlaceId;
  countyId?: PlaceId;
  gender?: string;
  party?: string;
  seatKey?: string;
  /** The law required them to be natural-born (a vice president, elected or nominated): their birth record says so. */
  eligibleForPresidency?: boolean;
  /** Who they are, drawn by the caller from the world's seed (officials: OPUS-OFFICIALS). */
  traits?: Readonly<Record<string, number>>;
  /** Their cadence: an official outside the town acts on the calendar. */
  tier?: string;
  /** What they hold on the opening day, from the survey rule for their pay; only then, since later cash would come from nowhere. */
  openingLiquidMinor?: number;
  source: Source;
}

/**
 * Fill in a named person who exists only as a recorded identity (state and
 * federal officials): a full person in their own household at their place,
 * with their identity, party and seat as past facts. Traits stay neutral until
 * PEOPLE's builder supplies them (stopgap SG-CORE-identity-fill-in-traits).
 * Returns the existing person if already full.
 */
export function fillInIdentity(
  core: CoreState,
  identity: RecordedIdentity,
): PersonState {
  const existing = core.people.get(identity.id);
  if (existing) return existing;
  if (takeResidentHousehold(core, identity.id))
    throw new Error("A counted resident is filled in with fillInPerson.");
  makeIsoDate(identity.birthDate);
  // Seeded by the world and the person, matched to real norms by age and sex,
  // as the opening gives everyone theirs: the same person every time.
  const traits =
    openingTemperaments(
      [
        {
          id: identity.id,
          birthDate: makeIsoDate(identity.birthDate),
          ...(identity.gender ? { gender: identity.gender } : {}),
          parents: [],
        },
      ],
      { seed: core.seed, startedAt: makeIsoDate(core.startedAt) },
    ).get(identity.id) ?? {};
  const householdId = `household:${identity.id}`;
  if (core.households.has(householdId))
    throw new Error(`Identity household already present: ${householdId}`);
  core.households.set(householdId, {
    id: householdId,
    placeId: identity.placeId,
    memberIds: [identity.id],
    source: identity.source,
  });
  core.husks.delete(identity.id);
  const facts: NonNullable<PersonInput["pastFacts"]>[number][] = [
    ...(identity.party
      ? [
          {
            id: `${identity.id}:party`,
            date: core.date,
            kind: "identity:party",
            summary: identity.party,
            source: identity.source,
            facts: { party: identity.party },
          },
        ]
      : []),
    ...(identity.seatKey
      ? [
          {
            id: `${identity.id}:seat`,
            date: core.date,
            kind: "identity:seat",
            summary: identity.seatKey,
            source: identity.source,
            facts: { seatKey: identity.seatKey },
          },
        ]
      : []),
    // An official's birth: native-born or not, which the line of succession reads.
    ...(identity.seatKey
      ? [
          nativityFact({
            seed: core.seed,
            personId: identity.id,
            placeId: identity.placeId,
            birthDate: identity.birthDate,
            date: core.date,
            qualified:
              identity.eligibleForPresidency === true ||
              identity.seatKey === "seat:US:president" ||
              identity.seatKey === "seat:US:vice-president",
            source: identity.source,
          }),
        ]
      : []),
  ];
  const openingCash = identity.openingLiquidMinor ?? 0;
  if (openingCash > 0 && core.date !== core.startedAt)
    throw new Error(
      `Opening cash for ${identity.id} is only admitted on the opening day.`,
    );
  const person = admitPerson(core, {
    id: identity.id,
    givenName: identity.givenName,
    familyName: identity.familyName,
    birthDate: identity.birthDate,
    placeId: identity.placeId,
    ...(identity.countyId ? { countyId: identity.countyId } : {}),
    householdId,
    tier: identity.tier ?? "monthly",
    traits: identity.traits ? { ...identity.traits } : traits,
    liquidMinor: openingCash,
    livingCostDailyMinor: 0,
    source: identity.source,
    familyIds: [],
    knownIds: [],
    ...(identity.gender ? { looks: { gender: identity.gender } } : {}),
    pastFacts: facts,
  });
  recordEntry(core, {
    id: person.id,
    kind: "person",
    reason: identity.seatKey ? "seated-official" : "named-person",
    placeId: person.placeId,
  });
  return person;
}

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
  if (
    input.jobId &&
    (!job ||
      job.personId !== input.id ||
      job.endsAt !== undefined ||
      core.finance.businesses.get(job.organizationId)?.closedAt !== undefined)
  )
    throw new Error("Promotion requires an owned job.");
  const actor = admitPerson(core, {
    ...input,
    said: husk.said,
    looks: husk.looks,
  });
  recordEntry(core, {
    id: actor.id,
    kind: "person",
    reason: "promoted",
    placeId: actor.placeId,
  });
  const api = coreAPI(core);
  for (const id of actor.familyIds) {
    if (core.relationships.has([actor.id, id].sort().join(":"))) continue;
    api.relationship(
      actor.id,
      id,
      "family",
      openingClosenessHours(core, actor.id, id),
      undefined,
      { cause: OPENING_FAMILY_CAUSE },
    );
  }
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
