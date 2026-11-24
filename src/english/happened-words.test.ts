import { describe, expect, it } from "vitest";
import { happenedSaid } from "./happened-words";

const fact = (text: string) => ({ text, sourceRecordIds: [`cause:${text}`] });

/**
 * The words table for what happened in a scene's first line
 * (data/english/happened-words.json, Words lead, Nov 15): a bill is said by
 * its name and cites its record; a law, a topic or a charge has no row until
 * a played first line shows it, so a cause record that names only those, or
 * nothing, gives no `happened` and the plain first line plays.
 */
describe("what happened, as a first line says it", () => {
  it("says a bill by its name, citing its record", () => {
    expect(happenedSaid({ bill: fact("Dog Park Ordinance") })).toEqual({
      text: "Dog Park Ordinance",
      sourceRecordIds: ["cause:Dog Park Ordinance"],
    });
  });

  it("says nothing for a law, a topic, a charge or a record with none", () => {
    expect(happenedSaid({ law: fact("Wage Act") })).toBeNull();
    expect(happenedSaid({ topic: fact("minimum wage") })).toBeNull();
    expect(happenedSaid({ offense: fact("bribery") })).toBeNull();
    expect(happenedSaid({ office: fact("mayor") })).toBeNull();
  });
});
