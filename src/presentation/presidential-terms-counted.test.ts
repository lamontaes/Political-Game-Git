import { describe, expect, it } from "vitest";
import { adultLifeIn } from "../../tests/fixtures/state-executive-entry";
import { presidentialTermsCounted, recordWorldEvent } from "../simulation";
import { currentFederalTenure } from "../simulation/federal-tenures";
import { makeIsoDate } from "../simulation/dates";
import type { World } from "../simulation/types";

/** A successor's tenure, recorded as the Twenty-Fifth Amendment receiver records one. */
function succeeds(world: World, occurredAt: string, termEnd: string): World {
  const personId = currentFederalTenure(world, "us-vice-president")!.personId;
  return recordWorldEvent(world, {
    stableKey: `fixture:succession:${occurredAt}`,
    type: "world.office-tenure",
    occurredAt: makeIsoDate(occurredAt),
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "focus:subject",
        detail: "President of the United States",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture", "office:us-president", `term-end:${termEnd}`],
    summary: "A fixture succession.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("Twenty-Second Amendment: which presidential tenures count as a term", () => {
  it("counts the opening President's own term, and a successor's remainder only past two years", () => {
    const { world } = adultLifeIn("MT", "terms-counted");
    const president = currentFederalTenure(world, "us-president")!.personId;
    const vice = currentFederalTenure(world, "us-vice-president")!.personId;
    expect(presidentialTermsCounted(world, president)).toBe(1);
    expect(presidentialTermsCounted(world, vice)).toBe(0);
    // Under two years of someone else's term left: not a term.
    const late = succeeds(world, world.currentDate, "2027-06-01");
    expect(presidentialTermsCounted(late, vice)).toBe(0);
    // More than two years left: one term.
    expect(world.currentDate < "2027-01-20").toBe(true);
    const early = succeeds(world, world.currentDate, "2029-01-20");
    expect(presidentialTermsCounted(early, vice)).toBe(1);
  });
});
