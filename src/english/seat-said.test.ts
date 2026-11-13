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
});
