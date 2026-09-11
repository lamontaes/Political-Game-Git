import { describe, expect, it } from "vitest";
import { resolveLifeScene } from "./life-scene";
import { createNewGameWorld } from "./new-game";
import { travelToPlace, type PlaceTravelProvider } from "./place-travel";
import {
  addSimulationMinutes,
  advanceWorldMinutes,
  createScheduledActivity,
  deserializeWorld,
  recordWorldEvent,
  serializeWorld,
  simulationMinutesBetween,
} from "../simulation";
function start() {
  const created = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "env-travel",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
  const personId = created.playerPersonId;
  const world = recordWorldEvent(created.world, {
    stableKey: "env:home",
    type: "life.scene.opened",
    occurredAt: created.world.currentDate,
    recordedAt: created.world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "presence:participant", detail: "At home" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["authored-test"],
    summary: "At home.",
    context: {
      location: { jurisdictionId: null, label: "Home", setting: "home" },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const originEventId = world.history.events.at(-1)!.id;
  const provider: PlaceTravelProvider = () => ({
    kind: "available",
    route: {
      version: 1,
      id: "local-walk",
      origin: {
        key: "home",
        label: "Home",
        jurisdictionId: null,
        setting: "home",
      },
      destination: {
        key: "neighborhood",
        label: "Neighborhood",
        jurisdictionId: null,
        setting: "neighborhood",
      },
      duration: {
        minutes: 5,
        basis: "authored-scenario",
        evidence: "An authored short walk, not a measured route.",
      },
      originEventId,
      participantPersonIds: [personId],
    },
  });
  return { world, personId, provider, originEventId };
}
describe("provider-backed place travel", () => {
  it("charges the canonical interval before arrival and survives save/reload", () => {
    const { world, personId, provider } = start();
    const before = serializeWorld(world);
    const next = travelToPlace(world, personId, "neighborhood", provider);
    expect(
      simulationMinutesBetween(world.currentMoment, next.currentMoment),
    ).toBe(5);
    expect(next.history.scheduledActivities.at(-1)?.kind).toBe("travel");
    expect(next.history.scheduledActivityStates.at(-1)?.status).toBe(
      "completed",
    );
    expect(next.history.events.at(-1)?.type).toBe("life.scene.arrived");
    expect(resolveLifeScene(next, personId).sceneId).toBeNull();
    expect(next.history.events.at(-1)?.context.location?.setting).toBe(
      "neighborhood",
    );
    expect(serializeWorld(deserializeWorld(serializeWorld(next)))).toBe(
      serializeWorld(next),
    );
    expect(serializeWorld(world)).toBe(before);
    expect(travelToPlace(next, personId, "neighborhood", provider)).toBe(next);
  });
  it("does not guess unknown providers or durations", () => {
    const { world, personId, provider } = start();
    expect(
      travelToPlace(world, personId, "anywhere", () => ({
        kind: "unavailable",
        reason: "No route evidence",
      })),
    ).toBe(world);
    expect(
      travelToPlace(world, personId, "neighborhood", (...args) => {
        const offer = provider(...args);
        if (offer.kind !== "available") return offer;
        return {
          ...offer,
          route: {
            ...offer.route,
            duration: { ...offer.route.duration, minutes: NaN },
          },
        };
      }),
    ).toBe(world);
  });
  it("refuses overlapping commitments without leaving a scheduled journey behind", () => {
    const { world, personId, provider, originEventId } = start();
    const busy = createScheduledActivity(world, {
      stableKey: "busy",
      title: "Existing commitment",
      summary: "Already occupied",
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, 10),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: { locationKey: "home", label: "Home", jurisdictionId: null },
      sourceEntityIds: [originEventId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    expect(travelToPlace(busy, personId, "neighborhood", provider)).toBe(busy);
  });
  it("withholds arrival if the provider changes while time elapses", () => {
    const { world, personId, provider } = start();
    const next = travelToPlace(
      world,
      personId,
      "neighborhood",
      (current, id, key) =>
        current.currentMoment.minuteOfDay === world.currentMoment.minuteOfDay
          ? provider(current, id, key)
          : { kind: "unavailable", reason: "Destination unavailable" },
    );
    expect(
      simulationMinutesBetween(world.currentMoment, next.currentMoment),
    ).toBe(5);
    expect(next.history.events.at(-1)?.type).not.toBe("life.scene.arrived");
    expect(
      resolveLifeScene(advanceWorldMinutes(next, 1), personId).sceneId,
    ).toBeNull();
  });
});
