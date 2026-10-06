import { describe, expect, it } from "vitest";

import {
  recordWorldEvent,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import { publishPublicEvent } from "../simulation/public-information";
import {
  encodeStoredShellState,
  readStoredShellState,
} from "./browser-shell-state";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { passOrdinaryDays } from "./ordinary-life";
import { projectDayRhythm } from "./day-rhythm";
import {
  INITIAL_SHELL_STATE,
  INITIAL_INTERFACE_PROGRESS,
  shellReducer,
  type InterfaceProgress,
} from "./shell-navigation";
import { projectWorldRecap } from "./world-recap";

function opening(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      givenName: "Maya",
      familyName: "Reed",
    }),
  ).game!;
}

function progressAt(world: World): InterfaceProgress {
  return {
    ...INITIAL_INTERFACE_PROGRESS,
    recapFrontier: world.history.nextSequence,
    recapThroughMoment: world.currentMoment,
  };
}

describe("ordinary day rhythm", () => {
  it("has no morning note and does not write World facts", () => {
    const { world, playerPersonId } = opening("day-rhythm-morning");
    const progress = progressAt(world);
    const before = serializeWorld(world);
    const read = projectDayRhythm(world, playerPersonId, progress);
    expect(read).toEqual({ summary: null });
    expect(serializeWorld(world)).toBe(before);
  });

  it("records a quiet crossed day and does not repeat it after save/reload", () => {
    const { world, playerPersonId } = opening("day-rhythm-quiet");
    const progress = progressAt(world);
    const next = passOrdinaryDays(world, 1);
    const read = projectDayRhythm(next, playerPersonId, progress);
    expect(read.summary).toMatchObject({
      since: world.currentMoment,
      through: next.currentMoment,
      throughSequence: next.history.nextSequence,
      completedDay: true,
    });
    const begun = shellReducer(INITIAL_SHELL_STATE, {
      type: "start-day-rhythm",
      sequence: progress.recapFrontier!,
      moment: world.currentMoment,
    });
    const acknowledged = shellReducer(begun, {
      type: "acknowledge-recap",
      throughSequence: read.summary!.throughSequence,
      throughMoment: read.summary!.through,
    });
    const reopened = readStoredShellState(
      encodeStoredShellState("day-rhythm-route" as EntityId, {
        pins: acknowledged.pins,
        preferences: acknowledged.preferences,
        progress: acknowledged.progress,
      }),
    )!;
    expect(
      projectDayRhythm(next, playerPersonId, reopened.progress!).summary,
    ).toBeNull();
  });

  it("reuses the exact saved-world recap for a public item in the interval", () => {
    const { world, playerPersonId } = opening("day-rhythm-public");
    const progress = progressAt(world);
    const other = Object.keys(world.people).find(
      (id) => id !== playerPersonId,
    )! as EntityId;
    const eventWorld = recordWorldEvent(world, {
      stableKey: "day-rhythm-library-meeting",
      type: "community.meeting",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[other]!.homeJurisdictionId,
      involvedEntityIds: [other],
      participants: [{ personId: other, role: "agency:actor", detail: null }],
      personFactConstraints: [],
      visibility: "public",
      tags: ["choice.attend"],
      summary: "The council discussed library hours.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const published = publishPublicEvent(eventWorld, {
      stableKey: "day-rhythm-library-report",
      sourceEventId: eventWorld.history.events.at(-1)!.id,
    });
    const read = projectDayRhythm(published, playerPersonId, progress);
    expect(read.summary?.completedDay).toBe(false);
    expect(read.summary?.recap).toEqual(
      projectWorldRecap(published, playerPersonId, progress.recapFrontier!),
    );
    expect(read.summary?.recap?.entries).toHaveLength(1);
  });
});
