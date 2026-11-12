import { expect, it } from "vitest";
import { districtWords, raceTitle } from "./race-words";

// A district reads as words once, never as the records' padded code (path 9,
// the clerk's race list: "U.S. Representative (05)" and "Seat 05" before).
it("words a district once and leaves an at-large seat to the place", () => {
  expect(districtWords("05")).toBe("District 5");
  expect(districtWords("014")).toBe("District 14");
  expect(districtWords("04A")).toBe("District 4A");
  expect(districtWords("Chittenden-6-1")).toBe("District Chittenden-6-1");
  for (const atLarge of ["00", "0", "At-large", "", null, undefined])
    expect(districtWords(atLarge), String(atLarge)).toBeNull();
  expect(raceTitle("U.S. Representative", "05")).toBe(
    "U.S. Representative (District 5)",
  );
  expect(raceTitle("U.S. Representative", "00")).toBe("U.S. Representative");
  expect(raceTitle("Council member", null)).toBe("Council member");
});
