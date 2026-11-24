/**
 * A cause no variant was written for plays its purpose's own arc (the
 * Train's bisect, Nov 14): a speech heard at a campaign event staged the
 * speech-afterward scene, whose purpose (ask-support) keeps door variants,
 * each kept for a door (`onlyFor` petition), so no variant was open and
 * choosing one read past the end of an empty list. The scene plays
 * ask-support's own arc (purpose-arcs.json) and its own lines, as it did
 * before the door variants were kept for doors.
 *
 * Pinned: the new-game replay at Chelsea, South Dakota, replay number
 * 28f331d9b1d777cc, crashed on its second week advance on every train head
 * from the fold of #9224 to 9ed4bf9c.
 */
import { describe, expect, it } from "vitest";
import { newGameCheck } from "../../scripts/new-game-check";
import { chooseVariant, hasArcFor } from "./arc-variant";
import type { CoreState, PersonId } from "../core2/types";

// chooseVariant reads the asker's records only for the variants it scores;
// with none open it returns before reading any.
const core = { people: new Map(), modules: new Map() } as unknown as CoreState;
const speechHeard = {
  family: "ask-support",
  askerId: "person_a" as PersonId,
  askedId: "person_b" as PersonId,
  cause: { id: "speech:heard", date: "2025-02-04", facts: {} },
  setting: "venue",
};

describe("a scene plays only where its purpose has an arc for the cause", () => {
  it("a cause no variant is open to plays the purpose's own arc; a purpose with neither has no arc", () => {
    // A speech heard names no petition: no door variant is open to it, and
    // ask-support plays its own arc.
    expect(chooseVariant(core, speechHeard)).toBeNull();
    expect(hasArcFor("ask-support", {})).toBe(true);
    // A purpose with no arc of its own and no variants is not offered.
    expect(hasArcFor("no-such-purpose", {})).toBe(false);
  });

  it("the Chelsea SD new game plays two weeks", async () => {
    const out = await newGameCheck("28f331d9b1d777cc", 2);
    expect(
      out.failure,
      `${out.place}, replay number 28f331d9b1d777cc: ${out.failure?.route} ${out.failure?.body}`,
    ).toBeNull();
    expect(out.place).toBe("Chelsea, South Dakota");
  }, 120_000);
});
