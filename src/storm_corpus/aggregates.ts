/**
 * Derived Aggregates Generator for NOAA Storm Events
 *
 * Computes deterministic decadal frequencies, seasonality profiles, and observed damage
 * distributions for game incident calibration.
 *
 * NOTE: These distributions are historical calibration summaries. They must not be
 * extrapolated into future climate predictions or canonical simulation damage state.
 */

import type {
  DamageTierCount,
  DecadalFrequencyEntry,
  DerivedAggregates,
  ObservedDamageDistribution,
  SeasonalityMonthlyEntry,
  SeasonalityProfile,
  StormCorpus,
  StormCoverageEra,
  StormEventFamily,
  StormEventRecord,
} from "./types";

export const AGGREGATE_DISCLAIMERS: readonly string[] = [
  "HISTORICAL CALIBRATION ONLY: These derived distributions reflect observed historical reports in the NOAA NCEI database (1950-2026).",
  "NO CANONICAL DAMAGE EFFECTS: Historical reported damage must not be converted directly into deterministic game state consequences without simulation modeling.",
  "COLLECTION ERA LIMITATIONS: Event frequencies prior to 1996 reflect historical NWS collection procedures (1950-1954: tornado only; 1955-1995: severe convective 3-hazards). Zero events in earlier eras do not indicate meteorological absence.",
  "NO CLIMATE EXTRAPOLATION: These aggregates are strictly descriptive historical baselines and must not be used to extrapolate future climate trends.",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function buildDerivedAggregates(corpus: StormCorpus): DerivedAggregates {
  const decadalFrequencies = buildDecadalFrequencies(corpus.events);
  const seasonalityProfiles = buildSeasonalityProfiles(corpus.events);
  const damageDistributions = buildDamageDistributions(corpus.events);

  return {
    schemaVersion: "1.0.0",
    generatedAt: corpus.generatedAt,
    disclaimers: AGGREGATE_DISCLAIMERS,
    decadalFrequencies,
    seasonalityProfiles,
    damageDistributions,
  };
}

/**
 * Computes decadal frequencies by jurisdiction, event family, and decade.
 */
export function buildDecadalFrequencies(
  events: readonly StormEventRecord[],
): readonly DecadalFrequencyEntry[] {
  type GroupKey = `${string}|${string}|${StormEventFamily}|${string}`;
  const groups = new Map<
    GroupKey,
    {
      jurisdictionKey: string;
      jurisdictionName: string;
      eventFamily: StormEventFamily;
      decade: string;
      era: StormCoverageEra;
      eventCount: number;
      episodeIds: Set<number>;
      years: Set<number>;
    }
  >();

  for (const event of events) {
    const year = parseInt(event.beginDateTime.slice(0, 4), 10);
    const decadeStart = Math.floor(year / 10) * 10;
    const decade = `${decadeStart}s`;
    const stateKey = event.stateFips;
    const stateName = event.state;

    const groupKey: GroupKey = `${stateKey}|${stateName}|${event.eventFamily}|${decade}`;
    let existing = groups.get(groupKey);
    if (!existing) {
      existing = {
        jurisdictionKey: stateKey,
        jurisdictionName: stateName,
        eventFamily: event.eventFamily,
        decade,
        era: event.coverageEra,
        eventCount: 0,
        episodeIds: new Set<number>(),
        years: new Set<number>(),
      };
      groups.set(groupKey, existing);
    }

    existing.eventCount += 1;
    existing.episodeIds.add(event.episodeId);
    existing.years.add(year);
  }

  const results: DecadalFrequencyEntry[] = [];

  for (const group of groups.values()) {
    const yearsInDecadeObserved = Math.max(1, group.years.size);
    const annualizedRate = Math.round((group.eventCount / 10) * 100) / 100;

    let coverageCaveat: string | null = null;
    if (
      group.era === "1950-1954_tornado_only" &&
      group.eventFamily !== "tornado"
    ) {
      coverageCaveat =
        "Non-tornado severe weather was not collected in the 1950-1954 digital archive.";
    } else if (
      group.era === "1955-1995_severe_convective_3" &&
      !["tornado", "severe_storm"].includes(group.eventFamily)
    ) {
      coverageCaveat =
        "Floods, winter storms, and temperature extremes were not systematically ingested into digital bulk records until 1996.";
    }

    results.push({
      jurisdictionKey: group.jurisdictionKey,
      jurisdictionName: group.jurisdictionName,
      eventFamily: group.eventFamily,
      decade: group.decade,
      coverageEra: group.era,
      eventCount: group.eventCount,
      episodeCount: group.episodeIds.size,
      yearsInDecadeObserved,
      annualizedRate,
      coverageCaveat,
    });
  }

  return results.sort((a, b) => {
    if (a.jurisdictionKey !== b.jurisdictionKey)
      return a.jurisdictionKey.localeCompare(b.jurisdictionKey);
    if (a.eventFamily !== b.eventFamily)
      return a.eventFamily.localeCompare(b.eventFamily);
    return a.decade.localeCompare(b.decade);
  });
}

/**
 * Computes monthly seasonality profiles for each jurisdiction and event family.
 */
export function buildSeasonalityProfiles(
  events: readonly StormEventRecord[],
): readonly SeasonalityProfile[] {
  type ProfileKey = `${string}|${StormEventFamily}`;
  const profiles = new Map<
    ProfileKey,
    {
      jurisdictionKey: string;
      eventFamily: StormEventFamily;
      monthlyCounts: number[];
      totalEvents: number;
    }
  >();

  for (const event of events) {
    const month = parseInt(event.beginDateTime.slice(5, 7), 10);
    const stateKey = event.stateFips;
    const profileKey: ProfileKey = `${stateKey}|${event.eventFamily}`;

    let profile = profiles.get(profileKey);
    if (!profile) {
      profile = {
        jurisdictionKey: stateKey,
        eventFamily: event.eventFamily,
        monthlyCounts: Array(12).fill(0),
        totalEvents: 0,
      };
      profiles.set(profileKey, profile);
    }

    if (month >= 1 && month <= 12) {
      profile.monthlyCounts[month - 1] += 1;
      profile.totalEvents += 1;
    }
  }

  const results: SeasonalityProfile[] = [];

  for (const profile of profiles.values()) {
    const monthlyDistribution: SeasonalityMonthlyEntry[] =
      profile.monthlyCounts.map((count, idx) => {
        const month = idx + 1;
        const proportion =
          profile.totalEvents > 0
            ? Math.round((count / profile.totalEvents) * 1000) / 1000
            : 0;
        return {
          month,
          monthName: MONTH_NAMES[idx] ?? `Month ${month}`,
          eventCount: count,
          proportion,
        };
      });

    const maxCount = Math.max(...profile.monthlyCounts, 0);
    const peakMonths =
      maxCount > 0
        ? profile.monthlyCounts
            .map((count, idx) => (count >= maxCount * 0.75 ? idx + 1 : null))
            .filter((m): m is number => m !== null)
        : [];

    results.push({
      jurisdictionKey: profile.jurisdictionKey,
      eventFamily: profile.eventFamily,
      totalEvents: profile.totalEvents,
      monthlyDistribution,
      peakMonths,
    });
  }

  return results.sort((a, b) => {
    if (a.jurisdictionKey !== b.jurisdictionKey)
      return a.jurisdictionKey.localeCompare(b.jurisdictionKey);
    return a.eventFamily.localeCompare(b.eventFamily);
  });
}

/**
 * Computes observed damage distribution percentiles and tiers.
 */
export function buildDamageDistributions(
  events: readonly StormEventRecord[],
): readonly ObservedDamageDistribution[] {
  type DistKey = `${string}|${StormEventFamily}`;
  const distributions = new Map<
    DistKey,
    {
      jurisdictionKey: string;
      eventFamily: StormEventFamily;
      totalEvents: number;
      reportedDamageAmounts: number[];
      missingDamageCount: number;
    }
  >();

  for (const event of events) {
    const stateKey = event.stateFips;
    const distKey: DistKey = `${stateKey}|${event.eventFamily}`;

    let dist = distributions.get(distKey);
    if (!dist) {
      dist = {
        jurisdictionKey: stateKey,
        eventFamily: event.eventFamily,
        totalEvents: 0,
        reportedDamageAmounts: [],
        missingDamageCount: 0,
      };
      distributions.set(distKey, dist);
    }

    dist.totalEvents += 1;
    const damageDollars = event.damage.totalEstimatedDollars;
    if (damageDollars !== null && damageDollars > 0) {
      dist.reportedDamageAmounts.push(damageDollars);
    } else {
      dist.missingDamageCount += 1;
    }
  }

  const results: ObservedDamageDistribution[] = [];

  for (const dist of distributions.values()) {
    const reported = [...dist.reportedDamageAmounts].sort((a, b) => a - b);
    const reportedCount = reported.length;
    const reportedRate =
      dist.totalEvents > 0
        ? Math.round((reportedCount / dist.totalEvents) * 1000) / 1000
        : 0;

    const minDamageDollars = reportedCount > 0 ? reported[0]! : null;
    const medianDamageDollars =
      reportedCount > 0 ? getPercentile(reported, 0.5) : null;
    const p75DamageDollars =
      reportedCount > 0 ? getPercentile(reported, 0.75) : null;
    const p90DamageDollars =
      reportedCount > 0 ? getPercentile(reported, 0.9) : null;
    const p99DamageDollars =
      reportedCount > 0 ? getPercentile(reported, 0.99) : null;
    const maxDamageDollars = reportedCount > 0 ? reported.at(-1)! : null;

    const tiers = calculateDamageTiers(
      dist.totalEvents,
      dist.missingDamageCount,
      reported,
    );

    results.push({
      jurisdictionKey: dist.jurisdictionKey,
      eventFamily: dist.eventFamily,
      totalEvents: dist.totalEvents,
      eventsWithReportedDamage: reportedCount,
      eventsWithMissingDamage: dist.missingDamageCount,
      reportedDamageRate: reportedRate,
      minDamageDollars,
      medianDamageDollars,
      p75DamageDollars,
      p90DamageDollars,
      p99DamageDollars,
      maxDamageDollars,
      damageTiers: tiers,
      calibrationCaveat:
        "Values represent observed historical nominal dollar estimates in NOAA records. Missing damage amounts are excluded from percentile distributions.",
    });
  }

  return results.sort((a, b) => {
    if (a.jurisdictionKey !== b.jurisdictionKey)
      return a.jurisdictionKey.localeCompare(b.jurisdictionKey);
    return a.eventFamily.localeCompare(b.eventFamily);
  });
}

function calculateDamageTiers(
  totalEvents: number,
  zeroOrMissingCount: number,
  reportedSorted: readonly number[],
): readonly DamageTierCount[] {
  const tierDefinitions = [
    {
      key: "zero_or_unspecified" as const,
      min: 0,
      max: 0,
      count: zeroOrMissingCount,
    },
    { key: "under_10k" as const, min: 1, max: 9_999, count: 0 },
    { key: "10k_to_100k" as const, min: 10_000, max: 99_999, count: 0 },
    { key: "100k_to_1m" as const, min: 100_000, max: 999_999, count: 0 },
    { key: "1m_to_10m" as const, min: 1_000_000, max: 9_999_999, count: 0 },
    { key: "10m_to_100m" as const, min: 10_000_000, max: 99_999_999, count: 0 },
    { key: "over_100m" as const, min: 100_000_000, max: null, count: 0 },
  ];

  for (const amt of reportedSorted) {
    for (const tier of tierDefinitions) {
      if (tier.key === "zero_or_unspecified") continue;
      if (amt >= tier.min && (tier.max === null || amt <= tier.max)) {
        tier.count += 1;
        break;
      }
    }
  }

  return tierDefinitions.map((tier) => ({
    tierKey: tier.key,
    minDollars: tier.min,
    maxDollars: tier.max,
    eventCount: tier.count,
    proportion:
      totalEvents > 0
        ? Math.round((tier.count / totalEvents) * 1000) / 1000
        : 0,
  }));
}

function getPercentile(sorted: readonly number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower]!;
  return Math.round(sorted[lower]! * (1 - weight) + sorted[upper]! * weight);
}
