import { describe, expect, it } from "vitest";
import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  primaryPartyBallotAdmission,
  primaryVoterAccessFor,
} from "./primary-voter-access";

const places = Object.entries(nominationRules.places);

describe("primary voter access from the existing sourced table", () => {
  it("preserves every place's category, including unread and qualified rules", () => {
    expect(places).toHaveLength(56);
    for (const [key, place] of places) {
      expect(primaryVoterAccessFor(key), key).toBe(place.voterAccess);
      expect(primaryVoterAccessFor(key.slice(3).toLowerCase()), key).toBe(
        place.voterAccess,
      );
    }
    expect(primaryVoterAccessFor("not-a-place")).toBeNull();
  });

  it("requires a recorded choice and admits only the chosen party ballot", () => {
    for (const [key, place] of places) {
      expect(primaryPartyBallotAdmission(key, "party-a", null, undefined)).toBe(
        "requires-record",
      );
      if (place.voterAccess !== null) {
        expect(
          primaryPartyBallotAdmission(key, "party-a", null, "party-b"),
        ).toBe("ineligible");
      }
    }
  });

  it("applies open, closed and unaffiliated access without inventing registration", () => {
    for (const [key, place] of places) {
      const admit = (registration: string | null | undefined) =>
        primaryPartyBallotAdmission(key, "party-a", registration, "party-a");
      switch (place.voterAccess) {
        case "Open":
          expect(admit(undefined)).toBe("eligible");
          expect(admit("party-b")).toBe("eligible");
          break;
        case "Closed":
          expect(admit(undefined)).toBe("requires-record");
          expect(admit(null)).toBe("ineligible");
          expect(admit("party-b")).toBe("ineligible");
          expect(admit("party-a")).toBe("eligible");
          break;
        case "Partially closed":
        case "Partially open":
          expect(admit("party-a")).toBe("eligible");
          expect(admit(undefined)).toBe("requires-record");
          expect(admit(null)).toBe("requires-record");
          expect(admit("party-b")).toBe("requires-record");
          break;
        case "Open to unaffiliated voters":
          expect(admit(undefined)).toBe("requires-record");
          expect(admit(null)).toBe("eligible");
          expect(admit("party-b")).toBe("ineligible");
          expect(admit("party-a")).toBe("eligible");
          break;
        default:
          expect(admit(null)).toBe("requires-record");
          expect(admit("party-a")).toBe("requires-record");
      }
    }
  });
});
