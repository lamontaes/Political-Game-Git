/**
 * A piece written as an opener keeps its closing comma when it is said ("In 2012,"),
 * so the engine's one joiner (`framedByAge`) sets it before its sentence: "In 2012, I
 * first went to school." The rule that no comma stands before a stop or another comma
 * (rule 136) still drops an appositive's comma there. Every opener in the life story's
 * bank is checked.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { framedByAge } from "./journal-words";
import { screenPick } from "./screen-words";

const bank = JSON.parse(
  readFileSync("data/english/parts/person-history.json", "utf8"),
) as { parts: { key: string; text: string }[] };
const openers = bank.parts.filter((part) => /,$/.test(part.text.trim()));

describe("an opener keeps its comma", () => {
  it("every life-story opener is said with its closing comma", () => {
    expect(openers.length).toBeGreaterThan(0);
    for (const part of openers) {
      const said = screenPick(
        "person-history",
        [part.key],
        { year: "2012", age: "11" },
        { momentKey: part.key, sourceIds: ["record:opener"] },
      );
      if (!said) continue;
      expect(said.text, part.key).toMatch(/,$/);
    }
  });

  it("joins an opener to its sentence with the comma, and keeps the joiner's stop rule", () => {
    const said = screenPick(
      "person-history",
      ["person-history.when.year"],
      { year: "2012" },
      { momentKey: "opener-joined", sourceIds: ["record:opener"] },
    );
    expect(said?.text).toBe("In 2012,");
    const joined = framedByAge(
      { text: said!.text, sourceRecordIds: ["record:opener"] },
      { text: "I first went to school.", sourceRecordIds: ["record:opener"] },
      {},
    );
    expect(joined.text).toBe("In 2012, I first went to school.");
  });
});
