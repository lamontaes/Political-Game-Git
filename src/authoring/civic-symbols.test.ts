import { describe, expect, it } from "vitest";

import {
  CIVIC_SYMBOLS,
  CIVIC_SYMBOL_SLOT_TYPES,
  SLOT_FINISH,
  acquiredCivicSymbols,
  civicSymbol,
  civicSymbolsFor,
  slotAcceptsKind,
  summarizeCivicSymbols,
  symbolUsePermitted,
  validateCivicSymbols,
  type CivicSymbol,
} from "./civic-symbols";

function withOverrides(overrides: Partial<CivicSymbol>): CivicSymbol {
  return {
    symbol_id: "SEAL_TEST",
    kind: "great-seal",
    level: "state",
    geography_id: "geo:state:zz",
    name: "Great Seal of Test",
    jurisdiction: "Test",
    asset_status: "not-acquired",
    ...overrides,
  };
}

describe("the civic symbol registry", () => {
  it("carries every jurisdiction the union has, and no artwork at all", () => {
    const summary = summarizeCivicSymbols();
    expect(summary.total).toBe(188);
    // Fifty states, the District, five territories, the union and the
    // presidency, and seven pilot counties keyed by their own FIPS code —
    // including Fayette County, which is the county the one plate in this
    // repository is painted with.
    expect(summary.jurisdictions).toBe(65);
    expect(civicSymbolsFor("geo:county:21067")).toHaveLength(1);
    expect(summary.byLevel.state).toBe(160);
    expect(summary.byLevel.territory).toBe(15);
    expect(summary.byLevel.district).toBe(3);
    expect(summary.byLevel.county).toBe(7);
    expect(summary.byLevel.national).toBe(3);

    // The honest state of the library today: identities and citations, no
    // bytes. Nobody has downloaded 188 vector files this project cannot show.
    expect(summary.acquired).toBe(0);
    expect(summary.notAcquired).toBe(188);
    expect(acquiredCivicSymbols()).toEqual([]);
  });

  it("validates, and refuses a record that claims artwork it does not have", () => {
    const result = validateCivicSymbols(CIVIC_SYMBOLS.symbols);
    expect(result.findings).toEqual([]);
    expect(result.valid).toBe(true);

    const codes = (symbol: CivicSymbol) =>
      validateCivicSymbols([symbol]).findings.map((finding) => finding.code);

    expect(
      codes(withOverrides({ asset_status: "acquired-official" })),
    ).toContain("acquired-without-path");
    expect(
      codes(withOverrides({ asset_path: "art/shared/seals_emblems/x.svg" })),
    ).toContain("path-without-acquisition");
    expect(codes(withOverrides({ asset_status: "unavailable" }))).toContain(
      "unavailable-without-note",
    );
  });

  it("has no way to say a symbol was generated", () => {
    // The prohibition is structural: there is no asset status meaning
    // "generated", and a note claiming one is a validation error.
    const result = validateCivicSymbols([
      withOverrides({
        asset_status: "acquired-third-party",
        asset_path: "art/shared/seals_emblems/fake.png",
        acquisition_note: "Generated with an image model to fill the gap.",
      }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "generated-artwork-claimed",
    );
  });

  it("keeps the statutory citation with the identity", () => {
    const kentucky = civicSymbolsFor("geo:state:ky");
    expect(kentucky.length).toBeGreaterThanOrEqual(2);
    const seal = kentucky.find((symbol) => symbol.kind === "great-seal");
    expect(seal?.statutory_authority).toBeTruthy();

    const flag = civicSymbol("FLAG_US");
    expect(flag?.aspect_ratio).toBe("10:19");
    expect(flag?.statutory_authority).toContain("4 U.S.C.");
    expect(flag?.colors).toEqual(["#B22234", "#FFFFFF", "#002868"]);
  });

  it("records a ratio note wherever statute and manufacture disagree", () => {
    // Several states legislate a ratio nobody actually flies. Recording only
    // one of the two numbers would make the other look wrong.
    const noted = CIVIC_SYMBOLS.symbols.filter(
      (symbol) => symbol.aspect_ratio_notes !== undefined,
    );
    expect(noted.length).toBeGreaterThan(5);
    for (const symbol of noted) {
      expect(symbol.kind, symbol.symbol_id).toBe("flag");
    }
  });
});

describe("where a civic symbol may be mounted", () => {
  it("puts flags on standards and seals on plaques, and not the reverse", () => {
    expect(slotAcceptsKind("flag-pole-draped", "flag")).toBe(true);
    expect(slotAcceptsKind("flag-pole-draped", "great-seal")).toBe(false);
    expect(slotAcceptsKind("seal-rostrum-plaque", "great-seal")).toBe(true);
    expect(slotAcceptsKind("seal-rostrum-plaque", "flag")).toBe(false);
    expect(slotAcceptsKind("seal-letterhead", "coat-of-arms")).toBe(false);
  });

  it("gives every mounting a finish, so a flag is never painted flat", () => {
    expect(CIVIC_SYMBOL_SLOT_TYPES).toHaveLength(6);
    for (const slot of CIVIC_SYMBOL_SLOT_TYPES) {
      expect(SLOT_FINISH[slot], slot).toBeDefined();
    }
    // An indoor standard hangs in folds. Painting a flat rectangle onto one is
    // the tell that a renderer treated a flag as a texture.
    expect(SLOT_FINISH["flag-pole-draped"]).toBe("fabric-draped");
    expect(SLOT_FINISH["seal-rostrum-plaque"]).toBe("cast-relief");
  });
});

describe("what a civic symbol may be used for", () => {
  it("permits institutional surfaces and refuses campaign and commercial use", () => {
    expect(symbolUsePermitted("institutional-scene").permitted).toBe(true);
    // This is the misuse the statutes name, so it is the one the code refuses.
    expect(symbolUsePermitted("campaign-material").permitted).toBe(false);
    expect(symbolUsePermitted("campaign-material").reason).toContain(
      "campaign",
    );
    expect(symbolUsePermitted("commercial-merchandise").permitted).toBe(false);
  });

  it("refuses those uses without asking which symbol it is", () => {
    // The prohibition is about the use, not about which seal is being misused,
    // so no symbol argument reaches the decision at all.
    for (const context of [
      "campaign-material",
      "commercial-merchandise",
    ] as const) {
      expect(symbolUsePermitted(context).permitted).toBe(false);
      expect(symbolUsePermitted(context).reason.length).toBeGreaterThan(20);
    }
  });
});
