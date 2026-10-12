import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { recordWorldEvent } from "../../simulation/world";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import {
  decideChamberVote as nativeVote,
  type ChamberVoteMemberEvaluation,
  type ChamberNominationVoteInput,
} from "../../simulation/governing/chamber-votes";
import { readRelationshipStanding } from "../../simulation/relationship-standing";
import type { DecisionConsideration, EntityId } from "../../simulation/types";
import {
  nominationVoteContext,
  type NominationFacts,
} from "./nomination-context";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
function outcome(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
describe("legislatures: nomination validation and two-pass member counting through native public vote", () => {
  it.each(Object.keys(STATES))(
    "matches native reader/decision behavior in the %s World",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-chamber:${place}`,
        offices: ["congress"],
      }).world;
      const members = seatedCongressChamber(world, "senate")!.body.members;
      const nomineeId = members[0]!.personId!,
        presidentId = members[1]!.personId!;
      // An edge nomination goes through the native event writer; these fixtures prove the reader, not a new court producer.
      world = recordWorldEvent(world, {
        stableKey: `rules2:${place}:nomination`,
        type: "governing.chief-justice-nominated",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [nomineeId, presidentId],
        participants: [
          { personId: presidentId, role: "focus:actor", detail: "Appointer" },
          { personId: nomineeId, role: "focus:subject", detail: "Nominee" },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: ["office:us-chief-justice"],
        summary: "Recorded nomination fixture",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const event = world.history.events.at(-1)!;
      const nominations: NominationFacts = {
        onDate: world.currentDate,
        events: world.history.events,
        personDeaths: world.history.personDeaths,
        decisionTraces: world.history.decisionTraces,
        personIds: new Set(world.personOrder),
        jurisdictionIds: new Set(world.jurisdictionOrder),
      };
      const trustReadings = new Map<
        string,
        ReturnType<typeof readRelationshipStanding>["readings"]["trust"]
      >();
      for (const viewer of members)
        for (const subject of members)
          if (
            viewer.personId &&
            subject.personId &&
            viewer.personId !== subject.personId
          )
            trustReadings.set(
              `${viewer.personId}\u0000${subject.personId}`,
              readRelationshipStanding(world, viewer.personId, subject.personId)
                .readings.trust,
            );
      const reason = (
        key: string,
        side: "vote-yea" | "vote-nay",
      ): DecisionConsideration => ({
        stableKey: `member:principle:${key}`,
        optionKey: side,
        sourceType: "context:own-caucus",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: "Recorded member reason fixture",
        sourceRefs: [],
      });
      for (const empty of [false, true])
        for (const playerBallot of [null, "yea"] as const) {
          const input: ChamberNominationVoteInput = {
            kind: "nomination",
            stableKey: `rules2:${place}:vote:${empty}:${playerBallot}`,
            nominationEventId: event.id,
            nomineeId,
            presidentId,
            officeKey: "us-chief-justice",
            members: [
              ...members,
              {
                memberKey: `${place}:vacant`,
                personId: null,
                name: "Vacant",
                caucusLabel: "Vacant",
              },
            ],
            considerationsByMember: new Map(
              members.map((member, index) => [
                member.memberKey,
                empty
                  ? []
                  : [
                      reason(
                        member.memberKey,
                        index % 2 ? "vote-yea" : "vote-nay",
                      ),
                    ],
              ]),
            ),
            playerPersonId: members[2]!.personId,
            playerBallot,
          };
          const receipts: ChamberVoteMemberEvaluation[] = [];
          const expected = nativeVote(world, input, {
            onMemberEvaluation: (row) => receipts.push(row),
          });
          const memberEvaluations: ChamberDecisionFacts["memberEvaluations"] =
            new Map(
              receipts.flatMap((row) =>
                row.evaluation
                  ? [
                      [
                        `${input.stableKey}:${row.disposition.memberKey}:decision`,
                        {
                          evaluation: row.evaluation,
                          disposition: row.disposition.disposition,
                        },
                      ],
                    ]
                  : [],
              ),
            );
          const facts: ChamberDecisionFacts = {
            context: nominationVoteContext(nominations, input),
            interactions: world.history.relationshipInteractions,
            trustReadings,
            memberEvaluations,
          };
          const actualReceipts: ChamberVoteMemberEvaluation[] = [];
          expect(
            decideChamberVote(facts, input, {
              onMemberEvaluation: (row) => actualReceipts.push(row),
            }),
          ).toEqual(expected);
          expect(actualReceipts).toEqual(receipts);
          for (const invalid of [
            { ...input, nominationEventId: "missing" as EntityId },
            { ...input, nomineeId: "missing" as EntityId },
            { ...input, officeKey: "wrong-office" },
          ]) {
            const actual = outcome(() =>
              nominationVoteContext(nominations, invalid),
            );
            const old = outcome(() => nativeVote(world, invalid));
            expect(actual).toEqual(old);
          }
        }
    },
    30000,
  );
});
