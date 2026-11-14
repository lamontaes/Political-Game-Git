/**
 * The parties a state's people can tie to come from its 2024 presidential
 * ballot. Some states print count lines beside the candidates (Vermont and
 * Hawaii "Blank Votes", Wyoming and D.C. "Over Votes" and "Under Votes", New
 * York "Void", Wisconsin "Scattering", Nevada "None of These Candidates"); none
 * of those may become a party on the Politics screen (playtest P3, Nov 13:
 * North Hyde Park, Vermont listed "Blank Votes" and "Over Votes" as parties).
 */
import { describe, expect, it } from "vitest";
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json";
import { stateParties } from "./parties";

const COUNT_LINE =
  /\bvotes$|^blanks?$|^void$|scattering|none of these|^(all )?others$|miscellaneous|unenrolled/i;

const states = (
  calibration as unknown as { presidentialByState: { stateUsps: string }[] }
).presidentialByState.map((row) => row.stateUsps);

describe("a state's parties are parties, not ballot count lines", () => {
  it("covers the states whose ballots print count lines", () => {
    for (const usps of ["VT", "HI", "WY", "DC", "NY", "WI", "NV", "MA"])
      expect(states).toContain(usps);
  });
  it.each(states)("%s", (usps) => {
    const names = stateParties(`US-${usps}`, "p3-ballot-lines").map(
      (party) => party.name,
    );
    expect(names.filter((name) => COUNT_LINE.test(name))).toEqual([]);
    // The two major parties stay wherever the ballot carried them.
    expect(names).toEqual(expect.arrayContaining(["Democratic", "Republican"]));
  });
});
