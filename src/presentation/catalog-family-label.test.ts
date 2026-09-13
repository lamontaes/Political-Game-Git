import { describe, expect, it } from "vitest";

import {
  catalogFamilyLabel,
  catalogFamilyLabels,
} from "./catalog-family-label";

describe("catalog family labels", () => {
  it("turns catalog ids into readable player text", () => {
    expect(catalogFamilyLabel("cardigan-rust")).toBe("Cardigan rust");
    expect(catalogFamilyLabel("average_man")).toBe("Average man");
    expect(catalogFamilyLabels(["buzz", "cardigan-rust"])).toEqual({
      buzz: "Buzz",
      "cardigan-rust": "Cardigan rust",
    });
  });
});
