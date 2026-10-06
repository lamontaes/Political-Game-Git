import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { campaigns, recordWorldEvent } from "../simulation";
import { CANDIDATE_PETITION_ASKED_TAG } from "../simulation/candidate-petitions";
import {
  CampaignWorkspace,
  readableCampaignDate,
  splitEligibilityText,
} from "./CampaignWorkspace";

function renderCampaign(world: ReturnType<typeof smallWorld>["world"]) {
  return renderToStaticMarkup(
    createElement(CampaignWorkspace, {
      world,
      personId: world.control.personId,
      onWorldChange: () => undefined,
    }),
  );
}

describe("campaign office text", () => {
  it("shows every reason once, and hides none of them", () => {
    const refusal =
      "You can't run for office in Nebraska this early. A life that starts later may be able to run here.";
    const split = splitEligibilityText(
      `${refusal} This character is already running for something.`,
    );
    expect(split.reasons).toEqual([
      "You can't run for office in Nebraska this early.",
      "A life that starts later may be able to run here.",
      "This character is already running for something.",
    ]);
  });

  it("says a repeated reason once", () => {
    const sentence = "This character is already running for something.";
    expect(splitEligibilityText(`${sentence} ${sentence}`).reasons).toEqual([
      sentence,
    ]);
  });

  it("writes stored dates the way a reader does and leaves other text alone", () => {
    expect(readableCampaignDate("2026-02-02")).toBe("February 2, 2026");
    expect(readableCampaignDate("decided 2026-11-03 at noon")).toBe(
      "decided November 3, 2026 at noon",
    );
    expect(readableCampaignDate("no date here")).toBe("no date here");
  });

  it("shows every signed event in a signature campaign and no count in a fee-only campaign", () => {
    const fixture = smallWorld({
      place: "US-KY",
      people: 4,
      seed: "campaign-petition-player-count",
    });
    const filed = fileForOffice(fixture.world, fixture.personId);
    const campaign = campaigns(filed)[0]!;
    const feeOnlyMarkup = renderCampaign(filed);

    let petitionWorld = filed;
    for (const [index, signerPersonId] of filed.personOrder
      .filter((personId) => personId !== fixture.personId)
      .slice(0, 2)
      .entries()) {
      petitionWorld = recordWorldEvent(petitionWorld, {
        stableKey: `fixture:petition-signature:${index}`,
        type: "campaign.petition-signed",
        occurredAt: filed.currentDate,
        recordedAt: filed.currentDate,
        jurisdictionId: index === 0 ? campaign.jurisdictionId : null,
        involvedEntityIds: [campaign.id, signerPersonId],
        participants: [
          { personId: signerPersonId, role: "agency:signer", detail: null },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          CANDIDATE_PETITION_ASKED_TAG,
          `campaign:${campaign.id}`,
          "decision:sign",
        ],
        summary: "A fixture resident signed the candidate petition.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: "sign",
          motivation: null,
          immediateReaction: null,
        },
      });
    }

    const signatureMarkup = renderCampaign(petitionWorld);
    expect(signatureMarkup).toContain(
      'data-testid="campaign-petition-signatures">Signatures you have: 2.',
    );
    expect(signatureMarkup).not.toContain("Signatures you have: 1.");
    expect(feeOnlyMarkup).not.toContain("campaign-petition-signatures");
  });
});
