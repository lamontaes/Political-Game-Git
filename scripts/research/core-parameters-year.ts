/**
 * One played year in a drawn place against the bands the core parameter
 * research set (research-core-parameters-sourced-parameters, Oct 23, 2026).
 * For each researched row it prints the band, read from its parameter or
 * research file, and where the town landed, counted from records, naming
 * record ids. One run, one number: the seed is drawn unless one is given.
 * Run: node --import tsx scripts/research/core-parameters-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI, registerModule } from "../../src/core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { corePlaceByJurisdictionId } from "../../src/core2/place-lookup";
import { parameter } from "../../src/core2/parameters";
import {
  departuresSeen,
  holdsOf,
  MOVED_AWAY_EVENT,
  watchDepartures,
} from "../../src/core2/modules/moves";
import { retellingsOf, SPEECH_HEARD } from "../../src/core2/modules/speech";
import { PAST_MODULE_ID } from "../../src/core2/past-module";
import type { EntityId } from "../../src/core2/kernel/brands";
import type { PersonState } from "../../src/core2/types";
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import pew from "../../data/research/core/pew-2006-family-contact.json" with { type: "json" };
import laws from "../../data/research/core/state-law-adoption-dates-2025.json" with { type: "json" };
import cps from "../../data/research/core/cps-asec-2023-mobility.json" with { type: "json" };
import coppock from "../../data/research/core/coppock-2020-ad-persuasion.json" with { type: "json" };
import corruption from "../../data/research/core/corruption-bands-2014.json" with { type: "json" };
import moveRows from "../../src/core2/data/moves/parameters.json" with { type: "json" };
import pastRows from "../../src/core2/data/past/parameters.json" with { type: "json" };

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const opening = core.date;
watchDepartures(core);

const pct = (n: number, d: number) =>
  d ? `${((100 * n) / d).toFixed(1)}%` : "n/a (none to count)";
const fixed = (n: number, places = 2) =>
  Number.isFinite(n) ? n.toFixed(places) : "n/a";
const isAdult = (person: PersonState, date: string) =>
  ageOnDate(person.birthDate, date) >= 18;
const inTown = (person: PersonState) =>
  person.alive && person.tier !== "husk" && person.placeId === world.placeId;

const tiers = new Map<string, number>();
for (const person of core.people.values())
  if (inTown(person)) tiers.set(person.tier, (tiers.get(person.tier) ?? 0) + 1);
console.log(
  `${world.place.displayName}, seed ${seed}, ${core.people.size} full people; in town by tier ${JSON.stringify(Object.fromEntries(tiers))}; ${opening} for 365 days`,
);

// Day one: every adult in town and what holds them (moves.ts holdsOf).
interface Start {
  owner: boolean;
  children: boolean;
  kin: number;
  job: boolean;
  tier: string;
  band: string;
  state: string;
}
const start = new Map<string, Start>();
const kinWeight = moveRows.movesKinHold.value;
for (const person of core.people.values()) {
  if (!inTown(person) || !isAdult(person, opening)) continue;
  const holds = holdsOf(api, person);
  const age = ageOnDate(person.birthDate, opening);
  const band =
    moverRates.ageBands.find((row) => {
      const [low, high] = row.replace("+", "-").split("-");
      return age >= Number(low) && (!high || age <= Number(high));
    }) ?? "75+";
  start.set(person.id, {
    owner: holds.owner! > 0,
    children: holds.children! > 0,
    kin: Math.round(holds.kin! / kinWeight),
    job: holds.job! > 0,
    tier: person.tier,
    band,
    state:
      corePlaceByJurisdictionId(person.placeId as EntityId)
        ?.stateJurisdictionKey ?? "",
  });
}

// Visits between relatives (life.ts contact acts), near or far by county.
const visits = { near: 0, far: 0 };
const visitIds: string[] = [];
const speeches: string[] = [];
registerModule(core, {
  id: "core-parameters-year:watch",
  relationshipKinds: ["*"],
  onRelationshipChange(watchApi, notice) {
    if (notice.reason?.cause !== "visit") return;
    const actor = watchApi.state.people.get(notice.actorId);
    const other = watchApi.state.people.get(notice.otherId);
    if (!actor || !other || !actor.familyIds.has(other.id)) return;
    if (actor.householdId === other.householdId) return;
    const near =
      other.placeId === actor.placeId ||
      (other.countyId !== undefined && other.countyId === actor.countyId);
    visits[near ? "near" : "far"] += 1;
    if (visitIds.length < 3 && notice.reason.sourceId)
      visitIds.push(notice.reason.sourceId);
  },
  eventKinds: [SPEECH_HEARD],
  onEvent(_watchApi, event) {
    speeches.push(event.id);
  },
});

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const t = performance.now();
const end = addDays(makeIsoDate(core.date), 365);
// Person-days in town at 15 and over, by tier, for the leisure line.
const personDays = new Map<string, number>();
const everIn = new Set<string>();
while (core.date < end) {
  for (const person of core.people.values())
    if (inTown(person) && ageOnDate(person.birthDate, core.date) >= 15) {
      personDays.set(person.tier, (personDays.get(person.tier) ?? 0) + 1);
      everIn.add(person.id);
    }
  dev.advance(addDays(makeIsoDate(core.date), 1));
}
console.log(`ran ${((performance.now() - t) / 1000).toFixed(0)} s\n`);

// 1. farKinContactShare: visits per relative tie, far over near.
const ties = { near: 0, far: 0 };
for (const row of core.relationships.values()) {
  const a = core.people.get(row.actorId);
  const b = core.people.get(row.otherId);
  if (!a || !b || !a.familyIds.has(b.id) || a.householdId === b.householdId)
    continue;
  if (!inTown(a) && !inTown(b)) continue;
  const near =
    b.placeId === a.placeId ||
    (b.countyId !== undefined && b.countyId === a.countyId);
  ties[near ? "near" : "far"] += 1;
}
const share = pew.derived.farKinContactShare;
console.log(
  `farKinContactShare band ${parameter("farKinContactShare")} (0.39 to 0.49, ${share.dailyRatio.split(" (")[0]}):`,
);
console.log(
  `  visits between relatives in other households: ${visits.near} to ${ties.near} near ties, ${visits.far} to ${ties.far} far ties; far over near per tie ${fixed(visits.far / Math.max(ties.far, 1) / (visits.near / Math.max(ties.near, 1)))}${visitIds.length ? `; e.g. ${visitIds.join(", ")}` : ""}`,
);

// 2. Sleep reserve and the day's leisure (work.ts, free-block.ts).
const restActions = new Set(
  core.data.actions
    .filter((row) => row.effect === "recover")
    .map((row) => row.id),
);
let restActs = 0;
for (const counter of core.actCounters.values())
  if (everIn.has(counter.actorId) && restActions.has(counter.actionId))
    restActs += counter.count;
const days = [...personDays.values()].reduce((a, b) => a + b, 0);
console.log(
  `\nworkSleepReserveHours ${parameter("workSleepReserveHours")} (band 8.56 to 8.83, ATUS 2025 Table 8B) and restDayHours ${parameter("restDayHours")} (band 3.89 to 7.39 by age, ATUS 2025 Table 3):`,
);
console.log(
  `  the reserve is subtracted from every person's 24 hours, leaving ${fixed(24 - parameter("workSleepReserveHours"))} h before work; it is a read, not an outcome to count.`,
);
console.log(
  `  ${everIn.size} people 15+ in town, ${days} person-days by tier ${JSON.stringify(Object.fromEntries(personDays))}: ${restActs} rest acts, leisure ${fixed((restActs * parameter("restDayHours")) / Math.max(days, 1))} h a day (ATUS 5.16 for everyone 15 and over)`,
);

// 3. Undated laws' ages at day one (past-laws.ts).
const lawRows = api
  .moduleState(PAST_MODULE_ID)
  .table("laws")
  .rows() as unknown as {
  id: string;
  enactedOn: string;
  source?: { citation?: string };
}[];
const undated = lawRows
  .filter((row) => row.source?.citation?.includes("pastUndatedLawAge"))
  .map((row) => ({
    id: row.id,
    years: ageOnDate(row.enactedOn, opening),
    exact:
      (Date.parse(opening) - Date.parse(row.enactedOn)) /
      (365.25 * 24 * 3600 * 1000),
  }))
  .sort((a, b) => a.exact - b.exact);
console.log(
  `\npastUndatedLawAgeYearsLow ${pastRows.pastUndatedLawAgeYearsLow.value} (band ${pastRows.pastUndatedLawAgeYearsLow.spread.low} to ${pastRows.pastUndatedLawAgeYearsLow.spread.high}) and High ${pastRows.pastUndatedLawAgeYearsHigh.value} (band ${pastRows.pastUndatedLawAgeYearsHigh.spread.low} to ${pastRows.pastUndatedLawAgeYearsHigh.spread.high}); ${laws.derived.pooledMedianAge}:`,
);
if (undated.length) {
  const median = undated[Math.floor(undated.length / 2)]!;
  console.log(
    `  ${undated.length} undated law histories: youngest ${fixed(undated[0]!.exact)} years (${undated[0]!.id}), median ${fixed(median.exact)} (${median.id}), oldest ${fixed(undated.at(-1)!.exact)} (${undated.at(-1)!.id}); ${undated.filter((row) => row.exact > 20).length} older than 20 years`,
  );
} else console.log("  no undated law history was written");
// The two sourced policies, for this place's own state: the drawn age
// against the researched one.
const postal = start.values().next().value?.state ?? "";
for (const [question, policy] of Object.entries(laws.policies)) {
  const real = (policy.places as Record<string, Record<string, unknown>>)[
    postal
  ];
  const history = undated.find(
    (row) => row.id.includes(`:${postal}:`) && row.id.includes(question),
  );
  const realYears = real?.inForce
    ? (Date.parse(opening) -
        Date.parse(
          typeof real.implemented === "string"
            ? real.implemented
            : `${real.adoptedYear as number}-01-01`,
        )) /
      (365.25 * 24 * 3600 * 1000)
    : undefined;
  console.log(
    `  ${question.split(":")[1]} in ${postal}: ${realYears === undefined ? "not in force by the research" : `passed ${fixed(realYears)} years before day one by the research`}; the town's history ${history ? `gives ${fixed(history.exact)} (${history.id})` : "has no undated row for it"}`,
  );
}

// 4. Speeches: how far one speech moved its listeners.
const heard = speeches.flatMap((id) => retellingsOf(api, id));
const moved = heard.map((row) => row.moved);
const band = coppock.band.stanceChangePerMessage;
console.log(
  `\nspeechImpulse band ${band.mean} (${band.low} to ${band.high}) ${band.unit} (Coppock, Hill and Vavreck 2020):`,
);
console.log(
  heard.length
    ? `  ${speeches.length} speeches, ${heard.length} listeners: mean stance change ${fixed(moved.reduce((a, b) => a + b, 0) / moved.length, 4)}, ${moved.filter((v) => v > 0).length} moved at all, ${heard.filter((row) => row.retold).length} retold (e.g. ${heard[0]!.speechId})`
    : `  ${speeches.length} speeches with no recorded listener in town`,
);

// 5. Bribes offered and taken (corruption.ts).
const crimes = core.modules.has("corruption")
  ? (api.moduleState("corruption").table("crimes").rows() as unknown as {
      id: string;
      offererId: string;
      offered: boolean;
      taken: boolean;
    }[])
  : [];
const offerers = new Set(
  crimes.filter((row) => row.offered).map((row) => row.offererId),
);
const adultsAtEnd = [...core.people.values()].filter(
  (p) => inTown(p) && isAdult(p, core.date),
).length;
console.log(
  `\nbribes: band ${corruption.bribeRate.shareOfAdultsPaying} of adults paying one in a year (GCB 2013); bribeShareOfStake research ${corruption.bribeShareOfDeal.shareOfTransactionValue} of the deal:`,
);
console.log(
  `  ${crimes.filter((row) => row.offered).length} offered by ${offerers.size} people (${pct(offerers.size, adultsAtEnd)} of ${adultsAtEnd} adults), ${crimes.filter((row) => row.taken).length} taken${crimes[0] ? ` (e.g. ${crimes[0].id})` : ""}`,
);

// 6. Moves: departures against the ACS rate, holds as rate ratios, causes.
const departures = departuresSeen(core).filter(
  (row) => row.fromPlaceId === world.placeId,
);
const left = new Map<string, string>();
for (const row of departures)
  for (const id of row.withIds) if (start.has(id)) left.set(id, row.id);
const rates = moverRates as unknown as {
  national: { departurePerYearByAge: Record<string, number> };
  places: Record<string, { departurePerYearByAge: Record<string, number> }>;
};
let expected = 0;
for (const row of start.values())
  expected += (rates.places[row.state] ?? rates.national).departurePerYearByAge[
    row.band
  ]!;
console.log(
  `\nmovesLifeStageScale ${moveRows.movesLifeStageScale.value}: ${start.size} adults in town on day one; ACS 2024 rates for their ages and state give ${fixed(expected, 1)} leavers a year (${pct(expected, start.size)}); ${left.size} left (${pct(left.size, start.size)}) in ${departures.length} departures${departures[0] ? ` (e.g. ${departures[0].id})` : ""}`,
);
const ratio = (flag: (row: Start) => boolean) => {
  const rows = [...start.entries()];
  const yes = rows.filter(([, row]) => flag(row));
  const no = rows.filter(([, row]) => !flag(row));
  const rateOf = (group: typeof rows) =>
    group.filter(([id]) => left.has(id)).length / Math.max(group.length, 1);
  return {
    text: `${yes.filter(([id]) => left.has(id)).length} of ${yes.length} against ${no.filter(([id]) => left.has(id)).length} of ${no.length}`,
    log: Math.log(rateOf(no) / rateOf(yes)),
  };
};
const holdRows: [string, number, number, (row: Start) => boolean][] = [
  [
    "movesOwnerHold",
    moveRows.movesOwnerHold.spread.low,
    moveRows.movesOwnerHold.spread.high,
    (r) => r.owner,
  ],
  [
    "movesJobHold",
    moveRows.movesJobHold.spread.low,
    moveRows.movesJobHold.spread.high,
    (r) => r.job,
  ],
  [
    "movesChildrenHold",
    moveRows.movesChildrenHold.spread.low,
    moveRows.movesChildrenHold.spread.high,
    (r) => r.children,
  ],
  [
    "movesKinHold (any relative in town)",
    moveRows.movesKinHold.spread.low,
    moveRows.movesKinHold.spread.high,
    (r) => r.kin > 0,
  ],
];
for (const [key, low, high, flag] of holdRows) {
  const r = ratio(flag);
  console.log(
    `  ${key}: band ${low} to ${high} (log ratio of leaving rates); town: left ${r.text} without it, log ratio ${fixed(r.log)}`,
  );
}
const reasons = cps.intercountyReasons;
const causeRows: [string, string, number][] = [
  [
    "housing.eviction",
    "movesEvictedPull (foreclosure or eviction)",
    reasons.foreclosureOrEviction,
  ],
  [
    "work.job-lost",
    "movesJobLostPull (look for work or lost job)",
    reasons.lookForWorkOrLostJob,
  ],
  [
    "life.death",
    "movesHouseholdLossPull (change in marital status)",
    reasons.changeInMaritalStatus,
  ],
  [
    "push:housingCost",
    "movesHousingCostWeight (cheaper housing)",
    reasons.cheaperHousing,
  ],
  [
    "push:jobElsewhere",
    "movesJobElsewherePush (new job or transfer)",
    reasons.newJobOrTransfer,
  ],
  [
    "push:closeElsewhere",
    "movesCloseElsewherePull (other family reason)",
    reasons.otherFamilyReason,
  ],
];
const kinMoved = departures.filter(
  (row) => (row.reasons[MOVED_AWAY_EVENT] ?? 0) > 0,
);
for (const [key, label, count] of causeRows) {
  const hits = departures.filter((row) => (row.reasons[key] ?? 0) > 0);
  console.log(
    `  ${label}: band ${pct(count, reasons.movers)} of different-county movers (CPS 2023); town: ${hits.length} of ${departures.length} departures (${pct(hits.length, departures.length)})${hits[0] ? `, e.g. ${hits[0].id}` : ""}`,
  );
}
console.log(
  `  movesKinMovedPull (following kin; other family reason): band ${pct(reasons.otherFamilyReason, reasons.movers)}; town: ${kinMoved.length} of ${departures.length} departures${kinMoved[0] ? `, e.g. ${kinMoved[0].id}` : ""}`,
);
console.log(
  "  Holds and pushes decide who of an age leaves; the ACS rate and movesLifeStageScale decide how many (moves.ts accumulate).",
);
