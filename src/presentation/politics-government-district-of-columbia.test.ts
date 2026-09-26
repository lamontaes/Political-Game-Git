/*
 * A District of Columbia life's government screen.
 *
 * The District is not a state. It elects one Delegate to the House, who does
 * not cast final votes there, and has no seat in the Senate. The screen used
 * to give a Washington life a U.S. Senate row and an ordinary House row; it
 * now shows the Delegate and no Senate, as the orientation screen does.
 */
import { describe, expect, it } from "vitest";

import { adultLifeAt } from "../../tests/fixtures/state-executive-entry";
import { projectGovernmentBrowser } from "./politics-government";

describe("a District of Columbia life's government screen", () => {
  it("is represented by its Delegate, with no Senate row", () => {
    const life = adultLifeAt("1150000", "dc-government-rows");
    const rows = projectGovernmentBrowser(
      life.world,
      life.personId,
    ).representedBy!;
    expect(rows.map((row) => row.key)).not.toContain("us-senate");
    expect(rows.some((row) => row.office === "U.S. Senate")).toBe(false);
    const house = rows.find((row) => row.key === "us-house")!;
    expect(house.office).toBe("Delegate to the U.S. House");
    expect(house.district).toBe("District of Columbia");
    expect(house.note).toMatch(/does not cast final votes/);
    expect(house.note).toMatch(/no seat in the U\.S\. Senate/);
  });

  it("still gives a state life its two Senate seats", () => {
    const life = adultLifeAt("3223500", "dc-government-rows-state");
    const rows = projectGovernmentBrowser(
      life.world,
      life.personId,
    ).representedBy!;
    expect(rows.find((row) => row.key === "us-senate")?.office).toBe(
      "U.S. Senate",
    );
  });
});
