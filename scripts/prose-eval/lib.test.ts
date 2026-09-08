import { describe, expect, it } from "vitest";
import {
  buildPacketBundle,
  findResidualLeaks,
  parseResultClass,
  sanitizeOutput,
  scanHoldoutHygiene,
  seededShuffle,
  type RawOutput,
} from "./lib";

describe("parseResultClass", () => {
  it("accepts a well-formed SAFE_RENDER", () => {
    const parsed = parseResultClass(
      "result: SAFE_RENDER\nprose: You're down six points.\n",
    );
    expect(parsed.resultClass).toBe("SAFE_RENDER");
    expect(parsed.problems).toEqual([]);
  });

  it("requires omitted for SAFE_RENDER_WITH_OMISSION", () => {
    const parsed = parseResultClass(
      "result: SAFE_RENDER_WITH_OMISSION\nprose: It's around 11.\n",
    );
    expect(parsed.resultClass).toBe("SAFE_RENDER_WITH_OMISSION");
    expect(parsed.problems).toHaveLength(1);
  });

  it("forbids prose on MISSING_CONTEXT and requires missing+reason", () => {
    const bad = parseResultClass("result: MISSING_CONTEXT\nprose: oops\n");
    expect(bad.problems.length).toBeGreaterThanOrEqual(3);
    const good = parseResultClass(
      "result: MISSING_CONTEXT\nmissing: whether the character is arriving home\nreason: the requested scene is the arrival itself\n",
    );
    expect(good.problems).toEqual([]);
  });

  it("rejects unknown or duplicated result lines", () => {
    expect(parseResultClass("result: MAYBE\n").resultClass).toBeNull();
    expect(
      parseResultClass("result: SAFE_RENDER\nresult: SAFE_RENDER\n")
        .resultClass,
    ).toBeNull();
  });
});

describe("sanitizeOutput", () => {
  it("strips configuration-identifying lines and reports them", () => {
    const sanitized = sanitizeOutput(
      "result: SAFE_RENDER\nmodel: claude-fable-5, effort: low\nprose: Marcus asks you for the vote.\n",
    );
    expect(sanitized.text).not.toMatch(/fable/i);
    expect(sanitized.removedLines).toHaveLength(1);
    expect(findResidualLeaks(sanitized.text)).toEqual([]);
  });
});

describe("seededShuffle", () => {
  it("is deterministic per seed and varies across seeds", () => {
    const items = ["A", "B", "C", "D"];
    expect(seededShuffle(items, "s1::P")).toEqual(
      seededShuffle(items, "s1::P"),
    );
    const orders = new Set(
      ["P1", "P2", "P3", "P4", "P5", "P6"].map((packet) =>
        seededShuffle(items, `s1::${packet}`).join(""),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("buildPacketBundle", () => {
  const outputs: RawOutput[] = ["A", "B", "C"].map((config) => ({
    packetId: "P-XYZ",
    config: config as RawOutput["config"],
    content: `result: SAFE_RENDER\nprose: sample from a nameless source (${config === "A" ? "one" : config === "B" ? "two" : "three"}).\n`,
  }));

  it("anonymizes versions and records the sealed mapping", () => {
    const bundle = buildPacketBundle("P-XYZ", outputs, "wave-1");
    expect(bundle.reviewMarkdown).toContain("VERSION 1");
    expect(bundle.reviewMarkdown).toContain("VERSION 3");
    expect(bundle.reviewMarkdown).not.toMatch(/config/i);
    const sources = Object.values(bundle.versionSources).sort();
    expect(sources).toEqual(["A", "B", "C"]);
  });

  it("fails closed when identifying text survives sanitization", () => {
    const leaky: RawOutput[] = [
      {
        packetId: "P-XYZ",
        config: "A",
        content:
          "result: SAFE_RENDER\nprose: the aide's civic-prose briefing arrives at noon\n",
      },
    ];
    expect(() => buildPacketBundle("P-XYZ", leaky, "wave-1")).toThrow(
      /inside the prose itself/,
    );
  });
});

describe("scanHoldoutHygiene", () => {
  it("flags holdout packet ids and passes clean files", () => {
    const flagged = scanHoldoutHygiene([
      { path: "x.md", content: "see packet H-0" + "01 for details" },
    ]);
    expect(flagged).toHaveLength(1);
    const clean = scanHoldoutHygiene([
      { path: "y.md", content: "holdouts live in Drive and stay there" },
    ]);
    expect(clean).toEqual([]);
  });
});
