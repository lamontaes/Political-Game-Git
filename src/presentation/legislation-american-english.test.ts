import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createStableId,
  deserializeWorld,
  makeIsoDate,
  serializeWorld,
} from "../simulation";
import { compileBillDraft } from "../simulation/legislation-drafting";
import {
  legalInstrumentRule,
  legalInstrumentRules,
  programConfigurations,
  programFamilies,
  programVariant,
  standingAuthorities,
} from "../simulation/legislation-program-families";
import {
  availableDraftOptions,
  readDocket,
  recompileSavedBill,
} from "./legislation-docket";

// Feature-level output regression; SKILL-OPS1 owns the shared dialect checker.
// Identifier fields and source-example records are intentionally not prose.
const drift =
  /\b(?:programmes?|colou?risation|colour|centre|labour|defence|authorise|prioritise|organise|cancelled|travelling|favour)\b/i;
function checkCopy(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if ("kind" in value && value.kind === "source-example") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      typeof child === "string" &&
      [
        "label",
        "heading",
        "text",
        "synopsis",
        "mechanism",
        "title",
        "description",
        "instrumentLabel",
        "instrumentDescription",
        "clausePhrase",
        "appliesToLabel",
        "fiscalExposureLabel",
        "programmeLabel",
        "unavailableReason",
        "placeLabel",
        "beneficiaryLabel",
        "rationale",
      ].includes(key)
    ) {
      expect(child, key).not.toMatch(drift);
    } else if (child && typeof child === "object") checkCopy(child);
  }
}

describe("AMERICAN-ENGLISH1 legislative output", () => {
  it("projects American labels while retaining persisted instrument tokens", () => {
    expect(legalInstrumentRule("programme-authorization").label).toBe(
      "Program authorization",
    );
    expect(legalInstrumentRule("programme-authorization").instrument).toBe(
      "programme-authorization",
    );
    checkCopy(legalInstrumentRules());
    checkCopy(programFamilies());
    checkCopy(availableDraftOptions("kentucky"));
  });

  it("compiles every current configuration with American authored copy", () => {
    for (const configuration of programConfigurations()) {
      const { variant } = programVariant(
        configuration.familyKey,
        configuration.variantKey,
      );
      const rule = legalInstrumentRule(variant.instrument);
      const authority = rule.requiresPredicateAuthority
        ? standingAuthorities().find(
            (a) => !rule.predicateMustAuthorizeSpending || a.authorizesSpending,
          )
        : undefined;
      const draft = compileBillDraft({
        ...configuration,
        scenarioKey: "kentucky",
        jurisdictionId: createStableId("jurisdiction", "us-ky"),
        rulePackId: "us-ky-general-assembly",
        designation: "HB 900",
        filedOn: makeIsoDate("2026-01-14"),
        ...(authority ? { predicateAuthority: authority } : {}),
      });
      checkCopy(draft);
    }
  });

  it("preserves supplied citation text verbatim instead of normalizing external titles", () => {
    const base = standingAuthorities().find((a) => a.authorizesSpending)!;
    // Deliberately non-US fixture citation, not a claim about a real statute.
    const citationLabel = 'Fixture citation: "Programme and Labour Centre"';
    const draft = compileBillDraft({
      familyKey: "appropriations",
      variantKey: "single-programme",
      scenarioKey: "kentucky",
      jurisdictionId: createStableId("jurisdiction", "us-ky"),
      rulePackId: "us-ky-general-assembly",
      designation: "HB 900",
      filedOn: makeIsoDate("2026-01-14"),
      predicateAuthority: { ...base, citationLabel },
    });
    expect(
      draft.clauses.some((clause) => clause.text.includes(citationLabel)),
    ).toBe(true);
  });

  it("loads the actual pre-correction save without rewriting text, identity or history", () => {
    // Captured from 80801a9 before the copy changes, through the normal fileDraft writer.
    const saved = readFileSync(
      new URL(
        "./fixtures/leg-american-english1-old-save.json",
        import.meta.url,
      ),
      "utf8",
    );
    const world = deserializeWorld(saved);
    const canonicalSaved = JSON.stringify(JSON.parse(saved));
    const before = serializeWorld(world);
    expect(before).toBe(canonicalSaved);
    expect(
      world.history.legislativeProvisions?.some((p) =>
        /school repair assistance programme/.test(p.text),
      ),
    ).toBe(true);
    if (world.control.kind !== "person")
      throw new Error("Expected controlled actor");
    const bill = readDocket(world, {
      scenarioKey: "kentucky",
      playerPersonId: world.control.personId,
    }).find((b) => b.familyKey === "education-facilities");
    expect(bill).toBeDefined();
    const result = recompileSavedBill(world, bill!, world.control.personId);
    expect(result).toHaveProperty("unavailable");
    expect(serializeWorld(world)).toBe(canonicalSaved);
    expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(
      canonicalSaved,
    );
  });
});
