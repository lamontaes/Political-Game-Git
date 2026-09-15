import { describe, expect, it } from "vitest";
import { allocateSceneOccupancy } from "./scene-occupancy";

const candidate = (anchorId: string, leftPercent: number, value: string) => ({
  anchorId,
  bounds: { leftPercent, topPercent: 20, widthPercent: 10, heightPercent: 60 },
  value,
});

describe("actual scene occupancy", () => {
  it("reserves standing capacity for a person whose outfit has no seated pose", () => {
    const people = [
      {
        personId: "a",
        candidates: [
          candidate("near", 40, "a-near"),
          candidate("sofa", 65, "a-sofa"),
        ],
      },
      { personId: "b", candidates: [candidate("near", 40, "b-near")] },
    ];
    expect(allocateSceneOccupancy(people)).toEqual(["b-near", "a-sofa"]);
    expect(allocateSceneOccupancy([...people].reverse())).toEqual(
      allocateSceneOccupancy(people),
    );
  });

  it("refuses overlapping people even when the anchors have different IDs", () => {
    expect(
      allocateSceneOccupancy([
        { personId: "a", candidates: [candidate("near", 40, "a")] },
        {
          personId: "b",
          candidates: [
            candidate("middle", 45, "overlap"),
            candidate("side", 65, "b"),
          ],
        },
      ]),
    ).toEqual(["a", "b"]);
  });

  it("never duplicates an occupant or fills an empty room", () => {
    expect(allocateSceneOccupancy([])).toEqual([]);
    const person = {
      personId: "only-present-person",
      candidates: [candidate("near", 40, "only")],
    };
    expect(allocateSceneOccupancy([person, person])).toEqual(["only"]);
  });
});
