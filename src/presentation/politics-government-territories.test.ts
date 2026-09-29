/*
 * A territory life's government screen.
 *
 * Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern
 * Mariana Islands govern themselves: the screen calls that level the
 * territory's government, shows the territory's own Governor, and shows the
 * one nonvoting member each sends to the House in place of a Senate seat the
 * territory does not have.
 */
import { describe, expect, it } from "vitest";

import {
  adultLifeAt,
  firstLocality,
} from "../../tests/fixtures/state-executive-entry";
import {
  governmentScopeLabel,
  projectGovernmentBrowser,
} from "./politics-government";

const CASES = [
  ["PR", firstLocality("PR").key, "Resident Commissioner", "Puerto Rico"],
  ["GU", "territory:GU:dededo", "Delegate to the U.S. House", "Guam"],
  [
    "VI",
    "territory:VI:christiansted",
    "Delegate to the U.S. House",
    "the U.S. Virgin Islands",
  ],
  [
    "AS",
    firstLocality("AS").key,
    "Delegate to the U.S. House",
    "American Samoa",
  ],
  [
    "MP",
    firstLocality("MP").key,
    "Delegate to the U.S. House",
    "the Northern Mariana Islands",
  ],
] as const;

describe("a territory life's government screen", () => {
  it.each(CASES)(
    "%s: is represented by its House member, with no Senate row",
    (usps, placeKey, houseTitle) => {
      const life = adultLifeAt(placeKey, `territory-government-${usps}`);
      const rows = projectGovernmentBrowser(
        life.world,
        life.personId,
      ).representedBy!;
      expect(rows.map((row) => row.key)).not.toContain("us-senate");
      const house = rows.find((row) => row.key === "us-house")!;
      expect(house.office).toBe(houseTitle);
      // A fictional holder is seated with the life, never left as unknown.
      expect(house.holders).toHaveLength(1);
      expect(house.holders[0]).toMatchObject({ status: "member" });
      expect(house.holders[0]!.name).toBeTruthy();
      expect(house.holders[0]!.personId).toBeTruthy();
      expect(house.note).toMatch(/does not cast final votes/);
      expect(house.note).not.toMatch(/No current record/);
    },
  );

  it.each(CASES)(
    "%s: calls its own government the territory's, with its own Governor",
    (usps, placeKey, _houseTitle, name) => {
      const life = adultLifeAt(placeKey, `territory-government-state-${usps}`);
      const view = projectGovernmentBrowser(life.world, life.personId, {
        scope: "state",
      });
      expect(view.scopeLabel).toBe("Territory");
      expect(governmentScopeLabel("state", usps)).toBe("Territory");
      expect(governmentScopeLabel("state", "NV")).toBe("State");
      const executive = view.branches.find(
        (branch) => branch.branch === "executive",
      )!;
      expect(executive.entries.map((entry) => entry.title)).toEqual([
        `Governor of ${name}`,
      ]);
      // A fictional holder seated with the life, never left blank.
      expect(executive.entries[0]!.holderName).toBeTruthy();
      const text = JSON.stringify(view.branches);
      expect(text).not.toMatch(/\bgame\b/i);
      expect(text).not.toMatch(/Islands's/);
    },
  );

  it("DC: is represented by its Delegate, seated with the life, with no Senate row", () => {
    const life = adultLifeAt(
      firstLocality("DC").key,
      "territory-government-DC",
    );
    const rows = projectGovernmentBrowser(
      life.world,
      life.personId,
    ).representedBy!;
    expect(rows.map((row) => row.key)).not.toContain("us-senate");
    const house = rows.find((row) => row.key === "us-house")!;
    expect(house.office).toBe("Delegate to the U.S. House");
    expect(house.holders).toHaveLength(1);
    expect(house.holders[0]).toMatchObject({ status: "member" });
    expect(house.holders[0]!.name).toBeTruthy();
    expect(house.note).toMatch(/does not cast final votes/);
  });
});
