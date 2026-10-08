import { describe, expect, it } from "vitest";
import { createDemoWorld, LEXINGTON_DEMO_CONTEXT } from "./demo";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { recordClaim, recordEventKnowledge } from "./records";
import { recordWorldEvent } from "./world";
import { serializeWorld, deserializeWorld } from "./serialization";
import { heardOfficialViews } from "./heard-official-views";
import type { EntityId, World } from "./types";

function fixture(stateKey?: string) {
  const jurisdiction = stateKey ? stateJurisdictionForKey(stateKey) : null;
  if (stateKey && !jurisdiction)
    throw Error(`Missing jurisdiction ${stateKey}`);
  let world = createDemoWorld(
    "b07-heard-statements",
    jurisdiction
      ? {
          context: { ...LEXINGTON_DEMO_CONTEXT, jurisdiction },
        }
      : undefined,
  );
  const [listenerId, holderId, otherId] = world.personOrder;
  if (!listenerId || !holderId || !otherId) throw Error("Missing people");
  world = recordWorldEvent(world, {
    stableKey: "heard-view:reflection",
    type: "people.law-reflection",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [listenerId, holderId],
    participants: [
      { personId: listenerId, role: "focus:viewer", detail: null },
      { personId: holderId, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["people.official-view"],
    summary: "Authored reflection fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world,
    listenerId,
    holderId,
    otherId,
    eventId: world.history.events.at(-1)!.id,
  };
}

function tell(
  input: ReturnType<typeof fixture>,
  listenerId = input.listenerId,
  officialId = input.listenerId,
  summary = `told-view:${input.holderId}:${officialId}:oppose`,
): World {
  return recordEventKnowledge(input.world, {
    stableKey: `heard-view:${listenerId}:${officialId}:${summary}`,
    personId: listenerId,
    eventId: input.eventId,
    learnedAt: input.world.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "medium",
    source: { kind: "told-by", sourcePersonId: input.holderId, claimId: null },
  });
}

describe("only statements the listener learned reach their heard-view list", () => {
  it("uses the same knowledge reader in all 56 recorded jurisdictions", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const f = fixture(state.jurisdictionKey);
      const heard = heardOfficialViews(tell(f), f.listenerId);
      expect(heard, state.name).toHaveLength(1);
      expect(heard[0]?.position, state.name).toBe("oppose");
      expect(heardOfficialViews(f.world, f.listenerId), state.name).toEqual([]);
    }
  });
  it("reads the recorded speaker, position and date and survives reload without writes", () => {
    const f = fixture();
    const world = tell(f);
    const row = world.history.knowledge.at(-1)!;
    const before = serializeWorld(world);
    expect(heardOfficialViews(world, f.listenerId)).toEqual([
      {
        knowledgeId: row.id,
        eventId: f.eventId,
        holderId: f.holderId,
        officialId: f.listenerId,
        position: "oppose",
        claimId: null,
        statement: null,
        source: "told-by",
        learnedAt: row.learnedAt,
        accuracy: row.accuracy,
        confidence: row.confidence,
      },
    ]);
    expect(heardOfficialViews(world, f.otherId)).toEqual([]);
    expect(serializeWorld(world)).toBe(before);
    expect(heardOfficialViews(deserializeWorld(before), f.listenerId)).toEqual(
      heardOfficialViews(world, f.listenerId),
    );
  });

  it("links told and directly witnessed statements to their saved claim", () => {
    const f = fixture();
    const withClaim = recordClaim(f.world, {
      stableKey: "heard-view:claim",
      speakerPersonId: f.holderId,
      eventId: f.eventId,
      madeAt: f.world.currentDate,
      audience: "limited",
      statement: "Recorded view statement.",
      relationshipToTruth: "consistent",
      provenance: { kind: "direct-record" },
    });
    const claim = withClaim.history.claims.at(-1)!;
    const told = recordEventKnowledge(withClaim, {
      stableKey: "heard-view:told-linked",
      personId: f.listenerId,
      eventId: f.eventId,
      learnedAt: f.world.currentDate,
      believedSummary: `told-view:${f.holderId}:${f.listenerId}:support`,
      accuracy: "accurate",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: f.holderId,
        claimId: claim.id,
      },
    });
    const witnessed = recordEventKnowledge(withClaim, {
      stableKey: "heard-view:witnessed-linked",
      personId: f.listenerId,
      eventId: f.eventId,
      learnedAt: f.world.currentDate,
      believedSummary: `told-view:${f.holderId}:${f.listenerId}:oppose`,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct", claimId: claim.id },
    });

    expect(heardOfficialViews(told, f.listenerId)).toContainEqual(
      expect.objectContaining({
        holderId: f.holderId,
        position: "support",
        claimId: claim.id,
        statement: claim.statement,
        source: "told-by",
      }),
    );
    expect(heardOfficialViews(witnessed, f.listenerId)).toContainEqual(
      expect.objectContaining({
        holderId: f.holderId,
        position: "oppose",
        claimId: claim.id,
        statement: claim.statement,
        source: "direct",
      }),
    );
  });

  it("handles colon-containing entity IDs without splitting them into invented fields", () => {
    const f = fixture();
    const world = tell(f);
    const listenerId = "person:listener:one" as EntityId;
    const holderId = "person:holder:two" as EntityId;
    const row = world.history.knowledge.at(-1)!;
    const aliased: World = {
      ...world,
      people: {
        ...world.people,
        [listenerId]: { ...world.people[f.listenerId]!, id: listenerId },
        [holderId]: { ...world.people[f.holderId]!, id: holderId },
      },
      history: {
        ...world.history,
        knowledge: [
          {
            ...row,
            personId: listenerId,
            source: {
              kind: "told-by",
              sourcePersonId: holderId,
              claimId: null,
            },
            believedSummary: `told-view:${holderId}:${listenerId}:support`,
          },
        ],
      },
    };
    expect(heardOfficialViews(aliased, listenerId)).toMatchObject([
      { holderId, officialId: listenerId, position: "support" },
    ]);
  });

  it("does not expose private beliefs or replace a statement with a changed belief", () => {
    const f = fixture();
    const changed = recordPrivateBelief(f.world, {
      stableKey: "heard-view:private",
      personId: f.holderId,
      propositionId: null,
      subject: { kind: "official", personId: f.listenerId },
      formedAt: f.world.currentDate,
      position: "support",
      conviction: "tentative",
      salience: "low",
      flexibility: "open",
      rationale: null,
      formation: createFormationContext("evidence:new"),
      supersedesBeliefId: null,
    });
    expect(heardOfficialViews(changed, f.listenerId)).toEqual([]);
    expect(
      heardOfficialViews(tell({ ...f, world: changed }), f.listenerId)[0]
        ?.position,
    ).toBe("oppose");
  });

  it("keeps other officials and malformed summaries out of the player's list", () => {
    const f = fixture();
    expect(
      heardOfficialViews(tell(f, f.listenerId, f.otherId), f.listenerId),
    ).toEqual([]);
    for (const summary of [
      `told-view:${f.holderId}:${f.listenerId}:oppose:extra`,
      `told-view:${f.otherId}:${f.listenerId}:support`,
      `told-view:${f.holderId}:${f.listenerId}:unknown`,
      "An unrelated summary",
    ])
      expect(
        heardOfficialViews(
          tell(f, f.listenerId, f.listenerId, summary),
          f.listenerId,
        ),
      ).toEqual([]);
  });

  it("excludes future knowledge, unseen sequences and missing source events", () => {
    const f = fixture();
    const world = tell(f);
    const row = world.history.knowledge.at(-1)!;
    for (const replacement of [
      { ...row, learnedAt: "2099-01-01" as typeof row.learnedAt },
      { ...row, sequence: world.history.nextSequence },
      { ...row, eventId: "event:missing" as EntityId },
      { ...row, source: { kind: "direct" as const } },
    ]) {
      const altered = {
        ...world,
        history: { ...world.history, knowledge: [replacement] },
      };
      expect(heardOfficialViews(altered, f.listenerId)).toEqual([]);
    }
  });
});
