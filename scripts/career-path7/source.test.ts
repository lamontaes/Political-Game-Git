import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { compileCareerOccupations } from "../../src/source/domains/career-occupations/compile";
import type { ArtifactLock } from "../../src/source/core/index";
const lock: ArtifactLock = JSON.parse(
  readFileSync("data/source/career-occupations/artifact-lock.json", "utf8"),
);
describe("CAREER-PATH7 locked source replay", () => {
  it("replays every identity and task and the bounded runtime projection", () => {
    const c = compileCareerOccupations(lock);
    expect(c.records).toEqual(
      JSON.parse(
        readFileSync("data/source/career-occupations/corpus.json", "utf8"),
      ),
    );
    expect(
      c.records.filter((r) =>
        ["41-2031.00", "43-9061.00", "49-9043.00"].includes(r.id),
      ),
    ).toEqual(
      JSON.parse(
        readFileSync(
          "src/presentation/generated/career-occupations.json",
          "utf8",
        ),
      ),
    );
    expect(new Set(c.records.map((r) => r.hierarchy[0]!.code)).size).toBe(23);
    expect(c.records.find((r) => r.id === "11-1011.03")?.soc).toBe("11-1011");
    expect(c.records.reduce((n, r) => n + r.tasks.length, 0)).toBe(18838);
  });
  it("rejects corrupt digest, absent source, unknown rights and missing crosswalk", () => {
    expect(() =>
      compileCareerOccupations({
        ...lock,
        artifacts: lock.artifacts.map((a) => ({
          ...a,
          localPath: "data/source/career-occupations/raw/absent-source.xlsx",
        })),
      }),
    ).toThrow();
    for (const id of lock.artifacts.map((a) => a.artifactId)) {
      expect(() =>
        compileCareerOccupations({
          ...lock,
          artifacts: lock.artifacts.map((a) =>
            a.artifactId === id
              ? { ...a, bytes: { ...a.bytes, sha256: "0".repeat(64) } }
              : a,
          ),
        }),
      ).toThrow();
      expect(() =>
        compileCareerOccupations({
          ...lock,
          artifacts: lock.artifacts.filter((a) => a.artifactId !== id),
        }),
      ).toThrow();
    }
    expect(() =>
      compileCareerOccupations({
        ...lock,
        artifacts: lock.artifacts.map((a) => ({
          ...a,
          rights: {
            status: "UNKNOWN",
            declaredLicense: null,
            attributionRequired: "UNKNOWN",
          },
        })),
      }),
    ).toThrow();
  });
});
