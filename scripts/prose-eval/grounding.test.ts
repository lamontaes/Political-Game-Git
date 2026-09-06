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
  it("ships a probe for every failure class, including the audit-found ones", () => {
    const rules = new Set(probes.map((probe) => probe.expectedRule));
    expect(rules).toContain("date-invention");
    expect(rules).toContain("time-invention");
    expect(rules).toContain("delivery-invention");
    expect(rules).toContain("scope-widening");
    expect(rules).toContain("player-gender");
    expect(rules).toContain("surface-drift");
    expect(rules).toContain("envelope-drift");
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

describe("audit-reproduced gate defects", () => {
  const rules = (packet: string, output: string) =>
    checkGrounding(packet, output).findings.map((f) => f.rule);

  it("rejects an unsupported approximate time and passes a supported one", () => {
    expect(
      rules(
        "KNOWN WORLD FACTS:\n- The character is at the kitchen table.",
        "result: SAFE_RENDER\nprose: It's around 11 at the kitchen table.",
      ),
    ).toContain("time-invention");
    expect(
      checkGrounding(
        "KNOWN WORLD FACTS:\n- It is around 11 at night.",
        "result: SAFE_RENDER\nprose: It's around 11.",
      ).pass,
    ).toBe(true);
  });

  it("does not let an NPC's pronoun license a player pronoun of another gender", () => {
    expect(
      rules(
        "SURFACE: Narrative transition.\nRELATIONSHIPS: Director Boase set the schedule; he chairs the board.\nKNOWN WORLD FACTS:\n- The character goes to the annex.",
        "result: SAFE_RENDER\nprose: She heads to the annex.",
      ),
    ).toContain("player-gender");
  });

  it("still allows a same-gender NPC pronoun the packet supplies", () => {
    expect(
      rules(
        "SURFACE: Quick interaction.\nRELATIONSHIPS: Chair Okafor runs the meeting; she keeps it short.\nKNOWN WORLD FACTS:\n- Okafor opens the session.",
        "result: SAFE_RENDER\nprose: Okafor opens the session; she keeps it short.",
      ),
    ).not.toContain("player-gender");
  });

  it("does not let the word 'brief' in OUTPUT REQUEST switch off the identity check", () => {
    expect(
      rules(
        "SURFACE: Quick interaction.\nKNOWN WORLD FACTS:\n- A resident asks where to file.\nOUTPUT REQUEST: Brief the player in one sentence.",
        "result: SAFE_RENDER\nprose: He points the resident to the window.",
      ),
    ).toContain("player-gender");
  });

  it("rejects an unknown result class and bare chatter outside the envelope", () => {
    expect(
      rules(
        "KNOWN WORLD FACTS:\n- A filing is due.",
        "result: RENDER\nprose: You review the filing.",
      ),
    ).toContain("envelope-drift");
    expect(
      rules(
        "KNOWN WORLD FACTS:\n- A filing is due.",
        "Sure, here it is:\nresult: SAFE_RENDER\nprose: You review the filing.",
      ),
    ).toContain("envelope-drift");
  });

  it("passes a valid multi-line envelope with choices", () => {
    expect(
      checkGrounding(
        "SURFACE: Quick interaction plus choices.\nKNOWN WORLD FACTS:\n- The secretary calls: the hearing moved to the larger room.",
        "result: SAFE_RENDER\nprose: The secretary calls: the hearing moved to the larger room.\n\n1. Head over.\n2. Send word.",
      ).pass,
    ).toBe(true);
  });

  it("inspects a later prose line in a bare multi-line output, not only the first", () => {
    expect(
      rules(
        "SURFACE: Quick interaction.\nKNOWN WORLD FACTS:\n- A filing is due.",
        "You review the filing.\nThe clerk calls Tuesday to confirm.",
      ),
    ).toEqual(expect.arrayContaining(["delivery-invention", "date-invention"]));
  });

  it("does not let a stray packet quotation license staged dialogue on a note", () => {
    expect(
      rules(
        'SURFACE: Staff-work task note.\nKNOWN WORLD FACTS:\n- Nasser wants a summary of "the sunset clause" by the Friday filing.',
        "result: SAFE_RENDER\nprose: Get me the summary by the Friday filing, Nasser says, dropping into the chair.",
      ),
    ).toContain("surface-drift");
  });

  it("allows a packet-supplied quotation logged verbatim on a note", () => {
    expect(
      checkGrounding(
        'SURFACE: Staff-work task note.\nKNOWN WORLD FACTS:\n- The notice reads, in full: "Room 204 is closed for the Friday filing."',
        'result: SAFE_RENDER\nprose: Notice to log: "Room 204 is closed for the Friday filing."',
      ).pass,
    ).toBe(true);
  });

  it("does not read the modal 'may' as the month but still catches a real month date", () => {
    expect(
      checkGrounding(
        "SURFACE: Quick interaction.\nKNOWN WORLD FACTS:\n- The board weighs Permit 19.",
        "result: SAFE_RENDER\nprose: The board may take Permit 19 to a second reading.",
      ).pass,
    ).toBe(true);
    expect(
      rules(
        "KNOWN WORLD FACTS:\n- The board approved the calendar.",
        "result: SAFE_RENDER\nprose: The first day is set for May 3.",
      ),
    ).toContain("date-invention");
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
