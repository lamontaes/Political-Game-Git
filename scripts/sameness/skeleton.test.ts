import { describe, expect, it } from "vitest";
import {
  frameOf,
  samenessOf,
  sharedFrames,
  skeletonLikeness,
} from "./skeleton";

// Two speeches in the frame the owner complained about (Nov 23): every point
// is a reason, a stand and an ask, and every speech closes the same way.
const RAIL =
  "Four years ago the trains stopped running through our valleys. Most people drive. " +
  "I want passenger rail because people who cannot drive are left behind. " +
  "You know what I'm asking for on rail, so hold me to it.";
const WAGES =
  "Four years ago the mills stopped hiring in our county. Most people commute. " +
  "I want a higher wage because people who work full time are left behind. " +
  "You know what I'm asking for on wages, so hold me to it.";
// A speech that moves differently: opens on a person, asks a question, never
// closes on an ask.
const OTHER =
  "My grandmother kept her ledger in a biscuit tin. Who gets to read it now? " +
  "She would say the numbers were never the point. " +
  "Walk down to the river with me and see what the flood left.";

describe("the sameness check", () => {
  it("turns content words into slots and keeps the grammar", () => {
    expect(
      frameOf("You know what I'm asking for on rail, so hold me to it."),
    ).toBe("you know what i am asking for on _ so hold me to it");
  });

  it("flags the shared frame of two speeches built on one skeleton", () => {
    const frames = sharedFrames([RAIL, WAGES]).map((row) => row.frame);
    expect(frames).toContain(
      "you know what i am asking for on _ so hold me to it",
    );
  });

  it("flags the two speeches as one skeleton and not the different one", () => {
    expect(skeletonLikeness(RAIL, WAGES)).toBeGreaterThanOrEqual(0.8);
    expect(skeletonLikeness(RAIL, OTHER)).toBeLessThan(0.8);
  });

  it("reports pairs and frames together, and flags nothing for varied texts", () => {
    const same = samenessOf([RAIL, WAGES, OTHER]);
    expect(same.skeletons.map((pair) => [pair.a, pair.b])).toEqual([[0, 1]]);
    const varied = samenessOf([RAIL, OTHER]);
    expect(varied.skeletons).toEqual([]);
    expect(varied.frames).toEqual([]);
  });
});
