import { describe, expect, it } from "vitest";
import { howYouKnowLine, observedTraitsSentence } from "./person-card-english";

describe("the small person card's words", () => {
  it("names up to three observed traits as what you have seen", () => {
    expect(observedTraitsSentence([])).toBeNull();
    expect(observedTraitsSentence(["Reserved"])).toBe(
      "Reserved, from what you've seen.",
    );
    expect(observedTraitsSentence(["Reserved", "Cautious"])).toBe(
      "Reserved and cautious, from what you've seen.",
    );
    expect(
      observedTraitsSentence([
        "Confrontational",
        "Cautious",
        "Follows through",
        "Meticulous",
      ]),
    ).toBe(
      "Confrontational, cautious and follows through, from what you've seen.",
    );
  });

  it("says how you know somebody from the relationship, then the web", () => {
    expect(howYouKnowLine({ relationship: "your mom" })).toBe("your mom");
    expect(
      howYouKnowLine({ relationship: null }, [
        { kind: "acquaintance", label: "On the record together" },
        { kind: "work", label: "Work at Lincoln Public Library" },
      ]),
    ).toBe("From work at Lincoln Public Library");
    expect(
      howYouKnowLine({ relationship: null }, [
        { kind: "politics", label: "In Lancaster County Democrats" },
      ]),
    ).toBe("From Lancaster County Democrats");
    expect(
      howYouKnowLine({ relationship: null }, [
        { kind: "acquaintance", label: "On the record together" },
      ]),
    ).toBe("Somebody you have spoken with");
    expect(howYouKnowLine({ relationship: null }, [])).toBeNull();
  });
});
