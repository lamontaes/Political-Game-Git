import { expect, it } from "vitest";
import { agencyHeadSaid, counterSaid } from "./said-as";

it("an agency is said as one body, never a form's parenthesis or two bodies joined", () => {
  const joined =
    "State Election Commission (original) and Coordinator of Elections (duplicate)";
  expect(agencyHeadSaid(joined)).toBe("head of the State Election Commission");
  expect(counterSaid("x", joined)).toBe("the State Election Commission");
  expect(agencyHeadSaid("Virginia Department of Elections (State Board)")).toBe(
    "head of the Virginia Department of Elections",
  );
});

it("a name that is itself an office is said as the office, and its place is the office's own", () => {
  expect(agencyHeadSaid("Ohio Secretary of State")).toBe(
    "Ohio Secretary of State",
  );
  expect(counterSaid("x", "Ohio Secretary of State")).toBe(
    "the Ohio Secretary of State's office",
  );
});

it("an ordinary clerk's counter is the clerk's office", () => {
  expect(counterSaid("county clerk")).toBe("the county clerk's office");
});
