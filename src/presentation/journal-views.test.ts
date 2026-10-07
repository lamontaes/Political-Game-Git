import { describe, expect, it } from "vitest";

import { projectJournalView } from "./journal-views";
import { createNewGameWorld } from "./new-game";
import { projectWorld39Journal } from "./world39-journal";
import { personName } from "../simulation";

function newLife(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

const ids = (sections: ReturnType<typeof projectJournalView>["sections"]) =>
  sections.flatMap((section) => section.entries.map((entry) => entry.id));

describe("Journal Chapters and Years", () => {
  it("includes the recorded family in a generated life story", () => {
    const { world, personId } = newLife("bg-26-family-in-life-story");
    const family = world.history.kinshipRelationships.filter((relationship) =>
      relationship.personIds.includes(personId),
    );
    expect(family.length).toBeGreaterThan(0);

    const story = projectWorld39Journal(world, personId).entries;
    for (const relationship of family) {
      const relativeId = relationship.personIds.find((id) => id !== personId)!;
      expect(story).toContainEqual(
        expect.objectContaining({
          id: `kinship:${relationship.id}`,
          text: expect.stringContaining(personName(world.people[relativeId]!)),
        }),
      );
    }
  });

  it("explains a recorded school transfer instead of presenting an unexplained move", () => {
    const { world, personId } = newLife("bg-26-school-transfer-reason");
    const state = world.history.educationEnrollmentStates.find(
      (record) => record.status === "completed",
    )!;
    const reason = "The family moved closer to a new school.";
    const transferred = {
      ...world,
      history: {
        ...world.history,
        educationEnrollmentStates: world.history.educationEnrollmentStates.map(
          (record) =>
            record.id === state.id
              ? { ...record, status: "transferred" as const, reason }
              : record,
        ),
      },
    };

    expect(
      projectWorld39Journal(transferred, personId).entries.find(
        (entry) => entry.id === `education:${state.id}`,
      )?.text,
    ).toContain("because the family moved closer to a new school");
  });

  it("shows the same entries once in either view, in the same order", () => {
    const { world, personId } = newLife("ui-follow-journal");
    const all = projectWorld39Journal(world, personId)
      .chapters.flatMap((chapter) => chapter.entries)
      .map((entry) => entry.id);
    const chapters = projectJournalView(world, personId, "chapters", null);
    const years = projectJournalView(world, personId, "years", null);
    expect(ids(chapters.sections)).toEqual(all);
    expect(ids(years.sections)).toEqual(all);
    expect(new Set(ids(chapters.sections)).size).toBe(all.length);
    expect(chapters.entryCount).toBe(all.length);
  });

  it("filters both views to one year and ignores an unknown year", () => {
    const { world, personId } = newLife("ui-follow-journal-filter");
    const base = projectJournalView(world, personId, "chapters", null);
    expect(base.years.length).toBeGreaterThan(0);
    const year = base.years[base.years.length - 1]!;
    for (const view of ["chapters", "years"] as const) {
      const filtered = projectJournalView(world, personId, view, year);
      expect(filtered.year).toBe(year);
      expect(filtered.entryCount).toBeGreaterThan(0);
      for (const section of filtered.sections) {
        for (const entry of section.entries) {
          expect(entry.at.slice(0, 4)).toBe(year);
        }
      }
    }
    const unknown = projectJournalView(world, personId, "years", "1066");
    expect(unknown.year).toBeNull();
    expect(unknown.entryCount).toBe(base.entryCount);
  });

  it("labels every chapter with the years it covers and never changes the World", () => {
    const { world, personId } = newLife("ui-follow-journal-span");
    const before = JSON.stringify(world);
    const view = projectJournalView(world, personId, "chapters", null);
    expect(JSON.stringify(world)).toBe(before);
    for (const section of view.sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.span).toMatch(/^\d{4}(–\d{4})?$/);
    }
  });
});
