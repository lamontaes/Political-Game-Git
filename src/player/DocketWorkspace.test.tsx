import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { availableDraftOptions } from "../presentation/legislation-docket";
import {
  DraftingOptionList,
  DraftingSectionList,
  playerDraftOptions,
} from "./DocketWorkspace";

describe("ordinary docket drafting choices", () => {
  it("offers the enacted-effect appropriation sections without implementation-only clauses", () => {
    const catalog = availableDraftOptions("alaska");
    const visible = playerDraftOptions("alaska");
    const hidden = catalog.find((option) =>
      option.operativeSections.every((section) => !section.supported),
    );
    const appropriation = visible.find(
      (option) =>
        option.familyKey === "appropriations" &&
        option.variantKey === "single-programme",
    );

    expect(visible.length).toBeLessThan(catalog.length);
    expect(hidden).toBeDefined();
    expect(visible.every((option) => option.operativeSections.length > 0)).toBe(
      true,
    );
    expect(
      visible.every((option) =>
        option.operativeSections.every((section) => section.supported),
      ),
    ).toBe(true);
    const html = renderToStaticMarkup(
      <DraftingOptionList
        options={visible}
        chosen={null}
        onChoose={() => {}}
      />,
    );
    expect(html).toContain(
      'data-testid="drafting-option-appropriations-single-programme"',
    );
    expect(html).not.toContain(
      `data-testid="drafting-option-${hidden!.familyKey}-${hidden!.variantKey}"`,
    );
    expect(
      appropriation?.operativeSections.map((section) => section.provisionKey),
    ).toEqual(["authority-named", "amount-provided", "availability"]);
    const sections = renderToStaticMarkup(
      <DraftingSectionList
        sections={appropriation!.operativeSections}
        selectedProvisionKeys={appropriation!.operativeSections.map(
          (section) => section.provisionKey,
        )}
        onSelectionChange={() => {}}
      />,
    );
    expect(sections).toContain(
      'data-testid="drafting-section-amount-provided"',
    );
    expect(sections).not.toContain(
      'data-testid="drafting-section-spending-report"',
    );
    expect(
      catalog
        .find(
          (option) =>
            option.familyKey === "appropriations" &&
            option.variantKey === "single-programme",
        )
        ?.operativeSections.some(
          (section) => section.provisionKey === "spending-report",
        ),
    ).toBe(true);
  });
});
