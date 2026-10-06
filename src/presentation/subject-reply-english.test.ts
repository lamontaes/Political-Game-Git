import { describe, expect, it } from "vitest";
import { deserializeWorld, serializeWorld } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { drawRandomPlace } from "../../tests/support/random-place";
import { linePartsOf, linePartsTag } from "./english-composition";
import { standingTone } from "./reply-meaning";
import {
  composeSubjectReply,
  SCHOOL_RAISE,
  SCHOOL_OFFER,
  SCHOOL_SPLIT_AGREED,
  SCHOOL_SPLIT_REFUSED,
  SCHOOL_SPLIT_UNDECIDED,
  NEIGHBORHOOD_MENTION,
  NEIGHBORHOOD_SAY_GOING,
  NEIGHBORHOOD_WILL_GO,
  NEIGHBORHOOD_WILL_NOT_GO,
  NEIGHBORHOOD_YOU_GO,
  NEIGHBORHOOD_UNDECIDED,
  SCHOOL_OPEN,
} from "./subject-reply-english";

describe("recorded conditions in school and neighborhood English", () => {
  it("composes each meaning, replays parts, and refuses an unsourced project name", () => {
    const seed = "session4-subject-english";
    const place = drawRandomPlace(seed, (p) => p.scope === "locality");
    const { world, playerPersonId } = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
    });
    const speaker = world.personOrder.find((id) => id !== playerPersonId)!;
    const tone = standingTone(world, speaker, playerPersonId);
    for (const bank of [
      SCHOOL_RAISE,
      SCHOOL_OFFER,
      SCHOOL_SPLIT_AGREED,
      SCHOOL_SPLIT_REFUSED,
      SCHOOL_SPLIT_UNDECIDED,
      NEIGHBORHOOD_MENTION,
      NEIGHBORHOOD_SAY_GOING,
      NEIGHBORHOOD_WILL_GO,
      NEIGHBORHOOD_WILL_NOT_GO,
      NEIGHBORHOOD_YOU_GO,
      NEIGHBORHOOD_UNDECIDED,
    ]) {
      const result = composeSubjectReply(
        world,
        "subject-proof",
        tone,
        bank,
        speaker,
        playerPersonId,
      );
      expect(result.parts.length).toBeGreaterThan(0);
      expect(linePartsOf([linePartsTag(result.parts)])).toEqual(
        result.parts.map((part) => part.partKey),
      );
      expect(
        composeSubjectReply(
          deserializeWorld(serializeWorld(world)),
          "subject-proof",
          tone,
          bank,
          speaker,
          playerPersonId,
        ),
      ).toEqual(result);
    }
    expect(() =>
      composeSubjectReply(
        world,
        "missing-project",
        tone,
        SCHOOL_OPEN,
        speaker,
        playerPersonId,
      ),
    ).toThrow("work");
  });
});
