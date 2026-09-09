import { describe, expect, it } from "vitest";
import { computedLiterals, COMPUTED_SURFACES } from "./sources/computed";

const municipal = COMPUTED_SURFACES.filter((surface) =>
  surface.bank.startsWith("municipal-"),
);

describe("municipal authored prose classification", () => {
  it("inventories the rendered source boundaries, explicit controls and capacity unknowns", () => {
    const texts = computedLiterals(municipal).map((literal) => literal.text);
    for (const expected of [
      "Inspect a government",
      "Library inspection. This does not change your residence or grant a role.",
      "Dated meeting reference — not operative law",
      "Research report — not operative law",
      "Add public session to this world",
      "Attend public meeting",
      "Prepare meeting notes",
      "Agenda: no published agenda has been attached to this session. Recorded measures appear below.",
      "These observations do not establish current cash, staffing, or legal powers.",
      "No finance observation is available for this exact government ID in the accepted corpus. Missing data is not zero.",
      "No employment observation is available for this exact government ID in the accepted corpus.",
    ])
      expect(texts).toContain(expected);
    expect(texts).toContainEqual(
      expect.stringContaining("Add an explicitly game-authored public session"),
    );
    expect(texts).toContain("A current role in this government is required.");
    expect(texts).toContain(
      "An existing calendar commitment prevents attendance.",
    );
  });

  it("inventories intended legal projection while preserving its unproved reachability", () => {
    const projection = municipal.filter((surface) =>
      ["municipal-law-projection", "municipal-institution-record"].includes(
        surface.bank,
      ),
    );
    const texts = computedLiterals(projection).map((literal) => literal.text);
    expect(texts).toContain("Introduction authority is UNKNOWN.");
    expect(texts).toContain("The required floor sequence is UNKNOWN.");
    expect(texts).toContain("{government.key} seat");
    expect(projection).toHaveLength(2);
    expect(
      projection.every((surface) => surface.reachability === "UNKNOWN"),
    ).toBe(true);
  });

  it("does not upgrade unmapped legal-action branches or source data into player prose", () => {
    expect(
      municipal.find(
        (surface) => surface.bank === "municipal-authority-refusals",
      )?.reachability,
    ).toBe("UNKNOWN");
    expect(
      municipal.every((surface) => !surface.sourcePath.includes("generated")),
    ).toBe(true);
    expect(municipal.every((surface) => surface.grounding.length > 0)).toBe(
      true,
    );
  });
});
