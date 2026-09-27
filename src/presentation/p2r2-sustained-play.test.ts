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
import { chooseAdultOption } from "./adult-life";

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
/** A new life keeps grounded requests and choices across quiet weeks. */

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

describe("grounded opportunities in a sparse life", () => {
  const built = p2r1Fixture();
  const world = refreshLifeOpportunities(built.world, built.personId);
  const personId = built.personId;

  it("offers a scene grounded in an open request", () => {
    const offered = availableAdultSituations(
      buildAdultLifeContext(world, personId),
    );
    expect(offered.length).toBeGreaterThan(0);
    expect(
      offered.every((situation) => situation.opportunity !== undefined),
    ).toBe(true);
    expect(projectStoryMoment(world, personId).scene.kind).not.toBe(
      "ordinary-stretch",
    );
  });

  it("keeps those opportunities after 151, 600, and 5,000 elapsed minutes", () => {
    let current = world;
    for (const minutes of [151, 600, 5_000]) {
      current = advanceWorldMinutes(current, minutes);
      assertWorldIntegrity(current);
    }
    expect(lifeOpportunitiesFor(current, personId).length).toBeGreaterThan(0);
  });
});

describe("a normal route stays a normal route", () => {
  for (const seed of ["p2r2-sustained", "adaptive-life-test", "p1-quiet"]) {
    it(`lets ${seed} continue through real requests and quiet weeks`, () => {
      const { world, personId } = newLife({ seed });
      const played = playThrough(world, personId, 18);
      assertWorldIntegrity(played.world);
      // The old variety count included grocery and leisure prompts. The
      // existing grounded requests remain answerable after those are removed.
      expect(played.scenes).toContain("adult.local-issue-position");
      expect(played.scenes).toContain("adult.friend-favour");
      expect(played.scenes).not.toContain("adult.household-standing");
      expect(played.scenes).not.toContain("adult.ordinary-good-day");
      expect(played.scenes).not.toContain("adult.home.plan-week");
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
