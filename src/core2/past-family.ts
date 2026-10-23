/**
 * The player's own context (owner, Oct 14, 2026): every household's shared
 * history, kept as dated past facts on its members, so the journal and the
 * dossier have the family's story from day one. One rule for every household
 * the deep past builds, at the opening or when a counted household is filled
 * in, so the player's family is told the same way as anyone's.
 *
 * - How the partners met: some years before their first shared child (or at
 *   the usual age for partners with none), never younger than the meeting
 *   age, where their records put them then (the hometown they share, the
 *   school they were both at, or the place they lived).
 * - Their relationship now: years together, shared children, and the
 *   ingredients the words engine reads (each partner's recorded conflict and
 *   warmth traits). No verdict is written.
 * - Where the family came from: each parent's birthplace and the household's
 *   move into its county.
 * - The family's work on day one: who earns, at what jobs; the money is the
 *   household's own accounts, read live.
 * - Remembered moments: a few of the household's own dated records that fell
 *   after the person was old enough to remember (a sibling's birth, the move,
 *   a parent's new job, their own first school day), chosen by the seed.
 *
 * Children hold their parents' story from when they were old enough to be
 * told it (September 29 ruling: family knows what such a person would know).
 */
import { ageOnDate } from "./kernel/dates";
import {
  pastParameter,
  seededBetween,
  seededUnit,
  shiftDays,
} from "./past-module";
import type { CoreInput, PersonInput, Source } from "./types";

type Fact = NonNullable<PersonInput["pastFacts"]>[number];

const KIND = {
  met: "household:partners-met",
  now: "household:partners-now",
  parentsMet: "household:parents-met",
  roots: "household:roots",
  livelihood: "household:livelihood",
  moment: "household:moment",
} as const;

/** Trait keys the words engine reads for how partners get along. */
const RELATIONSHIP_TRAITS = [
  "people-mind-v1:conflict",
  "people-mind-v1:sociability",
  "personality-v1:facet-generous",
] as const;

function years(date: string, count: number): string {
  return shiftDays(
    date,
    Math.round(count * pastParameter(null, "pastDaysPerYear")),
  );
}

function factsOf(person: PersonInput, kind: string): readonly Fact[] {
  return (person.pastFacts ?? []).filter((fact) => fact.kind === kind);
}

function otherIds(person: PersonInput, kind: string): readonly string[] {
  return factsOf(person, kind)
    .map((fact) => fact.facts?.otherPersonId)
    .filter((id): id is string => !!id);
}

function birthplace(person: PersonInput): string | undefined {
  return factsOf(person, "birthplace")[0]?.facts?.placeId;
}

/** Where a person's records put them on a date: their school, else their birthplace. */
function whereOn(person: PersonInput, date: string): string | undefined {
  const school = (person.pastFacts ?? [])
    .filter((f) => f.kind.startsWith("school:") && f.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  return school?.facts?.placeId ?? birthplace(person);
}

const SOURCE = (asOf: string, from: string): Source => ({
  tag: "ESTIMATED",
  asOf,
  citation:
    "src/core2/data/past/parameters.json (pastMeetingYearsBeforeFirstChild, pastChildlessMeetingAgeYears, pastMeetingAgeMinimum, pastEarliestMemoryAge, pastMomentsPerPerson)",
  estimatedFrom: from,
});

export function addFamilyHistories(
  input: CoreInput,
  kinTier: string,
  /** The deep past's version: its facts' ids carry it, so a fill-in rebuilds them. */
  version: string,
): CoreInput {
  const seed = input.seed;
  const opening = input.startedAt;
  const lastDay = shiftDays(opening, -1);
  const byId = new Map(input.people.map((p) => [p.id, p]));
  const jobs = new Map(input.jobs.map((job) => [job.id, job]));
  const added = new Map<string, Fact[]>();
  const add = (person: PersonInput, fact: Fact) => {
    if (fact.date < person.birthDate || fact.date >= opening) return;
    if ((person.pastFacts ?? []).some((f) => f.id === fact.id)) return;
    const list = added.get(person.id) ?? [];
    if (!list.some((f) => f.id === fact.id)) list.push(fact);
    added.set(person.id, list);
  };
  const remembers = (person: PersonInput) =>
    years(person.birthDate, pastParameter(null, "pastEarliestMemoryAge"));
  const lowYears = pastParameter(null, "pastMeetingYearsBeforeFirstChildLow");
  const highYears = pastParameter(null, "pastMeetingYearsBeforeFirstChildHigh");
  const minimumAge = pastParameter(null, "pastMeetingAgeMinimum");
  const childlessAge = pastParameter(null, "pastChildlessMeetingAgeYears");
  const perPerson = pastParameter(null, "pastMomentsPerPerson");

  for (const home of input.households) {
    const members = home.memberIds
      .map((id) => byId.get(id))
      .filter((p): p is PersonInput => !!p && p.tier !== kinTier);
    if (!members.length) continue;
    const memberIds = new Set(members.map((m) => m.id));
    const earners = members.filter((m) => m.jobId && jobs.has(m.jobId));
    const moved = members
      .flatMap((m) => factsOf(m, "life:moved-into-county"))
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);

    // Partners in this household, each pair once.
    const pairs: [PersonInput, PersonInput][] = [];
    for (const person of members)
      for (const otherId of otherIds(person, "family:partner")) {
        const other = byId.get(otherId);
        if (other && memberIds.has(otherId) && person.id < otherId)
          pairs.push([person, other]);
      }
    const parentsMet = new Map<string, Record<string, string>>();
    for (const [a, b] of pairs) {
      // Their shared children at home (the household's own records).
      const shared = otherIds(a, "family:child").filter(
        (id) => memberIds.has(id) && otherIds(b, "family:child").includes(id),
      );
      const firstBirth = shared
        .map((id) => byId.get(id)?.birthDate)
        .filter((d): d is string => !!d)
        .sort()[0];
      const younger = a.birthDate > b.birthDate ? a : b;
      const key = `${a.id}:${b.id}:met`;
      const earliest = years(younger.birthDate, minimumAge);
      let met = firstBirth
        ? years(firstBirth, -seededBetween(seed, key, lowYears, highYears))
        : years(
            younger.birthDate,
            childlessAge + seededBetween(seed, key, -lowYears, highYears),
          );
      if (met < earliest) met = earliest;
      if (met >= opening) met = lastDay;
      const placeA = birthplace(a);
      const placeB = birthplace(b);
      const schoolA = whereOn(a, met);
      const schoolB = whereOn(b, met);
      const youngAge = ageOnDate(younger.birthDate, met);
      const setting =
        placeA && placeA === placeB
          ? "hometown"
          : schoolA && schoolA === schoolB && youngAge < childlessAge
            ? "school"
            : "where-they-lived";
      const placeId =
        setting === "hometown"
          ? placeA!
          : setting === "school"
            ? schoolA!
            : moved && moved.date <= met
              ? (a.placeId as string)
              : (placeA ?? placeB ?? (a.placeId as string));
      const story = {
        placeId,
        setting,
        metOn: met,
        parentIds: `${a.id} ${b.id}`,
      };
      for (const [self, other] of [
        [a, b],
        [b, a],
      ] as const) {
        add(self, {
          id: `${self.id}:${version}:household:partner-met:${other.id}`,
          date: met,
          kind: KIND.met,
          summary: KIND.met,
          source: SOURCE(
            opening,
            "Seeded meeting date before the first shared child; place from the partners' recorded birthplaces and schools.",
          ),
          facts: { otherPersonId: other.id, placeId, setting },
        });
        const traits: Record<string, string> = {};
        for (const trait of RELATIONSHIP_TRAITS)
          for (const [who, person] of [
            ["self", self],
            ["other", other],
          ] as const)
            if (trait in person.traits)
              traits[`${who}:${trait}`] = String(person.traits[trait]);
        add(self, {
          id: `${self.id}:${version}:household:partner-now:${other.id}`,
          date: lastDay,
          kind: KIND.now,
          summary: KIND.now,
          source: SOURCE(opening, "The partners' records on day one."),
          facts: {
            otherPersonId: other.id,
            together: met,
            sharedChildren: String(shared.length),
            ...traits,
          },
        });
      }
      for (const childId of shared) parentsMet.set(childId, story);
    }

    for (const person of members) {
      const from = remembers(person);
      // Only the household's own records: a filled-in household rebuilds its
      // past from its members alone, and must come back the same.
      const parents = otherIds(person, "family:parent")
        .filter((id) => memberIds.has(id))
        .map((id) => byId.get(id)!);
      const story = parentsMet.get(person.id);
      if (story)
        add(person, {
          id: `${person.id}:${version}:household:parents-met`,
          date: from,
          kind: KIND.parentsMet,
          summary: KIND.parentsMet,
          source: SOURCE(
            opening,
            "The parents' own meeting record, told to their child.",
          ),
          facts: story,
        });
      if (parents.length)
        add(person, {
          id: `${person.id}:${version}:household:roots`,
          date: person.birthDate,
          kind: KIND.roots,
          summary: KIND.roots,
          source: SOURCE(
            opening,
            "The parents' recorded birthplaces and the household's move into its county.",
          ),
          facts: {
            parentIds: parents.map((p) => p.id).join(" "),
            parentBirthplaces: parents
              .map((p) => birthplace(p) ?? "")
              .join(" "),
            ...(moved ? { movedIntoCounty: moved.date } : {}),
          },
        });
      add(person, {
        id: `${person.id}:${version}:household:livelihood`,
        date: lastDay,
        kind: KIND.livelihood,
        summary: KIND.livelihood,
        source: SOURCE(
          opening,
          "The household's jobs, savings and living costs on day one.",
        ),
        facts: {
          householdId: home.id,
          earnerIds: earners.map((m) => m.id).join(" "),
          jobIds: earners.map((m) => m.jobId!).join(" "),
        },
      });
      // The household's own dated records the person was old enough to keep.
      const candidates: {
        about: string;
        date: string;
        sourceFactId: string;
        otherPersonId?: string;
      }[] = [];
      for (const sibling of members)
        if (
          sibling.id !== person.id &&
          sibling.birthDate >= from &&
          otherIds(sibling, "family:parent").some((id) =>
            parents.some((p) => p.id === id),
          )
        )
          candidates.push({
            about: "sibling-born",
            date: sibling.birthDate,
            sourceFactId: factsOf(sibling, "birth-date")[0]?.id ?? sibling.id,
            otherPersonId: sibling.id,
          });
      if (moved && moved.date >= from)
        candidates.push({
          about: "moved",
          date: moved.date,
          sourceFactId: moved.id,
        });
      for (const parent of parents)
        for (const work of factsOf(parent, "work:opening"))
          if (work.date >= from)
            candidates.push({
              about: "parent-new-job",
              date: work.date,
              sourceFactId: work.id,
              otherPersonId: parent.id,
            });
      for (const school of (person.pastFacts ?? []).filter((f) =>
        f.kind.startsWith("school:"),
      ))
        if (school.date >= from)
          candidates.push({
            about: "school-started",
            date: school.date,
            sourceFactId: school.id,
          });
      candidates
        .filter((c) => c.date < opening)
        .sort(
          (x, y) =>
            seededUnit(seed, `${person.id}:${x.sourceFactId}`) -
            seededUnit(seed, `${person.id}:${y.sourceFactId}`),
        )
        .slice(0, perPerson)
        .forEach((moment) =>
          add(person, {
            id: `${person.id}:${version}:household:moment:${moment.sourceFactId}`,
            date: moment.date,
            kind: KIND.moment,
            summary: KIND.moment,
            source: SOURCE(
              opening,
              "One of the household's own dated records, after the person's earliest memory.",
            ),
            facts: {
              about: moment.about,
              sourceFactId: moment.sourceFactId,
              ...(moment.otherPersonId
                ? { otherPersonId: moment.otherPersonId }
                : {}),
            },
          }),
        );
    }
  }
  if (!added.size) return input;
  return {
    ...input,
    people: input.people.map((person) => {
      const facts = added.get(person.id);
      return facts
        ? {
            ...person,
            pastFacts: [
              ...(person.pastFacts ?? []),
              ...facts.sort(
                (a, b) =>
                  a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
              ),
            ],
          }
        : person;
    }),
  };
}
