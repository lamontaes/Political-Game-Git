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
 * The inherited intro filter removes the locality card; the remaining cards
 * retain their recorded text, picture rules and navigation.
 * Backdrop selection for the other cards remains independently covered.
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

function render(
  regionalPlate?: RegionalOpeningResult,
  view: OrientationView = VIEW,
): string {
  return renderToStaticMarkup(
    <WorldOrientationPanel
      view={view}
      homeStateUsps="AZ"
      regionalPlate={regionalPlate}
      mode="first"
      onClose={() => {}}
      onOpenPerson={() => {}}
    />,
  );
}

describe("the received locality filter", () => {
  it("safely renders no rejected locality-only card", () => {
    expect(render(PLATE)).toBe("");
    expect(render(undefined)).toBe("");
  });

  it("keeps the remaining recorded card and navigation", () => {
    const remaining: OrientationView = {
      ...VIEW,
      steps: [
        ...VIEW.steps,
        {
          key: "state",
          title: "Arizona",
          summary: "Recorded state summary.",
          people: [],
          chambers: [],
        },
      ],
    };
    const markup = render(PLATE, remaining);
    expect(markup).toContain('class="pg-orientation"');
    expect(markup).toContain('class="pg-orientation-stage"');
    expect(markup).toContain('data-step="state"');
    expect(markup).toContain('data-backdrop="region"');
    expect(markup).toContain('class="pg-orientation-scrim"');
    expect(markup).toContain('class="pg-orientation-copy"');
    expect(markup).toContain("Recorded state summary.");
    expect(markup).not.toContain("Regina Romero is Mayor.");
    expect(markup).not.toContain('data-step="locality"');
    expect(markup).not.toContain("Pause motion");
    expect(markup).not.toContain("Resume motion");
    expect(markup).not.toContain("aria-pressed");
    expect(markup).toContain('data-testid="orientation-back"');
    expect(markup).toContain('data-testid="orientation-next"');
    // This filter-only receiving patch preserves the current main label;
    // required intro completion is independently received through #2135.
    expect(markup).toContain(">Done</button>");
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
