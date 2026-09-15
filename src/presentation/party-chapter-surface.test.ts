import { describe, expect, it } from "vitest";

import {
  acceptChapterInvitation,
  projectPartyEncounters,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  encodeStoredShellState,
  readStoredShellState,
} from "./browser-shell-state";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { passOrdinaryDays } from "./ordinary-life";
import {
  projectPartyChapter,
  projectPartyChapters,
} from "./party-chapter-surface";
import { labelForRef, shellRefIsResolvable } from "./person-dossier";
import { declineVenueActivity } from "./scheduled-activity-choice";
import {
  DEFAULT_PREFERENCES,
  INITIAL_SHELL_STATE,
  shellReducer,
  type ShellRef,
} from "./shell-navigation";

function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 34 }),
  ).game!;
}

/** Ordinary days, one at a time, until an organizer's invitation arrives. */
function untilInvited(world: World, personId: EntityId, maxDays = 40) {
  let current = world;
  for (let day = 0; day < maxDays; day += 1) {
    current = passOrdinaryDays(current, 1, { stopForTentativeHolds: true });
    for (const chapter of projectPartyChapters(current, personId)) {
      const meeting = chapter.meetings.find((row) =>
        row.actions.includes("accept"),
      );
      if (meeting) return { world: current, chapter, meeting };
    }
  }
  return null;
}

describe("party chapter surface and pins", () => {
  const life = adultLife("alive43-l3-a");
  const player = life.playerPersonId;

  it("shows both home chapters with their organizers before anyone has asked anything", () => {
    const before = serializeWorld(life.world);
    const chapters = projectPartyChapters(life.world, player);
    expect(chapters).toHaveLength(2);
    for (const chapter of chapters) {
      expect(chapter.organizer).not.toBeNull();
      expect(life.world.people[chapter.organizer!.personId]).toBeDefined();
      expect(chapter.meetings).toEqual([]);
      expect(chapter.member).toBe(false);
      expect(chapter.canJoin).toBe(true);
    }
    expect(serializeWorld(life.world)).toBe(before);
  });

  it("an organizer's invitation reached during ordinary days offers Accept and Decline, and accepting leaves only Attend with the same organizer", () => {
    const invited = untilInvited(life.world, player);
    expect(
      invited,
      "an organic invitation within 40 ordinary days",
    ).not.toBeNull();
    const { world, chapter, meeting } = invited!;
    expect(meeting.actions).toEqual(["accept", "decline"]);

    const accepted = acceptChapterInvitation(world, player, meeting.activityId);
    const after = projectPartyChapter(
      accepted,
      player,
      chapter.organizationId,
    )!;
    const row = after.meetings.find((entry) => entry.actions.length > 0)!;
    expect(row.actions).toEqual(["attend"]);
    expect(row.stateLabel).toBe("You said you would come");
    expect(after.organizer?.personId).toBe(chapter.organizer?.personId);
  });

  it("declining leaves a declined meeting with nothing more to do", () => {
    const invited = untilInvited(life.world, player)!;
    const declined = declineVenueActivity(
      invited.world,
      player,
      invited.meeting.activityId,
    );
    const row = projectPartyChapter(
      declined,
      player,
      invited.chapter.organizationId,
    )!.meetings.find(
      (entry) => entry.activityId === invited.meeting.activityId,
    )!;
    expect(row.stateLabel).toBe("You declined");
    expect(row.actions).toEqual([]);
    expect(
      projectPartyEncounters(declined, player).some((encounter) =>
        encounter.activities.some((activity) => activity.state === "accepted"),
      ),
    ).toBe(false);
  });

  it("a chapter pin is labeled from the chapter, survives the stored record, and opening it writes nothing", () => {
    const chapter = projectPartyChapters(life.world, player)[0]!;
    const ref: ShellRef = { kind: "organization", id: chapter.organizationId };
    const before = serializeWorld(life.world);
    expect(labelForRef(life.world, ref)).toBe(chapter.name);
    expect(shellRefIsResolvable(life.world, ref)).toBe(true);

    const pinned = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-pin",
      ref,
    });
    const opened = shellReducer(pinned, { type: "open-entity", ref });
    expect(opened.pins.map((pin) => pin.ref)).toEqual([ref]);

    const stored = readStoredShellState(
      encodeStoredShellState("slot" as EntityId, {
        pins: pinned.pins,
        preferences: DEFAULT_PREFERENCES,
      }),
    )!;
    expect(stored.pins.map((pin) => pin.ref)).toEqual([ref]);
    expect(serializeWorld(life.world)).toBe(before);
  });

  it("a world opened before W2 has no chapter for the pin, so it is not resolvable", () => {
    const chapter = projectPartyChapters(life.world, player)[0]!;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "alive43-l3-pre-w2",
      startAge: 34,
    });
    const legacy = establishOpeningOfficeholders(
      game.world,
      game.playerPersonId,
    );
    const ref: ShellRef = { kind: "organization", id: chapter.organizationId };
    expect(projectPartyChapters(legacy, game.playerPersonId)).toEqual([]);
    expect(labelForRef(legacy, ref)).toBeNull();
    expect(shellRefIsResolvable(legacy, ref)).toBe(false);
  });
});
