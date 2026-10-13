/**
 * College students at the opening (P15): which residents aged 18 to 24 are
 * enrolled in a college near home, and which one.
 *
 * Who is enrolled is generation of who exists at the opening, decided by
 * their own records: a young adult whose schooling is "some college" or a
 * degree is a candidate; among them, those from households with a
 * college-educated adult and more earnings and savings come first; the
 * state's share of 18-to-24-year-olds enrolled (Census ACS) sets how many.
 * Only a county with a degree-granting college (IPEDS) has students at home.
 * The college's kind follows the family: a four-year college for a household
 * with a college-educated adult or upper-half means, else a community
 * college, where the county has that kind.
 */
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import { countyGeoidsForPlace } from "../simulation/government-units";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { stopgap } from "./stopgaps";
import collegesJson from "./data/opening-colleges.json" with { type: "json" };
import { profileFor } from "./opening-profile";
import keysJson from "./data/views/ces-2024-views.json" with { type: "json" };
import { parameter } from "./parameters";
import type { CoreInput, PersonInput } from "./types";

export const COLLEGE_STOPGAP = "SG-P15-college-enrollment";
export const COLLEGE_FACT_KIND = "school:cohort-estimate";
export const COLLEGE_STAGE = "college";
/** The fall term's first day, month-day. */
export const COLLEGE_TERM_START = (collegesJson as { termStart: string })
  .termStart;

type CollegeRow = readonly [id: string, name: string, kind: string];
const VIEWS_KEYS = keysJson as unknown as {
  nationalEducationShares: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  states: Readonly<
    Record<
      string,
      {
        educationShares: Readonly<
          Record<string, Readonly<Record<string, number>> | null>
        >;
      }
    >
  >;
};
const COLLEGES = collegesJson as unknown as {
  version: string;
  citation: string;
  shareCitation: string;
  minimumAge: number;
  maximumAge: number;
  /** Fall term start: month-day. */
  termStart: string;
  shareByState: Readonly<Record<string, number>>;
  nationalShare: number;
  counties: Readonly<Record<string, readonly CollegeRow[]>>;
};

const p = (key: string) => parameter(key);
/** The survey's youngest age band, holding everyone 18 to 24. */
const YOUNG_BAND = "18-29";

/** A number from 0 to 1 keyed to a string: who someone is, never a choice. */
function unit(key: string): number {
  const digits = p("seedHashDigits");
  const radix = p("seedPlaceHashRadix");
  return (
    Number.parseInt(stableHash(key).slice(p("zero"), digits), radix) /
    radix ** digits
  );
}

type Located = Pick<PersonInput, "placeId" | "countyId">;

function countyGeoids(person: Located): readonly string[] {
  const county = person.countyId
    ? lifePlaceByJurisdictionId(person.countyId as never)
    : null;
  if (county?.sourceGeoid) return [county.sourceGeoid];
  const place = lifePlaceByJurisdictionId(person.placeId as never);
  return place?.sourceGeoid ? countyGeoidsForPlace(place.sourceGeoid) : [];
}

/** The colleges in the person's county, if any. */
export function collegesNear(person: Located): readonly CollegeRow[] {
  return countyGeoids(person).flatMap(
    (geoid) => COLLEGES.counties[geoid] ?? [],
  );
}

/** Adds a current-enrollment college fact to each young adult who attends one near home. */
export function enrollCollegeStudents(input: CoreInput): CoreInput {
  const opening = makeIsoDate(input.startedAt);
  const ageOf = (person: PersonInput) =>
    ageOnDate(makeIsoDate(person.birthDate), opening);
  const schoolingOf = (person: PersonInput) =>
    profileFor(person, input.seed, input.startedAt)?.education;
  // A degree held in the home, from each adult's own profile: it decides the
  // kind of college. Read per household, so a household filled in later gets
  // the same answer as in the whole town.
  const members = new Map<string, PersonInput[]>();
  for (const person of input.people)
    members.set(person.householdId, [
      ...(members.get(person.householdId) ?? []),
      person,
    ]);
  const degreeAtHome = (person: PersonInput) =>
    (members.get(person.householdId) ?? []).some(
      (other) =>
        other.id !== person.id &&
        ageOf(other) > COLLEGES.maximumAge &&
        schoolingOf(other) === "college",
    );
  const enrolled = new Map<string, CollegeRow>();
  for (const person of input.people) {
    if (person.tier === "husk") continue;
    const age = ageOf(person);
    if (age < COLLEGES.minimumAge || age > COLLEGES.maximumAge) continue;
    const level = schoolingOf(person);
    if (level !== "some-college" && level !== "college") continue;
    const near = collegesNear(person);
    if (!near.length) continue;
    // Who is enrolled is who exists at the opening: the person's own line,
    // under the state's share enrolled divided by the share of their age
    // with some college (the same survey their schooling comes from), so
    // the state's share holds without ranking anyone against anyone.
    const state =
      lifePlaceByJurisdictionId(person.placeId as never)
        ?.stateJurisdictionKey?.split("-")
        .at(-p("one")) ?? "";
    const share = COLLEGES.shareByState[state] ?? COLLEGES.nationalShare;
    const shares =
      VIEWS_KEYS.states[state]?.educationShares[YOUNG_BAND] ??
      VIEWS_KEYS.nationalEducationShares[YOUNG_BAND]!;
    const withCollege =
      (shares["some-college"] ?? p("zero")) + (shares.college ?? p("zero"));
    const line = Math.min(p("one"), share / withCollege);
    if (unit(`${input.seed}:college:enrolled:${person.id}`) >= line) continue;
    const want = degreeAtHome(person) ? "four-year" : "community";
    const fitting = near.filter(([, , kind]) => kind === want);
    const pool = fitting.length ? fitting : near;
    // SG-P15-college-enrollment: which college of the kind, keyed to the
    // person, until colleges carry their enrollment.
    const at = Number.parseInt(
      stableHash(`${input.seed}:college:${person.id}`).slice(
        p("zero"),
        p("seedHashDigits"),
      ),
      p("seedPlaceHashRadix"),
    );
    enrolled.set(person.id, pool[at % pool.length]!);
  }
  if (!enrolled.size) return input;
  stopgap(COLLEGE_STOPGAP);
  return {
    ...input,
    people: input.people.map((person) => {
      const college = enrolled.get(person.id);
      if (!college) return person;
      const [id, name, kind] = college;
      const birth = makeIsoDate(person.birthDate);
      // The fall term after they turned the minimum age.
      const [year, monthDay] = [
        Number(
          person.birthDate.slice(p("zero"), person.birthDate.indexOf("-")),
        ),
        person.birthDate.slice(person.birthDate.indexOf("-") + p("one")),
      ];
      const startYear =
        year +
        COLLEGES.minimumAge +
        (monthDay > COLLEGES.termStart ? p("one") : p("zero"));
      const start = `${startYear}-${COLLEGES.termStart}`;
      return {
        ...person,
        pastFacts: [
          ...(person.pastFacts ?? []),
          {
            id: `${person.id}:opening-college:${id}`,
            date: start < input.startedAt ? start : input.startedAt,
            kind: COLLEGE_FACT_KIND,
            summary: "College",
            source: {
              tag: "ESTIMATED",
              asOf: input.startedAt,
              citation: `${COLLEGES.citation} IPEDS:${id}, ${name}. ${COLLEGES.shareCitation}`,
              estimatedFrom: `Opening generation: schooling, household degree and means ranked against the state's share enrolled (${COLLEGE_STOPGAP}); born ${birth}.`,
            },
            facts: {
              stage: COLLEGE_STAGE,
              cohortYear: String(startYear),
              placeId: person.placeId,
              campusIdentity: "directory-name",
              attendance: "current-enrollment-estimate",
              schoolName: name,
              institutionSourceId: id,
              institutionSourceKey: "IPEDS",
              institutionName: name,
              institutionKind: COLLEGE_STAGE,
              collegeKind: kind,
              enrollment: "current",
              directoryAsOf: "2025-26",
              stopgapId: COLLEGE_STOPGAP,
            },
          },
        ],
      };
    }),
  };
}
