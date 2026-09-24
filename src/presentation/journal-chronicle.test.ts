import { describe, expect, it } from "vitest";

import {
  CHRONICLE_PARAGRAPH_SENTENCES,
  chronicleLines,
  projectJournalView,
  withChronicleLead,
} from "./journal-views";
import { createNewGameWorld } from "./new-game";
import type { World39BiographyEntry } from "./world39-journal";
import type { EntityId, IsoDate } from "../simulation";

function entry(
  id: string,
  at: string,
  text: string,
  kind: World39BiographyEntry["kind"] = "event",
): World39BiographyEntry {
  return {
    id,
    at: at as IsoDate,
    sequence: 0,
    kind,
    text,
    sourceId: `source:${id}` as EntityId,
  };
}

describe("the Journal read as a chronicle", () => {
  it("names the month only when it changes, and the year only when that changes too", () => {
    const lines = chronicleLines([
      entry("a", "2027-03-02", "You started at the plant."),
      entry("b", "2027-03-20", "Ravi Alvarez asked you for money."),
      entry("c", "2027-07-01", "You joined the county party."),
      entry("d", "2028-01-09", "You filed to run for the council."),
    ]);
    expect(lines.map((line) => line.lead)).toEqual([
      "In March",
      null,
      "In July",
      "In January 2028",
    ]);
  });

  it("adds no month to a sentence that already says when, or to an account", () => {
    const lines = chronicleLines([
      entry("a", "2027-03-02", "You were born on March 2, 2027."),
      entry(
        "b",
        "2027-05-02",
        "Somebody said the mill would close.",
        "account",
      ),
    ]);
    expect(lines.map((line) => line.lead)).toEqual([null, null]);
    // A month with its year later in the sentence dates it as well.
    expect(
      chronicleLines([
        entry(
          "c",
          "1998-05-03",
          "You finished at North Albuquerque Middle School in May 1998.",
        ),
      ]).map((line) => line.lead),
    ).toEqual([null]);
  });

  it("keeps every entry, once, in order", () => {
    const entries = [
      entry("a", "2027-01-02", "One."),
      entry("b", "2027-02-02", "Two."),
      entry("c", "2027-02-03", "Three."),
    ];
    expect(chronicleLines(entries).map((line) => line.entry)).toEqual(entries);
  });

  it("starts a new paragraph at a month change once a paragraph has run", () => {
    const entries = [
      ...Array.from({ length: CHRONICLE_PARAGRAPH_SENTENCES }, (_, index) =>
        entry(`m${index}`, `2027-03-0${index + 1}`, `Line ${index}.`),
      ),
      entry("n", "2027-03-20", "Same month."),
      entry("o", "2027-04-01", "New month."),
      entry("p", "2027-05-01", "Short paragraph, new month."),
    ];
    expect(
      chronicleLines(entries)
        .filter((line) => line.startsParagraph)
        .map((line) => line.entry.id),
    ).toEqual(["m0", "o"]);
  });

  it("lowers only a common opening word, never a name", () => {
    expect(withChronicleLead("In March", "You started at the plant.")).toBe(
      "In March, you started at the plant.",
    );
    expect(
      withChronicleLead("In March", "Ravi Alvarez asked you for money."),
    ).toBe("In March, Ravi Alvarez asked you for money.");
    expect(withChronicleLead(null, "You stayed.")).toBe("You stayed.");
    expect(
      withChronicleLead("In May", "At lunch you made room at the table."),
    ).toBe("In May, at lunch you made room at the table.");
  });

  it("holds the same entries as each section, in a real life outside Kentucky", () => {
    const game = createNewGameWorld({
      placeKey: "nebraska",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "journal-chronicle",
      givenName: null,
      familyName: null,
    });
    for (const view of ["years", "chapters"] as const) {
      const shown = projectJournalView(
        game.world,
        game.playerPersonId,
        view,
        null,
      );
      expect(shown.sections.length).toBeGreaterThan(0);
      for (const section of shown.sections)
        expect(section.chronicle.map((line) => line.entry)).toEqual(
          section.entries,
        );
    }
  });
});
