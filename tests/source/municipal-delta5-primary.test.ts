import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  extractEnactedText,
  containsExcerpt,
  sha256Hex,
} from "../../src/source/core/index";
import { MUNICIPAL_SOURCES } from "../../src/source/domains/municipal-governance/acquisition";
import { MUNICIPAL_PRODUCTION_PACKS } from "../../src/source/domains/municipal-governance/production-packs";

function pack(key: string) {
  return MUNICIPAL_PRODUCTION_PACKS.find(
    (entry) => entry.sourceGovernmentKey === key,
  )!;
}

describe("MUNI-DELTA5 existing primary-source omissions", () => {
  it("compiles Carson's actual whole-Board passage rule without filling remaining authority gaps", () => {
    const carson = pack("us-nv-carson-city");
    expect(carson.legislativeProcedure.passageThreshold.status).toBe("KNOWN");
    const adoption = carson.enumeratedPowers.find(
      (entry) => entry.power === "ORDINANCE_ADOPTION",
    )!;
    expect(adoption.heldByRole).toBe("COMMISSION");
    expect(adoption.details?.value).toMatchObject({
      threshold: {
        numerator: 1,
        denominator: 2,
        denominatorBasis: "TOTAL_MEMBERSHIP",
      },
    });
    expect(carson.legislativeProcedure.introductionSponsorship.status).toBe(
      "UNKNOWN",
    );
    expect(carson.legislativeProcedure.mayoralActionWindow?.status).toBe(
      "UNKNOWN",
    );
  });

  it("keeps Richmond budget adoption, amendment conditions, deadline and item veto separately sourced", () => {
    const richmond = pack("us-va-richmond");
    expect(richmond.budgetProcedure.amends).toMatchObject({
      status: "KNOWN",
      value: "COUNCIL",
    });
    expect(richmond.budgetProcedure.adopts).toMatchObject({
      status: "KNOWN",
      value: "COUNCIL",
    });
    expect(richmond.budgetProcedure.adoptionDeadline.value).toMatchObject({
      monthDay: "05-31",
    });
    expect(richmond.budgetProcedure.balancedBudgetConstraint.value).toMatch(
      /unless.*additional revenue/,
    );
    expect(
      richmond.enumeratedPowers.find(
        (entry) => entry.power === "LINE_ITEM_VETO",
      )?.details?.value,
    ).toMatchObject({ target: "Particular items of city budget ordinances" });
    expect(
      richmond.researchObservations?.map((entry) => entry.value).join("\n"),
    ).toMatch(/fails to adopt.*budget as submitted by the mayor/s);
    expect(richmond.legislativeProcedure.readings.status).toBe("UNKNOWN");
  });

  it("pins each expanded region and proves every new primary quotation occurs within it", () => {
    for (const key of ["nv-carson-city-charter", "va-richmond-charter"]) {
      const source = MUNICIPAL_SOURCES.find(
        (entry) => entry.artifactId === key,
      )!;
      const bytes = readFileSync(source.localPath);
      const text = extractEnactedText(key, bytes, {
        boundaryKind: "normalized-text-regions",
        regions: source.enacted.regions,
        extracted: {
          length: source.enacted.length,
          sha256: source.enacted.sha256,
        },
      });
      expect(Buffer.byteLength(text)).toBe(source.enacted.length);
      expect(sha256Hex(Buffer.from(text))).toBe(source.enacted.sha256);
      const visit = (value: unknown): void => {
        if (!value || typeof value !== "object") return;
        if (
          "sourceKey" in value &&
          value.sourceKey === key &&
          "excerpt" in value &&
          typeof value.excerpt === "string"
        )
          expect(containsExcerpt(text, value.excerpt)).toBe(true);
        Object.values(value).forEach(visit);
      };
      visit(
        pack(key.startsWith("nv") ? "us-nv-carson-city" : "us-va-richmond"),
      );
    }
  });
});
