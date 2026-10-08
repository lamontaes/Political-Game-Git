import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { lifePlaceByKey } from "../simulation/life-places";
import { PLACE_POPULATION_ROWS } from "../simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../simulation/territory-places";
import { PersonalFinancesWorkspace } from "./ShellWorkspaces";

const largest = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, population] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((largest.get(state)?.[1] ?? -1) < Number(population))
    largest.set(state, [key, Number(population)]);
}
largest.set("11", ["1150000", 0]);
largest.set("15", ["1571550", 0]);
largest.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!largest.has(usps)) largest.set(usps, [key, 0]);
const places = [...largest.values()].map(([key]) => lifePlaceByKey(key)!);

describe("Personal household cost estimates", () => {
  it("uses the shared estimate consumer in all 56 places", () => {
    expect(places).toHaveLength(56);
    for (const place of places) {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        seed: `b27-p2-personal-money:${place.key}`,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
      });
      const html = renderToStaticMarkup(
        <PersonalFinancesWorkspace
          world={game.world}
          personId={game.playerPersonId}
        />,
      );
      expect(html, place.key).toContain(
        'data-testid="personal-household-cost-estimate"',
      );
      expect(html, place.key).toContain(
        'data-estimate="ESTIMATED FROM AVERAGE"',
      );
      expect(html, place.key).toContain('data-period="month"');
      expect(html, place.key).toContain('data-cost-category="food"');
      const categories = [
        ...html.matchAll(
          /<li data-cost-category="[^"]+"><strong>[^<]+<\/strong><span>([^<]+)<\/span><\/li>/g,
        ),
      ];
      expect(categories.length, place.key).toBeGreaterThan(0);
      expect(
        categories.every(([, amount]) => amount!.includes("$")),
        place.key,
      ).toBe(true);
    }
  });
});
