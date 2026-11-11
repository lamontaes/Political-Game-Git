import { describe, expect, it } from "vitest";
import { employerSaid, jobSaid, withArticle } from "./journal-words";

// How a job and an employer are said inside a sentence, from the kind of the
// employer's record (words-first-journal-note-says-the-same-sentence-twice).
describe("the job and employer reader", () => {
  it("says a job title in lower case, keeping an initialism", () => {
    expect(jobSaid("Chief Administrative Officer")).toBe(
      "chief administrative officer",
    );
    expect(withArticle("Chief Administrative Officer")).toBe(
      "a chief administrative officer",
    );
    expect(withArticle("Electrician")).toBe("an electrician");
    expect(jobSaid("IT Specialist")).toBe("IT specialist");
  });
  it("gives a government or its office 'the', and a business its name", () => {
    expect(
      employerSaid("Village of Athens treasury", {
        kind: "government-treasury",
      }),
    ).toBe("the Village of Athens treasury");
    expect(
      employerSaid("Island Falls Police Department", {
        kind: "employer",
        governmentFacts: { governmentKind: "local-government" },
      }),
    ).toBe("the Island Falls Police Department");
    expect(
      employerSaid("Island Falls Public Schools", {
        kind: "employer",
        classification: "service:school",
        governmentFacts: { governmentKind: "local-government" },
      }),
    ).toBe("Island Falls Public Schools");
    expect(
      employerSaid("Neal's Market", {
        kind: "employer",
        classification: "enterprise:retail",
      }),
    ).toBe("Neal's Market");
    // A contractor lists its public customers; it is still a business.
    expect(
      employerSaid("Riddle Building Services", {
        kind: "employer",
        classification: "enterprise:building-services",
        governmentFacts: { "openingCustomers.qualification:1": "[]" },
      }),
    ).toBe("Riddle Building Services");
  });
});
