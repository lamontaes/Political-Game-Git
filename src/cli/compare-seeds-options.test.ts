import { describe, expect, it } from "vitest";

import { parseCompareSeedOptions } from "./compare-seeds-options";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";

describe("compare-seeds requires an explicit place", () => {
  it("refuses flags that would otherwise inherit the Kentucky compatibility default", () => {
    expect(() => parseCompareSeedOptions([])).toThrow(/--place/);
    expect(() => parseCompareSeedOptions(["--age", "34"])).toThrow(/--place/);
    expect(() =>
      parseCompareSeedOptions(["--household", "lives-alone"]),
    ).toThrow(/--place/);
  });

  it("keeps other frame fields while using only the named place", () => {
    const options = parseCompareSeedOptions([
      "--age",
      "34",
      "--place",
      "2743000",
    ]);
    expect(options.setup.placeKey).toBe("2743000");
    expect(options.setup.placeKey).not.toBe(DEFAULT_NEW_GAME_SETUP.placeKey);
    expect(options.setup.startAge).toBe(34);
  });
});
