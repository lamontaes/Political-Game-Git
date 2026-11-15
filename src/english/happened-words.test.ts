import { describe, expect, it } from "vitest";
import { happenedSaid } from "./happened-words";

const fact = (text: string) => ({ text, sourceRecordIds: [`cause:${text}`] });

/**
 * The words table for what happened in a scene's first line
 * (data/english/happened-words.json, Words lead, Nov 15): each of the four
 * facts that fill `happened` is said its own way and cites its record, a
 * law named by its bill comes before what it is about, and a cause record
 * that names none of them gives no `happened` at all.
 */
describe("what happened, as a first line says it", () => {
  it("says each fact the way the table words it", () => {
    expect(
      happenedSaid({ law: fact("Missing Middle Housing Ordinance") }),
    ).toEqual({
      text: "Missing Middle Housing Ordinance",
      sourceRecordIds: ["cause:Missing Middle Housing Ordinance"],
    });
    expect(happenedSaid({ bill: fact("Dog Park Ordinance") })?.text).toBe(
      "Dog Park Ordinance",
    );
    expect(happenedSaid({ topic: fact("minimum wage") })?.text).toBe(
      "the law on minimum wage",
    );
    expect(happenedSaid({ offense: fact("assault") })?.text).toBe(
      "the assault charge",
    );
  });

  it("takes the law by name before what it is about, and nothing else", () => {
    expect(
      happenedSaid({ topic: fact("minimum wage"), law: fact("Wage Act") })
        ?.text,
    ).toBe("Wage Act");
    expect(
      happenedSaid({ office: fact("mayor"), org: fact("the mill") }),
    ).toBeNull();
  });
});
