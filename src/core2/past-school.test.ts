/**
 * The school years before the start, run by the school engine's own rule
 * (owner, Oct 28, 2026: "simulate to the birth year... general"): each year a
 * child was of school age inside the run, the district of the place their
 * records put them that year, a record each time the stage or the school
 * changed. The card lists each school once. A fixture world with one child
 * who was born elsewhere and moved into the district's town.
 */
import { describe, expect, it } from "vitest";
import { schoolsOf } from "../bench/words";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { SCHOOL_STARTED, schoolsAttended } from "./past-school";
import { preStartHistory, preStartWindow, runPreStart } from "./pre-start";
import type { CoreInput } from "./types";

function world(moveIn?: string): CoreInput {
  const input = piecesInput();
  const child = {
    ...input.people[0]!,
    id: "child",
    givenName: "Contract",
    birthDate: "2005-03-01",
    pastFacts: [
      {
        id: "child:birthplace",
        date: "2005-03-01",
        kind: "birthplace",
        summary: "birthplace",
        source: piecesSource,
        facts: { placeId: "elsewhere" },
      },
      ...(moveIn
        ? [
            {
              id: "child:moved",
              date: moveIn,
              kind: "life:moved-into-county",
              summary: "moved",
              source: piecesSource,
            },
          ]
        : []),
    ],
  };
  return {
    ...input,
    people: [...input.people, child],
    households: [{ ...input.households[0]!, memberIds: ["actor", "child"] }],
    organizations: [
      {
        id: "district",
        placeId: "place",
        name: "Contract Public Schools",
        kind: "public-school-district",
        classification: "service:school",
        liquidMinor: 0,
        source: piecesSource,
      },
    ],
  };
}

function run(input: CoreInput) {
  const core = createLifeCore(input);
  runPreStart(core, preStartWindow(core, "2000-01-01", "quarter"));
  return core;
}

describe("the school years before the start", () => {
  it("names the place's district from the year the child moved there, and no school before", () => {
    const core = run(world("2013-06-01"));
    const rows = preStartHistory(core, {
      kind: SCHOOL_STARTED,
      personId: "child" as never,
    });
    // Kindergarten in the fall of 2010 elsewhere; the district from fall 2013;
    // middle school in 2016 and high school in 2019 in the district.
    expect(
      rows.map((row) => [
        row.date.slice(0, 4),
        row.facts.stage,
        row.facts.schoolId,
      ]),
    ).toEqual([
      ["2010", "elementary", "schools-of:elsewhere"],
      ["2013", "elementary", "district"],
      ["2016", "middle", "district"],
      ["2019", "high", "district"],
    ]);
    expect(rows[0]!.facts.residenceRecordId).toBe("child:birthplace");
    expect(rows[1]!.facts.residenceRecordId).toBe("child:moved");
    const attended = schoolsAttended(core, "child");
    expect(attended[0]!.name).toBeUndefined();
    expect(attended[1]!.name).toBe("Contract Public Schools");
    // The card lists the district once, from the year the child started there.
    expect(schoolsOf(core, "child")).toEqual([
      {
        name: "Contract Public Schools",
        date: rows[1]!.date,
        recordId: rows[1]!.id,
      },
    ]);
  });

  it("keeps a child with no record of a move in the place they live now, all the way through", () => {
    const core = run(world());
    const rows = preStartHistory(core, {
      kind: SCHOOL_STARTED,
      personId: "child" as never,
    });
    expect(rows.map((row) => row.facts.schoolId)).toEqual([
      "district",
      "district",
      "district",
    ]);
    // The adult finished school before the run began: no record.
    expect(
      preStartHistory(core, {
        kind: SCHOOL_STARTED,
        personId: "actor" as never,
      }),
    ).toEqual([]);
  });
});
