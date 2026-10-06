import { describe, expect, it } from "vitest";

import { peopleKnownTo } from "../simulation/living-world/official-views";
import {
  councilContactReasonSources,
  meetingItemsThatMatter,
  postedMeetingOrdinanceKey,
} from "../simulation/living-world/local-council-meetings";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import type { EntityId, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";
import { projectCouncilMeetingAgendaNotice } from "./council-meeting-agenda";
import { projectCouncilMeetingQuietSummary } from "./council-meeting-quiet-summary";

const MATTER_SEED = "council-matters:opening-agenda";
const PROPOSITION_ID = "council-matters:policy-question" as EntityId;

function openingMeetingWorld(): {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dueItemId: EntityId;
  readonly measureId: EntityId;
} {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "2805140",
      seed: MATTER_SEED,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
    }),
  ).game!;
  const playerId = game.playerPersonId;
  const world = openOrdinaryLifeRecords(game.world, playerId);
  const town = world.history.legislativeMeasures!.find(
    (measure) =>
      measure.stableKey ===
      postedMeetingOrdinanceKey(
        world.history.futureDueItems.find(
          (item) =>
            item.transitionKey === "civic:local-council-meeting" &&
            item.stableKey.includes(":posted-meeting:"),
        )!.jurisdictionId!,
      ),
  )!.jurisdictionId;
  const measure = world.history.legislativeMeasures!.find(
    (row) => row.stableKey === postedMeetingOrdinanceKey(town),
  )!;
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === "civic:local-council-meeting" &&
      item.jurisdictionId === town &&
      item.stableKey.includes(":posted-meeting:"),
  )!;
  return {
    world: {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        propositions: {
          ...world.policyCatalog.propositions,
          [PROPOSITION_ID]: {
            ...world.policyCatalog.propositions[
              world.policyCatalog.propositionOrder[0]!
            ]!,
            id: PROPOSITION_ID,
          },
        },
        propositionOrder: [
          ...world.policyCatalog.propositionOrder,
          PROPOSITION_ID,
        ],
      },
      history: {
        ...world.history,
        legislativeMeasures: world.history.legislativeMeasures!.map((row) =>
          row.id === measure.id
            ? {
                ...row,
                propositionIds: [PROPOSITION_ID],
                propositionAnswers: [
                  { propositionId: PROPOSITION_ID, answer: "yes" as const },
                ],
              }
            : row,
        ),
      },
    },
    playerId,
    dueItemId: due.id,
    measureId: measure.id,
  };
}

function withHistory(world: World, patch: Partial<World["history"]>): World {
  return { ...world, history: { ...world.history, ...patch } };
}

function reasonKinds(world: World, playerId: EntityId, dueItemId: EntityId) {
  return meetingItemsThatMatter(world, playerId, dueItemId)
    .flatMap((item) => item.reasons.map((reason) => reason.kind))
    .sort();
}

describe("meetingItemsThatMatter", { timeout: 60_000 }, () => {
  it("keeps a quiet agenda item quiet and returns the same reasons without writing", () => {
    const fixture = openingMeetingWorld();
    const history = fixture.world.history;
    const first = meetingItemsThatMatter(
      fixture.world,
      fixture.playerId,
      fixture.dueItemId,
    );
    const second = meetingItemsThatMatter(
      fixture.world,
      fixture.playerId,
      fixture.dueItemId,
    );
    expect(first).toEqual([{ measureId: fixture.measureId, reasons: [] }]);
    expect(second).toEqual(first);
    expect(fixture.world.history).toBe(history);
  });

  it("marks the recorded reasons and lets this meeting play everything", () => {
    const fixture = openingMeetingWorld();
    const relationshipId = "council-agenda-office" as EntityId;
    const focused = projectCouncilMeetingAgendaNotice(
      fixture.world,
      fixture.playerId,
      relationshipId,
      fixture.dueItemId,
    );
    expect(focused?.selectedDepth).toBe("what-matters");
    expect(focused?.items).toEqual([
      {
        measureId: fixture.measureId,
        designation: expect.any(String),
        title: expect.any(String),
        reasons: [],
        plays: false,
      },
    ]);
    const wholeMeeting = projectCouncilMeetingAgendaNotice(
      fixture.world,
      fixture.playerId,
      relationshipId,
      fixture.dueItemId,
      "everything",
    );
    expect(wholeMeeting?.selectedDepth).toBe("everything");
    expect(wholeMeeting?.items[0]?.plays).toBe(true);
    expect(fixture.world.history.officeWorkflowPreferences).toBeUndefined();
  });

  it("summarizes a quiet roll call from its held event and recorded vote", () => {
    const fixture = openingMeetingWorld();
    const due = fixture.world.history.futureDueItems.find(
      (item) => item.id === fixture.dueItemId,
    )!;
    const heldEventId = "council-matter-held-event" as EntityId;
    const voteId = "council-matter-held-vote" as EntityId;
    const heldEvent = {
      id: heldEventId,
      stableKey: `${due.stableKey}:held`,
      sequence: fixture.world.history.nextSequence,
      type: "local.council-meeting-held",
      occurredAt: due.dueAt,
      recordedAt: due.dueAt,
      jurisdictionId: due.jurisdictionId,
      involvedEntityIds: [due.jurisdictionId, fixture.measureId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "The council adopted the meeting-room ordinance.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    } as unknown as World["history"]["events"][number];
    const heldVote = {
      id: voteId,
      stableKey: "council-matter-held-vote",
      sequence: fixture.world.history.nextSequence + 1,
      measureId: fixture.measureId,
      forum: { kind: "chamber", chamberKey: "council" },
      purpose: "floor-stage",
      floorStageKey: null,
      takenAt: due.dueAt,
      eligibleMembers: 3,
      presentMembers: 3,
      dispositions: [
        {
          memberKey: "player",
          personId: fixture.playerId,
          disposition: "yea",
        },
        {
          memberKey: "member-2",
          personId: null,
          disposition: "yea",
        },
        {
          memberKey: "member-3",
          personId: null,
          disposition: "nay",
        },
      ],
      tally: {
        yea: 2,
        nay: 1,
        presentNotVoting: 0,
        absent: 0,
        excused: 0,
      },
      thresholdLabel: "majority",
      denominatorKind: "members-present",
      denominatorValue: 3,
      requiredVotes: 2,
      outcome: "passed",
      provenance: {
        method: "member-decisions",
        note: "Recorded council roll call.",
        sourceEntityIds: [],
      },
    } as const;
    const world = withHistory(fixture.world, {
      events: [...fixture.world.history.events, heldEvent],
      legislativeVotes: [heldVote],
    });
    const summary = projectCouncilMeetingQuietSummary(
      world,
      fixture.playerId,
      heldEventId,
      "what-matters",
    );
    expect(summary?.items).toHaveLength(1);
    expect(summary?.items[0]?.line).toContain("2-1");
    expect(summary?.items[0]?.line).toContain("yea");
    expect(summary?.items[0]?.line).toContain(
      fixture.world.history.legislativeMeasures!.find(
        (measure) => measure.id === fixture.measureId,
      )!.summary,
    );
    expect(summary?.items[0]?.sourceRecordIds).toEqual(
      expect.arrayContaining([heldEventId, voteId, fixture.measureId]),
    );
    expect(
      projectCouncilMeetingQuietSummary(
        world,
        fixture.playerId,
        heldEventId,
        "everything",
      )?.items,
    ).toEqual([]);
    expect(world.history.events.at(-1)).toBe(heldEvent);
  });

  it("plays an item for each independent recorded reason", () => {
    const fixture = openingMeetingWorld();
    const { world, playerId, dueItemId, measureId } = fixture;
    const knownPersonId = peopleKnownTo(world, playerId)[0]!;
    const localUnits = homeLocalGovernmentUnits(world, playerId);
    const memberId = [
      ...localUnits.municipal,
      ...localUnits.townships,
      ...localUnits.counties,
    ]
      .flatMap((unit) => sittingLocalOfficers(world, unit))
      .find((seat) => !seat.mayor && seat.personId !== playerId)!.personId;
    const event = {
      id: "council-matter-contact" as EntityId,
      stableKey: "council-matter-contact",
      sequence: world.history.nextSequence,
      type: "life.contacted-official",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [playerId, knownPersonId, measureId],
      participants: [],
      personFactConstraints: [],
      visibility: "limited",
      tags: [],
      summary: "A known person contacted the player about this agenda item.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    } as unknown as World["history"]["events"][number];
    const belief = {
      id: "council-matter-belief" as EntityId,
      stableKey: "council-matter-belief",
      sequence: world.history.nextSequence,
      personId: playerId,
      propositionId: PROPOSITION_ID,
      formedAt: world.currentDate,
      position: "oppose",
      conviction: "settled",
      salience: "high",
      flexibility: "firm",
      rationale: null,
      formation: {
        reason: "reflection:recorded-view",
        relevantEventIds: [],
        sourceFactIds: [],
        propositionExposureIds: [],
        memoryIds: [],
        eventKnowledgeIds: [],
        claimIds: [],
        relationshipInteractionIds: [],
        subjectKnowledgeIds: [],
        decisionTraceIds: [],
        cue: null,
        evidenceReference: null,
        note: null,
      },
      supersedesBeliefId: null,
    } as unknown as World["history"]["privateBeliefs"][number];
    const commitment = {
      id: "council-matter-stand" as EntityId,
      stableKey: "council-matter-stand",
      sequence: world.history.nextSequence,
      personId: playerId,
      propositionId: PROPOSITION_ID,
      madeAt: world.currentDate,
      stance: "oppose",
      level: "pledge",
      statement: "I took a recorded stand on this question.",
      conditions: null,
      sourceEventId: null,
      supersedesCommitmentId: null,
    } as const;
    const position = {
      id: "council-matter-member-position" as EntityId,
      stableKey: "council-matter-member-position",
      sequence: world.history.nextSequence,
      personId: memberId,
      propositionId: PROPOSITION_ID,
      statedAt: world.currentDate,
      stance: "oppose",
      statement: "The member publicly opposed this question.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: null,
    } as const;
    const exposure = {
      id: "council-matter-effect" as EntityId,
      stableKey: "council-matter-effect",
      sequence: world.history.nextSequence,
      recordedAt: world.currentDate,
      personId: knownPersonId,
      measureId,
      sectionKey: null,
      channel: "public-service",
      relation: "own",
      viaPersonId: null,
      direction: "gain",
      amount: null,
      cadence: null,
      monthlyPay: null,
      sourceRecordId: "council-matter-source" as EntityId,
    } as const;
    const vote = {
      id: "council-matter-contact-vote" as EntityId,
      stableKey: "council-matter-contact-vote",
      sequence: world.history.nextSequence,
      measureId,
      forum: { kind: "chamber", chamberKey: "council" },
      purpose: "floor-stage",
      floorStageKey: null,
      takenAt: world.currentDate,
      eligibleMembers: 1,
      presentMembers: 1,
      dispositions: [],
      tally: { yea: 1, nay: 0, presentNotVoting: 0 },
      thresholdLabel: "majority",
      denominatorKind: "members-present",
      denominatorValue: 1,
      requiredVotes: 1,
      outcome: "passed",
      provenance: { kind: "authored", note: "Fixture vote source." },
    } as const;
    const amendment = {
      id: "council-matter-amendment" as EntityId,
      stableKey: "council-matter-amendment",
      sequence: world.history.nextSequence,
      measureId,
      chamberKey: "council",
      floorStageKey: null,
      offeredAt: world.currentDate,
      offeredByPersonId: playerId,
      offeredByLabel: "the player",
      description: "An amendment by the player.",
      status: "adopted",
      voteId: "council-matter-amendment-vote" as EntityId,
    } as const;
    const reasonLinkedContact = {
      ...event,
      id: "council-matter-reason-contact" as EntityId,
      stableKey: "council-matter-reason-contact",
      involvedEntityIds: [playerId, knownPersonId, vote.id],
    };
    const reasonLinkedWorld = withHistory(world, {
      events: [...world.history.events, reasonLinkedContact],
      legislativeVotes: [vote],
    });
    expect(
      councilContactReasonSources(reasonLinkedWorld, reasonLinkedContact),
    ).toEqual([
      {
        kind: "legislative-vote",
        sourceRecordId: vote.id,
        measureId,
      },
    ]);
    const cases: readonly [string, World][] = [
      [
        "player-sponsored",
        withHistory(
          {
            ...world,
            history: {
              ...world.history,
              legislativeMeasures: world.history.legislativeMeasures!.map(
                (measure) =>
                  measure.id === measureId
                    ? { ...measure, sponsorPersonId: playerId }
                    : measure,
              ),
            },
          },
          {},
        ),
      ],
      [
        "player-amended",
        withHistory(world, {
          legislativeAmendments: [amendment],
        }),
      ],
      [
        "player-stand",
        withHistory(world, { campaignCommitments: [commitment] }),
      ],
      [
        "player-recorded-view",
        withHistory(world, { privateBeliefs: [belief] }),
      ],
      ["known-person-contact", reasonLinkedWorld],
      [
        "member-public-opposition",
        withHistory(world, { publicPositions: [position] }),
      ],
      ["known-person-effect", withHistory(world, { lawExposures: [exposure] })],
    ];

    for (const [expectedKind, caseWorld] of cases) {
      expect(reasonKinds(caseWorld, playerId, dueItemId)).toEqual([
        expectedKind,
      ]);
    }

    const directLink = withHistory(world, {
      events: [...world.history.events, event],
    });
    expect(reasonKinds(directLink, playerId, dueItemId)).toEqual([
      "known-person-contact",
    ]);
    const generalContact = withHistory(world, {
      events: [
        ...world.history.events,
        {
          ...event,
          id: "council-matter-general-contact" as EntityId,
          stableKey: "council-matter-general-contact",
          involvedEntityIds: [playerId, knownPersonId],
        },
      ],
    });
    expect(reasonKinds(generalContact, playerId, dueItemId)).toEqual([]);
  });
});
