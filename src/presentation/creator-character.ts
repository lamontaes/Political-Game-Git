import { isoDateFromParts } from "../simulation";
import type { GenderIdentityKey, IsoDate } from "../simulation";
import { birthYearForSetup } from "./creator-full-birthday";
import { birthdayProblemForSetup } from "./new-game-birthday";
import type { NewGameSetup } from "./new-game";
import type { StatedGender } from "./creator-name-preview";

/**
 * What the creator's character step still needs before Next (CRUNCH46 R7).
 *
 * A new life states a gender, a first and last name (typed or drawn) and a
 * whole birthday. `unstated` stays a valid stored value so older saves and
 * replays still load; the creator simply does not accept it for a new life.
 */
export type CreatorCharacterMissing = "gender" | "name" | "birthday";

export function statedCreatorGender(
  gender: GenderIdentityKey | undefined,
): StatedGender | null {
  return gender === undefined || gender === "unstated" ? null : gender;
}

export function creatorCharacterMissing(
  setup: NewGameSetup,
  yearChosen: boolean,
): readonly CreatorCharacterMissing[] {
  const missing: CreatorCharacterMissing[] = [];
  if (statedCreatorGender(setup.gender) === null) missing.push("gender");
  if (!setup.givenName?.trim() || !setup.familyName?.trim()) {
    missing.push("name");
  }
  if (
    !yearChosen ||
    setup.birthMonth === undefined ||
    setup.birthDay === undefined ||
    birthdayProblemForSetup(setup) !== null
  ) {
    missing.push("birthday");
  }
  return missing;
}

const MISSING_WORDS: Readonly<Record<CreatorCharacterMissing, string>> = {
  gender: "a gender",
  name: "a first and last name",
  birthday: "a full birthday (month, day and year)",
};

/** One plain sentence naming what is left, or null when nothing is. */
export function creatorCharacterHint(
  missing: readonly CreatorCharacterMissing[],
): string | null {
  if (missing.length === 0) return null;
  const words = missing.map((key) => MISSING_WORDS[key]);
  const list =
    words.length === 1
      ? words[0]
      : words.length === 2
        ? `${words[0]} and ${words[1]}`
        : `${words.slice(0, -1).join(", ")}, and ${words.at(-1)}`;
  return `To continue, choose ${list}.`;
}

/** The whole date of birth the fields describe, or null when incomplete. */
export function creatorBirthDate(setup: NewGameSetup): IsoDate | null {
  if (setup.birthMonth === undefined || setup.birthDay === undefined) {
    return null;
  }
  try {
    return isoDateFromParts(
      birthYearForSetup(setup),
      setup.birthMonth,
      setup.birthDay,
    );
  } catch {
    return null;
  }
}
