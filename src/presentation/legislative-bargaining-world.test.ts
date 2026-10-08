import { describe, expect, it, vi } from "vitest";

vi.mock("./player-capabilities", () => ({
  resolvePlayerCapabilities: () => ({ personId: "person-1" }),
  withheldReason: () => null,
}));
vi.mock("./legislative-member-seat", () => ({
  resolveActiveMemberSeat: () => ({
    kind: "not-seated",
    reason: "This character does not hold a legislative seat.",
  }),
}));

import { openLegislativeBargaining } from "./legislative-bargaining-world";

describe("legislative bargaining entry", () => {
  it("keeps the members' room unavailable to a character without a seat", () => {
    const entry = openLegislativeBargaining({} as never, {
      playerPersonId: "person-1" as never,
    });
    expect(entry).toEqual({
      kind: "unavailable",
      reason: "This character does not hold a legislative seat.",
    });
  });
});
