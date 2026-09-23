import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  availableAdultSituations,
  buildAdultLifeContext,
} from "../simulation/adult-situations";
import { favorEntries, performFavor } from "../simulation/life-favors";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import { personName } from "../simulation/people";
import { chooseAdultOption } from "./adult-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * A favor that comes back larger.
 *
 * `adult.old-favor-returns` was withheld because an earlier favor-family
 * choice may have been a refusal, so it established no help given, no new
 * request and no recurrence. All three are records now, and the one that does
 * the work is `life.favour-performed`, which a refusal never produces.
 */

function life(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 35,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "lexington-fayette",
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

/**
 * Answer everything already open, without touching the returning favor.
 *
 * The writer only gives a life something when nothing is in front of it, which
 * is the rule that keeps a quiet stretch from turning into an inbox. So a
 * favor comes back when the life is quiet, and a test that did not quieten it
 * would be testing the cap rather than the producer.
 */
function answerEverythingElse(world: World, personId: EntityId): World {
  let next = world;
  for (let round = 0; round < 8; round += 1) {
    if (lifeOpportunitiesFor(next, personId).length === 0) return next;
    const answerable = availableAdultSituations(
      buildAdultLifeContext(next, personId),
    ).find(
      (situation) =>
        situation.opportunity !== undefined &&
        situation.key !== "adult.old-favour-returns",
    );
    if (!answerable) return next;
    next = chooseAdultOption(next, {
      personId,
      situationKey: answerable.key,
      optionKey: answerable.options[0]!.key,
    });
  }
  return next;
}

function offeredKeys(world: World, personId: EntityId): readonly string[] {
  return availableAdultSituations(buildAdultLifeContext(world, personId)).map(
    (situation) => situation.key,
  );
}

describe("a favor actually performed can come back larger", () => {
  it("returns from the person who was helped, naming them", () => {
    const { world, personId } = life("returning-favour-performed");
    const entry = favorEntries(world, personId)[0]!;
    const agreed = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "conditions",
    });
    const done = performFavor(
      agreed,
      personId,
      entry.request.id,
      createCampaignElectionTransitionRegistry(),
    );
    expect(favorEntries(done, personId)[0]!.status).toBe("performed");

    const quiet = answerEverythingElse(done, personId);
    const open = lifeOpportunitiesFor(quiet, personId);
    const returning = open.find((item) => item.kind === "returning-favour");
    expect(returning).toBeDefined();
    // The request is from the person who was actually helped, read off the
    // performance record rather than taken from a pool of acquaintances.
    expect(returning!.counterpartPersonId).toBe(entry.counterpartId);

    const scene = availableAdultSituations(
      buildAdultLifeContext(quiet, personId),
    ).find((situation) => situation.key === "adult.old-favour-returns");
    expect(scene).toBeDefined();
    expect(scene!.prose).toContain(
      personName(quiet.people[entry.counterpartId]!),
    );
    assertWorldIntegrity(quiet);
    expect(deserializeWorld(serializeWorld(quiet))).toEqual(quiet);
  });

  it("does not come back when the favor was refused", () => {
    const { world, personId } = life("returning-favour-declined");
    const declined = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "decline",
    });
    expect(favorEntries(declined, personId)[0]!.status).toBe("declined");
    const quiet = answerEverythingElse(declined, personId);
    expect(
      lifeOpportunitiesFor(quiet, personId).map((item) => item.kind),
    ).not.toContain("returning-favour");
    expect(offeredKeys(quiet, personId)).not.toContain(
      "adult.old-favour-returns",
    );
  });

  it("does not come back when the favor was only agreed to, not carried out", () => {
    const { world, personId } = life("returning-favour-agreed");
    const agreed = chooseAdultOption(world, {
      personId,
      situationKey: "adult.friend-favour",
      optionKey: "conditions",
    });
    expect(favorEntries(agreed, personId)[0]!.status).toBe("agreed");
    const quiet = answerEverythingElse(agreed, personId);
    expect(
      lifeOpportunitiesFor(quiet, personId).map((item) => item.kind),
    ).not.toContain("returning-favour");
  });

  it("comes back once and is not written again after it is answered", () => {
    const { world, personId } = life("returning-favour-performed");
    const entry = favorEntries(world, personId)[0]!;
    expect(entry).toBeDefined();
    const done = performFavor(
      chooseAdultOption(world, {
        personId,
        situationKey: "adult.friend-favour",
        optionKey: "conditions",
      }),
      personId,
      entry.request.id,
      createCampaignElectionTransitionRegistry(),
    );
    const quiet = answerEverythingElse(done, personId);
    expect(offeredKeys(quiet, personId)).toContain("adult.old-favour-returns");
    const answered = chooseAdultOption(quiet, {
      personId,
      situationKey: "adult.old-favour-returns",
      optionKey: "help-again",
    });
    const later = answerEverythingElse(answered, personId);
    expect(
      lifeOpportunitiesFor(later, personId).map((item) => item.kind),
    ).not.toContain("returning-favour");
    expect(offeredKeys(later, personId)).not.toContain(
      "adult.old-favour-returns",
    );
  });
});
