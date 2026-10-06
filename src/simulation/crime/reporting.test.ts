import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { describe, expect, it } from "vitest";
import { chooseAdultOption } from "../../presentation/adult-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "../dates";
import { adultLifeSituations } from "../adult-situations";
import {
  CRIME_EVENT_TYPES,
  localCrimeFigures,
  recordSampledCrime,
  sampleMonthlyCrime,
  unreportedOffenseFor,
  type SampledCrime,
} from "./producer";
import { householdMembershipsAt } from "../life-queries";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { ensurePeopleTraits } from "../people-traits";
import { SeededRng } from "../rng";
import { TERRITORY_PLACE_ROWS } from "../territory-places";
import type { EntityId, IsoDate, World } from "../types";
import { advanceWorld, withWorldIntegrityDeferred } from "../world";
import type { CrimeOffense } from "./contract";
import {
  CRIME_REPORTING_VERSION,
  decideReport,
  priorVictimizations,
  reportConsiderations,
  reportLean,
  UNRESEARCHED_REPORTING,
  victimReports,
} from "./reporting";

const LONG = 60_000;

/**
 * Percent of victimizations reported to police, 2022 and 2023 averaged (BJS,
 * Criminal Victimization, 2023, NCJ 309335, table 4). They check the town's
 * totals; they never decide one victim.
 */
const NCVS_REPORTED: Partial<Record<CrimeOffense, number>> = {
  robbery: (0.64 + 0.424) / 2,
  assault: (0.406 + 0.449) / 2,
  burglary: (0.449 + 0.422) / 2,
};

/**
 * Percent of violent victimizations reported to police, by who the offender
 * was to the victim (BJS, Nonfatal Domestic Violence, 2003-2012, NCJ 244697,
 * table 8): family (intimate partners and immediate family 56%, other
 * relatives 49%), acquaintances 39%, strangers 49%.
 */
const NCVS_BY_RELATIONSHIP = {
  family: 0.54,
  acquaintance: 0.39,
  stranger: 0.49,
} as const;

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

const PLACE_SEED = "a131-crime-reporting";
const PLACES = allPlaces();
const PLACE = PLACES[new SeededRng(PLACE_SEED).integer(0, PLACES.length)]!;

function open(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: PLACE,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  return {
    world,
    player: game.playerPersonId,
    town: world.people[game.playerPersonId]!.homeJurisdictionId,
  };
}

/** Every adult who lives in town, in a fixed order. */
function adults(world: World, town: EntityId): EntityId[] {
  return (Object.keys(world.people).sort() as EntityId[]).filter(
    (id) =>
      world.people[id]!.homeJurisdictionId === town &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  );
}

/**
 * Who could have done it to `victim`, by the world's own records: a relative
 * on record, somebody they have shared a moment with, or a stranger.
 */
function possibleRelationships(
  world: World,
  victim: EntityId,
): readonly (keyof typeof NCVS_BY_RELATIONSHIP)[] {
  const kin = new Set<EntityId>();
  for (const row of world.history.kinshipRelationships)
    if (row.personIds.includes(victim))
      for (const id of row.personIds) if (id !== victim) kin.add(id);
  let acquaintance = false;
  for (const row of world.history.relationshipInteractions)
    if (row.personIds.includes(victim))
      for (const id of row.personIds)
        if (id !== victim && !kin.has(id)) acquaintance = true;
  return [
    ...(kin.size > 0 ? (["family"] as const) : []),
    ...(acquaintance ? (["acquaintance"] as const) : []),
    "stranger",
  ];
}

/** The first of the month before the world's own. */
function lastMonth(world: World): IsoDate {
  const thisMonth = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
  return makeIsoDate(`${addDays(thisMonth, -1).slice(0, 7)}-01`);
}

/** An assault against `victim` in the month starting `monthStart`. */
function assaultOn(
  world: World,
  town: EntityId,
  victim: EntityId,
  monthStart: IsoDate,
): SampledCrime {
  const input = {
    offense: "assault" as const,
    jurisdictionId: town,
    targetId: victim,
    victimPersonIds: [victim],
    occurredAt: addDays(monthStart, 9),
  };
  const decision = decideReport(world, input);
  return {
    ...input,
    reported: decision.reported,
    playerChooses: decision.playerChooses,
  };
}

describe(`victims decide whether to report a crime (place ${PLACE}, place seed ${PLACE_SEED})`, () => {
  const first = open("a131-first");

  it("the weights are marked as unresearched placeholders", () => {
    expect(UNRESEARCHED_REPORTING.provenance).toBe("unresearched-blanket-rule");
    expect(UNRESEARCHED_REPORTING.researchQuestions).toContain(
      "why-victims-report-to-police",
    );
  });

  it(
    "the same offense is reported identically across two seeds",
    () => {
      // The victims' temperament on record, so a different seed is the same
      // people; only a drawn decision could then come out differently.
      const victims = adults(first.world, first.town).slice(0, 60);
      const world = ensurePeopleTraits(first.world, victims);
      const town = first.town;
      const other: World = { ...world, seed: "a131-second" };
      let compared = 0;
      for (const victim of victims)
        for (const offense of ["robbery", "assault"] as const) {
          const input = {
            offense,
            jurisdictionId: town,
            occurredAt: world.currentDate,
            targetId: victim,
            victimPersonIds: [victim],
          };
          expect(decideReport(other, input)).toEqual(
            decideReport(world, input),
          );
          compared += 1;
        }
      expect(compared).toBeGreaterThan(0);
    },
    LONG,
  );

  it(
    "knowing the offender is not a weight; shares by relationship sit near the real ones",
    () => {
      const { world, town } = first;
      const groups = {
        family: { victims: 0, reported: 0 },
        acquaintance: { victims: 0, reported: 0 },
        stranger: { victims: 0, reported: 0 },
      };
      for (const victim of adults(world, town)) {
        const prefix = `${CRIME_REPORTING_VERSION}:test:${victim}`;
        // Nothing in the weighing reads who did it.
        expect(
          reportConsiderations(
            world,
            victim,
            "assault",
            world.currentDate,
            prefix,
          ).map((row) => row.stableKey.slice(prefix.length + 1)),
        ).not.toContain("tie");
        // So the same victim decides the same whoever did it, and each
        // victim counts once for every kind of person who could have.
        const reported = victimReports(world, {
          victimId: victim,
          offense: "assault",
          occurredAt: world.currentDate,
          targetId: victim,
        });
        for (const key of possibleRelationships(world, victim)) {
          groups[key].victims += 1;
          if (reported) groups[key].reported += 1;
        }
      }
      console.info(`A131 ${PLACE}: assault reported by relationship`, groups);
      let checked = 0;
      for (const [key, group] of Object.entries(groups)) {
        // A group of fewer than thirty has a sampling error near ten points
        // on its own; it is logged above, not checked.
        if (group.victims < 30) continue;
        const share = group.reported / group.victims;
        const real =
          NCVS_BY_RELATIONSHIP[key as keyof typeof NCVS_BY_RELATIONSHIP];
        expect(
          Math.abs(share - real),
          `${key} ${share} against ${real}`,
        ).toBeLessThan(0.2);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    },
    LONG,
  );

  it(
    "an offense that happened to them before argues for reporting this one",
    () => {
      const { world, town } = first;
      const victims = adults(world, town).filter((id) => id !== first.player);
      const month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
      const earlier = makeIsoDate(`${addDays(month, -40).slice(0, 7)}-01`);
      const before = withWorldIntegrityDeferred(() => {
        let next = world;
        for (const victim of victims)
          next = recordSampledCrime(next, earlier, {
            ...assaultOn(world, town, victim, earlier),
            reported: false,
            playerChooses: null,
          });
        return next;
      });
      let reportedOnce = 0;
      let reportedAgain = 0;
      for (const victim of victims) {
        expect(priorVictimizations(before, victim, world.currentDate)).toBe(1);
        expect(priorVictimizations(world, victim, world.currentDate)).toBe(0);
        const prefix = `${CRIME_REPORTING_VERSION}:test:${victim}`;
        const lean = (state: World) =>
          reportLean(
            reportConsiderations(
              state,
              victim,
              "assault",
              world.currentDate,
              prefix,
            ),
          );
        expect(lean(before)).toBeGreaterThan(lean(world));
        const input = {
          victimId: victim,
          offense: "assault" as const,
          occurredAt: world.currentDate,
          targetId: victim,
        };
        if (victimReports(world, input)) reportedOnce += 1;
        if (victimReports(before, input)) reportedAgain += 1;
      }
      console.info(
        `A131 ${PLACE}: ${victims.length} adults, assault reported ${reportedOnce} first time, ${reportedAgain} after an earlier one`,
      );
      expect(reportedAgain).toBeGreaterThan(reportedOnce);
    },
    LONG,
  );

  it(
    "the town's share reported sits near the real share, by offense",
    () => {
      const { world, town } = first;
      const people = adults(world, town);
      const shares: Record<string, number> = {};
      for (const offense of ["robbery", "assault"] as const) {
        let reported = 0;
        for (const victim of people)
          if (
            decideReport(world, {
              offense,
              jurisdictionId: town,
              occurredAt: world.currentDate,
              targetId: victim,
              victimPersonIds: [victim],
            }).reported
          )
            reported += 1;
        shares[offense] = reported / people.length;
      }
      const homes = new Map<EntityId, EntityId[]>();
      for (const victim of people)
        for (const membership of householdMembershipsAt(world, victim)) {
          const list = homes.get(membership.household.id) ?? [];
          list.push(victim);
          homes.set(membership.household.id, list);
        }
      let reportedHomes = 0;
      for (const [home, victims] of homes)
        if (
          decideReport(world, {
            offense: "burglary",
            jurisdictionId: town,
            occurredAt: world.currentDate,
            targetId: home,
            victimPersonIds: victims,
          }).reported
        )
          reportedHomes += 1;
      shares.burglary = reportedHomes / Math.max(1, homes.size);
      console.info(
        `A131 ${PLACE}: ${people.length} adults, ${homes.size} homes, shares reported`,
        shares,
      );
      for (const [offense, real] of Object.entries(NCVS_REPORTED))
        expect(
          Math.abs(shares[offense]! - real!),
          `${offense} ${shares[offense]} against ${real}`,
        ).toBeLessThan(0.15);
    },
    LONG,
  );

  it(
    "the town's monthly crime carries each victim's own decision",
    () => {
      // Authored long-standing homes supply a completed exposure interval;
      // no incident or researched rate is installed by this reader fixture.
      const scoped = smallWorld({
        place: PLACE,
        people: 40,
        seed: "a131-monthly-recorded-residents",
        date: addDays(first.world.currentDate, -50 * 365),
      });
      let world = scoped.world;
      const provenance = {
        kind: "authored" as const,
        note: "Monthly crime reader fixture homes",
      };
      for (const personId of world.personOrder) {
        const key = `monthly-home:${personId}`;
        world = createHousehold(world, {
          stableKey: key,
          formedAt: world.currentDate,
          label: "Resident home",
          provenance,
        });
        const householdId = world.history.households.at(-1)!.id;
        world = recordHouseholdLocation(world, {
          stableKey: `${key}:location`,
          householdId,
          effectiveAt: world.currentDate,
          jurisdictionId: scoped.jurisdictionId,
          kind: "residence:home",
          label: "Resident home",
          provenance,
          supersedesLocationId: null,
        });
        world = startHouseholdMembership(world, {
          stableKey: `${key}:member`,
          personId,
          householdId,
          startedAt: world.currentDate,
          residenceRole: "primary",
          kind: "resident:member",
          provenance,
        });
      }
      world = ensureWorldStartingConditions(world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        political: generatePoliticalStartingConditions,
      });
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, first.world.currentDate),
      );
      const player = scoped.personId;
      let month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
      const crimes = [];
      for (let index = 0; index < 12; index += 1) {
        const end = makeIsoDate(
          addDays(makeIsoDate(`${addDays(month, 32).slice(0, 7)}-01`), -1),
        );
        if (end > world.currentDate)
          world = advanceWorld(world, daysBetween(world.currentDate, end));
        crimes.push(...sampleMonthlyCrime(world, month));
        month = makeIsoDate(`${addDays(month, 32).slice(0, 7)}-01`);
      }
      for (const crime of crimes) {
        const decision = decideReport(world, crime);
        expect(crime.reported, `${crime.offense} ${crime.targetId}`).toBe(
          decision.reported,
        );
        // The played person is never decided for.
        expect(decision.reportedBy).not.toBe(player);
        expect(crime.playerChooses).toBe(
          !crime.reported && crime.victimPersonIds.includes(player)
            ? player
            : null,
        );
      }
      const reported = crimes.filter((crime) => crime.reported).length;
      console.info(
        `A131 ${PLACE}: ${crimes.length} offenses in twelve months, ${reported} reported`,
      );
      expect(crimes.length).toBeGreaterThan(0);
    },
    LONG,
  );

  it(
    "an offense against the player is the player's own choice: reporting it puts it on the police log",
    () => {
      const { world, town, player } = first;
      const month = lastMonth(world);
      const crime = assaultOn(world, town, player, month);
      // Nobody else it happened to, so nobody decided for the player.
      expect(crime.reported).toBe(false);
      expect(crime.playerChooses).toBe(player);
      const happened = withWorldIntegrityDeferred(() =>
        recordSampledCrime(world, month, crime),
      );
      const offered = adultLifeSituations(happened, {
        personId: player,
        asOfDate: happened.currentDate,
      }).find((situation) => situation.key === "adult.crime-report");
      expect(offered?.prose).toMatch(
        /^You were assaulted in .+ on [A-Z][a-z]+ \d{1,2}, \d{4}\. You have not told the police\.$/,
      );
      expect(offered?.options.map((option) => option.key)).toEqual([
        "report-it",
        "keep-it-to-yourself",
      ]);
      const incident = unreportedOffenseFor(happened, player)!;
      expect(incident.type).toBe(CRIME_EVENT_TYPES.unreported);
      const before = localCrimeFigures(
        happened,
        town,
        month,
        addDays(happened.currentDate, 1),
      ).reported.assault;

      const reported = withWorldIntegrityDeferred(() =>
        chooseAdultOption(happened, {
          personId: player,
          situationKey: "adult.crime-report",
          optionKey: "report-it",
        }),
      );
      const report = reported.history.events.find(
        (event) => event.stableKey === `${incident.stableKey}:reported-later`,
      )!;
      expect(report.type).toBe(CRIME_EVENT_TYPES.reported);
      expect(report.visibility).toBe("public");
      expect(report.occurredAt).toBe(happened.currentDate);
      expect(report.summary).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(
        localCrimeFigures(
          reported,
          town,
          month,
          addDays(reported.currentDate, 1),
        ).reported.assault,
      ).toBe(before + 1);
      // Answered: it is no longer put to them, and nothing is left open.
      expect(unreportedOffenseFor(reported, player)).toBeNull();
      expect(
        adultLifeSituations(reported, {
          personId: player,
          asOfDate: reported.currentDate,
        }).map((situation) => situation.key),
      ).not.toContain("adult.crime-report");
      // The offense is still on record once against its victim.
      expect(priorVictimizations(reported, player, addDays(month, 40))).toBe(1);
    },
    LONG,
  );

  it(
    "keeping it to themselves leaves it off the police log",
    () => {
      const { world, town, player } = first;
      const month = lastMonth(world);
      const happened = withWorldIntegrityDeferred(() =>
        recordSampledCrime(world, month, assaultOn(world, town, player, month)),
      );
      const quiet = withWorldIntegrityDeferred(() =>
        chooseAdultOption(happened, {
          personId: player,
          situationKey: "adult.crime-report",
          optionKey: "keep-it-to-yourself",
        }),
      );
      expect(
        quiet.history.events.filter(
          (event) =>
            event.type === CRIME_EVENT_TYPES.reported &&
            event.tags.includes("crime:reported-later"),
        ),
      ).toEqual([]);
      expect(
        adultLifeSituations(quiet, {
          personId: player,
          asOfDate: quiet.currentDate,
        }).map((situation) => situation.key),
      ).not.toContain("adult.crime-report");
    },
    LONG,
  );
});
