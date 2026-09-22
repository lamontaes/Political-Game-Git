import fs from "fs";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import { writeResearchRequest } from "../scripts/research/request-store";
import { RESEARCH_REQUEST_DIRECTORY } from "../src/research/research-request";

const temporaryRoots: string[] = [];

function scratchRepository(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "research-queue-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, RESEARCH_REQUEST_DIRECTORY), {
    recursive: true,
  });
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

/**
 * A record is a committed file, so how it is written is a gate concern and not
 * a matter of taste. The writer once ended a record with a blank line, because
 * `toCanonicalJson` already terminates its output and the writer added a second
 * newline on top of it. Nothing read differently; the repository format job
 * failed, on a branch whose actual change was elsewhere, and the lane that
 * carried the record had to repair it by hand. Every lane files questions
 * through this one function, so one wrong byte here is every lane's problem.
 */
describe("A filed research question is written the way the repository stores files", () => {
  const record = {
    filedAt: "2026-09-22T05:00:00.000Z",
    impact: "shapes-design",
    lane: "modular legislation",
    notes: [],
    priority: "P2",
    question: "Does the writer terminate a record correctly?",
    questionId: "writer-termination-probe",
    requestVersion: "research-request/v1",
    requestedBy: "modular legislation thread",
    sourcesChecked: [],
    title: "Writer termination",
    usableAnswer: "Not applicable; this record exists to be written.",
    whyItMatters: "Not applicable; this record exists to be written.",
  };

  it("ends with exactly one newline, so the format job has nothing to remove", () => {
    const root = scratchRepository();
    const filePath = writeResearchRequest(
      root,
      record as Parameters<typeof writeResearchRequest>[1],
    );
    const written = fs.readFileSync(filePath, "utf8");

    expect(written.endsWith("}\n")).toBe(true);
    expect(written.endsWith("}\n\n")).toBe(false);
  });

  it("round-trips as the record it was handed", () => {
    const root = scratchRepository();
    const filePath = writeResearchRequest(
      root,
      record as Parameters<typeof writeResearchRequest>[1],
    );

    expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual(record);
  });
});
