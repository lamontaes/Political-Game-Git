import { expect, it } from "vitest";
import {
  selectRecordPose,
  PLAYTEST65_WHITE_HOUSE_LAYOUT,
} from "./playtest65-visual-layout";
it("does not invent a pose when the current saved generation has no compatible paint", () => {
  const source = {
    id: "engaged-a",
    poseFamily: "record-open",
    repertoire: "engaged" as const,
    distinctSourceSha256: "source-a",
  };
  expect(
    selectRecordPose(
      "person",
      { repertoire: "engaged" },
      [source],
      ["standing-neutral"],
    ),
  ).toBe("standing-neutral");
  expect(
    selectRecordPose(
      "person",
      { repertoire: "reflective" },
      [source],
      ["record-open"],
    ),
  ).toBe("standing-neutral");
});
it("presentation selection is stable and independent of catalogue ordering", () => {
  const a = {
    id: "a",
    poseFamily: "open-a",
    repertoire: "engaged" as const,
    distinctSourceSha256: "a",
  };
  const b = { ...a, id: "b", poseFamily: "open-b", distinctSourceSha256: "b" };
  const context = Object.freeze({
    key: "public-record",
    repertoire: "engaged" as const,
  });
  const first = selectRecordPose(
    "saved-person",
    context,
    [a, b],
    ["open-a", "open-b"],
  );
  expect(
    selectRecordPose("saved-person", context, [b, a], ["open-a", "open-b"]),
  ).toBe(first);
  expect(["open-a", "open-b"]).toContain(first);
});
it("keeps measured candidate art unreleased and VP separately contextualized", () => {
  expect(PLAYTEST65_WHITE_HOUSE_LAYOUT.plateUrl).toBeNull();
  expect(PLAYTEST65_WHITE_HOUSE_LAYOUT.status).toBe(
    "candidate-integration-review",
  );
  expect(PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas).toEqual({
    width: 1672,
    height: 941,
  });
  expect(PLAYTEST65_WHITE_HOUSE_LAYOUT.vicePresidentPresentation).toBe(
    "record-card",
  );
});
