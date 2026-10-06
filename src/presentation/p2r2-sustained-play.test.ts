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
import { submitTimeCommand } from "./time-command";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { fixture as p2r1Fixture } from "../../tests/support/p2r1-worlds";

/**
 * The audited collapse, and the route out of it.
 *
 * P2A2 reproduced an adult life that ran out after a week of errands. The
 * errand producer has since been retired. This suite holds the remaining
 * record-backed routes, clock, and save continuation to their own contracts.
 *
 * The original audit worlds and seeds remain here. Quiet intervals now move
 * through the shell clock; a missing situation must not manufacture a choice.
 */

function newLife(overrides: Partial<NewGameSetup> = {}): {
  world: World;
  personId: EntityId;
} {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 34,
    placeKey: "2146027",
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

/** Plays a story choice, or uses the shell's Week control when none is open. */
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
    world = option
      ? chooseStoryOption(world, {
          personId,
          scene,
          optionKey: option.key,
        })
      : submitTimeCommand(world, {
          requestId: `p2r2-week-${beat}`,
          personId,
          sourceMoment: world.currentMoment,
          command: { kind: "days", days: 7 },
        }).world;
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

  it("leaves that same world with somewhere to go anyway", () => {
    const { world, personId } = audited();
    const finished = advanceWorldMinutes(world, 151);
    // Requests actually made are still open and answerable.
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

  it("does not restore retired scenes when the clock moves", () => {
    const { world, personId } = audited();
    let current = advanceWorldMinutes(world, 151);
    for (const minutes of [600, 5_000]) {
      current = advanceWorldMinutes(current, minutes);
      assertWorldIntegrity(current);
    }
    expect(lifeOpportunitiesFor(current, personId).length).toBeGreaterThan(0);
    const played = refreshLifeOpportunities(
      letAdultTimePass(current, 21),
      personId,
    );
    const offered = availableAdultSituations(
      buildAdultLifeContext(played, personId),
    ).map((situation) => situation.key);
    for (const retired of [
      "adult.household-standing",
      "adult.household-quiet-evening",
      "adult.friend-favour",
      "adult.work-extra-hours",
      "adult.ordinary-good-day",
    ]) {
      expect(offered).not.toContain(retired);
    }
  });
});

describe("a normal route stays a normal route", () => {
  for (const seed of ["p2r2-sustained", "adaptive-life-test", "p1-quiet"]) {
    it(`lets ${seed} continue through choices and quiet weeks`, () => {
      const { world, personId } = newLife({ seed });
      const played = playThrough(world, personId, 18);
      assertWorldIntegrity(played.world);
      // The shell clock continues when no record-backed choice is offered.
      // Scene breadth is an open content gap after retirement of routine
      // activities; this check only verifies that the remaining route works.
      expect(played.scenes).toContain("adult.local-issue-position");
      expect(played.quiet).toBeGreaterThan(0);
      const tail = playThrough(played.world, personId, 6);
      assertWorldIntegrity(tail.world);
      expect(tail.world.currentDate).not.toBe(played.world.currentDate);
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
      ["adult.candidacy-approach", "say-maybe"],
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
      // A quiet stretch now stops on the morning of each meeting and campaign
      // shift on the calendar, and the choosing route is offered each of them,
      // so the four weeks to election day take more steps than they did.
      for (let step = 0; step < 40; step += 1) {
        if (electionContestResult(current, campaign.contestId)) break;
        if (route === "quiet") {
          current = letStoryTimePass(current, personId);
          continue;
        }
        const moment = projectStoryMoment(current, personId);
        const option = moment.scene.options[0];
        current = option
          ? chooseStoryOption(current, {
              personId,
              scene: moment.scene,
              optionKey: option.key,
            })
          : submitTimeCommand(current, {
              requestId: `p2r2-election-week-${step}`,
              personId,
              sourceMoment: current.currentMoment,
              command: { kind: "days", days: 7 },
            }).world;
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
