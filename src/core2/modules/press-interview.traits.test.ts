/**
 * Personality in the press engine (civic family): who accepts a reporter's
 * interview. A drawn place's played world (a place drawn from all 56 from a
 * fresh seed, played over the window around its own next election), every
 * resident a full person, played 120 days. A candidate accepts by the share
 * of the town the outlet reaches, whether they hold the seat, how they stand
 * with the reporter and their lean at the decision's weight; each interview
 * keeps the reasons it was weighed on.
 */
import { drawPlace } from "../../../tests/golden-path/place";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drawnRaceWorld, RUN_SEED, weightOf } from "../trait-test-kit";
import { acceptCase, PRESS_MODULE_ID, type InterviewRow } from "./press";
import type { CoreAPI, CoreState } from "../types";
import { setKeepEveryonesWhy } from "../why-kept";

const SEED = `${RUN_SEED}:press-interview`;

let core: CoreState;
let api: CoreAPI;

/** The interviews a candidate weighed, with the reasons they were weighed on. */
function weighed(api: CoreAPI): InterviewRow[] {
  return (
    api
      .moduleState(PRESS_MODULE_ID)
      .table("interviews")
      .rows() as unknown as InterviewRow[]
  ).filter((row) => row.acceptReasons);
}

let keptBefore = false;

afterAll(() => {
  setKeepEveryonesWhy(keptBefore);
});

beforeAll(() => {
  // The reasons are kept for the player's circle only; a candidate nobody deals
  // with is read here, so the test asks for everyone's.
  keptBefore = setKeepEveryonesWhy(true);
  ({ core, api } = drawnRaceWorld(
    (attempt) => {
      const seed = `${SEED}:${attempt}`;
      return { seed, place: drawPlace(seed, "trait-wiring") };
    },
    120,
    undefined,
    2,
    // A race nobody was asked about leaves no interview to read, and one where
    // every candidate gave the same answer has no turn to check.
    (world) => {
      const rows = weighed(world.api);
      if (!rows.length) return "no interview weighed";
      const declined = rows.filter((row) => row.status === "declined").length;
      return declined === 0 || declined === rows.length
        ? "every candidate answered the same"
        : null;
    },
  ));
  // Reason for the hook's time: each drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine, and a small town may hold no interview (Solen, North Dakota held none), so several places may be built before one fits.
}, 1_800_000);

describe("press.accept-interview reads the outlet's reach, the seat, the candidate's standing with the reporter and their temperament", () => {
  it("every candidate asked accepts exactly when their kept reasons and their lean at the decision's weight clear zero, and both answers occur", () => {
    const rows = weighed(api);
    const weight = weightOf(core, "press.accept-interview");
    let accepted = 0;
    for (const row of rows) {
      const reasons = row.acceptReasons!;
      expect(row.status !== "declined", row.id).toBe(
        acceptCase(reasons) + weight * reasons.lean > 0,
      );
      if (row.status !== "declined") accepted += 1;
    }
    console.log(`interviews: ${accepted} of ${rows.length} accepted`);
    expect(accepted).toBeGreaterThan(0);
    expect(accepted).toBeLessThan(rows.length);
  });
});
