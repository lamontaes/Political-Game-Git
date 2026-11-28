import { expect, it } from "vitest";
import { screenWays } from "../../../src/english/screen-words";
import { stretchOfLife } from "../../../src/bench/card";

// A card tells when a thing happened by the stretch of life the person was in
// ("in their forties") where the year is not the point. Every age from birth
// to old age falls in a stretch the bank can say in every form.
it("every age falls in a stretch the bank says as an opening and as a phrase, in every form", () => {
  for (let age = 1; age <= 110; age++) {
    const stretch = stretchOfLife(age);
    for (const form of ["third", "they", "i"]) {
      for (const bank of ["when.band", "then"]) {
        const ways = [
          ...screenWays(
            "person-history",
            `person-history.${bank}.${stretch}.${form}`,
          ),
          ...screenWays(
            "person-history",
            `person-history.${bank}.${stretch}.any`,
          ),
        ];
        expect(ways.length, `age ${age}, ${bank}, ${form}`).toBeGreaterThan(0);
      }
    }
  }
});
