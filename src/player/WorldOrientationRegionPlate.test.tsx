import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { RegionalOpeningResult } from "../presentation/regional-opening-plate";
import type { OrientationView } from "../presentation/world-orientation";
import {
  orientationBackdrop,
  WorldOrientationPanel,
} from "./WorldOrientationPanel";
import { populationCaption } from "./OpeningStatePopulation";

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

describe("the full-screen opening card", () => {
  it("fills the window with the place and offers no motion control", () => {
    const markup = render(PLATE);
    expect(markup).toContain('class="pg-orientation"');
    expect(markup).toContain('class="pg-orientation-stage"');
    expect(markup).toContain('data-backdrop="region"');
    expect(markup).toContain('class="pg-orientation-scrim"');
    expect(markup).toContain('class="pg-orientation-copy"');
    expect(markup).not.toContain("Pause motion");
    expect(markup).not.toContain("Resume motion");
    expect(markup).not.toContain("aria-pressed");
    // Navigation stays. This one-card fixture is its own last card, so Next
    // reads Done and there is nothing left to skip.
    expect(markup).toContain('data-testid="orientation-back"');
    expect(markup).toContain('data-testid="orientation-next"');
    expect(markup).toContain(">Done</button>");
  });

  it("stands on a plain ground, reading in the middle, when no approved picture resolves", () => {
    const markup = render(undefined);
    expect(markup).toContain('data-backdrop="neutral"');
    expect(markup).toContain('data-layout="centered"');
    expect(markup).not.toContain("<img");
  });
});

describe("which approved picture stands behind each card", () => {
  const plate = PLATE.kind === "plate" ? PLATE.plate : null;
  const raster = {
    assetId: "fixture-establishing",
    url: "/fixture.png",
    width: 1672,
    height: 941,
    hash: "fixture",
  };

  it("uses the White House plate for the executive card, and nothing borrowed without it", () => {
    expect(
      orientationBackdrop("executive", {
        whiteHouse: raster,
        regionalPlate: plate,
        regionScene: raster,
      }).kind,
    ).toBe("white-house");
    expect(
      orientationBackdrop("executive", {
        whiteHouse: null,
        regionalPlate: plate,
        regionScene: raster,
      }).kind,
    ).toBe("neutral");
  });

  it("prefers the approved regional plate for the state card, then the reviewed preview, then plain ground", () => {
    expect(
      orientationBackdrop("state", {
        whiteHouse: raster,
        regionalPlate: plate,
        regionScene: raster,
      }).kind,
    ).toBe("region");
    expect(
      orientationBackdrop("state", {
        whiteHouse: raster,
        regionalPlate: null,
        regionScene: raster,
      }).kind,
    ).toBe("region-preview");
    expect(
      orientationBackdrop("state", {
        whiteHouse: raster,
        regionalPlate: null,
        regionScene: null,
      }).kind,
    ).toBe("neutral");
  });

  it("falls back from the civic building to the regional plate on the town card", () => {
    // Outside the reviewed preview the civic plate does not resolve.
    expect(
      orientationBackdrop("locality", {
        whiteHouse: null,
        regionalPlate: plate,
        regionScene: null,
      }).kind,
    ).toBe("region");
  });

  it("never paints the White House or a region behind Congress or your life", () => {
    for (const key of ["congress", "your-life"])
      expect(
        orientationBackdrop(key, {
          whiteHouse: raster,
          regionalPlate: plate,
          regionScene: raster,
        }).kind,
      ).toBe("neutral");
  });
});

describe("the population caption", () => {
  it("reads as a caption for the figure, not a record label", () => {
    expect(populationCaption("Maryland", "2024")).toBe(
      "Residents of Maryland, all ages, 2024",
    );
    expect(populationCaption("District of Columbia", "2024")).toBe(
      "Residents of the District of Columbia, all ages, 2024",
    );
    expect(populationCaption("Maryland", "")).toBe(
      "Residents of Maryland, all ages",
    );
    expect(populationCaption("Maryland", "2024")).not.toContain("·");
  });
});
