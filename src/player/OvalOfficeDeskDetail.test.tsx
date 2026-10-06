import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { TitlePresentation } from "../presentation/title-tableau";
import { TitleTableau } from "./TitleTableau";

function picture(place: string): TitlePresentation {
  return {
    kind: "neutral-tableau",
    tableau: null,
    scene: null,
    heroAnchorId: null,
    heroName: null,
    description: "A civic room.",
    reasons: [],
    picture: {
      place,
      kind: place === "oval-office" ? "white-house" : "court",
      label: "A civic room",
      url: `/art/backdrops/${place}__midday.jpg`,
    },
  };
}

describe("the title Oval Office desk", () => {
  it("adds the Resolute desk's carved joinery to every Oval Office title presentation", () => {
    const markup = renderToStaticMarkup(
      <TitleTableau presentation={picture("oval-office")}>Title</TitleTableau>,
    );

    expect(markup).toContain('data-place="oval-office"');
    expect(markup).toContain('data-testid="oval-office-resolute-detail"');
    expect(markup).toContain('viewBox="0 0 1672 941"');
  });

  it("does not paint Oval Office furniture into another place", () => {
    const markup = renderToStaticMarkup(
      <TitleTableau presentation={picture("courthouse")}>Title</TitleTableau>,
    );

    expect(markup).not.toContain("oval-office-resolute-detail");
  });
});
