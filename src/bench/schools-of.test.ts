import { expect, it } from "vitest";
import type { CoreState } from "../core2/types";
import { schoolsOf } from "./words";

// The person sheet listed one school twice when it served two stages in a row
// (seen in a new game: "Leoma Elementary" under School, twice).
const fact = (id: string, date: string, stage: string, schoolName: string) => ({
  id,
  kind: "school:cohort-estimate",
  date,
  summary: "",
  facts: { stage, schoolName },
});
const core = (pastFacts: unknown[]) =>
  ({ people: new Map([["p", { pastFacts }]]) }) as unknown as CoreState;

it("names a school once when it serves two stages in a row", () => {
  const named = schoolsOf(
    core([
      fact("a", "2012-08-27", "elementary", "Leoma Elementary"),
      fact("b", "2018-08-27", "middle", "Leoma Elementary"),
    ]),
    "p",
  );
  expect(named.map((row) => row.name)).toEqual(["Leoma Elementary"]);
  // The first stage's record names it.
  expect(named[0]!.recordId).toBe("a");
});

it("keeps a school the person went back to, and the classmates' facts out", () => {
  const named = schoolsOf(
    core([
      fact("a", "2012-08-27", "elementary", "North"),
      fact("b", "2018-08-27", "middle", "South"),
      fact("c", "2021-08-27", "high", "North"),
      {
        id: "d",
        kind: "social:x",
        date: "2018-09-01",
        summary: "",
        facts: { schoolName: "South" },
      },
    ]),
    "p",
  );
  expect(named.map((row) => row.name)).toEqual(["North", "South", "North"]);
});
