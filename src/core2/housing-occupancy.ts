/**
 * Who lives in the town's rentals. A household gone from the town (died
 * out, moved away) frees the home it rented and stops paying its rent. A
 * household of the wider population that moved in rents a home freed this
 * way first (its landlord re-lets it at the rent it last asked), else one
 * of the landlords' empty units at the town's typical rent. The town's
 * rental vacancy is its rental units less the households renting them, so
 * rents read who actually lives here.
 */
import type { CoreAPI, CoreState } from "./types";
import type { ModuleTable } from "./module-state";
import type { StockRow } from "./housing-construction";
import { addResidentFlow } from "./residents-economy";
import { residentsRuntime } from "./modules/residents";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stopgap } from "./stopgaps";

interface DwellingRow {
  id: string;
  householdId: string;
  tenure: string;
  kind?: string;
  rentMinor?: number;
}

interface VacatedRow {
  id: string;
  placeId: string;
  payeeId: string;
  rentMinor: number;
  kind: string;
  since: string;
}

export interface Occupancy {
  /** Households that moved in and now rent here, by id. */
  housed: string[];
  /** Households gone from the town whose rent stopped, by id. */
  left: string[];
}

export function settleOccupancy(
  api: CoreAPI,
  tables: { dwellings: ModuleTable; stock: ModuleTable; vacated: ModuleTable },
  typicalRent: (placeId: string) => number,
  citation: string,
): Occupancy {
  const c = api.state as CoreState;
  const rt = residentsRuntime(c);
  const out: Occupancy = { housed: [], left: [] };
  const stocks = new Map(
    (tables.stock.rows() as unknown as StockRow[]).map((row) => [
      row.placeId,
      row,
    ]),
  );
  if (!stocks.size) return out;
  const exists = (id: string) =>
    c.households.has(id) || Boolean(rt?.households.has(id));
  const placeOf = (id: string) =>
    c.households.get(id)?.placeId ?? rt?.households.get(id)?.household.placeId;
  const renters = new Map<string, number>();
  const housedIds = new Set<string>();
  // Households gone from the town leave their rentals.
  for (const row of tables.dwellings.rows() as unknown as DwellingRow[]) {
    housedIds.add(row.householdId);
    if (row.tenure !== "rent") continue;
    if (exists(row.householdId)) {
      const at = placeOf(row.householdId);
      if (at) renters.set(at, (renters.get(at) ?? 0) + 1);
      continue;
    }
    tables.dwellings.remove(row.id);
    housedIds.delete(row.householdId);
    const flow = rt?.flows.get(`rent:${row.householdId}`);
    const lease = c.finance.contracts.get(`lease:${row.householdId}`);
    const placeId =
      flow?.placeId ??
      (lease ? c.organizations.get(lease.payeeId)?.placeId : undefined);
    if (flow && !flow.endedAt) {
      flow.endedAt = makeIsoDate(c.date);
      flow.endedReason = "housing.moved-out";
    }
    out.left.push(row.householdId);
    const payeeId = flow?.payeeId ?? lease?.payeeId;
    if (!placeId || !payeeId || !stocks.has(placeId)) continue;
    tables.vacated.put({
      id: `vacated:${row.householdId}`,
      placeId,
      payeeId,
      rentMinor: flow?.amountMinor ?? lease?.amountMinor ?? 0,
      kind: row.kind ?? "house",
      since: c.date,
    } satisfies VacatedRow);
  }
  // Households that moved in rent: a freed home first, oldest first, else a landlord's empty unit.
  const vacated = new Map<string, VacatedRow[]>();
  for (const row of [
    ...(tables.vacated.rows() as unknown as VacatedRow[]),
  ].sort((a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id)))
    vacated.set(row.placeId, [...(vacated.get(row.placeId) ?? []), row]);
  const account = new Map(
    (rt?.input.accounts ?? []).map((row) => [row.placeId, row.accountId]),
  );
  const firstOfNextMonth = makeIsoDate(
    `${addDays(makeIsoDate(`${c.date.slice(0, 7)}-01`), 32).slice(0, 7)}-01`,
  );
  const arrivals = [...(rt?.households.values() ?? [])]
    .filter(
      (record) =>
        !housedIds.has(record.household.id) &&
        stocks.has(record.household.placeId),
    )
    .sort((a, b) => a.household.id.localeCompare(b.household.id));
  for (const record of arrivals) {
    const placeId = record.household.placeId;
    const pool = account.get(placeId);
    if (!pool) continue;
    // Every household moving in rents for now; see the stopgap.
    stopgap("SG-WORLD-housing-arrivals-rent");
    const freed = vacated.get(placeId)?.shift();
    if (freed) tables.vacated.remove(freed.id);
    const payeeId =
      freed?.payeeId && c.organizations.has(freed.payeeId)
        ? freed.payeeId
        : `organization:landlord:${placeId}`;
    if (!c.organizations.has(payeeId)) continue;
    const rentMinor = Math.round(
      freed?.rentMinor || Math.max(0, typicalRent(placeId)),
    );
    if (rentMinor <= 0) continue;
    const source = {
      tag: "ESTIMATED" as const,
      asOf: c.date,
      citation,
      estimatedFrom: freed
        ? `A household that moved in rents a home another household left, at the ${Math.round(rentMinor / 100)} dollars a month its landlord last asked.`
        : `A household that moved in rents one of the landlord's empty units at the town's typical rent, ${Math.round(rentMinor / 100)} dollars a month.`,
    };
    addResidentFlow(c, {
      id: `rent:${record.household.id}`,
      kind: "purchase",
      financeKind: "household.rent",
      payerId: pool,
      payeeId,
      residentsId: pool,
      placeId,
      amountMinor: rentMinor,
      firstAt: firstOfNextMonth,
      cadence: { kind: "months", every: 1, day: 1 },
      salesReceipt: false,
      marketAdjusted: false,
      source,
    });
    tables.dwellings.put({
      id: `dwelling:${record.household.id}`,
      householdId: record.household.id,
      tenure: "rent",
      kind: freed?.kind ?? "apartment",
      rentMinor,
      since: c.date,
      basis: "arrival",
    });
    renters.set(placeId, (renters.get(placeId) ?? 0) + 1);
    out.housed.push(record.household.id);
  }
  // Freed homes nobody took stay listed only while units stand empty.
  for (const [placeId, row] of stocks) {
    const vacant = Math.max(0, row.rentalUnits - (renters.get(placeId) ?? 0));
    if (vacant !== row.vacantRental)
      tables.stock.put({ ...row, vacantRental: vacant });
    const listed = vacated.get(placeId) ?? [];
    for (const extra of listed.slice(0, Math.max(0, listed.length - vacant)))
      tables.vacated.remove(extra.id);
  }
  return out;
}
