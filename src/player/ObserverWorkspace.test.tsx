import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../scenarios/demo";
import { recordWorldEvent } from "../simulation/world";
import { ObserverRunController } from "./observer-run-controller";
import {
  ObserverClock,
  ObserverPersonStory,
  ObserverRecordWorkspace,
} from "./ObserverWorkspace";
import type { EntityId, IsoDate } from "../simulation/types";

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

describe("ObserverPersonStory", () => {
  it("lists a person's threads by importance with their turns, and their recent moments", () => {
    const sarah = "person_sarah" as EntityId;
    const wyatt = "person_wyatt" as EntityId;
    const html = renderToStaticMarkup(
      <ObserverPersonStory
        story={{
          threads: [
            {
              personId: sarah,
              name: "Sarah McKenzie",
              tie: "parent",
              importance: 0.8,
              since: "1997-05-12" as IsoDate,
              turns: [
                {
                  at: "1997-05-12" as IsoDate,
                  turn: "started",
                  importance: 0.8,
                },
              ],
              lastContactOn: null,
            },
            {
              personId: wyatt,
              name: "Wyatt Murray",
              tie: null,
              importance: 0.233333,
              since: "2001-05-12" as IsoDate,
              turns: [
                {
                  at: "2001-05-12" as IsoDate,
                  turn: "started",
                  importance: 0.058333,
                },
                {
                  at: "2026-01-12" as IsoDate,
                  turn: "renewed",
                  importance: 0.233333,
                },
              ],
              lastContactOn: "2026-01-12" as IsoDate,
            },
            {
              personId: "person_jacob" as EntityId,
              name: "Jacob Gomez",
              tie: "sharedHome",
              importance: 0.3,
              since: null,
              turns: [],
              lastContactOn: null,
            },
          ],
          moreThreads: 4,
          moments: [
            {
              id: "story-moment_1" as EntityId,
              at: "2026-01-12" as IsoDate,
              kind: "reached-out",
              salience: 0.225,
              with: ["Audrey McKenzie"],
            },
          ],
        }}
        personLink={(_, name) => name}
      />,
    );
    expect(html).toContain('data-testid="observer-person-threads"');
    expect(html).toContain(
      "Sarah McKenzie: importance 0.80, parent; started May 12, 1997 (0.80)",
    );
    expect(html).toContain(
      "started May 12, 2001 (0.06), renewed January 12, 2026 (0.23); last in touch January 12, 2026",
    );
    expect(html).toContain(
      "Jacob Gomez: importance 0.30, shared home; no moments yet",
    );
    expect(html).toContain("4 more");
    expect(html).toContain('data-testid="observer-person-moments"');
    expect(html).toContain(
      "January 12, 2026: reached-out (0.225) with Audrey McKenzie",
    );
  });

  it("says plainly when nothing is on record", () => {
    const html = renderToStaticMarkup(
      <ObserverPersonStory
        story={{ threads: [], moreThreads: 0, moments: [] }}
        personLink={(_, name) => name}
      />,
    );
    expect(html).toContain("No threads on record.");
    expect(html).toContain("No moments on record.");
  });
});
