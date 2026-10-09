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
    expect(markup).toContain('data-backdrop="place"');
    expect(markup).toContain('class="pg-orientation-scrim"');
    expect(markup).toContain('class="pg-orientation-copy"');
    // The card stays, under its own title; a summary sentence is not drawn
    // (menu reset).
    expect(markup).toContain(">Arizona</h2>");
    expect(markup).not.toContain("Recorded state summary.");
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

  it("stands every intro card inside the room where its people work (OW-11)", () => {
    const sources = {
      whiteHouse: raster,
      regionalPlate: plate,
      regionScene: raster,
      localChamber: "county-commission",
      homePlaces: ["rowhouse"],
    };
    // The year is told from outside the Capitol: Congress stands on a floor
    // at its own stop only (owner playtest, October 8, 2026).
    expect(orientationBackdrop("year", sources)).toMatchObject({
      kind: "place",
      place: "us-capitol-exterior",
    });
    expect(orientationBackdrop("congress", sources)).toMatchObject({
      kind: "place",
      place: "us-house-floor",
    });
    expect(orientationBackdrop("state", sources)).toMatchObject({
      kind: "place",
      place: "governor-office",
    });
    expect(orientationBackdrop("locality", sources)).toMatchObject({
      kind: "place",
      place: "county-commission",
    });
    expect(
      orientationBackdrop("locality", {
        ...sources,
        localChamber: "council-chamber",
      }),
    ).toMatchObject({ kind: "place", place: "council-chamber" });
    expect(orientationBackdrop("your-life", sources)).toMatchObject({
      kind: "place",
      place: "rowhouse",
    });
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
