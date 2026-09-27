import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { memberVoteConsiderations } from "./legislative-member-decisions";
import type { EntityId, PrivateBeliefRecord, World } from "./types";

const memberId = "person_member" as EntityId;
const measureId = "measure_formed_view" as EntityId;
const propositionId = "proposition_explicit_answer" as EntityId;

function belief(
  position: PrivateBeliefRecord["position"],
  sequence: number,
  formedAt = "2026-01-04",
): PrivateBeliefRecord {
  return {
    id: `belief_${sequence}` as EntityId,
    stableKey: `test:belief:${sequence}`,
    sequence,
    personId: memberId,
    propositionId,
    formedAt: makeIsoDate(formedAt),
    position,
    conviction: "strong",
    salience: "high",
    flexibility: "negotiable",
    rationale: null,
    formation: {
      reason: "experience:test",
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
  };
}

function worldWith(
  answer: "yes" | "no" | null,
  beliefs: readonly PrivateBeliefRecord[],
): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    policyCatalog: {
      propositions: {
        [propositionId]: { question: "Should the state fund rural transit?" },
      },
    },
    history: {
      legislativeMeasures: [
        {
          id: measureId,
          stableKey: "test:measure",
          sponsorPersonId: null,
          propositionAnswers:
            answer === null ? [] : [{ propositionId, answer }],
        },
      ],
      legislativeProvisions: [],
      legislativeCommitments: [],
      privateBeliefs: beliefs,
      relationshipInteractions: [],
    },
  } as unknown as World;
}

function considerations(
  world: World,
  purpose: "floor-stage" | "amendment" = "floor-stage",
) {
  return memberVoteConsiderations(world, {
    stableKey: "test:vote",
    personId: memberId,
    question: {
      question: {
        measureId,
        purpose,
        forumKey: "house",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: "Pass this measure?",
    },
  }).filter((row) => row.sourceType === "belief:formed-position");
}

describe("member votes from formed views on an explicit bill answer", () => {
  it("cites the latest private belief and opposes a conflicting answer", () => {
    const rows = considerations(
      worldWith("no", [belief("oppose", 1), belief("support", 2)]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      optionKey: "vote-nay",
      importance: "strong",
      confidence: "high",
      sourceRefs: [{ kind: "private-belief", beliefId: "belief_2" }],
    });
    expect(
      considerations(worldWith("no", [belief("oppose", 1)]))[0],
    ).toMatchObject({ optionKey: "vote-yea" });
  });

  it("does not infer an answer from a named question or an unsettled view", () => {
    expect(considerations(worldWith(null, [belief("support", 1)]))).toEqual([]);
    expect(considerations(worldWith("yes", [belief("uncertain", 1)]))).toEqual(
      [],
    );
    expect(
      considerations(worldWith("yes", [belief("support", 1, "2026-01-06")])),
    ).toEqual([]);
  });

  it("does not project the current measure's answer onto an amendment", () => {
    expect(
      considerations(worldWith("yes", [belief("support", 1)]), "amendment"),
    ).toEqual([]);
  });
});
