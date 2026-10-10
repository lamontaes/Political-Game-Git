import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import {
  backdropStaging,
  placeBackdropPeople,
  spotDepth,
} from "./backdrop-people";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { plaqueAnchor } from "./opening-plaque-anchor";

/**
 * A person the scene gives a named role takes the seats marked for it before
 * any open seat, and is never moved out of them into a seat the role does
 * not take (the owner's October 8, 2026 playtest: a home-state senator in
 * the Speaker's chair). The place is drawn from all 56 by the named seed;
 * the chamber is the same picture everywhere.
 */
const SEED = "p4-member-seats";
const place = drawRandomPlace(SEED, (entry) => entry.scope === "locality");

describe(
  `named roles in a place picture (${place.displayName}, seed ${SEED})`,
  { timeout: 300_000 },
  () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: place.key,
        startAge: 34,
      }),
    ).game!;
    const { world, playerPersonId: player } = game;
    const people = Object.values(world.people)
      .filter((person) => person.id !== player && person.appearance)
      .slice(0, 13);
    const members = people.slice(1).map((person) => ({
      personId: person.id,
      role: "member-at-dais" as const,
    }));
    const memberSeats = backdropStaging("us-house-floor")!.spots.filter(
      (spot) => spot.role === "member-at-dais",
    );

    it("seats members in the members' seats, never the presiding chair, the rostrum or the aisle", () => {
      const placed = placeBackdropPeople(
        world,
        player,
        "us-house-floor",
        world.currentMoment,
        members,
        { rosterOnly: true, faceRoom: true },
      );
      expect(placed).toHaveLength(members.length);
      for (const person of placed)
        expect(person.slotRole, person.name).toBe("member-at-dais");
    });

    it("puts the first member listed in the nearest members' seat when the scene asks", () => {
      const placed = placeBackdropPeople(
        world,
        player,
        "us-house-floor",
        world.currentMoment,
        members,
        { rosterOnly: true, faceRoom: true, nearestFirst: true },
      );
      const first = placed.find(
        (person) => person.personId === members[0]!.personId,
      )!;
      expect(first.depth).toBe(Math.max(...memberSeats.map(spotDepth)));
    });

    it("keeps a plaque off a nearer person: the seat behind the podium is named above the head", () => {
      const speaker = people[0]!.id;
      const placed = placeBackdropPeople(
        world,
        player,
        "us-house-floor",
        world.currentMoment,
        [{ personId: speaker }, { personId: people[1]!.id }],
        { rosterOnly: true, faceRoom: true, speakerId: speaker },
      );
      const atPodium = placed.find((person) => person.personId === speaker)!;
      const behind = placed.find((person) => person.personId !== speaker)!;
      expect(atPodium.resolvedPose).toBe("podium");
      expect(behind.depth).toBeLessThan(atPodium.depth);
      const size = { widthPercent: 12, heightPercent: 7 };
      // The podium's own front edge is clear, so the speaker's plaque sits on
      // it; the chair behind has the speaker in front of its desk.
      expect(plaqueAnchor(atPodium, placed, size)).toMatchObject({
        anchor: "below",
        topPercent: atPodium.clipBelowPercent,
      });
      expect(plaqueAnchor(behind, placed, size).anchor).toBe("head");
      // Alone in the room, the chair's own desk carries it.
      expect(plaqueAnchor(behind, [behind], size).anchor).toBe("below");
    });
  },
);
