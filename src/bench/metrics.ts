import { macroMonths } from "../director/opening-story";
import { coreAPI } from "../core2/state";
import { regionOfPlace } from "../core2/modules/regional";
import { townJobsPanel } from "../core2/modules/world-panels";
import {
  openingRegionMonths,
  stateFigures,
  type RegionMonth,
} from "../core2/regional-model";
import type { MacroMonth } from "../core2/macro-model";
import type { CoreState } from "../core2/types";

/**
 * How the place is doing: this year beside last, read from the records the world already holds
 * (the one reader the director's opening story uses: the macro engine's recorded months, or this
 * world's own drawn months before its first day). Each figure names its unit and carries the
 * same figure a year before when the data has one; a screen words them and adds nothing up.
 */
const NATION = [
  ["unemployment", "percent", "unemploymentPct"],
  ["inflation", "percent", "inflationPct"],
  ["pay", "dollars", "hourlyEarnings"],
  ["mortgage", "percent", "mortgage30Pct"],
  ["policyRate", "percent", "policyRatePct"],
] as const;

/**
 * The state the town is in, this month and a year before, from the regional engine's own months
 * (or its own opening function before its first step): jobs summed, unemployment and pay
 * weighted by population, the one function the engine uses.
 */
function stateRows(core: CoreState, placeId: string) {
  const months = macroMonths(core);
  if (!months || !core.modules.has("regional")) return null;
  const regional = coreAPI(core).moduleState("regional");
  const regionId = regionOfPlace(placeId);
  // The engine's stored months where it keeps them (it keeps the last twelve and each December);
  // for a month of this world's drawn history before its first step, the engine's own opening
  // function. A month it kept no row for has no figure.
  const api = coreAPI(core);
  const at = (row: Readonly<MacroMonth>): RegionMonth[] => {
    const stored = regional
      .table("months")
      .query("byMonth", [row.month]) as unknown as RegionMonth[];
    if (stored.length) return stored;
    return row.kind === "history"
      ? openingRegionMonths(row, core.startedAt, core.seed, (key) =>
          api.parameter(key),
        )
      : [];
  };
  const now = at(months.now);
  const fips = now.find((row) => row.regionId === regionId)?.stateFips;
  if (!fips) return null;
  const before = months.before ? at(months.before) : [];
  const last = before.some((row) => row.stateFips === fips)
    ? stateFigures(before, fips)
    : null;
  const current = stateFigures(now, fips);
  return (
    [
      [
        "unemployment",
        "percent",
        current.unemploymentPct,
        last?.unemploymentPct,
      ],
      ["pay", "dollars", current.hourlyEarnings, last?.hourlyEarnings],
      [
        "jobs",
        "count",
        current.jobsThousands * 1000,
        last && last.jobsThousands * 1000,
      ],
    ] as const
  ).map(([key, unit, nowValue, beforeValue]) => ({
    key,
    unit,
    now: nowValue,
    before: beforeValue ?? null,
  }));
}

export function metricsView(core: CoreState, placeId: string) {
  const months = macroMonths(core);
  const state = stateRows(core, placeId);
  // The town's own figures: what its people and firms hold now. The world keeps no year-ago
  // reading of them (SG-SCREENS-metrics-no-prior-year), so each shows the current value only.
  const jobs = core.modules.has("jobs")
    ? townJobsPanel(coreAPI(core), placeId)
    : null;
  return {
    sections: months
      ? [
          {
            key: "nation",
            rows: NATION.map(([key, unit, field]) => ({
              key,
              unit,
              now: months.now[field],
              before: months.before?.[field] ?? null,
            })),
          },
          ...(state ? [{ key: "state", rows: state }] : []),
          ...(jobs
            ? [
                {
                  key: "city",
                  rows: (
                    [
                      ["employed", jobs.employed],
                      ["seekers", jobs.seekers],
                      ["openPositions", jobs.openPositions],
                    ] as const
                  ).map(([key, now]) => ({
                    key,
                    unit: "count" as const,
                    now,
                    before: null,
                  })),
                },
              ]
            : []),
        ]
      : [],
  };
}
