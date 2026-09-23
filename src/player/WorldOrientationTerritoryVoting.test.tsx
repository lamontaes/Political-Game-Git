import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { OrientationView } from "../presentation/world-orientation";
import { WorldOrientationPanel } from "./WorldOrientationPanel";

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

function render(homeStateUsps: string): string {
  return renderToStaticMarkup(
    <WorldOrientationPanel
      view={VIEW}
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
});
