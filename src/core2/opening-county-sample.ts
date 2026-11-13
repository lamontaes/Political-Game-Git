/**
 * The county's counted households at the opening (CTO, Nov 8, on #7365: "a
 * county gets its own counted sample in the one store, weighted to its real
 * count, built at the opening like the town's"). The households are drawn
 * the way the town's are (the Census household mix, the invented-person age
 * table, the name corpus, the opening temperaments), placed at the county's
 * own place, and every record stands for as many real households as the
 * county's eligible voters ask for (`ResidentsInput.weights`). Working adults
 * hold the county's employment: how many of each age work is the county's
 * ACS rate, and the sector they work in follows the county's Census County
 * Business Patterns employment, in groups the size of a workgroup.
 */
import { makeIsoDate } from "./kernel/dates";
import { createStableId, stableHash } from "./kernel/ids";
import { ageInYears } from "./kernel/dates";
import { countyPlaceIdOf, statePlaces } from "./modules/elections";
import {
  namedMembers,
  openingTemperaments,
  placeEarningsOf,
  townHouseholdSkeleton,
} from "./modules/people";
import {
  countySectorEmployment,
  nationalMedianAnnualWage,
  residentEmploymentRate,
} from "./modules/jobs";
import { corePlaceByKey } from "./place-lookup";
import { placeCountyPopulationShares, placeStateKey } from "./place-map";
import { medianTransactionBalance } from "./modules/budgets";
import { citizenShareOf } from "./modules/voting";
import { parameter as p } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, HouseholdInput, PersonInput, Source } from "./types";

export const COUNTY_SAMPLE_STOPGAP = "SG-LIVES-county-sample-employers";

export interface CountySample {
  input: CoreInput;
  /** Real households each sampled county household stands for. */
  weight: number;
  /** The county's place (a jurisdiction id) the households live at. */
  placeId: string;
}

/** The county the town lies in, if the world records one. */
function countyOf(input: {
  seed: string;
  placeMetadata?: Readonly<Record<string, unknown>>;
}) {
  const placeKey = input.placeMetadata?.placeKey as string | undefined;
  const town = placeKey ? corePlaceByKey(placeKey) : null;
  const usps = placeStateKey(placeKey ?? "")?.slice(3);
  if (!town?.sourceGeoid || !usps) return null;
  const countyName = countyPlaceIdOf(
    input.placeMetadata?.countyNames as string | undefined,
    usps,
  );
  if (!countyName) return null;
  const electorate = statePlaces(usps, input.seed).find(
    (row) => row.id === countyName,
  );
  const shares = placeCountyPopulationShares(town.sourceGeoid);
  const geoid = [...shares].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0];
  const county = geoid ? corePlaceByKey(`county:${geoid}`) : null;
  if (!electorate || !geoid || !county) return null;
  return {
    usps,
    geoid,
    placeKey: placeKey!,
    eligible: electorate.eligible,
    jurisdictionId: county.context.jurisdiction.id as string,
  };
}

/**
 * Add the county's sampled households to a generated opening. Returns the
 * input unchanged where the town has no county on record (an island area).
 */
export function withCountySample(
  input: CoreInput,
  kept: ReadonlySet<string> = new Set(),
): CountySample | null {
  const county = countyOf(input);
  if (!county) return null;
  const countyPlaceId = county.jurisdictionId;
  stopgap(COUNTY_SAMPLE_STOPGAP);
  const start = makeIsoDate(input.startedAt);
  const size = p("countySampleHouseholds");
  const world = { seed: input.seed, startedAt: start };
  const source: Source = {
    tag: "ESTIMATED",
    asOf: start,
    citation:
      "Census ACS 2020-2024 household mix (state where the county has none), the invented-person age table, the county's ACS employment by age and Census 2023 County Business Patterns employment by sector.",
    estimatedFrom:
      "A sample of the county's households, each standing for as many real households as the county's eligible voters ask for (race-places basePlaces).",
  };
  const people: PersonInput[] = [];
  const households: HouseholdInput[] = [];
  const subjects: {
    id: string;
    birthDate: string;
    gender: string;
    parents: string[];
  }[] = [];
  const base = new Map<string, Omit<PersonInput, "traits">>();
  // Every record stands for as many households as the county's eligible
  // voters (adult citizens) ask for.
  const share = citizenShareOf(county.placeKey, county.usps, input.seed);
  // The circle's kin already living in the county and counted each stand for
  // themselves (weight one, each a real relative); the sample stands for the
  // rest, so the county's weighted adult citizens come to its eligible count
  // without counting the kin twice.
  const adultOf = (row: { readonly birthDate: string }) =>
    ageInYears(row.birthDate, start) >= p("votingAge");
  const kin = input.people.filter(
    (row) => row.placeId === county.jurisdictionId && !kept.has(row.id),
  );
  const kinEligible = kin.filter(adultOf).length * share;
  // The sample stops growing once its eligible voters would pass what the
  // county has besides the kin: a household stands for at least itself (a
  // weight of one or more), so a small county gets a smaller sample, never a
  // household that stands for less than one.
  const wanted = county.eligible - kinEligible;
  let sampleEligible = 0;
  for (let index = 0; index < size; index += 1) {
    const skeleton = townHouseholdSkeleton(
      input.seed,
      county.jurisdictionId as never,
      index,
    );
    const named = namedMembers(world, county.jurisdictionId as never, skeleton);
    const eligibleHere = named.filter(adultOf).length * share;
    if (index > 0 && sampleEligible + eligibleHere > wanted) break;
    sampleEligible += eligibleHere;
    const householdId = createStableId(
      "household",
      `county-sample:${county.geoid}:${index}`,
    );
    const ids = named.map((row) =>
      createStableId("person", `county-sample:${row.stableKey}`),
    );
    named.forEach((row, n) => {
      const id = ids[n]!;
      subjects.push({
        id,
        birthDate: row.birthDate,
        gender: row.identity.gender,
        parents: [],
      });
      base.set(id, {
        id,
        givenName: row.givenName,
        familyName: row.familyName,
        birthDate: row.birthDate,
        placeId: county.jurisdictionId,
        householdId,
        tier: "weekly",
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        source,
        familyIds: ids.filter((other) => other !== id),
        knownIds: [],
        looks: {
          gender: row.identity.gender,
          pronouns: row.identity.pronouns,
        },
      });
    });
    households.push({
      id: householdId,
      placeId: county.jurisdictionId,
      memberIds: ids,
      source,
    });
  }
  const temperament = openingTemperaments(subjects, {
    seed: input.seed,
    startedAt: start,
  });
  for (const [id, row] of base)
    people.push({ ...row, traits: { ...(temperament.get(id) ?? {}) } });
  // Who works: each age's share of the county's adults, by quota in a fixed
  // hashed order (no draw decides one person's job); the sector each works
  // in follows the county's employment, grouped into workgroups.
  const byId = new Map(people.map((row) => [row.id, row]));
  const adults = people
    .filter((row) => ageInYears(row.birthDate, start) >= p("votingAge"))
    .sort((a, b) =>
      stableHash(`${input.seed}:work:${a.id}`).localeCompare(
        stableHash(`${input.seed}:work:${b.id}`),
      ),
    );
  const bandOf = new Map<string, PersonInput[]>();
  for (const row of adults) {
    const age = Math.floor(ageInYears(row.birthDate, start));
    const rate = residentEmploymentRate(age, county.geoid, input.seed);
    if (!rate) continue;
    const list = bandOf.get(rate.ageId) ?? [];
    list.push(row);
    bandOf.set(rate.ageId, list);
  }
  const workers: PersonInput[] = [];
  for (const [, list] of [...bandOf].sort((a, b) => a[0].localeCompare(b[0]))) {
    const rate = residentEmploymentRate(
      Math.floor(ageInYears(list[0]!.birthDate, start)),
      county.geoid,
      input.seed,
    )!.rate;
    workers.push(...list.slice(0, Math.floor(list.length * rate)));
  }
  workers.sort((a, b) => a.id.localeCompare(b.id));
  const sectors = [...countySectorEmployment(county.geoid)].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  const total = sectors.reduce((n, [, jobs]) => n + jobs, 0);
  const employment = new Map<
    string,
    { personId: string; employerId: string; sector: string }[]
  >();
  if (total > 0) {
    const inSector = new Map<string, number>();
    workers.forEach((worker, n) => {
      let point = ((n + p("half")) / workers.length) * total;
      let sector = sectors[sectors.length - 1]![0];
      for (const [name, jobs] of sectors) {
        point -= jobs;
        if (point < 0) {
          sector = name;
          break;
        }
      }
      const seen = inSector.get(sector) ?? 0;
      inSector.set(sector, seen + 1);
      const group = Math.floor(seen / p("openingCoworkerGroupSize"));
      const home = byId.get(worker.id)!.householdId;
      const list = employment.get(home) ?? [];
      list.push({
        personId: worker.id,
        employerId: `employer:county:${county.geoid}:${sector}:${group}`,
        sector,
      });
      employment.set(home, list);
    });
  }
  // Each sampled employer is owned by one of the county's adults (generation
  // of who exists): the adult of 25 or over with the smallest hash for it who
  // owns no other, so owners are county people the chooser can read.
  const owners = new Set<string>();
  const employerIds = [
    ...new Set(
      [...employment.values()].flatMap((rows) =>
        rows.map((row) => row.employerId),
      ),
    ),
  ].sort();
  const ownerAge = p("votingAge") + p("ownerAgeAfterVoting");
  for (const employerId of employerIds) {
    const owner = people
      .filter(
        (row) =>
          !owners.has(row.id) && ageInYears(row.birthDate, start) >= ownerAge,
      )
      .sort((a, b) =>
        stableHash(`${input.seed}:owner:${employerId}:${a.id}`).localeCompare(
          stableHash(`${input.seed}:owner:${employerId}:${b.id}`),
        ),
      )[0];
    if (!owner) continue;
    owners.add(owner.id);
    owner.looks = { ...(owner.looks ?? {}), ownedEmployerId: employerId };
  }
  // Cash: what a household at its pay keeps in its accounts in this world
  // (the median transaction balance), shared among its adults; a household
  // with no worker keeps that of one median earner.
  const earnings =
    placeEarningsOf(county.placeKey, input.seed) ??
    nationalMedianAnnualWage("occupation:customer-service", input.seed) ??
    p("zero");
  for (const home of households) {
    const adultsHere = home.memberIds
      .map((id) => byId.get(id)!)
      .filter((row) => ageInYears(row.birthDate, start) >= p("votingAge"));
    if (!adultsHere.length) continue;
    const pay =
      earnings * Math.max(p("one"), employment.get(home.id)?.length ?? 0);
    const reserve = Math.round(
      medianTransactionBalance(pay, input.seed) * p("minorPerDollar"),
    );
    adultsHere.forEach((row, n) => {
      row.liquidMinor =
        Math.floor(reserve / adultsHere.length) +
        (n < reserve % adultsHere.length ? p("one") : p("zero"));
    });
  }
  // Each sampled household stands for the same number of real ones, so the
  // county's weighted adult citizens come to its eligible count (never below
  // one: a county with fewer eligible voters than one household holds one).
  const weight =
    sampleEligible > 0
      ? Math.max(Math.max(wanted, p("one")) / sampleEligible, p("one"))
      : p("one");
  const kinHouseholds = new Set(kin.map((row) => row.householdId));
  // A record stands for at least one real household. Where the county's
  // eligible voters (less the kin already placed) are fewer than the sample's
  // own, keep the households, in the sample's order, that fit at a weight of
  // one; where none fit, there is no sample.
  const room = Math.max(county.eligible - kinEligible, p("zero"));
  if (sampleEligible > p("zero") && room < sampleEligible) {
    // Stop at the first household that does not fit: the sample's own order.
    const prefix: typeof households = [];
    let running = p("zero");
    for (const home of households) {
      const adultsIn =
        home.memberIds.filter((id) => adultOf(byId.get(id)!)).length * share;
      if (running + adultsIn > room) break;
      running += adultsIn;
      prefix.push(home);
    }
    if (!prefix.length || running <= p("zero")) return null;
    const keepHomes = new Set(prefix.map((home) => home.id));
    households.splice(0, households.length, ...prefix);
    const keepPeople = people.filter((row) => keepHomes.has(row.householdId));
    people.splice(0, people.length, ...keepPeople);
    for (const id of [...employment.keys()])
      if (!keepHomes.has(id)) employment.delete(id);
    return build(room / running);
  }
  return build(weight);

  function build(at: number): CountySample {
    return {
      placeId: countyPlaceId,
      weight: at,
      input: {
        ...input,
        people: [...input.people, ...people],
        households: [
          ...input.households.map((home) =>
            kinHouseholds.has(home.id) ? { ...home, weight: p("one") } : home,
          ),
          ...households.map((home) => ({
            ...home,
            weight: at,
            ...(employment.has(home.id)
              ? { employment: employment.get(home.id)! as never }
              : {}),
          })),
        ],
      },
    };
  }
}

/** The place (jurisdiction id) of the town's county, where the world records one. */
export function countyPlaceOfWorld(world: {
  seed: string;
  placeMetadata?: Readonly<Record<string, unknown>>;
}): string | null {
  return countyOf(world)?.jurisdictionId ?? null;
}
