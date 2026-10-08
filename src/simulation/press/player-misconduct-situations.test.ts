import { describe, expect, it } from "vitest";
import { offerToPlayer } from "./player-misconduct-situations";
import { MISCONDUCT_FAMILY_LABELS } from "./records";

describe("player misconduct situation offers", () => {
  it("carries recorded actors and knowers without inventing risk", () => {
    const participants = ["candidate", "vendor"];
    const offer = offerToPlayer({
      stableKey: "campaign-use:scene-1",
      family: "M1",
      summary: "recorded-summary",
      actorPersonIds: ["candidate"],
      participantPersonIds: participants,
      choice: "recorded-choice",
    });

    expect(offer.label).toBe(MISCONDUCT_FAMILY_LABELS.M1);
    expect(offer.participantPersonIds).toBe(participants);
    expect(offer.actorPersonIds).toEqual(["candidate"]);
    expect(offer.summary).toBe("recorded-summary");
    expect(offer.choice).toBe("recorded-choice");
    expect(offer).not.toHaveProperty("risk");
    expect(offer).not.toHaveProperty("detectionChance");
  });

  it("rejects an offer that omits an actor from the knowers", () => {
    expect(() =>
      offerToPlayer({
        stableKey: "campaign-use:scene-2",
        family: "M1",
        summary: "recorded-summary",
        actorPersonIds: ["candidate"],
        participantPersonIds: ["vendor"],
        choice: "recorded-choice",
      }),
    ).toThrow("Invalid misconduct offer: every actor must be a knower.");
  });
});
