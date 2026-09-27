import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { macroMonthHistory } from "../simulation/macro-economy";
import { deserializeWorld, serializeWorld } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { WorldTrendPanel } from "./WorldTrendPanel";

describe("Your world recorded graphs", () => {
  it("uses the opt-in prior year's saved periods and survives World reload", () => {
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "team-e-world-trends-prior-year",
      placeKey: "lexington-fayette",
      startAge: 22,
      questionnaire: "skipped" as const,
      preStartYearVersion: "pre-start-world-year-v1" as const,
    };
    const generated = generateOpeningLife(prepareOpeningLife(setup));
    const world = generated.game!.world;
    const homeId =
      world.people[generated.game!.playerPersonId]!.homeJurisdictionId;
    const months = macroMonthHistory(world, "national", world.currentDate);
    expect(months.length).toBeGreaterThan(1);
    expect(months[0]!.periodStart.slice(0, 4)).toBe("2025");

    const before = serializeWorld(world);
    const html = renderToStaticMarkup(
      <WorldTrendPanel world={world} jurisdictionId={homeId} />,
    );
    expect(html).toContain('data-series-key="macro.unemployment-rate"');
    expect(html).toContain("January 2025");
    expect(html).toContain('class="economic-axis-label"');
    expect(html).toContain(">Time</text>");
    expect(html).toContain(">Value</text>");
    expect(html).toContain("Exact values");
    expect(html).not.toContain("Source URL");
    expect(serializeWorld(world)).toBe(before);

    const reloaded = deserializeWorld(before);
    expect(
      renderToStaticMarkup(
        <WorldTrendPanel world={reloaded} jurisdictionId={homeId} />,
      ),
    ).toBe(html);
  }, 180_000);
});
