import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MacroConditionsPanel } from "../player/MacroConditionsPanel";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  CRUNCH46_PROVISIONAL_POLICY,
  ensureMacroEconomyStarted,
  startValuesFromLatents,
} from "../simulation/macro-economy";
import type { World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import { macroPeriodLabel, projectMacroConditions } from "./macro-conditions";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { forbiddenPlayerPhrasesIn } from "./player-copy";

/** A legacy-descriptor life: no WORLD starting record, so no macro history. */
function life(seed: string): World {
  const setup: NewGameSetup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "lexington-fayette",
    startAge: 34,
    questionnaire: "skipped" as const,
  };
  delete (setup as { worldOpeningVersion?: unknown }).worldOpeningVersion;
  return generateOpeningLife(prepareOpeningLife(setup)).game!.world;
}

/** Test-only stand-in for WORLD's persisted starting draw. */
function withHistory(world: World): World {
  const latents = { cycle: 0.4, cost: -0.3, housing: 0, credit: 0 };
  return ensureMacroEconomyStarted(world, {
    contractVersion: "crunch46-macro-start/v1",
    policyVersion: "crunch46-provisional-v1",
    regime: "modest",
    volatilityScale: CRUNCH46_PROVISIONAL_POLICY.volatilityScale.modest,
    latents,
    initial: startValuesFromLatents("modest", latents),
    effectiveDate: world.currentDate,
  });
}

function home(world: World) {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  return world.people[player!]!.homeJurisdictionId;
}

function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ");
}

describe("Budget & economy macro conditions", { timeout: 1_800_000 }, () => {
  const base = withHistory(life("change-screen-a"));
  const later = advanceWorld(
    base,
    300,
    createCampaignElectionTransitionRegistry(),
  );
  const model = projectMacroConditions(later, home(later));

  it("drives each card and graph from one series", () => {
    expect(model.status).toBe("recorded");
    expect(model.cards.map((card) => card.seriesKey)).toEqual(
      model.series.map((series) => series.key),
    );
    for (const [index, series] of model.series.entries()) {
      const card = model.cards[index]!;
      const graph = model.graphs[index]!;
      const latest = [...series.points].reverse().find((p) => p.value !== null);
      expect(card.value).toBe(latest?.value ?? null);
      expect(graph.unit).toBe(series.unit);
      expect(graph.series[0]!.points.map((p) => p.value)).toEqual(
        series.points.map((p) => p.value),
      );
    }
  });

  it("matches released values and keeps early gaps as gaps", () => {
    const unemployment = model.series.find(
      (s) => s.key === "macro.unemployment-rate",
    )!;
    const releases = later.macroEconomy!.releases.filter(
      (r) => r.indicator === "unemployment-rate",
    );
    expect(unemployment.points.map((p) => p.value)).toEqual(
      releases.map((r) => r.value),
    );
    const inflation = model.series.find(
      (s) => s.key === "macro.consumer-price-inflation-12m",
    )!;
    expect(inflation.points.length).toBeGreaterThan(0);
    for (const point of inflation.points) {
      expect(point.value).toBeNull();
      expect(point.missingReason).toMatch(/twelve recorded months/);
    }
    expect(unemployment.geographyLabel).toMatch(/national/);
  });

  it("changes nothing when read", () => {
    const before = JSON.stringify(later);
    projectMacroConditions(later, home(later));
    renderToStaticMarkup(
      createElement(MacroConditionsPanel, {
        world: later,
        jurisdictionId: home(later),
      }),
    );
    expect(JSON.stringify(later)).toBe(before);
  });

  it("renders player-safe copy with American dates", () => {
    const html = renderToStaticMarkup(
      createElement(MacroConditionsPanel, {
        world: later,
        jurisdictionId: home(later),
      }),
    );
    const words = text(html);
    expect(forbiddenPlayerPhrasesIn(words)).toEqual([]);
    expect(words).toMatch(/Unemployment/);
    expect(words).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(macroPeriodLabel("2026-09")).toBe("September 2026");
    expect(macroPeriodLabel("2026-Q3")).toBe("Q3 2026");
    expect(html).toContain("<button");
  });

  it("an older life shows an explanation and no figures", () => {
    const old = life("change-screen-old");
    const oldModel = projectMacroConditions(old, home(old));
    expect(oldModel.status).toBe("no-history");
    expect(oldModel.cards).toEqual([]);
    const html = renderToStaticMarkup(
      createElement(MacroConditionsPanel, {
        world: old,
        jurisdictionId: home(old),
      }),
    );
    expect(html).toContain("macro-conditions-unavailable");
    expect(forbiddenPlayerPhrasesIn(text(html))).toEqual([]);
  });
});
