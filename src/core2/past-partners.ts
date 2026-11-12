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

/**
 * The other parent of a person's children who is not their partner now
 * (gap sheet, Nov 12, 2026, row 11: a child was told with no partner before
 * it): the opening kin's `other-parent` of each child, from the child's own
 * family records, and the births of the children they had together.
 */
function otherParentOf(
  core: CoreState,
  person: Readonly<PersonState>,
): { partner: OtherParent; births: string[] } | undefined {
  const facts = person.pastFacts ?? [];
  const present = new Set(
    facts
      .filter((fact) => fact.kind === "family:partner")
      .map((fact) => String(fact.facts?.otherPersonId ?? "")),
  );
  for (const link of core.familyLinks.values())
    if (link.kind === "partner" && link.personIds.includes(person.id))
      for (const id of link.personIds) if (id !== person.id) present.add(id);
  const together = new Map<string, string[]>();
  for (const fact of facts) {
    if (fact.kind !== "family:child") continue;
    const child = core.people.get(fact.facts?.otherPersonId as PersonId);
    if (!child) continue;
    for (const parent of child.pastFacts ?? []) {
      if (!["family:parent", "family:other-parent"].includes(parent.kind))
        continue;
      const id = String(parent.facts?.otherPersonId ?? "");
      if (!id || id === person.id || present.has(id)) continue;
      together.set(id, [...(together.get(id) ?? []), child.birthDate]);
    }
  }
  const [id, births] =
    [...together].sort(([, a], [, b]) =>
      a.sort()[0]!.localeCompare(b.sort()[0]!),
    )[0] ?? [];
  if (!id || !births) return undefined;
  // A living relative is a person of the inactive tier; one who died before
  // the start is a named husk with the day they died.
  const row = core.people.get(id as PersonId) ?? core.husks.get(id as PersonId);
  const gender = row?.looks?.gender;
  if (!row?.birthDate || (gender !== "female" && gender !== "male"))
    return undefined;
  const diedOn = "diedOn" in row ? row.diedOn : undefined;
  return {
    partner: {
      id,
      givenName: row.givenName,
      familyName: row.familyName,
      birthDate: row.birthDate,
      sex: gender,
      ...(diedOn ? { diedOn } : {}),
    },
    births: births.sort(),
  };
}

/** A child's other parent, as the opening kin recorded them. */
interface OtherParent {
  id: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: Sex;
  /** The day they died, for one who died before the start. */
  diedOn?: string;
}

/**
 * The partnership with a child's other parent: it began before their first
 * child, placed along the chain's pace of partnering from the adult age (or
 * the year before the birth, for a birth before it), and ended after their
 * last child and before `before`, placed along the paces of parting and of
 * the partner's death, as `earlierPartnership` places them. Undefined when
 * the records leave no room for it to have ended.
 */
function withOtherParent(
  core: CoreState,
  person: Readonly<PersonState>,
  other: { partner: OtherParent; births: string[] },
  before: string,
) {
  const api = coreAPI(core);
  const sex = sexOf(person);
  const partnerSex = other.partner.sex;
  if (!sex) return undefined;
  const geo = partnershipGeo(core.placeMetadata?.placeKey);
  const daysPerYear = api.parameter("daysPerMeanYear");
  const adult = api.parameter("votingAge");
  const born = makeIsoDate(person.birthDate);
  const key = `past-partner:${person.id}`;
  const rng = new SeededRng(core.seed).fork(key).fork("other-parent");
  const ageOn = (date: string) => ageOnDate(born, makeIsoDate(date));
  const dayAt = (age: number) =>
    addDays(born, Math.round(age * daysPerYear)) as string;
  const first = ageOn(other.births[0]!);
  const last = ageOn(other.births.at(-1)!);
  const end = ageOn(before);
  if (last >= end) return undefined;
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
      if (whole <= 0 || sum >= share * whole) return age;
    }
    return Math.max(from, to - 1);
  };
  const met =
    first <= adult
      ? first - 1
      : placed(
          (age) => partneringPerYear(geo, sex, age),
          adult,
          first,
          rng.fork("meet").next(),
        );
  const partnerAge = ageOnDate(
    makeIsoDate(other.partner.birthDate),
    makeIsoDate(dayAt(met)),
  );
  const parting = (age: number) => separatingPerYear(age - met);
  // A partner who died before the start ended it on the day they died;
  // otherwise it ended by parting, placed along the chain's pace of parting.
  const died = other.partner.diedOn;
  const widowed = died !== undefined && died < before;
  const ended = widowed
    ? died
    : dayAt(placed(parting, last, end, rng.fork("end").next()) + 1);
  if (ended >= before || ended <= other.births.at(-1)!) return undefined;
  return {
    began: dayAt(met),
    ended,
    how: widowed ? ("widowed" as const) : ("parted" as const),
    partnerSex,
    partnerAge,
    key,
  };
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
    // A child's other parent is the earlier partner the records already
    // name; only someone without one gets a partner from the chain alone.
    const other = otherParentOf(core, person);
    const withParent = other
      ? withOtherParent(core, person, other, before)
      : undefined;
    const past =
      withParent ?? earlierPartnership(core, person, before, since === null);
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
    const partnerBorn = withParent
      ? other!.partner.birthDate
      : `${Number(past.began.slice(0, 4)) - past.partnerAge}-07-01`;
    const partnerName = withParent
      ? `${other!.partner.givenName} ${other!.partner.familyName}`
      : `${birthCohortGivenName(core.seed, past.key, {
          givenName: named.givenName,
          familyName: named.familyName,
          birthDate: makeIsoDate(partnerBorn),
          gender,
        })} ${named.familyName}`;
    const row: Omit<HistoryRecord, "moduleId"> = {
      id: `${PAST_PARTNERSHIP_ENDED}:${person.id}`,
      // A day inside the world's window keeps its own date; only one before
      // it is told on the birthday in its year (grainDate clamps a later day
      // to the window's eve, which told every ending as the same year).
      date: (past.ended < world.from
        ? grainDate(person, past.ended, world.from)
        : past.ended) as IsoDate,
      kind: PAST_PARTNERSHIP_ENDED,
      placeId: person.placeId,
      // The child's other parent is named in the facts: a relative kept as
      // a husk is not a person a record may list.
      personIds: [person.id],
      facts: {
        personId: person.id,
        partnerName,
        ...(withParent ? { partnerId: other!.partner.id } : {}),
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
        estimatedFrom: withParent
          ? `Their children's other parent, from the opening kin's records; when it began and ended, from the person's own seeded lines against that chain, between the adult age and their first child, and between their last child and ${since ? "the day their present partnership began" : "the start"}.`
          : `The person's own seeded lines against that chain, from the adult age (${api.parameter("votingAge")}) to ${since ? "the day their present partnership began" : "the start"}.`,
      },
    };
    recordPreStartLater(core, moduleId, [row], { person: person.id });
  }
}
