import {
  lifePlaceByKey,
  resolveStartingBirthday,
  startingBirthdayFieldProblem,
} from "../simulation";
import type { IsoDate } from "../simulation";
import type { NewGameSetup } from "./new-game";

/**
 * Birthday/root adapter for a named starting anniversary.
 *
 * Geography helpers stay where they are. This file is the bounded seam A can
 * receive without restoring a whole J root: optional month/day on the setup,
 * one derived date of birth against the place's simulation start, and no new
 * questionnaire. Heading copy lives on the creator surface itself.
 */

export function birthdayProblemForSetup(setup: NewGameSetup): string | null {
  const fields = startingBirthdayFieldProblem(setup.birthMonth, setup.birthDay);
  if (fields) return fields;
  if (setup.birthMonth === undefined || setup.birthDay === undefined) {
    return null;
  }
  const place = lifePlaceByKey(setup.placeKey);
  if (!place) return null;
  const resolved = resolveStartingBirthday({
    currentDate: place.context.initialMoment.date as IsoDate,
    startAge: setup.startAge,
    birthMonth: setup.birthMonth,
    birthDay: setup.birthDay,
  });
  return resolved.ok ? null : resolved.message;
}

export function derivedBirthDateForSetup(setup: NewGameSetup): IsoDate | null {
  if (setup.birthMonth === undefined || setup.birthDay === undefined) {
    return null;
  }
  const place = lifePlaceByKey(setup.placeKey);
  if (!place) return null;
  const resolved = resolveStartingBirthday({
    currentDate: place.context.initialMoment.date as IsoDate,
    startAge: setup.startAge,
    birthMonth: setup.birthMonth,
    birthDay: setup.birthDay,
  });
  return resolved.ok ? resolved.birthDate : null;
}

export { resolveStartingBirthday, startingBirthdayFieldProblem };
