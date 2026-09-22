import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { allGovernmentUnits, countyGovernmentUnit } from "./government-units";
import { lifePlaceSearch } from "./life-places";
import { homePartyChapters } from "./living-world/party-chapters";
import { localGovernmentAreaName } from "./nationwide-world/local-governments";

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
});
