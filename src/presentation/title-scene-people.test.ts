import { describe, expect, it } from "vitest";

import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { isSeatedPose, type EngineRecipe } from "./appearance-engine/pack";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import { backdropStaging } from "./backdrop-people";
import type { BrowserWorldSummary } from "./browser-world-repository";
import {
  civicTitlePictures,
  type BackdropManifestRow,
} from "./title-civic-rotation";
import {
  titleSceneHero,
  titleScenePeople,
  type TitleScenePerson,
} from "./title-scene-people";

/**
 * Lamontae, Oct. 7: "The point is to get people standing and posing in
 * them now." Every picture in the title rotation is checked against its own
 * staging spots (art/backdrops/staging.json).
 */

const PICTURES = civicTitlePictures(
  manifest.backdrops as readonly BackdropManifestRow[],
  (file) => `/art/backdrops/${file}`,
);
const day = (place: string) => ({ place, variant: "midday" });
const poseOf = (person: TitleScenePerson) => person.engine.pose ?? "standing";
const spotOf = (place: string, person: TitleScenePerson) =>
  backdropStaging(place)!.spots.find((spot) => spot.id === person.spotId)!;

describe("the people in each title picture", () => {
  it("puts several people in every picture of the rotation", () => {
    for (const picture of PICTURES) {
      expect(
        titleScenePeople(picture).length,
        `${picture.place} ${picture.variant}`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it("is the same people every time a picture is shown", () => {
    for (const picture of PICTURES)
      expect(titleScenePeople(picture)).toEqual(titleScenePeople(picture));
  });

  it("gives a rally its speaker at the lectern, with the crowd listening", () => {
    const people = titleScenePeople(day("rally-stage"));
    const speakers = people.filter((person) => poseOf(person) === "podium");
    expect(speakers.length).toBe(1);
    expect(spotOf("rally-stage", speakers[0]!).pose).toBe("podium");
    const crowd = people.filter((person) => poseOf(person) !== "podium");
    expect(crowd.length).toBeGreaterThanOrEqual(4);
    for (const person of crowd)
      expect(["arms-folded", "hand-on-hip", "hands-in-pockets"]).toContain(
        poseOf(person),
      );
  });

  it("seats members at their desks on the Senate floor and stands others", () => {
    const people = titleScenePeople(day("us-senate-floor"));
    expect(people.some((person) => isSeatedPose(poseOf(person)))).toBe(true);
    expect(people.some((person) => !isSeatedPose(poseOf(person)))).toBe(true);
  });

  it("puts someone at the Oval Office desk with others standing", () => {
    const people = titleScenePeople(day("oval-office"));
    const desk = people.find(
      (person) => spotOf("oval-office", person).group === "desk",
    );
    expect(desk && isSeatedPose(poseOf(desk))).toBe(true);
    expect(
      people.filter((person) => spotOf("oval-office", person).pose === "stand")
        .length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("robes the justices on the bench", () => {
    const people = titleScenePeople(day("supreme-courtroom"));
    const bench = people.filter(
      (person) => spotOf("supreme-courtroom", person).role === "judge",
    );
    expect(bench.length).toBeGreaterThanOrEqual(5);
    for (const justice of bench) {
      expect(justice.engine.outfit).toBe("judge-robe");
      expect(isSeatedPose(poseOf(justice))).toBe(true);
    }
  });

  it("strikes many of the pack's poses across the rotation, not one recipe", () => {
    const poses = new Set(
      PICTURES.flatMap((picture) => titleScenePeople(picture).map(poseOf)),
    );
    expect(poses.size).toBeGreaterThanOrEqual(7);
  });

  it("seats sitters on their seat and never stands anyone in a chair", () => {
    for (const picture of PICTURES)
      for (const person of titleScenePeople(picture)) {
        const spot = spotOf(picture.place, person);
        expect(
          isSeatedPose(poseOf(person)),
          `${picture.place} ${person.spotId}`,
        ).toBe(spot.pose === "sit");
        if (spot.pose === "sit" && spot.seatY !== undefined)
          expect(person.topPercent).toBeLessThan(spot.seatY);
        // Behind a desk, bench or lectern, the cut is below the shoulders.
        if (person.clipBelowPercent !== null)
          expect(person.clipBelowPercent - person.topPercent).toBeGreaterThan(
            person.heightPercent * 0.3,
          );
      }
  });

  it("draws nearer people larger than farther ones on the same floor", () => {
    for (const picture of PICTURES) {
      const standing = titleScenePeople(picture).filter((person) => {
        const spot = spotOf(picture.place, person);
        return spot.pose === "stand" && spot.floor === undefined;
      });
      for (const near of standing)
        for (const far of standing)
          if (
            spotOf(picture.place, near).y > spotOf(picture.place, far).y
          )
            expect(near.heightPercent).toBeGreaterThan(far.heightPercent);
    }
  });

  it("turns people the way their spot faces", () => {
    for (const picture of PICTURES)
      for (const person of titleScenePeople(picture)) {
        const facing = spotOf(picture.place, person).facing;
        if (facing === "viewer") expect(person.engine.view).toBeUndefined();
      }
  });

  it("draws farthest first", () => {
    for (const picture of PICTURES) {
      const depths = titleScenePeople(picture).map((person) => person.depth);
      expect(depths).toEqual([...depths].sort((a, b) => a - b));
    }
  });
});

describe("a returning player in the first picture", () => {
  const pack = PEOPLE_PACK.presentations.feminine;
  const look: EngineRecipe = {
    presentation: "feminine",
    build: "average",
    shade: 4,
    face: pack.faces[0]!.id,
    hair: pack.hair[0]!.id,
    hairColor: "natural",
    outfit: pack.outfits[0]!.id,
    pose: "arms-folded",
  };
  const saved = (extra: Partial<BrowserWorldSummary> = {}) =>
    ({
      saveId: "save-1",
      playerPersonId: "person-1",
      playerName: "Ada Moss",
      playerAge: 52,
      residence: null,
      playerLooks: { casual: look, business: look, formal: look },
      ...extra,
    }) as unknown as BrowserWorldSummary;

  it("stands on the picture's hero spot in their own look, posed for it", () => {
    const hero = titleSceneHero(saved())!;
    const rally = titleScenePeople(day("rally-stage"), hero);
    const player = rally.find((person) => person.personId === "person-1")!;
    expect(spotOf("rally-stage", player).hero).toBe(true);
    expect(player.engine.face).toBe(look.face);
    expect(poseOf(player)).toBe("podium");
    // Everyone else in the picture is still there.
    expect(rally.length).toBe(titleScenePeople(day("rally-stage")).length);
    const oval = titleScenePeople(day("oval-office"), hero);
    const atDesk = oval.find((person) => person.personId === "person-1")!;
    expect(isSeatedPose(poseOf(atDesk))).toBe(true);
  });

  it("is nobody for a watched world or a save with no look", () => {
    expect(titleSceneHero(saved({ observing: true }))).toBeNull();
    expect(titleSceneHero(saved({ playerLooks: undefined }))).toBeNull();
    expect(titleSceneHero(null)).toBeNull();
  });
});
