import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { compileEducation } from "../../src/source/domains/education";
import {
  openProductionArtifacts,
  readZipMember,
  readXlsxSheet,
  parseDelimited,
} from "../../src/source/core";
import type { ArtifactLock } from "../../src/source/core";
const lock = JSON.parse(
  readFileSync("data/source/education/artifact-lock.json", "utf8"),
) as ArtifactLock;
describe("acquired NCES source controls", () => {
  it("rejects changed or missing locked inputs before parsing", () => {
    expect(() =>
      openProductionArtifacts(
        "education",
        {
          ...lock,
          artifacts: lock.artifacts.map((a) =>
            a.artifactId === "HD2024"
              ? { ...a, bytes: { ...a.bytes, sha256: "0".repeat(64) } }
              : a,
          ),
        },
        { hd: "HD2024" },
      ),
    ).toThrow(/hash/);
    expect(() =>
      openProductionArtifacts(
        "education",
        {
          ...lock,
          artifacts: lock.artifacts.filter(
            (a) => a.artifactId !== "IC2024_Dict",
          ),
        },
        { dictionary: "IC2024_Dict" },
      ),
    ).toThrow();
  });
  it("refuses absent physical source bytes", () => {
    const missing = {
      ...lock,
      artifacts: lock.artifacts.map((a) =>
        a.artifactId === "HD2024"
          ? { ...a, localPath: "data/source/education/raw/missing-HD2024.zip" }
          : a,
      ),
    };
    expect(() =>
      openProductionArtifacts("education", missing, { hd: "HD2024" }),
    ).toThrow(/not present/);
  });
  it("retains official HD counts, named IDs and county codes independently from compiler", () => {
    const opened = openProductionArtifacts("education", lock, {
      hd: "HD2024",
      dict: "HD2024_Dict",
    }).artifacts;
    const p = parseDelimited(readZipMember(opened.hd.bytes, "hd2024.csv"), {
      delimiter: ",",
      hasHeaderRow: true,
    });
    expect(p.rows).toHaveLength(6072);
    const unit = p.header!.indexOf("UNITID"),
      county = p.header!.indexOf("COUNTYCD"),
      name = p.header!.indexOf("INSTNM");
    const uk = p.rows.find((r) => r.fields[unit] === "157085")!;
    expect(uk.fields[name]).toBe("University of Kentucky");
    expect(uk.fields[county]).toBe("21067");
    const harvard = p.rows.find((r) => r.fields[unit] === "166027")!;
    expect(harvard.fields[county]).toBe("25017");
    const frequencies = readXlsxSheet(
      readZipMember(opened.dict.bytes, "hd2024.xlsx"),
      "Frequencies",
    ).rows;
    expect(frequencies.find((r) => r[0] === "ACT" && r[3] === "A")?.[5]).toBe(
      "5,927",
    );
  });
});
// Full replay uses the existing source:replay CLI; no broad timeout increase here.
void compileEducation;
