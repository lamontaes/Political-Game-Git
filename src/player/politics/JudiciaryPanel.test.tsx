import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../../simulation/demo";
import { makeIsoDate } from "../../simulation/dates";
import { personName } from "../../simulation/people";
import type { JudiciaryView } from "../../presentation/judiciary";
import { JudiciaryPanel } from "./JudiciaryPanel";

describe("JudiciaryPanel", () => {
  it("shows a recorded judge, portrait and tenure date without internal geography wording", () => {
    const world = createDemoWorld("judiciary-panel");
    const personId = world.personOrder[0]!;
    const view: JudiciaryView = {
      stateName: "Kentucky",
      supremeCourt: null,
      federalCourts: [],
      stateCourts: [
        {
          courtId: "test-court",
          name: "Kentucky Circuit Court",
          seatCount: 1,
          geographyDetail: "office-family-only",
          holders: [
            {
              seatId: "test-court:seat:1",
              personId,
              name: personName(world.people[personId]!),
              startedAt: makeIsoDate("2026-01-20"),
            },
          ],
        },
      ],
    };
    const html = renderToStaticMarkup(
      <JudiciaryPanel
        world={world}
        view={view}
        scope="state"
        onOpenPerson={() => {}}
      />,
    );
    expect(html).toContain(personName(world.people[personId]!));
    expect(html).toContain("At this court since January 20, 2026");
    expect(html).toContain('data-testid="person-portrait"');
    expect(html).not.toContain("not recorded for this state");
  });
});
