/** Root-internal explicit control and original trace ownership; not a client choice API. */
import { FinanceReadGuard } from "./finance-plan";
import { P } from "./parameters";
import type { ActOffer, CoreState, DecisionResult, PersonState } from "./types";

export interface ControlTokenV1 {
  readonly version: "core2-part1b-v1";
  readonly personId: string;
}
type Control = Readonly<{ token: ControlTokenV1; personId: string }>;
type Row = Record<PropertyKey, unknown>;
const controls = new WeakMap<object, Control>(),
  tokenOwners = new WeakMap<object, object>();
const weakGet = WeakMap.prototype.get,
  weakSet = WeakMap.prototype.set,
  weakDelete = WeakMap.prototype.delete,
  freeze = Object.freeze,
  prototypeOf = Object.getPrototypeOf,
  create = Object.create,
  define = Object.defineProperty;
const shapeProbe = Symbol("controlled-decision-own-shape");
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Controlled trace requires a nonempty recorded identity.");
  return value;
}
function row(value: unknown): Row {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (prototypeOf(value) !== Object.prototype && prototypeOf(value) !== null)
  )
    throw new Error("Controlled trace requires ordinary data records.");
  return value as Row;
}
function control(core: object): Control | undefined {
  return weakGet.call(controls, core) as Control | undefined;
}
/** Private identity predicate only: no validation, callback, cursor advance or write. */
export function isExplicitlyControlledPersonV1(
  core: object,
  personId: string,
): boolean {
  return control(core)?.personId === personId;
}
/** Read-only identity preimage; no token, registration, person mutation or payment authority. */
export function snapshotExplicitControlV1(
  core: object,
): Readonly<{ personId?: string; verify: () => void }> {
  const expected = control(core);
  return freeze({
    personId: expected?.personId,
    verify: () => {
      if (control(core) !== expected)
        throw new Error(
          "Explicit control changed before the original writer preflight.",
        );
    },
  });
}
function actualPerson(
  r: FinanceReadGuard,
  core: Readonly<CoreState>,
  personId: string,
): PersonState {
  row(core);
  const actor = r.mapGet(r.field(core, "people"), personId);
  if (
    !actor ||
    r.field(actor, "id") !== personId ||
    r.field(actor, "alive") !== true
  )
    throw new Error("Explicit control requires the actual living person.");
  row(actor);
  const placeId = text(r.field(actor, "placeId")),
    householdId = text(r.field(actor, "householdId")),
    household = r.mapGet(r.field(core, "households"), householdId),
    places = r.field(core, "peopleByPlace"),
    tiers = r.field(core, "peopleByTier"),
    place = r.mapGet(places, placeId),
    tier = r.mapGet(tiers, r.field(actor, "tier"));
  if (
    !household ||
    r.field(household, "id") !== householdId ||
    r.field(household, "placeId") !== placeId ||
    !r
      .array(r.field(household, "memberIds"), P.zero, P.one)
      .includes(personId) ||
    !place ||
    !r.member(place, personId) ||
    !tier ||
    !r.member(tier, personId)
  )
    throw new Error(
      "Explicit control has stale household/place/tier owner links.",
    );
  const countyId = r.field(actor, "countyId");
  if (countyId !== undefined) {
    const county = r.mapGet(places, text(countyId));
    if (!county || !r.member(county, personId))
      throw new Error("Explicit control has a stale county link.");
  }
  const jobId = r.field(actor, "jobId");
  if (jobId !== undefined) {
    const job = r.mapGet(r.field(core, "jobs"), text(jobId)),
      organization =
        job &&
        r.mapGet(
          r.field(core, "organizations"),
          text(r.field(job, "organizationId")),
        );
    if (
      !job ||
      r.field(job, "id") !== jobId ||
      r.field(job, "personId") !== personId ||
      r.field(job, "endsAt") !== undefined ||
      !organization ||
      r.field(organization, "id") !== r.field(job, "organizationId")
    )
      throw new Error("Explicit control has a stale owned job link.");
  }
  return actor;
}
/** Root cursor owns this factory token; callers cannot replace an active identity. */
export function registerControlledPersonV1(
  core: CoreState,
  personId: string,
): Readonly<ControlTokenV1> {
  text(personId);
  const previous = control(core),
    reads = new FinanceReadGuard();
  if (previous && previous.personId !== personId)
    throw new Error("Retire the active control token before changing person.");
  actualPerson(reads, core, personId);
  reads.verify();
  if (control(core) !== previous)
    throw new Error("Explicit control changed during registration.");
  if (previous) return previous.token;
  const token = freeze({ version: "core2-part1b-v1" as const, personId }),
    next = freeze({ personId, token });
  weakSet.call(tokenOwners, token, core);
  weakSet.call(controls, core, next);
  return token;
}
/** An exact active factory token is required; stale/foreign/client copies cannot retire control. */
export function retireControlledPersonV1(
  core: CoreState,
  token: Readonly<ControlTokenV1>,
): void {
  const active = control(core);
  if (
    !active ||
    active.token !== token ||
    weakGet.call(tokenOwners, token) !== core
  )
    throw new Error(
      "Explicit control retirement requires its actual active factory token.",
    );
  weakDelete.call(controls, core);
  weakDelete.call(tokenOwners, token);
}

/** No caller-frozen object is trusted: every graph is an independently produced plain frozen copy. */
function detached<T>(
  r: FinanceReadGuard,
  original: T,
  active: Set<object>,
  copies: WeakMap<object, object>,
): T {
  if (
    typeof original === "function" ||
    typeof original === "symbol" ||
    typeof original === "bigint" ||
    (typeof original === "number" && !Number.isFinite(original))
  )
    throw new Error(
      "Controlled decision evidence requires nonexecutable finite data.",
    );
  if (original === null || typeof original !== "object") return original;
  if (active.has(original))
    throw new Error("Controlled decision evidence cannot contain a cycle.");
  const previous = weakGet.call(copies, original);
  if (previous) return previous as T;
  const array = Array.isArray(original),
    prototype = prototypeOf(original);
  if (
    array
      ? prototype !== Array.prototype
      : prototype !== Object.prototype && prototype !== null
  )
    throw new Error(
      "Controlled decision evidence must be ordinary records or dense arrays.",
    );
  active.add(original);
  try {
    r.field(original as Row, shapeProbe);
    const keys = r.keys(original),
      result: Row = array ? ([] as unknown as Row) : create(null),
      length = array
        ? r.field(original as unknown as unknown[], "length")
        : undefined;
    if (
      array &&
      (!Number.isSafeInteger(length) ||
        length! < P.zero ||
        keys.length !== length! + P.one)
    )
      throw new Error(
        "Controlled decision arrays must be dense direct arrays.",
      );
    if (array)
      for (let i = P.zero; i < length!; i += P.one)
        if (!keys.includes(String(i)))
          throw new Error(
            "Controlled decision arrays cannot contain inherited or missing entries.",
          );
    for (const key of keys) {
      if (typeof key !== "string")
        throw new Error(
          "Controlled decision evidence cannot contain symbol fields.",
        );
      if (array && key === "length") continue;
      define(result, key, {
        value: detached(r, r.field(original as Row, key), active, copies),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    const saved = freeze(result);
    weakSet.call(copies, original, saved);
    return saved as T;
  } finally {
    active.delete(original);
  }
}
function finite(value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("Controlled decision has malformed numeric evidence.");
}
function reasons(value: unknown): void {
  const fields = row(value);
  for (const key of ["need", "goal", "drive", "trait", "emotion", "effort"])
    finite(fields[key]);
  if (fields.module !== undefined) finite(fields.module);
}
function terms(value: unknown): void {
  if (value === undefined) return;
  if (!Array.isArray(value))
    throw new Error("Controlled reason terms must be an array.");
  for (let i = P.zero; i < value.length; i += P.one) {
    const term = row(value[i]);
    text(term.id);
    text(term.provider);
    text(term.weightParameter);
    finite(term.value);
    finite(term.contribution);
    if (term.stopgapId !== undefined) text(term.stopgapId);
    if (term.arguments !== undefined)
      for (const argument of Object.values(row(term.arguments)))
        if (typeof argument !== "string")
          throw new Error(
            "Controlled reason arguments must be recorded strings.",
          );
    if (term.sourceIds !== undefined) {
      if (!Array.isArray(term.sourceIds))
        throw new Error("Controlled reason Source IDs must be an array.");
      for (let i = P.zero; i < term.sourceIds.length; i += P.one)
        text(term.sourceIds[i]);
    }
  }
}
function decisionShape(value: DecisionResult): void {
  text(value.actorId);
  text(value.date);
  text(value.reasonKey);
  if (value.selectedReasons !== undefined) reasons(value.selectedReasons);
  terms(value.selectedReasonTerms);
  if (value.scores !== undefined) {
    if (!Array.isArray(value.scores))
      throw new Error("Controlled decision scores must be an array.");
    for (let i = P.zero; i < value.scores.length; i += P.one) {
      const score = value.scores[i]!;
      row(score);
      text(score.actionId);
      text(score.targetId);
      finite(score.score);
      reasons(score.reasons);
      terms(score.reasonTerms);
    }
  }
}

/** Full original controlled evidence, followed by actual owning/counter preflight at the existing act writer. */
export function prepareControlledActTraceV1(
  core: CoreState,
  actorId: string,
  offer: ActOffer,
  date: string,
  reason: DecisionResult,
): Readonly<{
  actor: PersonState;
  offer: ActOffer;
  decision: DecisionResult;
  verify: () => void;
}> {
  text(actorId);
  text(date);
  const expected = control(core);
  if (!expected || expected.personId !== actorId)
    throw new Error("Controlled trace has another active actor.");
  const ownerReads = new FinanceReadGuard(),
    actor = actualPerson(ownerReads, core, actorId),
    evidenceReads = new FinanceReadGuard(),
    active = new Set<object>(),
    copies = new WeakMap<object, object>();
  ownerReads.field(core, "date");
  ownerReads.field(actor, "actCount");
  ownerReads.field(actor, "lastChoice");
  ownerReads.field(actor, "lastReason");
  const originalDefinition = row(evidenceReads.field(row(offer), "definition")),
    kind = text(evidenceReads.field(originalDefinition, "id")),
    parameters = ownerReads.field(ownerReads.field(core, "data"), "parameters"),
    monthCharacters = ownerReads.field(
      ownerReads.field(parameters, "isoMonthCharacters"),
      "value",
    );
  finite(monthCharacters);
  const month = date.slice(P.zero, monthCharacters),
    counter = ownerReads.mapGet(
      ownerReads.field(core, "actCounters"),
      `${month}:${actorId}:${kind}`,
    );
  ownerReads.mapGet(ownerReads.field(actor, "actsByKind"), kind);
  ownerReads.mapGet(
    ownerReads.field(core, "actsByMonthKind"),
    `${month}:${kind}`,
  );
  ownerReads.mapGet(ownerReads.field(core, "actCountersByMonth"), month);
  if (counter)
    for (const key of [
      "count",
      "needContribution",
      "goalContribution",
      "driveContribution",
    ] as const)
      ownerReads.field(counter, key);
  const savedOffer = detached(evidenceReads, offer, active, copies),
    savedReason = detached(evidenceReads, reason, active, copies);
  row(savedOffer);
  row(savedReason);
  row(savedOffer.definition);
  text(savedOffer.targetId);
  text(savedOffer.definition.id);
  finite(savedOffer.availableHours);
  if (savedOffer.effortHours !== undefined) finite(savedOffer.effortHours);
  decisionShape(savedReason);
  if (savedReason.actorId !== actorId || savedReason.date !== date)
    throw new Error("Controlled decision has another actual actor/date.");
  const verify = () => {
    evidenceReads.verify();
    ownerReads.verify();
    if (control(core) !== expected)
      throw new Error(
        "Controlled trace active identity changed before act commit.",
      );
  };
  verify();
  return freeze({ actor, offer: savedOffer, decision: savedReason, verify });
}
