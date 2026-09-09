import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ArtifactLock } from "../../src/source/core/index";
import { isClean } from "../../src/source/core/index";
import {
  CAMPAIGN_COMPLIANCE_SOURCES,
  compileCampaignCompliance,
  loadReviewedKentuckyCampaignCompliance,
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
    expect(
      compiled.records.every(
        (record) =>
          record.provisionValidity.kind === "CURRENT_OBSERVATION" &&
          record.provisionValidity.observedOn === "2026-09-09" &&
          record.sourceRetrievedAt.startsWith("2026-09-09T"),
      ),
    ).toBe(true);
  });

  it("validates the Kentucky reviewed transport against exact locked parents", () => {
    const held = lock();
    const reviewed = loadReviewedKentuckyCampaignCompliance(held);
    expect(reviewed.records).toHaveLength(10);
    expect(new Set(reviewed.records.map((record) => record.field)).size).toBe(
      10,
    );
    expect(
      reviewed.records.find(
        (record) => record.field === "reportReceiptWithinBusinessDays",
      ),
    ).toMatchObject({
      status: "KNOWN",
      value: 7,
      sourceVersionEffectiveOn: "2026-07-15",
      claimEffectiveOn: "2026-07-15",
      claimEffectiveBasisArtifactId: "ky-krs-121-180-2026-pdf",
      claimEffectiveBasisExcerpt: "Effective: July 15, 2026",
      amendmentEvidenceArtifactId: "ky-2026-chapter-175-hb139",
      amendmentEvidenceExcerpt: "within seven (7) [two (2)] business days",
      supportCoverageFrom: "2026-07-15",
    });
    expect(
      reviewed.records.find(
        (record) => record.field === "statementOfIntentWithinDays",
      ),
    ).toMatchObject({
      status: "KNOWN",
      value: 5,
      sourceVersionEffectiveOn: "2026-07-15",
      claimEffectiveOn: null,
      supportCoverageFrom: "2026-07-15",
    });
    expect(
      reviewed.records.find(
        (record) => record.field === "electronicFilingSystem",
      ),
    ).toMatchObject({
      status: "KNOWN",
      value: "KEFMS",
      artifactId: "ky-kref-kefms-faq-2025",
      sourceVersionEffectiveOn: null,
      claimEffectiveOn: null,
      supportCoverageFrom: "2025-08-30",
    });
    expect(
      reviewed.records.find(
        (record) => record.field === "contributionLimitMinorUnits",
      )?.status,
    ).toBe("UNKNOWN");

    const krs = held.artifacts.find(
      (artifact) => artifact.artifactId === "ky-krs-121-180-2026-pdf",
    )!;
    const broken: ArtifactLock = {
      ...held,
      artifacts: held.artifacts.map((artifact) =>
        artifact.artifactId === krs.artifactId
          ? {
              ...artifact,
              bytes: { ...artifact.bytes, sha256: "0".repeat(64) },
            }
          : artifact,
      ),
    };
    expect(() => loadReviewedKentuckyCampaignCompliance(broken)).toThrow(
      /locked artifact hash/i,
    );

    const act = held.artifacts.find(
      (artifact) => artifact.artifactId === "ky-2026-chapter-175-hb139",
    )!;
    const brokenAct: ArtifactLock = {
      ...held,
      artifacts: held.artifacts.map((artifact) =>
        artifact.artifactId === act.artifactId
          ? {
              ...artifact,
              bytes: { ...artifact.bytes, sha256: "f".repeat(64) },
            }
          : artifact,
      ),
    };
    expect(() => loadReviewedKentuckyCampaignCompliance(brokenAct)).toThrow(
      /amendment evidence hash/i,
    );
  });

  it("refuses a lock from another domain", () => {
    expect(() =>
      sourceDomain.compileProduction({ domain: "other", artifacts: [] }),
    ).toThrow(/handed the lock|other/i);
  });
});
