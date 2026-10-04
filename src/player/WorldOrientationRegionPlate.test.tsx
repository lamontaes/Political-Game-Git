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
 * The owner removed the locality card from the introduction. Its old isolated
 * fixture must therefore render no card. Other backdrops remain covered.
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

describe("the removed locality step", () => {
  it("does not render the former locality card or its regional picture", () => {
    const markup = render(PLATE);
    expect(markup).not.toContain("<img");
    expect(markup).not.toContain("orientation-region-plate");
    expect(markup).not.toContain("/assets/env_regional_sonoran_desert_v1.png");
    expect(markup).toBe("");
  });

  it("does not restore the removed card when its picture is unavailable", () => {
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
      expect(markup).not.toContain("<img");
      expect(markup).not.toContain("orientation-place-backdrop");
      expect(markup).not.toContain("orientation-region-plate");
      expect(markup).toBe("");
    }
  });
});

describe("the full-screen opening card", () => {
  it("keeps the full-screen text and navigation without motion controls", () => {
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

  it("omits the city-hall picture when no regional picture resolves", () => {
    const markup = render(undefined);
    expect(markup).toContain('data-backdrop="place"');
    expect(markup).not.toContain("orientation-place-backdrop");
    expect(markup).not.toContain("orientation-region-plate");
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

  it("uses the White House plate for the executive card, and the Oval Office without it", () => {
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
      }),
    ).toMatchObject({ kind: "place", place: "oval-office" });
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
      }),
    ).toMatchObject({ kind: "place", place: "state-capitol-dome" });
    expect(
      orientationBackdrop("state", {
        whiteHouse: raster,
        regionalPlate: null,
        regionScene: null,
        homeStateUsps: "NE",
      }),
      // Nebraska has its own capitol picture, so it wins over the generic tower.
    ).toMatchObject({ kind: "place", place: "state-capitol-ne" });
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

  it("paints the Capitol behind Congress and your town's street behind your life, never the White House or a region", () => {
    expect(
      orientationBackdrop("congress", {
        whiteHouse: raster,
        regionalPlate: plate,
        regionScene: raster,
      }),
    ).toMatchObject({ kind: "place", place: "us-capitol-exterior" });
    expect(
      orientationBackdrop("your-life", {
        whiteHouse: raster,
        regionalPlate: plate,
        regionScene: raster,
      }),
    ).toMatchObject({ kind: "place", place: "main-street" });
  });

  it("paints city hall behind the town card when no regional plate exists", () => {
    expect(
      orientationBackdrop("locality", {
        whiteHouse: null,
        regionalPlate: null,
        regionScene: null,
      }),
    ).toMatchObject({ kind: "place", place: "city-hall-exterior" });
  });
});

describe("the population caption", () => {
  it("reads as a caption for the figure, not a record label", () => {
    expect(populationCaption("Maryland", "2024")).toBe(
      "Residents of Maryland, all ages",
    );
    expect(populationCaption("District of Columbia", "2024")).toBe(
      "Residents of the District of Columbia, all ages",
    );
    expect(populationCaption("Maryland", "")).toBe(
      "Residents of Maryland, all ages",
    );
    expect(populationCaption("Maryland", "2024")).not.toContain("·");
  });
});
