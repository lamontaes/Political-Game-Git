/**
 * Where a person was born, as far as the Constitution cares: a native-born
 * adult (born in the United States or an island area, or abroad to a citizen
 * parent, as the American Community Survey counts it) can be a natural-born
 * citizen, and a foreign-born one cannot (U.S. Const. art. II, sec. 1, cl. 5).
 *
 * Who exists is drawn from the world's seed: an official's nativity is a seeded
 * draw against their state's native-born share of adults (ACS 2020-2024 5-year,
 * table B05003, `data/state-nativity-2024.json`), kept as the past fact
 * `identity:nativity`. The draw is the same every time for the same person. It
 * decides nothing about what anyone does; the succession module reads the fact
 * to pass over someone it disqualifies. The sitting president and vice
 * president were qualified to stand, so they are native by the law.
 */
import nativityData from "./data/state-nativity-2024.json" with { type: "json" };
import { SeededRng } from "./kernel/rng";
import type { IsoDate, PersonInput, Source } from "./types";

export const NATIVITY_FACT = "identity:nativity";

const DATA = nativityData as unknown as {
  citation: string;
  nationalFiftyStatesAndDc: [number, number];
  byUsps: Record<string, [number, number]>;
};

/** A state's native-born share of adults; the national share where the survey has no row. */
export function nativeShareOf(usps: string | null): {
  readonly share: number;
  readonly national: boolean;
} {
  const row = usps ? DATA.byUsps[usps] : undefined;
  const [native, adults] = row ?? DATA.nationalFiftyStatesAndDc;
  return { share: native / adults, national: !row };
}

/** The state a place id names ("US-KY"), if it names one. */
export function stateOfPlaceId(placeId: string): string | null {
  return /^US-[A-Z]{2}$/.test(placeId) ? placeId.slice(3) : null;
}

export interface NativityFact {
  readonly nativity: "native" | "foreign-born";
  /** The date they began living in the United States: their birth, for the native-born. */
  readonly residentSince?: string;
}

/**
 * The past fact for a person's nativity, drawn from the world's seed against
 * their state's share. `qualified` is true for someone the law already
 * required to be natural-born (a president or vice president).
 */
export function nativityFact(input: {
  readonly seed: string;
  readonly personId: string;
  readonly placeId: string;
  readonly birthDate: string;
  readonly date: IsoDate;
  readonly qualified: boolean;
  readonly source: Source;
}): NonNullable<PersonInput["pastFacts"]>[number] {
  const { share, national } = nativeShareOf(stateOfPlaceId(input.placeId));
  // Seeded generation of who exists, never a choice anyone makes.
  const native =
    input.qualified ||
    new SeededRng(input.seed).fork(`nativity:${input.personId}`).next() < share;
  return {
    id: `${input.personId}:nativity`,
    date: input.date,
    kind: NATIVITY_FACT,
    summary: native
      ? "Born a citizen: native-born."
      : "Born abroad: foreign-born.",
    source: {
      tag: "ESTIMATED",
      citation: `${DATA.citation} Share used: ${share.toFixed(4)}${national ? " (national, no state row)" : ""}.`,
      asOf: input.source.asOf,
      estimatedFrom: "the state's native-born share of adults",
    },
    facts: native
      ? { nativity: "native", residentSince: input.birthDate }
      : { nativity: "foreign-born" },
  };
}
