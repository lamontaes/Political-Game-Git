import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  activeWorkRelationshipsAt,
  organizationClosingAt,
  organizationProfileAt,
} from "../../src/simulation/life-queries";
import {
  TOWN_BUSINESS_CLOSING_REASONS,
  TOWN_BUSINESS_WORKPLACES,
  TOWN_CLUB_PROFILE,
  TOWN_CONGREGATION_PROFILE,
  describeTownBusinesses,
  reviewTownBusinesses,
  reviewTownGroups,
  townGroups,
  townBusinesses,
} from "../../src/simulation/living-world/town-businesses";
import { TOWN_JOB_END_REASONS } from "../../src/simulation/living-world/town-labor-market";
import { reviewTownJobs } from "../../src/simulation/living-world/town-labor-market";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import { openingTakesApplications } from "../../src/simulation/job-market";
import type { JobOpeningRecord } from "../../src/simulation/types";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { townWorkplaceWeights } from "../../src/simulation/living-world/town-employment";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import type { World } from "../../src/simulation";

const QUARTERS = 20;

function openAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const personId = game.playerPersonId;
  return { world, personId, town: world.people[personId]!.homeJurisdictionId };
}

/**
 * Five years of quarterly business and job reviews, on the calendar only.
 * The whole-world check is deferred because the world's other due items are
 * not run here; the watched-world report runs these reviews on the real clock.
 */
function fiveYears(placeKey: string) {
  const opened = openAt(placeKey, `businesses-${placeKey}`);
  const { personId, town } = opened;
  const start = opened.world.currentDate;
  let world: World = opened.world;
  const before = townBusinesses(world, town).length;
  withWorldIntegrityDeferred(() => {
    for (let round = 0; round < QUARTERS; round += 1) {
      const date = addDays(world.currentDate, 91);
      world = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      world = reviewTownBusinesses(world, town, personId, `test-${round}`);
      world = reviewTownJobs(world, town, personId, `test-${round}`);
    }
  });
  return { world, town, start, before, personId };
}

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly string[] {
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

describe("one rule for businesses everywhere", () => {
  it("every one of the 50 states, D.C. and the 5 territories has businesses that can open", () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    for (const key of places) {
      const place = lifePlaceByKey(key)!;
      const kinds = [
        ...townWorkplaceWeights(place.context.jurisdiction.id),
      ].filter(
        ([kind, weight]) => weight > 0 && TOWN_BUSINESS_WORKPLACES.has(kind),
      );
      expect(kinds.length, key).toBeGreaterThan(3);
    }
  });
});

describe("the town's businesses open and close", { timeout: 600_000 }, () => {
  for (const [name, placeKey] of [
    ["Columbus, Ohio", "3918000"],
    ["Belzoni, Mississippi", "2805140"],
  ] as const) {
    it(`${name}: about as many open as close over five years`, () => {
      const { world, town, start, before } = fiveYears(placeKey);
      const summary = describeTownBusinesses(world, town, start);
      expect(before).toBeGreaterThan(5);
      expect(summary.closed, JSON.stringify(summary)).toBeGreaterThan(0);
      expect(summary.opened).toBeGreaterThan(0);
      // 11.6% a year each way over five years is about 58% of the town's
      // businesses; well inside twice that either way.
      const rate = (summary.opened + summary.closed) / 2 / before / 5;
      expect(rate, JSON.stringify(summary)).toBeGreaterThan(0.116 / 2.5);
      expect(rate, JSON.stringify(summary)).toBeLessThan(0.116 * 2.5);
      expect(summary.open).toBeGreaterThan(before / 2);

      // Everybody who worked at a closed business lost that job the day it
      // closed, and nobody works there afterwards.
      for (const profile of world.history.organizationProfiles) {
        if (!profile.closed) continue;
        expect(Object.values(TOWN_BUSINESS_CLOSING_REASONS)).toContain(
          profile.closed.reason,
        );
        expect(organizationClosingAt(world, profile.organizationId)).toBe(
          profile,
        );
        for (const id of world.personOrder)
          for (const job of activeWorkRelationshipsAt(world, id))
            expect(job.relationship.organizationId).not.toBe(
              profile.organizationId,
            );
      }
      // A closed business takes no job applications, whatever its listing says.
      for (const profile of world.history.organizationProfiles)
        if (profile.closed)
          expect(
            openingTakesApplications(world, {
              id: `opening:${profile.organizationId}`,
              organizationId: profile.organizationId,
              opensAt: start,
              closesAt: addDays(world.currentDate, 30),
            } as unknown as JobOpeningRecord),
          ).toBe(false);
      expect(
        world.history.workStatuses.filter(
          (row) => row.reason === TOWN_JOB_END_REASONS.businessClosed,
        ).length,
      ).toBe(summary.jobsLost);
      // A business opened is run by somebody from town.
      for (const business of townBusinesses(world, town))
        if (business.outlet >= business.workplace.outlets)
          expect(
            organizationProfileAt(world, business.organizationId)?.name,
          ).toBeTruthy();
    });
  }

  it("a review run twice writes nothing new", () => {
    const { world, town, personId } = fiveYears("2146027");
    expect(reviewTownBusinesses(world, town, personId, "test-19")).toBe(world);
  });
});

describe(
  "the town's congregations and clubs disband and are founded",
  {
    timeout: 600_000,
  },
  () => {
    it("over a long run, a disbanded one's members and staff leave with it", () => {
      const opened = openAt("2146027", "congregations-lexington");
      const { personId, town } = opened;
      let world: World = opened.world;
      // A century of quarters, so rates of about 1% a year show.
      withWorldIntegrityDeferred(() => {
        for (let round = 0; round < 400; round += 1) {
          const date = addDays(world.currentDate, 91);
          world = {
            ...world,
            currentDate: date,
            currentMoment: simulationMomentOnLocalDate(
              world.currentMoment,
              date,
            ),
          };
          world = reviewTownGroups(world, town, personId, `c-${round}`);
        }
      });
      const closings = world.history.organizationProfiles.filter(
        (profile) =>
          profile.closed?.reason === TOWN_CONGREGATION_PROFILE.closingReason,
      );
      const founded = world.history.organizations.filter((organization) =>
        organization.stableKey.endsWith(":congregation:founded"),
      );
      expect(closings.length).toBeGreaterThan(0);
      expect(founded.length).toBeGreaterThan(0);
      const latest = new Map<string, string>();
      for (const state of world.history.organizationParticipationStates)
        latest.set(state.participationId, state.status);
      for (const closing of closings) {
        for (const participation of world.history.organizationParticipations)
          if (participation.organizationId === closing.organizationId)
            expect(latest.get(participation.id)).toBe("ended");
        for (const id of world.personOrder)
          for (const job of activeWorkRelationshipsAt(world, id))
            expect(job.relationship.organizationId).not.toBe(
              closing.organizationId,
            );
      }
      // Clubs are founded and disband by the same rule, up to five at once.
      const clubs = world.history.organizations.filter((organization) =>
        organization.stableKey.endsWith(":club:founded"),
      );
      expect(clubs.length).toBeGreaterThan(0);
      expect(
        world.history.organizationProfiles.some(
          (profile) =>
            profile.closed?.reason === TOWN_CLUB_PROFILE.closingReason,
        ),
      ).toBe(true);
      expect(
        townGroups(world, town, TOWN_CLUB_PROFILE).length,
      ).toBeLessThanOrEqual(TOWN_CLUB_PROFILE.most);
      // Every founded congregation starts with members from town.
      for (const organization of founded)
        expect(
          world.history.organizationParticipations.filter(
            (row) => row.organizationId === organization.id,
          ).length,
        ).toBeGreaterThanOrEqual(10);
    });
  },
);
