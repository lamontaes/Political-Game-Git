/**
 * The schools Who you are and Jobs and study list (play-stop-08): each school
 * stage the deep past recorded, oldest first, with a campus that taught
 * several stages (a K-12 school) listed once, from the year the person
 * started there.
 */
import { expect, it } from "vitest";
import type { CoreState } from "../core2/types";
import { schoolsOf } from "./words";

const world = (schools: readonly [string, string, string][]) =>
  ({
    people: new Map([
      [
        "person:student",
        {
          pastFacts: schools.map(([date, stage, schoolName]) => ({
            id: `person:student:school:${stage}`,
            date,
            kind: "school:cohort-estimate",
            facts: { stage, schoolName },
          })),
        },
      ],
    ]),
  }) as unknown as CoreState;

it("lists each campus once, with a K-12 school from its first year", () => {
  const k12 = schoolsOf(
    world([
      ["2012-08-26", "elementary", "LA FARGEVILLE CENTRAL SCHOOL"],
      ["2018-08-26", "middle", "LA FARGEVILLE CENTRAL SCHOOL"],
      ["2021-08-29", "high", "LA FARGEVILLE CENTRAL SCHOOL"],
    ]),
    "person:student",
  );
  expect(k12.map((row) => [row.date, row.name])).toEqual([
    ["2012-08-26", "La Fargeville Central School"],
  ]);
  const anson = schoolsOf(
    world([
      ["2021-08-29", "high", "ANSON HIGH SCHOOL"],
      ["2012-08-26", "elementary", "ANSON ELEMENTARY SCHOOL"],
      ["2018-08-26", "middle", "ANSON MIDDLE SCHOOL"],
    ]),
    "person:student",
  );
  expect(anson.map((row) => row.name)).toEqual([
    "Anson Elementary School",
    "Anson Middle School",
    "Anson High School",
  ]);
});
