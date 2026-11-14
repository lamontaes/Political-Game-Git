import { describe, expect, it } from "vitest";
import { seatSaid } from "./journal-words";

// How a seat is said in a sentence (Fable B, Nov 11, on #8750): a seat on a
// body by the body, a single office by its title in lower case, a district's
// seat with its district; never a form's title with its parenthesis.
describe("seatSaid", () => {
  it("says a seat on a body by the body, in full and then short", () => {
    const seat = {
      title: "Council member",
      seats: 5,
      bodyName: "Mutual Village Council",
    };
    expect(seatSaid(seat)).toBe("the Mutual Village Council");
    expect(seatSaid(seat, { first: false })).toBe("the council");
    expect(seatSaid({ title: "Township board member", seats: 5 })).toBe(
      "the township board",
    );
  });

  it("says a single office by its title in lower case, without a form's note", () => {
    expect(seatSaid({ title: "Mayor" })).toBe("mayor");
    expect(
      seatSaid({
        title:
          "Superintendent of Public Instruction (nonpartisan, spring election)",
      }),
    ).toBe("superintendent of public instruction");
  });

  it("says a district's seat with its district, then the seat", () => {
    const seat = { title: "U.S. Representative", district: "02" };
    expect(seatSaid(seat)).toBe("U.S. representative in District 2");
    expect(seatSaid(seat, { first: false })).toBe("the seat");
    expect(seatSaid({ title: "Mayor", district: "at-large" })).toBe("mayor");
    // A House seat sits in a body of many seats, and is still said by its district.
    expect(
      seatSaid({
        title: "U.S. Representative",
        seats: 435,
        bodyName: "United States House of Representatives",
        district: "2",
      }),
    ).toBe("U.S. representative in District 2");
  });

  it("says a body above the town whole every time, never by its last word", () => {
    // Words lead, Nov 14: "Your name's in for the senate in Edgar."
    const senate = {
      title: "U.S. Senator",
      seats: 2,
      bodyName: "United States Senate",
      level: "federal",
    };
    expect(seatSaid(senate)).toBe("the U.S. Senate");
    expect(seatSaid(senate, { first: false })).toBe("the U.S. Senate");
    const state = {
      title: "State Senator",
      seats: 33,
      bodyName: "Senate",
      level: "state",
    };
    expect(seatSaid(state, { first: false })).toBe("the state Senate");
    expect(seatSaid({ ...state, bodyName: "House of Representatives" })).toBe(
      "the state House",
    );
    expect(seatSaid({ ...state, bodyName: "State Assembly", seats: 99 })).toBe(
      "the Assembly",
    );
    expect(seatSaid({ ...state, bodyName: "House of Delegates" })).toBe(
      "the House of Delegates",
    );
    expect(
      seatSaid(
        {
          title: "Commissioner",
          seats: 5,
          bodyName: "Dane County Board of Supervisors",
          level: "county",
        },
        { first: false },
      ),
    ).toBe("the Dane County Board of Supervisors");
    // A town's own body keeps its short form.
    expect(
      seatSaid(
        {
          title: "Council member",
          seats: 5,
          bodyName: "Edgar Village Board",
          level: "city",
        },
        { first: false },
      ),
    ).toBe("the board");
  });

  it("says a district's seat above the town by its chamber and its ordinal every time", () => {
    const seat = {
      title: "State Senator",
      seats: 33,
      bodyName: "Senate",
      district: "17",
      level: "state",
    };
    expect(seatSaid(seat)).toBe("the state Senate in the 17th District");
    expect(seatSaid(seat, { first: false })).toBe(
      "the state Senate in the 17th District",
    );
    expect(
      seatSaid({
        title: "U.S. Representative",
        seats: 8,
        bodyName: "United States House of Representatives",
        district: "03",
        level: "federal",
      }),
    ).toBe("Congress in the 3rd District");
    expect(
      seatSaid({
        title: "U.S. Representative",
        seats: 1,
        bodyName: "United States House of Representatives",
        level: "federal",
      }),
    ).toBe("U.S. representative");
    // A county's seat says its office and district.
    expect(
      seatSaid(
        { title: "Commissioner", district: "1", level: "county" },
        { first: false },
      ),
    ).toBe("commissioner in District 1");
  });
  it("says a seat on a body named for its members as one member, no article", () => {
    for (const [bodyName, said] of [
      ["Board of Aldermen", "alderman"],
      ["Board of Trustees", "trustee"],
      ["Board of Selectmen", "selectman"],
      ["Board of Councillors", "councilor"],
    ] as const) {
      const seat = { title: "Board member", seats: 5, bodyName };
      expect(seatSaid(seat, { asMember: true })).toBe(said);
      expect(seatSaid(seat, { first: false, asMember: true })).toBe(said);
      // Said as a body anywhere else (a subject of a sentence), #8750.
      expect(seatSaid(seat)).toBe(`the ${bodyName}`);
    }
    // A body named as a body keeps its name.
    expect(
      seatSaid(
        { title: "Council member", seats: 5, bodyName: "Town Council" },
        { first: false },
      ),
    ).toBe("the council");
  });
});
