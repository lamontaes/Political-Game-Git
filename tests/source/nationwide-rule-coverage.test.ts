import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  NATIONWIDE_COVERAGE_JSON_PATH,
  NATIONWIDE_COVERAGE_MARKDOWN_PATH,
  renderNationwideRuleCoverageInto,
} from "../../scripts/source/nationwide-rule-coverage";
import { REPO_ROOT } from "../../scripts/source/registry";

describe("nationwide rule coverage", () => {
  it("regenerates the committed report byte-identically and counts every state and catalog unit", () => {
    const root = mkdtempSync(resolve(tmpdir(), "nationwide-rule-coverage-"));
    const { report, json, markdown } = renderNationwideRuleCoverageInto(root);

    expect(json).toBe(
      readFileSync(resolve(REPO_ROOT, NATIONWIDE_COVERAGE_JSON_PATH), "utf-8"),
    );
    expect(markdown).toBe(
      readFileSync(
        resolve(REPO_ROOT, NATIONWIDE_COVERAGE_MARKDOWN_PATH),
        "utf-8",
      ),
    );

    expect(report.totals.states).toBe(50);
    expect(report.states).toHaveLength(51);
    const counted = Object.values(report.totals.byUnitType).reduce(
      (sum, row) => sum + row.units,
      0,
    );
    expect(counted).toBe(report.totals.catalogUnits);
    expect(report.totals.catalogUnits).toBe(38704);
    expect(
      report.states.reduce((sum, row) => sum + row.localGovernments.units, 0),
    ).toBe(38704);

    // The two diagnostics stay true inside the nationwide pass.
    const nevada = report.states.find((row) => row.state === "NV")!;
    expect(
      nevada.offices.find(
        (office) => office.officeKey === "us-nv-legislature-v1:assembly",
      )?.standForOffice,
    ).toBe("admitted");
    expect(
      report.admittedLocalRoutes.find(
        (route) => route.unitId === "gus2025:194177",
      )?.actions,
    ).toEqual(
      expect.arrayContaining(["introduce-ordinance", "pass-ordinance"]),
    );

    // New Jersey's constitution is admitted for both chambers without a pack.
    const nj = report.states.find((row) => row.state === "NJ")!;
    expect(nj.candidacyPack).toBeNull();
    expect(
      nj.legislatorQualifications.map((probe) => [
        probe.chamberFamily,
        probe.standForOffice,
      ]),
    ).toEqual([
      ["lower", "admitted"],
      ["upper", "admitted"],
    ]);
    const texas = report.states.find((row) => row.state === "TX")!;
    expect(
      texas.legislatorQualifications.every(
        (probe) => probe.standForOffice === "refused",
      ),
    ).toBe(true);

    // Producer columns are never claimed by a rule report.
    expect(
      report.states.every((row) =>
        row.officeContestProducer.startsWith("not measured by RULES"),
      ),
    ).toBe(true);
  }, 120000);
});
