import { describe, expect, it } from "vitest";

import { addDays } from "../simulation";
import { recordedTermFixture } from "../../tests/fixtures/recorded-legislative-term";
import { projectLifeRecord } from "./life-record";
import { composeChapters } from "./journal-chapters";

describe("B19 chapter fallback", () => {
  it("reuses the existing life-record chapters at the requested cutoff", () => {
    const fixture = recordedTermFixture("player");
    const through = addDays(fixture.world.currentDate, -1);
    const expected = projectLifeRecord(
      { ...fixture.world, currentDate: through },
      fixture.personId,
    ).chapters;

    expect(composeChapters(fixture.world, fixture.personId, through)).toEqual(
      expected,
    );
    expect(
      composeChapters(
        fixture.world,
        fixture.personId,
        fixture.world.currentDate,
      ),
    ).toEqual(projectLifeRecord(fixture.world, fixture.personId).chapters);
  });
});
