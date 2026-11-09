import { macroMonths } from "../director/opening-story";
import { coreAPI } from "../core2/state";
import { townJobsPanel } from "../core2/modules/world-panels";
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

export function metricsView(core: CoreState, placeId: string) {
  const months = macroMonths(core);
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
