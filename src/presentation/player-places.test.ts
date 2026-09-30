import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LifeScenePanel } from "../player/opening-life/LifeScenePanel";
import { describe, expect, it } from "vitest";
import {
  deserializeWorld,
  cancelScheduledActivity,
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
import { projectPlacesWorkspace } from "./player-places";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { declineVenueActivity, performVenueActivity } from "./venue-activity";
import {
  createRunDLiteFixture,
  performRunDScheduledActivity,
} from "./run-d-lite";

function childAtHome(seed = "places11-child") {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
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
  it("shows the recorded location without offering menu walks", () => {
    const { world, personId } = childAtHome();
    const saved = serializeWorld(world);
    const model = projectPlacesWorkspace(world, personId)!;
    expect(model.current.label).toBe("Home");
    expect(model.current.setting).toBe("home");
    expect(
      model.offers.some((offer) => offer.walkDestination !== undefined),
    ).toBe(false);
    expect(model.offers.map((offer) => offer.title)).not.toContain(
      "Take a short walk nearby",
    );
    expect(model.offers.map((offer) => offer.title)).not.toContain("Walk home");
    const markup = renderToStaticMarkup(
      createElement(LifeScenePanel, {
        world,
        playerPersonId: personId,
        onWorldChange: () => {},
        onTalkTo: () => {},
      }),
    );
    expect(markup).toContain('data-testid="opening-life-scene"');
    expect(markup).not.toContain("life-walk-");
    expect(markup).not.toContain("Take a short walk nearby");
    expect(markup).not.toContain("Walk home");
    expect(serializeWorld(world)).toBe(saved);
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
    const opened = openOrdinaryLife(created.world, created.playerPersonId);
    // A canceled leg (like an older life without one) grants no arrival.
    const journey = opened.history.scheduledActivities.find(
      (a) => a.location.locationKey === "ordinary-life:to-meeting-room",
    )!;
    const world = passOrdinaryDays(cancelScheduledActivity(opened, journey.id));
    const model = projectPlacesWorkspace(world, created.playerPersonId)!;
    const venueOffer = model.offers.find(
      (offer) => offer.kind === "attend" && offer.activityId,
    );
    expect(venueOffer).toBeDefined();
    expect(venueOffer!.durationLabel).toBeNull();
    expect(venueOffer!.unavailable).toMatch(/no way to get to/);
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

  it("makes the trip part of one Attend commitment", () => {
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
    expect(
      model.offers.some((offer) => offer.kind === "travel" && offer.activityId),
    ).toBe(false);
    const meeting = model.offers.find(
      (offer) => offer.activityId === fixture.dLite.meetingActivityId,
    )!;
    expect(meeting.unavailable).toBeNull();
    expect(meeting.detail).toMatch(/Attending includes the 20-minute trip/);
    expect(meeting.detail).toMatch(/There is no fare\./);
    expect(meeting.durationLabel).toMatch(
      /^Starts .+ and takes .+\. The trip there takes 20 minutes before it\.$/,
    );
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
