import { describe, expect, it } from "vitest";
import { clearsInOrder } from "./school-outcomes";

// A fifth's owed share is spent down its students by standing, each taking
// their household's weight of it. More owed share never fails a student who
// cleared with less (no threshold flip, owner Oct 14), and a lower-standing
// student never clears past a higher one.
describe("who clears a fifth's owed share", () => {
  it("never fails a student the smaller share cleared, over every owed share and weights", () => {
    let checked = 0;
    for (let a = 1; a <= 4; a += 1)
      for (let b = 1; b <= 4; b += 1)
        for (let c = 1; c <= 4; c += 1) {
          const weights = [a, b, c];
          for (let owed = 0; owed <= 14; owed += 0.5) {
            const less = clearsInOrder(weights, owed);
            const more = clearsInOrder(weights, owed + 0.5);
            less.forEach((cleared, i) => {
              if (cleared) expect(more[i], `${weights} at ${owed}`).toBe(true);
              checked += 1;
            });
          }
        }
    expect(checked).toBeGreaterThan(1000);
  });

  it("clears the owed 1 and 2 cases the greedy pass got backwards: [2, 1]", () => {
    expect(clearsInOrder([2, 1], 1)).toEqual([false, false]);
    expect(clearsInOrder([2, 1], 2)).toEqual([true, false]);
    expect(clearsInOrder([2, 1], 3)).toEqual([true, true]);
  });

  it("clears students in order of standing, and a lighter one never clears past a heavier one", () => {
    expect(clearsInOrder([1, 1, 1], 2)).toEqual([true, true, false]);
    expect(clearsInOrder([1, 3, 1], 2)).toEqual([true, false, false]);
  });
});
