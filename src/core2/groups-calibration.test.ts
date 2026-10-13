import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import { groupsModule } from "./modules/groups";
import { viewsModule } from "./modules/views";
import { addOpeningGroups } from "./opening-groups";
import { addOpeningProfiles, PROFILE_FACT_KINDS } from "./opening-profile";
import { buildPopulation } from "./population";
import rates from "../../data/research/groups/membership-rates.json" with { type: "json" };

// SG-P15-group-membership: over four drawn towns, adults belong to each kind
// of group at about the survey's shares, overall, by age and by schooling.
// Each kind is measured among adults whose town lists one (a town without a
// listed group is the listing's gap, SG-P15-group-names, not the weights').
const SURVEY_COLUMN: Readonly<Record<string, string>> = {
  congregation: "religious-beyond-services",
  "parent-teacher-group": "school-or-neighborhood",
  "neighborhood-association": "school-or-neighborhood",
  "service-club": "service-or-civic",
  "veterans-post": "service-or-civic",
  "fraternal-society": "service-or-civic",
  "business-association": "service-or-civic",
  "sports-league": "sports-or-recreation",
  "advocacy-group": "other",
  "volunteer-group": "other",
  "arts-group": "other",
};
const survey = rates.sources[0]!.percentTakingPartInPastYear as unknown as {
  columns: string[];
} & Record<string, number[]>;
const columns = survey.columns;
const surveyShare = (row: string, column: string) =>
  survey[row]![columns.indexOf(column)]! / 100;

interface Adult {
  band: string;
  schooling: string;
  columns: Set<string>;
  available: Set<string>;
}
const adults: Adult[] = [];
const towns: string[] = [];
for (let draw = 0; draw < 4; draw += 1) {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "groups-calibration",
    `groups-${draw}`,
  );
  towns.push(`${place.name} (seed ${place.seed.slice(0, 12)})`);
  const input = addOpeningGroups(
    addOpeningProfiles(
      buildDeepPast(
        buildPopulation({
          seed: place.seed,
          placeKey: place.key,
          startedAt: "2021-01-01",
          minimumPeople: 800,
        }),
      ),
    ),
  );
  const kindOf = new Map(
    (input.publicOrganizations ?? [])
      .filter((row) => row.facts?.groupKind)
      .map((row) => [row.id, String(row.facts!.groupKind)]),
  );
  const core = createLifeCore(input, {
    modules: [viewsModule, groupsModule],
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  // A parent-teacher group counts only where children live in town (a tiny
  // place can be built with adult residents only; reported to OPUS-CORE).
  const childrenInTown = [...core.people.values()].some(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.startedAt)) < 18,
  );
  const available = new Set(
    [...kindOf.values()]
      .filter((kind) => kind !== "parent-teacher-group" || childrenInTown)
      .map((kind) => SURVEY_COLUMN[kind]!),
  );
  const belongs = new Map<string, Set<string>>();
  for (const row of core.memberships.values()) {
    const kind = kindOf.get(row.organizationId);
    if (!kind) continue;
    const held = belongs.get(row.personId) ?? new Set<string>();
    held.add(SURVEY_COLUMN[kind]!);
    belongs.set(row.personId, held);
  }
  for (const person of core.people.values()) {
    if (!person.alive || person.tier === "husk") continue;
    const age = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(core.startedAt),
    );
    if (age < 18) continue;
    adults.push({
      band:
        age < 30
          ? "age 18-29"
          : age < 45
            ? "age 30-44"
            : age < 65
              ? "age 45-64"
              : "age 65+",
      schooling: String(
        person.pastFacts?.find(
          (row) => row.kind === PROFILE_FACT_KINDS.education,
        )?.facts?.level ?? "",
      ),
      columns: belongs.get(person.id) ?? new Set(),
      available,
    });
  }
}

/** The share of adults (in towns that list the kind) who belong to it. */
function share(column: string, among: (adult: Adult) => boolean = () => true) {
  const base = adults.filter(
    (adult) =>
      among(adult) && (column === "any" || adult.available.has(column)),
  );
  return (
    base.filter((adult) =>
      column === "any" ? adult.columns.size > 0 : adult.columns.has(column),
    ).length / base.length
  );
}

describe(`group membership against the survey in ${towns.join(", ")}`, () => {
  it("lands near the survey's share for each kind of group", () => {
    let checked = 0;
    for (const column of columns.filter((row) => row !== "any")) {
      // A kind listed in only one drawn town says more about that town.
      const listing = new Set(
        adults
          .filter((adult) => adult.available.has(column))
          .map((adult) => adult.available),
      );
      if (listing.size < 2) continue;
      checked += 1;
      const expected = surveyShare("all", column);
      const measured = share(column);
      expect(measured, column).toBeGreaterThan(expected * 0.4);
      expect(measured, column).toBeLessThan(expected * 1.8);
    }
    expect(checked).toBeGreaterThan(1);
    expect(share("any")).toBeGreaterThan(surveyShare("all", "any") * 0.5);
    expect(share("any")).toBeLessThan(surveyShare("all", "any") * 1.4);
  });

  it("rises with schooling as the survey's does", () => {
    const noCollege = share("any", (adult) => adult.schooling === "no-college");
    const college = share("any", (adult) => adult.schooling === "college");
    expect(noCollege).toBeLessThan(college);
    // The survey: 25% of adults without college, 51% with a degree.
    expect(noCollege).toBeGreaterThan(0.5 * 0.25);
    expect(college).toBeGreaterThan(0.5 * 0.514);
  });

  it("follows the survey's age pattern: the old in congregations and civic clubs, the young least", () => {
    const by = (band: string, column: string) =>
      share(column, (adult) => adult.band === band);
    expect(by("age 65+", "religious-beyond-services")).toBeGreaterThan(
      by("age 18-29", "religious-beyond-services"),
    );
    expect(by("age 65+", "service-or-civic")).toBeGreaterThan(
      by("age 18-29", "service-or-civic"),
    );
    // Young adults join least, as in the survey, though at under half its
    // 28% (SG-P15-group-membership stays open for them).
    for (const band of ["age 30-44", "age 45-64", "age 65+"]) {
      expect(by("age 18-29", "any")).toBeLessThan(by(band, "any"));
      expect(by(band, "any"), band).toBeGreaterThan(
        surveyShare(band, "any") * 0.4,
      );
      expect(by(band, "any"), band).toBeLessThan(
        surveyShare(band, "any") * 1.6,
      );
    }
  });
});
