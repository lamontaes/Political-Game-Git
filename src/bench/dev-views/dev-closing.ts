/**
 * Dev mode's businesses: the town's businesses with their staff, a control
 * that cuts a business's outside orders (the engine's own output limit, the
 * call a law's operating limit makes) or closes it through its owner's own
 * closing, and "What came of it" for one business: its months of trading,
 * everyone it let go with why and where they are now (looking, working again,
 * moved away), the records the game wrote for each, and the town's jobs,
 * people and sales by industry month by month. Reads only, except the two
 * controls; every row is record data and every id opens in Trace.
 */
import { coreAPI } from "../../core2/state";
import { LAWS_MODULE_ID, lawChain } from "../../core2/modules/laws";
import { BUSINESS_MODULE_ID } from "../../core2/business-module-id";
import { closeByChoice, ownerOf } from "../../core2/modules/business";
import { JOBS_MODULE_ID } from "../../core2/modules/jobs";
import {
  countedHouseholdOf,
  isDemoted,
  residentsRuntime,
} from "../../core2/modules/residents";
import {
  countedHeadcountOf,
  limitOutsideSales,
} from "../../core2/residents-economy";
import {
  COUNTED_MOVES_MODULE_ID,
  countedMoves,
} from "../../core2/modules/counted-moves";
import { MOVED_AWAY_EVENT } from "../../core2/moved-away-event";
import { metricsPanel } from "../../core2/modules/world-panels";
import type { CoreAPI, CoreState, PersonId } from "../../core2/types";

/** The closing reason a dev-mode close keeps on the business's books: the record says who closed it. */
export const DEV_CLOSE_REASON = "dev-mode";

/** What a control returns: the dev-mode change record it wrote. */
export type DevMarker = (
  control: string,
  recordIds: readonly string[],
  facts: Record<string, string>,
) => { id: string };

interface Devish {
  readonly core: CoreState;
  readonly placeId: string;
  mark: DevMarker;
}

interface ChangeRow {
  id: string;
  date: string;
  personId: string;
  organizationId: string;
  jobId: string;
  kind: string;
  reasonKey: string;
  decidedBy: string;
  heads?: number;
  tradingId?: string;
}

interface TradingRow {
  id: string;
  organizationId: string;
  date: string;
  salesMinor: number;
  payrollMinor: number;
  costsMinor: number;
  lossMonths: number;
}

const has = (core: CoreState, id: string) => core.modules.has(id);

function townOf(dev: Devish): string {
  return has(dev.core, LAWS_MODULE_ID)
    ? lawChain(coreAPI(dev.core)).townPlaceId
    : dev.placeId;
}

/** Heads on a business's staff today: full workers plus what its counted jobs stand for. */
function staffOf(core: CoreState, organizationId: string): number {
  let full = 0;
  for (const jobId of core.finance.jobsByOrganization.get(organizationId) ?? [])
    if (core.jobs.get(jobId)?.endsAt === undefined) full++;
  return full + countedHeadcountOf(core, organizationId);
}

function tradingRows(api: CoreAPI): TradingRow[] {
  if (!has(api.state as CoreState, BUSINESS_MODULE_ID)) return [];
  return api
    .moduleState(BUSINESS_MODULE_ID)
    .table("trading")
    .rows() as unknown as TradingRow[];
}

function changeRows(api: CoreAPI): ChangeRow[] {
  if (!has(api.state as CoreState, JOBS_MODULE_ID)) return [];
  return api
    .moduleState(JOBS_MODULE_ID)
    .table("changes")
    .rows() as unknown as ChangeRow[];
}

/** The town's businesses, largest staff first, with their last month's trading. */
export function townBusinesses(dev: Devish) {
  const core = dev.core;
  const api = coreAPI(core);
  const town = townOf(dev);
  const last = new Map<string, TradingRow>();
  for (const row of tradingRows(api)) {
    const kept = last.get(row.organizationId);
    if (!kept || kept.date < row.date) last.set(row.organizationId, row);
  }
  const rows = [];
  for (const [id, book] of core.finance.businesses) {
    const org = core.organizations.get(id);
    if (!org || org.placeId !== town || org.outsideFlow) continue;
    const month = last.get(id);
    rows.push({
      organizationId: id,
      name: org.name,
      classification: org.classification,
      staff: book.closedAt ? 0 : staffOf(core, id),
      ownerId: ownerOf(api, id) ?? null,
      cashMinor: org.liquidMinor ?? 0,
      // Whether it sells outside the town: the one kind of business an orders cut reaches.
      sellsOutside: [...(residentsRuntime(core)?.flows.values() ?? [])].some(
        (flow) =>
          flow.kind === "outside-sales" &&
          !flow.endedAt &&
          flow.payeeId === id,
      ),
      lastMonth: month ?? null,
      closedAt: book.closedAt ?? null,
      closingReason: book.closingReasonKey ?? null,
    });
  }
  return rows.sort(
    (a, b) => b.staff - a.staff || a.organizationId.localeCompare(b.organizationId),
  );
}

/**
 * A business sells outside the town at `keep` of what it could, from today:
 * the engine's own output limit, the call a law's operating limit makes. Its
 * jobs, owner and closing then follow from its books at their own reviews.
 */
export function shrinkBusiness(
  dev: Devish,
  organizationId: string,
  keep: number,
) {
  const core = dev.core;
  if (!core.finance.businesses.get(organizationId))
    throw new Error("No such business.");
  if (core.finance.businesses.get(organizationId)!.closedAt)
    throw new Error("It is already closed.");
  if (!(keep > 0 && keep <= 1))
    throw new Error("Keep a share above none and up to all of its orders.");
  const flows = limitOutsideSales(core, organizationId, keep);
  if (!flows)
    throw new Error("It sells nothing outside the town: no orders to cut.");
  return {
    mark: dev.mark("shrink-business", [organizationId], {
      organizationId,
      keep: String(keep),
    }),
    flows,
  };
}

/**
 * The business closes today through its owner's own closing (cash to the
 * owner, final pay held back, its jobs, contracts and books ended), the same
 * call as when an owner chooses to close; the books keep dev mode as the
 * reason. The jobs engine, the claims and the news follow from the closing.
 */
export function closeBusiness(dev: Devish, organizationId: string) {
  const core = dev.core;
  const api = coreAPI(core);
  const book = core.finance.businesses.get(organizationId);
  if (!book) throw new Error("No such business.");
  if (book.closedAt) throw new Error("It is already closed.");
  const ownerId = ownerOf(api, organizationId);
  if (!ownerId) throw new Error("It has no recorded owner to close it.");
  if (!closeByChoice(api, organizationId, ownerId, DEV_CLOSE_REASON))
    throw new Error("Its owner has no account to close it into.");
  return {
    mark: dev.mark("close-business", [organizationId], { organizationId }),
    closure: `employer-closed:${core.date}:${organizationId}`,
  };
}

/** The record each kind of job loss writes for the people it names, if any. */
function lossEventId(row: ChangeRow): string | null {
  if (row.kind === "layoff")
    return `event:work.job-lost:${row.date}:${row.jobId}`;
  if (row.kind === "closure")
    return `employer-closed:${row.date}:${row.organizationId}`;
  return null;
}

/** Where someone the business let go is now, by the records. */
function whereNow(
  core: CoreState,
  api: CoreAPI,
  row: ChangeRow,
  town: string,
  hires: ReadonlyMap<string, ChangeRow[]>,
  movesOut: ReadonlyMap<string, { id: string; date: string; toPlace: string }>,
  movedFull: ReadonlyMap<string, string>,
) {
  const rehired = (hires.get(row.personId) ?? []).find(
    (hire) => hire.date >= row.date && hire.organizationId !== row.organizationId,
  ) ?? (hires.get(row.personId) ?? []).find((hire) => hire.date > row.date);
  const full = core.people.get(row.personId as PersonId);
  if (full && !isDemoted(full)) {
    if (!full.alive) return { now: "died", recordId: null };
    const moved = movedFull.get(row.personId);
    if (moved || full.placeId !== town)
      return { now: "moved-away", recordId: moved ?? null };
    if (full.jobId)
      return {
        now: "working",
        recordId: rehired?.id ?? full.jobId,
        employerId: core.jobs.get(full.jobId)?.organizationId ?? null,
      };
    const seeking = api.moduleState(JOBS_MODULE_ID).table("seekers").get(
      row.personId,
    );
    return seeking
      ? { now: "looking", recordId: null }
      : { now: "not-looking", recordId: null };
  }
  const household = countedHouseholdOf(core, row.personId as PersonId);
  const move = household ? movesOut.get(household.id) : undefined;
  if (!household || household.gone || move)
    return { now: "moved-away", recordId: move?.id ?? null };
  const job = household.jobs.find(
    (j) => j.personId === row.personId && j.endsAt === undefined,
  );
  if (job)
    return {
      now: "working",
      recordId: rehired?.id ?? job.id,
      employerId: job.organizationId,
    };
  const seeking = api
    .moduleState(JOBS_MODULE_ID)
    .table("countedSeekers")
    .get(row.personId);
  return seeking
    ? { now: "looking", recordId: null }
    : { now: "not-looking", recordId: null };
}

/**
 * What came of a business's cuts and closing, from `since` (the first dev
 * mark naming it, else the world's first trading month): its months, every
 * job change it made with the heads it stood for, why, the record it wrote
 * for the people it named and where they are now, and the town month by
 * month (jobs, people, looking, claims, sales by industry).
 */
export function whatCameOf(dev: Devish, organizationId: string, since?: string) {
  const core = dev.core;
  const api = coreAPI(core);
  const org = core.organizations.get(organizationId);
  const book = core.finance.businesses.get(organizationId);
  if (!org || !book) throw new Error("No such business.");
  const town = townOf(dev);
  const from = since ?? "";
  const changes = changeRows(api);
  const hires = new Map<string, ChangeRow[]>();
  for (const row of changes)
    if (row.kind === "hire") {
      const list = hires.get(row.personId) ?? [];
      list.push(row);
      hires.set(row.personId, list);
    }
  for (const list of hires.values())
    list.sort((a, b) => a.date.localeCompare(b.date));
  const movesOut = new Map<string, { id: string; date: string; toPlace: string }>();
  if (has(core, COUNTED_MOVES_MODULE_ID))
    for (const move of countedMoves(api))
      if (move.direction === "out" && move.date >= from)
        movesOut.set(move.householdId, move);
  const movedFull = new Map<string, string>();
  for (const id of core.logByKind.get(MOVED_AWAY_EVENT) ?? []) {
    const event = core.durableLog.get(id);
    if (!event || event.date < from) continue;
    for (const personId of event.personIds) movedFull.set(personId, id);
  }
  const lost = changes
    .filter(
      (row) =>
        row.organizationId === organizationId &&
        row.date >= from &&
        (row.kind === "layoff" ||
          row.kind === "staff-shed" ||
          row.kind === "closure"),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const letGo = lost.map((row) => {
    const eventId = lossEventId(row);
    const counted = !core.people.has(row.personId as PersonId);
    return {
      changeId: row.id,
      date: row.date,
      kind: row.kind,
      reasonKey: row.reasonKey,
      decidedBy: row.decidedBy,
      heads: row.heads ?? 1,
      personId: row.personId,
      counted,
      tradingId: row.tradingId ?? null,
      // The record the game wrote that people hear and answer (a job-loss
      // event, the closing); none for a cut that shed part of a counted job.
      eventId: eventId && core.eventIds.has(eventId) ? eventId : null,
      ...whereNow(core, api, row, town, hires, movesOut, movedFull),
    };
  });
  const totals: Record<string, number> = {};
  const add = (key: string, heads: number) =>
    (totals[key] = (totals[key] ?? 0) + heads);
  for (const row of letGo) {
    add(`lost:${row.kind}`, row.heads);
    add(`now:${row.now}`, row.heads);
    add(row.eventId ? "heard" : "unheard", row.heads);
  }
  // The town's sales by industry a month, from every business's trading.
  const byMonth = new Map<string, Record<string, number>>();
  for (const row of tradingRows(api)) {
    if (row.date < from) continue;
    const other = core.organizations.get(row.organizationId);
    if (!other || other.placeId !== town || other.outsideFlow) continue;
    const month = row.date.slice(0, 7);
    const sales = byMonth.get(month) ?? {};
    const industry = other.classification ?? other.kind;
    sales[industry] = (sales[industry] ?? 0) + row.salesMinor;
    byMonth.set(month, sales);
  }
  const metrics = new Map(
    metricsPanel(api, town).map((row) => [String(row.date).slice(0, 7), row]),
  );
  const months = [...new Set([...byMonth.keys(), ...metrics.keys()])]
    .filter((month) => month >= from.slice(0, 7))
    .sort()
    .map((month) => {
      const row = metrics.get(month) as Record<string, unknown> | undefined;
      const num = (key: string) =>
        typeof row?.[key] === "number" ? (row[key] as number) : null;
      return {
        month,
        metricsId: row ? String(row.id) : null,
        jobsInTown: num("employed"),
        people: num("people"),
        residentsLooking: num("residentsLooking"),
        unemploymentRate: num("unemploymentRate"),
        claimsOpen: num("unemploymentClaimsOpen"),
        businessesClosed: num("businessesClosedThisMonth"),
        salesByIndustryMinor: byMonth.get(month) ?? {},
      };
    });
  return {
    organizationId,
    name: org.name,
    classification: org.classification,
    since: from || null,
    staffNow: book.closedAt ? 0 : staffOf(core, organizationId),
    closedAt: book.closedAt ?? null,
    closingReason: book.closingReasonKey ?? null,
    closureId: core.finance.closures.has(organizationId)
      ? `employer-closed:${core.finance.closures.get(organizationId)!.date}:${organizationId}`
      : null,
    trading: tradingRows(api)
      .filter((row) => row.organizationId === organizationId && row.date >= from)
      .sort((a, b) => a.date.localeCompare(b.date)),
    letGo,
    totals,
    town: months,
  };
}
