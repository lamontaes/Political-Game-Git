import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { createEconomicContextBrowserProvider } from "./economic-context-browser";
import { economicContextBindingForPlace } from "./economic-context-bindings";
import {
  LOCAL_FIGURES_CARRIED_FORWARD_RULE,
  carriedLocalFigureLine,
  carriedLocalFigures,
} from "./local-economy-carried";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../simulation/macro-economy";
import type { MacroMonthRecord } from "../simulation/macro-economy";
import type { IsoDate, World } from "../simulation";
import { advanceWorld } from "../simulation/world";

/**
 * After the last real edition a town's rent, income and unemployment follow
 * the world's own economy. Towns are spread on purpose: an Idaho city, an Iowa
 * farm town, a New Mexico spa town and a Maine city HUD does not file rents
 * for by county. None of them Kentucky.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const provider = createEconomicContextBrowserProvider({
  fetchJson: async (url) =>
    JSON.parse(
      readFileSync(resolve(ROOT, "public", url.replace(/^\//, "")), "utf8"),
    ) as unknown,
});

const BOISE = "1608830";
const TOWNS = {
  "Boise City, ID": BOISE,
  "Sioux Center, IA": "1973290",
  "Truth or Consequences, NM": "3579840",
  "Presque Isle, ME": "2360825",
};

function openingIn(placeKey: string): World {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `carried-figures-${placeKey}`,
      placeKey,
      startAge: 34,
      questionnaire: "skipped" as const,
    }),
  ).game!.world;
}

const homeOf = (world: World) =>
  Object.values(world.people).find((person) => person.homeJurisdictionId)!
    .homeJurisdictionId!;

const contextFor = (placeKey: string, date: string) =>
  provider.query(economicContextBindingForPlace(placeKey)!, date);

const registry = createCampaignElectionTransitionRegistry();
let later: World | null = null;
/** One Boise life, thirteen months on: a year of the world's own economy. */
function aYearOn(): World {
  later ??= advanceWorld(openingIn(BOISE), 400, registry);
  return later;
}

describe("a town's figures after the last real edition", () => {
  it("shows nothing carried at the opening, before the world's economy has moved", async () => {
    const world = openingIn(BOISE);
    const context = await contextFor(BOISE, world.currentDate);
    expect(carriedLocalFigures(world, homeOf(world), context)).toEqual([]);
  });

  it.each(Object.entries(TOWNS))(
    "%s: rent follows prices, income follows prices and output, the jobless rate follows the modeled change",
    async (_, placeKey) => {
      const world = aYearOn();
      const context = await contextFor(placeKey, world.currentDate);
      const figures = carriedLocalFigures(world, homeOf(world), context);
      const now =
        macroConditionsAt(
          world,
          macroScopeForJurisdiction(homeOf(world)),
          world.currentDate,
        ) ?? macroConditionsAt(world, "national", world.currentDate)!;
      const byKey = Object.fromEntries(figures.map((f) => [f.key, f]));

      // Maine's rents are filed by town, which the game does not hold yet, so
      // Presque Isle has no rent to carry rather than a borrowed one.
      expect(Object.keys(byKey).sort()).toEqual(
        placeKey === "2360825"
          ? ["income", "unemployment"]
          : ["income", "rent", "unemployment"],
      );
      for (const figure of figures)
        expect(figure.rule).toBe(LOCAL_FIGURES_CARRIED_FORWARD_RULE);

      // Rent and income were first known before the world began, so both are
      // carried from the world's first month.
      const first = world.macroEconomy!.months.find(
        (m) => m.scope === "national",
      )!;
      const prices = now.priceIndex / first.priceIndex;
      expect(prices).toBeGreaterThan(1);
      if (byKey.rent)
        expect(byKey.rent.carriedValue).toBe(
          Math.round(byKey.rent.realValue * prices),
        );
      expect(byKey.income!.carriedValue).toBe(
        Math.round(
          byKey.income!.realValue *
            prices *
            (now.realOutputIndex / first.realOutputIndex),
        ),
      );
      // The latest jobless figure reached the world in-game, so it moves by
      // what the world's rate did from that month on.
      const unemployment = byKey.unemployment!;
      const base = macroConditionsAt(
        world,
        "national",
        (context.observations.find(
          (o) =>
            o.referencePeriod === unemployment.realPeriod &&
            o.sourceSeriesKey.endsWith("03"),
        )!.vintage.knownAvailableOn ?? "") as IsoDate,
      );
      if (base)
        expect(unemployment.carriedValue).toBeCloseTo(
          unemployment.realValue + now.unemploymentPct - base.unemploymentPct,
          1,
        );
      expect(carriedLocalFigureLine(unemployment)).toContain(
        "now in this world, from",
      );
    },
    600_000,
  );

  it("does not move a figure's base forward when the town's own economy begins later", async () => {
    // The world with only its national layer, whatever local shocks it drew.
    const drawn = aYearOn();
    const world: World = {
      ...drawn,
      macroEconomy: {
        ...drawn.macroEconomy!,
        months: drawn.macroEconomy!.months.filter(
          (m) => m.scope === "national",
        ),
      },
    };
    const home = homeOf(world);
    const context = await contextFor(BOISE, world.currentDate);
    const before = carriedLocalFigures(world, home, context);
    expect(before.map((f) => f.key)).toEqual([
      "rent",
      "income",
      "unemployment",
    ]);
    // A local layer that only begins in the world's last month, as it does the
    // day a local shock arrives, continuing from the national month.
    const national = world.macroEconomy!.months.filter(
      (m) => m.scope === "national",
    );
    const last = national.at(-1)!;
    const localLast: MacroMonthRecord = {
      ...last,
      key: `${last.key}:local`,
      scope: macroScopeForJurisdiction(home),
      ordinal: 0,
    };
    const withLayer: World = {
      ...world,
      macroEconomy: {
        ...world.macroEconomy!,
        months: [...world.macroEconomy!.months, localLast],
      },
    };
    expect(carriedLocalFigures(withLayer, home, context)).toEqual(before);
  });
});
