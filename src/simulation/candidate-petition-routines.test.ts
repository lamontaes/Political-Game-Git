import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { campaigns } from "./campaign-queries";
import { completePetitionCirculation } from "./candidate-petition-routines";
import type { EntityId } from "./types";

function fixture(seed: string) {
  const small = smallWorld({ place: "US-KY", people: 8, seed });
  const world = fileForOffice(small.world, small.personId);
  const campaign = campaigns(world)[0]!;
  const residentPersonIds = world.personOrder.filter(
    (personId) => personId !== campaign.candidatePersonId,
  );
  return { world, campaign, residentPersonIds };
}

describe("background petition circulation", () => {
  it("uses the existing reach model and selects the same named residents for the same block", () => {
    const state = fixture("petition-routine-repeatable");
    const input = {
      campaignId: state.campaign.id,
      circulatorPersonId: state.campaign.candidatePersonId,
      blockStableKey: "campaign-block:petition:2026-06-01:09:00",
      minutes: 60,
      residentPersonIds: state.residentPersonIds,
    } as const;
    const first = completePetitionCirculation(state.world, input);
    const replay = completePetitionCirculation(state.world, input);
    expect(first.reach).toEqual(replay.reach);
    expect(first.askedPersonIds).toEqual(replay.askedPersonIds);
    expect(first.askedPersonIds).toHaveLength(first.reachedCount);
    expect(
      first.world.history.events.filter((event) =>
        event.tags.includes("campaign:candidate-petition-ask"),
      ),
    ).toHaveLength(first.askedPersonIds.length);
  });

  it("does not ask a signer twice when a later block rotates through the district", () => {
    const state = fixture("petition-routine-skips-asked");
    const shared = {
      campaignId: state.campaign.id,
      circulatorPersonId: state.campaign.candidatePersonId,
      minutes: 60,
      residentPersonIds: state.residentPersonIds,
    };
    const first = completePetitionCirculation(state.world, {
      ...shared,
      blockStableKey: "campaign-block:first",
    });
    const second = completePetitionCirculation(first.world, {
      ...shared,
      blockStableKey: "campaign-block:second",
    });
    const firstAsked = new Set<EntityId>(first.askedPersonIds);
    expect(
      second.askedPersonIds.every((personId) => !firstAsked.has(personId)),
    ).toBe(true);
    expect(second.world.history.events).toHaveLength(
      state.world.history.events.length +
        first.askedPersonIds.length +
        second.askedPersonIds.length,
    );
  });
});
