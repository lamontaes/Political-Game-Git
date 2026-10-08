import { describe, expect, it } from "vitest";

import { addDays } from "../simulation";
import { recordedTermFixture } from "../../tests/fixtures/recorded-legislative-term";
import { projectLifeRecord } from "./life-record";
import { composeChapters } from "./journal-chapters";

describe("B19 chapter fallback", () => {
  it("returns Session 7's packet shape using the saved life-record entries", () => {
    const fixture = recordedTermFixture("player");
    const source = projectLifeRecord(fixture.world, fixture.personId);
    const chapters = composeChapters(
      fixture.world,
      fixture.personId,
      fixture.world.currentDate,
    );

    expect(chapters.map((chapter) => chapter.key)).toEqual(
      source.chapters.map((chapter) => chapter.key),
    );
    expect(
      chapters.flatMap((chapter) => chapter.entries).map((entry) => entry.id),
    ).toEqual(
      source.chapters.flatMap((chapter) =>
        chapter.entries.map((entry) => entry.key),
      ),
    );
    expect(
      chapters.flatMap((chapter) => chapter.entries).map((entry) => entry.text),
    ).toEqual(
      source.chapters.flatMap((chapter) =>
        chapter.entries.map((entry) => entry.sentence),
      ),
    );
    for (const chapter of chapters) {
      expect(chapter.year).toMatch(/^\d{4}(?:–\d{4})?$/);
      expect(chapter.heading).toMatch(/\d{4}/);
      for (const entry of chapter.entries) {
        expect(entry).toMatchObject({
          id: expect.any(String),
          at: expect.any(String),
          sequence: expect.any(Number),
          kind: expect.stringMatching(/^(life|event|memory|account|view)$/),
          text: expect.any(String),
          sourceId: expect.any(String),
        });
      }
    }
  });

  it("includes entries on the cutoff date and excludes later entries", () => {
    const fixture = recordedTermFixture("player");
    const source = projectLifeRecord(fixture.world, fixture.personId);
    const entry = source.chapters.flatMap((chapter) => chapter.entries)[0];
    expect(entry).toBeDefined();
    const before = addDays(entry!.at, -1);
    const atEntry = composeChapters(fixture.world, fixture.personId, entry!.at);
    const oneDayBefore = composeChapters(
      fixture.world,
      fixture.personId,
      before,
    );

    expect(
      atEntry.flatMap((chapter) => chapter.entries).map((row) => row.id),
    ).toContain(entry!.key);
    expect(
      oneDayBefore.flatMap((chapter) => chapter.entries).map((row) => row.id),
    ).not.toContain(entry!.key);
    expect(
      composeChapters(
        fixture.world,
        fixture.personId,
        addDays(fixture.world.currentDate, 1),
      ),
    ).toEqual(
      composeChapters(
        fixture.world,
        fixture.personId,
        fixture.world.currentDate,
      ),
    );
  });
});
