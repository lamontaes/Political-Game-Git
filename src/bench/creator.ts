import type { CoreState } from "../core2/types";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { backdropFile, homeOf, stagePeople } from "./scene";
import { LOOK_SEXES, lookFamilies } from "./whole-figures";

/** The ages a life can begin at: the game opens the year before 18. */
export const CREATOR_MIN_AGE = 17;
export const CREATOR_MAX_AGE = 90;
const PREVIEW_MINUTE = 18 * 60;

/** What the creator shows for the new life's person, with a preview figure. */
export function creatorView(core: CoreState, id: string) {
  const person = core.people.get(id);
  if (!person) throw new Error("No such person.");
  const [, month, day] = person.birthDate.split("-").map(Number);
  const sex = person.looks?.gender ?? LOOK_SEXES[0]!;
  const families = LOOK_SEXES.includes(sex) ? lookFamilies(sex) : [];
  const place = homeOf(core, id, PREVIEW_MINUTE);
  const name = `${person.givenName} ${person.familyName}`;
  const staged = stagePeople(core, place, [{ id, name }]).people;
  return {
    personId: id,
    givenName: person.givenName,
    familyName: person.familyName,
    age: ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)),
    birthMonth: month,
    birthDay: day,
    minAge: CREATOR_MIN_AGE,
    maxAge: CREATOR_MAX_AGE,
    sex,
    sexes: LOOK_SEXES,
    families,
    family: person.looks?.family ?? null,
    preview: { backdrop: backdropFile(place, PREVIEW_MINUTE), people: staged },
  };
}

export interface CreatorInput {
  givenName?: string;
  familyName?: string;
  age?: number;
  birthMonth?: number;
  birthDay?: number;
  sex?: string;
  family?: string;
}

/**
 * Sets the new life's person from the creator: the name, the birth date (the
 * age at the opening date and the birthday), and the look (sex and look
 * family). The bench writes these person fields directly; stopgap
 * SG-PLAY-creator-direct-person-write. The life's generated past (school,
 * work, household) stays as drawn for the original age; stopgap
 * SG-PLAY-creator-age-keeps-past.
 */
export function applyCreator(core: CoreState, id: string, input: CreatorInput) {
  const person = core.people.get(id) as
    | (NonNullable<ReturnType<CoreState["people"]["get"]>> & {
        givenName: string;
        familyName: string;
        birthDate: string;
        looks?: Record<string, string>;
      })
    | undefined;
  if (!person) throw new Error("No such person.");
  const name = (text: string | undefined, now: string) => {
    const trimmed = (text ?? now).trim().slice(0, 40);
    if (!trimmed) throw new Error("A name is needed.");
    return trimmed;
  };
  const givenName = name(input.givenName, person.givenName);
  const familyName = name(input.familyName, person.familyName);
  const view = creatorView(core, id);
  const age = input.age ?? view.age;
  const month = input.birthMonth ?? view.birthMonth;
  const day = input.birthDay ?? view.birthDay;
  if (!Number.isInteger(age) || age < CREATOR_MIN_AGE || age > CREATOR_MAX_AGE)
    throw new Error(`Age ${CREATOR_MIN_AGE} to ${CREATOR_MAX_AGE}.`);
  const [openYear, openMonth, openDay] = core.date.split("-").map(Number);
  // Born `age` years before the opening, a year earlier if the birthday
  // is still to come that year.
  const later = month! > openMonth! || (month === openMonth && day! > openDay!);
  const year = openYear! - age - (later ? 1 : 0);
  const birth = new Date(Date.UTC(year, month! - 1, day!));
  if (
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    birth.getUTCMonth() !== month! - 1 ||
    birth.getUTCDate() !== day
  )
    throw new Error("No such birthday.");
  const sex = input.sex ?? view.sex;
  if (!LOOK_SEXES.includes(sex)) throw new Error("No such look.");
  const families = lookFamilies(sex);
  const family =
    input.family && families.includes(input.family)
      ? input.family
      : input.sex && input.sex !== view.sex
        ? families[0]
        : (view.family ?? undefined);
  person.givenName = givenName;
  person.familyName = familyName;
  person.birthDate = birth.toISOString().slice(0, 10);
  person.looks = {
    ...(person.looks ?? {}),
    gender: sex,
    ...(family ? { family } : {}),
  };
  return creatorView(core, id);
}
