import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { recordPersonDeath } from "../simulation";
import { recordedTermFixture } from "../../tests/fixtures/recorded-legislative-term";
import {
  projectLifeContinuation,
  retireFromPlay,
} from "../presentation/people-continuation";
import { LifeContinuationPanel } from "./LifeContinuationPanel";

describe("LifeContinuationPanel death look-back", () => {
  it("opens on the story page and puts the record step before continuation choices", () => {
    const fixture = recordedTermFixture("rival");
    const dead = recordPersonDeath(fixture.world, {
      stableKey: `panel-lookback:${fixture.personId}`,
      personId: fixture.personId,
      diedAt: fixture.world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [fixture.world.id],
      summary: "The player died in the panel test.",
      provenance: { kind: "authored", note: "B19 panel test." },
    });
    const view = projectLifeContinuation(dead, fixture.personId)!;
    const html = renderToStaticMarkup(
      <LifeContinuationPanel
        world={dead}
        view={view}
        observing={false}
        onCommit={() => {}}
        onViewRecord={() => {}}
      />,
    );
    expect(html).toContain('data-testid="life-lookback-story"');
    expect(html).toContain('data-testid="life-lookback-turn-page"');
    expect(html).not.toContain('data-testid="life-lookback-record"');
    expect(html).not.toContain('data-testid="life-continuation-choices"');
    expect(html.indexOf("life-lookback-story")).toBeLessThan(
      html.indexOf("life-lookback-turn-page"),
    );
  });

  it("uses the same story page when play ends through retirement", () => {
    const fixture = recordedTermFixture("rival");
    const retired = retireFromPlay(fixture.world, fixture.personId);
    const view = projectLifeContinuation(retired, fixture.personId)!;
    const html = renderToStaticMarkup(
      <LifeContinuationPanel
        world={retired}
        view={view}
        observing={false}
        onCommit={() => {}}
        onViewRecord={() => {}}
      />,
    );
    expect(view.ended).toBe("retirement");
    expect(view.heading).toMatch(/goes on living/);
    expect(html).toContain('data-testid="life-lookback-story"');
    expect(html).toContain('data-testid="life-lookback-turn-page"');
  });
});
