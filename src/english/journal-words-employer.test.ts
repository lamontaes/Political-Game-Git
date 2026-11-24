import { describe, expect, it } from "vitest";
import {
  articleFor,
  employerSaid,
  jobSaid,
  seatSaid,
  withArticle,
} from "./journal-words";

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
    ).toBe("the Village of Athens");
    // A treasury is not an employer: the government is said (words-engine).
    expect(
      employerSaid("Maine treasury", { kind: "government-treasury" }),
    ).toBe("the government of Maine");
    expect(employerSaid("US", { kind: "government-outside" })).toBe(
      "the federal government",
    );
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

describe("the article and the body", () => {
  it("chooses a or an by the first sound (lead, Nov 11: 'an union representative')", () => {
    expect(withArticle("Union representative")).toBe("a union representative");
    expect(withArticle("Electrician")).toBe("an electrician");
    // A title with its own article, a plural and an acronym.
    expect(withArticle("The Treasurer")).toBe("the treasurer");
    expect(withArticle("Election workers")).toBe("election workers");
    expect(withArticle("RN")).toBe("an RN");
    // A county's treasury is the county, by its own name; a body named "of" a
    // county keeps its "the".
    expect(
      employerSaid("McDowell County treasury", { kind: "government-treasury" }),
    ).toBe("McDowell County");
    expect(
      employerSaid("City of Woonsocket treasury", {
        kind: "government-treasury",
      }),
    ).toBe("the City of Woonsocket");
    expect(withArticle("CPA")).toBe("a CPA");
    expect(withArticle("Boss")).toBe("a boss");
    expect(articleFor("hour")).toBe("an");
    expect(articleFor("honor")).toBe("an");
    expect(articleFor("university")).toBe("a");
    expect(articleFor("one-time")).toBe("a");
    expect(articleFor("cashier")).toBe("a");
  });
  it("says a body's seat with 'the', once (the one seat reader, #8750)", () => {
    const seat = (bodyName: string) => ({
      title: "Council member",
      seats: 5,
      bodyName,
    });
    expect(seatSaid(seat("Nelson City Council"))).toBe(
      "the Nelson City Council",
    );
    expect(seatSaid(seat("The Board of Trustees"))).toBe(
      "the Board of Trustees",
    );
    expect(seatSaid({ title: "County Clerk" })).toBe("county clerk");
  });
});
