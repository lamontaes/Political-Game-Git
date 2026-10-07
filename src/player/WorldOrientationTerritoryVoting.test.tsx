import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { OrientationView } from "../presentation/world-orientation";
import { WorldOrientationPanel } from "./WorldOrientationPanel";
import {
  FEDERAL_DISTRICT_USPS,
  STATES,
  TERRITORY_USPS,
} from "../simulation/state-reference";

/**
 * The state-wide voting survey covers the fifty states and D.C. A territory's
 * card leaves the section out rather than telling the player about the survey.
 */

const VIEW: OrientationView = {
  dateLabel: "January 5, 2026",
  steps: [
    {
      key: "state",
      title: "Home",
      summary: "The government where you live.",
      people: [],
      chambers: [],
    },
  ],
};

function render(homeStateUsps: string, view = VIEW): string {
  return renderToStaticMarkup(
    <WorldOrientationPanel
      view={view}
      homeStateUsps={homeStateUsps}
      mode="first"
      onClose={() => {}}
      onOpenPerson={() => {}}
    />,
  );
}

describe("the voting section on the opening state card", () => {
  it.each(["PR", "GU", "VI", "AS", "MP"])("is absent for %s", (usps) => {
    const html = render(usps);
    expect(html).not.toContain("opening-state-voting");
    expect(html).not.toContain("survey");
  });

  it("is still shown for a state", () => {
    expect(render("OR")).toContain("opening-state-voting");
  });

  it("removes the authored state summary across every jurisdiction", () => {
    const view: OrientationView = {
      ...VIEW,
      steps: [
        {
          ...VIEW.steps[0]!,
          summary: "The state summary is authored player text.",
        },
      ],
    };
    const jurisdictions = [
      ...new Set([
        ...Object.keys(STATES),
        ...FEDERAL_DISTRICT_USPS,
        ...TERRITORY_USPS,
      ]),
    ];
    expect(jurisdictions).toHaveLength(56);
    for (const usps of jurisdictions) {
      expect(render(usps, view)).not.toContain(
        "The state summary is authored player text.",
      );
    }
  });
});
