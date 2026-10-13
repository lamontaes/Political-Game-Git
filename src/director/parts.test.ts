import { describe, expect, it } from "vitest";
import conversationJson from "./data/conversation.json" with { type: "json" };
import journalJson from "./data/journal.json" with { type: "json" };
import heldJson from "./data/parts-held.json" with { type: "json" };
import { asTemplate, withParts } from "./parts";

const slots = (text: string) =>
  [...text.matchAll(/\{\{([a-z][a-z0-9-]*)\}\}/g)].map((m) => m[1]).sort();

type Row = { key: string; text: string; stages?: readonly string[] };
const conversationMoves = Object.entries(
  conversationJson.subjects as unknown as Record<
    string,
    Record<string, unknown>
  >,
).flatMap(([kind, bank]) =>
  Object.entries(bank).flatMap(([field, moves]) =>
    Array.isArray(moves)
      ? (moves as Row[])
          .filter((move) => move?.text)
          .map((move) => ({ kind, field, move }))
      : [],
  ),
);

describe("mined speech parts", () => {
  it("turns a part's slots into the engine's", () => {
    expect(asTemplate("I work at {my_employer}.")).toBe(
      "I work at {{my-employer}}.",
    );
  });

  it("adds real wordings to the director's choices, each filling exactly the choice's slots", () => {
    let added = 0;
    for (const { kind, field, move } of conversationMoves) {
      const variants = withParts("conversation", kind, field, move);
      expect(variants[0]).toEqual(move);
      for (const variant of variants.slice(1)) {
        added += 1;
        expect(slots(variant.text)).toEqual(slots(move.text));
        expect(variant.key.startsWith(`${move.key}~`)).toBe(true);
        expect(variant.stages).toEqual(move.stages);
      }
    }
    expect(added).toBeGreaterThan(conversationMoves.length / 2);
  });

  it("never uses a part held back for saying what the records don't", () => {
    const held = new Set(Object.keys(heldJson.held));
    const lines = (journalJson as unknown as { lines: (Row[] | string)[] })
      .lines as unknown as {
      kindPrefix: string;
      line: Row[];
      otherLine?: Row[];
    }[];
    const used = [
      ...conversationMoves.flatMap(({ kind, field, move }) =>
        withParts("conversation", kind, field, move).slice(1),
      ),
      ...lines.flatMap((row) =>
        row.line.flatMap((variant) =>
          withParts("journal", row.kindPrefix, "line", variant).slice(1),
        ),
      ),
    ].map((variant) => variant.key.split("~")[1]!);
    expect(used.length).toBeGreaterThan(0);
    for (const key of used) expect(held.has(key)).toBe(false);
  });
});
