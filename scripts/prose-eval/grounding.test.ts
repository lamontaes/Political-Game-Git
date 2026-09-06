import { describe, expect, it } from "vitest";
import {
  checkGrounding,
  extractProse,
  formatGroundingReport,
  parseReviewerVerdict,
} from "./grounding";
import { loadProbes } from "./probes";

const probes = loadProbes();

describe("grounding probes", () => {
  it("ships a probe for every failure class the reserve round found", () => {
    const rules = new Set(probes.map((probe) => probe.expectedRule));
    expect(rules).toContain("date-invention");
    expect(rules).toContain("delivery-invention");
    expect(rules).toContain("scope-widening");
    expect(rules).toContain("player-gender");
    expect(rules).toContain("surface-drift");
    expect(probes.some((probe) => probe.expectPass)).toBe(true);
  });

  for (const probe of probes) {
    it(`${probe.id} -> ${probe.expectPass ? "PASS" : `FAIL ${probe.expectedRule}`}`, () => {
      const report = checkGrounding(probe.packet, probe.output);
      if (probe.expectPass) {
        expect(formatGroundingReport(report)).toBe("GROUNDING: PASS");
      } else {
        expect(report.pass).toBe(false);
        expect(report.findings.map((finding) => finding.rule)).toContain(
          probe.expectedRule,
        );
      }
    });
  }
});

describe("grounding gate mechanics", () => {
  it("judges prose, not the result envelope or review metadata", () => {
    const prose = extractProse(
      [
        "result: SAFE_RENDER_WITH_OMISSION",
        "prose: You wait.",
        "omitted:",
        "- Tuesday, unsupported",
      ].join("\n"),
    );
    expect(prose).toContain("You wait.");
    expect(prose.toLowerCase()).not.toContain("tuesday");
  });

  it("checks a bare output that carries no result envelope", () => {
    const report = checkGrounding(
      "KNOWN WORLD FACTS:\n- The vote was 5-2.",
      "The vote was 5-2 on Friday.",
    );
    expect(report.pass).toBe(false);
    expect(report.findings[0].rule).toBe("date-invention");
  });

  it("allows a day the packet actually supplies", () => {
    const report = checkGrounding(
      "KNOWN WORLD FACTS:\n- The filing is due Friday.",
      "result: SAFE_RENDER\nprose: The filing is due Friday.",
    );
    expect(report.pass).toBe(true);
  });

  it("defers hour precision when the packet supplies a time", () => {
    const report = checkGrounding(
      "KNOWN WORLD FACTS:\n- The hearing begins at 2:00 p.m.",
      "result: SAFE_RENDER\nprose: The hearing begins at 2:00 p.m.",
    );
    expect(report.pass).toBe(true);
  });

  it("keeps gendered pronouns legal on a native artifact surface", () => {
    const report = checkGrounding(
      "SURFACE: In-world artifact — local news brief.\nKNOWN WORLD FACTS:\n- Chair Ines Okafor voted yes.",
      "result: SAFE_RENDER\nprose: Chair Ines Okafor voted yes. She chaired the meeting.",
    );
    expect(report.findings.map((finding) => finding.rule)).not.toContain(
      "player-gender",
    );
  });

  it("reports every unsupported claim rather than only the first", () => {
    const report = checkGrounding(
      "SURFACE: Quick interaction.\nKNOWN WORLD FACTS:\n- The director asks for a summary.",
      "result: SAFE_RENDER\nprose: The director calls Tuesday to ask for a summary.",
    );
    const rules = report.findings.map((finding) => finding.rule);
    expect(rules).toContain("date-invention");
    expect(rules).toContain("delivery-invention");
  });

  it("never rewrites prose — it only reports", () => {
    const output = "result: SAFE_RENDER\nprose: The director calls Tuesday.";
    const report = checkGrounding(
      "KNOWN WORLD FACTS:\n- A summary is due.",
      output,
    );
    expect(formatGroundingReport(report)).not.toContain("prose:");
    expect(output).toBe(
      "result: SAFE_RENDER\nprose: The director calls Tuesday.",
    );
  });
});

describe("reviewer verdict parsing (fail-closed)", () => {
  it("accepts a clean PASS", () => {
    expect(parseReviewerVerdict("GROUNDING: PASS")).toEqual({
      pass: true,
      malformed: false,
      claims: [],
    });
  });

  it("accepts a PASS inside a code fence", () => {
    expect(parseReviewerVerdict("```\nGROUNDING: PASS\n```").pass).toBe(true);
  });

  it("collects each unsupported claim", () => {
    const verdict = parseReviewerVerdict(
      [
        "GROUNDING: UNSUPPORTED",
        "- claim: calls your office",
        "  class: delivery",
        "  why: no channel established",
        "- claim: Tuesday",
        "  class: date",
        "  why: no date established",
      ].join("\n"),
    );
    expect(verdict.pass).toBe(false);
    expect(verdict.malformed).toBe(false);
    expect(verdict.claims).toEqual(["calls your office", "Tuesday"]);
  });

  it("does not pass a reviewer that narrates around the verdict", () => {
    const verdict = parseReviewerVerdict(
      "## Claims Analysis\nEverything traces back fine.\nGROUNDING: PASS",
    );
    expect(verdict.pass).toBe(false);
    expect(verdict.malformed).toBe(true);
  });

  it("does not pass an unparseable reply", () => {
    const verdict = parseReviewerVerdict("Looks good to me!");
    expect(verdict.pass).toBe(false);
    expect(verdict.malformed).toBe(true);
  });

  it("does not pass an UNSUPPORTED verdict that names no claim", () => {
    expect(parseReviewerVerdict("GROUNDING: UNSUPPORTED").malformed).toBe(true);
  });
});
