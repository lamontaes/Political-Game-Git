import { enterSupportedTerm } from "../../tests/fixtures/recorded-legislative-term";
import { describe, expect, it } from "vitest";

import {
  EPISODE_FAMILIES,
  activeWorkRelationshipsAt,
  advanceWorld,
  campaignForCandidate,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  electionContestResult,
  eligibleEpisodeBeats,
  requireLifePlace,
  serializeWorld,
  type World,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
} from "./life-story";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { openLegislativeWork } from "./legislation-world";

function filedLife(seed = "p85c-owner-clock") {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  const world = fileForOffice(
    openOrdinaryLife(built.world, personId),
    personId,
  );
  return { world, personId };
}

function expectResolvedOnce(before: World, after: World, personId: string) {
  const campaign = campaignForCandidate(before, personId)!;
  expect(electionContestResult(after, campaign.contestId)).toBeDefined();
  expect(
    after.history.electionContestResults?.filter(
      (result) => result.contestId === campaign.contestId,
    ),
  ).toHaveLength(1);
  expect(after.currentDate > before.currentDate).toBe(true);
  expect(after.people[personId]).toStrictEqual(before.people[personId]);
  const later = letStoryTimePass(
    deserializeWorld(serializeWorld(after)),
    personId,
  );
  expect(later.currentDate > after.currentDate).toBe(true);
  expect(later.history.electionContestResults).toStrictEqual(
    after.history.electionContestResults,
  );
}

/**
 * Quiet stretches until the contest is decided. One stretch used to run the
 * whole four weeks; it now stops on the morning of each meeting and campaign
 * shift on the calendar first.
 */
function quietUntilDecided(world: World, personId: string): World {
  const campaign = campaignForCandidate(world, personId)!;
  let current = world;
  for (let step = 0; step < 20; step += 1) {
    if (electionContestResult(current, campaign.contestId)) break;
    current = letStoryTimePass(current, personId);
  }
  return current;
}

describe("every adult story route carries the world's pending election", () => {
  it("resolves it while quiet time passes", () => {
    const life = filedLife();
    expectResolvedOnce(
      life.world,
      quietUntilDecided(life.world, life.personId),
      life.personId,
    );
  });

  it("a free ordinary choice leaves it pending, then explicit time dispatches it", () => {
    const life = filedLife();
    const scene = projectStoryMoment(life.world, life.personId).scene;
    expect(scene.kind).toBe("adult");
    const next = chooseStoryOption(life.world, {
      personId: life.personId,
      scene,
      optionKey: scene.options[0]!.key,
    });
    expect(next.currentMoment).toEqual(life.world.currentMoment);
    expect(
      electionContestResult(
        next,
        campaignForCandidate(next, life.personId)!.contestId,
      ),
    ).toBeNull();
    expectResolvedOnce(
      next,
      quietUntilDecided(next, life.personId),
      life.personId,
    );
    expect(next.history.events.length).toBeGreaterThan(
      life.world.history.events.length,
    );
  });

  it("a free canonical episode choice leaves it pending, then explicit time dispatches it", () => {
    const life = filedLife();
    const beat = eligibleEpisodeBeats({
      world: life.world,
      personId: life.personId,
      families: EPISODE_FAMILIES,
    }).beats[0]!;
    expect(beat).toBeDefined();
    const next = chooseStoryOption(life.world, {
      personId: life.personId,
      scene: {
        kind: "episode",
        beat,
        prose: beat.prose,
        options: beat.options,
        withPeople: [],
        presentPeople: [],
      },
      optionKey: beat.options[0]!.key,
    });
    expect(next.currentMoment).toEqual(life.world.currentMoment);
    expect(
      electionContestResult(
        next,
        campaignForCandidate(next, life.personId)!.contestId,
      ),
    ).toBeNull();
    expectResolvedOnce(
      next,
      quietUntilDecided(next, life.personId),
      life.personId,
    );
  });
});

describe("a state office does not move its winner's home", () => {
  it("seats the Lexington winner in Kentucky and opens that legislature after reload", () => {
    const life = filedLife("p85c-owner-0");
    const residence = requireLifePlace("lexington-fayette");
    const state = requireLifePlace("kentucky");
    const earlier = life.world.history;
    let world = spendAnAfternoon(life.world, life.personId, "fundraising");
    // Since CRUNCH46 the rival campaigns every week too, so three afternoons
    // no longer carry this seat. Advancing a whole day at a time drifts the
    // clock past the afternoon after four days, so each day opens through the
    // ordinary-day path instead; six such days are the fewest that still win
    // (five lose).
    for (let day = 0; day < 6; day += 1) {
      world = passOrdinaryDays(world, 1);
      const outreach = projectCampaign(world, life.personId).offers.find(
        (offer) => offer.kind === "outreach",
      );
      // A day whose afternoon is already spoken for is simply skipped.
      if (outreach && outreach.unavailable === null)
        world = spendAnAfternoon(world, life.personId, "outreach");
    }
    for (
      let day = 0;
      day < 35 && projectCampaign(world, life.personId).phase === "active";
      day += 1
    ) {
      world = advanceWorld(
        world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
    }
    expect(projectCampaign(world, life.personId).phase).toBe("won");
    expect(resolvePlayerCapabilities(world).legislation).toBe(false);
    world = deserializeWorld(
      serializeWorld(enterSupportedTerm(world, life.personId)),
    );
    expect(world.people[life.personId]!.homeJurisdictionId).toBe(
      residence.context.jurisdiction.id,
    );
    expect(residence.capabilities.legislativeScenarioKey).toBeNull();
    expect(world.history.householdLocations).toStrictEqual(
      earlier.householdLocations,
    );
    const member = activeWorkRelationshipsAt(world, life.personId).find(
      (work) => work.relationship.kind === "employment:legislative-member",
    )!;
    expect(member.role.locationJurisdictionId).toBe(
      state.context.jurisdiction.id,
    );
    expect(world.jurisdictions[state.context.jurisdiction.id]).toStrictEqual(
      state.context.jurisdiction,
    );
    const capabilities = resolvePlayerCapabilities(world);
    expect(capabilities.legislation).toBe(true);
    expect(capabilities.legislativeScenarioKey).toBe("kentucky");
    expect(capabilities.homePlace?.key).toBe("lexington-fayette");
    const opened = openLegislativeWork(world, {
      playerPersonId: life.personId,
      scenarioKey: capabilities.legislativeScenarioKey!,
      jurisdictionId: capabilities.legislativeJurisdictionId!,
    });
    expect(opened.assignment.measureId).toBeTruthy();
    expect(
      letStoryTimePass(opened.world, life.personId).currentDate >
        world.currentDate,
    ).toBe(true);
  });
});
