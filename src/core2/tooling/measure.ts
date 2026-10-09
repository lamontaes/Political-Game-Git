import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../../simulation/dates";
import { stableHash } from "../../simulation/ids";
import { buildDeepPast } from "../deep-past";
import { enrichCivicInputs } from "../civic-inputs";
import { developerBanners } from "../stopgaps";
import { buildPopulation } from "../population";
import { parameter } from "../parameters";
import type { CoreInput, CoreState } from "../types";
import { advanceCore, createLifeCore } from "../life";
import { initialFocusPeople } from "../focus";
import { buildOpeningPeerContacts } from "../opening-peer-network";
import { CORE_API_VERSION, CORE_SCHEMA_VERSION, DEFAULT_DATA } from "../data";
import measurementData from "../data/measurement.json" with { type: "json" };
import {
  summarizeWorkObservables,
  type WorkObservableSummary,
} from "./work-observables";

type MeasureMode = "opening" | "year" | "pre-run";

interface MeasurementData {
  version: string;
  seed: string;
  startedAt: string;
  preRunThrough: string;
  source: {
    tag: "SOURCED";
    asOf: string;
    citation: string;
  };
}

interface MemorySample {
  heapUsedMiB: number;
  rssMiB: number;
  processLifetimeMaxRssMiB: number;
}

interface ActTotals {
  acts: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
}

interface MonthlyActionCounter {
  month: string;
  actorId: string;
  actionId: string;
  acts: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
}

interface RunWindowReasonSummary {
  scope: "simulated-month-buckets-captured-before-retention-pruning";
  startDate: string;
  throughDate: string;
  monthsCovered: string[];
  canonicalHash: string;
  totals: ActTotals;
  byMonth: Record<string, ActTotals>;
  byActionId: Record<string, ActTotals>;
  byPerson?: Record<string, ActTotals>;
  personMonthActionRows?: MonthlyActionCounter[];
  affectSamples: {
    date: string;
    personId: string;
    mood: number;
    stress: number;
    moodBaseline: number;
    stressBaseline: number;
    lastChoice?: string;
    driveCount: number;
  }[];
}

interface RunResult {
  elapsedMilliseconds: number;
  initializeMilliseconds: number;
  advanceMilliseconds: number;
  daysPerMinute: number;
  simulatedDays: number;
  decisions: number;
  acts: number;
  actStatsHash: string;
  workStatsHash: string;
  memory: {
    before: MemorySample;
    after: MemorySample;
    heapDeltaMiB: number;
    rssDeltaMiB: number;
  };
  world: WorldSummary;
}

interface WorldSummary {
  work: WorkObservableSummary;
  counts: {
    people: number;
    households: number;
    jobs: number;
    organizations: number;
    husks: number;
    durableRecords: number;
    peopleByTier: Record<string, number>;
    dailyCirclePeople: number;
  };
  allTimeActCount: number;
  allTimeActsByActionId: Record<string, number>;
  allTimeActsByMonth: Record<string, number>;
  allTimeActsByMonthActionId: Record<string, Record<string, number>>;
  allTimeActKindTagsByMonth: Record<string, Record<string, number>>;
  actStatsHash: string;
  reasonContributionsRetained: {
    scope: "retained-month-window-only";
    retentionMonths: number;
    throughDate: string;
    retainedMonths: string[];
    totals: ActTotals;
    byMonth: Record<string, ActTotals>;
    byActionId: Record<string, ActTotals>;
    byPerson: Record<string, ActTotals>;
  };
  reasonContributionsRunWindow: RunWindowReasonSummary;
  recordVisibility: Record<string, number>;
  gaps: string[];
  stopgaps: string[];
  allTimeActCountsByPerson?: Record<
    string,
    { acts: number; byActionId: Record<string, number> }
  >;
}

const P = (key: string): number => parameter(key);
const measurement = measurementData as MeasurementData;
const measurementDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = resolve(measurementDirectory, "../..");
const bytesPerMiB = P("bytesPerMiB");
const zero = P("zero");
const one = P("one");

function progress(phase: string, detail: Record<string, unknown> = {}): void {
  process.stderr.write(
    `[${new Date().toISOString()}] ${phase} ${JSON.stringify(detail)}\n`,
  );
}

function memorySample(): MemorySample {
  const usage = process.memoryUsage();
  return {
    heapUsedMiB: usage.heapUsed / bytesPerMiB,
    rssMiB: usage.rss / bytesPerMiB,
    // Node reports resourceUsage.maxRSS in KiB.
    processLifetimeMaxRssMiB:
      (process.resourceUsage().maxRSS * P("bytesPerKiB")) / bytesPerMiB,
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
}

function traceSelection(
  input: CoreInput,
  mode: MeasureMode,
  requestedPlayerId?: string,
): {
  input: CoreInput;
  playerId: string;
  countyId: string;
  focusPersonIds: string[];
  focusPlaceIds: string[];
  visiblePlaceIds: string[];
  tierScope: "normal-circle-daily-town-weekly" | "pre-run-full-county-daily";
  peerPrior: {
    contactCount: number;
    contacts: ReturnType<typeof buildOpeningPeerContacts>["contacts"];
    reports: ReturnType<typeof buildOpeningPeerContacts>["reports"];
  };
} {
  const jobByPerson = new Map(input.jobs.map((job) => [job.personId, job]));
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const workersByOrganization = new Map<string, Set<string>>();
  for (const job of input.jobs) {
    let workers = workersByOrganization.get(job.organizationId);
    if (!workers) {
      workers = new Set();
      workersByOrganization.set(job.organizationId, workers);
    }
    workers.add(job.personId);
  }
  const candidates = input.people.flatMap((person) => {
    if (
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(input.startedAt)) <
        P("benchmarkAdultMinimumAge") ||
      !person.countyId
    )
      return [];
    const job = person.jobId ? jobByPerson.get(person.id) : undefined;
    if (!job || job.id !== person.jobId) return [];
    const coworkers = workersByOrganization.get(job.organizationId);
    if (!coworkers) return [];
    const knownCoworkers = person.knownIds.filter(
      (id) => id !== person.id && coworkers.has(id),
    );
    return [{ person, knownCoworkers }];
  });
  if (candidates.length === zero)
    throw new Error(
      "No sourced adult with a county and owned job exists in the generated population.",
    );
  candidates.sort((left, right) => {
    const leftKey = stableHash(
      `${measurement.seed}:benchmark-player:${left.person.id}`,
    );
    const rightKey = stableHash(
      `${measurement.seed}:benchmark-player:${right.person.id}`,
    );
    return (
      leftKey.localeCompare(rightKey) ||
      left.person.id.localeCompare(right.person.id)
    );
  });
  const selected = requestedPlayerId
    ? candidates.find((row) => row.person.id === requestedPlayerId)
    : candidates[zero];
  if (!selected)
    throw new Error(
      `Requested benchmark person is not an eligible recorded worker: ${requestedPlayerId}`,
    );
  const player = selected.person;
  const peers = buildOpeningPeerContacts(input, { personIds: [player.id] });
  input = peers.input;
  const household = input.households.find(
    (row) => row.id === player.householdId,
  );
  if (!household)
    throw new Error(`Benchmark player has no household: ${player.id}`);
  const focusPeople = initialFocusPeople({ ...input, playerId: player.id });
  for (const id of focusPeople) if (!peopleById.has(id)) focusPeople.delete(id);
  const focusPersonIds = [...focusPeople].sort();
  const countyId = player.countyId;
  if (!countyId)
    throw new Error(`Benchmark player has no county focus: ${player.id}`);
  const focusPlaceIds = mode === "pre-run" ? [countyId] : [];
  const visiblePlaceIds = [...new Set([player.placeId, countyId])].sort();
  const tierScope =
    mode === "pre-run"
      ? ("pre-run-full-county-daily" as const)
      : ("normal-circle-daily-town-weekly" as const);
  const traced: CoreInput = {
    ...input,
    gaps: [
      ...input.gaps,
      ...(selected.knownCoworkers.length === zero
        ? [
            "The opening generator records no known coworkers for the selected player; actual coworkers are in the daily circle, but acquaintance knowledge is not invented.",
          ]
        : []),
    ],
    playerId: player.id,
    focusPersonIds,
    focusPlaceIds,
    visiblePlaceIds,
  };
  return {
    input: deepFreeze(traced),
    playerId: player.id,
    countyId,
    focusPersonIds,
    focusPlaceIds,
    visiblePlaceIds,
    tierScope,
    peerPrior: {
      contactCount: peers.contacts.length,
      contacts: peers.contacts,
      reports: peers.reports,
    },
  };
}

function aggregateAllTimeActStats(core: CoreState) {
  const byActionId = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byMonthActionId = new Map<string, Record<string, number>>();
  let total = zero;
  for (const [key, count] of core.actsByMonthKind) {
    const separator = key.indexOf(":");
    if (separator < zero)
      throw new Error(`Malformed all-time monthly act key: ${key}`);
    const month = key.slice(zero, separator);
    const actionId = key.slice(separator + one);
    byActionId.set(actionId, (byActionId.get(actionId) ?? zero) + count);
    byMonth.set(month, (byMonth.get(month) ?? zero) + count);
    const actions = byMonthActionId.get(month) ?? {};
    actions[actionId] = (actions[actionId] ?? zero) + count;
    byMonthActionId.set(month, actions);
    total += count;
  }
  const byPerson = Object.fromEntries(
    [...core.people.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((person) => [
        person.id,
        {
          acts: person.actCount,
          byActionId: Object.fromEntries(
            [...person.actsByKind].sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
        },
      ]),
  );
  return {
    total,
    byActionId: Object.fromEntries(
      [...byActionId].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byMonth: Object.fromEntries(
      [...byMonth].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byMonthActionId: Object.fromEntries(
      [...byMonthActionId]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, kinds]) => [
          month,
          Object.fromEntries(
            Object.entries(kinds).sort(([a], [b]) => a.localeCompare(b)),
          ),
        ]),
    ),
    byPerson,
  };
}

function aggregateRetainedReasonContributions(core: CoreState) {
  const totals: ActTotals = {
    acts: zero,
    needContribution: zero,
    goalContribution: zero,
    driveContribution: zero,
  };
  const monthRows = new Map<string, ActTotals>();
  const actionRows = new Map<string, ActTotals>();
  const personRows = new Map<string, ActTotals>();
  const retainedMonths = [...core.actCountersByMonth.keys()].sort();
  for (const monthKey of retainedMonths) {
    const counterIds = core.actCountersByMonth.get(monthKey);
    if (!counterIds)
      throw new Error(`Missing retained act month index: ${monthKey}`);
    for (const id of counterIds) {
      const row = core.actCounters.get(id);
      if (!row || row.month !== monthKey)
        throw new Error(`Invalid retained act counter index: ${id}`);
      const person = personRows.get(row.actorId) ?? {
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      const month = monthRows.get(row.month) ?? {
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      const action = actionRows.get(row.actionId) ?? {
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      for (const target of [totals, person, month, action]) {
        target.acts += row.count;
        target.needContribution += row.needContribution;
        target.goalContribution += row.goalContribution;
        target.driveContribution += row.driveContribution;
      }
      personRows.set(row.actorId, person);
      monthRows.set(row.month, month);
      actionRows.set(row.actionId, action);
    }
  }
  return {
    scope: "retained-month-window-only" as const,
    totals,
    byMonth: Object.fromEntries(
      [...monthRows].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byActionId: Object.fromEntries(
      [...actionRows].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byPerson: Object.fromEntries(
      [...personRows].sort(([a], [b]) => a.localeCompare(b)),
    ),
    retainedMonths,
    retentionMonths: P("metricRetentionMonths"),
    throughDate: core.date,
  };
}

function emptyActTotals(): ActTotals {
  return {
    acts: zero,
    needContribution: zero,
    goalContribution: zero,
    driveContribution: zero,
  };
}

function addMonthlyCounter(target: ActTotals, row: MonthlyActionCounter): void {
  target.acts += row.acts;
  target.needContribution += row.needContribution;
  target.goalContribution += row.goalContribution;
  target.driveContribution += row.driveContribution;
}

function snapshotMonthCounters(
  core: CoreState,
  month: string,
): MonthlyActionCounter[] {
  const ids = core.actCountersByMonth.get(month);
  if (!ids) return [];
  const rows = [...ids].map((id): MonthlyActionCounter => {
    const row = core.actCounters.get(id);
    if (!row || row.month !== month)
      throw new Error(`Invalid monthly act counter index: ${id}`);
    return {
      month: row.month,
      actorId: row.actorId,
      actionId: row.actionId,
      acts: row.count,
      needContribution: row.needContribution,
      goalContribution: row.goalContribution,
      driveContribution: row.driveContribution,
    };
  });
  rows.sort(
    (left, right) =>
      left.actorId.localeCompare(right.actorId) ||
      left.actionId.localeCompare(right.actionId),
  );
  return rows;
}

function lastDayOfMonth(date: string): string {
  const lastDay = new Date(makeIsoDate(date));
  lastDay.setUTCDate(P("one"));
  lastDay.setUTCMonth(lastDay.getUTCMonth() + P("one"));
  lastDay.setUTCDate(P("zero"));
  return makeIsoDate(
    lastDay
      .toISOString()
      .slice(P("zero"), P("isoMonthCharacters") + P("two") + P("one")),
  );
}

function advanceInMonthChunks(
  core: CoreState,
  throughDate: string,
  includeDetailedActStats: boolean,
): {
  receipt: { simulatedDays: number; decisions: number; acts: number };
  reasonSummary: RunWindowReasonSummary;
} {
  const target = makeIsoDate(throughDate);
  const started = makeIsoDate(core.date);
  let simulatedDays = zero;
  let decisions = zero;
  let acts = zero;
  const monthsCovered: string[] = [];
  const reasonHash = createHash("sha256");
  const totals = emptyActTotals();
  const byMonth = new Map<string, ActTotals>();
  const byActionId = new Map<string, ActTotals>();
  const byPerson = includeDetailedActStats
    ? new Map<string, ActTotals>()
    : undefined;
  const personMonthActionRows = includeDetailedActStats
    ? ([] as MonthlyActionCounter[])
    : undefined;
  const affectSamples: RunWindowReasonSummary["affectSamples"] = [];
  const captureAffect = () => {
    for (const personId of [...core.focusPersonIds].sort()) {
      const person = core.people.get(personId);
      if (!person) throw new Error(`Missing focus person: ${personId}`);
      affectSamples.push({
        date: core.date,
        personId,
        mood: person.affect.mood,
        stress: person.affect.stress,
        moodBaseline: person.affect.moodBaseline,
        stressBaseline: person.affect.stressBaseline,
        lastChoice: person.lastChoice,
        driveCount: person.drives.size,
      });
    }
  };
  captureAffect();

  while (core.date < target) {
    let chunkEnd = lastDayOfMonth(core.date);
    if (chunkEnd <= core.date)
      chunkEnd = lastDayOfMonth(addDays(makeIsoDate(core.date), P("one")));
    if (chunkEnd > target) chunkEnd = target;

    const chunkStarted = performance.now();
    const chunk = advanceCore(core, chunkEnd);
    simulatedDays += chunk.simulatedDays;
    decisions += chunk.decisions;
    acts += chunk.acts;
    captureAffect();
    progress("month-advanced", {
      throughDate: core.date,
      simulatedDays: chunk.simulatedDays,
      elapsedMilliseconds: performance.now() - chunkStarted,
      decisions: chunk.decisions,
      acts: chunk.acts,
    });

    const month = chunkEnd.slice(P("zero"), P("isoMonthCharacters"));
    monthsCovered.push(month);
    const monthRows = snapshotMonthCounters(core, month);
    reasonHash.update(JSON.stringify({ month, rows: monthRows }));
    reasonHash.update("\0");
    const monthTotals = emptyActTotals();
    byMonth.set(month, monthTotals);
    for (const row of monthRows) {
      addMonthlyCounter(totals, row);
      addMonthlyCounter(monthTotals, row);
      const actionTotals = byActionId.get(row.actionId) ?? emptyActTotals();
      addMonthlyCounter(actionTotals, row);
      byActionId.set(row.actionId, actionTotals);
      if (byPerson) {
        const personTotals = byPerson.get(row.actorId) ?? emptyActTotals();
        addMonthlyCounter(personTotals, row);
        byPerson.set(row.actorId, personTotals);
      }
      personMonthActionRows?.push(row);
    }
  }

  const expectedDays = daysBetween(started, target);
  if (simulatedDays !== expectedDays)
    throw new Error(
      `Monthly chunks advanced ${simulatedDays} days; expected ${expectedDays} from ${started} through ${target}.`,
    );
  const asRecord = (rows: Map<string, ActTotals>) =>
    Object.fromEntries(
      [...rows].sort(([left], [right]) => left.localeCompare(right)),
    );
  return {
    receipt: { simulatedDays, decisions, acts },
    reasonSummary: {
      scope: "simulated-month-buckets-captured-before-retention-pruning",
      startDate: started,
      throughDate: target,
      monthsCovered,
      canonicalHash: reasonHash.digest("hex"),
      affectSamples,
      totals,
      byMonth: asRecord(byMonth),
      byActionId: asRecord(byActionId),
      ...(byPerson ? { byPerson: asRecord(byPerson) } : {}),
      ...(personMonthActionRows ? { personMonthActionRows } : {}),
    },
  };
}

function assertMonthlyRowsMatchCore(
  core: CoreState,
  rows: readonly MonthlyActionCounter[],
): void {
  const byPersonAction = new Map<string, Map<string, number>>();
  const byMonthAction = new Map<string, number>();
  let total = zero;
  for (const row of rows) {
    total += row.acts;
    const personActions =
      byPersonAction.get(row.actorId) ?? new Map<string, number>();
    personActions.set(
      row.actionId,
      (personActions.get(row.actionId) ?? zero) + row.acts,
    );
    byPersonAction.set(row.actorId, personActions);
    const key = `${row.month}:${row.actionId}`;
    byMonthAction.set(key, (byMonthAction.get(key) ?? zero) + row.acts);
  }
  const allPersonActs = [...core.people.values()].reduce(
    (sum, person) => sum + person.actCount,
    zero,
  );
  if (total !== allPersonActs)
    throw new Error(
      `Monthly person/action rows contain ${total} acts; person totals contain ${allPersonActs}.`,
    );
  if (byMonthAction.size !== core.actsByMonthKind.size)
    throw new Error(
      "Monthly person/action rows do not cover all-time action buckets.",
    );
  for (const [key, count] of core.actsByMonthKind)
    if (byMonthAction.get(key) !== count)
      throw new Error(
        `Monthly person/action rows disagree with all-time bucket: ${key}`,
      );
  for (const [personId, person] of core.people) {
    const captured = byPersonAction.get(personId) ?? new Map<string, number>();
    let personActs = zero;
    for (const [actionId, count] of person.actsByKind) {
      if (captured.get(actionId) !== count)
        throw new Error(
          `Monthly person/action rows disagree with actor total: ${personId}:${actionId}`,
        );
      captured.delete(actionId);
      personActs += count;
    }
    if (captured.size !== zero || personActs !== person.actCount)
      throw new Error(
        `Monthly person/action rows are incomplete for actor: ${personId}`,
      );
    byPersonAction.delete(personId);
  }
  if (byPersonAction.size !== zero)
    throw new Error("Monthly person/action rows name an absent actor.");
}

function summarizeWorld(
  core: CoreState,
  includeDetailedActStats: boolean,
  reasonSummary: RunWindowReasonSummary,
  input: CoreInput,
): WorldSummary {
  const allTime = aggregateAllTimeActStats(core);
  const retainedReasons = aggregateRetainedReasonContributions(core);
  const actionKinds = new Map(
    [
      ...core.data.actions,
      ...(core.data.work
        ? [core.data.work.attendanceAction, core.data.work.absenceAction]
        : []),
    ].map((row) => [row.id, row.actKinds]),
  );
  const kindTagsByMonth: Record<string, Record<string, number>> = {};
  for (const [month, actions] of Object.entries(allTime.byMonthActionId)) {
    const kinds: Record<string, number> = {};
    for (const [actionId, count] of Object.entries(actions)) {
      const tags = actionKinds.get(actionId);
      if (!tags) throw new Error(`Unregistered measured action: ${actionId}`);
      for (const tag of tags) kinds[tag] = (kinds[tag] ?? zero) + count;
    }
    kindTagsByMonth[month] = Object.fromEntries(
      Object.entries(kinds).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  }
  if (reasonSummary.personMonthActionRows)
    assertMonthlyRowsMatchCore(core, reasonSummary.personMonthActionRows);
  const allPersonActs = [...core.people.values()].reduce(
    (sum, person) => sum + person.actCount,
    zero,
  );
  if (allTime.total !== allPersonActs)
    throw new Error(
      `Global act totals ${allTime.total} do not match all-time person counts ${allPersonActs}.`,
    );
  const visibility: Record<string, number> = {};
  for (const record of core.durableLog.values()) {
    const key = record.visibility ?? "unclassified";
    visibility[key] = (visibility[key] ?? zero) + one;
  }
  return {
    work: summarizeWorkObservables(input, core),
    counts: {
      people: core.people.size,
      households: core.households.size,
      jobs: core.jobs.size,
      organizations: core.organizations.size,
      husks: core.husks.size,
      durableRecords: core.durableLog.size,
      peopleByTier: Object.fromEntries(
        [...core.peopleByTier]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([tier, ids]) => [tier, ids.size]),
      ),
      dailyCirclePeople: [...core.focusPersonIds].filter((id) =>
        core.people.has(id),
      ).length,
    },
    allTimeActCount: allTime.total,
    allTimeActsByActionId: allTime.byActionId,
    allTimeActsByMonth: allTime.byMonth,
    allTimeActsByMonthActionId: allTime.byMonthActionId,
    allTimeActKindTagsByMonth: kindTagsByMonth,
    actStatsHash: createHash("sha256")
      .update(
        JSON.stringify({
          allTime: {
            byActionId: allTime.byActionId,
            byMonth: allTime.byMonth,
            byMonthActionId: allTime.byMonthActionId,
            byPerson: allTime.byPerson,
          },
          retainedReasons,
          runWindowReasonHash: reasonSummary.canonicalHash,
        }),
      )
      .digest("hex"),
    reasonContributionsRetained: retainedReasons,
    reasonContributionsRunWindow: reasonSummary,
    ...(includeDetailedActStats
      ? { allTimeActCountsByPerson: allTime.byPerson }
      : {}),
    recordVisibility: Object.fromEntries(
      Object.entries(visibility).sort(([a], [b]) => a.localeCompare(b)),
    ),
    gaps: [...core.gaps].sort(),
    stopgaps: developerBanners(core).map((row) => row.id),
  };
}

function median(values: readonly number[]): number {
  if (values.length === zero) throw new Error("Cannot take an empty median.");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / P("two"));
  return sorted.length % P("two") === zero
    ? ((sorted[middle - one] ?? zero) + (sorted[middle] ?? zero)) / P("two")
    : sorted[middle]!;
}

function sourceHash(): {
  scope: string;
  dependencyNote: string;
  sha256: string;
  fileCount: number;
  files: { path: string; bytes: number; sha256: string }[];
  directRuntimeDependencies: {
    path: string;
    bytes: number;
    sha256: string;
  }[];
} {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        // Proof archives are outputs, not executable measurement inputs.
        if (path !== resolve(measurementDirectory, "receipts")) visit(path);
      } else if (
        entry.isFile() &&
        (/\.json$/.test(entry.name) ||
          (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)))
      )
        files.push(path);
    }
  };
  visit(measurementDirectory);
  files.sort();
  const hash = createHash("sha256");
  const manifest: { path: string; bytes: number; sha256: string }[] = [];
  for (const path of files) {
    const name = relative(repositoryRoot, path).split(sep).join("/");
    const bytes = readFileSync(path);
    hash.update(name);
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
    manifest.push({
      path: name,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  return {
    scope:
      "src/core2 TypeScript and JSON; test TypeScript and proof receipts excluded",
    dependencyNote:
      "The direct runtime dependencies simulation/dates, simulation/ids, act-kinds.json and trait-act-pulls.json are hashed separately. Remaining generation and transitive code/data outside src/core2 are not hashed here and must remain frozen by the owner; the prepared traced CoreInput has a separate SHA-256.",
    sha256: hash.digest("hex"),
    fileCount: files.length,
    files: manifest,
    directRuntimeDependencies: [
      "src/simulation/dates.ts",
      "src/simulation/ids.ts",
      "data/content/act-kinds.json",
      "data/content/trait-act-pulls.json",
    ].map((path) => {
      const bytes = readFileSync(resolve(repositoryRoot, path));
      return {
        path,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  };
}

function preparedInputHash(input: CoreInput, outputPath?: string): string {
  const serialized = JSON.stringify(input);
  if (outputPath) {
    const relativeToRepo = relative(repositoryRoot, outputPath);
    if (
      relativeToRepo === "" ||
      (!relativeToRepo.startsWith(`..${sep}`) && relativeToRepo !== "..")
    )
      throw new Error(
        "Prepared inputs must be written outside the repository.",
      );
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, { flag: "wx" });
  }
  return createHash("sha256").update(serialized).digest("hex");
}

function memoryDelta(before: MemorySample, after: MemorySample) {
  return {
    before,
    after,
    heapDeltaMiB: after.heapUsedMiB - before.heapUsedMiB,
    rssDeltaMiB: after.rssMiB - before.rssMiB,
  };
}

async function runCore(
  input: CoreInput,
  throughDate: string,
  includeDetailedActStats: boolean,
  scheduledWork: boolean,
): Promise<RunResult> {
  const before = memorySample();
  const started = performance.now();
  const core = createLifeCore(input, { observer: false, scheduledWork });
  const initialized = performance.now();
  const advanceResult = advanceInMonthChunks(core, throughDate, true);
  const advanceReceipt = advanceResult.receipt;
  const completed = performance.now();
  const after = memorySample();
  const elapsedMilliseconds = completed - started;
  const expectedDays = daysBetween(
    makeIsoDate(input.startedAt),
    makeIsoDate(throughDate),
  );
  if (advanceReceipt.simulatedDays !== expectedDays)
    throw new Error(
      `Life loop advanced ${advanceReceipt.simulatedDays} days; expected ${expectedDays} from ${input.startedAt} through ${throughDate}.`,
    );
  const reasonSummary = { ...advanceResult.reasonSummary };
  if (reasonSummary.personMonthActionRows)
    assertMonthlyRowsMatchCore(core, reasonSummary.personMonthActionRows);
  if (!includeDetailedActStats) {
    delete reasonSummary.byPerson;
    delete reasonSummary.personMonthActionRows;
  }
  const world = summarizeWorld(
    core,
    includeDetailedActStats,
    reasonSummary,
    input,
  );
  if (world.allTimeActCount !== advanceReceipt.acts)
    throw new Error(
      `Life loop reported ${advanceReceipt.acts} acts; all-time person counts contain ${world.allTimeActCount}.`,
    );
  if (world.reasonContributionsRunWindow.totals.acts !== advanceReceipt.acts)
    throw new Error(
      `Monthly counter snapshots contain ${world.reasonContributionsRunWindow.totals.acts} acts; life loop reported ${advanceReceipt.acts}.`,
    );
  const daysPerMinute =
    elapsedMilliseconds > zero
      ? (advanceReceipt.simulatedDays *
          P("secondsPerMinute") *
          P("millisecondsPerSecond")) /
        elapsedMilliseconds
      : zero;
  return {
    elapsedMilliseconds,
    initializeMilliseconds: initialized - started,
    advanceMilliseconds: completed - initialized,
    daysPerMinute,
    simulatedDays: advanceReceipt.simulatedDays,
    decisions: advanceReceipt.decisions,
    acts: advanceReceipt.acts,
    actStatsHash: world.actStatsHash,
    workStatsHash: createHash("sha256")
      .update(JSON.stringify(world.work))
      .digest("hex"),
    memory: memoryDelta(before, after),
    world,
  };
}

function timingSummary(runs: readonly RunResult[]) {
  return {
    medianElapsedMilliseconds: median(
      runs.map((run) => run.elapsedMilliseconds),
    ),
    medianDaysPerMinute: median(runs.map((run) => run.daysPerMinute)),
    medianDecisions: median(runs.map((run) => run.decisions)),
    medianActs: median(runs.map((run) => run.acts)),
  };
}

function parseArgs(args: readonly string[]): {
  mode: MeasureMode;
  outputPath?: string;
  preparedInputOutputPath?: string;
  playerId?: string;
  openingEmployment: boolean;
  scheduledWork: boolean;
} {
  let openingEmployment = true,
    scheduledWork = true;
  let mode: MeasureMode = "opening";
  let outputPath: string | undefined;
  let preparedInputOutputPath: string | undefined;
  let playerId: string | undefined;
  for (let index = zero; index < args.length; index += one) {
    const argument = args[index];
    if (argument === "--mode") {
      const value = args[index + one];
      if (value !== "opening" && value !== "year" && value !== "pre-run")
        throw new Error("--mode must be opening, year, or pre-run.");
      mode = value;
      index += one;
    } else if (argument === "--output") {
      const value = args[index + one];
      if (!value) throw new Error("--output needs a path.");
      outputPath = resolve(value);
      index += one;
    } else if (argument === "--prepared-input-output") {
      const value = args[index + one];
      if (!value || value.startsWith("--"))
        throw new Error(
          "--prepared-input-output needs an outside-repository path.",
        );
      preparedInputOutputPath = resolve(value);
      index += one;
    } else if (argument === "--player-id") {
      const value = args[index + one];
      if (!value || value.startsWith("--"))
        throw new Error("--player-id needs a recorded person ID.");
      playerId = value;
      index += one;
    } else if (
      argument === "--opening-employment" ||
      argument === "--scheduled-work"
    ) {
      const value = args[index + one];
      if (
        value !== "true" &&
        value !== "false" &&
        value !== "enable" &&
        value !== "disable"
      )
        throw new Error(`${argument} needs true/false or enable/disable.`);
      const enabled = value === "true" || value === "enable";
      if (argument === "--opening-employment") openingEmployment = enabled;
      else scheduledWork = enabled;
      index += one;
    } else if (argument === "--help") {
      process.stdout.write(
        "Usage: measure.ts [--mode opening|year|pre-run] [--output /tmp/receipt.json] [--prepared-input-output /tmp/prepared.json] [--player-id recorded-person-id] [--opening-employment true|false] [--scheduled-work true|false]\n",
      );
      process.exit(zero);
    } else {
      throw new Error(`Unknown measurement option: ${argument}`);
    }
  }
  return {
    mode,
    outputPath,
    preparedInputOutputPath,
    playerId,
    openingEmployment,
    scheduledWork,
  };
}

async function main(): Promise<void> {
  const {
    mode,
    outputPath,
    preparedInputOutputPath,
    playerId,
    openingEmployment,
    scheduledWork,
  } = parseArgs(process.argv.slice(one + one));
  const startDate = makeIsoDate(measurement.startedAt);
  const sourceHashBefore = sourceHash();
  const populationMemoryBefore = memorySample();
  const populationStarted = performance.now();
  const population = buildPopulation({
    seed: measurement.seed,
    startedAt: startDate,
    minimumPeople: P("targetPopulation"),
    openingEmployment,
    scheduledWork,
  });
  const populationCompleted = performance.now();
  progress("population-built", {
    elapsedMilliseconds: populationCompleted - populationStarted,
    people: population.people.length,
    place: population.placeMetadata,
  });
  const populationMemoryAfter = memorySample();
  const deepPastMemoryBefore = memorySample();
  const deepPastStarted = performance.now();
  const withDeepPast = buildDeepPast(population);
  const deepPastCompleted = performance.now();
  progress("deep-past-built", {
    elapsedMilliseconds: deepPastCompleted - deepPastStarted,
  });
  const deepPastMemoryAfter = memorySample();
  const civicMemoryBefore = memorySample();
  const civicStarted = performance.now();
  const withCivicInputs = enrichCivicInputs(withDeepPast);
  const civicCompleted = performance.now();
  progress("civic-inputs-built", {
    elapsedMilliseconds: civicCompleted - civicStarted,
  });
  const civicMemoryAfter = memorySample();
  const peerMemoryBefore = memorySample();
  const traceStarted = performance.now();
  const traced = traceSelection(withCivicInputs, mode, playerId);
  const traceCompleted = performance.now();
  const peerMemoryAfter = memorySample();
  progress("circle-prepared", {
    elapsedMilliseconds: traceCompleted - traceStarted,
    people: traced.input.people.length,
    focusPersonCount: traced.focusPersonIds.length,
    generatedHistoricalContacts: traced.peerPrior.contactCount,
    peerReports: traced.peerPrior.reports,
  });
  const inputSha256 = preparedInputHash(traced.input, preparedInputOutputPath);
  const throughDate =
    mode === "year"
      ? addDays(startDate, P("yearSpanDays"))
      : mode === "pre-run"
        ? makeIsoDate(measurement.preRunThrough)
        : startDate;
  const expectedDays = daysBetween(startDate, throughDate);
  if (mode === "year" && expectedDays !== P("yearSpanDays"))
    throw new Error("Configured year span does not match its calendar dates.");
  const warmupCount = mode === "opening" ? zero : P("warmupRuns");
  const measuredCount = mode === "opening" ? one : P("warmRuns");
  const warmups: RunResult[] = [];
  for (let index = zero; index < warmupCount; index += one) {
    progress("warmup-start", { run: index + one, throughDate });
    warmups.push(
      await runCore(traced.input, throughDate, false, scheduledWork),
    );
    const run = warmups.at(-one)!;
    progress("warmup-complete", {
      run: index + one,
      elapsedMilliseconds: run.elapsedMilliseconds,
      daysPerMinute: run.daysPerMinute,
    });
  }
  const runs: RunResult[] = [];
  for (let index = zero; index < measuredCount; index += one) {
    progress("measured-run-start", { run: index + one, throughDate });
    runs.push(
      await runCore(
        traced.input,
        throughDate,
        index === measuredCount - one,
        scheduledWork,
      ),
    );
    const run = runs.at(-one)!;
    progress("measured-run-complete", {
      run: index + one,
      elapsedMilliseconds: run.elapsedMilliseconds,
      daysPerMinute: run.daysPerMinute,
      actStatsHash: run.actStatsHash,
    });
  }
  const expectedActHash = runs[zero]?.actStatsHash;
  const expectedWorkHash = runs[zero]?.workStatsHash;
  if (
    [...warmups, ...runs].some(
      (run) =>
        run.actStatsHash !== expectedActHash ||
        run.workStatsHash !== expectedWorkHash,
    )
  )
    throw new Error(
      "Measured runs produced different canonical act/work summaries.",
    );
  const sourceHashAfter = sourceHash();
  if (JSON.stringify(sourceHashBefore) !== JSON.stringify(sourceHashAfter))
    throw new Error("src/core2 sources changed during the measurement run.");
  const output: Record<string, unknown> = {
    schema: "p8-measurement-v1",
    coreVersions: {
      apiVersion: CORE_API_VERSION,
      schemaVersion: CORE_SCHEMA_VERSION,
    },
    mode,
    measurementConfig: measurement,
    seed: measurement.seed,
    startedAt: startDate,
    throughDate,
    expectedSimulatedDays: expectedDays,
    parameters: {
      targetPopulation: P("targetPopulation"),
      warmupRuns: warmupCount,
      warmRuns: measuredCount,
      ...(mode === "year" ? { yearSpanDays: P("yearSpanDays") } : {}),
      benchmarkAdultMinimumAge: P("benchmarkAdultMinimumAge"),
      requestedPlayerId: playerId,
      openingEmployment,
      scheduledWork,
    },
    sourceHash: {
      beforeBuild: sourceHashBefore,
      afterRuns: sourceHashAfter,
      stableDuringRun: true,
    },
    preparedInputSha256: inputSha256,
    preparedInputExport: preparedInputOutputPath
      ? {
          path: preparedInputOutputPath,
          sha256: inputSha256,
          serialization:
            "Exact JSON.stringify CoreInput bytes without a trailing newline; written once with exclusive-create outside every annual timed window.",
        }
      : undefined,
    place: population.placeMetadata,
    actionKindBindings: Object.fromEntries(
      [
        ...DEFAULT_DATA.actions,
        ...(scheduledWork && DEFAULT_DATA.work
          ? [
              DEFAULT_DATA.work.attendanceAction,
              DEFAULT_DATA.work.absenceAction,
            ]
          : []),
      ].map((row) => [row.id, row.actKinds]),
    ),
    actKindCountScope:
      "Actions can carry several kind tags. Kind counts overlap and must not be summed as distinct actions. The detailed person/month/action rows can be joined through actionKindBindings.",
    affectSampleScope:
      "Focus-circle state at opening and month boundaries, in latent model units; no PANAS/PSS score mapping and no added external stimulus.",
    timerScope:
      "Core initialization and complete clock advance include identical monthly counter capture, hashing, affect sampling, and progress in every warmup and measured run. World-summary validation, kind mapping, exact fixed-roster age-exposure calculation and ATUS contextual crosswalk, and final serialization are outside the timer; only the final measured receipt retains detailed rows.",
    memoryScope:
      "heapUsedMiB and rssMiB are before/after samples; processLifetimeMaxRssMiB is cumulative from process start and includes input building, warmups, and previous measured runs.",
    build: {
      population: {
        elapsedMilliseconds: populationCompleted - populationStarted,
        memory: memoryDelta(populationMemoryBefore, populationMemoryAfter),
        counts: {
          people: population.people.length,
          households: population.households.length,
          jobs: population.jobs.length,
          organizations: population.organizations.length,
        },
      },
      deepPast: {
        elapsedMilliseconds: deepPastCompleted - deepPastStarted,
        memory: memoryDelta(deepPastMemoryBefore, deepPastMemoryAfter),
        pastFactCount: withDeepPast.people.reduce(
          (sum, person) => sum + (person.pastFacts?.length ?? zero),
          zero,
        ),
        gapCount: withDeepPast.gaps.length,
      },
      civicInputs: {
        elapsedMilliseconds: civicCompleted - civicStarted,
        memory: memoryDelta(civicMemoryBefore, civicMemoryAfter),
        publicOrganizationCount:
          withCivicInputs.publicOrganizations?.length ?? zero,
        gapCount: withCivicInputs.gaps.length,
      },
      peerPriorAndTrace: {
        elapsedMilliseconds: traceCompleted - traceStarted,
        memory: memoryDelta(peerMemoryBefore, peerMemoryAfter),
        scope:
          "Selected recorded school peer group, circle selection, and input deep-freeze; outside annual timer. Group size and retained recognition are uncalibrated priors.",
      },
    },
    trace: {
      playerId: traced.playerId,
      countyId: traced.countyId,
      focusPersonCount: traced.focusPersonIds.length,
      focusPlaceIds: traced.focusPlaceIds,
      visiblePlaceIds: traced.visiblePlaceIds,
      tierScope: traced.tierScope,
      focusPersonIds: traced.focusPersonIds,
      peerPrior: traced.peerPrior,
    },
    warmups,
    runs,
    median: timingSummary(runs),
    finalWorld: runs.at(-one)?.world,
  };
  const path = outputPath ?? resolve("/tmp/p8-measurements", `p8-${mode}.json`);
  const relativeToRepo = relative(repositoryRoot, path);
  if (
    relativeToRepo === "" ||
    (!relativeToRepo.startsWith(`..${sep}`) && relativeToRepo !== "..")
  )
    throw new Error(
      "Measurement receipts must be written outside the repository.",
    );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(output, null, P("two"))}\n`);
  progress("receipt-written", {
    path,
    memoryAfterSerialization: memorySample(),
  });
  process.stdout.write(`P8 ${mode} receipt: ${path}\n`);
}

if (
  process.argv[one] &&
  import.meta.url === pathToFileURL(resolve(process.argv[one])).href
) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = one;
  });
}
