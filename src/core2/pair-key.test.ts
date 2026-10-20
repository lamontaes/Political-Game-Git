import { expect, it } from "vitest";
import { pairKey } from "./pair-key";

// The tie id is the two ids in sorted order, joined by a colon: the same
// string the older `[a, b].sort().join(":")` made, in either argument order.
it("makes the key of sorting the two ids and joining them", () => {
  const ids = [
    "person_00ab",
    "person_00AB",
    "person_9f",
    "person_10",
    "organization_x",
    "p",
    "pp",
    "é",
    "z",
    "",
  ];
  for (const a of ids)
    for (const b of ids) {
      expect(pairKey(a, b), `${a} ${b}`).toBe([a, b].sort().join(":"));
      expect(pairKey(a, b)).toBe(pairKey(b, a));
    }
});
