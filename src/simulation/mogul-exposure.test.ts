import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { recordTraitChange } from "./people-traits";
import { recordWorldEvent } from "./world";
import { mogulExposureConsiderations } from "./moguls";
import { drawRandomPlace } from "../../tests/support/random-place";

describe("mogul exposure considerations", () => {
  it("use the mogul's recorded temperament and replay deterministically", () => {
    const seed = "b14-mogul-exposure-traits";
    const place = drawRandomPlace(seed);
    const opening = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      depth: "summarize-earlier-life",
    });
    const world = opening.world;
    const official = opening.playerPersonId;
    const mogul = world.personOrder.find((personId) => personId !== official)!;
    const exposureEventWorld = recordWorldEvent(world, {
      stableKey: "fixture:mogul-risk-trait-event",
      type: "fixture.mogul-risk-trait-recorded",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [mogul],
      participants: [
        { personId: mogul, role: "agency:decided", detail: "Made a choice" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "A generated fixture records a reason to update a trait.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const withTraits = recordTraitChange(exposureEventWorld, {
      personId: mogul,
      trait: "risk",
      value: 2,
      eventId: exposureEventWorld.history.events.at(-1)!.id,
      reason: "The fixture gives this person a recorded risk-taking tendency.",
    });
    const first = mogulExposureConsiderations(
      withTraits,
      mogul,
      official!,
      "fixture:mogul-exposure",
    );
    const replay = mogulExposureConsiderations(
      withTraits,
      mogul,
      official!,
      "fixture:mogul-exposure",
    );

    expect(first).toEqual(replay);
    expect(first.some((item) => item.sourceType === "mind:personality")).toBe(
      true,
    );
    expect(
      first.every(
        (item) =>
          item.optionKey === "go-public" || item.optionKey === "let-it-go",
      ),
    ).toBe(true);
    console.info("B14 part 3 random new-game mogul proof", {
      seed,
      place: place.displayName,
      state: place.context.jurisdiction.parentName,
      worldId: world.id,
      official,
      mogul,
      recordedTraitReasons: first.length,
    });
  });
});

describe("mogul exposure decision path", () => {
  it("does not use close-choice randomness", () => {
    const source = readFileSync(
      new URL("./moguls.ts", import.meta.url),
      "utf8",
    );
    const start = source.indexOf("function reviewAcceptedDeals");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(source.slice(start)).not.toContain('randomness: "close-choices"');
  });
});
