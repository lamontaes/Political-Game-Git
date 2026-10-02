import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dispositionErrors,
  markersInSource,
  scanAssumptions,
  unmappedAssumptions,
  type AssumptionDisposition,
} from "../scripts/research/assumption-markers";

describe("A166 assumption dispositions", () => {
  const root = process.cwd();
  const mapping = JSON.parse(
    readFileSync(`${root}/data/research/assumption-markers.json`, "utf8"),
  ) as { markers: AssumptionDisposition[] };
  const audit = JSON.parse(
    readFileSync(`${root}/docs/codex/audit-verified-2026-10-01.json`, "utf8"),
  ) as { id: string }[];

  it("leaves no current source marker unmapped", () => {
    expect(unmappedAssumptions(scanAssumptions(root), mapping.markers)).toEqual(
      [],
    );
    expect(
      dispositionErrors(mapping.markers, new Set(audit.map((item) => item.id))),
    ).toEqual([]);
  });

  const marker = markersInSource(
    "src/example.ts",
    "// UNRESEARCHED: missing measurement",
  )[0]!;
  const disposition: AssumptionDisposition = {
    ...marker,
    disposition: "rebuild",
    rebuildStep: "A166",
    reason:
      "Needs a measured replacement; this mapping does not approve its value.",
  };

  it("fails an introduced or edited marker that is not mapped", () => {
    const introduced = markersInSource(
      "src/example.ts",
      "// SET BY HAND: missing measurement",
    );
    expect(unmappedAssumptions(introduced, [disposition])).toEqual(introduced);
  });

  it("does not let one disposition cover two identical marker occurrences", () => {
    const repeated = markersInSource(
      "src/example.ts",
      `${marker.text}\n${marker.text}`,
    );
    expect(unmappedAssumptions(repeated, [disposition])).toEqual([repeated[1]]);
  });

  it("retains the mapping when an unrelated line moves its observed position", () => {
    const moved = markersInSource(
      "src/example.ts",
      `// unrelated\n${marker.text}`,
    );
    expect(moved[0]!.line).toBe(2);
    expect(unmappedAssumptions(moved, [disposition])).toEqual([]);
  });

  it("rejects a nonexistent rebuild step or an unexplained disposition", () => {
    expect(
      dispositionErrors(
        [{ ...disposition, rebuildStep: "missing", reason: "" }],
        new Set(["A166"]),
      ),
    ).toHaveLength(2);
  });

  it("uses complete text and scans all three exact marker words", () => {
    const source =
      "// PLACEHOLDER " + "x".repeat(200) + "\n// UNRESEARCHED\n// SET BY HAND";
    const found = markersInSource("src/example.ts", source);
    expect(found).toHaveLength(3);
    expect(found[0]!.text).toHaveLength(215);
    expect(
      markersInSource("src/example.ts", "const PLACEHOLDER_COUNT = 1;"),
    ).toEqual([]);
  });
});
