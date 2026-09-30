import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { makeIsoDate } from "../dates";
import { recordWorldEvent } from "../world";
import { publishOpeningPublicRecords } from "./desk";
import { projectPublicInformationDigest } from "../public-information";

function archive() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "opening-archive-records",
    startAge: 8,
  });
  return recordWorldEvent(game.world, {
    stableKey: "archive:recorded-vote",
    type: "civic.council-vote",
    occurredAt: makeIsoDate("2025-12-15"),
    recordedAt: makeIsoDate("2025-12-15"),
    jurisdictionId: null,
    involvedEntityIds: [game.world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "The council adopted ORD 12 by a vote of 4 to 2.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("the opening paper's recorded archive", () => {
  it("publishes a pre-opening occurrence with its original event date and no new occurrence", () => {
    const world = archive();
    const event = world.history.events.at(-1)!;
    const opened = publishOpeningPublicRecords(world);
    const item = projectPublicInformationDigest(opened).items.find(
      (entry) => entry.sourceEventId === event.id,
    );
    expect(item).toMatchObject({
      eventTime: "2025-12-15",
      publicationTime: world.currentDate,
      body: event.summary,
    });
    expect(opened.history.events).toEqual(world.history.events);
    expect(publishOpeningPublicRecords(opened)).toBe(opened);
  });

  it("does not expose private history or publish the retired synthetic feed", () => {
    const world = archive();
    const event = world.history.events.at(-1)!;
    const hidden = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((entry) =>
          entry.id === event.id
            ? { ...entry, visibility: "private" as const }
            : entry,
        ),
      },
    };
    expect(
      (publishOpeningPublicRecords(hidden).history.publications ?? []).some(
        (entry) => entry.sourceEventId === event.id,
      ),
    ).toBe(false);
    const synthetic = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((entry) =>
          entry.id === event.id
            ? { ...entry, tags: ["family:international"] }
            : entry,
        ),
      },
    };
    expect(
      (publishOpeningPublicRecords(synthetic).history.publications ?? []).some(
        (entry) => entry.sourceEventId === event.id,
      ),
    ).toBe(false);
  });
});
