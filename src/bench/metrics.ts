import { macroMonths } from "../director/opening-story";
import { coreAPI } from "../core2/state";
import { regionOfPlace } from "../core2/modules/regional";
import {
  benefitsPanel,
  buildingPanel,
  evictionPanel,
  townJobsPanel,
} from "../core2/modules/world-panels";
import { budgetView } from "./budget";
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

type Row = {
  key: string;
  unit: "percent" | "dollars" | "money" | "count";
  now: number;
  before: number | null;
};

/** The town's homes: its rental stock and vacancies, and the typical rent and home value the opening priced it from. */
function housingRows(core: CoreState, placeId: string): Row[] {
  const stock = buildingPanel(coreAPI(core)).stock.find(
    (row) => row.placeId === placeId,
  ) as
    | {
        rentalUnits: number;
        vacantRental: number;
        openingRentMinor: number;
        openingHomeValueMinor: number;
      }
    | undefined;
  if (!stock) return [];
  // SG-SCREENS-metrics-no-prior-year: the stock keeps no year-ago reading, so these show now only.
  return [
    { key: "rentals", unit: "count", now: stock.rentalUnits, before: null },
    { key: "vacant", unit: "count", now: stock.vacantRental, before: null },
    { key: "rent", unit: "money", now: stock.openingRentMinor, before: null },
    {
      key: "homeValue",
      unit: "money",
      now: stock.openingHomeValueMinor,
      before: null,
    },
  ];
}

/** Evictions served on the town's households in the last twelve months and the twelve before, and the unemployment claims open for its people now. */
function helpRows(core: CoreState, placeId: string) {
  const api = coreAPI(core);
  const homeOf = new Map<string, string>();
  for (const person of core.people.values())
    if (person.householdId) homeOf.set(person.householdId, person.placeId);
  const day = 24 * 3600 * 1000;
  const today = Date.parse(`${core.date}T00:00:00Z`);
  const iso = (days: number) =>
    new Date(today - days * day).toISOString().slice(0, 10);
  const year = iso(365),
    twoYears = iso(730);
  const cases = (
    evictionPanel(api) as unknown as {
      householdId: string;
      noticeAt: string;
    }[]
  ).filter((row) => homeOf.get(row.householdId) === placeId);
  const claims = (
    benefitsPanel(api) as unknown as {
      personId: string;
      open: boolean;
    }[]
  ).filter(
    (row) =>
      row.open && core.people.get(row.personId as never)?.placeId === placeId,
  );
  return {
    evictions: [
      {
        key: "evictions",
        unit: "count" as const,
        now: cases.filter((row) => row.noticeAt > year).length,
        before: cases.filter(
          (row) => row.noticeAt > twoYears && row.noticeAt <= year,
        ).length,
      },
    ],
    benefits: [
      {
        key: "claims",
        unit: "count" as const,
        now: claims.length,
        before: null,
      },
    ],
  };
}

/** The town's own government's books: what came in and what went out, this year's budget beside the year before. */
function budgetRows(
  core: CoreState,
  personId: string,
): { key: string; rows: Row[] } {
  const view = budgetView(core, personId);
  const town = ["city", "county"]
    .map((level) => view.governments.find((g) => g.level === level && g.latest))
    .find(Boolean);
  // Whose books they are, from the government's kind (Fable A, Nov 13, rule
  // 24): the county's where the place has no town government of its own.
  const key = town?.level === "county" ? "budgetCounty" : "budget";
  if (!town?.latest) return { key, rows: [] };
  const prior = town.prior;
  return {
    key,
    rows: [
      {
        key: "revenue",
        unit: "money",
        now: town.latest.revenueMinor,
        before: prior ? prior.revenueMinor : null,
      },
      {
        key: "spending",
        unit: "money",
        now: town.latest.spendingMinor,
        before: prior ? prior.spendingMinor : null,
      },
    ],
  };
}

export function metricsView(
  core: CoreState,
  placeId: string,
  personId: string,
) {
  const months = macroMonths(core);
  const state = stateRows(core, placeId);
  const help = helpRows(core, placeId);
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
          ...[
            { key: "housing", rows: housingRows(core, placeId) },
            { key: "evictions", rows: help.evictions },
            { key: "benefits", rows: help.benefits },
            budgetRows(core, personId),
          ].filter((section) => section.rows.length),
        ]
      : [],
  };
}
