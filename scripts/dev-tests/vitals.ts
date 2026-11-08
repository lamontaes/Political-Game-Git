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
import { RENEWAL_MODULE_ID } from "../../src/core2/modules/renewal";
import {
  VOTING_MODULE_ID,
  type ResultRow,
} from "../../src/core2/modules/voting";
import {
  CRIME_MODULE_ID,
  crimeMonths,
  type CrimeMonth,
} from "../../src/core2/modules/crime";
import { townMetrics } from "../../src/core2/modules/world-metrics";
import type { CoreState } from "../../src/core2/types";

type Household = Parameters<typeof householdIncome>[1];

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
  /** The wider population's births and deaths (the monthly counts rows), apart from the full people's logged ones. */
  countedBirths: number;
  /** A year of the typical rent over the middle earning household's yearly earnings, as a percent (townMetrics rentToEarnings). */
  rentSharePctOfEarnings: number | null;
  /** Ballots cast by the town's named and counted residents over those eligible, in the latest election with such voters, as a percent, and its date; null before any is counted. */
  turnoutPct: number | null;
  turnoutDate: string | null;
  /** Victimizations in the last twelve months per 1,000 residents (the crime engine's monthly records, all kinds); null before a year is recorded. */
  victimizationsPer1000: number | null;
  /** Of those, reported to police a year per 1,000 residents. */
  reportedCrimesPer1000: number | null;
  countedDeaths: number;
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
          liveHouseholds(): Iterable<Household>;
          weightOf(h: Household): number;
          countedMembers(h: Household): ArrayLike<unknown>;
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
  // The counted tier's births and deaths, in real people since the opening:
  // the renewal engine keeps a running total in each place's carry row (the
  // monthly counts rows exist only with bookkeeping on, so play keeps none).
  const counted = { births: 0, deaths: 0 };
  if (core.modules.has(RENEWAL_MODULE_ID))
    for (const row of coreAPI(core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("countedCarry")
      .rows() as unknown as { id: string; born?: number; died?: number }[]) {
      counted.births += row.born ?? 0;
      counted.deaths += row.died ?? 0;
    }
  const metrics = townMetrics(coreAPI(core)).find((m) => m.placeId === town);
  const rentShare =
    metrics && metrics.rentToEarnings > 0
      ? Math.round(1000 * metrics.rentToEarnings) / 10
      : null;
  // Turnout of the latest election day with counted town voters: ballots the
  // named and counted residents cast over everyone of them eligible, across
  // that day's contests (a result's `electorate` is ballots cast, not eligible).
  let turnout: { pct: number; date: string } | undefined;
  if (core.modules.has(VOTING_MODULE_ID)) {
    const results = (
      coreAPI(core)
        .moduleState(VOTING_MODULE_ID)
        .table("results")
        .rows() as unknown as ResultRow[]
    ).filter((r) => r.namedEligible + r.countedEligible > 0);
    const latest = results
      .map((r) => r.date)
      .sort()
      .at(-1);
    if (latest) {
      const day = results.filter((r) => r.date === latest);
      const cast = day.reduce(
        (n, r) => n + r.namedTurnout + r.countedTurnout,
        0,
      );
      const eligible = day.reduce(
        (n, r) => n + r.namedEligible + r.countedEligible,
        0,
      );
      turnout = {
        pct: Math.round((1000 * cast) / eligible) / 10,
        date: latest,
      };
    }
  }
  // The crime engine's records for the town: the last twelve months'
  // victimizations over the residents it counted that month.
  let crime: { victims: number; reported: number } | undefined;
  if (core.modules.has(CRIME_MODULE_ID)) {
    const months: CrimeMonth[] = crimeMonths(coreAPI(core), town).filter(
      (row) => row.date <= core.date,
    );
    const lastYear = months.slice(-12);
    const latest = lastYear.at(-1);
    if (lastYear.length === 12 && latest && latest.persons > 0) {
      const count = lastYear.reduce(
        (n, row) =>
          n + Object.values(row.types).reduce((a, t) => a + t.count, 0),
        0,
      );
      crime = {
        victims: Math.round((10_000 * count) / latest.persons) / 10,
        reported: Math.round(10_000 * latest.reportedPerResident) / 10,
      };
    }
  }
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
    rentSharePctOfEarnings: rentShare,
    turnoutPct: turnout?.pct ?? null,
    turnoutDate: turnout?.date ?? null,
    victimizationsPer1000: crime?.victims ?? null,
    reportedCrimesPer1000: crime?.reported ?? null,
    countedBirths: counted.births,
    countedDeaths: counted.deaths,
    partiesInTownSeats: parties,
    unmeasured: ["uninsured", "high school and college graduation", "crime"],
  };
}
