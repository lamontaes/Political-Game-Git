/** Pure recorded work boundaries only; no cursor, attendance, earnings or cash effects. */
import { addDays, makeIsoDate, daysBetweenText } from "./kernel/dates";
import { FinanceReadGuard } from "./finance-plan";
import {
  plannedWorkMinutesBetween,
  plannedWorkMinutesOnDate,
} from "./modules/work";
import type {
  CoreAPI,
  CoreState,
  JobInput,
  Source,
  WorkCommitmentInput,
} from "./types";
import type { Parameter } from "./parameters";

export interface WorkMomentV1 {
  readonly date: string;
  readonly minuteOfDay: number;
}
export interface WorkSpanV1 {
  readonly commitmentId: string;
  readonly jobId: string;
  readonly personId: string;
  readonly organizationId: string;
  readonly slotIndex: number;
  readonly originDate: string;
  readonly date: string;
  readonly startMinute: number;
  readonly endMinute: number; // dayMinutes means that civil day's exclusive end
  readonly minutes: number;
  readonly durationEvidence: Readonly<{
    minutes: number;
    basis: "work-slot";
    recordRefs: readonly Readonly<{ kind: string; id: string }>[];
    parameterRefs: readonly string[];
  }>;
}
export interface WorkSpanOwnerV1 {
  readonly commitment: WorkCommitmentInput;
  readonly job: JobInput;
  readonly personSource: Source;
  readonly organizationSource: Source;
  readonly organizationId: string;
  readonly organizationPlaceId: string;
  readonly plannedMinutes: number;
  readonly spans: readonly WorkSpanV1[];
}
export interface WorkSpansOnDateV1 {
  readonly version: "core2-work-spans-v1";
  readonly controlledPersonId: string;
  readonly asOf: string;
  readonly date: string;
  readonly dayMinutes: number;
  readonly parameters: Readonly<Record<string, Parameter>>;
  readonly owners: readonly WorkSpanOwnerV1[];
  readonly totalPlannedMinutes: number;
}
export interface WorkBoundaryV1 {
  readonly version: "core2-work-spans-v1";
  readonly at: WorkMomentV1;
  readonly reasons: readonly Readonly<{
    boundary: "start" | "end";
    owner: WorkSpanOwnerV1;
    span: WorkSpanV1;
  }>[];
  readonly parameters: Readonly<Record<string, Parameter>>;
  readonly asOf: string;
}

const version = "core2-work-spans-v1" as const;
const prototypeWitness = Symbol("work-span-owned-data-prototype");
function text(raw: unknown): string {
  if (typeof raw !== "string" || !raw || raw !== raw.trim())
    throw new Error("Work spans require a direct nonempty recorded identity.");
  return raw;
}
function date(raw: unknown): string {
  return makeIsoDate(text(raw));
}
/** Bounded owning terms/evidence only: direct data, dense arrays, no executable/cyclic graph. */
function copy<T>(r: FinanceReadGuard, raw: T, active = new Set<object>()): T {
  if (
    typeof raw === "function" ||
    typeof raw === "symbol" ||
    typeof raw === "bigint"
  )
    throw new Error("Work span evidence must be ordinary data.");
  if (typeof raw === "number" && !Number.isFinite(raw))
    throw new Error("Work span evidence has a non-finite value.");
  if (raw === null || typeof raw !== "object") return raw;
  if (active.has(raw)) throw new Error("Work span evidence has a cycle.");
  const array = Array.isArray(raw),
    prototype = Object.getPrototypeOf(raw);
  if (
    prototype !== (array ? Array.prototype : Object.prototype) &&
    !(prototype === null && !array)
  )
    throw new Error("Work span evidence requires ordinary owned rows.");
  r.field(raw as Record<PropertyKey, unknown>, prototypeWitness); // Also guard empty data prototypes.
  active.add(raw);
  try {
    const result = array ? [] : Object.create(null),
      keys = r.keys(raw),
      length = array ? r.field(raw as readonly unknown[], "length") : 0;
    if (
      array &&
      (!Number.isSafeInteger(length) ||
        length < 0 ||
        keys.filter(
          (key) =>
            typeof key === "string" &&
            Number.isSafeInteger(Number(key)) &&
            Number(key) >= 0 &&
            Number(key) < length &&
            String(Number(key)) === key,
        ).length !== length)
    )
      throw new Error("Work span arrays must be finite dense direct arrays.");
    for (const key of keys) {
      if (typeof key === "symbol")
        throw new Error("Work span evidence has a symbol field.");
      if (array && key === "length") continue;
      const value = r.field(raw as Record<PropertyKey, unknown>, key),
        descriptor = Object.getOwnPropertyDescriptor(raw, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        !Object.is(value, descriptor.value)
      )
        throw new Error("Work span evidence descriptor changed while copying.");
      Object.defineProperty(result, key, {
        value: copy(r, value, active),
        enumerable: descriptor.enumerable,
        writable: false,
        configurable: false,
      });
    }
    if (array) {
      for (let index = 0; index < length; index++)
        if (!Object.hasOwn(raw, index))
          throw new Error("Work span arrays must be dense.");
      Object.defineProperty(result, "length", { value: length });
    }
    return Object.freeze(result) as T;
  } finally {
    active.delete(raw);
  }
}
function availableSource(source: Source, at: string): void {
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    typeof source.citation !== "string" ||
    !source.citation.trim() ||
    date(source.asOf) > at ||
    (source.tag === "ESTIMATED" &&
      (typeof source.estimatedFrom !== "string" ||
        !source.estimatedFrom.trim()))
  )
    throw new Error("Work span owning Source is undated or unavailable.");
}
const remainder = (n: number, period: number) =>
  ((n % period) + period) % period;
function compare(a: WorkMomentV1, b: WorkMomentV1): number {
  return a.date < b.date
    ? -1
    : a.date > b.date
      ? 1
      : a.minuteOfDay - b.minuteOfDay;
}

/** One guard for request, relevant person index, actual owners, parameters and residue. */
class SpanRead {
  readonly r: FinanceReadGuard;
  readonly core: CoreState;
  readonly asOf: string;
  readonly startedAt: string;
  readonly zero: number;
  readonly one: number;
  readonly day: number;
  readonly parameters: Readonly<Record<string, Parameter>>;
  readonly commitmentKind: string;
  readonly rows: readonly Omit<WorkSpanOwnerV1, "spans" | "plannedMinutes">[];
  private readonly work: CoreState["work"];
  constructor(
    api: CoreAPI,
    readonly personId: string,
    r: FinanceReadGuard,
  ) {
    this.r = r;
    this.core = r.field(api, "state") as CoreState;
    this.asOf = date(r.field(this.core, "date"));
    this.startedAt = date(r.field(this.core, "startedAt"));
    this.work = r.field(this.core, "work");
    const data = r.field(this.core, "data"),
      workData = r.field(data, "work");
    if (!workData)
      throw new Error("Work spans have no actual registered work data.");
    this.commitmentKind = text(
      r.field(r.field(workData, "journalSourceKinds"), "commitment"),
    );
    const registry = r.field(data, "parameters"),
      parameters: Record<string, Parameter> = Object.create(null);
    for (const key of ["zero", "one", "hoursPerDay", "minutesPerHour"]) {
      const original = r.field(registry, key);
      if (!original)
        throw new Error("Work spans have an unregistered parameter: " + key);
      const value = r.field(original, "value");
      if (!Number.isFinite(value))
        throw new Error(
          "Work spans have a non-finite actual registered parameter.",
        );
      parameters[key] = copy(r, original);
    }
    this.parameters = Object.freeze(parameters);
    this.zero = parameters.zero!.value;
    this.one = parameters.one!.value;
    this.day = parameters.hoursPerDay!.value * parameters.minutesPerHour!.value;
    if (
      this.zero !== 0 ||
      this.one !== 1 ||
      !Number.isFinite(this.day) ||
      this.day <= this.zero
    )
      throw new Error("Work spans have invalid recurrence units.");
    const person = r.mapGet(r.field(this.core, "people"), personId);
    if (!person || text(r.field(person, "id")) !== personId)
      throw new Error("Work spans have no actual controlled person.");
    const alive = r.field(person, "alive"),
      primaryJobId = r.field(person, "jobId"),
      birthDate = date(r.field(person, "birthDate")),
      personSource = copy(r, r.field(person, "source")),
      index = r.mapGet(r.field(this.work, "commitmentsByPerson"), personId),
      result: Omit<WorkSpanOwnerV1, "spans" | "plannedMinutes">[] = [];
    if (typeof alive !== "boolean")
      throw new Error("Work spans have a malformed living owner.");
    availableSource(personSource, this.asOf);
    for (const rawId of index ? r.members(index) : []) {
      const id = text(rawId),
        original = r.mapGet(r.field(this.work, "commitments"), id);
      if (!original)
        throw new Error("Work span person index has no actual commitment.");
      const row = copy(r, original);
      if (text(row.id) !== id || text(row.personId) !== personId)
        throw new Error(
          "Work span commitment has a different actual indexed owner.",
        );
      this.validate(row, birthDate);
      const job = r.mapGet(r.field(this.core, "jobs"), text(row.jobId)),
        employer = r.mapGet(
          r.field(this.core, "organizations"),
          text(row.organizationId),
        );
      if (
        !job ||
        !employer ||
        r.field(job, "id") !== row.jobId ||
        r.field(job, "personId") !== personId ||
        r.field(job, "organizationId") !== row.organizationId ||
        r.field(employer, "id") !== row.organizationId
      )
        throw new Error(
          "Work span commitment has no actual job/employer links.",
        );
      const savedJob = copy(r, job),
        organizationSource = copy(r, r.field(employer, "source")),
        organizationPlaceId = text(r.field(employer, "placeId"));
      if (savedJob.endsAt !== undefined && date(savedJob.endsAt) > this.asOf)
        throw new Error("Work spans reject a future completed job fact.");
      for (const source of [
        row.scheduleSource,
        row.paySource,
        savedJob.source,
        organizationSource,
      ])
        availableSource(source, this.asOf);
      // Retained ended commitments remain valid evidence, but cannot create future work.
      if (alive && primaryJobId === row.jobId)
        result.push(
          Object.freeze({
            commitment: row,
            job: savedJob,
            personSource,
            organizationSource,
            organizationId: row.organizationId,
            organizationPlaceId,
          }),
        );
    }
    this.rows = Object.freeze(result);
  }
  private validate(row: WorkCommitmentInput, birthDate: string): void {
    const { zero, one, day } = this,
      start = date(row.startsAt);
    date(row.anchorDate);
    if (
      start < birthDate ||
      (row.endsAt !== undefined && date(row.endsAt) < start) ||
      !Number.isSafeInteger(row.periodDays) ||
      row.periodDays <= zero ||
      !Number.isSafeInteger(row.hourlyMinor) ||
      row.hourlyMinor < zero ||
      !Number.isFinite(row.expectedWeeklyMinutes) ||
      row.expectedWeeklyMinutes <= zero ||
      !Array.isArray(row.slots) ||
      row.slots.length <= zero
    )
      throw new Error(
        "Work span commitment quantities/date bounds are malformed.",
      );
    for (const slot of row.slots)
      if (
        !Number.isSafeInteger(slot.offsetDays) ||
        slot.offsetDays < zero ||
        slot.offsetDays >= row.periodDays ||
        !Number.isFinite(slot.startMinute) ||
        slot.startMinute < zero ||
        slot.startMinute >= day ||
        !Number.isFinite(slot.minutes) ||
        slot.minutes <= zero ||
        slot.minutes > day
      )
        throw new Error("Work span periodic slot is malformed.");
    // Existing admission rejects overlap; sorting this temporary check changes no returned slot/order/duration.
    const check = row.slots
      .map((slot) => ({
        start: slot.offsetDays * day + slot.startMinute,
        minutes: slot.minutes,
      }))
      .sort((a, b) => a.start - b.start);
    for (let i = zero; i < check.length; i += one) {
      const span = check[i]!,
        next =
          check[i + one]?.start ?? check[zero]!.start + row.periodDays * day;
      if (span.start + span.minutes > next)
        throw new Error("Periodic job slots overlap.");
    }
  }
  moment(raw: WorkMomentV1): WorkMomentV1 {
    const value = copy(this.r, raw),
      at = date(value.date);
    if (
      !Number.isFinite(value.minuteOfDay) ||
      value.minuteOfDay < this.zero ||
      value.minuteOfDay >= this.day
    )
      throw new Error("Work span civil minute is malformed.");
    if (at < this.asOf)
      throw new Error(
        "Work spans are current/future terms, not a historical reconstruction.",
      );
    return Object.freeze({ date: at, minuteOfDay: value.minuteOfDay });
  }
  eligible(
    owner: Omit<WorkSpanOwnerV1, "spans" | "plannedMinutes">,
    at: string,
  ): boolean {
    const row = owner.commitment;
    return (
      at >= row.startsAt &&
      (row.endsAt === undefined || at <= row.endsAt) &&
      (owner.job.endsAt === undefined || at < owner.job.endsAt)
    );
  }
  span(
    row: WorkCommitmentInput,
    index: number,
    at: string,
    shift: number,
  ): WorkSpanV1 | undefined {
    const slot = row.slots[index]!,
      same = Math.min(slot.minutes, this.day - slot.startMinute),
      minutes = shift === this.zero ? same : slot.minutes - same,
      originDate = addDays(makeIsoDate(at), -shift);
    if (
      minutes <= this.zero ||
      originDate < row.startsAt ||
      remainder(
        daysBetweenText(row.anchorDate, at) - slot.offsetDays - shift,
        row.periodDays,
      ) !== this.zero
    )
      return undefined;
    const startMinute = shift === this.zero ? slot.startMinute : this.zero,
      refs = Object.freeze([
        Object.freeze({ kind: this.commitmentKind, id: row.id }),
        Object.freeze({ kind: "job", id: row.jobId }),
        Object.freeze({ kind: "person", id: row.personId }),
        Object.freeze({ kind: "organization", id: row.organizationId }),
      ]);
    return Object.freeze({
      commitmentId: row.id,
      jobId: row.jobId,
      personId: row.personId,
      organizationId: row.organizationId,
      slotIndex: index,
      originDate,
      date: at,
      startMinute,
      endMinute: startMinute + minutes,
      minutes,
      durationEvidence: Object.freeze({
        minutes,
        basis: "work-slot" as const,
        recordRefs: refs,
        parameterRefs: Object.freeze([
          "zero",
          "one",
          "hoursPerDay",
          "minutesPerHour",
        ]),
      }),
    });
  }
  onDate(
    owner: Omit<WorkSpanOwnerV1, "spans" | "plannedMinutes">,
    at: string,
  ): WorkSpanOwnerV1 {
    const row = owner.commitment,
      spans: WorkSpanV1[] = [];
    let plannedMinutes = this.zero;
    if (this.eligible(owner, at)) {
      // Match the old query's slot -> segment grouping exactly, including fractional addition order.
      for (let index = this.zero; index < row.slots.length; index += this.one) {
        let slotMinutes = this.zero;
        for (const shift of [this.zero, this.one]) {
          const span = this.span(row, index, at, shift);
          if (span) {
            spans.push(span);
            slotMinutes += span.minutes;
          }
        }
        plannedMinutes += slotMinutes;
      }
      const residue = remainder(
        daysBetweenText(this.startedAt, at),
        row.periodDays,
      );
      let cached = this.zero;
      // The original first-origin day uses direct terms and never consults the residue cache.
      if (at !== row.startsAt) {
        const residues = this.r.mapGet(
          this.r.field(this.work, "plannedByCommitmentResidue"),
          row.id,
        );
        if (!residues)
          throw new Error("Work spans have no actual admitted residue index.");
        cached = this.r.mapGet(residues, residue) ?? this.zero;
      }
      const view = {
          state: {
            startedAt: this.startedAt,
            date: at,
            data: { parameters: this.parameters },
            work: {
              plannedByCommitmentResidue: new Map([
                [row.id, new Map([[residue, cached]])],
              ]),
            },
          },
          parameter: (key: string) => this.parameters[key]!.value,
        } as unknown as CoreAPI,
        original = plannedWorkMinutesOnDate(view, row, at),
        direct = plannedWorkMinutesBetween(row, at, at, this.parameters);
      if (
        !Number.isFinite(plannedMinutes) ||
        plannedMinutes !== original ||
        plannedMinutes !== direct
      )
        throw new Error(
          "Work span durations differ from the original actual planned-minute query.",
        );
    }
    return Object.freeze({
      ...owner,
      plannedMinutes,
      spans: Object.freeze(spans),
    });
  }
}

/** One actual selected person/date. No current focus/calendar/attendance mutation. */
export function workSpansOnDateV1(
  api: CoreAPI,
  request: Readonly<{ controlledPersonId: string; date: string }>,
): WorkSpansOnDateV1 {
  const r = new FinanceReadGuard(),
    query = copy(r, request),
    personId = text(query.controlledPersonId),
    read = new SpanRead(api, personId, r),
    at = date(query.date);
  if (at < read.asOf)
    throw new Error(
      "Work spans are current/future terms, not a historical reconstruction.",
    );
  const owners = Object.freeze(
      read.rows.map((owner) => read.onDate(owner, at)),
    ),
    result = Object.freeze({
      version,
      controlledPersonId: personId,
      asOf: read.asOf,
      date: at,
      dayMinutes: read.day,
      parameters: read.parameters,
      owners,
      totalPlannedMinutes: owners.reduce(
        (sum, owner) => sum + owner.plannedMinutes,
        read.zero,
      ),
    });
  r.verify(); // Original request/actual owning reads LAST, after detached immutable projection.
  return result;
}

/** Bounded selected-person slots: recurrence jumps, no date/world/history expansion. */
export function earliestWorkBoundaryV1(
  api: CoreAPI,
  request: Readonly<{
    controlledPersonId: string;
    from: WorkMomentV1;
    through: WorkMomentV1;
    /** Only root-owned acknowledgments at the exact current frontier, never client advance options. */
    acknowledgedBoundaryIds?: readonly string[];
  }>,
): WorkBoundaryV1 | undefined {
  const r = new FinanceReadGuard(),
    query = copy(r, request),
    personId = text(query.controlledPersonId),
    read = new SpanRead(api, personId, r),
    from = read.moment(query.from),
    through = read.moment(query.through),
    acknowledged = new Set((query.acknowledgedBoundaryIds ?? []).map(text));
  if (compare(through, from) < read.zero)
    throw new Error("Work boundary window is reversed.");
  let earliest: WorkMomentV1 | undefined;
  const ties: {
    boundary: "start" | "end";
    owner: Omit<WorkSpanOwnerV1, "spans" | "plannedMinutes">;
    at: string;
    slotIndex: number;
    shift: number;
  }[] = [];
  for (const owner of read.rows) {
    const row = owner.commitment;
    for (let index = read.zero; index < row.slots.length; index += read.one)
      for (const shift of [read.zero, read.one])
        for (const boundary of ["start", "end"] as const) {
          // Include yesterday's segment only for an exact midnight end boundary today.
          const slot = row.slots[index]!,
            same = Math.min(slot.minutes, read.day - slot.startMinute),
            minutes = shift === read.zero ? same : slot.minutes - same;
          if (minutes <= read.zero) continue;
          const start = shift === read.zero ? slot.startMinute : read.zero,
            minute = boundary === "start" ? start : start + minutes,
            midnightEnd = minute === read.day ? read.one : read.zero,
            firstOrigin = addDays(makeIsoDate(row.startsAt), shift),
            windowDate = addDays(makeIsoDate(from.date), -midnightEnd),
            lower = windowDate > firstOrigin ? windowDate : firstOrigin,
            jump = remainder(
              slot.offsetDays + shift - daysBetweenText(row.anchorDate, lower),
              row.periodDays,
            );
          let at = addDays(makeIsoDate(lower), jump),
            moment = Object.freeze({
              date: addDays(makeIsoDate(at), midnightEnd),
              minuteOfDay: midnightEnd ? read.zero : minute,
            });
          const boundaryId = JSON.stringify([
            row.id,
            index,
            addDays(makeIsoDate(at), -shift),
            boundary,
          ]);
          if (
            compare(moment, from) < read.zero ||
            (compare(moment, from) === read.zero &&
              acknowledged.has(boundaryId))
          ) {
            at = addDays(makeIsoDate(at), row.periodDays);
            moment = Object.freeze({
              date: addDays(makeIsoDate(at), midnightEnd),
              minuteOfDay: midnightEnd ? read.zero : minute,
            });
          }
          if (!read.eligible(owner, at) || compare(moment, through) > read.zero)
            continue;
          if (!earliest || compare(moment, earliest) < read.zero) {
            earliest = moment;
            ties.length = read.zero;
          }
          if (compare(moment, earliest) === read.zero)
            ties.push({ boundary, owner, at, slotIndex: index, shift });
        }
  }
  const projected = new Map<string, Map<string, WorkSpanOwnerV1>>(),
    reasons = ties.map((tie) => {
      const id = tie.owner.commitment.id,
        dates = projected.get(id) ?? new Map<string, WorkSpanOwnerV1>();
      let owner = dates.get(tie.at);
      if (!owner) {
        owner = read.onDate(tie.owner, tie.at);
        dates.set(tie.at, owner);
        projected.set(id, dates);
      }
      const span = owner.spans.find(
        (value) =>
          value.slotIndex === tie.slotIndex &&
          value.originDate === addDays(makeIsoDate(tie.at), -tie.shift),
      );
      if (!span)
        throw new Error(
          "Work boundary lacks its actual dated duration evidence.",
        );
      return Object.freeze({ boundary: tie.boundary, owner, span });
    });
  const result = earliest
    ? Object.freeze({
        version,
        at: earliest,
        reasons: Object.freeze(reasons),
        parameters: read.parameters,
        asOf: read.asOf,
      })
    : undefined;
  r.verify(); // Original request/owning reads LAST; no chooser/provider/module hook invocation.
  return result;
}

/** A dated owning boundary identity; no guessed timestamp or duration authority. */
export function workBoundaryIdV1(
  reason: WorkBoundaryV1["reasons"][number],
): string {
  return JSON.stringify([
    reason.span.commitmentId,
    reason.span.slotIndex,
    reason.span.originDate,
    reason.boundary,
  ]);
}
