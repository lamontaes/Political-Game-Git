import { describe, expect, it } from "vitest";
import { placeIsSaid } from "./race-turnout-facts";

// A race's best place is said only by a name a person says (P3, North Hyde
// Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, Nov 13:
// "seat:US-VT:lower:L-2:0 gave Carlos Gibson the most").
describe("the place that gave the winner the most", () => {
  it("is never a record key", () => {
    expect(placeIsSaid("seat:US-VT:lower:L-2:0")).toBe(false);
    expect(placeIsSaid("VT-02")).toBe(false);
    expect(placeIsSaid("VT-AL")).toBe(false);
  });
  it("is a county or a town by its name", () => {
    expect(placeIsSaid("Lamoille County")).toBe(true);
    expect(placeIsSaid("North Hyde Park")).toBe(true);
  });
});
