import { describe, expect, it, vi } from "vitest";

vi.mock("./player-capabilities", () => ({
  resolvePlayerCapabilities: () => ({ personId: "person-1" }),
  withheldReason: () => null,
}));
vi.mock("./legislative-member-seat", () => ({
  resolveActiveMemberSeat: () => ({
    kind: "seated",
    seat: {
      governingJurisdictionId:
        requireLifePlace("kentucky").context.jurisdiction.id,
    },
  }),
}));

import { requireLifePlace } from "../simulation";
import { openLegislativeBargaining } from "./legislative-bargaining-world";

describe("legislative bargaining entry", () => {
  it("requires a filed docket bill instead of opening an authored Kentucky sitting", () => {
    const entry = openLegislativeBargaining({} as never, {
      playerPersonId: "person-1" as never,
    });
    expect(entry).toMatchObject({
      kind: "unavailable",
      reason:
        "Choose a bill from this member's docket to open its bargaining room.",
    });
  });
});
