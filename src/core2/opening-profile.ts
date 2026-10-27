/**
 * Who someone is at the opening, beyond kin and schooling: their education
 * and their faith (P15, for views and candidacy). Each adult's are read from
 * their state's CES 2024 shares for their age band; a household holds part of
 * each in common (spouses' schooling and faith match more often than chance).
 * Each draw is keyed to the person and their home, never to who else was
 * built, so a person filled in later gets the same profile.
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { corePlaceByJurisdictionId } from "./place-lookup";
import profileJson from "./data/profile/parameters.json" with { type: "json" };
import keysJson from "./data/views/ces-2024-views.json" with { type: "json" };
import { parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, PersonInput } from "./types";

type Shares = Readonly<Record<string, number>>;
const KEYS = keysJson as unknown as {
  ageBands: readonly string[];
  states: Readonly<
    Record<
      string,
      {
        educationShares: Readonly<Record<string, Shares | null>>;
        faithShares: Readonly<Record<string, Shares | null>>;
      }
    >
  >;
  nationalEducationShares: Readonly<Record<string, Shares>>;
  nationalFaithShares: Readonly<Record<string, Shares>>;
  source: { citation: string };
};
const DATA = profileJson as unknown as Readonly<
  Record<string, { value: number }>
> & { version: string; stopgapId: string };

export const PROFILE_FACT_KINDS = {
  education: "profile:education",
  faith: "profile:faith",
} as const;

const p = (key: string) => parameter(key);
const d = (key: string) => (DATA[key] as { value: number }).value;

/** A stable uniform value in (0, 1) for a key. */
function uniform(key: string): number {
  const digits = p("seedHashDigits");
  const radix = p("seedPlaceHashRadix");
  const draw = Number.parseInt(stableHash(key).slice(p("zero"), digits), radix);
  return (draw + p("one") / p("two")) / radix ** digits;
}

/**
 * The household's draw or the person's own: a share of people take their
 * home's value, the rest their own, which keeps every category's share and
 * makes members of one home match at that rate.
 */
function blended(
  seed: string,
  kind: string,
  person: Pick<PersonInput, "id" | "householdId">,
  share: number,
) {
  return uniform(`${seed}:${kind}:which:${person.id}`) < share
    ? uniform(`${seed}:${kind}:home:${person.householdId}`)
    : uniform(`${seed}:${kind}:person:${person.id}`);
}

/** The category whose cumulative share first passes the value. */
function category(shares: Shares, value: number): string {
  const names = Object.keys(shares).sort();
  let cumulative = p("zero");
  for (const name of names) {
    cumulative += shares[name]!;
    if (value < cumulative) return name;
  }
  return names.at(-p("one"))!;
}

function ageBand(age: number): string {
  for (const band of KEYS.ageBands) {
    const [low, high] = band.split("-");
    if (age >= Number(low) && (high === "plus" || age <= Number(high)))
      return band;
  }
  return KEYS.ageBands[p("zero")]!;
}

export interface Profile {
  education: string;
  faith: string;
  /** The state and age band whose shares it was read from. */
  basis: string;
}

/** A person's education and faith, from their record; null for children. */
export function profileFor(
  person: Pick<PersonInput, "id" | "householdId" | "birthDate" | "placeId">,
  seed: string,
  startedAt: string,
): Profile | null {
  stopgap(DATA.stopgapId);
  const age = ageOnDate(person.birthDate, startedAt);
  if (age < d("minimumAdultAge")) return null;
  const place = corePlaceByJurisdictionId(person.placeId as never);
  const key = place?.stateJurisdictionKey;
  const state = key
    ? KEYS.states[key.slice(key.lastIndexOf("-") + p("one"))]
    : undefined;
  const band = ageBand(age);
  const education =
    state?.educationShares[band] ?? KEYS.nationalEducationShares[band]!;
  const faith = state?.faithShares[band] ?? KEYS.nationalFaithShares[band]!;
  return {
    education: category(
      education,
      blended(seed, "education", person, d("educationHouseholdShare")),
    ),
    faith: category(
      faith,
      blended(seed, "faith", person, d("faithHouseholdShare")),
    ),
    basis: `${state ? key : "national"}:${band}`,
  };
}

/** Adds each adult resident's education and faith as facts on their record. */
export function addOpeningProfiles(input: CoreInput): CoreInput {
  const marker = stopgap(DATA.stopgapId);
  const opening = makeIsoDate(input.startedAt);
  return {
    ...input,
    people: input.people.map((person) => {
      if (person.tier === "husk") return person;
      const profile = profileFor(person, input.seed, input.startedAt);
      if (!profile) return person;
      const ids = new Set((person.pastFacts ?? []).map((row) => row.id));
      const source = {
        tag: "ESTIMATED" as const,
        asOf: opening,
        citation: `${KEYS.source.citation} Shares for ${profile.basis}.`,
        estimatedFrom: marker.id,
      };
      type Fact = NonNullable<PersonInput["pastFacts"]>[number];
      const rows: Fact[] = [
        {
          id: `${person.id}:${DATA.version}:education`,
          date: opening,
          kind: PROFILE_FACT_KINDS.education,
          summary: "Education attainment",
          source,
          facts: { level: profile.education },
        },
        {
          id: `${person.id}:${DATA.version}:faith`,
          date: opening,
          kind: PROFILE_FACT_KINDS.faith,
          summary: "Faith",
          source,
          facts: { group: profile.faith },
        },
      ];
      const facts = rows.filter((row) => !ids.has(row.id));
      return facts.length
        ? { ...person, pastFacts: [...(person.pastFacts ?? []), ...facts] }
        : person;
    }),
  };
}
