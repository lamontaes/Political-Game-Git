import { describe, expect, it } from "vitest";
import {
  assertMeasureTitleTemplate,
  CATALOG_MEASURE_TITLE,
  COUNCIL_ACT_MEASURE_TITLE,
  FEDERAL_MEASURE_TITLE,
  ORDINANCE_MEASURE_TITLE,
  renderMeasureTitle,
} from "./measure-title";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import { DC_GOVERNMENT_KEY } from "./nationwide-world/district-of-columbia-council-opening";

describe("one measure title renderer", () => {
  it.each([
    [
      CATALOG_MEASURE_TITLE,
      "Consumer data privacy law",
      false,
      "Consumer data privacy law",
    ],
    [
      CATALOG_MEASURE_TITLE,
      "Consumer data privacy law",
      true,
      "Repeal: Consumer data privacy law",
    ],
    [
      FEDERAL_MEASURE_TITLE,
      "aid for the states",
      false,
      "Aid for the States Act of 2026",
    ],
    [
      FEDERAL_MEASURE_TITLE,
      "aid for the states",
      true,
      "Aid for the States Repeal Act of 2026",
    ],
    [
      FEDERAL_MEASURE_TITLE,
      "aid FOR  the states",
      false,
      "Aid FOR  the States Act of 2026",
    ],
    [
      ORDINANCE_MEASURE_TITLE,
      "Consumer data privacy law",
      false,
      "Consumer Data Privacy Ordinance",
    ],
    [
      ORDINANCE_MEASURE_TITLE,
      "Consumer data privacy law",
      true,
      "Repeal: Consumer Data Privacy Ordinance",
    ],
    [
      ORDINANCE_MEASURE_TITLE,
      "aid  FOR the states ACT",
      false,
      "Aid for the States Ordinance",
    ],
    [
      ORDINANCE_MEASURE_TITLE,
      "Library materials ordinance",
      false,
      "Library Materials Ordinance",
    ],
    [
      COUNCIL_ACT_MEASURE_TITLE,
      "Consumer data privacy law",
      false,
      "Consumer Data Privacy Act of 2026",
    ],
    [
      COUNCIL_ACT_MEASURE_TITLE,
      "Consumer data privacy law",
      true,
      "Repeal: Consumer Data Privacy Act of 2026",
    ],
    [
      COUNCIL_ACT_MEASURE_TITLE,
      "Library materials ordinance",
      false,
      "Library Materials Ordinance Act of 2026",
    ],
  ] as const)(
    "preserves the existing title %s / %s / repeal=%s",
    (template, name, repeal, expected) => {
      expect(renderMeasureTitle(template, name, "2026", repeal)).toBe(expected);
    },
  );

  it("reads a body's declared format rather than selecting a place in the renderer", () => {
    expect(
      renderMeasureTitle(
        { enact: "{year}: {name}", repeal: "Undo {name} ({year})" },
        "Recorded question",
        "2027",
        true,
      ),
    ).toBe("Undo Recorded question (2027)");
  });

  it("declares the council act format from the recorded instrument", () => {
    const result = municipalRulePackFor(
      municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
    );
    if (!result.ok) throw new Error("Expected actual council pack");
    expect(result.pack.titleTemplate).toEqual(COUNCIL_ACT_MEASURE_TITLE);
    expect(
      renderMeasureTitle(
        result.pack.titleTemplate!,
        "Consumer data privacy law",
        "2026",
        false,
      ),
    ).toBe("Consumer Data Privacy Act of 2026");
  });

  it.each(["Bill", "{name} {place}", "{name} {year"])(
    "refuses an unsupported format %s",
    (enact) => {
      expect(() =>
        assertMeasureTitleTemplate({ enact, repeal: "Repeal: {name}" }),
      ).toThrow("name/year tokens");
    },
  );
});
