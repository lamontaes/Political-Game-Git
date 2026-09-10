import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ArtifactLock } from "../../src/source/core/index";
import { compilePersonnelSourceProjection } from "../../src/source/adapters/civil-personnel";

const lock = () =>
  JSON.parse(
    readFileSync("data/source/civil-service-labor/artifact-lock.json", "utf8"),
  ) as ArtifactLock;
describe("CIVIL-WORK7 source-to-consumer projection", () => {
  it("replays every declared profile and preserves all 29 known and 481 unknown fields", () => {
    const projection = compilePersonnelSourceProjection(lock());
    expect(projection).toEqual(
      JSON.parse(
        readFileSync("src/simulation/civil-personnel-sources.json", "utf8"),
      ),
    );
    expect(projection.profiles).toHaveLength(51);
    const fields = projection.profiles.flatMap((p) => Object.values(p.fields));
    expect(fields.filter((f) => f.state === "known")).toHaveLength(29);
    expect(fields.filter((f) => f.state === "unknown")).toHaveLength(481);
    for (const field of fields) {
      if (field.state === "known") {
        expect(field.citations.length).toBeGreaterThan(0);
        for (const citation of field.citations) {
          expect(citation.sha256).toMatch(/^[a-f0-9]{64}$/);
          expect(citation.url).toMatch(/^https:\/\//);
        }
      } else expect(field).not.toHaveProperty("attributes");
    }
  });
  it("preserves covered versus excluded classes and null probation terms", () => {
    const federal = compilePersonnelSourceProjection(lock()).profiles.find(
      (p) => p.jurisdictionKey === "US-FEDERAL",
    )!;
    expect(federal.fields.classificationDistinction).toMatchObject({
      attributes: [
        { key: "coveredService", value: "competitive service" },
        {
          key: "outsideCoveredService",
          value: ["excepted service", "Senior Executive Service"],
        },
      ],
    });
    expect(federal.fields.appointmentProtection).toMatchObject({
      attributes: expect.arrayContaining([
        { key: "probationaryRule", value: null },
      ]),
    });
  });
  it("refuses changed digest and missing artifacts rather than trusting generated JSON", () => {
    const input = lock();
    expect(() =>
      compilePersonnelSourceProjection({
        ...input,
        artifacts: input.artifacts.slice(1),
      }),
    ).toThrow();
    const first = input.artifacts[0]!;
    expect(() =>
      compilePersonnelSourceProjection({
        ...input,
        artifacts: [
          { ...first, bytes: { ...first.bytes, sha256: "0".repeat(64) } },
          ...input.artifacts.slice(1),
        ],
      }),
    ).toThrow();
  });
});
