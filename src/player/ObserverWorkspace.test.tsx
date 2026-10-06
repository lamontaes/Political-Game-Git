import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import { recordWorldEvent } from "../simulation/world";
import { ObserverRunController } from "./observer-run-controller";
import { ObserverClock, ObserverRecordWorkspace } from "./ObserverWorkspace";

describe("ObserverClock", () => {
  it("leaves the current date on the player card instead of repeating it in the Observing bar", () => {
    const world = createDemoWorld("bg-13-observer-date");
    const html = renderToStaticMarkup(
      <ObserverClock
        runner={new ObserverRunController(world)}
        onOpenRecord={() => {}}
      />,
    );

    expect(html).toContain('data-testid="observer-clock"');
    expect(html).toContain('data-testid="observer-run"');
    expect(html).not.toContain('data-testid="observer-date"');
    expect(html).not.toContain(world.currentDate);
  });
});

describe("ObserverRecordWorkspace legislative results", () => {
  it("shows saved summary events in bounded pages without inventing contests", () => {
    let world = createDemoWorld("observer-summary-ui");
    const winnerId = world.personOrder[0]!;
    for (let index = 0; index < 9; index += 1) {
      world = recordWorldEvent(world, {
        stableKey: `test:observer-summary-ui:${index}`,
        type: "election.congress-general-results",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [winnerId],
        participants: [
          {
            personId: winnerId,
            role: "focus:winner",
            detail: `us-house:KS-0${index}|democratic|democratic|new|2027-01-03`,
          },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: ["congress-turnover/v1"],
        summary: "A congressional result was recorded.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    }

    const html = renderToStaticMarkup(
      <ObserverRecordWorkspace world={world} onOpenPerson={() => {}} />,
    );
    expect(html).toContain('data-testid="world-record-election-summaries"');
    expect(
      html.match(/data-testid="world-record-election-summary"/g),
    ).toHaveLength(8);
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("1 winner named in this summary");
    expect(html).not.toContain("No election has been decided yet.");
  });
});
