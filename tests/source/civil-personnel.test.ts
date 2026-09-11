import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ArtifactLock } from "../../src/source/core/index";
import { compilePersonnelSourceProjection } from "../../src/source/adapters/civil-personnel";
import {
  compilePersonnelProcedures,
  PERSONNEL_PROCEDURE_DECLARATIONS,
} from "../../src/source/adapters/civil-personnel-procedures";
import { openCivilServiceLaborArtifacts } from "../../src/source/domains/civil-service-labor/index";

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
  it("binds every procedure excerpt and term to the rights-scoped enacted text", () => {
    const input = lock();
    const opened = openCivilServiceLaborArtifacts(input).artifacts;
    const procedures = compilePersonnelProcedures(opened, input);
    expect(procedures).toHaveLength(19);
    for (const procedure of procedures) {
      const locked = input.artifacts.find(
        (a) => a.artifactId === procedure.citation.artifactId,
      )!;
      expect(procedure.citation.sha256).toBe(locked.bytes.sha256);
    }
    // The pinned Minnesota region starts at § 43A.07, so its definitions
    // (appointing authority, permanent status) are not citable at all.
    const text = opened["mn-civil-service-statutes"]!.bytes.toString("utf-8");
    expect(text).not.toContain('"Appointing authority" means');
    // A changed statute fails closed instead of keeping a stale procedure.
    const tampered = {
      ...opened,
      "mn-civil-service-statutes": {
        ...opened["mn-civil-service-statutes"]!,
        bytes: Buffer.from(
          text.replace("within 30 calendar days", "within 60 calendar days"),
          "utf-8",
        ),
      },
    };
    expect(() => compilePersonnelProcedures(tampered, input)).toThrow(
      /no longer contains its declared excerpt/,
    );
  });
  it("refuses a numeric term whose value its own evidence does not state", () => {
    const input = lock();
    const opened = openCivilServiceLaborArtifacts(input).artifacts;
    const altered = PERSONNEL_PROCEDURE_DECLARATIONS.map((declaration) =>
      declaration.key === "mn-discipline-notice"
        ? {
            ...declaration,
            terms: {
              ...declaration.terms,
              appealWithinCalendarDays: {
                value: 45,
                evidence:
                  "within 30 calendar days following the effective date of the disciplinary action",
              },
            },
          }
        : declaration,
    );
    expect(() => compilePersonnelProcedures(opened, input, altered)).toThrow(
      /not fixed by its excerpts/,
    );
  });
});
