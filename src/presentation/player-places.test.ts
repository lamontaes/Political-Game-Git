import { describe, expect, it } from "vitest";
import {
  deserializeWorld,
  scheduledActivityState,
  serializeWorld,
} from "../simulation";
import { createNewGameWorld } from "./new-game";
import {
  openNextLifeScene,
  openingLifeLocation,
  walkOpeningNeighborhood,
} from "./life-scene-flow";
import { createAuthoredMunicipalPublicSession } from "./municipal-workspace";
import { describePlacesOutcome, projectPlacesWorkspace } from "./player-places";
import { openOrdinaryLife } from "./ordinary-life";
import { declineVenueActivity, performVenueActivity } from "./venue-activity";
import {
  createRunDLiteFixture,
  performRunDScheduledActivity,
} from "./run-d-lite";

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

  it("exposes the adapter gap instead of inventing a journey", () => {
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
    expect(venueOffer!.durationLabel).toBeNull();
    expect(venueOffer!.unavailable).toMatch(/cannot establish a journey/);
    expect(venueOffer!.declineActivityId).toBe(venueOffer!.activityId);
    expect(
      performVenueActivity(
        world,
        created.playerPersonId,
        venueOffer!.activityId!,
      ),
    ).toBe(world);
    const declined = declineVenueActivity(
      world,
      created.playerPersonId,
      venueOffer!.activityId!,
    );
    expect(declined.currentMoment).toEqual(world.currentMoment);
    expect(
      scheduledActivityState(declined, venueOffer!.activityId!).status,
    ).toBe("cancelled");
  });

  it("makes the disclosed journey part of one Attend commitment", () => {
    const fixture = createRunDLiteFixture("places11-attend-journey");
    let world = performRunDScheduledActivity(
      fixture.world,
      fixture,
      fixture.dLite.briefingActivityId,
    );
    world = performRunDScheduledActivity(
      world,
      fixture,
      fixture.dLite.flexibleActivityId,
    );

    const model = projectPlacesWorkspace(world, fixture.playerPersonId)!;
    const meeting = model.offers.find(
      (offer) => offer.activityId === fixture.dLite.meetingActivityId,
    )!;
    expect(meeting.unavailable).toBeNull();
    expect(meeting.detail).toMatch(
      /Attend includes the disclosed 20-minute journey/,
    );
    expect(meeting.detail).toMatch(/cost is not represented/i);
    expect(meeting.durationLabel).toMatch(/20 travelling/);
    expect(
      model.offers.some(
        (offer) => offer.activityId === fixture.dLite.travelActivityId,
      ),
    ).toBe(false);

    const attended = performVenueActivity(
      world,
      fixture.playerPersonId,
      fixture.dLite.meetingActivityId,
    );
    expect(
      scheduledActivityState(attended, fixture.dLite.travelActivityId).status,
    ).toBe("completed");
    expect(
      scheduledActivityState(attended, fixture.dLite.meetingActivityId).status,
    ).toBe("completed");
    expect(attended.currentMoment.minuteOfDay).toBe(15 * 60 + 15);
    expect(openingLifeLocation(attended, fixture.playerPersonId)?.label).toBe(
      "East End Community Room",
    );

    const loaded = deserializeWorld(serializeWorld(attended));
    expect(serializeWorld(loaded)).toBe(serializeWorld(attended));
    expect(
      performVenueActivity(
        loaded,
        fixture.playerPersonId,
        fixture.dLite.meetingActivityId,
      ),
    ).toBe(loaded);
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
