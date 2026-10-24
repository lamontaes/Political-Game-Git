/**
 * One played year in a drawn place for research-people-sourced-parameters:
 * for each people row sourced or estimated, the band (the row's spread, read
 * from its parameter table, or the research file's figure) and where the
 * town landed, counted from records and naming record ids. Rows whose outcome
 * one played year cannot show say so.
 * Run: node --import tsx scripts/research/people-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI, registerModule } from "../../src/core2/state";
import {
  addDays,
  ageOnDate,
  daysBetweenText,
  makeIsoDate,
} from "../../src/core2/kernel/dates";
import { RENEWAL_MODULE_ID } from "../../src/core2/modules/renewal";
import { countedHouseholdsByPlace } from "../../src/core2/modules/residents";
import { countedHeadsOf } from "../../src/core2/residents-economy";
import { drivesReport } from "../../src/core2/modules/drives";
import { viewOf } from "../../src/core2/modules/views";
import { hudRentRowFor } from "../../src/core2/hud-rents";
import { coreStateName } from "../../src/core2/place-lookup";
import { PEOPLE_MIND_VERSION } from "../../src/core2/people-mind";
import type { EntityId } from "../../src/core2/kernel/brands";
import type { PersonId } from "../../src/core2/types";
import renewalJson from "../../src/core2/data/renewal/parameters.json" with { type: "json" };
import parametersJson from "../../src/core2/data/parameters.json" with { type: "json" };
import natality from "../../data/research/renewal/natality-2024.json" with { type: "json" };
import areaNames from "../../data/research/renewal/area-names.json" with { type: "json" };
import interpregnancy from "../../data/research/people/nchs-db240-interpregnancy-2014.json" with { type: "json" };
import atus from "../../data/research/people/atus-2025-volunteering.json" with { type: "json" };
import trajectories from "../../data/research/people/trauma-trajectories-2018.json" with { type: "json" };
import parentNear from "../../data/research/people/pew-parent-proximity-2005.json" with { type: "json" };
import kinNear from "../../data/research/people/pew-extended-family-proximity-2021.json" with { type: "json" };
import partisanship from "../../data/research/people/pew-partisanship-community-type-2023.json" with { type: "json" };

interface Row {
  value: number;
  spread?: { low?: number; high?: number; unit?: string };
}
const renewal = renewalJson as unknown as Record<string, Row>;
const parameters = parametersJson as unknown as Record<string, Row>;
const band = (row: Row) =>
  `${row.spread?.low} to ${row.spread?.high} ${row.spread?.unit ?? ""}`.trim();
const pct = (n: number, d: number) =>
  d ? `${((100 * n) / d).toFixed(1)}%` : "n/a";
const sample = (ids: readonly string[], n = 3) =>
  ids.length ? ids.slice(0, n).join(", ") : "none";
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const started = core.date;
const stateKey = world.place.stateJurisdictionKey ?? "";
const usps = stateKey.replace(/^US-/, "");
const stateName =
  (areaNames.aliases as Record<string, string>)[stateKey] ??
  coreStateName(usps) ??
  usps;
console.log(
  `${world.place.displayName}, seed ${seed}, ${core.people.size} people on record at the opening ${started}`,
);

// What the year emits that the bands count.
const volunteered: { id: string; actor: string }[] = [];
registerModule(core, {
  id: "research-people:watch",
  eventKinds: ["cause.volunteered"],
  onEvent: (_api, event) => {
    volunteered.push({ id: event.id, actor: event.personIds?.[0] ?? "" });
  },
});

// The town's residents at the opening (full tier, living in the town).
const inTown = (id: PersonId) => {
  const person = core.people.get(id);
  const home = person && core.households.get(person.householdId);
  return !!person && person.alive && home?.placeId === world.placeId;
};
const residents = [...core.people.values()].filter((person) =>
  inTown(person.id),
);
const adults = residents.filter(
  (person) => ageOnDate(person.birthDate, started) >= 18,
);

// Women 15 to 44, full and counted (each counted record times its weight).
const womenOf = (date: string) => {
  let women = 0;
  for (const person of residents) {
    const age = ageOnDate(person.birthDate, date);
    if (person.looks?.gender === "female" && age >= 15 && age <= 44) women += 1;
  }
  for (const record of countedHouseholdsByPlace(core).get(
    world.placeId as never,
  ) ?? [])
    for (const person of record.people) {
      const age = ageOnDate(person.birthDate, date);
      if (person.looks?.gender === "female" && age >= 15 && age <= 44)
        women += countedHeadsOf(core, person.id);
    }
  return women;
};
const womenAtOpening = womenOf(started);

// Opening views and temperaments, read before anything moves them.
const leans = adults
  .map((person) => ({ id: person.id, view: viewOf(api, person.id) }))
  .filter((row) => row.view !== null);
const trait = (id: PersonId, name: string) =>
  core.people.get(id)!.traits[`${PEOPLE_MIND_VERSION}:${name}`];
const correlation = (a: number[], b: number[]) => {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0,
    saa = 0,
    sbb = 0;
  for (let i = 0; i < n; i += 1) {
    sab += (a[i]! - ma) * (b[i]! - mb);
    saa += (a[i]! - ma) ** 2;
    sbb += (b[i]! - mb) ** 2;
  }
  return sab / Math.sqrt(saa * sbb);
};
const pairOf = (first: string, second: string) => {
  const ids = adults
    .map((person) => person.id)
    .filter(
      (id) => trait(id, first) !== undefined && trait(id, second) !== undefined,
    );
  return {
    n: ids.length,
    r: correlation(
      ids.map((id) => trait(id, first)!),
      ids.map((id) => trait(id, second)!),
    ),
    ids,
  };
};

// Kin: residents' living parents (their family:parent facts), and where each
// one lives: in the town, in its county (a husk with a county), or elsewhere
// in the state (opening-kin.ts places relatives no farther).
const town = world.placeId;
let withParent = 0,
  parentNearby = 0;
const kinFacts: string[] = [];
const kinPlaces = { town: 0, county: 0, state: 0 };
for (const person of adults) {
  const where = (person.pastFacts ?? [])
    .filter(
      (fact) => fact.kind === "family:parent" && fact.facts?.otherPersonId,
    )
    .flatMap((fact) => {
      const id = fact.facts!.otherPersonId as PersonId;
      const full = core.people.get(id);
      if (full) {
        if (!full.alive) return [];
        kinFacts.push(fact.id);
        return [
          core.households.get(full.householdId)?.placeId === town
            ? ("town" as const)
            : ("state" as const),
        ];
      }
      const husk = core.husks.get(id);
      if (!husk) return [];
      kinFacts.push(fact.id);
      return [
        husk.placeId === town
          ? ("town" as const)
          : husk.countyId
            ? ("county" as const)
            : ("state" as const),
      ];
    });
  if (!where.length) continue;
  withParent += 1;
  for (const place of where) kinPlaces[place] += 1;
  if (where.some((place) => place !== "state")) parentNearby += 1;
}

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
const t0 = Date.now();
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
console.log(
  `played to ${core.date} in ${((Date.now() - t0) / 60000).toFixed(1)} minutes`,
);

// ── Births ──────────────────────────────────────────────────────────────
const store = api.moduleState(RENEWAL_MODULE_ID);
const births = store
  .table("births")
  .rows()
  .filter(
    (row) => String(row.date) >= started && row.placeId === world.placeId,
  );
const full = births.filter((row) => !row.counted);
const counted = births.filter((row) => row.counted);
const countedWeight = counted.reduce(
  (sum, row) => sum + countedHeadsOf(core, String(row.childId)),
  0,
);
const area = (
  natality as unknown as {
    areas: Record<
      string,
      {
        fertilityPer1000Females15to44: number | null;
        ageRates: Record<string, number | null>;
      }
    >;
  }
).areas;
const stateArea = area[stateName] ?? area["United States"]!;
const gfr = ((full.length + countedWeight) / womenAtOpening) * 1000;
console.log("\n## Births plan (SG-M1-births-circumstances)");
console.log(
  `Births per 1,000 women 15-44: band ${stateArea.fertilityPer1000Females15to44} (${stateName}, NCHS 2024; national 53.8). Town ${gfr.toFixed(1)}: ${full.length} full births and ${counted.length} counted (standing for ${countedWeight.toFixed(0)}) over ${womenAtOpening.toFixed(0)} women. Records: ${sample(births.map((row) => String(row.id)))}.`,
);
const motherAge = (row: (typeof births)[number]) => {
  const mother = core.people.get(String(row.motherId) as PersonId);
  if (mother) return ageOnDate(mother.birthDate, String(row.date));
  for (const record of countedHouseholdsByPlace(core).get(
    world.placeId as never,
  ) ?? []) {
    const found = record.people.find((person) => person.id === row.motherId);
    if (found) return ageOnDate(found.birthDate, String(row.date));
  }
  return undefined;
};
const ages = full
  .map(motherAge)
  .filter((age): age is number => age !== undefined);
const placeSchedule = (() => {
  const groups = ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44"];
  const rates = groups.map((group) => stateArea.ageRates[group] ?? 0);
  const total = rates.reduce((s, r) => s + r, 0);
  return (
    groups.reduce(
      (s, group, i) => s + (Number(group.slice(0, 2)) + 2.5) * rates[i]!,
      0,
    ) / total
  );
})();
console.log(
  `Mother's mean age at a full birth (renewalAgeCenter ${renewal.renewalAgeCenter!.value}, spread ${renewal.renewalAgeSpread!.value}): band ${band(renewal.renewalAgeCenter!)} across the 56 places; this place's schedule ${placeSchedule.toFixed(1)}. Town ${ages.length ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : "n/a"} over ${ages.length} full births (ages ${ages.length ? `${Math.min(...ages)} to ${Math.max(...ages)}` : "n/a"}).`,
);
const pregnancies = store.table("pregnancies").rows();
const gestation = renewal.renewalGestationDays!.value;
const intervals: { months: number; id: string }[] = [];
for (const row of full) {
  const couple = store
    .table("couples")
    .rows()
    .find((c) =>
      (c.childIds as string[] | undefined)?.includes(String(row.childId)),
    );
  const earlier = ((couple?.childIds as string[] | undefined) ?? [])
    .map((id) => core.people.get(id as PersonId)?.birthDate)
    .filter((date): date is string => !!date && date < String(row.date))
    .sort();
  const previous = earlier.at(-1);
  if (!previous) continue;
  const conceived = addDays(makeIsoDate(String(row.date)), -gestation);
  intervals.push({
    months: daysBetweenText(previous, conceived) / 30.4375,
    id: String(row.id),
  });
}
console.log(
  `Interpregnancy interval (renewalTimingPeakYears ${renewal.renewalTimingPeakYears!.value}): median band ${interpregnancy.medianInterval.lowMonths} to ${interpregnancy.medianInterval.highMonths} months, ${interpregnancy.shortIntervals[0]!.percent}% under 18 months (NCHS 2014). Town: ${intervals.length} full births with an earlier child, median ${intervals.length ? median(intervals.map((x) => x.months)).toFixed(0) : "n/a"} months, ${pct(intervals.filter((x) => x.months < 18).length, intervals.length)} under 18. Records: ${sample(intervals.map((x) => x.id))}.`,
);
// Every recorded pregnancy of a town mother, including those reconstructed
// at the opening.
const residentIds = new Set(residents.map((person) => String(person.id)));
const townPregnancies = pregnancies.filter((row) =>
  residentIds.has(String(row.motherId)),
);
const lengths = townPregnancies.map((row) => ({
  id: String(row.id),
  days: daysBetweenText(String(row.conceivedAt), String(row.dueDate)),
}));
console.log(
  `Gestation (renewalGestationDays ${gestation}): band ${band(renewal.renewalGestationDays!)}. Town: ${lengths.length} pregnancies on record (${townPregnancies.filter((row) => String(row.conceivedAt) >= started).length} conceived in the year), lengths ${[...new Set(lengths.map((x) => x.days))].join(", ") || "n/a"} days (every pregnancy lasts the one median: still SG-M1-births-circumstances). Records: ${sample(lengths.map((x) => x.id))}.`,
);
const hud = hudRentRowFor(world.placeId as EntityId);
console.log(
  `Median family income a couple's pay is read against (renewalMedianAnnualIncomeMinor $${(renewal.renewalMedianAnnualIncomeMinor!.value / 100).toLocaleString("en-US")}): band $${((renewal.renewalMedianAnnualIncomeMinor!.spread!.low ?? 0) / 100).toLocaleString("en-US")} to $${((renewal.renewalMedianAnnualIncomeMinor!.spread!.high ?? 0) / 100).toLocaleString("en-US")}. This place ${hud?.veryLow4 != null ? `reads its own HUD area ${hud.area}: $${(hud.veryLow4 * renewal.renewalMedianPerVeryLowLimit!.value).toLocaleString("en-US")}, so the fallback was not read` : "has no HUD row and reads the fallback"}.`,
);
const plans = store.table("plans").rows();
console.log(
  `Weights and pulls (15 TUNABLE rows): no convertible source; they shape the ${plans.length} plan records (${plans.filter((row) => row.agreed).length} agreed), checked only through the town's births above. Records: ${sample(plans.map((row) => String(row.id)))}.`,
);

// ── Drives ──────────────────────────────────────────────────────────────
const report = drivesReport(core);
const byRule = report.responsesByRule as Record<string, number>;
const bereaved = Object.entries(byRule).filter(([key]) =>
  key.startsWith("bereavement"),
);
const bereavedTotal = bereaved.reduce((s, [, n]) => s + n, 0);
const carryOn = bereaved
  .filter(([key]) => key.endsWith(":carry-on"))
  .reduce((s, [, n]) => s + n, 0);
const resilience = trajectories.trajectories.find(
  (row) => row.id === "resilience",
)!;
const bereavementIds = report.decisions
  .filter((row) => row.ruleId.startsWith("bereavement"))
  .map((row) => `${row.eventId}:${row.personId}`);
console.log(
  "\n## Drives (SG-P10-response-model, SG-P10-perception-model, SG-P10-drive-acts)",
);
console.log(
  `Carry on after a loss: band ${resilience.low} to ${resilience.high}% resilient (Galatzer-Levy and others 2018). World (the town and the people other places keep on record): ${carryOn} of ${bereavedTotal} bereavement responses carried on, ${pct(carryOn, bereavedTotal)} (${JSON.stringify(Object.fromEntries(bereaved))}). Records: ${sample(bereavementIds)}.`,
);
console.log(
  `Perception channels: no convertible source; ${report.perceived ?? 0} perceptions weighed in the year.`,
);
const adultDays = adults.length * 365;
const townIds = new Set(adults.map((person) => String(person.id)));
const townActs = volunteered.filter((row) => townIds.has(row.actor));
const perVolunteer = new Map<string, number>();
for (const row of volunteered)
  perVolunteer.set(row.actor, (perVolunteer.get(row.actor) ?? 0) + 1);
console.log(
  `Volunteering (volunteerHours ${parameters.volunteerHours!.value}): band ${band(parameters.volunteerHours!)} per act, ${atus.volunteering.percentEngaged.total}% of people on a day (ATUS 2025). World: ${volunteered.length} volunteer acts of ${parameters.volunteerHours!.value} hours by ${perVolunteer.size} people (most by one person: ${Math.max(0, ...perVolunteer.values())}). Town: ${townActs.length} acts by its adults, ${pct(townActs.length, adultDays)} of adult-days. Records: ${sample(
    volunteered.map((row) => row.id),
    2,
  )}.`,
);

// ── Kin, temperament and views (the opening) ────────────────────────────
const kinRow = (
  kinNear.places as Record<string, { percent: number; tag: string }>
)[usps];
console.log("\n## Kin (SG-P15-kin-generation)");
console.log(
  `A living parent within an hour: band ${parentNear.nearParent.percent}% (Pew 2005); some extended family within an hour here ${kinRow?.percent}% (${kinRow?.tag}, Pew 2021). Town: ${parentNearby} of ${withParent} adults with a living parent have one in the town or its county, ${pct(parentNearby, withParent)}; parents by where they live ${JSON.stringify(kinPlaces)}. Records: ${sample(kinFacts)}.`,
);
console.log("\n## Temperament (SG-P15-personality-mapping)");
for (const [key, first, second] of [
  ["personalitySociabilityRiskCorrelation", "sociability", "risk"],
  ["personalityReliabilityImpulseCorrelation", "reliability", "deliberation"],
] as const) {
  const pair = pairOf(first, second);
  console.log(
    `${first} with ${second} (${key} ${parameters[key]!.value}): band ${band(parameters[key]!)}. Town: r = ${pair.r.toFixed(3)} over ${pair.n} adults at the opening (levels -2 to 2, so the coarse steps pull r toward zero). Records: ${sample(pair.ids)}.`,
  );
}
console.log("\n## Views (SG-P15-views-first-version)");
const right = leans.filter((row) => row.view!.lean > 0).length;
const left = leans.filter((row) => row.view!.lean < 0).length;
console.log(
  `Opening lean of ${leans.length} adults: ${pct(left, leans.length)} left of center, ${pct(right, leans.length)} right. Pew 2024 by place type: ${partisanship.communityType.map((row) => `${row.id} ${"democraticPercent" in row ? `${row.democraticPercent}% D / ${row.republicanPercent}% R` : `R +${row.republicanEdgePoints}`}`).join("; ")}. The core records no place type, so the town is not matched to one. Records: ${sample(leans.map((row) => row.id))}.`,
);
