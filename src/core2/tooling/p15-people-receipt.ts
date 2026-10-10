/**
 * P15 people receipt: builds one opening population and reports its
 * households, kin and temperament against the named answer keys. Measurement
 * only: it builds the opening input and never runs a world day.
 *
 *   npx tsx src/core2/tooling/p15-people-receipt.ts --seed <seed> \
 *     [--place <placeKey>] [--minimum <people>] [--out <file>]
 */
import { writeFileSync } from "node:fs";
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import {
  HOUSEHOLD_SHAPE_ORDER,
  householdMixForJurisdiction,
  type HouseholdShape,
} from "../../simulation/household-mix";
import { PEOPLE_MIND_VERSION } from "../../simulation/people-trait-definitions";
import { OPENING_KIN } from "../opening-kin";
import { OPENING_PARTNERSHIP, partnershipGeo } from "../opening-partnership";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { buildPopulation } from "../population";
import type { EntityId } from "../../simulation/types";
import type { CoreInput, PersonInput } from "../types";
import keys from "./p15-people-answer-keys.json" with { type: "json" };

const ADULT_AGE = 18;
const BANDS = [
  ["0-17", 0, 18],
  ["18-34", 18, 35],
  ["35-54", 35, 55],
  ["55-74", 55, 75],
  ["75+", 75, Infinity],
] as const;

const round = (value: number, places = 1) => Number(value.toFixed(places));
const percent = (part: number, whole: number) =>
  whole ? round((part / whole) * 100) : null;

/** How many relatives of each kind a person's recorded family facts name. */
function relationCounts(person: PersonInput): Map<string, number> {
  const out = new Map<string, number>();
  for (const fact of person.pastFacts ?? []) {
    if (!fact.kind.startsWith("family:")) continue;
    const relation = fact.kind.slice("family:".length);
    out.set(relation, (out.get(relation) ?? 0) + 1);
  }
  return out;
}

export function peopleReceipt(input: CoreInput, buildSeconds: number) {
  const start = makeIsoDate(input.startedAt);
  const age = (person: PersonInput) =>
    ageOnDate(makeIsoDate(person.birthDate), start);
  const residents = input.people.filter(
    (person) => person.tier !== OPENING_KIN.kinTier,
  );
  const kin = input.people.filter(
    (person) => person.tier === OPENING_KIN.kinTier,
  );
  const byId = new Map(input.people.map((person) => [person.id, person]));
  const town = residents[0]!.placeId;

  // Household composition against the place's ACS mix.
  const partners = new Set(
    (input.familyLinks ?? [])
      .filter((link) => link.kind === "partner")
      .flatMap((link) => link.personIds),
  );
  const residentHouseholds = input.households.filter((household) =>
    household.memberIds.every(
      (id) => byId.get(id)?.tier !== OPENING_KIN.kinTier,
    ),
  );
  const shapes = new Map<HouseholdShape, number>();
  for (const household of residentHouseholds) {
    const members = household.memberIds.map((id) => byId.get(id)!);
    const minors = members.filter((person) => age(person) < ADULT_AGE).length;
    const couple = members.some((person) => partners.has(person.id));
    const shape: HouseholdShape =
      members.length === 1
        ? "alone"
        : minors && couple
          ? "couple-with-children"
          : minors
            ? "parent-with-children"
            : couple && members.length === 2
              ? "couple"
              : couple
                ? "couple-with-children"
                : "housemates";
    shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
  }
  const mix = householdMixForJurisdiction(town as EntityId);
  const householdShape = {
    citation: keys.householdShape.citation,
    basis: mix.basis,
    households: residentHouseholds.length,
    personsPerHousehold: round(residents.length / residentHouseholds.length, 2),
    rows: HOUSEHOLD_SHAPE_ORDER.map((shape) => ({
      shape,
      acsPercent: round(
        (mix.shares.find(([name]) => name === shape)?.[1] ?? 0) * 100,
      ),
      gamePercent: percent(shapes.get(shape) ?? 0, residentHouseholds.length),
    })),
  };

  // Adult age structure against the place's ACS sex by age (B01001).
  const geo = partnershipGeo(
    lifePlaceByJurisdictionId(town as EntityId)?.sourceGeoid,
  );
  const acsAdults = (low: number, high: number) =>
    OPENING_PARTNERSHIP.populationBands.reduce((sum, band, i) => {
      const start = Number(band.split(/[-+]/)[0]);
      return start >= low && start < high
        ? sum + geo.rows.population.female[i]! + geo.rows.population.male[i]!
        : sum;
    }, 0);
  const adultsAll = residents.filter((person) => age(person) >= ADULT_AGE);
  const acsTotal = acsAdults(ADULT_AGE, Infinity);
  const ageStructure = {
    citation: OPENING_PARTNERSHIP.citation,
    acsGeography: geo.key,
    rows: BANDS.filter(([band]) => band !== "0-17").map(
      ([band, low, high]) => ({
        band,
        acsPercentOfAdults: percent(acsAdults(low, high), acsTotal),
        gamePercentOfAdults: percent(
          adultsAll.filter((person) => age(person) >= low && age(person) < high)
            .length,
          adultsAll.length,
        ),
      }),
    ),
  };

  // Kin by age band, and kinlessness against HRS.
  const bands = BANDS.map(([band, low, high]) => {
    const people = residents.filter(
      (person) => age(person) >= low && age(person) < high,
    );
    const tally = (gender?: string) => {
      const rows = people.filter(
        (person) => !gender || person.looks?.gender === gender,
      );
      let noParent = 0,
        noSibling = 0,
        noChild = 0,
        noPartner = 0,
        anyFamily = 0,
        parents = 0,
        siblings = 0,
        children = 0,
        grandchildren = 0,
        family = 0;
      for (const person of rows) {
        const r = relationCounts(person);
        const count = (relation: string) => r.get(relation) ?? 0;
        if (!count("parent")) noParent += 1;
        if (!count("sibling")) noSibling += 1;
        if (!count("child")) noChild += 1;
        if (!count("partner")) noPartner += 1;
        if (person.familyIds.length) anyFamily += 1;
        parents += count("parent");
        siblings += count("sibling");
        children += count("child");
        grandchildren += count("grandchild");
        family += person.familyIds.length;
      }
      const n = rows.length;
      return {
        people: n,
        anyFamilyPercent: percent(anyFamily, n),
        noParentPercent: percent(noParent, n),
        noSiblingPercent: percent(noSibling, n),
        noChildPercent: percent(noChild, n),
        noPartnerPercent: percent(noPartner, n),
        perPerson: n
          ? {
              parents: round(parents / n, 2),
              siblings: round(siblings / n, 2),
              children: round(children / n, 2),
              grandchildren: round(grandchildren / n, 2),
              familyLinks: round(family / n, 2),
            }
          : null,
      };
    };
    const key = keys.kinlessness.bands.find((row) => row.band === band);
    return {
      band,
      all: tally(),
      ...(key
        ? {
            male: { game: tally("male"), hrs: key.male },
            female: { game: tally("female"), hrs: key.female },
          }
        : {}),
    };
  });

  // Where the nearest parent or adult child lives, against PSID.
  const parentsAndChildren = new Map<string, string[]>();
  for (const link of input.familyLinks ?? []) {
    if (link.kind !== "parent-child") continue;
    const [parent, child] = link.personIds;
    parentsAndChildren.set(parent, [
      ...(parentsAndChildren.get(parent) ?? []),
      child,
    ]);
    parentsAndChildren.set(child, [
      ...(parentsAndChildren.get(child) ?? []),
      parent,
    ]);
  }
  let eligible = 0,
    nearest = 0,
    all = 0;
  for (const person of residents) {
    if (age(person) < ADULT_AGE) continue;
    const elsewhere = (parentsAndChildren.get(person.id) ?? [])
      .map((id) => byId.get(id))
      .filter(
        (other): other is PersonInput =>
          other !== undefined &&
          age(other) >= ADULT_AGE &&
          other.householdId !== person.householdId,
      );
    if (!elsewhere.length) continue;
    eligible += 1;
    const near = elsewhere.filter(
      (other) => other.placeId === town || other.countyId !== undefined,
    ).length;
    if (near) nearest += 1;
    if (near === elsewhere.length) all += 1;
  }
  const nearKin = {
    citation: keys.nearKin.citation,
    proxy: keys.nearKin.proxy,
    adultsWithParentOrAdultChildElsewhere: eligible,
    nearestNearPercent: percent(nearest, eligible),
    allNearPercent: percent(all, eligible),
    psidNearestWithin30Miles: keys.nearKin.nearestWithin30Miles,
    psidAllWithin30Miles: keys.nearKin.allWithin30Miles,
  };

  // Temperament spread.
  const profileCount = (rows: PersonInput[], core: boolean) => {
    const counts = new Map<string, number>();
    for (const person of rows) {
      const profile = JSON.stringify(
        Object.entries(person.traits)
          .filter(
            ([name]) => !core || name.startsWith(`${PEOPLE_MIND_VERSION}:`),
          )
          .sort(([a], [b]) => a.localeCompare(b)),
      );
      counts.set(profile, (counts.get(profile) ?? 0) + 1);
    }
    const largest = Math.max(...counts.values());
    return {
      distinct: counts.size,
      largest,
      largestPercent: percent(largest, rows.length),
    };
  };
  const levels: Record<string, Record<string, number | null>> = {};
  for (const row of OPENING_KIN.personality.dimensions) {
    const name = `${PEOPLE_MIND_VERSION}:${row.trait}`;
    levels[row.trait] = Object.fromEntries(
      OPENING_KIN.personality.levels.values.map((level) => [
        String(level),
        percent(
          residents.filter((person) => person.traits[name] === level).length,
          residents.length,
        ),
      ]),
    );
  }

  return {
    version: keys.version,
    seed: input.seed,
    place: input.placeMetadata?.placeName ?? town,
    placeId: town,
    startedAt: input.startedAt,
    buildSeconds: round(buildSeconds),
    residents: residents.length,
    relatives: kin.length,
    relativesInCounty: kin.filter((person) => person.countyId !== undefined)
      .length,
    householdShape,
    ageStructure,
    kinByAge: { citation: keys.kinlessness.citation, bands },
    nearKin,
    temperament: {
      coreProfiles: profileCount(residents, true),
      fullProfiles: profileCount(residents, false),
      levelPercent: levels,
    },
  };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1]?.endsWith("p15-people-receipt.ts")) {
  const seed = argument("seed");
  if (!seed) throw new Error("--seed is required.");
  const placeKey = argument("place");
  const minimum = argument("minimum");
  const began = performance.now();
  const input = buildPopulation({
    seed,
    startedAt: "2021-01-01",
    ...(placeKey ? { placeKey } : {}),
    ...(minimum ? { minimumPeople: Number(minimum) } : {}),
  });
  const receipt = peopleReceipt(input, (performance.now() - began) / 1000);
  const text = `${JSON.stringify(receipt, null, 2)}\n`;
  const out = argument("out");
  if (out) writeFileSync(out, text);
  else process.stdout.write(text);
}
