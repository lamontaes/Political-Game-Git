import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { campaigns } from "./campaign-queries";
import { askToSign } from "./candidate-petitions";
import {
  candidatePetitionCountDecision,
  reviewCandidatePetition,
} from "./candidate-petition-review";
import { candidateFilingTerms, filingTermsCoverage } from "./candidate-filing-terms";
import { isEligibleVoterIn } from "./issue-record";

describe("candidate petition review", () => {
  it("rejects one signature short and accepts the exact threshold in all 56 places", () => {
    const families = [
      "statewideExecutive",
      "stateLegislative",
      "federalLegislative",
      "local",
    ] as const;
    const places = filingTermsCoverage();
    expect(places).toHaveLength(56);
    for (const place of places) {
      for (const family of families) {
        const rule = candidateFilingTerms(place, family);
        expect(typeof rule.signatures).toBe("number");
        const required = rule.signatures as number;
        expect(candidatePetitionCountDecision(required, required - 1)).toMatchObject({
          accepted: false,
          shortfall: 1,
          reasonKeys: ["petition-insufficient-signatures"],
        });
        expect(candidatePetitionCountDecision(required, required)).toMatchObject({
          accepted: true,
          shortfall: 0,
          reasonKeys: [],
        });
      }
    }
  });

  it("returns counts and reason keys from the dated signed-event records", () => {
    const small = smallWorld({
      place: "US-KY",
      people: 8,
      seed: "petition-review",
    });
    const world = fileForOffice(small.world, small.personId);
    const campaign = campaigns(world)[0]!;
    const signerId = world.personOrder.find(
      (personId) =>
        personId !== small.personId &&
        isEligibleVoterIn(
          world,
          personId,
          campaign.jurisdictionId,
          world.currentDate,
        ),
    );
    expect(signerId).toBeDefined();
    const signed = askToSign(world, {
      campaignId: campaign.id,
      circulatorPersonId: small.personId,
      signerPersonId: signerId!,
      at: world.currentDate,
    });
    const review = reviewCandidatePetition(signed.world, campaign.id);
    expect(review).toMatchObject({
      campaignId: campaign.id,
      filingDate: world.currentDate,
      validSignatures: signed.decision === "sign" ? 1 : 0,
      invalidSignatures: 0,
      shortfall: expect.any(Number),
      signatures:
        signed.decision === "sign"
          ? [
              {
                signerPersonId: signerId,
                valid: true,
                reason: null,
              },
            ]
          : [],
    });
    expect(review.requiredSignatures).toBeGreaterThan(0);
  });

  it("does not count signatures recorded after the clerk's filing date", () => {
    const small = smallWorld({
      place: "US-KY",
      people: 8,
      seed: "petition-review-date",
    });
    const world = fileForOffice(small.world, small.personId);
    const campaign = campaigns(world)[0]!;
    const signerId = world.personOrder.find(
      (personId) => personId !== small.personId,
    )!;
    const signed = askToSign(world, {
      campaignId: campaign.id,
      circulatorPersonId: small.personId,
      signerPersonId: signerId,
      at: world.currentDate,
    });
    const review = reviewCandidatePetition(
      signed.world,
      campaign.id,
      "1900-01-01" as typeof world.currentDate,
    );
    expect(review.signatures).toEqual([]);
    expect(review.validSignatures).toBe(0);
  });
});
