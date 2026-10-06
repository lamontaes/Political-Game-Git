import { describe, expect, it } from "vitest";
import { modelCampaignFieldReach } from "./campaign-contact-calibration";

describe("campaign contact calibration", () => {
  it("leaves door attempts unknown when only conversations have a compatible benchmark", () => {
    expect(modelCampaignFieldReach("door-canvass", 90)).toEqual({
      profileVersion: "research1-wave2-v1",
      volunteerEquivalentMinutes: 90,
      estimatedDoorKnocks: null,
      estimatedPhoneDials: null,
      estimatedCompletedConversations: { min: 4, max: 12 },
      sourceObservationIds: ["volunteer-door-conversations"],
    });
  });

  it("uses one manual-phone observation for dials and conversations", () => {
    expect(modelCampaignFieldReach("phone-shift", 60)).toMatchObject({
      estimatedDoorKnocks: null,
      estimatedPhoneDials: { min: 35, max: 35 },
      estimatedCompletedConversations: { min: 10, max: 15 },
      sourceObservationIds: ["blueprints-manual-phone"],
    });
  });

  it("uses the existing face-to-face reach model for petition circulation", () => {
    expect(modelCampaignFieldReach("petition-circulation", 120)).toEqual({
      profileVersion: "research1-wave2-v1",
      volunteerEquivalentMinutes: 120,
      estimatedDoorKnocks: null,
      estimatedPhoneDials: null,
      estimatedCompletedConversations: { min: 6, max: 16 },
      sourceObservationIds: ["volunteer-door-conversations"],
    });
  });

  it("does not assign field reach to a fundraiser or invalid duration", () => {
    expect(modelCampaignFieldReach("fundraiser", 60)).toBeNull();
    expect(() => modelCampaignFieldReach("phone-shift", 0)).toThrow(
      /positive whole minutes/,
    );
  });
});
