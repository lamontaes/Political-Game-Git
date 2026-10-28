/**
 * The school years before the start, run by the school engine's own rule
 * (owner, Oct 28, 2026: "simulate to the birth year... general"): each year a
 * child was of school age inside the run, the district of the place their
 * records put them that year, a record each time the stage or the school
 * changed. Where they lived comes from the moves engine's run: a parent
 * whose recorded birthplace is elsewhere came to the county on the day the
 * run gives, and their child at home came with them. The card lists each
 * school once. A fixture world with one parent and one child.
 */
import { describe, expect, it } from "vitest";
import { schoolsOf } from "../bench/words";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import {
  PERSON_MOVED_IN,
  SCHOOL_STARTED,
  schoolsAttended,
} from "./past-module";
import { preStartHistory, preStartWindow, runPreStart } from "./pre-start";
import type { CoreInput } from "./types";

function world(parentBornIn: string): CoreInput {
  const input = piecesInput();
  const parent = {
    ...input.people[0]!,
    pastFacts: [
      {
        id: "actor:birthplace",
        date: input.people[0]!.birthDate,
        kind: "birthplace",
        summary: "birthplace",
        source: piecesSource,
        facts: { placeId: parentBornIn },
      },
      {
        id: "actor:family:child",
        date: "1999-03-01",
        kind: "family:child",
        summary: "child",
        source: piecesSource,
        facts: { otherPersonId: "child" },
      },
    ],
  };
  const child = {
    ...input.people[0]!,
    id: "child",
    givenName: "Contract",
    birthDate: "1999-03-01",
    pastFacts: [
      {
        id: "child:family:parent",
        date: "1999-03-01",
        kind: "family:parent",
        summary: "parent",
        source: piecesSource,
        facts: { otherPersonId: "actor" },
      },
    ],
  };
  return {
    ...input,
    people: [parent, child],
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
  runPreStart(core, preStartWindow(core, "1995-01-01", "quarter"));
  return core;
}

describe("the school years before the start", () => {
  it("names the place's district from the year the family came, and no school before", () => {
    const core = run(world("elsewhere"));
    const [moved] = preStartHistory(core, {
      kind: PERSON_MOVED_IN,
      personId: "actor" as never,
    });
    expect(moved, "the parent's move into the county").toBeDefined();
    expect(moved!.facts.fromPlaceId).toBe("elsewhere");
    expect(moved!.facts.originRecordId).toBe("actor:birthplace");
    // The child at home came with them.
    expect(moved!.personIds).toContain("child");
    const rows = preStartHistory(core, {
      kind: SCHOOL_STARTED,
      personId: "child" as never,
    });
    // Each school year at the school of the place the run puts them in.
    for (const row of rows)
      expect(row.facts.schoolId, row.id).toBe(
        row.date < moved!.date ? "schools-of:elsewhere" : "district",
      );
    const before = rows.filter((row) => row.date < moved!.date);
    const after = rows.filter((row) => row.date >= moved!.date);
    expect(before.length, `moved ${moved!.date}`).toBeGreaterThan(0);
    expect(after.length, `moved ${moved!.date}`).toBeGreaterThan(0);
    expect(after[0]!.facts.residenceRecordId).toBe(moved!.id);
    const attended = schoolsAttended(core, "child");
    expect(attended[0]!.name).toBeUndefined();
    expect(attended.find((row) => row.recordId === after[0]!.id)?.name).toBe(
      "Contract Public Schools",
    );
    // The card lists the district once, from the year the child started there.
    expect(schoolsOf(core, "child")).toEqual([
      {
        name: "Contract Public Schools",
        date: after[0]!.date,
        recordId: after[0]!.id,
      },
    ]);
  });

  it("keeps a family with no record of living elsewhere in the place they live now, all the way through", () => {
    const core = run(world("place"));
    expect(
      JSON.stringify(preStartHistory(core, { kind: PERSON_MOVED_IN })),
    ).toBe("[]");
    const rows = preStartHistory(core, {
      kind: SCHOOL_STARTED,
      personId: "child" as never,
    });
    expect(rows.map((row) => row.facts.schoolId)).toEqual([
      "district",
      "district",
      "district",
    ]);
    // The parent was in high school when the run began: the run records
    // that school from its first year, and nothing earlier.
    const parent = preStartHistory(core, {
      kind: SCHOOL_STARTED,
      personId: "actor" as never,
    });
    expect(
      parent.map((row) => [row.facts.stage, row.date.slice(0, 4)]),
    ).toEqual([["high", "1995"]]);
  });
});
