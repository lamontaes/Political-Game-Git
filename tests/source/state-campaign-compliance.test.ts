import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ArtifactLock } from "../../src/source/core/index";
import { isClean } from "../../src/source/core/index";
import {
  CAMPAIGN_COMPLIANCE_SOURCES,
  compileCampaignCompliance,
  sourceDomain,
} from "../../src/source/domains/state-campaign-compliance/index";

const REPO = resolve(import.meta.dirname, "../..");

function lock(): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source/state-campaign-compliance/artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
}

describe("state campaign-compliance source", () => {
  it("compiles only the two locked state authorities", () => {
    expect(
      CAMPAIGN_COMPLIANCE_SOURCES.map((source) => source.artifactId),
    ).toEqual(["mn-statutes-10a-105", "ne-statutes-49-1446"]);
    const compiled = compileCampaignCompliance(lock());
    expect(compiled.corpus.inputClass).toBe("production");
    expect(compiled.records).toHaveLength(3);
    expect(
      new Set(compiled.records.map((record) => record.recordId)).size,
    ).toBe(3);
    expect(
      compiled.records.map((record) => record.threshold.state).sort(),
    ).toEqual(["KNOWN", "NOT_APPLICABLE", "NOT_APPLICABLE"]);
    expect(
      compiled.records.every(
        (record) =>
          record.evidence.artifactId === "mn-statutes-10a-105" ||
          record.evidence.artifactId === "ne-statutes-49-1446",
      ),
    ).toBe(true);
    expect(
      compiled.records.find(
        (record) =>
          record.obligation === "organized-committee-with-treasurer-required",
      )?.supportingEnactedExcerpts,
    ).toEqual([
      "Each committee shall have a treasurer who is a qualified elector of this state.",
    ]);
    expect(isClean(sourceDomain.validateCorpus(compiled))).toBe(true);
  });

  it("refuses a lock from another domain", () => {
    expect(() =>
      sourceDomain.compileProduction({ domain: "other", artifacts: [] }),
    ).toThrow(/handed the lock|other/i);
  });
});
