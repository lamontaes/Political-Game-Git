import { describe, expect, it } from "vitest";

import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import poseData from "../../data/content/pose-by-activity.json" with { type: "json" };
import {
  isSeatedPose,
  presentationFallbacks,
  type BodyPose,
  type BodyPresentation,
  type EngineRecipe,
} from "./appearance-engine/pack";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import { backdropStaging } from "./backdrop-people";
import type { BrowserWorldSummary } from "./browser-world-repository";
import {
  civicTitlePictures,
  type BackdropManifestRow,
} from "./title-civic-rotation";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import {
  figureBodyBox,
  titlePeopleInView,
  titlePeopleTint,
  titleSceneHero,
  titleScenePeople,
  type PictureBox,
  type TitleSceneRoom,
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

/**
 * Every pose the pose data (data/content/pose-by-activity.json) lets a
 * person strike while doing these things, as the engine draws it for either
 * presentation, stand-ins included: the pack's poses are data, so the test
 * reads the same lists the chooser does.
 */
function posesFor(...activities: readonly string[]): readonly BodyPose[] {
  const lists = poseData.activities as Readonly<
    Record<
      string,
      Readonly<
        Record<string, Readonly<Record<string, readonly { pose: string }[]>>>
      >
    >
  >;
  const listed = activities.flatMap((activity) =>
    Object.values(lists[activity] ?? {}).flatMap((bySpot) =>
      Object.values(bySpot).flatMap((entries) =>
        entries.map((entry) => entry.pose as BodyPose),
      ),
    ),
  );
  const presentations: readonly BodyPresentation[] = ["feminine", "masculine"];
  return [
    ...new Set(
      listed.flatMap((pose) =>
        presentations.flatMap((presentation) =>
          presentationFallbacks(pose, presentation),
        ),
      ),
    ),
  ];
}

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
    // The floor stands and the bleachers sit, listening: each in a pose the
    // pose data gives a listener, none in one only a speaker strikes.
    const listening = posesFor("listening");
    const speakingOnly = posesFor("speaking", "speech").filter(
      (pose) => !listening.includes(pose),
    );
    for (const person of crowd) {
      expect(listening).toContain(poseOf(person));
      expect(speakingOnly).not.toContain(poseOf(person));
    }
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
        // Behind a desk, bench or lectern, the cut is below the shoulders:
        // a lectern shows a head and shoulders, a desk more.
        if (person.clipBelowPercent !== null)
          expect(
            person.clipBelowPercent - person.topPercent,
            `${picture.place} ${person.spotId}`,
          ).toBeGreaterThan(person.heightPercent * 0.1);
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
          if (spotOf(picture.place, near).y > spotOf(picture.place, far).y)
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
    // The rally's lectern is behind the menu on a 16:9 window, so the player
    // speaks from the stage beside it, in view, on the hero spot.
    expect(isSeatedPose(poseOf(player))).toBe(false);
    const seen = titleScenePeople(day("rally-stage"), hero, MENU);
    const speaking = seen.find((person) => person.personId === "person-1")!;
    expect(posesFor("speaking", "speech")).toContain(poseOf(speaking));
    expect(isSeatedPose(poseOf(speaking))).toBe(false);
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

/**
 * The menu's glass panel on a 1600 x 900 window (55..440 px across,
 * 30..462 px down), as the stage measures it, with its margin, in percent of
 * the picture.
 */
const MENU: TitleSceneRoom = {
  reserved: [{ left: 1.9, right: 29, top: 1.8, bottom: 52.8 }],
};
const meets = (a: PictureBox, b: PictureBox) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe("the people are never hidden or cut", () => {
  it("puts no one under the menu's glass panel", () => {
    for (const picture of PICTURES) {
      const people = titleScenePeople(picture, null, MENU);
      expect(people.length, `${picture.place}`).toBeGreaterThanOrEqual(3);
      for (const person of people)
        expect(
          meets(figureBodyBox(person), MENU.reserved[0]!),
          `${picture.place} ${person.spotId}`,
        ).toBe(false);
    }
  });

  it("keeps every figure inside the picture's left and right edges", () => {
    for (const picture of PICTURES)
      for (const person of titleScenePeople(picture, null, { reserved: [] })) {
        const body = figureBodyBox(person);
        expect(
          body.left,
          `${picture.place} ${person.spotId}`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          body.right,
          `${picture.place} ${person.spotId}`,
        ).toBeLessThanOrEqual(100);
      }
  });

  it("drops whoever the window's edge would cut", () => {
    const people = titleScenePeople(day("election-night-venue"));
    const edge = {
      reserved: [],
      frame: { left: 30, right: 70 },
    } satisfies TitleSceneRoom;
    const seen = titlePeopleInView(people, edge);
    expect(seen.length).toBeLessThan(people.length);
    for (const person of seen) {
      const body = figureBodyBox(person);
      expect(body.left).toBeGreaterThanOrEqual(30);
      expect(body.right).toBeLessThanOrEqual(70);
    }
  });

  it("keeps a rally's speaker and both debaters in sight beside the menu", () => {
    const rally = titleScenePeople(day("rally-stage"), null, MENU);
    const speaker = rally.find(
      (person) => spotOf("rally-stage", person).hero === true,
    );
    expect(speaker, "the rally's speaker").toBeDefined();
    expect(isSeatedPose(poseOf(speaker!))).toBe(false);
    const debate = titleScenePeople(day("debate-stage"), null, MENU);
    expect(debate.filter((person) => poseOf(person) === "podium")).toHaveLength(
      2,
    );
  });

  it("is lit as its picture is: night darker, morning warmer, midday as drawn", () => {
    expect(titlePeopleTint("midday")).toBeNull();
    expect(titlePeopleTint(undefined)).toBeNull();
    expect(titlePeopleTint("night")).toMatch(/brightness\(0\.\d+\)/);
    expect(titlePeopleTint("morning")).toMatch(/sepia/);
  });
});

describe("the people stand where a person can stand", () => {
  type Staging = Record<
    string,
    {
      horizonY: number;
      metersPercent: number;
      furniture?: {
        id: string;
        left: number;
        right: number;
        top: number;
        baseY: number;
      }[];
      spots: {
        id?: string;
        x: number;
        y: number;
        pose?: string;
        floor?: string;
      }[];
    }
  >;
  const places = (staging as unknown as { places: Staging }).places;

  it("puts no standing foot inside the front of a desk or a table", () => {
    let recorded = 0;
    for (const [place, stage] of Object.entries(places))
      for (const piece of stage.furniture ?? []) {
        recorded++;
        for (const spot of stage.spots)
          if (spot.pose === "stand")
            expect(
              spot.x > piece.left &&
                spot.x < piece.right &&
                spot.y > piece.top &&
                spot.y < piece.baseY,
              `${place} ${spot.id} stands inside the ${piece.id}`,
            ).toBe(false);
      }
    expect(recorded).toBeGreaterThanOrEqual(1);
    expect(places["oval-office"]!.furniture?.[0]?.id).toBe("president-desk");
  });

  it("scales a sitter by their depth exactly as a stander at that depth", () => {
    for (const picture of PICTURES) {
      const stage = backdropStaging(picture.place)!;
      for (const person of titleScenePeople(picture)) {
        const spot = spotOf(picture.place, person);
        if (spot.floorMetersPercent !== undefined) continue;
        const meters =
          (spot.floor !== undefined ? stage.floors?.[spot.floor] : undefined) ??
          stage.metersPercent;
        const horizon = spot.floorHorizonY ?? stage.horizonY;
        expect(
          person.heightPercent,
          `${picture.place} ${person.spotId}`,
        ).toBeCloseTo(1.7 * meters * (spot.y - horizon), 6);
      }
    }
  });

  it("seats the people on one sofa at one depth, so none is far larger", () => {
    const stage = backdropStaging("oval-office")!;
    for (const side of [(x: number) => x < 50, (x: number) => x > 50]) {
      const sofa = stage.spots.filter(
        (spot) => spot.pose === "sit" && side(spot.x),
      );
      expect(sofa.length).toBeGreaterThanOrEqual(2);
      expect(new Set(sofa.map((spot) => spot.y)).size).toBe(1);
    }
  });

  it("never stacks three people in one line on the floor", () => {
    for (const picture of PICTURES) {
      const open = titleScenePeople(picture).filter((person) => {
        const spot = spotOf(picture.place, person);
        return spot.pose === "stand" && spot.floor === undefined;
      });
      for (const person of open) {
        const here = figureBodyBox(person);
        const stacked = open.filter((other) => {
          if (other === person) return false;
          const there = figureBodyBox(other);
          const across =
            Math.min(here.right, there.right) - Math.max(here.left, there.left);
          return (
            across >
            0.5 * Math.min(here.right - here.left, there.right - there.left)
          );
        });
        expect(
          stacked.length,
          `${picture.place} ${person.spotId} is stacked with others`,
        ).toBeLessThan(2);
      }
    }
  });
});
