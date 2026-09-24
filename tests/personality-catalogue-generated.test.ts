import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  catalogueSourceText,
  catalogueTargetPath,
  renderCatalogueData,
} from "../scripts/traits/personality-catalogue";

describe("the generated personality catalog", () => {
  it("is exactly what the generator writes from the received file", () => {
    const rendered = renderCatalogueData(catalogueSourceText());
    // Proves the comparison has something to compare.
    expect(rendered).toContain("CATALOGUE_SCALES");
    expect(readFileSync(catalogueTargetPath(), "utf8")).toBe(rendered);
  });
});
