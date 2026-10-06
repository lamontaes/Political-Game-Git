import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const prosecution = readFileSync(
  new URL("./prosecution.ts", import.meta.url),
  "utf8",
);
const referral = readFileSync(
  new URL("./finding-referral.ts", import.meta.url),
  "utf8",
);

describe("prosecutor referrals have no fixed shortcuts", () => {
  it("routes findings to the recorded prosecutor decision", () => {
    expect(`${prosecution}\n${referral}`).not.toContain("regulatorRefers");
  });
});
