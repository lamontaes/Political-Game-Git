/**
 * The town's households before anyone in them is written out: each one's shape
 * from the town's Census household mix, and its members' ages from the
 * invented-person age table. Drawn from the world's seed, so the same
 * household comes back every time. Ported from the old engine's town residents.
 */
import {
  inventedPersonAge,
  type InventedPersonRole,
} from "./gov-rules/invented-person-age";
import {
  householdMixForJurisdiction,
  type HouseholdShape,
} from "./household-mix";
import type { EntityId } from "./kernel/brands";
import { SeededRng } from "./kernel/rng";

export const TOWN_RESIDENTS_VERSION = "town-residents-v1";

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
