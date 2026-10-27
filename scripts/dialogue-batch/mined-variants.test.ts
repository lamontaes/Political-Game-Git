import { describe, expect, it } from "vitest";

import {
  axisOf,
  fill,
  formalityOf,
  minedParts,
  saysTheSame,
  slotValues,
  variantsFor,
} from "./mined-variants";

describe("variants come from the mined bank, one axis each", () => {
  it("reads the slot values a line filled into a part, and refills another part", () => {
    const found = slotValues(
      { text: "I work at {my_employer}." },
      "Sure. I work at Flynn's General Store.",
    );
    expect(found?.values).toEqual({ my_employer: "Flynn's General Store" });
    expect(fill("At {my_employer}.", found!.values)).toBe(
      "At Flynn's General Store.",
    );
    expect(fill("Near {nowhere}.", found!.values)).toBeNull();
  });

  it("reads a slot only as the kind of fact it names", () => {
    // "born" is not an age: the line is not the funeral part.
    expect(
      slotValues({ text: "{relation} was {age}." }, "My daughter was born."),
    ).toBeNull();
    expect(
      slotValues({ text: "{relation} was {age}." }, "My father was 84.")
        ?.values,
    ).toEqual({ relation: "My father", age: "84" });
  });

  it("offers no part of a broad move that means something else", () => {
    const all = minedParts();
    const find = (text: string) =>
      [...all.values()].find((part) => part.text === text)!;
    expect(
      saysTheSame(
        find("The meeting will come to order."),
        find("Please state your name for the record."),
      ),
    ).toBe(false);
    // A record's choice is its event: a marriage never retells a birth.
    expect(saysTheSame(find("{named} was born."), find("I got married."))).toBe(
      false,
    );
  });

  it("assigns one axis by its proxy", () => {
    expect(
      axisOf("Hi.", "Hello there, my friend, good to see you today."),
    ).toBe("length");
    expect(axisOf("You work here.", "You work here?")).toBe(
      "sentence structure",
    );
    expect(axisOf("Yeah, I'm fine.", "Yes, I am fine.")).toBe("formality");
    expect(formalityOf("Good morning.")).toBeGreaterThan(formalityOf("Hey."));
    expect(axisOf("Take care now.", "Be well, friend.")).toBe("word choice");
    expect(axisOf("Same words.", "Same words.")).toBeNull();
    expect(axisOf("Okay.", "Okay!", 0.8)).toBe("personality fit");
    expect(axisOf("Okay.", "Okay!")).toBeNull();
  });

  it("offers only real parts of the same bank, at most one per axis", () => {
    const all = minedParts();
    const hello = [...all.values()].find((part) => part.text === "Hello.");
    expect(hello).toBeDefined();
    const result = variantsFor("Hello.", [hello!.key]);
    for (const variant of result?.variants ?? []) {
      expect(all.get(variant.partKey)?.bank).toBe(hello!.bank);
      expect(variant.partKey).not.toBe(hello!.key);
    }
    const axes = (result?.variants ?? []).map((variant) => variant.axis);
    expect(new Set(axes).size).toBe(axes.length);
    expect(axes.length).toBeLessThanOrEqual(5);
  });
});
