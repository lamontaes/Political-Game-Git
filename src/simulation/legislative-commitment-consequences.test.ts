import { describe, expect, it } from "vitest";

import { createLegislativeScenario } from "./legislation-scenarios";
import { recordLegislativeCommitment } from "./legislative-politics";
import { chamberByKey } from "./legislature-rules";
import { resolveCommitmentsAfterVote } from "./legislative-commitment-consequences";
import { buildAdultLifeContext } from "./adult-situations";
import type { EntityId, LegislativeVoteDisposition, World } from "./types";

function voteAfterPromise(holderVotes: "yea" | "nay") {
  const scenario = createLegislativeScenario("nebraska");
  const { world: initial, measureId } = scenario;
  const measure = initial.history.legislativeMeasures!.find(
    (record) => record.id === measureId,
  )!;
  const chamber = chamberByKey(scenario.pack, measure.originChamberKey);
  const floorStageKey = "test-passage";
  const [holder, listener] = initial.personOrder as EntityId[];
  const eventId = initial.history.events.find((event) =>
    event.involvedEntityIds.includes(measureId),
  )!.id;
  const question = {
    measureId,
    purpose: "floor-stage" as const,
    forumKey: chamber.chamberKey,
    floorStageKey,
    amendmentStableKey: null,
    provisionKey: null,
  };
  let world = recordLegislativeCommitment(initial, {
    stableKey: "test:promise-to-support",
    holderPersonId: holder!,
    subject: { question, questionLabel: "Pass the measure" },
    stance: "support",
    firmness: "explicit",
    audience: "limited",
    eventId,
    heardByPersonIds: [listener!],
    statement: "I will vote yes on passage.",
  });
  const dispositions: LegislativeVoteDisposition[] = [
    {
      memberKey: "holder",
      personId: holder!,
      disposition: holderVotes,
    },
    {
      memberKey: "listener",
      personId: listener!,
      disposition: holderVotes === "yea" ? "nay" : "yea",
    },
  ];
  const yea = dispositions.filter((row) => row.disposition === "yea").length;
  const nay = dispositions.filter((row) => row.disposition === "nay").length;
  const vote = {
    id: "legislative-vote_test-roll-call" as EntityId,
    stableKey: "test:roll-call",
    sequence: world.history.nextSequence,
    measureId,
    forum: { kind: "chamber" as const, chamberKey: chamber.chamberKey },
    purpose: "floor-stage" as const,
    floorStageKey,
    takenAt: world.currentDate,
    eligibleMembers: 2,
    presentMembers: 2,
    dispositions,
    tally: { yea, nay, presentNotVoting: 0, absent: 0, excused: 0 },
    thresholdLabel: "test majority",
    denominatorKind: "members-present" as const,
    denominatorValue: 2,
    requiredVotes: 2,
    outcome: "failed" as const,
    provenance: {
      method: "authored-fixture" as const,
      note: "A deterministic test roll call.",
      sourceEntityIds: [],
    },
  };
  world = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      legislativeVotes: [...(world.history.legislativeVotes ?? []), vote],
    },
  };
  return {
    world: resolveCommitmentsAfterVote(world as World, vote.id),
    listener: listener!,
    holder: holder!,
  };
}

describe("a roll call resolves heard legislative promises", () => {
  it("writes memory and relationship strain for listeners when the promise is broken", () => {
    const { world, listener } = voteAfterPromise("nay");
    const broken = world.history.events.find((event) =>
      event.tags.includes("legislation.commitment-broken"),
    );
    expect(broken).toBeDefined();
    expect(world.history.memories).toContainEqual(
      expect.objectContaining({
        personId: listener,
        eventId: broken!.id,
        relevanceTags: ["legislation.commitment-broken"],
      }),
    );
    expect(world.history.relationshipInteractions).toContainEqual(
      expect.objectContaining({
        personIds: expect.arrayContaining([listener]),
        change: "strained",
        eventId: broken!.id,
      }),
    );
  });

  it("writes no broken-promise consequence when the member keeps their word", () => {
    const { world } = voteAfterPromise("yea");
    expect(
      world.history.events.some((event) =>
        event.tags.includes("legislation.commitment-broken"),
      ),
    ).toBe(false);
  });

  it("exposes heard legislative promises to the adult situation reader", () => {
    const { world, listener } = voteAfterPromise("yea");
    const context = buildAdultLifeContext(world, listener);
    expect(context.legislativeCommitments).toHaveLength(1);
    expect(context.legislativeCommitments[0]).toMatchObject({
      holderPersonId: expect.any(String),
      statement: "I will vote yes on passage.",
    });
  });
});
