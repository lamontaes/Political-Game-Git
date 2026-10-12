import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_MAX_LINE_CHARS,
  BUG_REPORT_MAX_LOG_LINES,
  buildBugReport,
  scrubPrivateDetails,
  serializeBugReport,
} from "./bug-report";

const identity = {
  version: "0.6.0",
  revision: "0eed3647352",
  revisionShort: "0eed364",
  dirty: false,
};

describe("bug report", () => {
  it("carries the build, the place and seed, and the log", () => {
    const report = buildBugReport({
      kind: "player",
      identity,
      createdAt: "2026-10-12T14:00:00Z",
      note: "The clerk would not take my filing.",
      place: { name: "Absecon", seed: 12345 },
      log: ["day 1 started", "day 2 started"],
    });
    expect(report.build).toBe("v0.6.0+0eed364");
    expect(report.place).toEqual({ name: "Absecon", seed: "12345" });
    expect(report.log).toEqual(["day 1 started", "day 2 started"]);
    expect(report.logLinesDropped).toBe(0);
    expect(report.error).toBeNull();
  });

  it("keeps the newest lines and says how many it dropped", () => {
    const log = Array.from(
      { length: BUG_REPORT_MAX_LOG_LINES + 7 },
      (_, i) => `line ${i}`,
    );
    const report = buildBugReport({
      kind: "player",
      identity,
      createdAt: "t",
      log,
    });
    expect(report.log).toHaveLength(BUG_REPORT_MAX_LOG_LINES);
    expect(report.log[report.log.length - 1]).toBe(`line ${log.length - 1}`);
    expect(report.logLinesDropped).toBe(7);
  });

  it("takes account names and emails out of the log, note and crash stack", () => {
    expect(scrubPrivateDetails("/Users/sam/Library/x.json")).toBe(
      "/Users/<user>/Library/x.json",
    );
    expect(scrubPrivateDetails("C:\\Users\\sam\\AppData")).toBe(
      "C:\\Users\\<user>\\AppData",
    );
    expect(scrubPrivateDetails("mail sam@example.com now")).toBe(
      "mail <email> now",
    );
    const report = buildBugReport({
      kind: "crash",
      identity,
      createdAt: "t",
      note: "write me at sam@example.com",
      error: {
        name: "Error",
        message: "bad /home/sam/x",
        stack: "at /home/sam/y",
      },
      log: ["opened /Users/sam/save.json"],
    });
    const text = serializeBugReport(report);
    expect(text).not.toContain("sam");
    expect(report.kind).toBe("crash");
  });

  it("cuts a very long line", () => {
    const report = buildBugReport({
      kind: "player",
      identity,
      createdAt: "t",
      log: ["x".repeat(BUG_REPORT_MAX_LINE_CHARS * 3)],
    });
    expect(report.log[0]).toHaveLength(BUG_REPORT_MAX_LINE_CHARS);
  });
});
