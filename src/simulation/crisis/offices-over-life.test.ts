import { describe, expect, it } from "vitest";

import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../../tests/fixtures/recorded-legislative-term";
import { officesHeldOverLife } from "./offices";

describe("officesHeldOverLife", () => {
  it("reads the person's recorded, started legislative term", () => {
    const fixture = recordedTermFixture("player");
    const world = enterSupportedTerm(fixture.world, fixture.personId);
    const terms = officesHeldOverLife(world, fixture.personId);
    expect(terms).toContainEqual(
      expect.objectContaining({
        officeKey: fixture.contest.office.officeKey,
        title: fixture.contest.office.title,
        startsAt: expect.any(String),
      }),
    );
    expect(terms.every((term) => term.startsAt <= world.currentDate)).toBe(
      true,
    );
  });

  it("returns no office for a person with no recorded term", () => {
    const fixture = recordedTermFixture("rival");
    expect(officesHeldOverLife(fixture.world, fixture.personId)).toEqual([]);
  });
});
