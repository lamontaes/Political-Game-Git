import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ArtifactLock } from "../../src/source/core/index";
import {
  FEDERAL_SECTION_ARTIFACTS,
  FORBIDDEN_FIELDS,
  compileProfiles,
  openCivilServiceLaborArtifacts,
} from "../../src/source/domains/civil-service-labor/index";
import { applyVerifiedFacts } from "../../src/source/domains/civil-service-labor/facts";

const REPO = resolve(import.meta.dirname, "../..");

function lock(): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source/civil-service-labor/artifact-lock.json"),
      "utf-8",
    ),
  ) as ArtifactLock;
}

describe("civil-service-labor adversarial boundaries", () => {
  it("rejects a source whose declared statutory excerpt moved", () => {
    const opened = openCivilServiceLaborArtifacts(lock()).artifacts;
    const artifactId = FEDERAL_SECTION_ARTIFACTS.strikes;
    const altered = {
      ...opened,
      [artifactId]: {
        ...opened[artifactId],
        bytes: Buffer.from(
          "official-looking page without the enacted strike clause",
        ),
      },
    };
    const federal = compileProfiles().filter(
      (record) => record.jurisdictionKey === "US-FEDERAL",
    );
    expect(() => applyVerifiedFacts(federal, altered)).toThrow(
      /no longer contains its declared excerpt/,
    );
  });

  it("contains no grievance simulator, score, or ranking surface", () => {
    const files = ["types.ts", "facts.ts", "profiles.ts", "index.ts"];
    const implementation = files
      .map((file) =>
        readFileSync(
          resolve(REPO, "src/source/domains/civil-service-labor", file),
          "utf-8",
        ),
      )
      .join("\n");
    for (const field of FORBIDDEN_FIELDS) {
      expect(implementation).not.toContain(`readonly ${field}`);
    }
  });

  it("does not import simulation, React, presentation, campaigns, or legislative bargaining", () => {
    const files = [
      "types.ts",
      "facts.ts",
      "profiles.ts",
      "acquisition.ts",
      "validate.ts",
      "index.ts",
    ];
    const implementation = files
      .map((file) =>
        readFileSync(
          resolve(REPO, "src/source/domains/civil-service-labor", file),
          "utf-8",
        ),
      )
      .join("\n");
    for (const forbidden of [
      "src/simulation",
      "simulation/",
      "presentation/",
      "react",
      "campaign",
      "legislative-bargaining",
    ]) {
      expect(implementation.toLowerCase()).not.toContain(forbidden);
    }
  });
});
