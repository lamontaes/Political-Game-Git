/** The recorded work owner composes the act, wage, credit and time in one journal. */
import { daysBetween, makeIsoDate } from "../simulation/dates";
import { cashJournalParameters } from "./cash-host";
import { registerModule } from "./state";
import {
  FinancePlanningSession,
  guardWorkFinanceResult,
  prepareWorkFinancePlan,
} from "./finance-plan";
import {
  admitSelectedCashAct,
  cancelUncompletedCashAct,
  resolveSelectedCashAct,
} from "./act-cash";
import {
  admitCompositeFinanceCreditSources,
  cancelCompositeFinanceCreditSources,
  ensureFinanceCashModule,
  finishCompositeFinanceCreditSources,
  releaseCompositeFinanceCreditSources,
  resolveCompositeFinanceCreditSources,
} from "./finance-cash";
import {
  activityAgeId,
  discretionaryHours,
  plannedWorkMinutesOnDate,
  workWeekStart,
} from "./modules/work";
import { validateDatedWorkResult } from "./work-state";
import {
  preparePublicWorkPay,
  resolvePublicWorkPayDue,
} from "./public-work-pay";
import type { CashActSelection } from "./act-cash";
import type { CreditReceipt } from "./finance-types";
import type { PreparedFinancePlan } from "./finance-plan";
import type {
  CashJournalPosting,
  CashJournalSourceRef,
  ResolvedCashJournalSource,
} from "./journal";
import type {
  CashJournalPostedMarker,
  CashJournalSourceProvider,
  CashJournalSourceSlot,
} from "./journal-state";
import type {
  ActOffer,
  CoreAPI,
  CoreModule,
  CoreState,
  DecisionResult,
  IsoDate,
  Source,
  WorkResult,
  WorkResultInput,
} from "./types";

export interface LegacyWorkCashInput {
  personId: string;
  offer: ActOffer;
  date: IsoDate;
  days: number;
  decision: DecisionResult;
}
export interface LegacyWorkCashResult {
  id: string;
  date: IsoDate;
  personId: string;
  jobId: string;
  organizationId: string;
  days: number;
  requestedMinor: number;
  paidMinor: number;
  shortfallMinor: number;
  sourceActId: string;
  reasonKey: string;
  source: Source;
}
export interface WorkCashSourceState extends CashJournalPostedMarker {
  id: string;
  kind: string;
  date: IsoDate;
  personId: string;
  jobId: string;
  organizationId: string;
  selectionId: string;
  mode: "scheduled" | "legacy";
  result: WorkResult | LegacyWorkCashResult;
  credits: readonly CreditReceipt[];
  postings: readonly CashJournalPosting[];
  /** Recorded from the actual commitment before payment, kept for visible past results. */
  commitmentReference?: ResolvedCashJournalSource["relatedRecords"][number];
  publicAuthorityReference?: ResolvedCashJournalSource["relatedRecords"][number];
}
type Pending = {
  plan: PreparedFinancePlan<WorkResult | LegacyWorkCashResult>;
  selection: CashActSelection;
};
const registered = new WeakMap<
  CoreState,
  {
    module: CoreModule;
    providers: readonly [string, CashJournalSourceProvider][];
  }
>();

/** Install only this owner's source providers, without adding a work calendar. */
export function ensureWorkCashModule(core: CoreState): void {
  const existing = registered.get(core);
  if (existing) {
    if (
      core.modules.get(existing.module.id) !== existing.module ||
      existing.providers.some(
        ([kind, provider]) =>
          core.cashJournal.sourceProviders.get(kind) !== provider,
      )
    )
      throw new Error(
        "Actual work cash source module or provider was replaced.",
      );
    return;
  }
  const id = core.data.workCashModuleId,
    kinds = [
      core.data.legacyWorkJournalSourceKind,
      ...(core.data.work ? [core.data.work.journalSourceKinds.result] : []),
    ];
  if (
    !id ||
    id !== id.trim() ||
    kinds.some((kind) => !kind || kind !== kind.trim()) ||
    new Set(kinds).size !== kinds.length
  )
    throw new Error("Actual work cash owner namespace is malformed.");
  const module: CoreModule = {
    id,
    journalSourceProviders: Object.fromEntries(
      kinds.map((kind) => [kind, workCashSourceProvider]),
    ),
  };
  registerModule(core, module);
  registered.set(core, {
    module,
    providers: kinds.map((kind) => [
      kind,
      core.cashJournal.sourceProviders.get(kind)!,
    ]),
  });
}

const pending = new WeakMap<WorkCashSourceState, Pending>();
const mapSet = Map.prototype.set,
  mapDelete = Map.prototype.delete;

function finite(value: number, field: string): number {
  if (!Number.isFinite(value))
    throw new Error("Non-finite dated work consequence: " + field);
  return value;
}
function minor(value: number, zero: number): number {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Dated work minor units are malformed or overflow.");
  return value;
}
function focus(session: FinancePlanningSession, personId: string): boolean {
  const r = session.reads,
    core = session.core;
  return (
    r.field(core, "observer") ||
    r.field(core, "playerId") === personId ||
    r.member(r.field(core, "focusPersonIds"), personId)
  );
}

/** Capture only the actual work/calendar/time inputs touched by this occurrence. */
function captureWorkContext(
  session: FinancePlanningSession,
  api: CoreAPI,
  input: WorkResultInput,
): void {
  const r = session.reads,
    core = session.core,
    work = r.field(core, "work"),
    data = r.field(r.field(core, "data"), "work");
  if (!data) throw new Error("Recorded work requires its actual work data.");
  const row = r.mapGet(r.field(work, "commitments"), input.commitmentId),
    actor = r.mapGet(r.field(core, "people"), input.personId),
    job = r.mapGet(r.field(core, "jobs"), input.jobId),
    previous = r.mapGet(r.field(work, "lastResultByJob"), input.jobId),
    calendar = row
      ? r.mapGet(r.field(work, "plannedByCommitmentResidue"), row.id)
      : undefined,
    today = r.mapGet(r.field(work, "timeByPerson"), input.personId);
  if (row) r.payload(row, session.zero, session.one);
  if (job) r.payload(job, session.zero, session.one);
  if (previous) r.payload(previous, session.zero, session.one);
  if (calendar) r.payload(calendar, session.zero, session.one);
  if (today) r.payload(today, session.zero, session.one);
  r.payload(input, session.zero, session.one);
  if (actor)
    for (const key of ["id", "alive", "jobId", "birthDate"] as const)
      r.field(actor, key);
  r.field(core, "startedAt");
  r.payload(r.field(data, "attendanceAction"), session.zero, session.one);
  r.payload(r.field(data, "absenceAction"), session.zero, session.one);
  for (const key of [
    "hoursPerDay",
    "minutesPerHour",
    "daysPerWeek",
    "mondayIndex",
    r.field(data, "sleepReserveParameter"),
  ])
    session.parameter(key);
  for (const age of r.array(
    r.field(data, "activityAgeRows"),
    session.zero,
    session.one,
  )) {
    r.payload(age, session.zero, session.one);
    session.parameter(age.minimumAgeParameter);
    if (age.maximumAgeParameter) session.parameter(age.maximumAgeParameter);
  }
  // Existing substantive eligibility/time/pay/decision assertions remain shared.
  validateDatedWorkResult(core, api, input);
  if (row && plannedWorkMinutesOnDate(api, row) !== input.plannedMinutes)
    throw new Error("Dated work calendar differs from its actual input.");
}

function stageWorkConsequences(
  session: FinancePlanningSession,
  api: CoreAPI,
  full: WorkResult,
  attended: boolean,
  absent: boolean,
): WorkResult {
  const r = session.reads,
    m = session.metadata,
    core = session.core,
    work = r.field(core, "work"),
    zero = session.zero,
    one = session.one,
    detailed = focus(session, full.personId),
    totalsByJob = r.field(work, "totalsByJob"),
    prior = m.mapGet(totalsByJob, full.jobId);
  m.mapSet(totalsByJob, full.jobId, {
    plannedMinutes: finite(
      (prior ? r.field(prior, "plannedMinutes") : zero) + full.plannedMinutes,
      "planned minutes",
    ),
    attendedMinutes: finite(
      (prior ? r.field(prior, "attendedMinutes") : zero) + full.attendedMinutes,
      "attended minutes",
    ),
    requestedMinor: minor(
      (prior ? r.field(prior, "requestedMinor") : zero) + full.requestedMinor,
      zero,
    ),
    paidMinor: minor(
      (prior ? r.field(prior, "paidMinor") : zero) + full.paidMinor,
      zero,
    ),
    workedDays: minor(
      (prior ? r.field(prior, "workedDays") : zero) + (attended ? one : zero),
      zero,
    ),
    missedDays: minor(
      (prior ? r.field(prior, "missedDays") : zero) + (absent ? one : zero),
      zero,
    ),
  });
  const stored = m.mapSet(
    r.field(work, "lastResultByJob"),
    full.jobId,
    detailed ? full : { ...full, decision: undefined },
  );
  if (detailed) m.mapSet(r.field(work, "detailedResults"), full.id, full);
  const times = r.field(work, "timeByPerson"),
    today = m.mapGet(times, full.personId),
    sameDate = today?.date === core.date;
  m.mapSet(times, full.personId, {
    date: core.date,
    workMinutes: finite(
      (sameDate ? r.field(today!, "workMinutes") : zero) + full.attendedMinutes,
      "occupied time",
    ),
    discretionaryMinutes: sameDate
      ? r.field(today!, "discretionaryMinutes")
      : zero,
  });
  const week = workWeekStart(core.date, api),
    key = `${week}:${full.jobId}`,
    rollups = r.field(work, "rollups"),
    rollup = m.mapGet(rollups, key);
  m.mapSet(rollups, key, {
    weekStartedAt: week,
    jobId: full.jobId,
    personId: full.personId,
    plannedDays: minor(
      (rollup ? r.field(rollup, "plannedDays") : zero) + one,
      zero,
    ),
    workedDays: minor(
      (rollup ? r.field(rollup, "workedDays") : zero) + (attended ? one : zero),
      zero,
    ),
    missedDays: minor(
      (rollup ? r.field(rollup, "missedDays") : zero) + (absent ? one : zero),
      zero,
    ),
    plannedMinutes: finite(
      (rollup ? r.field(rollup, "plannedMinutes") : zero) + full.plannedMinutes,
      "weekly planned time",
    ),
    attendedMinutes: finite(
      (rollup ? r.field(rollup, "attendedMinutes") : zero) +
        full.attendedMinutes,
      "weekly attended time",
    ),
    requestedMinor: minor(
      (rollup ? r.field(rollup, "requestedMinor") : zero) + full.requestedMinor,
      zero,
    ),
    paidMinor: minor(
      (rollup ? r.field(rollup, "paidMinor") : zero) + full.paidMinor,
      zero,
    ),
    latestReasonKey: full.reasonKey,
  });
  m.indexAdd(r.field(work, "rollupsByWeek"), week, key);
  const age = activityAgeId(api, full.personId),
    category = "paid-job-work",
    activityKey = `${age}:${category}`,
    primary = r.field(work, "primaryTimeTotals"),
    oldActivity = m.mapGet(primary, activityKey);
  m.mapSet(primary, activityKey, {
    ageReferenceId: age,
    category,
    minutes: finite(
      (oldActivity ? r.field(oldActivity, "minutes") : zero) +
        full.attendedMinutes,
      "primary work time",
    ),
    source: oldActivity ? r.field(oldActivity, "source") : full.source,
  });
  if (detailed) {
    const known = r.mapGet(r.field(core, "knowledgeByPerson"), full.personId);
    if (!known) throw new Error("Missing watched worker knowledge index.");
    m.mapSet(known, `job:${full.jobId}:latest-work-result`, {
      key: `job:${full.jobId}:latest-work-result`,
      value: JSON.stringify({
        date: core.date,
        plannedMinutes: full.plannedMinutes,
        attendedMinutes: full.attendedMinutes,
        requestedMinor: full.requestedMinor,
        paidMinor: full.paidMinor,
        reasonKey: full.reasonKey,
      }),
      learnedAt: core.date,
      sourceId: full.commitmentId,
      access: "self",
    });
  }
  return stored;
}

function sourceReferences(
  core: CoreState,
  row: WorkCashSourceState,
  selection: CashActSelection,
  prepared: boolean,
): Pick<ResolvedCashJournalSource, "requiredRelatedRefs" | "relatedRecords"> &
  Pick<CashJournalSourceSlot, "secondaryMarkers"> {
  const actRef = { kind: core.data.cashActSourceKind, id: selection.id },
    trigger = { kind: row.kind, id: row.id };
  const credit = resolveCompositeFinanceCreditSources(
    core,
    row.credits,
    trigger,
  );
  const requiredRelatedRefs = [actRef, ...credit.requiredRelatedRefs],
    relatedRecords = [
      { ...actRef, date: selection.date, source: selection.source },
      ...credit.relatedRecords,
    ];
  if (row.mode === "scheduled") {
    const result = row.result as WorkResult,
      recorded = row.commitmentReference;
    if (!recorded || recorded.id !== result.commitmentId)
      throw new Error("Actual recorded work commitment provenance is absent.");
    if (prepared) {
      const commitment = core.work.commitments.get(result.commitmentId),
        cfg = core.data.work;
      if (
        !cfg ||
        !commitment ||
        commitment.jobId !== row.jobId ||
        commitment.personId !== row.personId ||
        commitment.organizationId !== row.organizationId ||
        recorded.kind !== cfg.journalSourceKinds.commitment ||
        recorded.date !== commitment.startsAt ||
        JSON.stringify(recorded.source) !== JSON.stringify(commitment.paySource)
      )
        throw new Error(
          "Actual owned work commitment is absent or inconsistent.",
        );
    }
    requiredRelatedRefs.push({ kind: recorded.kind, id: recorded.id });
    relatedRecords.push(recorded);
    const due = result.publicPayDue,
      authorityRef = row.publicAuthorityReference;
    if (due) {
      if (!authorityRef || authorityRef.id !== due.authorityId)
        throw new Error(
          "Public work source lost its recorded paying authority.",
        );
      if (prepared) {
        const current = new FinancePlanningSession(
          core,
          core.cashJournal,
          cashJournalParameters(core),
        );
        const actualDue = resolvePublicWorkPayDue(current, result),
          authority = core.organizations.get(
            result.organizationId,
          )?.publicPayAuthority;
        if (
          !actualDue ||
          JSON.stringify(actualDue) !== JSON.stringify(due) ||
          !authority ||
          authorityRef.kind !==
            core.data.work?.journalSourceKinds.publicPayAuthority ||
          authorityRef.date !== authority.source.asOf ||
          JSON.stringify(authorityRef.source) !==
            JSON.stringify(authority.source)
        )
          throw new Error(
            "Public work payment lost its actual current due obligation.",
          );
        current.reads.verify();
      }
      const dueRef = { kind: due.kind, id: due.id };
      requiredRelatedRefs.push(dueRef, {
        kind: authorityRef.kind,
        id: authorityRef.id,
      });
      relatedRecords.push(
        { ...dueRef, date: due.date, source: due.source },
        authorityRef,
      );
    } else if (authorityRef) {
      throw new Error(
        "Public work authority has no actual recorded wage obligation.",
      );
    }
  }
  return {
    requiredRelatedRefs,
    relatedRecords,
    secondaryMarkers: prepared
      ? [{ reference: actRef, marker: selection }, ...credit.secondaryMarkers]
      : [],
  };
}

/** Both lookups resolve genuine current records; the original full read guard is checked last. */
export function workCashSourceProvider(
  api: CoreAPI,
  reference: Readonly<CashJournalSourceRef>,
): CashJournalSourceSlot | undefined {
  const core = api.state as CoreState,
    row = core.work.cashSources.get(reference.id);
  if (!row || row.id !== reference.id || row.kind !== reference.kind)
    return undefined;
  const bundle = pending.get(row),
    prepared = bundle !== undefined;
  const selection = prepared
    ? resolveSelectedCashAct(core, row.selectionId, row.id)
    : core.work.cashActSelections.get(row.selectionId);
  if (
    !selection ||
    selection.id !== row.selectionId ||
    selection.cashSourceId !== row.id ||
    selection.personId !== row.personId ||
    selection.date !== row.date ||
    row.result.id !== row.id ||
    row.result.sourceActId !== selection.id ||
    row.result.personId !== row.personId ||
    row.result.jobId !== row.jobId ||
    row.result.organizationId !== row.organizationId
  )
    throw new Error(
      "Canonical work cash source lost its actual selected act or result.",
    );
  if (
    prepared &&
    (row.date !== core.date ||
      row.postedJournalSequence !== undefined ||
      row.completedAt !== undefined)
  )
    throw new Error(
      "Actual current work cash source is stale or already completed.",
    );
  if (
    !prepared &&
    row.postedJournalSequence === undefined &&
    row.completedAt === undefined
  )
    throw new Error(
      "Work source has neither current preparation nor actual completion.",
    );
  const related = sourceReferences(core, row, selection, prepared);
  const slot: CashJournalSourceSlot = {
    resolved: {
      kind: row.kind,
      id: row.id,
      date: row.date,
      source: row.result.source,
      expectedPostings: row.postings,
      postedJournalSequence: row.postedJournalSequence,
      requiredRelatedRefs: related.requiredRelatedRefs,
      relatedRecords: related.relatedRecords,
      externalFlowAuthorizations: bundle?.plan.externalFlowAuthorizations ?? [],
    },
    marker: row,
    metadata: bundle?.plan.metadata ?? [],
    secondaryMarkers: related.secondaryMarkers,
    retainFull: false,
  };
  if (bundle)
    bundle.plan.preflight.verify(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    );
  return slot;
}

function prunePriorSource(
  core: CoreState,
  api: CoreAPI,
  priorId: string | undefined,
): void {
  if (!priorId) return;
  const prior = core.work.cashSources.get(priorId);
  if (
    !prior ||
    core.work.detailedResults.has(priorId) ||
    core.durableLog.has(prior.selectionId)
  )
    return;
  if (core.cashJournal.requiredBySource.get(prior.kind)?.has(prior.id))
    api.releaseJournalSource({ kind: prior.kind, id: prior.id });
  releaseCompositeFinanceCreditSources(core, api, prior.credits);
  mapDelete.call(core.work.cashSources, prior.id);
  mapDelete.call(core.work.cashActSelections, prior.selectionId);
}

function submit(
  core: CoreState,
  api: CoreAPI,
  session: FinancePlanningSession,
  row: WorkCashSourceState,
  selection: CashActSelection,
  priorId: string | undefined,
  returned: WorkResult | LegacyWorkCashResult = row.result,
): WorkResult | LegacyWorkCashResult {
  if (api.state !== core)
    throw new Error("Coupled work writer has another actual host.");
  try {
    if (core.work.cashSources.has(row.id))
      throw new Error("Duplicate canonical work cash source.");
    mapSet.call(core.work.cashSources, row.id, row);
    if (
      session.reads.mapGet(
        session.reads.field(core.work, "cashSources"),
        row.id,
      ) !== row
    )
      throw new Error("Work cash source was not admitted.");
    for (const key of [
      "id",
      "kind",
      "date",
      "personId",
      "jobId",
      "organizationId",
      "selectionId",
      "mode",
      "result",
      "credits",
      "commitmentReference",
      "publicAuthorityReference",
    ] as const)
      session.reads.field(row, key);
    session.reads.payload(row.result, session.zero, session.one);
    session.reads.payload(row.credits, session.zero, session.one);
    if (row.commitmentReference)
      session.reads.payload(row.commitmentReference, session.zero, session.one);
    if (row.publicAuthorityReference)
      session.reads.payload(
        row.publicAuthorityReference,
        session.zero,
        session.one,
      );
    admitCompositeFinanceCreditSources(core, session, row.credits, {
      kind: row.kind,
      id: row.id,
    });
    const plan = session.seal(returned),
      callerResult = structuredClone(plan.result);
    row.postings = plan.postings;
    pending.set(row, { plan, selection });
    if (plan.postings.length > session.zero)
      api.postJournal({
        id: `journal:${core.date}:${core.cashJournal.nextSequence}`,
        date: core.date,
        expectedSequence: core.cashJournal.nextSequence,
        sourceRef: { kind: row.kind, id: row.id },
        postings: plan.postings,
      });
    else api.completeJournalSource({ kind: row.kind, id: row.id });
    pending.delete(row);
    finishCompositeFinanceCreditSources(core, api, row.credits);
    prunePriorSource(core, api, priorId);
    return callerResult;
  } catch (error) {
    pending.delete(row);
    cancelCompositeFinanceCreditSources(core, row.credits);
    cancelUncompletedCashAct(core, selection);
    if (
      row.postedJournalSequence === undefined &&
      row.completedAt === undefined
    )
      mapDelete.call(core.work.cashSources, row.id);
    throw error;
  }
}

export function settleWorkResultJournal(
  core: CoreState,
  api: CoreAPI,
  input: WorkResultInput,
): WorkResult {
  ensureWorkCashModule(core);
  ensureFinanceCashModule(core);
  const s = new FinancePlanningSession(
    core,
    core.cashJournal,
    cashJournalParameters(core),
  );
  captureWorkContext(s, api, input);
  const row = core.work.commitments.get(input.commitmentId)!,
    actor = core.people.get(input.personId)!,
    decision = input.decision!,
    cfg = core.data.work!;
  const priorId = core.work.lastResultByJob.get(input.jobId)?.id;
  const selection = admitSelectedCashAct(
    core,
    api,
    s,
    actor.id,
    decision.selected!,
    core.date,
    decision,
    input.id,
  );
  let credits: readonly CreditReceipt[] = [];
  try {
    const publicPayDue = resolvePublicWorkPayDue(s, input);
    if (publicPayDue) api.stopgap("SG-P8-public-payroll-due-flow");
    preparePublicWorkPay(s, publicPayDue);
    const finance = prepareWorkFinancePlan(
      s,
      row.organizationId,
      actor.id,
      input.requestedMinor,
      input.id,
    );
    credits = finance.credits;
    const full: WorkResult = {
      ...input,
      paidMinor: finance.expectedPaidMinor,
      sourceActId: selection.id,
      shortfallMinor: input.requestedMinor - finance.expectedPaidMinor,
      payerCashBeforeMinor: finance.payerCashBeforeMinor,
      payerCashAfterMinor: finance.payerCashAfterMinor,
      payeeCashBeforeMinor: finance.payeeCashBeforeMinor,
      payeeCashAfterMinor: finance.payeeCashAfterMinor,
      jobSource: { ...core.jobs.get(row.jobId)!.source },
      paySource: { ...row.paySource },
      employerOpeningFundsSource: {
        ...s.reads.field(core.organizations.get(row.organizationId)!, "source"),
      },
      ...(publicPayDue ? { publicPayDue } : {}),
      source: {
        tag: "SOURCED",
        asOf: core.date,
        citation:
          "Actual owned-job attendance, occupied minutes, recorded pay terms and a conserving coupled cash journal; schedule/pay estimates remain on the commitment.",
      },
    };
    guardWorkFinanceResult(s, full, finance);
    const stored = stageWorkConsequences(
      s,
      api,
      full,
      decision.selected!.definition.effect === cfg.attendanceAction.effect,
      decision.selected!.definition.effect === cfg.absenceAction.effect,
    );
    const canonical: WorkCashSourceState = {
      id: full.id,
      kind: cfg.journalSourceKinds.result,
      date: core.date,
      personId: actor.id,
      jobId: row.jobId,
      organizationId: row.organizationId,
      selectionId: selection.id,
      mode: "scheduled",
      result: stored,
      credits,
      postings: [],
      commitmentReference: Object.freeze({
        kind: cfg.journalSourceKinds.commitment,
        id: row.id,
        date: row.startsAt,
        source: Object.freeze({ ...row.paySource }),
      }),
      ...(publicPayDue
        ? {
            publicAuthorityReference: Object.freeze({
              kind: s.reads.field(cfg.journalSourceKinds, "publicPayAuthority"),
              id: publicPayDue.authorityId,
              date: core.organizations.get(row.organizationId)!
                .publicPayAuthority!.source.asOf,
              source: Object.freeze({
                ...core.organizations.get(row.organizationId)!
                  .publicPayAuthority!.source,
              }),
            }),
          }
        : {}),
    };
    return submit(
      core,
      api,
      s,
      canonical,
      selection,
      priorId,
      full,
    ) as WorkResult;
  } catch (error) {
    cancelCompositeFinanceCreditSources(core, credits);
    cancelUncompletedCashAct(core, selection);
    throw error;
  }
}

/** The legacy life activation's date and assumed duration share the same commit. */
function stageLegacyActivation(
  session: FinancePlanningSession,
  api: CoreAPI,
  actorId: string,
  offer: ActOffer,
): void {
  const r = session.reads,
    m = session.metadata,
    core = session.core,
    actor = r.mapGet(r.field(core, "people"), actorId)!;
  m.write(actor, "lastActDate", session.date);
  const data = r.field(r.field(core, "data"), "work");
  if (!data) return;
  r.field(actor, "birthDate");
  for (const age of r.array(
    r.field(data, "activityAgeRows"),
    session.zero,
    session.one,
  )) {
    r.payload(age, session.zero, session.one);
    session.parameter(age.minimumAgeParameter);
    if (age.maximumAgeParameter) session.parameter(age.maximumAgeParameter);
  }
  const work = r.field(core, "work"),
    times = r.field(work, "timeByPerson"),
    today = m.mapGet(times, actorId);
  if (today) r.payload(today, session.zero, session.one);
  const ids = r.mapGet(r.field(work, "commitmentsByPerson"), actorId);
  for (const id of ids ? r.members(ids) : []) {
    const commitment = r.mapGet(r.field(work, "commitments"), id);
    if (!commitment)
      throw new Error(
        "Legacy activity has an inconsistent actual commitment index.",
      );
    r.payload(commitment, session.zero, session.one);
    if (
      commitment.jobId === actor.jobId &&
      commitment.startsAt <= core.date &&
      (!commitment.endsAt || commitment.endsAt >= core.date)
    )
      throw new Error(
        "An actual scheduled job cannot also receive calendar-average legacy pay.",
      );
  }
  session.parameter("hoursPerDay");
  session.parameter(r.field(data, "sleepReserveParameter"));
  const minutesPerHour = session.parameter("minutesPerHour"),
    hours =
      r.field(offer, "effortHours") ??
      session.parameter(r.field(offer.definition, "effortParameter")),
    minutes = finite(hours * minutesPerHour, "legacy activity duration");
  if (
    minutes < session.zero ||
    minutes > discretionaryHours(api, actorId) * minutesPerHour
  )
    throw new Error(
      "Legacy activity exceeds the actual remaining-time budget.",
    );
  const sameDate = today?.date === core.date;
  m.mapSet(times, actorId, {
    date: core.date,
    workMinutes: sameDate ? r.field(today!, "workMinutes") : session.zero,
    discretionaryMinutes: finite(
      (sameDate ? r.field(today!, "discretionaryMinutes") : session.zero) +
        minutes,
      "legacy occupied time",
    ),
  });
  const crosswalk = r.field(data, "primaryActivityCrosswalk");
  r.payload(crosswalk, session.zero, session.one);
  const category =
      crosswalk.find((row) => row.effect === offer.definition.effect)
        ?.category ?? `unmapped:${offer.definition.effect}`,
    age = activityAgeId(api, actorId),
    key = `${age}:${category}`,
    totals = r.field(work, "primaryTimeTotals"),
    prior = m.mapGet(totals, key);
  m.mapSet(totals, key, {
    ageReferenceId: age,
    category,
    minutes: finite(
      (prior ? r.field(prior, "minutes") : session.zero) + minutes,
      "legacy primary activity time",
    ),
    source: prior
      ? r.field(prior, "source")
      : {
          tag: "ESTIMATED",
          asOf: core.date,
          citation:
            "Actual selected prototype act and its registered assumed duration, not an observed diary duration.",
          estimatedFrom:
            "Attempt/time duration follows the admitted offer. Crosswalk limitations remain explicit and unmodeled primary activities are not assigned fabricated minutes.",
        },
  });
}

/** Legacy calendar-average pay also requires its actual selected act; bare transfer is gone. */
export function settleLegacyWorkResultJournal(
  core: CoreState,
  api: CoreAPI,
  input: LegacyWorkCashInput,
): LegacyWorkCashResult {
  ensureWorkCashModule(core);
  ensureFinanceCashModule(core);
  const s = new FinancePlanningSession(
      core,
      core.cashJournal,
      cashJournalParameters(core),
    ),
    r = s.reads,
    m = s.metadata;
  r.payload(input, s.zero, s.one);
  const actor = r.mapGet(r.field(core, "people"), input.personId),
    job = r.mapGet(r.field(core, "jobs"), input.offer.targetId);
  if (
    !actor ||
    !job ||
    r.field(actor, "jobId") !== r.field(job, "id") ||
    r.field(job, "personId") !== input.personId ||
    (r.field(job, "endsAt") !== undefined && job.endsAt! <= core.date) ||
    input.date !== core.date ||
    !Number.isSafeInteger(input.days) ||
    input.days !==
      daysBetween(
        makeIsoDate(r.field(actor, "lastActDate")),
        makeIsoDate(input.date),
      ) ||
    input.days <= s.zero ||
    input.offer.definition.effect !== "paid-work"
  )
    throw new Error(
      "Legacy pay requires its actual current owned job, selected work and positive elapsed days.",
    );
  r.payload(job, s.zero, s.one);
  const work = r.field(core, "work"),
    latest = r.field(work, "latestLegacyCashResultByPerson"),
    prior = m.mapGet(latest, actor.id),
    requested = minor(
      Math.round(r.field(job, "wageDailyMinor") * input.days),
      s.zero,
    ),
    id = `legacy-work-result:${core.date}:${actor.id}:${r.field(actor, "actCount")}`;
  const selection = admitSelectedCashAct(
    core,
    api,
    s,
    actor.id,
    input.offer,
    core.date,
    input.decision,
    id,
  );
  let credits: readonly CreditReceipt[] = [];
  try {
    const finance = prepareWorkFinancePlan(
      s,
      job.organizationId,
      actor.id,
      requested,
      id,
    );
    credits = finance.credits;
    const result: LegacyWorkCashResult = {
      id,
      date: core.date,
      personId: actor.id,
      jobId: job.id,
      organizationId: job.organizationId,
      days: input.days,
      requestedMinor: requested,
      paidMinor: finance.expectedPaidMinor,
      shortfallMinor: requested - finance.expectedPaidMinor,
      sourceActId: selection.id,
      reasonKey: input.decision.reasonKey,
      source: {
        tag: "SOURCED",
        asOf: core.date,
        citation:
          "Actual legacy calendar-average job pay and selected work act, settled through the conserving coupled cash journal.",
      },
    };
    stageLegacyActivation(s, api, actor.id, input.offer);
    const stored = m.mapSet(latest, actor.id, result);
    const data = r.field(core, "data"),
      kind = r.field(data, "legacyWorkJournalSourceKind");
    const canonical: WorkCashSourceState = {
      id,
      kind,
      date: core.date,
      personId: actor.id,
      jobId: job.id,
      organizationId: job.organizationId,
      selectionId: selection.id,
      mode: "legacy",
      result: stored,
      credits,
      postings: [],
    };
    return submit(
      core,
      api,
      s,
      canonical,
      selection,
      prior?.id,
    ) as LegacyWorkCashResult;
  } catch (error) {
    cancelCompositeFinanceCreditSources(core, credits);
    cancelUncompletedCashAct(core, selection);
    throw error;
  }
}
