import { expect, it } from "vitest";
import { SCHOOL_FINISHED } from "../core2/past";
import type { CoreState } from "../core2/types";
import { lastDayFacts } from "./last-day-facts";

// Edge cases by hand: a last school day and a last day at work, read as the
// last-day scene reads them. The cause records are the school engine's
// finished row and the jobs engine's job row.
const core = {
  durableLog: new Map<string, unknown>([
    [
      "school.finished:p1",
      {
        id: "school.finished:p1",
        kind: SCHOOL_FINISHED,
        facts: { schoolId: "org:school:1" },
      },
    ],
  ]),
  organizations: new Map<string, unknown>([
    ["org:school:1", { id: "org:school:1", name: "Lincoln High School" }],
    ["org:mill:1", { id: "org:mill:1", name: "Harbor Mill" }],
  ]),
  jobs: new Map<string, unknown>([
    [
      "job:p2:1",
      {
        id: "job:p2:1",
        personId: "p2",
        organizationId: "org:mill:1",
        title: "machinist",
      },
    ],
  ]),
} as unknown as CoreState;

it("a last school day names the school, citing the finished record", () => {
  const facts = lastDayFacts(core, "last-day", "school.finished:p1");
  expect(facts.school?.sourceRecordIds).toEqual([
    "school.finished:p1",
    "org:school:1",
  ]);
  expect(facts.school?.text).toBeTruthy();
  expect(facts["school-day"]).toBeTruthy();
  expect(facts.employer).toBeUndefined();
});

it("a last day at work names the employer and the job, citing the job row", () => {
  const facts = lastDayFacts(core, "last-day", "job:p2:1");
  expect(facts.employer?.sourceRecordIds).toEqual(["job:p2:1", "org:mill:1"]);
  expect(facts.position?.text).toBe("a machinist");
  expect(facts["work-day"]).toBeTruthy();
  expect(facts.school).toBeUndefined();
});

it("another type or record gives nothing", () => {
  expect(lastDayFacts(core, "letter", "job:p2:1")).toEqual({});
  expect(lastDayFacts(core, "last-day", "nothing")).toEqual({});
});
