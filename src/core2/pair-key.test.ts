/** The pair id of two people is the same string the sort-and-join it replaced made. */
import { expect, it } from "vitest";
import { pairKey } from "./kernel/ids";

it("equals [a, b].sort().join(':') for every order and for equal ids", () => {
  const ids = [
    "person_0a1",
    "person_0a2",
    "person_Z",
    "person_a",
    "person_10",
    "person_9",
    "p",
    "person_é",
    "",
  ];
  for (const a of ids)
    for (const b of ids) {
      expect(pairKey(a, b), `${a}|${b}`).toBe([a, b].sort().join(":"));
      expect(pairKey(a, b)).toBe(pairKey(b, a));
    }
});
