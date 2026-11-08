/**
 * VITAL STATISTICS of a played world's town, read from the records the
 * engines keep (the wider population's counted households times their
 * weight, plus the full people), so a start and an end can be compared.
 * A vital with no reader yet says so: it is listed in `unmeasured`, never
 * zero. Poverty uses the 2025 HHS guideline (SOURCED: $15,650 plus $5,500
 * for each additional person, 48 states). The median household income is the
 * game's own live metric (townMetrics medianHouseholdEarningsMinor, the middle
 * household with an earner); an earlier version read the counted household
 * records' stored wages (householdIncome), which change only when a job does,
 * and so printed a flat figure for twenty years (Nov 8).
 */
import {
  residentCounts,
  residentsRuntime,
} from "../../src/core2/modules/residents";
import {
  townPlaceOf,
  householdIncome,
} from "../../src/core2/modules/residents";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import { townMetrics } from "../../src/core2/modules/world-metrics";
import type { CoreState } from "../../src/core2/types";

export interface Vitals {
  date: string;
  population: number;
  households: number;
  workers: number;
  adults: number;
  employmentShareOfAdults: number | null;
  medianHouseholdIncomeUsd: number | null;
  povertySharePct: number | null;
  businesses: number;
  closedBusinesses: number;
  deathsLogged: number;
  birthsLogged: number;
  partiesInTownSeats: Record<string, number>;
  unmeasured: string[];
}

export function vitals(core: CoreState): Vitals {
  const counts = residentCounts(core);
  const sum = (k: "people" | "households" | "workers" | "adults") =>
    counts.reduce((n, c) => n + c[k], 0);
  const rt = residentsRuntime(core);
  const incomes: { usd: number; weight: number; size: number }[] = [];
  let unplaced = 0;
  if (rt) {
    const store = (
      rt as unknown as {
        store: {
          liveHouseholds(): Iterable<any>;
          weightOf(h: any): number;
          countedMembers(h: any): ArrayLike<unknown>;
        };
      }
    ).store;
    for (const h of store.liveHouseholds()) {
      unplaced += (h.unplacedWorkers ?? 0) * store.weightOf(h);
      incomes.push({
        usd: householdIncome(rt, h) / 100,
        weight: store.weightOf(h),
        size: store.countedMembers(h).length || 1,
      });
    }
  }
  const total = incomes.reduce((n, r) => n + r.weight, 0);
  const live = townMetrics(coreAPI(core)).find(
    (m) => m.placeId === townPlaceOf(core),
  )?.medianHouseholdEarningsMinor;
  const median: number | null = live ? Math.round(live / 100) : null;
  const poor = incomes
    .filter((r) => r.usd < 15650 + 5500 * (r.size - 1))
    .reduce((n, r) => n + r.weight, 0);
  const town = townPlaceOf(core);
  const fullAlive = [...core.people.values()].filter(
    (p) => p.alive && p.placeId === town,
  );
  const parties: Record<string, number> = {};
  for (const seat of townSeats(coreAPI(core)))
    if (seat.holder?.party)
      parties[seat.holder.party] = (parties[seat.holder.party] ?? 0) + 1;
  const fullWorkers = fullAlive.filter((p) => p.jobId).length;
  // The full people are a separate tier from the counted households.
  const adults = sum("adults") + fullAlive.length;
  const workers = sum("workers") + unplaced + fullWorkers;
  return {
    date: core.date,
    population: sum("people") + fullAlive.length,
    households: sum("households"),
    workers,
    adults,
    employmentShareOfAdults: adults
      ? Math.round((1000 * workers) / adults) / 10
      : null,
    medianHouseholdIncomeUsd: median,
    povertySharePct: total ? Math.round((1000 * poor) / total) / 10 : null,
    businesses: [...core.organizations.values()].filter(
      (o) => o.kind === "employer",
    ).length,
    closedBusinesses: core.logByKind.get("business.closed")?.size ?? 0,
    deathsLogged: core.logByKind.get("life.death")?.size ?? 0,
    birthsLogged: core.logByKind.get("person-birth")?.size ?? 0,
    partiesInTownSeats: parties,
    unmeasured: [
      "rent share of income",
      "uninsured",
      "high school and college graduation",
      "crime",
      "turnout",
      "counted births and deaths (only full people log them)",
    ],
  };
}
