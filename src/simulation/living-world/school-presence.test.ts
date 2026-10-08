import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { schoolConversationRoom } from "../../presentation/formative-play";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { resolveOpeningPlaySceneContext } from "../../presentation/play-scene-context";
import { recordedRoomPresence } from "../../presentation/recorded-room-presence";
import {
  activeEducationEnrollmentsAt,
  didPeopleShareEducationOrganization,
  type SimulationMoment,
} from "..";
import { schoolGradeOn } from "../school-calendar";
import { classmatesInClassAt, inClassAt } from "./school-presence";

function lifeAt(seed: string, startAge: number) {
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge,
      household: "shares-a-home",
      questionnaire: "skipped",
    }),
  ).game!;
  return { place, world: game.world, personId: game.playerPersonId };
}

function at(
  moment: SimulationMoment,
  date: string,
  minuteOfDay: number,
): SimulationMoment {
  return { ...moment, date, minuteOfDay } as SimulationMoment;
}

describe("a pupil who begins in class is at school with their classmates", () => {
  // Watched lives drawn from the 56 places by seed. The start moment is a
  // Monday morning inside the school term, so every enrolled pupil is in
  // class; the classmates are exactly the same-grade, same-school pupils the
  // enrollment records hold.
  it.each([
    ["h1-school-6-1", 6],
    ["h1-school-10-2", 10],
    ["h1-school-15-1", 15],
    ["h1-school-17-2", 17],
  ])(
    "seed %s (age %i): recorded presence is the school and its classmates",
    (seed, age) => {
      const { place, world, personId } = lifeAt(seed, age);
      const name = `${seed} / ${place.displayName}`;
      expect(inClassAt(world, personId), name).toBe(true);

      const presence = recordedRoomPresence(world, personId)!;
      expect(presence.location.setting, name).toBe("school");
      const enrollment = activeEducationEnrollmentsAt(world, personId)[0]!;
      expect(enrollment.enrollment.programKind).toMatch(/^schooling:/);

      const classmates = classmatesInClassAt(world, personId);
      expect(classmates.length, name).toBeGreaterThan(0);
      expect([...presence.personIds].sort()).toEqual(
        [personId, ...classmates].sort(),
      );
      for (const id of classmates) {
        expect(didPeopleShareEducationOrganization(world, personId, id)).toBe(
          true,
        );
        expect(schoolGradeOn(world, id)).toBe(schoolGradeOn(world, personId));
      }

      // The consumers read it: the scene context names the school and the
      // classmates, and a school conversation is open to them.
      const context = resolveOpeningPlaySceneContext(world, personId);
      expect(context.purpose).toBe("school");
      expect(context.presentPeople.map((p) => p.personId).sort()).toEqual(
        [...classmates].sort(),
      );
      const room = schoolConversationRoom(world, personId);
      expect(room?.eligibleAddresseePersonIds.length).toBeGreaterThan(0);
      for (const id of room!.eligibleAddresseePersonIds)
        expect(classmates).toContain(id);
    },
    300_000,
  );

  // A pupil with nobody else on record at the school is alone in class: the
  // truth, not a placed stranger.
  it.each([
    ["h1-school-10-1", 10],
    ["h1-school-17-1", 17],
  ])(
    "seed %s (age %i): a school with nobody else on record has an empty room",
    (seed, age) => {
      const { world, personId } = lifeAt(seed, age);
      expect(classmatesInClassAt(world, personId)).toEqual([]);
      const presence = recordedRoomPresence(world, personId)!;
      expect(presence.location.setting).toBe("school");
      expect(presence.personIds).toEqual([personId]);
      expect(schoolConversationRoom(world, personId)).toBeNull();
    },
    300_000,
  );

  it("is not class on a weekend, in the evening or over the summer", () => {
    const { world, personId } = lifeAt("h1-school-10-2", 10);
    const now = world.currentMoment;
    expect(inClassAt(world, personId, at(now, "2026-01-10", 600))).toBe(false);
    expect(
      inClassAt(world, personId, at(now, "2026-01-05", 18 * 60 + 30)),
    ).toBe(false);
    expect(inClassAt(world, personId, at(now, "2026-07-06", 600))).toBe(false);
    expect(
      classmatesInClassAt(world, personId, at(now, "2026-07-06", 600)),
    ).toEqual([]);
  });

  it("an adult beginning on a weekday morning is not placed at school", () => {
    const { world, personId } = lifeAt("h1-school-adult", 34);
    expect(inClassAt(world, personId)).toBe(false);
    expect(recordedRoomPresence(world, personId)?.location.setting).not.toBe(
      "school",
    );
  });
});
