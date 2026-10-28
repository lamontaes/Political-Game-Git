/**
 * Every incorporated place has a government (world-units-missing-incorporated-places):
 * of the Census population file's 19,483 incorporated places, each has a unit
 * in the 2025 government listing the game reads, or is named with its reason
 * in government-unit-place-matches.json. A listing unit the Census gives no
 * place code but names after one place is matched to it there. A place with
 * no unit gets no council and no mayor, so a gap here is a town with nothing
 * local to run for.
 */
import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import matches from "./data/reference/government-unit-place-matches.json" with { type: "json" };
import { governmentUnitsForPlace } from "./reference/government-units";
import { townshipGovernmentUnitsForPlace } from "./gov-rules/township-governing-body-rules";

const DIR = "data/research/places/";

function incorporatedPlaces(): { geoid: string; name: string }[] {
  const out: { geoid: string; name: string }[] = [];
  for (const file of readdirSync(DIR).filter((name) =>
    /^roadmap-r11-population-v2025-\d+\.csv$/.test(name),
  )) {
    const [head, ...lines] = readFileSync(DIR + file, "utf8").split("\n");
    const columns = head!.split(",");
    const geoid = columns.indexOf("geoid");
    const kind = columns.indexOf("geographyKind");
    const name = columns.indexOf("name");
    for (const line of lines) {
      if (!line) continue;
      const cells = (line.match(/("[^"]*"|[^,]*)(,|$)/g) ?? []).map((cell) =>
        cell.replace(/,$/, "").replace(/^"|"$/g, ""),
      );
      if (cells[kind] === "incorporated-place")
        out.push({ geoid: cells[geoid]!, name: cells[name]! });
    }
  }
  return out;
}

const hasUnit = (geoid: string) =>
  governmentUnitsForPlace(geoid).length > 0 ||
  townshipGovernmentUnitsForPlace(geoid).length > 0;

it("gives every incorporated place a government unit or a named reason", () => {
  const places = incorporatedPlaces();
  expect(places.length, "incorporated places read").toBeGreaterThan(19_000);
  const noUnit = matches.noUnit as Record<string, string>;
  const unexplained = places
    .filter((place) => !hasUnit(place.geoid) && !noUnit[place.geoid])
    .map((place) => `${place.geoid} ${place.name}`);
  expect(unexplained, "incorporated places with no unit and no reason").toEqual(
    [],
  );
  // A named gap that now has a unit is a stale reason.
  const stale = Object.keys(noUnit).filter((geoid) => hasUnit(geoid));
  expect(stale, "reasons for places that now have a unit").toEqual([]);
  // The units matched by name carry their place.
  for (const [unit, row] of Object.entries(matches.unitPlaceGeoids))
    expect(
      governmentUnitsForPlace(row.placeGeoid).map((u) => u.publisherId),
      `unit ${unit} for ${row.name}`,
    ).toContain(unit);
});
