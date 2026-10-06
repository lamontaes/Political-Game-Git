import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { ArtifactLock } from "../../src/source/core/index";
import { sourceDomain } from "../../src/source/domains/state-office-qualifications/index";
import { makeIsoDate } from "../../src/simulation/dates";
import { officeQualifications } from "../../src/simulation/office-qualification-rules";

const root = resolve(import.meta.dirname, "../..");
const lock = JSON.parse(
  readFileSync(
    resolve(root, "data/source/state-office-qualifications/artifact-lock.json"),
    "utf8",
  ),
) as ArtifactLock;
const artifact = lock.artifacts.find(
  (entry) => entry.artifactId === "nv-constitution-governor",
)!;
const observedOn = artifact.retrieval.retrievedAt.slice(0, 10);

describe("bounded Nevada governor primary admission", () => {
  it("checks age, residence and the partial-term exception against locked law", () => {
    const compiled = sourceDomain.compileProduction(lock);
    const rows = compiled.records.filter((row) =>
      row.recordId.startsWith("NV:GOVERNOR:"),
    );
    expect(rows).toHaveLength(3);
    expect(artifact.retrieval.httpStatus).toBe(200);
    expect(artifact.rights.status).toBe("public-domain-government-edict");
    for (const row of rows) {
      expect(row.citedAuthority.provisionValidity).toMatchObject({
        state: "CURRENT_OBSERVATION",
        observedOn,
      });
      expect(row.citedAuthority.provisionValidity).not.toHaveProperty(
        "validFrom",
      );
    }
    const term = rows.find((row) => row.recordId.endsWith(":TERM_LIMIT"))!;
    expect(term.evidence.locator).toMatchObject({
      pageOrSection: expect.stringContaining(
        "more than two years of a term to which some other person was elected",
      ),
    });
  });

  it("exports actual requirements without applying a later observation backward", () => {
    const current = officeQualifications(
      "US-NV",
      "GOVERNOR",
      makeIsoDate(observedOn),
    );
    expect(current.map((row) => [row.field, row.value])).toEqual([
      ["MINIMUM_AGE", 25],
      ["STATE_RESIDENCE", 2],
      ["TERM_LIMIT", "2_TERMS_LIFETIME"],
    ]);
    expect(
      current.every((row) => row.temporalApplicability.state === "SUPPORTED"),
    ).toBe(true);
    const before = officeQualifications(
      "US-NV",
      "GOVERNOR",
      makeIsoDate("2026-01-05"),
    );
    expect(before).toHaveLength(3);
    expect(
      before.every((row) => row.temporalApplicability.state === "UNKNOWN"),
    ).toBe(true);
  });
});
