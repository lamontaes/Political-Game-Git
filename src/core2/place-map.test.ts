import { describe, expect, it } from "vitest";
import {
  allPlaces,
  governingPlace,
  placeChain,
  placeCounty,
  placeParent,
  placeRow,
  placeSlots,
  placeState,
  placesUnder,
} from "./place-map";
import { placeStateKeys } from "./places";

describe("the one place map", () => {
  const rows = allPlaces();

  it("holds the country, all 56 jurisdictions and every town", () => {
    expect(rows.filter((r) => r.level === "country")).toHaveLength(1);
    expect(
      rows
        .filter((r) => r.level === "state")
        .map((r) => r.id)
        .sort(),
    ).toEqual([...placeStateKeys()]);
    expect(rows.filter((r) => r.level === "town").length).toBeGreaterThan(
      32000,
    );
  });

  it("gives every place a chain that ends at the country", () => {
    for (const row of rows) expect(placeChain(row.id).at(-1)?.id).toBe("US");
  });

  it("reads a town's parents the same way in every jurisdiction", () => {
    for (const state of rows.filter((r) => r.level === "state")) {
      const town =
        placesUnder(state.id).find((r) => r.level === "town") ??
        placesUnder(
          placesUnder(state.id).find((r) => r.level === "county")?.id ?? "",
        )[0];
      if (!town) continue;
      expect(placeState(town.id)?.id).toBe(state.id);
      expect(placeParent(town.id)).not.toBeNull();
    }
  });

  it("gives a Puerto Rico municipio a county row with its own government", () => {
    const row = placeRow("county:72001");
    expect(row).toMatchObject({
      level: "county",
      parentId: "US-PR",
      form: "county",
    });
    expect(placeCounty("county:72001")?.id).toBe("county:72001");
  });

  it("puts a Puerto Rico town under its municipio, the county the housing tables key", () => {
    expect(placeCounty("7246626")?.id).toBe("county:72029");
    expect(placeState("7246626")?.id).toBe("US-PR");
  });

  it("reads a place with no government of its own through the row above", () => {
    const none = rows.find(
      (r) =>
        r.level === "town" &&
        r.form === "none" &&
        r.parentId?.startsWith("county:"),
    );
    expect(none).toBeDefined();
    expect(governingPlace(none!.id)?.id).toBe(none!.parentId);
    expect(placeSlots(none!.id)?.laws[0]).toBe(none!.id);
  });

  it("gives the country and a state the same four slots", () => {
    expect(placeSlots("US")).toMatchObject({
      laws: ["US"],
      offices: { bodyLevel: "federal" },
    });
    const slots = placeSlots(rows.find((r) => r.level === "state")!.id)!;
    expect(Object.keys(slots).sort()).toEqual([
      "budget",
      "calendar",
      "laws",
      "offices",
    ]);
  });
});
