import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import type { EntityId, World } from "../types";
import { outOfWorkSince } from "./town-labor-market";

const NEWCOMER = "person_newcomer" as EntityId;
const LAID_OFF = "person_laid_off" as EntityId;
const GROWN_UP_HERE = "person_grown_up_here" as EntityId;

/*
 * Employers call back the seekers out of work the shortest time first. A
 * newcomer with no job on the town's record has been out of work since
 * moving in, not forever, so they are not stuck behind every local who is
 * laid off after them.
 */
function world(): World {
  return {
    currentDate: makeIsoDate("2027-06-01"),
    people: {
      [NEWCOMER]: { id: NEWCOMER, birthDate: makeIsoDate("1990-01-01") },
      [LAID_OFF]: { id: LAID_OFF, birthDate: makeIsoDate("1990-01-01") },
      [GROWN_UP_HERE]: {
        id: GROWN_UP_HERE,
        birthDate: makeIsoDate("2008-03-10"),
      },
    },
    history: {
      workRelationships: [{ id: "work_1", personId: LAID_OFF }],
      workStatuses: [
        {
          workRelationshipId: "work_1",
          status: "active",
          effectiveAt: makeIsoDate("2020-01-01"),
        },
        {
          workRelationshipId: "work_1",
          status: "ended",
          effectiveAt: makeIsoDate("2026-06-01"),
        },
      ],
      householdMemberships: [
        { personId: NEWCOMER, startedAt: makeIsoDate("2000-01-01") },
        { personId: NEWCOMER, startedAt: makeIsoDate("2027-04-05") },
        // A move not made yet counts for nothing.
        { personId: NEWCOMER, startedAt: makeIsoDate("2028-01-01") },
        { personId: LAID_OFF, startedAt: makeIsoDate("2027-05-01") },
        { personId: GROWN_UP_HERE, startedAt: makeIsoDate("2008-03-10") },
      ],
    },
  } as unknown as World;
}

describe("how long a town's job seekers have been out of work", () => {
  it("dates a newcomer from moving in, a laid-off worker from the layoff, and a local with no job from turning 18", () => {
    const since = outOfWorkSince(world(), [NEWCOMER, LAID_OFF, GROWN_UP_HERE]);
    expect(since.get(NEWCOMER)).toBe("2027-04-05");
    // A job on the record wins over a later move.
    expect(since.get(LAID_OFF)).toBe("2026-06-01");
    expect(since.get(GROWN_UP_HERE)).toBe("2026-03-10");
  });

  it("puts a newcomer who arrived after a layoff ahead of the laid-off worker", () => {
    const since = outOfWorkSince(world(), [NEWCOMER, LAID_OFF, GROWN_UP_HERE]);
    const order = [LAID_OFF, GROWN_UP_HERE, NEWCOMER].sort((a, b) =>
      (since.get(b) ?? "").localeCompare(since.get(a) ?? ""),
    );
    expect(order).toEqual([NEWCOMER, LAID_OFF, GROWN_UP_HERE]);
  });
});
