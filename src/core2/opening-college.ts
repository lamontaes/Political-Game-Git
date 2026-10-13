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
import { parameter } from "./parameters";
import type { CoreInput, PersonInput } from "./types";

export const COLLEGE_STOPGAP = "SG-P15-college-enrollment";
export const COLLEGE_FACT_KIND = "school:cohort-estimate";
export const COLLEGE_STAGE = "college";
/** The fall term's first day, month-day. */
export const COLLEGE_TERM_START = (collegesJson as { termStart: string })
  .termStart;

type CollegeRow = readonly [id: string, name: string, kind: string];
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
  const jobs = new Map(input.jobs.map((job) => [job.id, job]));
  // Each household's means and whether an adult in it holds a degree.
  const homes = new Map<
    string,
    { earnings: number; savings: number; degree: boolean }
  >();
  for (const person of input.people) {
    if (person.tier === "husk") continue;
    const row = homes.get(person.householdId) ?? {
      earnings: p("zero"),
      savings: p("zero"),
      degree: false,
    };
    row.earnings += person.jobId
      ? (jobs.get(person.jobId)?.wageDailyMinor ?? p("zero"))
      : p("zero");
    row.savings += person.liquidMinor ?? p("zero");
    if (
      ageOf(person) > COLLEGES.maximumAge &&
      schoolingOf(person) === "college"
    )
      row.degree = true;
    homes.set(person.householdId, row);
  }
  const young = input.people.filter(
    (person) =>
      person.tier !== "husk" &&
      ageOf(person) >= COLLEGES.minimumAge &&
      ageOf(person) <= COLLEGES.maximumAge,
  );
  const stateOf = (person: PersonInput) =>
    lifePlaceByJurisdictionId(person.placeId as never)
      ?.stateJurisdictionKey?.split("-")
      .at(-p("one"));
  const byState = new Map<string, PersonInput[]>();
  for (const person of young) {
    const state = stateOf(person) ?? "";
    byState.set(state, [...(byState.get(state) ?? []), person]);
  }
  const enrolled = new Map<string, CollegeRow>();
  for (const [state, people] of byState) {
    const share = COLLEGES.shareByState[state] ?? COLLEGES.nationalShare;
    const count = Math.round(share * people.length);
    const rank = (field: "earnings" | "savings") =>
      new Map(
        [...homes.entries()]
          .sort(([a, x], [b, y]) => x[field] - y[field] || a.localeCompare(b))
          .map(([id], at) => [id, at]),
      );
    const earnings = rank("earnings");
    const savings = rank("savings");
    const means = (person: PersonInput) =>
      (earnings.get(person.householdId) ?? p("zero")) +
      (savings.get(person.householdId) ?? p("zero"));
    const median = homes.size;
    const candidates = people
      .filter((person) => {
        const level = schoolingOf(person);
        return (
          (level === "some-college" || level === "college") &&
          collegesNear(person).length > p("zero")
        );
      })
      .sort(
        (a, b) =>
          Number(homes.get(b.householdId)?.degree) -
            Number(homes.get(a.householdId)?.degree) ||
          means(b) - means(a) ||
          a.id.localeCompare(b.id),
      )
      .slice(p("zero"), count);
    for (const person of candidates) {
      const near = collegesNear(person);
      const fourYear =
        homes.get(person.householdId)?.degree || means(person) >= median;
      const want = fourYear ? "four-year" : "community";
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
