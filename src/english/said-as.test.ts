import { describe, expect, it } from "vitest";
import {
  employerSaidAs,
  jobSaidAs,
  saidAs,
  sentenceStarts,
  type SaidPerson,
} from "./said-as";
import { clockOf, heardBefore, noteSaid, tellingOf } from "./telling";

const vice: SaidPerson = {
  id: "p:vice",
  givenName: "Kathryn",
  familyName: "Hansen",
  gender: "female",
  officeKind: "vice-president",
};
const president: SaidPerson = {
  id: "p:pres",
  givenName: "Robert",
  familyName: "Lowe",
  pronouns: "he-him",
  officeKind: "president",
};
const sister: SaidPerson = {
  id: "p:maya",
  givenName: "Maya",
  familyName: "Ortiz",
  gender: "female",
  toListener: "sibling",
};

describe("said-as", () => {
  it("says a chamber's presiding officer by that role, and a pronoun in the case its slot asks for", () => {
    const telling = tellingOf({ speakerId: "p:a", listenerId: "p:b" });
    const speaker: SaidPerson = {
      id: "p:speaker",
      givenName: "Beverly",
      familyName: "McClain",
      gender: "female",
      officeKind: "us-house:presiding",
    };
    expect(saidAs(telling, speaker)).toBe("Speaker Beverly McClain");
    expect(saidAs(telling, speaker, { case: "object" })).toBe("her");
    expect(saidAs(telling, speaker, { case: "possessive" })).toBe("her");
    expect(saidAs(telling, vice)).toBe("Vice President Kathryn Hansen");
    expect(saidAs(telling, speaker)).toBe("the Speaker");
  });

  it("says an official by role and name once, then the pronoun or the role", () => {
    const telling = tellingOf({ speakerId: "p:a", listenerId: "p:b" });
    expect(saidAs(telling, president)).toBe("President Robert Lowe");
    expect(saidAs(telling, president, { start: true })).toBe("He");
    expect(saidAs(telling, vice)).toBe("Vice President Kathryn Hansen");
    expect(saidAs(telling, president)).toBe("the President");
    expect(saidAs(telling, president, { case: "object" })).toBe("him");
    // Never a full name twice in one text.
    const fulls = [...telling.text.fullNamed];
    expect(fulls.sort()).toEqual(["p:pres", "p:vice"]);
  });

  it("says a relative of the listener by relation and first name, then the first name", () => {
    const telling = tellingOf({ speakerId: "p:a", listenerId: "p:b" });
    expect(saidAs(telling, sister)).toBe("your sister Maya");
    saidAs(telling, president);
    expect(saidAs(telling, sister)).toBe("Maya");
    expect(saidAs(telling, sister, { case: "possessive" })).toBe("her");
  });

  it("says someone present by first name and the listener by what the speaker calls them", () => {
    const telling = tellingOf({
      speakerId: "p:a",
      listenerId: "p:b",
      presentIds: ["p:maya"],
    });
    expect(saidAs(telling, sister)).toBe("Maya");
    expect(
      saidAs(telling, {
        id: "p:b",
        givenName: "Sam",
        familyName: "Ortiz",
        calledBySpeaker: "Mom",
      }),
    ).toBe("Mom");
  });

  it("never prints a bare full name for someone the listener was not told about", () => {
    const telling = tellingOf({ speakerId: "p:a", listenerId: "p:b" });
    const stranger = { id: "p:x", givenName: "Lee", familyName: "Park" };
    expect(saidAs(telling, stranger)).toBe("Lee");
    const known = { ...stranger, id: "p:y", knownToListener: true };
    expect(saidAs(telling, known)).toBe("Lee Park");
    saidAs(telling, stranger);
    expect(saidAs(telling, known)).toBe("Lee");
  });

  it("never says the outside market as an employer or its title as a job", () => {
    expect(
      employerSaidAs({
        name: "Outside market",
        kind: "business",
        outside: true,
      }),
    ).toBeNull();
    expect(
      employerSaidAs({ name: "Arizona treasury", kind: "government-treasury" }),
    ).toBe("the government of Arizona");
    expect(jobSaidAs("Works outside the town", undefined)).toEqual({
      kind: "outside",
      does: "works outside the town",
      job: "a job out of town",
    });
    expect(jobSaidAs("Stocker", { outside: true })?.kind).toBe("outside");
    expect(jobSaidAs("Electrician", {})).toEqual({
      kind: "title",
      title: "Electrician",
      asJob: "an electrician",
    });
    expect(jobSaidAs("Clerk (part time)", {})).toBeNull();
  });
});

describe("the telling", () => {
  it("reads the clock: what is left of the day looks ahead to tomorrow at night", () => {
    expect(clockOf(7 * 60)).toEqual({ dayPart: "morning", dayLeft: "later" });
    expect(clockOf(13 * 60)).toEqual({
      dayPart: "afternoon",
      dayLeft: "later",
    });
    expect(clockOf(20 * 60 + 30)).toEqual({
      dayPart: "evening",
      dayLeft: "tomorrow",
    });
    expect(clockOf(undefined)).toEqual({});
  });

  it("keeps the room without the speaker or listener, and what was heard before", () => {
    const telling = tellingOf({
      speakerId: "a",
      listenerId: "b",
      presentIds: ["a", "b", "c", "c"],
      before: { today: (key) => key === "t", thisWeek: (key) => key === "w" },
    });
    expect(telling.presentIds).toEqual(["c"]);
    expect(heardBefore(telling, "t")).toBe(true);
    expect(heardBefore(telling, "w")).toBe(true);
    expect(heardBefore(telling, "x")).toBe(false);
    noteSaid(telling, "x");
    expect(heardBefore(telling, "x")).toBe(true);
  });
});

describe("sentence starts", () => {
  it("capitalizes a sentence a filled slot opens", () => {
    expect(sentenceStarts("the President said it. he meant it.")).toBe(
      "The President said it. He meant it.",
    );
  });
});
