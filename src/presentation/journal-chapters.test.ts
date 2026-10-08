import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "./new-game";
import { composeChapters } from "./journal-chapters";
import { projectWorld39Journal } from "./world39-journal";
import { RESEARCHED_PLACE_KEYS } from "../simulation/statutory-tax-rules";
import { seatOfGovernmentPlace } from "../simulation/life-places";

const ALL_PLACE_KEYS = RESEARCHED_PLACE_KEYS.map((jurisdictionKey) => {
  const seat = seatOfGovernmentPlace(jurisdictionKey);
  if (!seat)
    throw new Error(`No playable seat of government for ${jurisdictionKey}.`);
  return seat.place.key;
});

function newLife(placeKey = "kentucky", seed = "journal-chapters-boundaries") {
  const game = createNewGameWorld({
    placeKey,
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

describe("composeChapters", () => {
  it("keeps canonical dated records in order and respects the through date", () => {
    const { world, personId } = newLife();
    const source = projectWorld39Journal(world, personId).entries;
    const through = source[Math.floor(source.length / 2)]!.at;
    const expected = source.filter((entry) => entry.at <= through);
    const before = JSON.stringify(world);

    const chapters = composeChapters(world, personId, through);
    const entries = chapters.flatMap((chapter) => chapter.entries);

    expect(entries.map((entry) => entry.id)).toEqual(
      expected.map((entry) => entry.id),
    );
    expect(chapters.every((chapter) => chapter.title.length > 0)).toBe(true);
    expect(new Set(chapters.map((chapter) => chapter.title)).size).toBe(
      chapters.length,
    );
    expect(chapters.every((chapter) => chapter.through <= through)).toBe(true);
    expect(
      chapters
        .flatMap((chapter) => chapter.firstMentionKin)
        .every((kin) => kin.name.length > 0 && kin.relation.length > 0),
    ).toBe(true);
    const kinshipEntries = expected.filter((entry) =>
      entry.id.startsWith("kinship:"),
    );
    const uniqueRelatives = new Set(
      kinshipEntries.flatMap((entry) => {
        const relationship = world.history.kinshipRelationships.find(
          (record) => record.id === entry.sourceId,
        );
        return relationship?.personIds.filter((id) => id !== personId) ?? [];
      }),
    );
    expect(
      chapters.reduce(
        (count, chapter) => count + chapter.firstMentionKin.length,
        0,
      ),
    ).toBe(uniqueRelatives.size);
    expect(JSON.stringify(world)).toBe(before);
  });

  it.each(ALL_PLACE_KEYS)("uses the same chapter path in %s", (placeKey) => {
    const game = newLife(placeKey, `journal-chapters-all-places:${placeKey}`);
    const chapters = composeChapters(
      game.world,
      game.playerPersonId,
      game.world.currentDate,
    );
    const entries = projectWorld39Journal(
      game.world,
      game.playerPersonId,
    ).entries;

    expect(chapters.flatMap((chapter) => chapter.entries)).toEqual(entries);
  });
});
