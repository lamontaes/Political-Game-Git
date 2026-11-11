/**
 * The life record, part 6 (owner, Nov 8, 2026: "None of my history is
 * simulated... a girlfriend or a car accident"): an earlier partnership that
 * ended before the start, written when a person is opened. No new rates: the
 * opening's own chain of partnering (`partneringPerYear`: first marriage by
 * the place's ACS never-married shares, remarriage by NCFMR) and of parting
 * (`separatingPerYear`, NSFG) with widowhood by the SSA 2023 life table at the
 * partner's age (the CPS spouse age gap, `partnerAgeFor`), read year by year
 * against the person's own seeded lines, as the moves engine and the opening
 * kin read leaving against theirs. Seeded generation of who existed in their
 * past; no roll decides what anyone does.
 *
 * Only what agrees with the person's records is written: a partnership the
 * chain ends before their present one began (or before today, where they live
 * alone). Someone the chain still has together while their records say they
 * are single is left as the records say. The earlier partner is a name and a
 * birth year on the record, never a full person until met.
 */
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import { DEFAULT_CORPUS_VERSION } from "./gov-rules/names-data";
import {
  defaultPronounsForGender,
  type GenderIdentityKey,
} from "./gov-rules/person-identity";
import { birthCohortGivenName } from "./gov-rules/given-name-cohorts";
import { drawCanonicalNamedIdentity } from "./person-names";
import { ssa2023AnnualProbability } from "./health-mortality-table";
import {
  maritalShares,
  partnerAgeFor,
  partneringPerYear,
  partnershipGeo,
  separatingPerYear,
  type Sex,
} from "./opening-partnership";
import { ownPastKind } from "./own-past-kinds";
import {
  grainDate,
  ownWindowOf,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  wholePastOnce,
} from "./pre-start";
import { coreAPI } from "./state";
import type { HistoryRecord } from "./pre-start";
import type { CoreState, IsoDate, PersonId, PersonState } from "./types";

/** A partnership that ended before the start: by parting, or by the partner's death. */
export const PAST_PARTNERSHIP_ENDED = ownPastKind("family.partnership-ended");

/** The household partnership record of the opening (src/core2/modules/people.ts). */
const FAMILY_PARTNERED = "family.partnered";

const sexOf = (person: Readonly<PersonState>): Sex | undefined => {
  const gender = person.looks?.gender;
  return gender === "female" || gender === "male" ? gender : undefined;
};

/** A seeded line: the pull that must build before the change happens. */
const lineOf = (rng: SeededRng) => -Math.log(1 - rng.next());

/** The day their present partnership began, by their records; null when they live without one. */
function presentSince(
  core: CoreState,
  person: Readonly<PersonState>,
): string | null | undefined {
  const partnered =
    (person.pastFacts ?? []).some((fact) => fact.kind === "family:partner") ||
    [...core.familyLinks.values()].some(
      (link) => link.kind === "partner" && link.personIds.includes(person.id),
    );
  if (!partnered) return null;
  const record = preStartHistory(core, {
    kind: FAMILY_PARTNERED,
    personId: person.id,
  })[0];
  if (record) return record.date;
  // No record of the day: the birth of their first child together bounds it.
  const firstChild = (person.pastFacts ?? [])
    .filter((fact) => fact.kind === "family:child")
    .map(
      (fact) =>
        core.people.get(fact.facts?.otherPersonId as PersonId)?.birthDate,
    )
    .filter((date): date is string => Boolean(date))
    .sort()[0];
  return firstChild;
}

/**
 * The earlier partnership the chain gives a person, if one ended before
 * `before`: when it began and ended, how, and the partner's sex and age.
 *
 * Someone living without a partner now (`alone`) had one before by the
 * chain's own share at their age: the previously partnered over everyone
 * single (`maritalShares`), read against their seeded line. When it began
 * and ended are placed along the chain's yearly paces of partnering and of
 * parting and widowhood between the adult age and today, by their seeded
 * lines; how it ended, by the two paces' shares. Someone with a partner now
 * had one before only where the chain, run from the adult age, ends a
 * partnership before the present one began.
 */
export function earlierPartnership(
  core: CoreState,
  person: Readonly<PersonState>,
  before: string,
  alone: boolean,
):
  | {
      began: string;
      ended: string;
      how: "parted" | "widowed";
      partnerSex: Sex;
      partnerAge: number;
      key: string;
    }
  | undefined {
  const api = coreAPI(core);
  const sex = sexOf(person);
  if (!sex) return undefined;
  const geo = partnershipGeo(core.placeMetadata?.placeKey);
  const daysPerYear = api.parameter("daysPerMeanYear");
  const adult = api.parameter("votingAge");
  const born = makeIsoDate(person.birthDate);
  const key = `past-partner:${person.id}`;
  const rng = new SeededRng(core.seed).fork(key);
  const ageOn = (date: string) => ageOnDate(born, makeIsoDate(date));
  const yearOf = (age: number) =>
    addDays(born, Math.round(age * daysPerYear)) as string;
  const last = ageOn(before);
  if (last <= adult + 1) return undefined;
  const partnerSex: Sex = sex === "female" ? "male" : "female";
  const widowPace = (partnerAge: number, years: number) =>
    Number(
      ssa2023AnnualProbability(Math.min(partnerAge + years, 100), partnerSex),
    );
  // The age a cumulative pace reaches a share of its whole between two ages.
  const placed = (
    pace: (age: number) => number,
    from: number,
    to: number,
    share: number,
  ) => {
    let whole = 0;
    for (let age = from; age < to; age += 1) whole += pace(age);
    let sum = 0;
    for (let age = from; age < to; age += 1) {
      sum += pace(age);
      if (whole <= 0 || sum >= share * whole) return { age, whole };
    }
    return { age: to - 1, whole };
  };
  const result = (
    met: number,
    endAge: number,
    widowed: boolean,
    partnerAge: number,
  ) => {
    const ended = yearOf(endAge + 1);
    return ended >= before
      ? undefined
      : {
          began: yearOf(met),
          ended,
          how: widowed ? ("widowed" as const) : ("parted" as const),
          partnerSex,
          partnerAge,
          key,
        };
  };
  if (alone) {
    const shares = maritalShares(geo, sex, last);
    const single = shares.never + shares.previously;
    // The pull of having partnered before, from the chain's share, against
    // their own line.
    if (
      single <= 0 ||
      shares.previously >= single ||
      lineOf(rng.fork("ever")) > -Math.log(1 - shares.previously / single)
    )
      return undefined;
    const met = placed(
      (age) => partneringPerYear(geo, sex, age),
      adult,
      last - 1,
      rng.fork("meet").next(),
    ).age;
    const partnerAge = partnerAgeFor(
      core.seed,
      key,
      met,
      sex,
      partnerSex,
      adult,
    );
    if (partnerAge === undefined) return undefined;
    const parting = (age: number) => separatingPerYear(age - met);
    const widowing = (age: number) => widowPace(partnerAge, age - met);
    const end = placed(
      (age) => parting(age) + widowing(age),
      met,
      last,
      rng.fork("end").next(),
    ).age;
    // How it ended: the pace whose pull stood nearer its own line by then.
    const partLine = lineOf(rng.fork("part-line"));
    const widowLine = lineOf(rng.fork("widow-line"));
    const span = Array.from({ length: end - met + 1 }, (_, i) => met + i);
    const pulled = (pace: (age: number) => number) =>
      span.reduce((sum, age) => sum + pace(age), 0);
    const byDeath = pulled(widowing) / widowLine > pulled(parting) / partLine;
    return result(met, end, byDeath, partnerAge);
  }
  // A partner now: the chain from the adult age, against the person's lines.
  const meetLine = lineOf(rng.fork("meet-line"));
  let pull = 0;
  let met: number | undefined;
  for (let age = adult; age < last; age += 1) {
    const year = partneringPerYear(geo, sex, age);
    if (pull + year >= meetLine) {
      met = age;
      break;
    }
    pull += year;
  }
  if (met === undefined) return undefined;
  const partnerAge = partnerAgeFor(core.seed, key, met, sex, partnerSex, adult);
  if (partnerAge === undefined) return undefined;
  const partLine = lineOf(rng.fork("part-line"));
  const widowLine = lineOf(rng.fork("widow-line"));
  let parting = 0,
    widowing = 0;
  for (let age = met; age < last; age += 1) {
    parting += separatingPerYear(age - met);
    widowing += widowPace(partnerAge, age - met);
    const parted = parting >= partLine;
    const widowed = widowing >= widowLine;
    if (!parted && !widowed) continue;
    return result(
      met,
      age,
      widowed && (!parted || widowing / widowLine > parting / partLine),
      partnerAge,
    );
  }
  return undefined;
}

/** A person's earlier partnership, written once into their own past. */
export function pastPartnersFor(
  core: CoreState,
  people: readonly PersonState[],
  moduleId: string,
): void {
  const world = preStartWindowOf(core);
  if (!world) return;
  const api = coreAPI(core);
  for (const person of people) {
    if (!person.alive || !ownWindowOf(core, person)) continue;
    if (!wholePastOnce(core, person.id, "partners")) continue;
    const since = presentSince(core, person);
    if (since === undefined) continue;
    const before = since ?? core.startedAt;
    const past = earlierPartnership(core, person, before, since === null);
    if (!past) continue;
    const gender = past.partnerSex as GenderIdentityKey;
    const named = drawCanonicalNamedIdentity(
      new SeededRng(core.seed).fork(past.key).fork("name"),
      { gender, pronouns: defaultPronounsForGender(gender) },
      { corpusVersion: DEFAULT_CORPUS_VERSION },
    );
    const metAge = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(past.began),
    );
    const partnerBorn = `${Number(past.began.slice(0, 4)) - past.partnerAge}-07-01`;
    const givenName = birthCohortGivenName(core.seed, past.key, {
      givenName: named.givenName,
      familyName: named.familyName,
      birthDate: makeIsoDate(partnerBorn),
      gender,
    });
    const row: Omit<HistoryRecord, "moduleId"> = {
      id: `${PAST_PARTNERSHIP_ENDED}:${person.id}`,
      date: grainDate(person, past.ended, world.from) as IsoDate,
      kind: PAST_PARTNERSHIP_ENDED,
      placeId: person.placeId,
      personIds: [person.id],
      facts: {
        personId: person.id,
        partnerName: `${givenName} ${named.familyName}`,
        partnerBirthYear: partnerBorn.slice(0, 4),
        startedAt: past.began,
        startedAge: metAge,
        ended: past.how === "widowed" ? "widowed" : "parted",
      },
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation:
          "The opening's partnership chain (src/core2/opening-partnership.ts): partnering by the place's ACS never-married shares and NCFMR remarriage, parting by the NSFG first-marriage curve, widowhood by the SSA 2023 life table at the CPS spouse age gap.",
        estimatedFrom: `The person's own seeded lines against that chain, from the adult age (${api.parameter("votingAge")}) to ${since ? "the day their present partnership began" : "the start"}.`,
      },
    };
    recordPreStartLater(core, moduleId, [row], { person: person.id });
  }
}
