import { describe, expect, it } from "vitest";
import type { IsoDate } from "../core2/kernel/brands";
import { judgeJumpEnd } from "./jump-end";

const day = (iso: string) => iso as IsoDate;

describe("how a calendar jump may end (M0-03)", () => {
  const base = { target: day("2025-03-06"), date: day("2025-03-04") };
  it("accepts a jump that reached its target", () => {
    expect(
      judgeJumpEnd({
        kind: "complete",
        target: day("2025-03-06"),
        date: day("2025-03-06"),
      }).ok,
    ).toBe(true);
  });
  it("accepts a stop", () => {
    expect(judgeJumpEnd({ ...base, kind: "stop" }).ok).toBe(true);
  });
  it("accepts election morning at the polling place and names the visit", () => {
    const end = judgeJumpEnd({
      ...base,
      kind: "complete",
      pollingRecordId: "person_x:2025-03-04",
    });
    expect(end.ok).toBe(true);
    expect(end.why).toContain("person_x:2025-03-04");
  });
  it("accepts the player's own election morning on the day it ended", () => {
    expect(
      judgeJumpEnd({
        ...base,
        kind: "complete",
        candidateMorning: day("2025-03-04"),
      }).ok,
    ).toBe(true);
  });
  it("still fails a jump that ended early with no stop and no election morning", () => {
    expect(judgeJumpEnd({ ...base, kind: "complete" }).ok).toBe(false);
    // A candidate morning on another day does not excuse ending here.
    expect(
      judgeJumpEnd({
        ...base,
        kind: "complete",
        candidateMorning: day("2025-03-05"),
      }).ok,
    ).toBe(false);
  });
});
