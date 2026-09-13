import { describe, expect, it } from "vitest";

import {
  advanceWorldMinutes,
  assertWorldIntegrity,
  buildAdultLifeContext,
  availableAdultSituations,
  campaignForCandidate,
  deserializeWorld,
  electionContestResult,
  lifeOpportunitiesFor,
  refreshLifeOpportunities,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { chooseAdultOption, letAdultTimePass } from "./adult-life";

import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
} from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife, projectOrdinaryDay } from "./ordinary-life";
import { fixture as p2r1Fixture } from "../../tests/support/p2r1-worlds";

/**
 * The audited collapse, and the route out of it.
 *
 * P2A2 reproduced an adult life that ran out. One hundred and fifty-one
 * minutes finished the week's errands; both remaining scenes went with it;
 * another six hundred minutes and another five thousand brought nothing back;
 * and a normal browser route reached "Let the weeks run on" with no scene and
 * no choices for the rest of the character's existence.
 *
 * Every claim in that paragraph is reproduced here against the current tree,
 * and then answered. Nothing below relaxes an assertion, substitutes a seed or
 * shortens a route: they are the same worlds, played further.
 */

function newLife(overrides: Partial<NewGameSetup> = {}): {
  world: World;
  personId: EntityId;
} {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 34,
    placeKey: "lexington-fayette",
    questionnaire: "skipped",
    priors: [],
    seed: "p2r2-sustained",
    ...overrides,
  } as NewGameSetup);
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

/** Plays the story surface the way the browser does, taking the first option. */
function playThrough(
  start: World,
  personId: EntityId,
  beats: number,
): { world: World; scenes: string[]; quiet: number } {
  let world = start;
  const scenes: string[] = [];
  let quiet = 0;
  for (let beat = 0; beat < beats; beat += 1) {
    const moment = projectStoryMoment(world, personId);
    const scene = moment.scene;
    if (scene.kind === "ordinary-stretch") quiet += 1;
    else {
      scenes.push(
        scene.kind === "adult"
          ? scene.situationKey
          : scene.kind === "episode"
            ? scene.beat.stageKey
            : scene.situationKey,
      );
    }
    const option = scene.options[0];
    if (!option) break;
    world = chooseStoryOption(world, {
      personId,
      scene,
      optionKey: option.key,
    });
  }
  return { world, scenes, quiet };
}

describe("the week runs out, and the life does not", () => {
  /** The audited world, unchanged: P2R1's own minimal-premise fixture. */
  function audited() {
    const built = p2r1Fixture();
    return {
      world: refreshLifeOpportunities(built.world, built.personId),
      personId: built.personId,
    };
  }

  it("still reproduces the empty bank the moment the errands are finished", () => {
    const { world, personId } = audited();
    expect(buildAdultLifeContext(world, personId).hasHouseholdWorkItem).toBe(
      true,
    );
    // The audited step, unchanged: 151 minutes against a 150-minute item.
    const finished = advanceWorldMinutes(world, 151);
    assertWorldIntegrity(finished);
    const context = buildAdultLifeContext(finished, personId);
    expect(context.hasHouseholdWorkItem).toBe(false);
    const offered = availableAdultSituations(context).map((s) => s.key);
    expect(offered).not.toContain("adult.household-standing");
    expect(offered).not.toContain("adult.ordinary-good-day");
  });

  it("leaves that same world with somewhere to go anyway", () => {
    const { world, personId } = audited();
    const finished = advanceWorldMinutes(world, 151);
    // The two household scenes are genuinely gone, and the life is not: the
    // requests somebody actually made are still open and still answerable.
    const offered = availableAdultSituations(
      buildAdultLifeContext(finished, personId),
    );
    expect(offered.length).toBeGreaterThan(0);
    for (const situation of offered) {
      expect(situation.opportunity).toBeDefined();
    }
    expect(projectStoryMoment(finished, personId).scene.kind).not.toBe(
      "ordinary-stretch",
    );
  });

  it("gives the household its next week back once a week has gone by", () => {
    const { world, personId } = audited();
    const finished = advanceWorldMinutes(world, 151);
    expect(buildAdultLifeContext(finished, personId).hasHouseholdWorkItem).toBe(
      false,
    );
    // Not immediately — the shopping is not done twice on the same day — and
    // not never, which is what the audit found.
    const sameDay = refreshLifeOpportunities(finished, personId);
    expect(buildAdultLifeContext(sameDay, personId).hasHouseholdWorkItem).toBe(
      false,
    );
    // The audited fixture is an observer world, so the transition has to be
    // named rather than inferred from who is playing. A played world reaches
    // the same call through `letAdultTimePass`, which the routes below use.
    const laterOn = refreshLifeOpportunities(
      letAdultTimePass(finished, 8),
      personId,
    );
    assertWorldIntegrity(laterOn);
    expect(buildAdultLifeContext(laterOn, personId).hasHouseholdWorkItem).toBe(
      true,
    );
    expect(
      projectOrdinaryDay(laterOn, personId).pending.length,
    ).toBeGreaterThan(0);
    const offered = availableAdultSituations(
      buildAdultLifeContext(laterOn, personId),
    ).map((s) => s.key);
    expect(offered).toContain("adult.ordinary-good-day");
  });

  it("answers the audited six hundred and five thousand minutes", () => {
    const { world, personId } = audited();
    let current = advanceWorldMinutes(world, 151);
    for (const minutes of [600, 5_000]) {
      current = advanceWorldMinutes(current, minutes);
      assertWorldIntegrity(current);
    }
    // Minutes alone still write nothing — a clock is not a transition, and
    // that part of the audit's reasoning was right.
    expect(lifeOpportunitiesFor(current, personId).length).toBeGreaterThan(0);
    // And the ordinary week comes back through the route a player takes.
    const played = refreshLifeOpportunities(
      letAdultTimePass(current, 21),
      personId,
    );
    expect(buildAdultLifeContext(played, personId).hasHouseholdWorkItem).toBe(
      true,
    );
  });
});

describe("a normal route stays a normal route", () => {
  for (const seed of ["p2r2-sustained", "adaptive-life-test", "p1-quiet"]) {
    it(`keeps offering ${seed} something to decide across a played life`, () => {
      const { world, personId } = newLife({ seed });
      const played = playThrough(world, personId, 18);
      assertWorldIntegrity(played.world);
      // Not every beat is a scene, and it must not be. What the audit found
      // was every beat after the fourth being quiet, for ever.
      expect(played.scenes.length).toBeGreaterThan(6);
      expect(new Set(played.scenes).size).toBeGreaterThan(4);
      // And the beats after those are not all silence either.
      const tail = playThrough(played.world, personId, 6);
      expect(tail.scenes.length).toBeGreaterThan(0);
    });
  }

  it("carries on the same way after a save and a reload", () => {
    const { world, personId } = newLife();
    const played = playThrough(world, personId, 12);
    const straightOn = playThrough(played.world, personId, 8);
    const afterReload = playThrough(
      deserializeWorld(serializeWorld(played.world)),
      personId,
      8,
    );
    expect(afterReload.scenes).toEqual(straightOn.scenes);
    expect(serializeWorld(afterReload.world)).toBe(
      serializeWorld(straightOn.world),
    );
  });

  it("refuses a request that is not open, and writes nothing when it does", () => {
    const { world, personId } = newLife();
    const open = new Set(
      lifeOpportunitiesFor(world, personId).map((entry) => entry.kind),
    );
    const before = serializeWorld(world);
    // A scene whose request nobody made cannot be reached by naming it.
    for (const [key, option] of [
      ["adult.friend-favour", "do-it"],
      ["adult.candidacy-approach", "say-maybe"],
      ["adult.work-extra-hours", "take-them"],
    ] as const) {
      if (
        availableAdultSituations(buildAdultLifeContext(world, personId)).some(
          (situation) => situation.key === key,
        )
      ) {
        continue;
      }
      expect(() =>
        chooseAdultOption(world, {
          personId,
          situationKey: key,
          optionKey: option,
        }),
      ).toThrow(/not available/);
      expect(serializeWorld(world)).toBe(before);
    }
    expect(open.size).toBeGreaterThan(0);
  });

  it("closes a request when it is answered, and does not ask it again", () => {
    const { world, personId } = newLife();
    const offered = availableAdultSituations(
      buildAdultLifeContext(world, personId),
    ).find((situation) => situation.opportunity !== undefined)!;
    expect(offered).toBeDefined();
    const answered = chooseAdultOption(world, {
      personId,
      situationKey: offered.key,
      optionKey: offered.options[0]!.key,
    });
    assertWorldIntegrity(answered);
    expect(
      availableAdultSituations(buildAdultLifeContext(answered, personId)).map(
        (situation) => situation.key,
      ),
    ).not.toContain(offered.key);
    // The world recorded the answer, and it recorded it once.
    const written = answered.history.events.filter((event) =>
      event.tags.includes(offered.key),
    );
    expect(written).toHaveLength(1);
  });

  it("carries a pending election through the quiet route and the choosing one", () => {
    for (const route of ["quiet", "choice"] as const) {
      const { world, personId } = newLife({ seed: "p2r2-election" });
      const filed = fileForOffice(world, personId);
      const campaign = campaignForCandidate(filed, personId)!;
      let current = filed;
      for (let step = 0; step < 20; step += 1) {
        if (electionContestResult(current, campaign.contestId)) break;
        if (route === "quiet") {
          current = letStoryTimePass(current, personId);
          continue;
        }
        const moment = projectStoryMoment(current, personId);
        const option = moment.scene.options[0];
        if (!option) break;
        current = chooseStoryOption(current, {
          personId,
          scene: moment.scene,
          optionKey: option.key,
        });
      }
      expect(electionContestResult(current, campaign.contestId)).toBeDefined();
      expect(
        current.history.electionContestResults?.filter(
          (result) => result.contestId === campaign.contestId,
        ),
      ).toHaveLength(1);
    }
  });
});
