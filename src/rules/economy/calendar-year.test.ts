import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { calendarDateByYearsFromFacts } from "./calendar-year";

const places = lifePlaceStateIdentities();

describe("calendar year rule", () => {
  it.each(places)("shifts a calendar date in $jurisdictionKey", (place) => {
    const index = places.indexOf(place);
    const year = 1980 + index;
    const years = (index % 21) - 10;
    expect(calendarDateByYearsFromFacts(`${year}-06-15`, years)).toBe(
      `${year - years}-06-15`,
    );
  });

  it("maps February 29 to February 28 when shifting years", () => {
    expect(calendarDateByYearsFromFacts("2024-02-29", 1)).toBe("2023-02-28");
    expect(calendarDateByYearsFromFacts("2024-02-29", -18)).toBe("2042-02-28");
  });
});
