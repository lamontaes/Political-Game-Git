/**
 * Derives the core parameter rows that the Oct 23, 2026 research set
 * (research-core-parameters-sourced-parameters) from their research files and
 * checks each row's value and spread against the derivation. Exits 1 on a
 * mismatch, so a changed research figure or a hand-edited row cannot drift
 * apart. Rows whose parameter file another change holds are printed with the
 * figure the research gives, not checked.
 * Run: node --import tsx scripts/research/core-parameters-check.ts
 */
import pew from "../../data/research/core/pew-2006-family-contact.json" with { type: "json" };
import atus from "../../data/research/core/atus-2025-sleep.json" with { type: "json" };
import laws from "../../data/research/core/state-law-adoption-dates-2025.json" with { type: "json" };
import cps from "../../data/research/core/cps-asec-2023-mobility.json" with { type: "json" };
import spring from "../../data/research/core/spring-2017-kin-proximity.json" with { type: "json" };
import coppock from "../../data/research/core/coppock-2020-ad-persuasion.json" with { type: "json" };
import corruption from "../../data/research/core/corruption-bands-2014.json" with { type: "json" };
import timeUse from "../../src/core2/data/time-use-reference.json" with { type: "json" };
import core from "../../src/core2/data/parameters.json" with { type: "json" };
import past from "../../src/core2/data/past/parameters.json" with { type: "json" };
import moves from "../../src/core2/data/moves/parameters.json" with { type: "json" };
import corruptionRows from "../../src/core2/data/corruption/parameters.json" with { type: "json" };

interface Row {
  value: number;
  tag: string;
  spread?: { low?: number; high?: number };
}
const failures: string[] = [];
const round = (value: number, places = 2) =>
  Math.round(value * 10 ** places) / 10 ** places;

/** One row checked against its derivation: value, tag and spread bounds. */
function check(
  table: string,
  key: string,
  row: Row | undefined,
  want: { value: number; tag: string; low: number; high: number },
): void {
  const got = row
    ? `${row.value} ${row.tag} [${row.spread?.low}, ${row.spread?.high}]`
    : "missing";
  const ok =
    !!row &&
    row.value === want.value &&
    row.tag === want.tag &&
    row.spread?.low === want.low &&
    row.spread?.high === want.high;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${table}:${key} derived ${want.value} ${want.tag} [${want.low}, ${want.high}], row ${got}`,
  );
  if (!ok) failures.push(`${table}:${key}`);
}

// Pew 2006: daily contact with a parent out of town over in town; the high
// end is the ratio of contacts a year over the whole distribution.
const contact = pew.contactByWhereParentLives.percent;
const codes = pew.contactsPerYearCodes as Record<string, number>;
const perYear = (column: "inTown" | "outOfTown") =>
  Object.entries(contact).reduce(
    (sum, [band, row]) => sum + (row[column] / 100) * codes[band]!,
    0,
  );
check(
  "parameters.json",
  "farKinContactShare",
  (core as Record<string, Row>).farKinContactShare,
  {
    value: round(contact.everyDay.outOfTown / contact.everyDay.inTown),
    tag: "ESTIMATED",
    low: round(contact.everyDay.outOfTown / contact.everyDay.inTown),
    high: round(perYear("outOfTown") / perYear("inTown")),
  },
);

// ATUS 2025: the employed-adult midpoint and its two ends.
const sleep = atus.sleepingHoursPerDay;
check(
  "parameters.json",
  "workSleepReserveHours",
  (core as Record<string, Row>).workSleepReserveHours,
  {
    value: round(
      (sleep.employedWithHouseholdChild.value +
        sleep.employedNoHouseholdChild.value) /
        2,
      1,
    ),
    tag: "ESTIMATED",
    low: sleep.employedWithHouseholdChild.value,
    high: sleep.employedNoHouseholdChild.value,
  },
);
const leisure = timeUse.rows.map(
  (row) => row.hoursPerDiaryDay.leisureAndSports.value,
);
check(
  "parameters.json",
  "restDayHours",
  (core as Record<string, Row>).restDayHours,
  {
    value: timeUse.rows.find((row) => row.cohort.startsWith("Total"))!
      .hoursPerDiaryDay.leisureAndSports.value,
    tag: "ESTIMATED",
    low: Math.min(...leisure),
    high: Math.max(...leisure),
  },
);

// Policy adoption dates: ages at day one of the laws in force.
const dayOne = Date.parse(laws.dayOne);
const yearsBefore = (date: string) =>
  (dayOne - Date.parse(date)) / (365.25 * 24 * 3600 * 1000);
const families = Object.values(laws.policies).map((policy) =>
  Object.values(policy.places as Record<string, Record<string, unknown>>)
    .filter((row) => row.inForce === true)
    .map((row) =>
      yearsBefore(
        typeof row.implemented === "string"
          ? row.implemented
          : `${row.adoptedYear as number}-01-01`,
      ),
    ),
);
const pastRows = past as Record<string, Row>;
check(
  "past/parameters.json",
  "pastUndatedLawAgeYearsLow",
  pastRows.pastUndatedLawAgeYearsLow,
  {
    value: 1,
    tag: "ESTIMATED",
    low: round(Math.min(...families.map((ages) => Math.min(...ages)))),
    high: round(Math.max(...families.map((ages) => Math.min(...ages)))),
  },
);
check(
  "past/parameters.json",
  "pastUndatedLawAgeYearsHigh",
  pastRows.pastUndatedLawAgeYearsHigh,
  {
    value: 20,
    tag: "ESTIMATED",
    low: round(Math.min(...families.map((ages) => Math.max(...ages)))),
    high: round(Math.max(...families.map((ages) => Math.max(...ages)))),
  },
);
const pooled = families.flat().sort((a, b) => a - b);
console.log(
  `     ${pooled.length} sourced laws in force at day one: median ${round(pooled[Math.floor(pooled.length / 2)]!)} years before it; the 1 to 20 draw has median 10.5.`,
);

// CPS ASEC 2023: log ratios of different-county move rates.
const g = cps.differentCountyByGroup;
const rate = (row: { total: number; differentCounty: number }) =>
  row.differentCounty / row.total;
const stateRate = (row: { total: number; differentState: number }) =>
  row.differentState / row.total;
const moveRows = moves as Record<string, Row>;
check("moves/parameters.json", "movesOwnerHold", moveRows.movesOwnerHold, {
  value: round(Math.log(rate(g.renterOccupied) / rate(g.ownerOccupied))),
  tag: "ESTIMATED",
  low: round(Math.log(rate(g.renterOccupied) / rate(g.ownerOccupied))),
  high: round(
    Math.log(stateRate(g.renterOccupied) / stateRate(g.ownerOccupied)),
  ),
});
check("moves/parameters.json", "movesJobHold", moveRows.movesJobHold, {
  value: round(Math.log(rate(g.unemployed) / rate(g.employedCivilian))),
  tag: "ESTIMATED",
  low: round(Math.log(rate(g.unemployed) / rate(g.employedCivilian))),
  high: round(
    Math.log(stateRate(g.unemployed) / stateRate(g.employedCivilian)),
  ),
});
// The children and kin holds keep their starting values (TUNABLE) until the
// departure rate is right (world-town-net-moving-negative); their spreads are
// the sourced bands, and the converted figure is printed for that item.
const STARTING = { movesChildrenHold: 0.4, movesKinHold: 0.15 };
const childrenConverted = round(
  Math.log(rate(g.noOwnChildUnder18) / rate(g.ownChildUnder18)),
);
check(
  "moves/parameters.json",
  "movesChildrenHold",
  moveRows.movesChildrenHold,
  {
    value: STARTING.movesChildrenHold,
    tag: "TUNABLE",
    low: round(Math.log(rate(g.noOwnChildUnder18) / rate(g.childUnder6Only))),
    high: round(Math.log(rate(g.noOwnChildUnder18) / rate(g.child6To17Only))),
  },
);

// Spring et al. 2017: one sibling or extended relative nearby, per relative.
const or = spring.oddsRatios;
const bound = (row: { or: number; se: number }, sign: number) =>
  round(Math.log(1 / (row.or + sign * 1.96 * row.se)));
const kinConverted = round(Math.log(1 / or.siblingsOrExtended.or));
check("moves/parameters.json", "movesKinHold", moveRows.movesKinHold, {
  value: STARTING.movesKinHold,
  tag: "TUNABLE",
  low: bound(or.siblingsOrExtended, 1),
  high: bound(or.parents, -1),
});
console.log(
  `     converted, not applied: movesChildrenHold ${childrenConverted}, movesKinHold ${kinConverted} (world-town-net-moving-negative applies them).`,
);

// Bands only: no engine row is set from these.
const band = coppock.band.stanceChangePerMessage;
console.log(
  `     speech band: ${band.mean} (${band.low} to ${band.high}) ${band.unit}; Coppock et al. 2020 favorability ${coppock.favorabilityEffect.scalePoints} points on a 1 to 5 scale.`,
);
const stake = (corruptionRows as Record<string, Row>).bribeShareOfStake;
console.log(
  `     bribeShareOfStake: the research gives ${corruption.bribeShareOfDeal.shareOfTransactionValue} of a deal's value (${corruption.bribeShareOfDeal.shareOfProfits} of its profit); the row holds ${stake?.value} ${stake?.tag}. Bribe band: ${corruption.bribeRate.shareOfAdultsPaying} of adults paid one in a year.`,
);

if (failures.length) {
  console.error(
    `${failures.length} row(s) do not match their research: ${failures.join(", ")}`,
  );
  process.exit(1);
}
console.log("Every checked row matches its research file.");
