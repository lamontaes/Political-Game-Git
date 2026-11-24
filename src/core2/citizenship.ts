/**
 * Who is a citizen, as far as a law that treats citizens and noncitizens
 * differently cares. A person's citizenship is seeded generation of who they
 * are, never a choice: a pure function of the world's seed, their own id and
 * their place's share of adult citizens (American Community Survey 2020-2024,
 * table B05003, `data/place-citizenship-2024.json`, blended with the state's
 * Current Population Survey share by `citizenShareOf`). The same person gets
 * the same answer every time and at both tiers, so a counted member who is
 * filled in as a full person keeps the citizenship their group counted them
 * with, and a group's noncitizen count is the sum over its members.
 */
import { SeededRng } from "./kernel/rng";

/** True when the person is a noncitizen, given the share of their place's adults who are citizens. */
export function isNoncitizen(
  seed: string,
  personId: string,
  citizenShare: number,
): boolean {
  return (
    new SeededRng(seed).fork(`citizenship:${personId}`).next() >= citizenShare
  );
}

/**
 * True when a noncitizen holds no work authorization, given the share of
 * noncitizens who are unauthorized. Seeded generation of who they are, like
 * citizenship: the same person gets the same answer at both tiers, and a
 * citizen is never unauthorized.
 */
export function isUnauthorized(
  seed: string,
  personId: string,
  citizenShare: number,
  unauthorizedShare: number,
): boolean {
  return (
    isNoncitizen(seed, personId, citizenShare) &&
    new SeededRng(seed).fork(`work-authorization:${personId}`).next() <
      unauthorizedShare
  );
}
