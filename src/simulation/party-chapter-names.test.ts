import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { allGovernmentUnits, countyGovernmentUnit } from "./government-units";
import { lifePlaceSearch } from "./life-places";
import { homePartyChapters } from "./living-world/party-chapters";
import {
  homeLocalPartyAreaName,
  localGovernmentAreaName,
} from "./nationwide-world/local-governments";

// The Census listing files a county under its legal form, "COUNTY OF
// BALTIMORE". A party chapter named from that read "County of Baltimore
// Democrats" on screen; a person says "Baltimore County Democrats".
const FILING_FORM =
  /^(County|Parish|Borough|City and County|City and Borough) of /;

describe("a place named the way the people who live there say it", () => {
  it("names Baltimore County as Baltimore County", () => {
    const unit = countyGovernmentUnit("24005");
    expect(unit?.name).toBe("COUNTY OF BALTIMORE");
    expect(localGovernmentAreaName(unit!)).toBe("Baltimore County");
  });

  it("puts no county in the country in its filing form", () => {
    const counties = allGovernmentUnits().filter(
      (unit) => unit.unitType === "county",
    );
    // Proof the sweep reaches something: the listing has about 3,000 counties.
    expect(counties.length).toBeGreaterThan(2900);
    const filed = counties
      .map((unit) => localGovernmentAreaName(unit))
      .filter((name) => FILING_FORM.test(name));
    expect(filed).toStrictEqual([]);
  });

  it("names the home party chapters for the county, in a new life", () => {
    const catonsville = lifePlaceSearch("Catonsville", 10, {
      stateJurisdictionKey: "US-MD",
      scope: "locality",
    }).find((place) => /^Catonsville\b/.test(place.displayName))!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "party-chapter-names",
        placeKey: catonsville.key,
        startAge: 29,
        depth: "summarize-earlier-life",
      }),
    ).game!;
    const chapters = homePartyChapters(game.world).map(
      (chapter) => chapter.name,
    );
    expect(chapters).toContain("Baltimore County Democrats");
    expect(chapters.filter((name) => FILING_FORM.test(name))).toStrictEqual([]);
  });

  // Parties organize by county, parish and borough whether or not the area
  // has its own government, and by the town where the town is the county.
  it.each([
    ["Houma", "US-LA", "Terrebonne Parish"],
    ["New Orleans", "US-LA", "Orleans Parish"],
    ["Nashville", "US-TN", "Davidson County"],
    ["Wasilla", "US-AK", "Matanuska-Susitna Borough"],
    ["Anchorage", "US-AK", "Anchorage"],
    ["Juneau", "US-AK", "Juneau"],
    ["Bethel", "US-AK", "Bethel"],
    ["Denver", "US-CO", "Denver"],
    ["Richmond", "US-VA", "Richmond"],
    ["Hartford", "US-CT", "Hartford"],
    ["Boston", "US-MA", "Boston"],
    ["New York", "US-NY", "New York"],
  ])("names the party area of %s (%s) %s", (town, state, expected) => {
    const place = lifePlaceSearch(town, 10, {
      stateJurisdictionKey: state,
      scope: "locality",
    }).find((candidate) => candidate.displayName.startsWith(`${town},`))!;
    expect(place).toBeDefined();
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "party-area",
        placeKey: place.key,
        startAge: 30,
      }),
    ).game!;
    expect(homeLocalPartyAreaName(game.world, game.playerPersonId)).toBe(
      expected,
    );
    expect(homePartyChapters(game.world).map((c) => c.name)).toContain(
      `${expected} Democrats`,
    );
  });

  it("an old save that never declared the naming keeps its recorded names", () => {
    const catonsville = lifePlaceSearch("Catonsville", 10, {
      stateJurisdictionKey: "US-MD",
      scope: "locality",
    }).find((place) => /^Catonsville\b/.test(place.displayName))!;
    const legacy: NewGameSetup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "party-chapter-names-legacy",
      placeKey: catonsville.key,
      startAge: 29,
    };
    delete (legacy as { partyChapterNameVersion?: unknown })
      .partyChapterNameVersion;
    const game = generateOpeningLife(prepareOpeningLife(legacy)).game!;
    expect(homePartyChapters(game.world).map((c) => c.name)).toContain(
      "County of Baltimore Democrats",
    );
  });
});
