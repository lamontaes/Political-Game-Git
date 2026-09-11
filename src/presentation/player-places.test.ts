import { describe, expect, it } from "vitest";
import { deserializeWorld, serializeWorld } from "../simulation";
import { createNewGameWorld } from "./new-game";
import { openNextLifeScene, walkOpeningNeighborhood } from "./life-scene-flow";
import { createAuthoredMunicipalPublicSession } from "./municipal-workspace";
import { describePlacesOutcome, projectPlacesWorkspace } from "./player-places";
import { openOrdinaryLife } from "./ordinary-life";
import { performVenueActivity } from "./venue-activity";

function childAtHome(seed = "places11-child") {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-from-childhood",
    startingLife: "opening-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  const world = openNextLifeScene(game.world, game.playerPersonId);
  return { world, personId: game.playerPersonId };
}

describe("player-places projection", () => {
  it("shows current location, walk eligibility, and honest already-home refusal", () => {
    const { world, personId } = childAtHome();
    const model = projectPlacesWorkspace(world, personId)!;
    expect(model.current.label).toBe("Home");
    expect(model.current.setting).toBe("home");

    const home = model.offers.find((offer) => offer.id === "walk-home")!;
    const nearby = model.offers.find(
      (offer) => offer.id === "walk-neighborhood",
    )!;
    expect(home.kind).toBe("return-home");
    expect(home.unavailable).toBe("You are already home.");
    expect(nearby.unavailable).toBeNull();
    expect(nearby.companionLabel).toMatch(/would come with you/);
  });

  it("swaps walk refusals after a recorded neighborhood arrival", () => {
    const { world, personId } = childAtHome("places11-walk-arrival");
    const next = walkOpeningNeighborhood(world, personId, "neighborhood");
    expect(next.history.events.at(-1)?.type).toBe("life.scene.arrived");
    const model = projectPlacesWorkspace(next, personId)!;
    expect(model.current.label).toBe("In your neighborhood");
    expect(
      model.offers.find((offer) => offer.id === "walk-home")!.unavailable,
    ).toBeNull();
    expect(
      model.offers.find((offer) => offer.id === "walk-neighborhood")!
        .unavailable,
    ).toBe("You are already out in your neighborhood.");
    expect(describePlacesOutcome(world, next, personId)).toMatch(/→/);
    expect(describePlacesOutcome(world, next, personId)).toContain(
      "In your neighborhood",
    );
  });

  it("survives save and reload without changing offers", () => {
    const { world, personId } = childAtHome("places11-save");
    const walked = walkOpeningNeighborhood(world, personId, "neighborhood");
    const saved = serializeWorld(walked);
    const loaded = deserializeWorld(saved);
    expect(projectPlacesWorkspace(loaded, personId)).toEqual(
      projectPlacesWorkspace(walked, personId),
    );
  });

  it("projects venue attendance with duration and preserves refusal on stale click", () => {
    const created = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "places11-venue",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    });
    const world = openOrdinaryLife(created.world, created.playerPersonId);
    const model = projectPlacesWorkspace(world, created.playerPersonId)!;
    const venueOffer = model.offers.find(
      (offer) => offer.kind === "attend" && offer.activityId,
    );
    expect(venueOffer).toBeDefined();
    expect(venueOffer!.durationLabel).toMatch(/minutes/);
    expect(
      performVenueActivity(
        world,
        created.playerPersonId,
        venueOffer!.activityId!,
      ),
    ).not.toBe(world);
  });

  it("lists municipal meetings and inspect without inventing travel", () => {
    const created = createNewGameWorld({
      placeKey: "5114968",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "places11-muni",
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    });
    let world = openOrdinaryLife(created.world, created.playerPersonId);
    world = createAuthoredMunicipalPublicSession(world);
    const model = projectPlacesWorkspace(world, created.playerPersonId)!;
    expect(
      model.offers.some(
        (offer) => offer.kind === "inspect" && offer.inspectGovernmentKey,
      ),
    ).toBe(true);
    const meeting = model.offers.find(
      (offer) => offer.kind === "attend" && offer.meetingId,
    );
    expect(meeting).toBeDefined();
  });
});
