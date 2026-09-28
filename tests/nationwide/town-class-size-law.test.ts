import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  daysBetween,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  educationLawOfficeKey,
  fileRuleChangeProvision,
} from "../../src/simulation/enacted-rule-changes";
import { createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  takeFloorVote,
} from "../../src/simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
} from "../../src/simulation/legislation-scenarios";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import {
  PROFICIENT_BASE_PCT,
  SCHOOL_DISTRICT_COUNT_TRANSITION_KEY,
  classSizeLawAt,
  schoolDistrictCountHandler,
  schoolDistrictYears,
  townSchoolDistrictId,
} from "../../src/simulation/living-world/town-schools";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  advanceWorld,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  SchoolDistrictYearRecord,
  World,
} from "../../src/simulation";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

const OMAHA = "3137000";

function openOmaha() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "town-class-size-omaha",
      placeKey: OMAHA,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const town = game.world.people[game.playerPersonId]!.homeJurisdictionId!;
  return { world: game.world, player: game.playerPersonId, town };
}

/**
 * Nebraska's Legislature passes a bill capping classes at `maximum` pupils a
 * teacher from 45 days after the opening, and the Governor signs it. The
 * seats vote without a person in this world behind each one.
 */
function enactClassSizeCap(
  start: World,
  player: EntityId,
  maximum: number,
): { world: World; measureId: EntityId } {
  const scenario = createLegislativeScenario("nebraska");
  const template = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!;
  const opened = start.currentDate;
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  const key = "class-size:lb-910";
  let world = introduceMeasure(start, {
    stableKey: `${key}:measure`,
    jurisdictionId: template.jurisdictionId,
    rulePackId: template.rulePackId,
    designation: "LB 910",
    shortTitle: "Class size",
    summary: "Caps the number of pupils for each public-school teacher.",
    origin: "member-introduction",
    subjectClass: template.subjectClass,
    sponsorPersonId: player,
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === `${key}:measure`,
  )!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: `${key}:cap`,
    measureId,
    officeKey: educationLawOfficeKey("NE"),
    field: "education.classSize.maximum",
    value: maximum,
  });
  world = referMeasure(world, {
    stableKey: `${key}:referral`,
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: `${key}:committee`,
    measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(
      committeeMembers(body, committee.appointedMembers),
      { yea: committee.appointedMembers, nay: 0 },
    ),
    rationale: "The committee backed the bill.",
    provenance: AUTHORED,
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: `${key}:calendar`,
    measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(world, measureId).earliestNextFloorDate;
    if (until && world.currentDate < until)
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, until),
        createFutureTransitionHandlerRegistry([]),
      );
    world = takeFloorVote(world, {
      stableKey: `${key}:${stage.stageKey}`,
      measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  }
  world = enrollMeasure(world, { stableKey: `${key}:enroll`, measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: `${key}:present`,
    measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: `${key}:governor`,
    measureId,
    action: "signed",
    rationale: "The Governor signed it.",
  });
  world = recordEnactment(world, {
    stableKey: `${key}:enactment`,
    measureId,
    actDesignation: "LB 910, 2026",
    effectiveAt: addDays(opened, 45),
  });
  return { world, measureId };
}

/**
 * Runs the district's fall count on each of the next `falls` count days.
 * Only the calendar moves; the world's other due items are not run here.
 */
function runFalls(start: World, town: EntityId, falls: number): World {
  let world = start;
  withWorldIntegrityDeferred(() => {
    for (let fall = 0; fall < falls; fall += 1) {
      const due = world.history.futureDueItems
        .filter(
          (item) =>
            item.transitionKey === SCHOOL_DISTRICT_COUNT_TRANSITION_KEY &&
            item.jurisdictionId === town &&
            item.dueAt > world.currentDate,
        )
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]!;
      world = schoolDistrictCountHandler(
        {
          ...world,
          currentDate: due.dueAt,
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            due.dueAt,
          ),
        },
        due,
      ).world;
    }
  });
  return world;
}

function bySchoolYear(
  world: World,
  town: EntityId,
): ReadonlyMap<string, SchoolDistrictYearRecord> {
  const districtId = townSchoolDistrictId(world, town)!;
  return new Map(
    schoolDistrictYears(world, districtId).map((row) => [row.schoolYear, row]),
  );
}

describe(
  "a state class-size law hires teachers, and scores follow through the outcome web",
  { timeout: 600_000 },
  () => {
    it("Nebraska caps classes; each fall Omaha's district hires to the cap and names the law", () => {
      const { world: opened, player, town } = openOmaha();
      const first = bySchoolYear(opened, town).values().next().value!;
      expect(first.classSizeLaw ?? null).toBeNull();
      expect(first.proficiencyPct).not.toBeNull();
      // Classes of 6: this small town sample already staffs a cap of 17, so
      // only a cap this low asks it for more teachers.
      const cap = 6;
      const { world: enacted, measureId } = enactClassSizeCap(
        opened,
        player,
        cap,
      );
      const control = bySchoolYear(runFalls(opened, town, 5), town);
      const lawWorld = runFalls(enacted, town, 5);
      const underLaw = bySchoolYear(lawWorld, town);

      const years = [...underLaw.keys()].slice(1);
      expect(years).toHaveLength(5);
      const firstFall = underLaw.get(years[0]!)!;
      expect(firstFall.classSizeLaw).toEqual({
        measureId,
        designation: "LB 910, 2026",
        maximum: cap,
      });
      const hired = firstFall.causes.find(
        (cause) => cause.kind === "class-size-law",
      );
      expect(hired).toMatchObject({ measureId });
      expect(hired!.change).toBeGreaterThan(0);

      for (const year of years) {
        const withLaw = underLaw.get(year)!;
        const without = control.get(year)!;
        // The law's classes are smaller than the same fall without it...
        expect(withLaw.teachers).toBeGreaterThan(without.teachers);
        expect(withLaw.studentsPerTeacher!).toBeLessThan(
          without.studentsPerTeacher!,
        );
        expect(without.classSize).toBe(21);
        expect(withLaw.classSize!).toBeLessThan(21);
        // ...and the smaller classes carry into the share at grade level,
        // through the one link, reading this fall's own ratio.
        expect(withLaw.proficiencyPct!).toBeGreaterThan(
          without.proficiencyPct!,
        );
        const link = withLaw.proficiencyCauses!.find(
          (cause) => cause.key === "class-size-to-scores",
        )!;
        expect(link.causeValue).toBe(withLaw.classSize);
        expect(withLaw.proficiencyPct).toBeCloseTo(
          PROFICIENT_BASE_PCT *
            withLaw.proficiencyCauses!.reduce((p, c) => p * c.factor, 1),
          1,
        );
        // What the town could not staff is counted, never hidden.
        expect(withLaw.teacherVacancies).toBeGreaterThanOrEqual(0);
      }

      // Families at a school that gained a teacher the law asked for heard
      // about it as a public service, from the count that shows it.
      const exposures = (lawWorld.history.lawExposures ?? []).filter(
        (row) => row.measureId === measureId,
      );
      expect(exposures.length).toBeGreaterThan(0);
      for (const row of exposures) {
        expect(row.channel).toBe("public-service");
        expect(row.direction).toBe("none");
        expect(row.amount).toBeNull();
      }
    });

    it("a cap the town already staffs hires nobody, and its classes read the cap", () => {
      const { world: opened, player, town } = openOmaha();
      const { world: enacted, measureId } = enactClassSizeCap(
        opened,
        player,
        17,
      );
      const years = [
        ...bySchoolYear(runFalls(enacted, town, 2), town).values(),
      ];
      for (const year of years.slice(1)) {
        expect(year.classSizeLaw).toMatchObject({ measureId, maximum: 17 });
        expect(year.causes.some((c) => c.kind === "class-size-law")).toBe(
          false,
        );
        expect(year.teacherVacancies).toBe(0);
        expect(year.classSize).toBe(17);
        // 4 pupils fewer than 21, at 3% each: 35% becomes 39.2%.
        expect(year.proficiencyPct).toBe(39.2);
      }
    });

    it("one rule for all 56: only Nebraska's places read Nebraska's cap", () => {
      const { world: opened, player } = openOmaha();
      const { world, measureId } = enactClassSizeCap(opened, player, 12);
      const onDate = addDays(opened.currentDate, 60);
      const largest = new Map<string, string>();
      const people = new Map<string, number>();
      for (const pair of PLACE_POPULATION_ROWS.split(";")) {
        const [geoid, count] = pair.split(":") as [string, string];
        const state = geoid.slice(0, 2);
        if ((people.get(state) ?? -1) < Number(count)) {
          people.set(state, Number(count));
          largest.set(state, geoid);
        }
      }
      largest.set("15", "1571550");
      largest.set("72", "7276770");
      for (const [key, , usps] of TERRITORY_PLACE_ROWS)
        if (!largest.has(usps)) largest.set(usps, key);
      expect(largest.size).toBe(56);
      for (const key of largest.values()) {
        const place = lifePlaceByKey(key)!;
        const law = classSizeLawAt(
          world,
          place.context.jurisdiction.id,
          onDate,
        );
        if (place.stateJurisdictionKey === "US-NE")
          expect(law, key).toMatchObject({ measureId, maximum: 12 });
        else expect(law, key).toBeNull();
      }
      // Before its effective date the law is not in force anywhere.
      const omaha = lifePlaceByKey(OMAHA)!.context.jurisdiction.id;
      expect(classSizeLawAt(world, omaha, opened.currentDate)).toBeNull();
    });
  },
);
