/**
 * Where a person's family comes from (owner's playtest, Nov 8: "I'm Mexican
 * and my son is white"). One origin per household at the opening, drawn from
 * the town's own residents by race and Hispanic origin (2020 Census place
 * counts, `place-race-origin.generated.ts`) where the town has a row, else
 * the state's adults (Census CPS, Nov 2024 voting supplement, table 4b),
 * kept on the person's `looks.origin`;
 * everyone in a household shares it, and kin inherit a resident relative's.
 * A child born in play takes a parent's (`childOrigin`). The faces read it
 * (`bench/whole-figures.ts`), so a family looks related. Nothing else reads
 * it: names decide nothing (Sept 26), and no outcome depends on it.
 */
import { SeededRng } from "./kernel/rng";
import { corePlaceByKey, coreStateName } from "./place-lookup";
import { placeStateKey } from "./place-map";
import { PLACE_RACE_ORIGIN_ROWS } from "./place-race-origin.generated";
import { lazyValue, readJsonData } from "./reference/lazy-data";
import type { CoreInput, PersonInput } from "./types";

export const ORIGINS = [
  "white",
  "hispanic",
  "black",
  "asian",
  "other",
] as const;
export type Origin = (typeof ORIGINS)[number];

const CPS_GROUP: Readonly<Record<string, Exclude<Origin, "other">>> = {
  "White non-Hispanic alone": "white",
  "Hispanic (any race)": "hispanic",
  "Black alone": "black",
  "Asian alone": "asian",
};

const SHARES = lazyValue(() => {
  const rows = readJsonData(
    new URL(
      "../../data/source/census-voting-registration/corpus.json",
      import.meta.url,
    ),
  ) as readonly {
    dimension: string;
    geographyName: string;
    group: string;
    metrics: Record<string, { value?: { value?: number } }>;
  }[];
  const byGeography = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (row.dimension !== "race-and-hispanic-origin") continue;
    const group = CPS_GROUP[row.group];
    const adults = row.metrics.adultPopulation?.value?.value;
    if (!group || adults === undefined) continue;
    const held = byGeography.get(row.geographyName) ?? new Map();
    held.set(group, adults);
    byGeography.set(row.geographyName, held);
  }
  return byGeography;
});

const PLACE_COUNTS = lazyValue(() => {
  const map = new Map<string, readonly number[]>();
  for (const row of PLACE_RACE_ORIGIN_ROWS.split(";")) {
    if (!row) continue;
    const colon = row.indexOf(":");
    map.set(
      row.slice(0, colon),
      row
        .slice(colon + 1)
        .split(",")
        .map(Number),
    );
  }
  return map;
});

/** Which record a set of shares came from, so a fallback never reads as the town's own. */
export type OriginBasis = "place" | "state" | "national";

/** The order the generated place rows list their groups in. */
const PLACE_ROW_ORDER: readonly Origin[] = [
  "white",
  "hispanic",
  "black",
  "asian",
  "other",
];

/**
 * The town's own residents by origin as shares summing to one, when the
 * place has a row (2020 Census counts of everyone who lives there).
 */
function placeShares(
  placeKey: string | null | undefined,
): readonly (readonly [Origin, number])[] | null {
  const geoid = placeKey ? corePlaceByKey(placeKey)?.sourceGeoid : undefined;
  const counts = geoid ? PLACE_COUNTS().get(geoid) : undefined;
  if (!counts) return null;
  const total = counts.reduce((n, v) => n + v, 0);
  if (total <= 0) return null;
  return ORIGINS.map(
    (o) => [o, counts[PLACE_ROW_ORDER.indexOf(o)]! / total] as const,
  );
}

/**
 * A place's origin shares summing to one: the town's own counts where it has
 * a row, else its state's adults (the four groups the survey names; overlaps
 * such as Black Hispanic adults are counted in both, so the four are read as
 * shares of their sum), else the nation's. Estimated: the town's counts are
 * the 2020 Census's, the state's survey groups are coarse.
 */
export function originSharesWithBasis(
  stateKey: string,
  placeKey?: string | null,
): { shares: readonly (readonly [Origin, number])[]; basis: OriginBasis } {
  const own = placeShares(placeKey);
  if (own) return { shares: own, basis: "place" };
  const name = coreStateName(stateKey.slice(3));
  const table = SHARES();
  const state = name ? table.get(name.toUpperCase()) : undefined;
  const held = state ?? table.get("UNITED STATES");
  if (!held) return { shares: [["other", 1]], basis: "national" };
  const total = [...held.values()].reduce((n, v) => n + v, 0);
  return {
    shares: ORIGINS.filter((o) => o !== "other").map(
      (o) => [o, (held.get(o) ?? 0) / total] as const,
    ),
    basis: state ? "state" : "national",
  };
}

// stopgapId: SG-LIVES-origin-state-shares
export function originShares(
  stateKey: string,
  placeKey?: string | null,
): readonly (readonly [Origin, number])[] {
  return originSharesWithBasis(stateKey, placeKey).shares;
}

/** The origin at a quantile of a place's shares. */
export function originAt(
  stateKey: string,
  u: number,
  placeKey?: string | null,
): Origin {
  let point = u;
  const shares = originShares(stateKey, placeKey);
  for (const [origin, share] of shares) {
    point -= share;
    if (point < 0) return origin;
  }
  return shares.at(-1)![0];
}

/**
 * Everyone in the opening gets an origin: a household shares one, drawn by
 * its id; a person outside the town's households (kin) takes a living
 * relative's, the nearest by id order.
 */
export function withOrigins(input: CoreInput): CoreInput {
  const placeKey = input.placeMetadata?.placeKey ?? "";
  const stateKey = placeStateKey(placeKey) ?? "";
  const root = new SeededRng(input.seed).fork("opening-origin");
  const householdOrigin = new Map<string, Origin>();
  const homeOf = new Map(
    input.households.flatMap((home) =>
      home.memberIds.map((id) => [id, home.id] as const),
    ),
  );
  const byId = new Map(input.people.map((row) => [row.id, row]));
  const own = (person: PersonInput): Origin | undefined => {
    if (person.looks?.origin) return person.looks.origin as Origin;
    return undefined;
  };
  // Pass 1: households of people with no kin link to another household take their own draw.
  const originOf = (person: PersonInput): Origin => {
    const given = own(person);
    if (given) return given;
    const homeId = homeOf.get(person.id) ?? person.householdId;
    const held = householdOrigin.get(homeId);
    if (held) return held;
    const origin = originAt(stateKey, root.fork(homeId).next(), placeKey);
    householdOrigin.set(homeId, origin);
    return origin;
  };
  // Residents (the opening's own households) first, in id order.
  const kinTier = new Set(
    input.people.filter((p) => p.tier === "husk").map((p) => p.id),
  );
  const resolved = new Map<string, Origin>();
  for (const person of [...input.people].sort((a, b) =>
    a.id.localeCompare(b.id),
  ))
    if (!kinTier.has(person.id)) resolved.set(person.id, originOf(person));
  // Kin: the nearest resident relative's, else their own household's draw.
  for (const person of [...input.people].sort((a, b) =>
    a.id.localeCompare(b.id),
  ))
    if (kinTier.has(person.id)) {
      const relative = [...person.familyIds]
        .sort()
        .find((id) => resolved.has(id) && byId.has(id));
      resolved.set(
        person.id,
        relative ? resolved.get(relative)! : originOf(person),
      );
    }
  return {
    ...input,
    people: input.people.map((person) => ({
      ...person,
      looks: { ...(person.looks ?? {}), origin: resolved.get(person.id)! },
    })),
  };
}

/** A child's origin: one of the parents', by the child's own id (generation of who exists). */
export function childOrigin(
  parents: readonly (string | undefined)[],
  childId: string,
  seed: string,
): Origin | undefined {
  const known = parents.filter((o): o is string => !!o).sort();
  if (!known.length) return undefined;
  const pick = new SeededRng(seed)
    .fork(`origin:${childId}`)
    .integer(0, known.length);
  return known[pick] as Origin;
}
