/**
 * Where a person was born: one fact, written once, that every reader of where
 * someone is from takes (the card, a conversation, the Journal, an obituary).
 *
 * A grown resident's birthplace is seeded generation of who exists: their
 * own fixed draw against their state's American Community Survey shares of
 * where its people were born (2019-2023 5-year, table B05002: born in the
 * state they live in, in another state, in Puerto Rico, in the island areas,
 * abroad to American parents, or foreign-born), held to what their record
 * already says. A noncitizen (citizenship.ts) was born abroad; a citizen is
 * drawn among the rest, with the foreign-born share less the noncitizens' (the
 * naturalized). Born in the state, they were born where their family of
 * origin lived (opening-kin.ts: the town when they grew up in its county,
 * else the state their parents live in); born elsewhere in the country, in a
 * state drawn by its people's share of the nation (the same table's totals)
 * or, for the island areas, by the towns this world holds there. A child is
 * born where their parent lived that day (src/core2/past-moves.ts
 * `residenceOn`), written once the moves before the start are run.
 *
 * The draw decides nothing anyone does; it says who exists.
 */
import bornTable from "../../data/research/core/acs-2023-b05002-born-in-state.json" with { type: "json" };
import { isNoncitizen } from "./citizenship";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { citizenShareOf } from "./modules/voting";
import { coreStateJurisdiction, corePlaceByKey } from "./place-lookup";
import { placeLocalities } from "./places";
import { seededUnit } from "./seeded";
import type { Source } from "./types";

/** The past fact a person's birthplace is kept as (`facts.placeId`). */
export const BIRTHPLACE_FACT = "birthplace";
/** The place id of a birthplace outside the United States and its island areas. */
export const BORN_ABROAD = "abroad";

interface Row {
  readonly total?: number;
  readonly bornInOtherState?: number;
  readonly bornInPuertoRico?: number;
  readonly bornInIslandAreas?: number;
  readonly bornAbroadToAmericanParents?: number;
  readonly foreignBorn?: number;
  readonly bornWhereTheyLiveShare: number;
}

const TABLE = bornTable as unknown as {
  readonly vintage: string;
  readonly table: string;
  readonly sourceUrl: string;
  readonly places: Readonly<Record<string, Row>>;
};
const NATION = TABLE.places.US!;
const PUERTO_RICO = "PR";
const ISLAND_AREAS = ["GU", "VI", "AS", "MP"] as const;

/** Where a person was born, as the draw says it. */
export type BirthOrigin =
  | { readonly where: "here" }
  | { readonly where: "state"; readonly stateKey: string }
  | { readonly where: "abroad"; readonly foreignBorn: boolean };

/** A row's shares in a fixed order: here, another state, Puerto Rico, the island areas, abroad to American parents, foreign-born. */
function sharesOf(usps: string): readonly number[] {
  const row = TABLE.places[usps];
  const here = row?.bornWhereTheyLiveShare ?? NATION.bornWhereTheyLiveShare;
  // The island areas have no survey row: the nation's split of the rest.
  const split = row?.total ? row : NATION;
  const rest = [
    split.bornInOtherState!,
    usps === PUERTO_RICO ? 0 : split.bornInPuertoRico!,
    split.bornInIslandAreas!,
    split.bornAbroadToAmericanParents!,
    split.foreignBorn!,
  ];
  const restTotal = rest.reduce((sum, value) => sum + value, 0);
  return [here, ...rest.map((value) => ((1 - here) * value) / restTotal)];
}

/** One of the weighted rows by a unit draw. */
function pick<T>(rows: readonly (readonly [T, number])[], unit: number): T {
  const total = rows.reduce((sum, [, weight]) => sum + weight, 0);
  let at = unit * total;
  for (const [row, weight] of rows) {
    if (weight > 0 && at < weight) return row;
    at -= weight;
  }
  return rows.filter(([, weight]) => weight > 0).at(-1)![0];
}

/** The state another-state births come from: each state by its people (B05002 totals), never their own. */
function otherState(usps: string, unit: number): string {
  return pick(
    Object.entries(TABLE.places)
      .filter(
        ([key, row]) =>
          key !== "US" && key !== PUERTO_RICO && key !== usps && row.total,
      )
      .map(([key, row]) => [key, row.total!] as const),
    unit,
  );
}

/** The island area births come from: each by the people of the towns this world holds there. */
function islandArea(usps: string, seed: string, unit: number): string {
  return pick(
    ISLAND_AREAS.filter((key) => key !== usps).map((key) => {
      const people = placeLocalities(`US-${key}`).reduce((sum, row) => {
        const geoid = corePlaceByKey(row.key)?.sourceGeoid;
        return (
          sum + ((geoid && placeReferencePopulation(geoid, seed)?.value) || 0)
        );
      }, 0);
      return [key, people] as const;
    }),
    unit,
  );
}

/**
 * Where a grown resident was born, from their state's shares, held to their
 * citizenship: a noncitizen was born abroad, and a citizen is drawn among the
 * rest with the foreign-born share less the noncitizens'.
 */
export function birthOrigin(input: {
  readonly seed: string;
  readonly personId: string;
  /** The town they live in (`placeMetadata.placeKey`), for its citizen share. */
  readonly placeKey: string | undefined;
  /** Their state's USPS code (`WI`). */
  readonly usps: string;
}): BirthOrigin {
  // The same share and the same person's line the law reads (citizenship.ts).
  const citizenShare = citizenShareOf(input.placeKey, input.usps, input.seed);
  if (isNoncitizen(input.seed, input.personId, citizenShare))
    return { where: "abroad", foreignBorn: true };
  const [here, other, rico, islands, toCitizens, foreign] = sharesOf(
    input.usps,
  ) as [number, number, number, number, number, number];
  const naturalized = Math.max(0, foreign - (1 - citizenShare));
  const unit = seededUnit(input.seed, `birthplace:${input.personId}`);
  const where = pick(
    [
      ["here", here],
      ["other", other],
      ["rico", rico],
      ["islands", islands],
      ["to-citizens", toCitizens],
      ["naturalized", naturalized],
    ] as const,
    unit,
  );
  const state = seededUnit(input.seed, `birthplace-state:${input.personId}`);
  switch (where) {
    case "here":
      return { where: "here" };
    case "other":
      return {
        where: "state",
        stateKey: `US-${otherState(input.usps, state)}`,
      };
    case "rico":
      return { where: "state", stateKey: `US-${PUERTO_RICO}` };
    case "islands":
      return {
        where: "state",
        stateKey: `US-${islandArea(input.usps, input.seed, state)}`,
      };
    case "to-citizens":
      return { where: "abroad", foreignBorn: false };
    case "naturalized":
      return { where: "abroad", foreignBorn: true };
  }
}

/**
 * The share of a town's grown residents born in their own state, by the same
 * shares and citizenship `birthOrigin` draws from: what being born outside
 * the state leaves of the residents who could have grown up nearby
 * (opening-kin.ts reads it so that a birth outside is not counted twice
 * against growing up in the county).
 */
export function bornInStateShare(input: {
  readonly seed: string;
  readonly placeKey: string | undefined;
  readonly usps: string;
}): number {
  const citizenShare = citizenShareOf(input.placeKey, input.usps, input.seed);
  const [here, other, rico, islands, toCitizens, foreign] = sharesOf(
    input.usps,
  ) as [number, number, number, number, number, number];
  const naturalized = Math.max(0, foreign - (1 - citizenShare));
  const total = here + other + rico + islands + toCitizens + naturalized;
  return total > 0 ? (citizenShare * here) / total : 0;
}

/** The place id a birth outside the person's state is kept under: the state's own record, or abroad. */
export function bornOutsideId(origin: BirthOrigin): string | undefined {
  if (origin.where === "here") return undefined;
  if (origin.where === "abroad") return BORN_ABROAD;
  return coreStateJurisdiction(origin.stateKey)?.id ?? undefined;
}

/** A grown resident's birthplace fact's source: the survey and what the draw was held to. */
export function birthplaceSource(asOf: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: asOf as Source["asOf"],
    citation: `U.S. Census Bureau, American Community Survey ${TABLE.vintage}, table ${TABLE.table} (${TABLE.sourceUrl}), data/research/core/acs-2023-b05002-born-in-state.json.`,
    estimatedFrom:
      "The person's own seeded draw against their state's shares of where its people were born, held to their citizenship and to where their family of origin lives (src/core2/person-birthplace.ts).",
  };
}
