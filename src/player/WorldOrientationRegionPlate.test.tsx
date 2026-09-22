import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RegionalOpeningResult } from "../presentation/regional-opening-plate";
import type { OrientationView } from "../presentation/world-orientation";
import { WorldOrientationPanel } from "./WorldOrientationPanel";

/**
 * The intro surface itself, with a plate and without one.
 *
 * The case that matters is the second: a player whose place no region covers
 * must reach the locality step and see it render with no picture, not a broken
 * image and not somebody else's landscape.
 */

const VIEW: OrientationView = {
  dateLabel: "January 12, 2026",
  steps: [
    {
      key: "locality",
      title: "Tucson",
      summary: "Regina Romero is Mayor.",
      people: [],
      chambers: [],
    },
  ],
};

const PLATE: RegionalOpeningResult = {
  kind: "plate",
  plate: {
    regionKey: "sonoran-desert",
    displayName: "Sonoran Desert: saguaros and distant ridges",
    url: "/assets/env_regional_sonoran_desert_v1.png",
    width: 2208,
    height: 1584,
    matchedBy: "state",
    sceneKind: "open-landscape",
    alternatives: [],
  },
};

function render(regionalPlate?: RegionalOpeningResult): string {
  return renderToStaticMarkup(
    <WorldOrientationPanel
      view={VIEW}
      homeStateUsps="AZ"
      regionalPlate={regionalPlate}
      mode="first"
      onClose={() => {}}
      onOpenPerson={() => {}}
    />,
  );
}

describe("the regional plate on the locality step", () => {
  it("paints the resolved plate, at its real dimensions", () => {
    const markup = render(PLATE);
    expect(markup).toContain('data-testid="orientation-region-plate"');
    expect(markup).toContain("/assets/env_regional_sonoran_desert_v1.png");
    expect(markup).toContain('width="2208"');
    expect(markup).toContain('data-region="sonoran-desert"');
    expect(markup).toContain('data-matched-by="state"');
  });

  it("describes the picture as an illustration of the area, not this address", () => {
    const markup = render(PLATE);
    expect(markup).toContain("Illustration, not this address");
    expect(markup).toContain("alt=");
    expect(markup).toContain("sonoran desert");
  });

  it("captions a street as a street, not as countryside", () => {
    const markup = render({
      kind: "plate",
      plate: {
        ...PLATE.plate,
        regionKey: "buchanan-small-town",
        displayName: "Great Lakes / Midwest: low-rise main street",
        sceneKind: "street",
      },
    });
    expect(markup).toContain("A street of the kind common near here.");
    expect(markup).not.toContain("Typical countryside");
    expect(markup).toContain("Illustration, not this address");
  });

  it("renders the step with no image when no region covers the place", () => {
    for (const miss of [
      undefined,
      {
        kind: "none",
        reason: "no-region-covers-this-place",
        regionKeys: [],
      } as RegionalOpeningResult,
      {
        kind: "none",
        reason: "conflicting-coverage",
        regionKeys: ["a-region", "another-region"],
      } as RegionalOpeningResult,
      {
        kind: "none",
        reason: "no-picture-fits-this-context",
        regionKeys: ["green-mountain-forest"],
      } as RegionalOpeningResult,
      {
        kind: "none",
        reason: "plate-file-missing",
        regionKeys: ["sonoran-desert"],
      } as RegionalOpeningResult,
    ]) {
      const markup = render(miss);
      expect(markup).not.toContain("orientation-region-plate");
      expect(markup).not.toContain("<img");
      // The step itself still works: the place's own facts are unaffected.
      expect(markup).toContain("Tucson");
      expect(markup).toContain("Regina Romero is Mayor.");
    }
  });
});
