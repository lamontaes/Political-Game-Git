/** Saved evidence inspection only: no evaluator, provider, renderer or writer. */
import { validateCompactChoice } from "./compact-choice";
import { FinanceReadGuard } from "./finance-plan";
import { P } from "./parameters";
import type {
  CoreState,
  CompactChoiceTraceV1,
  DecisionReason,
  DecisionResult,
  Source,
  WeightedReason,
} from "./types";

export type Part1bVersion = "core2-part1b-v1";
export interface SavedRecordRefV1 {
  kind: string;
  id: string;
}
export interface SavedSourceResolutionV1 {
  recordedRef: Readonly<SavedRecordRefV1>;
  status: "resolved-saved-record" | "missing-record" | "ambiguous-record";
}
/** Factual original settlement evidence. These amounts do not imply an actor utility choice. */
export interface SavedPaymentCauseV1 {
  version: "core2-payment-cause-v1";
  mechanism:
    | "recorded-payroll-due"
    | "recorded-standing-transfer"
    | "recorded-credit-request";
  receiptId: string;
  date: string;
  occurrenceEvidence:
    | "source-completion-recorded"
    | "retained-receipt-only"
    | "component-of-completed-group";
  completedAt?: string;
  postedJournalSequence?: number;
  amounts: Readonly<Record<string, number>>;
  due: Readonly<{
    status: "saved" | "not-retained" | "not-applicable";
    dueAt?: string;
    fromAt?: string;
    throughAt?: string;
    nominalDueAt?: string;
  }>;
  priorArrearsStatus: "saved" | "not-retained" | "not-applicable";
  ownerRefs: readonly Readonly<SavedRecordRefV1>[];
  /** Credit receipts retain the facility link, not historical borrower/lender IDs. */
  cashOwnerIdentityStatus: "saved" | "facility-only";
  sources: Readonly<Record<string, Readonly<Source>>>;
  recordedReferences?: readonly Readonly<{
    kind: string;
    id: string;
    date: string;
    source: Readonly<Source>;
  }>[];
  payments?: readonly Readonly<{
    payerId: string;
    requestedMinor: number;
    paidMinor: number;
    payerBeforeMinor: number;
    payerAfterMinor: number;
  }>[];
  components?: readonly Readonly<SavedPaymentCauseV1>[];
  accountingAttributionRule?: string;
}

/** Original earned attendance aggregate: it is neither a cash payment nor a utility decision. */
export interface SavedEarnedPeriodCauseV1 {
  version: "core2-earned-period-cause-v1";
  mechanism: "recorded-attendance-accrual";
  /** Original supporting attendance only; never a period or settlement actor choice. */
  lastAttendanceChoice?: Readonly<CompactChoiceTraceV1>;
  supportingChoiceStatus: "saved-attendance-choice" | "none-saved";
  recordId: string;
  dates: Readonly<Record<string, string>>;
  amounts: Readonly<{
    segmentCount: number;
    plannedMinutes: number;
    attendedMinutes: number;
    earnedMinor: number;
  }>;
  ownerRefs: readonly Readonly<SavedRecordRefV1>[];
  sources: Readonly<Record<string, Readonly<Source>>>;
}

export type SavedTraceV1 = {
  version: Part1bVersion;
  recordId: string;
  savedSources: readonly Readonly<SavedSourceResolutionV1>[];
  paymentCause?: Readonly<SavedPaymentCauseV1>;
  earnedPeriodCause?: Readonly<SavedEarnedPeriodCauseV1>;
} & (
  | {
      status: "saved";
      recordKind: string;
      reasonKey?: string;
      reasons?: Readonly<DecisionReason>;
      reasonTerms?: readonly Readonly<WeightedReason>[];
      scores?: DecisionResult["scores"];
      compactChoice?: Readonly<CompactChoiceTraceV1>;
      scoresStatus: "saved" | "none-saved";
      sourcesStatus: "saved" | "none-saved";
    }
  | {
      status: "no-saved-reason";
      recordKind: string;
      scoresStatus: "none-saved";
      sourcesStatus: "saved" | "none-saved";
    }
  | {
      status: "record-not-found" | "ambiguous-record";
      scoresStatus: "none-saved";
      sourcesStatus: "none-saved";
    }
);

type Row = Record<PropertyKey, unknown>;
type SavedFields = {
  earnedPeriodCause?: Readonly<SavedEarnedPeriodCauseV1>;
  paymentCause?: Readonly<SavedPaymentCauseV1>;
  compactChoice?: Readonly<CompactChoiceTraceV1>;
  reasonKey?: string;
  reasons?: Readonly<DecisionReason>;
  reasonTerms?: readonly Readonly<WeightedReason>[];
  scores?: DecisionResult["scores"];
};
type Located = {
  kind: string;
  aliases: readonly string[];
  identity: Readonly<Record<string, string>>;
  fields: SavedFields;
  evidence: Readonly<Record<string, unknown>>;
  refs: SavedRecordRefV1[];
  conflictingDecision: boolean;
};
const freeze = Object.freeze,
  create = Object.create,
  define = Object.defineProperty;
const prototypeOf = Object.getPrototypeOf;
const shapeProbe = Symbol("saved-trace-own-shape");

function record(raw: unknown): Row {
  if (
    raw === null ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    (prototypeOf(raw) !== Object.prototype && prototypeOf(raw) !== null)
  )
    throw new Error("Saved trace requires ordinary direct data records.");
  return raw as Row;
}
function text(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim())
    throw new Error("Saved trace has a malformed recorded identity.");
  return raw;
}

/** Copy only the declared saved trace/evidence graph, never the CoreState graph. */
function detach<T>(r: FinanceReadGuard, raw: T, active = new Set<object>()): T {
  if (
    typeof raw === "function" ||
    typeof raw === "symbol" ||
    typeof raw === "bigint"
  )
    throw new Error("Saved trace evidence cannot contain executable values.");
  if (typeof raw === "number" && !Number.isFinite(raw))
    throw new Error("Saved trace evidence must contain finite numbers.");
  if (raw === null || typeof raw !== "object") return raw;
  if (active.has(raw))
    throw new Error("Saved trace evidence cannot contain a cycle.");
  const array = Array.isArray(raw),
    prototype = prototypeOf(raw);
  if (
    array
      ? prototype !== Array.prototype
      : prototype !== Object.prototype && prototype !== null
  )
    throw new Error("Saved trace evidence must be plain data.");
  active.add(raw);
  try {
    // Capture the prototype even for an empty ordinary record/array.
    r.field(raw as Row, shapeProbe);
    const keys = r.keys(raw),
      result: Row = array ? ([] as unknown as Row) : create(prototype);
    const length = array
      ? r.field(raw as unknown as unknown[], "length")
      : undefined;
    if (
      array &&
      (!Number.isSafeInteger(length) ||
        length! < P.zero ||
        keys.length !== length! + P.one)
    )
      throw new Error("Saved trace arrays must be dense direct data arrays.");
    if (array)
      for (let index = P.zero; index < length!; index += P.one)
        if (!keys.includes(String(index)))
          throw new Error(
            "Saved trace arrays cannot contain inherited or missing entries.",
          );
    for (const key of keys) {
      if (typeof key !== "string")
        throw new Error("Saved trace cannot copy symbol fields.");
      if (array && key === "length") continue;
      const value = r.field(raw as Row, key);
      define(result, key, {
        value: detach(r, value, active),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return freeze(result) as T;
  } finally {
    active.delete(raw);
  }
}

/** Detached plain values only; no supplied equality hook or JSON/toJSON invocation. */
function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const left = Reflect.ownKeys(a),
    right = Reflect.ownKeys(b);
  return (
    left.length === right.length &&
    left.every(
      (key) => right.includes(key) && equal((a as Row)[key], (b as Row)[key]),
    )
  );
}

/** A fixed set of direct owning-table routes, cached per actual recorded ID. */
class SavedLookup {
  readonly reads = new FinanceReadGuard();
  readonly cache = new Map<string, readonly Located[]>();
  private readonly embedded = new Map<string, Located[]>();
  private readonly work: Row;
  private readonly finance: Row;
  private readonly journal: Row;
  private readonly workKinds: Row | undefined;
  private readonly financeKinds: Row | undefined;
  private readonly financeRelated: Row | undefined;
  private readonly actKind: string;
  private readonly legacyKind: string;
  constructor(private readonly core: Readonly<CoreState>) {
    const r = this.reads,
      data = record(r.field(core, "data"));
    this.work = record(r.field(core, "work"));
    this.finance = record(r.field(core, "finance"));
    this.journal = record(r.field(core, "cashJournal"));
    const work = r.field(data, "work"),
      finance = r.field(data, "finance");
    this.workKinds =
      work === undefined
        ? undefined
        : record(r.field(record(work), "journalSourceKinds"));
    const cash =
      finance === undefined
        ? undefined
        : r.field(record(finance), "cashJournal");
    this.financeKinds =
      cash === undefined
        ? undefined
        : record(r.field(record(cash), "sourceKinds"));
    this.financeRelated =
      cash === undefined
        ? undefined
        : record(r.field(record(cash), "relatedKinds"));
    this.actKind = text(r.field(data, "cashActSourceKind"));
    this.legacyKind = text(r.field(data, "legacyWorkJournalSourceKind"));
  }
  private kind(
    owner: Row | undefined,
    key: string,
    ordinaryKind: string,
  ): string {
    return owner === undefined
      ? ordinaryKind
      : text(this.reads.field(owner, key));
  }
  private get(owner: object, table: string, id: string): unknown {
    return this.reads.mapGet(
      this.reads.field(owner as Row, table) as ReadonlyMap<string, unknown>,
      id,
    );
  }
  private appendRef(refs: SavedRecordRefV1[], kind: string, id: unknown): void {
    if (id === undefined) return;
    const value = text(id);
    if (!refs.some((row) => row.kind === kind && row.id === value))
      refs.push({ kind, id: value });
  }
  private explicitRefs(refs: SavedRecordRefV1[], raw: unknown): void {
    if (raw === undefined) return;
    const values = detach(this.reads, raw);
    if (!Array.isArray(values))
      throw new Error("Saved trace reference list is not an array.");
    for (const value of values) {
      const row = record(value),
        kind = text(this.reads.field(row, "kind")),
        id = text(this.reads.field(row, "id"));
      this.appendRef(refs, kind, id);
    }
  }
  private reasonRefs(refs: SavedRecordRefV1[], terms: unknown): void {
    if (terms === undefined) return;
    if (!Array.isArray(terms))
      throw new Error("Saved trace reason terms are not an array.");
    for (const value of terms) {
      const row = record(value),
        ids = row.sourceIds;
      if (ids === undefined) continue;
      if (!Array.isArray(ids))
        throw new Error("Saved trace reason sources are not an array.");
      for (const id of ids) this.appendRef(refs, "untyped-saved-id", id);
    }
  }
  /** Project only an actual saved result: never consult current terms to reconstruct old money. */
  private payment(
    row: Row,
    mechanism: "payroll" | "contract" | "credit",
    refs: SavedRecordRefV1[],
    component = false,
  ): SavedPaymentCauseV1 | undefined {
    const r = this.reads,
      amounts: Record<string, number> = {},
      ownerRefs: SavedRecordRefV1[] = [],
      sources: Record<string, Readonly<Source>> = {},
      receiptId = text(r.field(row, "id")),
      date = text(r.field(row, "date"));
    let completedAt: string | undefined,
      postedJournalSequence: number | undefined;
    let occurrenceEvidence: SavedPaymentCauseV1["occurrenceEvidence"] =
      component ? "component-of-completed-group" : "retained-receipt-only";
    if (!component) {
      const rawOwner = this.get(
        mechanism === "payroll" ? this.work : this.finance,
        mechanism === "payroll" ? "payrollCashSources" : "cashSources",
        receiptId,
      );
      if (rawOwner !== undefined) {
        const owner = record(rawOwner);
        if (
          r.field(owner, "id") !== receiptId ||
          r.field(owner, "date") !== date
        )
          throw new Error(
            "Saved payment completion has another original receipt identity.",
          );
        const recordedCompletion = r.field(owner, "completedAt"),
          recordedJournal = r.field(owner, "postedJournalSequence");
        if (recordedCompletion === undefined && recordedJournal === undefined)
          return undefined;
        if (recordedCompletion !== undefined)
          completedAt = text(recordedCompletion);
        if (recordedJournal !== undefined) {
          if (
            typeof recordedJournal !== "number" ||
            !Number.isSafeInteger(recordedJournal) ||
            recordedJournal < P.zero
          )
            throw new Error(
              "Saved payment journal completion marker is malformed.",
            );
          postedJournalSequence = recordedJournal;
        }
        occurrenceEvidence = "source-completion-recorded";
      }
    }
    const amount = (key: string) => {
      const value = r.field(row, key);
      if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < P.zero
      )
        throw new Error(
          "Saved payment amount is not a nonnegative exact minor value.",
        );
      amounts[key] = value;
      return value;
    };
    const owner = (kind: string, key: string) => {
      const id = text(r.field(row, key));
      this.appendRef(ownerRefs, kind, id);
      this.appendRef(refs, kind, id);
    };
    for (const key of [
      "source",
      "jobSource",
      "paySource",
      "scheduleSource",
      "calendarSource",
      "earnedPeriodSource",
      "employerOpeningFundsSource",
      "attributionSource",
    ]) {
      const value = r.field(row, key);
      if (value !== undefined) {
        record(value);
        sources[key] = detach(r, value) as Readonly<Source>;
      }
    }
    if (sources.source === undefined)
      throw new Error("Saved payment has no actual receipt Source.");
    const requested = amount("requestedMinor");
    let due: SavedPaymentCauseV1["due"] = { status: "not-retained" },
      payments: SavedPaymentCauseV1["payments"],
      components: SavedPaymentCauseV1["components"],
      recordedReferences: SavedPaymentCauseV1["recordedReferences"],
      accountingAttributionRule: string | undefined;
    if (mechanism === "payroll" && !component) {
      const originalOwner = this.get(
        this.work,
        "payrollCashSources",
        receiptId,
      );
      if (originalOwner !== undefined) {
        const savedOwner = record(originalOwner);
        if (
          r.field(savedOwner, "id") !== receiptId ||
          r.field(savedOwner, "date") !== date
        )
          throw new Error(
            "Saved payroll references have another original receipt owner.",
          );
        const raw = detach(r, r.field(savedOwner, "references"));
        if (!Array.isArray(raw))
          throw new Error("Saved payroll references are not an array.");
        recordedReferences = raw.map((value) => {
          const reference = record(value),
            source = r.field(reference, "source");
          record(source);
          return {
            kind: text(r.field(reference, "kind")),
            id: text(r.field(reference, "id")),
            date: text(r.field(reference, "date")),
            source: detach(r, source) as Readonly<Source>,
          };
        });
      }
    }
    if (mechanism === "payroll") {
      for (const key of [
        "newlyDueMinor",
        "arrearsBeforeMinor",
        "paidMinor",
        "shortfallMinor",
        "paidArrearsMinor",
        "paidNewlyDueMinor",
        "missedNewlyDueMinor",
        "arrearsAfterMinor",
      ])
        amount(key);
      if (
        BigInt(requested) !==
          BigInt(amounts.newlyDueMinor!) +
            BigInt(amounts.arrearsBeforeMinor!) ||
        BigInt(requested) !==
          BigInt(amounts.paidMinor!) + BigInt(amounts.shortfallMinor!) ||
        BigInt(amounts.paidMinor!) !==
          BigInt(amounts.paidArrearsMinor!) +
            BigInt(amounts.paidNewlyDueMinor!) ||
        BigInt(amounts.newlyDueMinor!) !==
          BigInt(amounts.paidNewlyDueMinor!) +
            BigInt(amounts.missedNewlyDueMinor!) ||
        amounts.paidArrearsMinor! > amounts.arrearsBeforeMinor! ||
        amounts.arrearsAfterMinor !== amounts.shortfallMinor
      )
        throw new Error(
          "Saved payroll payment amounts do not conserve original due and arrears.",
        );
      due = {
        status: "saved",
        dueAt: text(r.field(row, "dueAt")),
        fromAt: text(r.field(row, "fromAt")),
        throughAt: text(r.field(row, "throughAt")),
      };
      owner("person", "personId");
      owner("organization", "organizationId");
      owner(
        this.kind(this.workKinds, "payrollCalendar", "work-payroll-calendar"),
        "calendarId",
      );
      const group = r.field(row, "group");
      if (group !== undefined && group !== false && group !== true)
        throw new Error("Saved payroll group discriminator is malformed.");
      if (group === true) {
        if (component)
          throw new Error("Saved payroll components cannot be nested groups.");
        const raw = detach(r, r.field(row, "components"));
        if (!Array.isArray(raw) || raw.length <= P.zero)
          throw new Error(
            "Saved payroll group has no actual component receipts.",
          );
        const ids = new Set<string>();
        components = raw.map((value) => {
          const child = record(value),
            commitmentId = text(r.field(child, "commitmentId"));
          if (
            ids.has(commitmentId) ||
            r.field(child, "groupReceiptId") !== receiptId ||
            [
              "personId",
              "organizationId",
              "calendarId",
              "index",
              "fromAt",
              "throughAt",
              "dueAt",
              "date",
            ].some((key) => r.field(child, key) !== r.field(row, key))
          )
            throw new Error(
              "Saved payroll component has another original owning group.",
            );
          ids.add(commitmentId);
          const saved = this.payment(child, "payroll", refs, true);
          if (saved === undefined)
            throw new Error("Saved completed group lost its actual component.");
          return saved;
        });
        for (const key of Object.keys(amounts))
          if (
            components.reduce(
              (sum, child) => sum + BigInt(child.amounts[key]!),
              BigInt(P.zero),
            ) !== BigInt(amounts[key]!)
          )
            throw new Error(
              "Saved payroll component amounts disagree with the original aggregate.",
            );
        accountingAttributionRule = text(
          r.field(row, "accountingAttributionRule"),
        );
      } else {
        owner("job", "jobId");
        owner(
          this.kind(this.workKinds, "commitment", "work.commitment"),
          "commitmentId",
        );
      }
    } else if (mechanism === "contract") {
      amount("paidMinor");
      amount("unfundedMinor");
      amount("arrearsMinor");
      if (
        BigInt(requested) !==
          BigInt(amounts.paidMinor!) + BigInt(amounts.unfundedMinor!) ||
        amounts.arrearsMinor! > amounts.unfundedMinor!
      )
        throw new Error(
          "Saved standing payment amounts do not conserve the original request.",
        );
      owner(
        this.kind(this.financeRelated, "terms", "finance.standing-terms"),
        "contractId",
      );
      owner("untyped-saved-id", "payeeId");
      const raw = detach(r, r.field(row, "payments"));
      if (!Array.isArray(raw) || raw.length <= P.zero)
        throw new Error("Saved standing payment has no original payer legs.");
      let remaining = requested;
      payments = raw.map((value) => {
        const leg = record(value),
          payerId = text(r.field(leg, "payerId"));
        const read = (key: string) => {
          const amount = r.field(leg, key);
          if (
            typeof amount !== "number" ||
            !Number.isSafeInteger(amount) ||
            amount < P.zero
          )
            throw new Error("Saved standing payer leg has a malformed amount.");
          return amount;
        };
        const requestedMinor = read("requestedMinor"),
          paidMinor = read("paidMinor");
        if (requestedMinor !== remaining || paidMinor > requestedMinor)
          throw new Error(
            "Saved standing payer legs have another original request order.",
          );
        remaining -= paidMinor;
        this.appendRef(ownerRefs, "untyped-saved-id", payerId);
        this.appendRef(refs, "untyped-saved-id", payerId);
        return {
          payerId,
          requestedMinor,
          paidMinor,
          payerBeforeMinor: read("payerBeforeMinor"),
          payerAfterMinor: read("payerAfterMinor"),
        };
      });
      if (remaining !== amounts.unfundedMinor)
        throw new Error(
          "Saved standing payer legs disagree with the original paid amount.",
        );
    } else {
      amount("transferredMinor");
      amount("principalBeforeMinor");
      amount("principalAfterMinor");
      if (
        amounts.transferredMinor! > requested ||
        (BigInt(amounts.principalAfterMinor!) -
          BigInt(amounts.principalBeforeMinor!) !==
          BigInt(amounts.transferredMinor!) &&
          BigInt(amounts.principalBeforeMinor!) -
            BigInt(amounts.principalAfterMinor!) !==
            BigInt(amounts.transferredMinor!))
      )
        throw new Error(
          "Saved credit transfer does not conserve original principal.",
        );
      owner(
        this.kind(this.financeRelated, "facility", "finance.facility-terms"),
        "facilityId",
      );
      due = { status: "not-applicable" };
    }
    return {
      version: "core2-payment-cause-v1",
      mechanism:
        mechanism === "payroll"
          ? "recorded-payroll-due"
          : mechanism === "contract"
            ? "recorded-standing-transfer"
            : "recorded-credit-request",
      receiptId,
      date,
      amounts,
      due,
      occurrenceEvidence,
      ...(completedAt === undefined ? {} : { completedAt }),
      ...(postedJournalSequence === undefined ? {} : { postedJournalSequence }),
      priorArrearsStatus:
        mechanism === "payroll"
          ? "saved"
          : mechanism === "contract"
            ? "not-retained"
            : "not-applicable",
      ownerRefs,
      cashOwnerIdentityStatus:
        mechanism === "credit" ? "facility-only" : "saved",
      sources,
      ...(recordedReferences === undefined ? {} : { recordedReferences }),
      ...(payments === undefined ? {} : { payments }),
      ...(components === undefined ? {} : { components }),
      ...(accountingAttributionRule === undefined
        ? {}
        : { accountingAttributionRule }),
    };
  }
  private earnedPeriod(
    row: Row,
    refs: SavedRecordRefV1[],
  ): SavedEarnedPeriodCauseV1 {
    const r = this.reads,
      ownerRefs: SavedRecordRefV1[] = [],
      dates: Record<string, string> = {},
      sources: Record<string, Readonly<Source>> = {};
    const read = (key: string) => {
      const value = r.field(row, key);
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        ((key === "segmentCount" || key === "earnedMinor") &&
          !Number.isSafeInteger(value)) ||
        value < P.zero
      )
        throw new Error(
          "Saved earned period contribution is not an exact nonnegative value.",
        );
      return value;
    };
    const amounts = {
      segmentCount: read("segmentCount"),
      plannedMinutes: read("plannedMinutes"),
      attendedMinutes: read("attendedMinutes"),
      earnedMinor: read("earnedMinor"),
    };
    if (
      amounts.segmentCount <= P.zero ||
      amounts.attendedMinutes > amounts.plannedMinutes
    )
      throw new Error(
        "Saved earned period attendance contribution is inconsistent.",
      );
    for (const key of [
      "fromAt",
      "throughAt",
      "dueAt",
      "firstEarnedAt",
      "lastEarnedAt",
    ])
      dates[key] = text(r.field(row, key));
    if (
      dates.firstEarnedAt! < dates.fromAt! ||
      dates.lastEarnedAt! > dates.throughAt! ||
      dates.firstEarnedAt! > dates.lastEarnedAt!
    )
      throw new Error(
        "Saved earned period has inconsistent original earning dates.",
      );
    for (const [key, kind] of [
      ["personId", "person"],
      ["organizationId", "organization"],
      ["jobId", "job"],
      [
        "commitmentId",
        this.kind(this.workKinds, "commitment", "work.commitment"),
      ],
      [
        "calendarId",
        this.kind(this.workKinds, "payrollCalendar", "work-payroll-calendar"),
      ],
      ["lastWorkResultId", "work.attendance"],
    ] as const) {
      const id = text(r.field(row, key));
      this.appendRef(ownerRefs, kind, id);
      this.appendRef(refs, kind, id);
    }
    for (const key of ["source", "jobSource", "paySource", "scheduleSource"]) {
      const value = r.field(row, key);
      record(value);
      sources[key] = detach(r, value) as Readonly<Source>;
    }
    let lastAttendanceChoice: Readonly<CompactChoiceTraceV1> | undefined;
    const rawBasis = r.field(row, "lastAttendanceBasis");
    if (rawBasis !== undefined) {
      const basis = record(rawBasis);
      if (
        r.field(basis, "id") !== r.field(row, "lastWorkResultId") ||
        r.field(basis, "date") !== r.field(row, "lastEarnedAt") ||
        r.field(basis, "earnedPayPeriodId") !== r.field(row, "id") ||
        r.field(basis, "payrollCalendarId") !== r.field(row, "calendarId") ||
        ["personId", "organizationId", "jobId", "commitmentId"].some(
          (key) => r.field(basis, key) !== r.field(row, key),
        )
      )
        throw new Error(
          "Saved earned-period supporting attendance has another original owner.",
        );
      const choice = r.field(basis, "compactChoice");
      if (choice !== undefined) {
        lastAttendanceChoice = detach(
          r,
          choice,
        ) as Readonly<CompactChoiceTraceV1>;
        validateCompactChoice(lastAttendanceChoice);
        if (
          lastAttendanceChoice.actorId !== r.field(row, "personId") ||
          lastAttendanceChoice.date !== dates.lastEarnedAt ||
          lastAttendanceChoice.chosen.targetId !== r.field(row, "commitmentId")
        )
          throw new Error(
            "Saved earned-period supporting choice has another original actor or date.",
          );
        this.explicitRefs(refs, lastAttendanceChoice.sourceRecordRefs);
        for (const score of [
          lastAttendanceChoice.chosen,
          ...(lastAttendanceChoice.runnerUp
            ? [lastAttendanceChoice.runnerUp]
            : []),
        ])
          this.reasonRefs(refs, score.reasonTerms);
      }
    }
    return {
      version: "core2-earned-period-cause-v1",
      mechanism: "recorded-attendance-accrual",
      recordId: text(r.field(row, "id")),
      dates,
      amounts,
      ownerRefs,
      sources,
      supportingChoiceStatus:
        lastAttendanceChoice === undefined
          ? "none-saved"
          : "saved-attendance-choice",
      ...(lastAttendanceChoice === undefined ? {} : { lastAttendanceChoice }),
    };
  }
  private row(
    raw: unknown,
    id: string,
    kind: string,
    reason: "decision" | "key" | "none",
    aliases: readonly string[] = [],
    extraRefs: readonly SavedRecordRefV1[] = [],
    payment?: "payroll" | "contract" | "credit",
    earnedPeriod = false,
  ): Located | undefined {
    if (raw === undefined) return undefined;
    const r = this.reads,
      row = record(raw);
    if (text(r.field(row, "id")) !== id)
      throw new Error(
        "Saved trace table key disagrees with its actual record ID.",
      );
    const identity: Record<string, string> = { id },
      refs: SavedRecordRefV1[] = [];
    for (const key of [
      "date",
      "jobId",
      "commitmentId",
      "organizationId",
      "actionId",
      "targetId",
      "contractId",
      "facilityId",
      "calendarId",
      "payrollCalendarId",
      "earnedPayPeriodId",
      "earnedPeriodId",
      "payeeId",
      "fromAt",
      "throughAt",
      "dueAt",
      "groupReceiptId",
    ])
      if (r.field(row, key) !== undefined)
        identity[key] = text(r.field(row, key));
    const actor = r.field(row, "actorId"),
      person = r.field(row, "personId");
    if (actor !== undefined && person !== undefined && actor !== person)
      throw new Error("Saved trace has conflicting recorded actor identities.");
    if (actor !== undefined || person !== undefined)
      identity.actorId = text(actor ?? person);
    // Capture genuine complete saved Source fields, without converting citation text to record IDs.
    const evidence: Record<string, unknown> = {};
    for (const key of [
      "source",
      "jobSource",
      "paySource",
      "scheduleSource",
      "calendarSource",
      "earnedPeriodSource",
      "employerOpeningFundsSource",
    ])
      if (r.field(row, key) !== undefined)
        evidence[key] = detach(r, r.field(row, key));
    const latestChange =
      kind === "relationship" ? r.field(row, "latestChange") : undefined;
    const relationshipChange =
      latestChange === undefined ? undefined : record(latestChange);
    if (relationshipChange) {
      const captured = detach(r, relationshipChange);
      if (
        captured.actorId === captured.otherId ||
        captured.kind !== r.field(row, "kind")
      )
        throw new Error(
          "Saved relationship change has conflicting endpoints or kind.",
        );
      if (
        captured.actorId !== r.field(row, "actorId") &&
        captured.actorId !== r.field(row, "otherId")
      )
        throw new Error("Saved relationship change has another endpoint.");
      if (
        captured.otherId !== r.field(row, "actorId") &&
        captured.otherId !== r.field(row, "otherId")
      )
        throw new Error("Saved relationship change has another endpoint.");
      this.explicitRefs(refs, captured.sourceRecordRefs);
      evidence.relationshipChange = captured;
    }
    const fields: SavedFields = {},
      outer = reason === "none" ? undefined : r.field(row, "reasonKey");
    if (outer !== undefined) fields.reasonKey = text(outer);
    let conflictingDecision = false;
    const savedDecision = relationshipChange
      ? r.field(relationshipChange, "decision")
      : reason === "decision"
        ? r.field(row, "decision")
        : undefined;
    if (savedDecision !== undefined) {
      const decision = record(savedDecision),
        key = text(r.field(decision, "reasonKey"));
      const actorId = text(r.field(decision, "actorId")),
        date = text(r.field(decision, "date"));
      if (relationshipChange) {
        const target = r.field(
            record(r.field(decision, "selected") ?? {}),
            "targetId",
          ),
          compact = r.field(decision, "compactChoice");
        if (
          actorId !== r.field(relationshipChange, "actorId") ||
          date !== r.field(relationshipChange, "date") ||
          (target !== undefined &&
            target !== r.field(relationshipChange, "otherId")) ||
          (compact !== undefined &&
            r.field(record(r.field(record(compact), "chosen")), "targetId") !==
              r.field(relationshipChange, "otherId"))
        )
          throw new Error(
            "Saved relationship decision has another actual change owner, date or target.",
          );
      }
      conflictingDecision =
        (fields.reasonKey !== undefined && fields.reasonKey !== key) ||
        (kind !== "relationship" &&
          identity.actorId !== undefined &&
          identity.actorId !== actorId) ||
        (identity.date !== undefined && identity.date !== date);
      if (fields.reasonKey === undefined) fields.reasonKey = key;
      if (kind === "relationship") identity.actorId = actorId;
      else identity.actorId ??= actorId;
      identity.date ??= date;
      const reasons = r.field(decision, "selectedReasons"),
        terms = r.field(decision, "selectedReasonTerms"),
        scores = r.field(decision, "scores");
      if (reasons !== undefined)
        fields.reasons = detach(r, reasons) as Readonly<DecisionReason>;
      if (terms !== undefined)
        fields.reasonTerms = detach(
          r,
          terms,
        ) as readonly Readonly<WeightedReason>[];
      if (scores !== undefined) {
        const copied = detach(r, scores);
        if (!Array.isArray(copied))
          throw new Error("Saved trace scores are not an array.");
        fields.scores = copied as DecisionResult["scores"];
      }
    }
    const rawCompact =
      r.field(row, "compactChoice") ??
      (savedDecision === undefined
        ? undefined
        : r.field(record(savedDecision), "compactChoice"));
    if (rawCompact !== undefined) {
      const compact = detach(r, rawCompact) as Readonly<CompactChoiceTraceV1>;
      validateCompactChoice(compact);
      const selected =
        savedDecision === undefined
          ? undefined
          : r.field(record(savedDecision), "selected");
      if (selected !== undefined) {
        const offer = record(selected);
        if (
          r.field(offer, "targetId") !== compact.chosen.targetId ||
          r.field(record(r.field(offer, "definition")), "id") !==
            compact.chosen.actionId
        )
          throw new Error(
            "Saved compact choice differs from its original selected offer.",
          );
      }
      conflictingDecision ||=
        (identity.actorId !== undefined &&
          identity.actorId !== compact.actorId) ||
        (identity.date !== undefined && identity.date !== compact.date) ||
        (identity.actionId !== undefined &&
          identity.actionId !== compact.chosen.actionId) ||
        (identity.targetId !== undefined &&
          identity.targetId !== compact.chosen.targetId);
      fields.compactChoice = compact;
      this.explicitRefs(refs, compact.sourceRecordRefs);
      for (const score of [
        compact.chosen,
        ...(compact.runnerUp ? [compact.runnerUp] : []),
      ])
        this.reasonRefs(refs, score.reasonTerms);
    }
    this.reasonRefs(refs, fields.reasonTerms);
    for (const score of fields.scores ?? [])
      this.reasonRefs(refs, score.reasonTerms);
    const links: readonly [string, string][] = [
      ["sourceActId", this.actKind],
      ["cashSourceId", "untyped-saved-id"],
      ["selectionId", this.actKind],
      ["jobId", "job"],
      [
        "commitmentId",
        this.kind(this.workKinds, "commitment", "work.commitment"),
      ],
      [
        "payrollCalendarId",
        this.kind(this.workKinds, "payrollCalendar", "work-payroll-calendar"),
      ],
      [
        "calendarId",
        this.kind(this.workKinds, "payrollCalendar", "work-payroll-calendar"),
      ],
      [
        "earnedPayPeriodId",
        this.kind(this.workKinds, "earnedPayPeriod", "work-earned-pay-period"),
      ],
      [
        "earnedPeriodId",
        this.kind(this.workKinds, "earnedPayPeriod", "work-earned-pay-period"),
      ],
      ["lastWorkResultId", "work.attendance"],
      [
        "priorPayrollReceiptId",
        this.kind(this.workKinds, "payroll", "work-payroll"),
      ],
      [
        "contractId",
        this.kind(this.financeRelated, "terms", "finance.standing-terms"),
      ],
      [
        "facilityId",
        this.kind(this.financeRelated, "facility", "finance.facility-terms"),
      ],
      [
        "creditReceiptId",
        this.kind(this.financeKinds, "credit", "finance.credit-transfer"),
      ],
      ["sourceDriveId", "untyped-saved-id"],
    ];
    for (const [key, role] of links)
      this.appendRef(refs, role, r.field(row, key));
    const basis = r.field(row, "basisRecordIds");
    if (basis !== undefined) {
      const ids = detach(r, basis);
      if (!Array.isArray(ids))
        throw new Error("Saved trace basis is not an array.");
      for (const value of ids) this.appendRef(refs, "untyped-saved-id", value);
    }
    for (const ref of extraRefs) this.appendRef(refs, ref.kind, ref.id);
    const due = r.field(row, "publicPayDue");
    if (due !== undefined) {
      const owned = record(due);
      detach(r, owned);
      this.appendRef(refs, text(r.field(owned, "kind")), r.field(owned, "id"));
    }
    if (payment !== undefined) {
      const saved = this.payment(row, payment, refs);
      if (saved !== undefined) fields.paymentCause = saved;
    }
    if (earnedPeriod) fields.earnedPeriodCause = this.earnedPeriod(row, refs);
    return {
      kind,
      aliases: [kind, ...aliases],
      identity: freeze(identity),
      fields,
      evidence: freeze(evidence),
      refs,
      conflictingDecision,
    };
  }
  private embeddedRow(raw: unknown, kind: string): void {
    if (raw === undefined) return;
    const id = text(this.reads.field(record(raw), "id")),
      saved = this.row(
        raw,
        id,
        kind,
        kind === "work.attendance" ? "decision" : "none",
        [],
        [],
        undefined,
        kind ===
          this.kind(
            this.workKinds,
            "earnedPayPeriod",
            "work-earned-pay-period",
          ),
      )!;
    const rows = this.embedded.get(id) ?? [];
    rows.push(saved);
    this.embedded.set(id, rows);
    this.cache.delete(id);
    if (kind === "work.attendance") this.savedAttendanceSelection(raw);
    if (
      kind ===
      this.kind(this.workKinds, "earnedPayPeriod", "work-earned-pay-period")
    )
      this.savedPeriodAttendance(raw);
  }
  /** The selection actually saved in attendance, not an invented full act log. */
  private savedAttendanceSelection(raw: unknown): void {
    const r = this.reads,
      attendance = record(raw),
      compact = r.field(attendance, "compactChoice");
    if (compact === undefined || r.field(attendance, "decision") !== undefined)
      return;
    const copied = detach(r, compact) as Readonly<CompactChoiceTraceV1>;
    validateCompactChoice(copied);
    if (
      copied.actorId !== r.field(attendance, "personId") ||
      copied.date !== r.field(attendance, "date") ||
      copied.chosen.targetId !== r.field(attendance, "commitmentId")
    )
      throw new Error("Saved attendance selection has another actor or date.");
    const id = text(r.field(attendance, "sourceActId"));
    let hasFullSelection = false;
    for (const original of [
      this.get(this.core, "durableLog", id),
      this.get(this.work, "cashActSelections", id),
    ]) {
      if (original === undefined) continue;
      const owned = record(original);
      if (
        r.field(owned, "id") !== id ||
        r.field(owned, "actorId") !== copied.actorId ||
        r.field(owned, "date") !== copied.date ||
        r.field(owned, "actionId") !== copied.chosen.actionId ||
        r.field(owned, "targetId") !== copied.chosen.targetId ||
        r.field(owned, "reasonKey") !== r.field(attendance, "reasonKey")
      )
        throw new Error(
          "Conflicting saved attendance and original selection identity.",
        );
      hasFullSelection = true;
    }
    if (hasFullSelection) return;
    const saved = this.row(
      {
        id,
        actorId: copied.actorId,
        date: copied.date,
        actionId: copied.chosen.actionId,
        targetId: copied.chosen.targetId,
        reasonKey: r.field(attendance, "reasonKey"),
        compactChoice: copied,
      },
      id,
      "work.saved-selection",
      "key",
      [this.actKind],
    )!;
    const rows = this.embedded.get(id) ?? [];
    rows.push(saved);
    this.embedded.set(id, rows);
    this.cache.delete(id);
  }
  private savedPeriodAttendance(raw: unknown): void {
    const r = this.reads,
      period = record(raw),
      basis = r.field(period, "lastAttendanceBasis");
    if (basis === undefined) return;
    const attendance = record(basis);
    if (
      r.field(attendance, "id") !== r.field(period, "lastWorkResultId") ||
      r.field(attendance, "date") !== r.field(period, "lastEarnedAt") ||
      r.field(attendance, "earnedPayPeriodId") !== r.field(period, "id") ||
      r.field(attendance, "payrollCalendarId") !==
        r.field(period, "calendarId") ||
      ["personId", "organizationId", "commitmentId", "jobId"].some(
        (key) => r.field(attendance, key) !== r.field(period, key),
      )
    )
      throw new Error(
        "Saved earned period attendance has lost its actual ownership.",
      );
    this.embeddedRow(basis, "work.attendance");
  }
  find(id: string, selectedRecord = false): readonly Located[] {
    const cached = this.cache.get(id);
    if (cached !== undefined) return cached;
    const r = this.reads,
      found: Located[] = [];
    const add = (row: Located | undefined) => {
      if (row !== undefined) found.push(row);
    };
    const workResultKind = this.kind(this.workKinds, "result", "work.result"),
      payrollKind = this.kind(this.workKinds, "payroll", "work-payroll"),
      contractKind = this.kind(
        this.financeKinds,
        "contract",
        "finance.contract-settlement",
      ),
      creditKind = this.kind(
        this.financeKinds,
        "credit",
        "finance.credit-transfer",
      );
    const log = this.get(this.core, "durableLog", id);
    if (log !== undefined) {
      const kind = text(r.field(record(log), "kind"));
      add(
        this.row(
          log,
          id,
          kind,
          "decision",
          kind === "person.acted" ? [this.actKind] : [],
        ),
      );
    }
    const quiet = this.get(this.core, "quietChoices", id);
    if (quiet !== undefined) {
      const actorId = text(r.field(record(quiet), "actorId"));
      if (this.get(this.core, "quietChoiceByPerson", actorId) !== id)
        throw new Error(
          "Saved quiet selection has lost its owning person index.",
        );
      add(
        this.row(quiet, id, "person.acted", "key", [
          this.actKind,
          "person.saved-selection",
        ]),
      );
    }
    add(
      this.row(
        this.get(this.work, "cashActSelections", id),
        id,
        "person.acted",
        "key",
        [this.actKind],
      ),
    );
    add(
      this.row(
        this.get(this.work, "detailedAttendance", id),
        id,
        "work.attendance",
        "decision",
      ),
    );
    const jobId = this.get(this.work, "currentAttendanceJobByRecordId", id);
    if (jobId !== undefined) {
      const current = this.get(this.work, "lastAttendanceByJob", text(jobId));
      if (current === undefined || r.field(record(current), "jobId") !== jobId)
        throw new Error(
          "Saved attendance index has lost its actual owning row.",
        );
      add(this.row(current, id, "work.attendance", "decision"));
      if (selectedRecord) this.savedAttendanceSelection(current);
    }
    add(
      this.row(
        this.get(this.work, "detailedResults", id),
        id,
        workResultKind,
        "decision",
      ),
    );
    const workSource = this.get(this.work, "cashSources", id);
    if (workSource !== undefined) {
      const owner = record(workSource),
        mode = text(r.field(owner, "mode")),
        refs: SavedRecordRefV1[] = [],
        kind = mode === "legacy" ? this.legacyKind : workResultKind;
      if (mode !== "legacy" && mode !== "scheduled")
        throw new Error("Saved cash-work mode is malformed.");
      if (
        text(r.field(owner, "id")) !== id ||
        text(r.field(owner, "kind")) !== kind
      )
        throw new Error(
          "Saved cash-work source disagrees with its actual record identity.",
        );
      for (const name of ["commitmentReference", "publicAuthorityReference"]) {
        const reference = r.field(owner, name);
        if (reference !== undefined)
          this.explicitRefs(refs, [detach(r, reference)]);
      }
      this.appendRef(refs, this.actKind, r.field(owner, "selectionId"));
      add(
        this.row(
          r.field(owner, "result"),
          id,
          kind,
          mode === "legacy" ? "key" : "decision",
          [],
          refs,
        ),
      );
    }
    const payrollSource = this.get(this.work, "payrollCashSources", id);
    if (payrollSource !== undefined) {
      const owner = record(payrollSource),
        refs: SavedRecordRefV1[] = [];
      if (
        text(r.field(owner, "id")) !== id ||
        text(r.field(owner, "kind")) !== payrollKind
      )
        throw new Error(
          "Saved payroll source disagrees with its actual record identity.",
        );
      this.explicitRefs(refs, r.field(owner, "references"));
      const result = r.field(owner, "result");
      add(this.row(result, id, payrollKind, "none", [], refs, "payroll"));
      if (selectedRecord) {
        // These are full original owning records already retained with the selected
        // canonical receipt, not related-reference projections reinterpreted as records.
        this.embeddedRow(
          r.field(owner, "earnedPeriod"),
          this.kind(
            this.workKinds,
            "earnedPayPeriod",
            "work-earned-pay-period",
          ),
        );
        const components = r.field(owner, "componentStates");
        if (components !== undefined) {
          if (
            !Array.isArray(components) ||
            prototypeOf(components) !== Array.prototype
          )
            throw new Error(
              "Saved payroll component states are not ordinary arrays.",
            );
          for (const component of r.array(components, P.zero, P.one))
            this.embeddedRow(
              r.field(record(component), "earnedPeriod"),
              this.kind(
                this.workKinds,
                "earnedPayPeriod",
                "work-earned-pay-period",
              ),
            );
        }
        const due = r.field(record(result), "publicPayDue");
        if (due !== undefined)
          this.embeddedRow(due, text(r.field(record(due), "kind")));
      }
    }
    add(
      this.row(
        this.get(this.work, "detailedPayroll", id),
        id,
        payrollKind,
        "none",
        [],
        [],
        "payroll",
      ),
    );
    const receipt = (raw: unknown) => {
      if (raw === undefined) return;
      const owner = record(raw),
        facility = r.field(owner, "facilityId"),
        contract = r.field(owner, "contractId");
      if ((facility !== undefined) === (contract !== undefined))
        throw new Error(
          "Saved finance receipt lacks one actual owning term link.",
        );
      add(
        this.row(
          owner,
          id,
          facility !== undefined ? creditKind : contractKind,
          facility !== undefined ? "key" : "none",
          [],
          [],
          facility !== undefined ? "credit" : "contract",
        ),
      );
    };
    receipt(this.get(this.finance, "cashRequiredReceipts", id));
    receipt(this.get(this.finance, "detailedReceipts", id));
    const financeSource = this.get(this.finance, "cashSources", id);
    if (financeSource !== undefined) {
      const owner = record(financeSource),
        contract = r.field(owner, "contractId"),
        facility = r.field(owner, "facilityId"),
        kind = text(r.field(owner, "kind")),
        refs: SavedRecordRefV1[] = [];
      if (text(r.field(owner, "id")) !== id)
        throw new Error("Saved finance source has another actual identity.");
      if (kind !== contractKind && kind !== creditKind)
        throw new Error("Saved finance source has another owning kind.");
      this.explicitRefs(refs, [detach(r, r.field(owner, "trigger"))]);
      const creditIds = detach(r, r.field(owner, "creditIds"));
      if (!Array.isArray(creditIds))
        throw new Error("Saved finance credit links are not an array.");
      for (const creditId of creditIds)
        this.appendRef(refs, creditKind, creditId);
      // This is a genuinely saved canonical row even while its cash occurrence is pending.
      // Its accounting request does not manufacture an actor decision or completed payment.
      add(this.row(owner, id, kind, "none", [], refs));
      // Actual saved metadata supplies the owning key. No receipt-ID parsing or owner scan.
      const latest =
        contract !== undefined
          ? this.get(this.finance, "latestReceiptsByContract", text(contract))
          : facility !== undefined
            ? this.get(this.finance, "latestCreditByFacility", text(facility))
            : undefined;
      if (latest !== undefined && r.field(record(latest), "id") === id)
        receipt(latest);
    }
    const journal = this.get(this.journal, "detailedReceipts", id);
    if (journal !== undefined) {
      const owner = record(journal),
        refs: SavedRecordRefV1[] = [];
      this.explicitRefs(refs, [detach(r, r.field(owner, "sourceRef"))]);
      this.explicitRefs(refs, r.field(owner, "relatedRecords"));
      add(this.row(owner, id, "cash-journal", "none", [], refs));
    }
    const actualTables: readonly [object, string, string, readonly string[]][] =
      [
        [this.core, "people", "person", []],
        [this.core, "husks", "person-husk", []],
        [this.core, "households", "household", []],
        [
          this.core,
          "jobs",
          "job",
          this.financeRelated
            ? [this.kind(this.financeRelated, "job", "finance.provider-job")]
            : [],
        ],
        [this.core, "organizations", "organization", []],
        [this.core, "publicOrganizations", "public-organization", []],
        [this.core, "relationships", "relationship", []],
        [this.core, "memberships", "membership", []],
        [
          this.work,
          "commitments",
          this.kind(this.workKinds, "commitment", "work.commitment"),
          [],
        ],
        [
          this.work,
          "payrollCalendars",
          this.kind(this.workKinds, "payrollCalendar", "work-payroll-calendar"),
          [],
        ],
        [
          this.work,
          "earnedPayPeriods",
          this.kind(
            this.workKinds,
            "earnedPayPeriod",
            "work-earned-pay-period",
          ),
          [],
        ],
        [
          this.finance,
          "contracts",
          this.kind(this.financeRelated, "terms", "finance.standing-terms"),
          [],
        ],
        [
          this.finance,
          "facilities",
          this.kind(this.financeRelated, "facility", "finance.facility-terms"),
          [],
        ],
      ];
    for (const [owner, table, kind, aliases] of actualTables) {
      const raw = this.get(owner, table, id);
      add(
        this.row(
          raw,
          id,
          kind,
          "none",
          aliases,
          [],
          undefined,
          table === "earnedPayPeriods",
        ),
      );
      if (selectedRecord && raw !== undefined && table === "earnedPayPeriods")
        this.savedPeriodAttendance(raw);
    }
    found.push(...(this.embedded.get(id) ?? []));
    this.cache.set(id, freeze(found));
    return found;
  }
  merge(rows: readonly Located[]): Located | "ambiguous" | undefined {
    let result: Located | undefined;
    for (const row of rows) {
      if (row.conflictingDecision) return "ambiguous";
      if (result === undefined) {
        result = {
          ...row,
          identity: { ...row.identity },
          fields: { ...row.fields },
          refs: [...row.refs],
          evidence: { ...row.evidence },
          aliases: [...row.aliases],
        };
        continue;
      }
      if (result.kind !== row.kind) return "ambiguous";
      for (const [key, value] of Object.entries(row.identity))
        if (
          result.identity[key] !== undefined &&
          result.identity[key] !== value
        )
          return "ambiguous";
      for (const key of [
        "reasonKey",
        "reasons",
        "reasonTerms",
        "scores",
        "compactChoice",
        "paymentCause",
        "earnedPeriodCause",
      ] as const)
        if (
          result.fields[key] !== undefined &&
          row.fields[key] !== undefined &&
          !equal(result.fields[key], row.fields[key])
        )
          return "ambiguous";
      // A selection admission and its act log legitimately have different Source
      // citations. Their actual IDs, dates, actors, action/target and saved reason
      // fields still have to agree. Other duplicate owning evidence must agree fully.
      if (row.kind !== "person.acted")
        for (const [key, value] of Object.entries(row.evidence))
          if (
            result.evidence[key] !== undefined &&
            !equal(result.evidence[key], value)
          )
            return "ambiguous";
      result.identity = { ...result.identity, ...row.identity };
      result.fields = {
        ...row.fields,
        ...Object.fromEntries(
          Object.entries(result.fields).filter(
            ([, value]) => value !== undefined,
          ),
        ),
      };
      result.aliases = [...new Set([...result.aliases, ...row.aliases])];
      result.evidence = { ...result.evidence, ...row.evidence };
      for (const ref of row.refs) this.appendRef(result.refs, ref.kind, ref.id);
    }
    return result;
  }
  source(ref: SavedRecordRefV1): SavedSourceResolutionV1 {
    const rows = this.find(ref.id).filter(
      (row) =>
        ref.kind === "untyped-saved-id" || row.aliases.includes(ref.kind),
    );
    const saved = this.merge(rows);
    return {
      recordedRef: { ...ref },
      status:
        saved === "ambiguous"
          ? "ambiguous-record"
          : saved === undefined
            ? "missing-record"
            : "resolved-saved-record",
    };
  }
}

/** Versioned ID-only query. Accounting references never become inferred actor motives. */
export function resolveSavedTraceV1(
  core: Readonly<CoreState>,
  recordId: string,
): Readonly<SavedTraceV1> {
  text(recordId);
  const query = new SavedLookup(core),
    row = query.merge(query.find(recordId, true));
  let result: SavedTraceV1;
  if (row === undefined || row === "ambiguous")
    result = {
      version: "core2-part1b-v1",
      recordId,
      savedSources: [],
      status: row === undefined ? "record-not-found" : "ambiguous-record",
      scoresStatus: "none-saved",
      sourcesStatus: "none-saved",
    };
  else {
    const savedSources = row.refs.map((ref) => query.source(ref)),
      sourcesStatus =
        savedSources.length > P.zero
          ? ("saved" as const)
          : ("none-saved" as const),
      fields = row.fields;
    if (
      fields.reasonKey !== undefined ||
      fields.reasons !== undefined ||
      fields.reasonTerms !== undefined ||
      fields.scores !== undefined ||
      fields.compactChoice !== undefined
    )
      result = {
        version: "core2-part1b-v1",
        recordId,
        status: "saved",
        recordKind: row.kind,
        ...fields,
        savedSources,
        sourcesStatus,
        scoresStatus: fields.scores === undefined ? "none-saved" : "saved",
      };
    else
      result = {
        version: "core2-part1b-v1",
        recordId,
        status: "no-saved-reason",
        recordKind: row.kind,
        ...(fields.paymentCause === undefined
          ? {}
          : { paymentCause: fields.paymentCause }),
        ...(fields.earnedPeriodCause === undefined
          ? {}
          : { earnedPeriodCause: fields.earnedPeriodCause }),
        savedSources,
        sourcesStatus,
        scoresStatus: "none-saved",
      };
  }
  const detached = detach(query.reads, result);
  // Final rejection-capable check: no callbacks, writes, or further live reads below.
  query.reads.verify();
  return detached;
}
