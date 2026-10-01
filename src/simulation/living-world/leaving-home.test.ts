import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import { ageOnDate, makeIsoDate } from "../dates";
import {
  createWorkRelationship,
  recordKinship,
  startHouseholdMembership,
} from "../life";
import {
  activeWorkRelationshipsAt,
  householdLocationAt,
  householdMembershipsAt,
} from "../life-queries";
import { causeReader, decideToLeave } from "../migration/causes";
import {
  migrationTown,
  moverDepartureRate,
  reviewTown,
} from "../migration/review";
import { recordedMoves } from "../migration/relocate";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { activeDwellingOccupanciesAt } from "../resource-queries";
import { SeededRng } from "../rng";
import { TERRITORY_PLACE_ROWS } from "../territory-places";
import type { EntityId, World } from "../types";
import { advanceWithWorldIntegrityAtEnd, assertWorldIntegrity } from "../world";
import {
  decideToLeaveHome,
  LEAVING_HOME_EVENT,
  leavingHomeConsiderations,
  UNRESEARCHED_LEAVING_HOME,
  type LeavingHomeFacts,
} from "./leaving-home";
import { TOWN_EMPLOYMENT_VERSION } from "./town-employment";
import { reviewTownFamilies } from "./town-families";
import { reviewTownHomes } from "./town-homes";
import { startTownJobPay } from "./town-pay";
import {
  hudRentRowFor,
  marketRentMinor,
  monthlyPayByPerson,
} from "./town-rent";

const LONG = 60_000;

/**
 * Share of young adults living in a parent's home (Census Bureau, Current
 * Population Survey, "Living Arrangements Varied Across Age Groups", May
 * 2024, 2022 figures, men and women averaged; college dorms count as the
 * parental home). They check the town's totals; they never decide one person.
 */
const CPS_AT_HOME = { "18-24": 0.56, "25-34": 0.155 } as const;

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function allPlaces(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

const PLACES = allPlaces();
const placeFor = (seed: string) =>
  PLACES[new SeededRng(seed).integer(0, PLACES.length)]!;

const PLACE_SEED = "a135-new-household";
const PLACE = placeFor(PLACE_SEED);
/** Two more places, for a watched year of every cause. */
const YEAR_SEEDS = ["a135-new-household-year-1", "a135-new-household-year-2"];

/**
 * The world as its first quarterly review finds it: the first paydays have
 * put everyone's town pay on record (`startTownJobPay`).
 */
function openAtFirstReview(seed: string, place: string) {
  const opened = openObserverWorld(observerSetup(seed, place)).world;
  const world = startTownJobPay(opened, null, opened.currentDate);
  return { world, town: migrationTown(world)! };
}

function primaryHome(world: World, personId: EntityId) {
  return householdMembershipsAt(world, personId).find(
    (entry) => entry.state.residenceRole === "primary",
  );
}

function band(age: number): keyof typeof CPS_AT_HOME | null {
  if (age >= 18 && age <= 24) return "18-24";
  if (age >= 25 && age <= 34) return "25-34";
  return null;
}

const POINTS = { slight: 1, moderate: 2, strong: 4, decisive: 6 } as const;
const CERTAINTY = { low: 1, medium: 2, high: 3 } as const;

describe(`a new household forms only from a recorded cause (A135; place ${PLACE}, place seed ${PLACE_SEED})`, () => {
  const { world: opened, town } = openAtFirstReview(PLACE_SEED, PLACE);
  const today = opened.currentDate;

  it("the weights are marked as unresearched placeholders", () => {
    expect(UNRESEARCHED_LEAVING_HOME.provenance).toBe(
      "unresearched-blanket-rule",
    );
    expect(UNRESEARCHED_LEAVING_HOME.researchQuestions).toContain(
      "why-young-adults-leave-home",
    );
  });

  it(
    "age, pay against the rent and a partner slide the weighing; no pay weighs for staying",
    () => {
      const person = opened.personOrder.find(
        (id) =>
          opened.people[id]!.homeJurisdictionId === town &&
          ageOnDate(opened.people[id]!.birthDate, today) >= 18,
      )!;
      const lean = (facts: LeavingHomeFacts) =>
        leavingHomeConsiderations(opened, person, facts, "test").reduce(
          (sum, row) =>
            sum +
            (row.optionKey === "own-home" ? 1 : -1) *
              POINTS[row.importance] *
              CERTAINTY[row.confidence],
          0,
        );
      const base: LeavingHomeFacts = {
        age: 22,
        payMinor: 300_000,
        rentForOneMinor: 120_000,
        partnerElsewhere: false,
      };
      expect(lean({ ...base, age: 29 })).toBeGreaterThan(lean(base));
      expect(lean({ ...base, payMinor: 500_000 })).toBeGreaterThan(lean(base));
      expect(lean({ ...base, partnerElsewhere: true })).toBeGreaterThan(
        lean(base),
      );
      expect(lean({ ...base, payMinor: 0 })).toBeLessThan(lean(base));
      expect(
        decideToLeaveHome(
          opened,
          person,
          { ...base, age: 24, payMinor: 0 },
          "test",
        ).leaves,
      ).toBe(false);
    },
    LONG,
  );

  it(
    "the town's young adults, weighing it with their own age and pay, stay home near the survey's shares",
    () => {
      const pay = monthlyPayByPerson(opened, today);
      const row = hudRentRowFor(town);
      const rentForOneMinor = row
        ? marketRentMinor(opened, town, row, 0, today)
        : null;
      const shares: Record<string, { people: number; stay: number }> = {};
      for (const id of [...opened.personOrder].sort()) {
        const person = opened.people[id]!;
        if (person.homeJurisdictionId !== town) continue;
        const age = ageOnDate(person.birthDate, today);
        const key = band(age);
        if (!key) continue;
        // Their own age and pay, as if they lived with a parent.
        const decision = decideToLeaveHome(
          opened,
          id,
          {
            age,
            payMinor: pay.get(id) ?? 0,
            rentForOneMinor,
            partnerElsewhere: false,
          },
          `test:${id}`,
        );
        shares[key] ??= { people: 0, stay: 0 };
        shares[key].people += 1;
        if (!decision.leaves) shares[key].stay += 1;
      }
      console.info(
        `A135 ${PLACE}: rent for one ${rentForOneMinor} cents; young adults who would stay home, by age`,
        shares,
      );
      let checked = 0;
      for (const [key, real] of Object.entries(CPS_AT_HOME)) {
        const group = shares[key];
        if (!group || group.people < 10) continue;
        expect(
          Math.abs(group.stay / group.people - real),
          `${key} ${group.stay}/${group.people} against ${real}`,
        ).toBeLessThan(0.25);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    },
    LONG,
  );

  it(
    "a grown child with pay of their own moves out into a new household in town, which is then housed and is a cause to move; one with no pay stays",
    () => {
      // The opening writes no grown children at home, so two are written in:
      // the children of a resident in their fifties, living in that home.
      const parent = [...opened.personOrder].sort().find((id) => {
        const person = opened.people[id]!;
        const age = ageOnDate(person.birthDate, today);
        return (
          person.homeJurisdictionId === town &&
          age >= 50 &&
          age <= 58 &&
          primaryHome(opened, id) !== undefined
        );
      })!;
      expect(parent).toBeDefined();
      const parentPerson = opened.people[parent]!;
      const home = primaryHome(opened, parent)!;
      const born = makeIsoDate(
        `${Number(parentPerson.birthDate.slice(0, 4)) + 25}${parentPerson.birthDate.slice(4)}`,
      );
      const provenance = { kind: "authored" as const, note: "A135 test" };
      let world = createCharacterHistoryContextPeople(opened, [
        {
          stableKey: "a135:grown-working",
          givenName: "Dana",
          familyName: parentPerson.familyName,
          birthDate: born,
          homeJurisdictionId: town,
        },
        {
          stableKey: "a135:grown-idle",
          givenName: "Robin",
          familyName: parentPerson.familyName,
          birthDate: born,
          homeJurisdictionId: town,
        },
      ]);
      const working = characterHistoryContextPersonId(
        world,
        "a135:grown-working",
      );
      const idle = characterHistoryContextPersonId(world, "a135:grown-idle");
      for (const child of [working, idle]) {
        world = recordKinship(world, {
          stableKey: `a135:kin:${child}`,
          personIds: [parent, child],
          establishedAt: born,
          kind: "lineal:parent-child",
          provenance,
        });
        world = startHouseholdMembership(world, {
          stableKey: `a135:home:${child}`,
          personId: child,
          householdId: home.household.id,
          startedAt: home.membership.startedAt,
          residenceRole: "primary",
          kind: "resident:child",
          provenance,
        });
      }
      // The working one holds the same town job a neighbor holds, paid by
      // the town's own pay rules.
      const template =
        activeWorkRelationshipsAt(world, parent)[0] ??
        world.personOrder
          .flatMap((id) => activeWorkRelationshipsAt(world, id))
          .find((row) => row.relationship.organizationId !== null)!;
      world = createWorkRelationship(world, {
        stableKey: `${TOWN_EMPLOYMENT_VERSION}:a135-test:${working}:work`,
        personId: working,
        organizationId: template.relationship.organizationId,
        startedAt: today,
        kind: template.relationship.kind,
        compensation: "paid",
        authority: template.relationship.authority,
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance,
        initialRole: {
          title: template.role.title,
          occupationClassification: template.role.occupationClassification,
          locationJurisdictionId: town,
          timeDemand: template.role.timeDemand,
        },
      });
      world = startTownJobPay(world, null, today);
      expect(monthlyPayByPerson(world, today).get(working)).toBeGreaterThan(0);

      const reviewed = advanceWithWorldIntegrityAtEnd(() =>
        reviewTownFamilies(world, town, null, "a135-test"),
      );
      assertWorldIntegrity(reviewed);
      const left = reviewed.history.events.filter(
        (event) => event.type === LEAVING_HOME_EVENT,
      );
      console.info(
        `A135 ${PLACE}: ${left.map((event) => event.summary).join(" ")}`,
      );
      expect(left.map((event) => event.participants[0]!.personId)).toEqual([
        working,
      ]);
      // The one with no pay stays, in the same home.
      expect(primaryHome(reviewed, idle)!.household.id).toBe(home.household.id);
      const newHome = primaryHome(reviewed, working)!;
      expect(newHome.household.id).not.toBe(home.household.id);
      expect(newHome.membership.startedAt).toBe(today);
      expect(
        householdLocationAt(reviewed, newHome.household.id)?.jurisdictionId,
      ).toBe(town);
      // The same review again writes nothing new.
      expect(reviewTownFamilies(reviewed, town, null, "a135-test")).toBe(
        reviewed,
      );

      // The homes review houses the new household.
      const housed = reviewTownHomes(reviewed, town, "a135-test");
      expect(
        activeDwellingOccupanciesAt(housed).some(
          (row) =>
            row.occupant.kind === "household" &&
            row.occupant.householdId === newHome.household.id,
        ),
      ).toBe(true);

      // And the new household is a recorded cause the migration review weighs.
      const causes = causeReader(housed, town).causesFor(working);
      const formed = causes.find((cause) => cause.kind === "new-household")!;
      expect(formed.causeId).toBe(left[0]!.id);
      expect(formed.reason).toBe("family:new-household");
      expect(
        causeReader(housed, town)
          .causesFor(idle)
          .some((cause) => cause.kind === "new-household"),
      ).toBe(false);
      const decision = decideToLeave(
        housed,
        working,
        "a135-test:leave",
        causes,
        {
          ageMoverRate: moverDepartureRate(null, ageOnDate(born, today)),
          ownsHome: false,
          childrenAtHome: 0,
          townPush: 1,
        },
        { placeId: town, label: "test" },
      );
      console.info(
        `A135 ${PLACE}: with ${causes.map((cause) => cause.explanation).join("; ")}, leaves town: ${decision.leaves}`,
      );
    },
    LONG,
  );

  for (const seed of YEAR_SEEDS) {
    const place = placeFor(seed);
    it(
      `a watched year in ${place} (seed ${seed}): every new-household move names the household it formed, counted beside the job offers`,
      () => {
        const { world, town: yearTown } = openAtFirstReview(seed, place);
        let year = world;
        for (let quarter = 0; quarter < 4; quarter += 1)
          year = advanceWithWorldIntegrityAtEnd(() => {
            const moved = reviewTown(year, quarter, {
              arrivalsPerResidentPerYear: 0,
            });
            const families = reviewTownFamilies(
              moved,
              yearTown,
              null,
              String(quarter),
            );
            return reviewTownHomes(families, yearTown, String(quarter));
          });
        assertWorldIntegrity(year);
        const adults = world.personOrder.filter((id) => {
          const person = world.people[id]!;
          return (
            person.homeJurisdictionId === yearTown &&
            ageOnDate(person.birthDate, world.currentDate) >= 18
          );
        });
        const moves = recordedMoves(year);
        const movedBy = (reason: string) =>
          new Set(
            moves
              .filter((move) => move.reason === reason)
              .flatMap((move) => move.personIds)
              .filter((id) => adults.includes(id)),
          ).size;
        for (const move of moves.filter(
          (row) => row.reason === "family:new-household",
        )) {
          const cause = year.history.events.find(
            (event) => event.id === move.causeId,
          )!;
          expect(cause, `move ${move.eventId}`).toBeDefined();
          expect([
            LEAVING_HOME_EVENT,
            "life.moved-in-together",
            "life.broke-up",
            "life.divorced",
          ]).toContain(cause.type);
        }
        const left = adults.filter(
          (id) => year.people[id]!.homeJurisdictionId !== yearTown,
        ).length;
        const survey =
          adults.reduce(
            (sum, id) =>
              sum +
              moverDepartureRate(
                null,
                ageOnDate(world.people[id]!.birthDate, world.currentDate),
              ),
            0,
          ) / adults.length;
        const formed = year.history.events.filter((event) =>
          [
            LEAVING_HOME_EVENT,
            "life.moved-in-together",
            "life.broke-up",
            "life.divorced",
          ].includes(event.type),
        ).length;
        const pct = (n: number) => ((100 * n) / adults.length).toFixed(1);
        console.info(
          `A135 year, ${place} (seed ${seed}): ${adults.length} adults; ${formed} households formed or joined; moved for a new household ${movedBy("family:new-household")} (${pct(movedBy("family:new-household"))}%), for a job offer ${movedBy("work:job-offer")} (${pct(movedBy("work:job-offer"))}%); all who left ${left} (${pct(left)}%) against the survey's ${(100 * survey).toFixed(1)}% for their ages (national rates)`,
        );
        expect(left).toBeLessThanOrEqual(adults.length);
      },
      LONG,
    );
  }
});
