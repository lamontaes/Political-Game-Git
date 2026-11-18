import { describe, expect, it } from "vitest";
import { saidOffice, describesByRule, spokenOffice } from "./filing-visit";
import { readFileSync } from "node:fs";

// Every filing office in the research is said the way people say it: the
// note's gloss on whose county or town it is stays unsaid (P1, Richburg,
// South Carolina, seed a8ad5c79-cb5b-4616-b711-61b16eca1a9d, Nov 13: "You've
// found the County board of voter registration and elections of the
// candidate's home county for Richburg").
it("names every filing office without the research note's glosses", () => {
  const notes = new Set(
    [
      ...readFileSync(
        "data/research/elections/filing-requirements.json",
        "utf8",
      ).matchAll(/"filedWith": "([^"]+)"/g),
    ].map((match) => match[1]!),
  );
  expect(notes.size).toBeGreaterThan(20);
  for (const note of notes) {
    const said = spokenOffice(note);
    expect(said, note).not.toMatch(/candidate|[;()]/i);
    expect(said.split(" ").length, note).toBeGreaterThan(1);
  }
});

// An office the research names as a choice is said as the place's own kind,
// read from the races' names (Fable A, Nov 13, West Wareham, Massachusetts:
// "I'll be back at the city or town clerk soon").
it("says a choice of office as the kind of place the races are for", () => {
  const town = [{ title: "Town of Wareham Select Board" }];
  expect(saidOffice("City or town clerk", town)).toBe("Town clerk");
  expect(
    saidOffice("Town or city clerk", [{ title: "City of Hope Council" }]),
  ).toBe("City clerk");
  expect(saidOffice("City or town clerk", [{ title: "Board" }])).toBeNull();
  expect(saidOffice("Town clerk (party)", [])).toBe("Town clerk");
});

// An office the research gives as a rule is resolved to its body before it is
// said (`ruleOfficeBody`); only where the game cannot tell does the rule's own
// wording stand (Words lead, second reader, Nov 15, South Vienna, Ohio).
it("marks the offices given as a rule and no others", () => {
  for (const note of [
    "Board of elections of the most populous county in the district",
    "General registrar of the city or county where the town lies",
  ])
    expect(describesByRule(spokenOffice(note))).toBe(true);
  for (const note of [
    "County board of elections (counter: director)",
    "Secretary of State (multi-county districts) or the county clerk",
    "County elections official of the candidate's home county",
    "Town clerk",
  ])
    expect(describesByRule(spokenOffice(note))).toBe(false);
});
