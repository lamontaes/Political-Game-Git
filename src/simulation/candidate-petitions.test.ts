import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { campaigns } from "./campaign-queries";
import { addDays } from "./dates";
import { createFormationContext, recordPrivateBelief } from "./politics";
import {
  askToSign,
  petitionAskedPersonIds,
  petitionSignaturesForCampaign,
} from "./candidate-petitions";
import type { EntityId, World } from "./types";

function petitionFixture(seed: string) {
  const small = smallWorld({ place: "US-KY", people: 6, seed });
  const world = fileForOffice(small.world, small.personId);
  return { world, campaign: campaigns(world)[0]!, candidateId: small.personId };
}

function firstOther(world: World, candidateId: EntityId): EntityId {
  const personId = world.personOrder.find((id) => id !== candidateId);
  if (!personId) throw new Error("No petition signer in the fixture.");
  return personId;
}

describe("candidate petition asks", () => {
  it("records a deterministic dated decision with signer and circulator participants", () => {
    const fixture = petitionFixture("petition-same-world");
    const signerId = firstOther(fixture.world, fixture.candidateId);
    const ask = {
      campaignId: fixture.campaign.id,
      circulatorPersonId: fixture.candidateId,
      signerPersonId: signerId,
      at: fixture.world.currentDate,
    } as const;
    const first = askToSign(fixture.world, ask);
    const replay = askToSign(fixture.world, ask);
    expect(first.decision).toBe(replay.decision);
    expect(first.world.history.events.at(-1)).toEqual(
      replay.world.history.events.at(-1),
    );
    expect(first.world.history.events.at(-1)).toMatchObject({
      occurredAt: fixture.world.currentDate,
      participants: [
        { personId: signerId, role: "agency:signer" },
        { personId: fixture.candidateId, role: "agency:circulator" },
      ],
      type:
        first.decision === "sign"
          ? "campaign.petition-signed"
          : "campaign.petition-declined",
    });
    expect(() => askToSign(first.world, ask)).toThrow(/already been asked/);
    expect(petitionAskedPersonIds(first.world, fixture.campaign.id)).toEqual(
      new Set([signerId]),
    );
    expect(
      petitionSignaturesForCampaign(first.world, fixture.campaign.id),
    ).toHaveLength(first.decision === "sign" ? 1 : 0);
  });

  it("lets a recorded strong opposer decline without chance or randomness", () => {
    const fixture = petitionFixture("petition-opposer-declines");
    const signerId = firstOther(fixture.world, fixture.candidateId);
    const signer = fixture.world.people[signerId]!;
    const world = recordPrivateBelief(fixture.world, {
      stableKey: "fixture:petition-opposition",
      personId: signerId,
      propositionId: null,
      subject: { kind: "official", personId: fixture.candidateId },
      formedAt: addDays(signer.birthDate, 18 * 365),
      position: "oppose",
      conviction: "settled",
      salience: "central",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const result = askToSign(world, {
      campaignId: fixture.campaign.id,
      circulatorPersonId: fixture.candidateId,
      signerPersonId: signerId,
      at: world.currentDate,
    });
    expect(result.decision).toBe("decline");
    expect(result.world.history.events.at(-1)?.type).toBe(
      "campaign.petition-declined",
    );
  });
});
