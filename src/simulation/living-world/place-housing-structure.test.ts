import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { lifePlaceByKey } from "../life-places";
import { makeIsoDate } from "../dates";
import { SeededRng } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { ensureTownResidents } from "./town-residents";
import { ensureTownHomes } from "./town-homes";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import {
  openingDwellingStructure,
  placeHousingStructureRow,
} from "./place-housing-structure";

const seed = "team4-a57-place-stock-20261001";
const choices = PLACE_POPULATION_ROWS.split(";")
  .map((entry) => entry.split(":")[0]!)
  .filter((key) => placeHousingStructureRow(key)?.[1] && lifePlaceByKey(key));
const rng = new SeededRng(seed);
const places = Array.from(
  { length: 5 },
  () => choices.splice(rng.integer(0, choices.length), 1)[0]!,
);

describe("A57 place-sourced existing dwelling stock", () => {
  it("does not turn missing, unbounded or future survey facts into exact facts", () => {
    const absent = openingDwellingStructure(
      "not-a-place",
      "residential:apartment",
      new SeededRng(seed),
      makeIsoDate("2026-01-01"),
    );
    expect(absent.builtYear).toBeNull();
    expect(absent.unitsInBuilding).toBeNull();
    const historical = openingDwellingStructure(
      places[0]!,
      "residential:house",
      new SeededRng(seed),
      makeIsoDate("2020-01-01"),
    );
    expect(historical.builtYear).toBeNull();
    expect(historical.unitsInBuilding).toBeNull();
    const mobile = openingDwellingStructure(
      places[0]!,
      "residential:mobile-home",
      new SeededRng(seed),
      makeIsoDate("2026-01-01"),
    );
    expect(mobile.unitsInBuilding).toBeNull();
  });
  it.each(places)(
    "saves source estimates once on actual households' homes in %s",
    (placeKey) => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey,
        seed: `${seed}:${placeKey}`,
        startAge: 30,
        household: "lives-alone",
        questionnaire: "skipped",
      });
      const town = game.world.people[game.playerPersonId]!.homeJurisdictionId;
      const source = ensureTownResidents(game.world, game.playerPersonId);
      const housed = ensureTownHomes(source, town);
      const dwellings = housed.history.dwellings.filter(
        (dwelling) =>
          dwelling.jurisdictionId === town &&
          dwelling.provenance.kind === "source-record",
      );
      expect(dwellings.length).toBeGreaterThan(0);
      for (const dwelling of dwellings) {
        expect(dwelling.provenance).toMatchObject({
          kind: "source-record",
          reference: expect.stringContaining(
            `ACS2024-5year:place:${placeKey}:`,
          ),
        });
        expect(dwelling).toHaveProperty("builtYear");
        expect(dwelling).toHaveProperty("unitsInBuilding");
        if (dwelling.builtYear != null) {
          expect(dwelling.builtYear).toBeLessThanOrEqual(2019);
          expect(dwelling.builtYear).toBeGreaterThanOrEqual(1940);
          expect(dwelling.builtYear).not.toBe(
            Number(dwelling.establishedAt.slice(0, 4)),
          );
        }
        if (dwelling.unitsInBuilding != null) {
          expect(Number.isSafeInteger(dwelling.unitsInBuilding)).toBe(true);
          expect(dwelling.unitsInBuilding).toBeGreaterThan(0);
          expect(dwelling.unitsInBuilding).toBeLessThan(50);
        }
      }
      expect(housed.history.resourceTransferOutcomes).toEqual(
        source.history.resourceTransferOutcomes,
      );
      expect(ensureTownHomes(housed, town)).toBe(housed);
      const reopened = deserializeWorld(serializeWorld(housed));
      expect(reopened.history.dwellings).toEqual(housed.history.dwellings);
      expect(ensureTownHomes(reopened, town)).toBe(reopened);
      console.log(
        `A57 stock seed=${seed} place=${placeKey}: ${dwellings.length} actual saved homes; no construction or payment claimed.`,
      );
    },
  );
});
