/**
 * One played year in a drawn place, checked against the deep-past research
 * bands: where the town's partners, school cohorts, school peer groups,
 * opening education and faith, schooling places and school meeting places
 * landed, against the band each research row gives, naming record ids. The
 * research check (deep-past-check.ts) runs first and stops the run on a
 * mismatch. One run, one number; a band the year cannot show is printed as
 * such.
 * Run: node --import tsx scripts/research/deep-past-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { corePlaceByJurisdictionId } from "../../src/core2/place-lookup";
import { profileFor } from "../../src/core2/opening-profile";
import type { PersonState } from "../../src/core2/types";
import {
  attainment,
  bornInState,
  checkDeepPastResearch,
  faith,
  jointUse,
  partnerGap,
  row,
} from "./deep-past-check";

const failures = checkDeepPastResearch();
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const opening = core.date;
const stateOf = (placeId: string): string | undefined => {
  const key = corePlaceByJurisdictionId(placeId as never)?.stateJurisdictionKey;
  return key ? key.slice(key.lastIndexOf("-") + 1) : undefined;
};
const townState = stateOf(world.placeId) ?? "US";
console.log(
  `${world.place.displayName} (${townState}), seed ${seed}, ${core.people.size} people at the opening ${opening}`,
);
const pct = (value: number) => `${(100 * value).toFixed(1)}%`;
const ids = (rows: readonly string[], n = 3) =>
  rows.slice(0, n).join(", ") +
  (rows.length > n ? `, and ${rows.length - n} more` : "");
const people = () => [...core.people.values()] as PersonState[];
const inTown = (person: PersonState) => person.placeId === world.placeId;
const factsOf = (person: PersonState, kind: string) =>
  (person.pastFacts ?? []).filter((fact) => fact.kind === kind);

// Partners, by age gap (opposite-sex: man minus woman; same-sex: older minus younger).
function couples() {
  return [...core.familyLinks.values()]
    .filter((link) => link.kind === "partner")
    .flatMap((link) => {
      const [a, b] = link.personIds.map((id) => core.people.get(id));
      if (!a || !b) return [];
      const sexA = a.looks?.gender;
      const sexB = b.looks?.gender;
      const ageA = ageOnDate(a.birthDate, core.date);
      const ageB = ageOnDate(b.birthDate, core.date);
      const gap =
        sexA && sexB && sexA !== sexB
          ? sexA === "male"
            ? ageA - ageB
            : ageB - ageA
          : Math.abs(ageA - ageB);
      return [{ id: link.id, gap, town: inTown(a) || inTown(b) }];
    });
}
const openingCouples = couples();
const openingCoupleIds = new Set(openingCouples.map((c) => c.id));
const openingIds = new Set(core.people.keys());
const huskAtOpening = people().filter((person) => person.tier === "husk");

// Opening snapshot of the deep past, before the year runs.
type Cohort = {
  personId: string;
  stage: string;
  year: number;
  age: number;
  factId: string;
  proxy: string;
};
function cohorts(filter: (person: PersonState) => boolean): Cohort[] {
  return people()
    .filter(filter)
    .flatMap((person) =>
      factsOf(person, "school:cohort-estimate").map((fact) => {
        const from = fact.source.estimatedFrom ?? "";
        return {
          personId: person.id,
          stage: fact.facts?.stage ?? "",
          year: Number(fact.facts?.cohortYear),
          age: ageOnDate(person.birthDate, fact.date),
          factId: fact.id,
          proxy: from.includes("recorded residence")
            ? "residence"
            : from.includes("recorded birthplace")
              ? "birthplace"
              : "opening locality",
        };
      }),
    );
}
const openingCohorts = cohorts(() => true);

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
console.log(`Played to ${core.date}; ${core.people.size} people now.`);

// 1. Partner age gap.
{
  const gapRow = row("spouseAgeGapOpenRowYears");
  const tails = partnerGap.couples["married-os"]!.openRowTails!;
  const total = partnerGap.couples["married-os"]!.weightedThousands;
  const all = couples();
  const formed = all.filter((c) => !openingCoupleIds.has(c.id));
  const open = all.filter((c) => Math.abs(c.gap) >= 20);
  console.log(
    `\nspouseAgeGapOpenRowYears ${gapRow.value} (band ${gapRow.spread?.low} to ${gapRow.spread?.high} years): CPS couples 20 or more years apart are ${pct(tails.pooled.thousands / total)} of married couples, mean gap ${tails.pooled.meanGapYears} years.`,
  );
  console.log(
    `  Town: ${openingCouples.length} couples at the opening (${openingCouples.filter((c) => c.town).length} in the drawn place), ${formed.length} formed in the year; gaps ${JSON.stringify(all.map((c) => c.gap).sort((a, b) => a - b))}.`,
  );
  console.log(
    open.length
      ? `  ${open.length} of ${all.length} (${pct(open.length / all.length)}) are 20 or more years apart, mean ${(open.reduce((s, c) => s + Math.abs(c.gap), 0) / open.length).toFixed(1)} years: ${ids(open.map((c) => c.id))}.`
      : `  None is 20 or more years apart; at the CPS share ${all.length} couples would hold ${((all.length * tails.pooled.thousands) / total).toFixed(2)}, so one year in one town cannot show the open rows.`,
  );
  console.log(`  Couples read: ${ids(all.map((c) => c.id))}.`);
}

// 2. School-stage offsets.
for (const [stage, key] of [
  ["middle", "deepPastMiddleSchoolOffsetYears"],
  ["high", "deepPastHighSchoolOffsetYears"],
] as const) {
  const offset = row(key);
  const byPerson = new Map<string, Cohort[]>();
  for (const c of openingCohorts)
    byPerson.set(c.personId, [...(byPerson.get(c.personId) ?? []), c]);
  const spans: number[] = [];
  const ages: number[] = [];
  const factIds: string[] = [];
  for (const rows of byPerson.values()) {
    const first = rows.find((c) => c.stage === "elementary");
    const later = rows.find((c) => c.stage === stage);
    if (!later) continue;
    ages.push(later.age);
    factIds.push(later.factId);
    if (first) spans.push(later.year - first.year);
  }
  const count = (values: number[]) =>
    JSON.stringify(
      [
        ...values.reduce(
          (m, v) => m.set(v, (m.get(v) ?? 0) + 1),
          new Map<number, number>(),
        ),
      ].sort((a, b) => a[0] - b[0]),
    );
  const mean = spans.reduce((s, v) => s + v, 0) / Math.max(spans.length, 1);
  console.log(
    `\n${key} ${offset.value} (band ${offset.spread?.low} to ${offset.spread?.high} years after kindergarten): ${spans.length} people with both records; years after kindergarten ${count(spans)}, mean ${mean.toFixed(2)}; age at the start ${count(ages)} (CPS modal age ${stage === "middle" ? 11 : 14}). Records: ${ids(factIds)}.`,
  );
}
{
  const filled = people().filter(
    (person) =>
      !openingIds.has(person.id) &&
      factsOf(person, "school:cohort-estimate").length,
  );
  console.log(
    `  Filled in during the year with a school past built by buildDeepPast: ${filled.length} people (${ids(filled.map((p) => p.id))}).`,
  );
}

// 3. School peer groups.
{
  const size = row("openingPeerGroupSize");
  const groups = new Map<string, { members: number; facts: string[] }>();
  for (const person of people())
    for (const fact of factsOf(
      person,
      "social:generated-school-acquaintance",
    )) {
      const id = fact.facts?.peerGroupId ?? "";
      const group = groups.get(id) ?? {
        members: Number(fact.facts?.peerGroupMembers),
        facts: [],
      };
      group.facts.push(fact.id);
      groups.set(id, group);
    }
  const sizes = [...groups.values()].map((g) => g.members);
  console.log(
    `\nopeningPeerGroupSize ${size.value} (band ${size.spread?.low} to ${size.spread?.high} students per class): ${groups.size} generated peer groups, sizes ${JSON.stringify(sizes.sort((a, b) => a - b))}; counted voters are each known by ${size.value - 1} school peers in candidacy.ts countedKnown. Groups: ${ids([...groups.keys()])}; facts ${ids([...groups.values()].flatMap((g) => g.facts))}.`,
  );
}

// 4 and 5. Opening education and faith against ACS B15001 and Pew RLS.
{
  const adults = people().filter(
    (person) =>
      person.tier !== "husk" &&
      openingIds.has(person.id) &&
      ageOnDate(person.birthDate, opening) >= 18,
  );
  const band = (age: number) =>
    age < 25
      ? "18-24"
      : age < 35
        ? "25-34"
        : age < 45
          ? "35-44"
          : age < 65
            ? "45-64"
            : "65-plus";
  const placeKey = (person: PersonState) => {
    const state = stateOf(person.placeId);
    return state && attainment.places[state] ? state : "US";
  };
  for (const scope of ["drawn place", "every full adult"] as const) {
    const rows = adults.filter(
      (person) => scope === "every full adult" || inTown(person),
    );
    const seen = new Map<
      string,
      { n: number; college: number; expected: number }
    >();
    const faithSeen = {
      n: 0,
      observed: {} as Record<string, number>,
      expected: {} as Record<string, number>,
    };
    for (const person of rows) {
      const profile = profileFor(person, core.seed, opening);
      if (!profile) continue;
      const b = band(ageOnDate(person.birthDate, opening));
      const cell = seen.get(b) ?? { n: 0, college: 0, expected: 0 };
      cell.n += 1;
      cell.college += profile.education === "college" ? 1 : 0;
      cell.expected +=
        attainment.places[placeKey(person)]!.studyGroupShares[b]!.college!;
      seen.set(b, cell);
      faithSeen.n += 1;
      faithSeen.observed[profile.faith] =
        (faithSeen.observed[profile.faith] ?? 0) + 1;
      for (const [group, share] of Object.entries(
        faith.places[placeKey(person)]!.studyGroupShares,
      ))
        faithSeen.expected[group] = (faithSeen.expected[group] ?? 0) + share;
    }
    console.log(
      `\nOpening education, ${scope} (${rows.length} adults; profileFor, read by views.ts viewCell): share with a bachelor's degree or more by ACS age band, town against ACS 2019-2023 B15001 for each person's state: ${[
        ...seen,
      ]
        .sort()
        .map(
          ([b, c]) =>
            `${b} ${pct(c.college / c.n)} vs ${pct(c.expected / c.n)} (n ${c.n})`,
        )
        .join("; ")}.`,
    );
    console.log(
      `Opening faith, ${scope}: ${Object.keys(faithSeen.expected)
        .sort()
        .map(
          (g) =>
            `${g} ${pct((faithSeen.observed[g] ?? 0) / faithSeen.n)} vs Pew 2023-24 ${pct(faithSeen.expected[g]! / faithSeen.n)}`,
        )
        .join("; ")}. People read: ${ids(rows.map((p) => p.id))}.`,
    );
  }
}

// 6. Where the deep past puts schooling, against where people were born.
{
  const rows = openingCohorts.filter((c) => c.stage === "elementary");
  const local = rows.filter((c) => c.proxy === "opening locality");
  const expected =
    rows.reduce((s, c) => {
      const person = core.people.get(c.personId as never);
      const state = person ? stateOf(person.placeId) : undefined;
      return (
        s +
        bornInState.places[state && bornInState.places[state] ? state : "US"]!
          .bornWhereTheyLiveShare
      );
    }, 0) / Math.max(rows.length, 1);
  console.log(
    `\nSchooling place (SG-P8-deep-past): ${pct(local.length / Math.max(rows.length, 1))} of ${rows.length} elementary cohort records place school in the opening locality with no recorded residence or birthplace; ACS 2019-2023 B05002 puts the share of residents born in their own state at ${pct(expected)} for these people's states (${townState} ${pct(bornInState.places[townState]?.bornWhereTheyLiveShare ?? 0)}). Records: ${ids(local.map((c) => c.factId))}.`,
  );
}

// 7. School meeting places (SG-P8-civic-inputs).
{
  const offers = [...core.publicOrganizations.values()].filter(
    (org) => org.kind === "meeting-place" && org.facts?.meetingAccess,
  );
  const established = offers.filter(
    (org) => org.facts?.meetingAccess !== "permission-not-established",
  );
  console.log(
    `\nSchool and campus meeting places (band ${pct(jointUse.overall.low)} to ${pct(jointUse.overall.high)} of districts with a formal joint-use agreement, SHPPS 2012): ${offers.length} offers in the world, ${established.length} with access established${offers.length ? ` (${pct(established.length / offers.length)})` : "; none to count"}. Records: ${ids(offers.map((o) => o.id))}.`,
  );
}

// 8. Relatives outside the town (SG-P15-kin-light-past).
{
  const now = huskAtOpening
    .map((p) => core.people.get(p.id))
    .filter((p): p is PersonState => !!p);
  const promoted = now.filter((p) => p.tier !== "husk");
  console.log(
    `\nRelatives outside the town: ${huskAtOpening.length} at the opening, ${now.filter((p) => factsOf(p, "school:cohort-estimate").length).length} with a school past; ${promoted.length} became simulated during the year (${ids(promoted.map((p) => p.id))}), ${promoted.filter((p) => factsOf(p, "school:cohort-estimate").length).length} of them with a school past. Mechanic gap, no band: ${ids(huskAtOpening.map((p) => p.id))}.`,
  );
}
