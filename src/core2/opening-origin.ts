/**
 * Where a person's family comes from (owner's playtest, Nov 8: "I'm Mexican
 * and my son is white"). One origin per household at the opening, drawn from
 * the state's adult population by race and Hispanic origin (Census CPS, Nov
 * 2024 voting supplement, table 4b), kept on the person's `looks.origin`;
 * everyone in a household shares it, and kin inherit a resident relative's.
 * A child born in play takes a parent's (`childOrigin`). The faces read it
 * (`bench/whole-figures.ts`), so a family looks related. Nothing else reads
 * it: names decide nothing (Sept 26), and no outcome depends on it.
 */
import { SeededRng } from "./kernel/rng";
import { coreStateName } from "./place-lookup";
import { placeStateKey } from "./place-map";
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

/**
 * A state's adults by origin as shares summing to one: the four groups the
 * survey names (overlaps such as Black Hispanic adults are counted in both,
 * so the four are read as shares of their sum), and the nation's where the
 * state or territory has no row. Estimated: the survey's groups are coarse.
 */
// stopgapId: SG-LIVES-origin-state-shares
export function originShares(
  stateKey: string,
): readonly (readonly [Origin, number])[] {
  const name = coreStateName(stateKey.slice(3));
  const table = SHARES();
  const held =
    (name ? table.get(name.toUpperCase()) : undefined) ??
    table.get("UNITED STATES");
  if (!held) return [["other", 1]];
  const total = [...held.values()].reduce((n, v) => n + v, 0);
  return ORIGINS.filter((o) => o !== "other").map(
    (o) => [o, (held.get(o) ?? 0) / total] as const,
  );
}

/** The origin at a quantile of a state's shares. */
export function originAt(stateKey: string, u: number): Origin {
  let point = u;
  const shares = originShares(stateKey);
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
  const stateKey = placeStateKey(input.placeMetadata?.placeKey ?? "") ?? "";
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
    const origin = originAt(stateKey, root.fork(homeId).next());
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
