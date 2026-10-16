import { describe, expect, it } from "vitest";
import { properName } from "./words";

describe("properName", () => {
  it("keeps a broadcast call sign in capitals", () => {
    expect(properName("KTKY-TV")).toBe("KTKY-TV");
    expect(properName("WNIA-TV")).toBe("WNIA-TV");
    expect(properName("KQED-FM")).toBe("KQED-FM");
  });
  it("still writes other all-capital record names word by word", () => {
    expect(properName("CENTRAL HIGH")).toBe("Central High");
    expect(properName("WEST")).toBe("West");
    expect(properName("COUNTY OF WASHINGTON treasury")).toBe(
      "County of Washington treasury",
    );
  });
});
