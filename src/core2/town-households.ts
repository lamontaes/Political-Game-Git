/**
 * The town's households before anyone in them is written out: each one's shape
 * from the town's Census household mix, and its members' ages from the
 * invented-person age table. Drawn from the world's seed, so the same
 * household comes back every time. Ported from the old engine's town residents.
 */
import {
  inventedPersonAge,
  inventedPersonBirthDate,
  type InventedPersonRole,
} from "./gov-rules/invented-person-age";
import { birthCohortGivenName } from "./gov-rules/given-name-cohorts";
import { DEFAULT_CORPUS_VERSION } from "./gov-rules/names-data";
import {
  defaultPronounsForGender,
  generatePersonIdentity,
  type PersonIdentity,
} from "./gov-rules/person-identity";
import { drawCanonicalNamedIdentity } from "./person-names";
import {
  householdMixForJurisdiction,
  type HouseholdShape,
} from "./household-mix";
import type { EntityId, IsoDate } from "./kernel/brands";
import { SeededRng } from "./kernel/rng";

export const TOWN_RESIDENTS_VERSION = "town-residents-v1";

/** What household naming reads of a world: its seed and the day it began. */
export interface TownWorld {
  readonly seed: string;
  readonly startedAt: IsoDate | string;
}

/** A resident as the town writes them out: a name, an identity, a birthday and a home. */
export interface TownPersonInput {
  readonly stableKey: string;
  readonly givenName: string;
  readonly familyName: string;
  readonly birthDate: IsoDate;
  readonly homeJurisdictionId: EntityId;
  /** Gender and pronouns for somebody the world is inventing. */
  readonly identity: PersonIdentity;
}

export interface SkeletonMember {
  readonly age: number;
  readonly role: "adult" | "child";
}

/** One household of the town, before anyone in it is written out. */
export interface TownHouseholdSkeleton {
  readonly index: number;
  readonly shape: HouseholdShape;
  /** Ages on the day the world began, adults first. */
  readonly members: readonly SkeletonMember[];
}

export function townHouseholdKey(town: EntityId, index: number): string {
  return `${TOWN_RESIDENTS_VERSION}:${town}:household:${index}`;
}

/** The stable key of member `member` of household `index`. */
export function townResidentKey(
  town: EntityId,
  index: number,
  member: number,
): string {
  return `${townHouseholdKey(town, index)}:person:${member}`;
}

export function townHouseholdRng(seed: string, town: EntityId, index: number) {
  return new SeededRng(seed).fork(townHouseholdKey(town, index));
}

function pickShape(rng: SeededRng, town: EntityId): HouseholdShape {
  const { shares } = householdMixForJurisdiction(town);
  let point = rng.next();
  for (const [shape, share] of shares) {
    point -= share;
    if (point < 0) return shape;
  }
  return shares.at(-1)![0];
}

/**
 * Household `index` of the town: its shape and its members' ages. Cheap.
 * `shape` sets the household's shape instead of drawing it from the town's
 * mix (the opening's household for the player's cohort, core2/population.ts).
 */
export function townHouseholdSkeleton(
  seed: string,
  town: EntityId,
  index: number,
  shape?: HouseholdShape,
): TownHouseholdSkeleton {
  const rng = townHouseholdRng(seed, town, index);
  shape ??= pickShape(rng.fork("shape"), town);
  const members: SkeletonMember[] = [];
  const push = (age: number) => {
    members.push({ age, role: "adult" });
    return age;
  };
  const adult = (n: number, role: InventedPersonRole) =>
    push(inventedPersonAge(rng.fork(`age:${n}`), role));
  if (shape === "alone") adult(0, "household-adult-alone");
  else if (shape === "housemates") {
    adult(0, "household-housemate");
    adult(1, "household-housemate");
  } else {
    const head = adult(
      0,
      shape === "couple" ? "household-couple-head" : "household-single-parent",
    );
    // A partner is within six years of the first adult, and no younger
    // than a housemate can be.
    if (shape !== "parent-with-children")
      push(
        rng
          .fork("age:1")
          .integer(Math.max(19, head - 6), Math.min(90, head + 6) + 1),
      );
    if (shape === "couple-with-children" || shape === "parent-with-children") {
      const children = rng.fork("children").integer(1, 4);
      const youngest = Math.max(0, head - 45);
      for (let c = 0; c < children; c += 1)
        members.push({
          age: rng
            .fork(`child-age:${c}`)
            .integer(youngest, Math.min(17, head - 20) + 1),
          role: "child",
        });
    }
  }
  return { index, shape, members };
}

/**
 * CALIBRATION, not a sourced figure: the share of the town's couples who are
 * two women or two men. Claude CTO ruled on September 27, 2026 that the
 * opening pairs couples by the real share of mixed-sex and same-sex
 * households, one rule for every state. About 1.5 percent is inferred from
 * the Census Bureau's American Community Survey same-sex couple tables (about
 * 1.3 million of roughly 65 million couple households), not read from a file
 * in the repository.
 */
export const SAME_SEX_COUPLE_SHARE = 0.015;

/**
 * The second partner's identity in a couple. Before this, each partner's
 * gender was drawn on its own, so about half of the town's couples were two
 * women or two men. A partner who is nonbinary, or partnered with somebody
 * nonbinary, keeps the identity they drew.
 */
function partnerIdentity(
  first: PersonIdentity,
  drawn: PersonIdentity,
  rng: SeededRng,
): PersonIdentity {
  const binary = (gender: string) => gender === "female" || gender === "male";
  if (!binary(first.gender) || !binary(drawn.gender)) return drawn;
  const sameSex = rng.next() < SAME_SEX_COUPLE_SHARE;
  const gender = sameSex === (first.gender === "female") ? "female" : "male";
  return gender === drawn.gender
    ? drawn
    : { gender, pronouns: defaultPronounsForGender(gender) };
}

/** Who household `index` would be written out as: names and birthdays. Pure. */
export function townHouseholdPeople(
  world: TownWorld,
  town: EntityId,
  index: number,
  shape?: HouseholdShape,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
): readonly TownPersonInput[] {
  return namedMembers(
    world,
    town,
    townHouseholdSkeleton(world.seed, town, index, shape),
    corpusVersion,
  );
}

/**
 * The names a household's members are written out with. `corpusVersion` is
 * the name corpus the world uses; a world begun under the place-name version
 * says so on its creation record, and the opening's world does not, so it
 * keeps the national corpus.
 */
export function namedMembers(
  world: TownWorld,
  town: EntityId,
  skeleton: TownHouseholdSkeleton,
  corpusVersion: string = DEFAULT_CORPUS_VERSION,
): readonly TownPersonInput[] {
  const rng = townHouseholdRng(world.seed, town, skeleton.index);
  let familyName: string | null = null;
  const couple =
    skeleton.shape === "couple" || skeleton.shape === "couple-with-children";
  let firstPartner: PersonIdentity | null = null;
  return skeleton.members.map((member, n) => {
    const personRng = rng.fork(`person:${n}`);
    const stableKey = townResidentKey(town, skeleton.index, n);
    let identity = generatePersonIdentity(personRng.fork("identity"));
    if (couple && n === 0) firstPartner = identity;
    if (couple && n === 1 && firstPartner)
      identity = partnerIdentity(firstPartner, identity, rng.fork("couple"));
    const named = drawCanonicalNamedIdentity(personRng.fork("name"), identity, {
      corpusVersion,
    });
    // Skeleton ages are ages on the day the world began, so a household
    // written years into a save has the same birthdays as one written on day
    // one (`materializeTownHousehold`).
    const birthDate = inventedPersonBirthDate(personRng.fork("birth"), {
      role: "household-member",
      referenceDate: world.startedAt as IsoDate,
      age: member.age,
      placement: "drawn-exact",
    });
    // Housemates keep their own names; a family shares the first adult's.
    const surname =
      skeleton.shape === "housemates" || familyName === null
        ? named.familyName
        : familyName;
    if (familyName === null) familyName = surname;
    return {
      stableKey,
      // The birth-year cohorts are national; a place with its own names keeps
      // the name it drew.
      givenName:
        corpusVersion === DEFAULT_CORPUS_VERSION
          ? birthCohortGivenName(world.seed, stableKey, {
              givenName: named.givenName,
              familyName: surname,
              birthDate,
              gender: named.identity.gender,
            })
          : named.givenName,
      familyName: surname,
      identity: named.identity,
      birthDate,
      homeJurisdictionId: town,
    };
  });
}
