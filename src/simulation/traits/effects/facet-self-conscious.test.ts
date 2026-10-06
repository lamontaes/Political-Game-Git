import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { decideMemberVote } from "../../governing/member-vote-decision";
import { recordDurableDecisionTrace } from "../../decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import { deserializeWorld, serializeWorld } from "../../serialization";
import type { DecisionContext, EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-self-conscious";
const SEED = "session132-facet-self-conscious-generated-proof";

function confer(world: World, personId: EntityId, marked: boolean): World {
  const definition = traitDefinitionFromPack(
    loadedTraitRegistry().traits.get(TRAIT)!,
  );
  const catalog = ensurePeopleTraitCatalog(world);
  const ready: World = {
    ...catalog,
    mindCatalog: {
      ...catalog.mindCatalog,
      tendencies: {
        ...catalog.mindCatalog.tendencies,
        [definition.id]: definition,
      },
      tendencyOrder: catalog.mindCatalog.tendencyOrder.includes(definition.id)
        ? catalog.mindCatalog.tendencyOrder
        : [...catalog.mindCatalog.tendencyOrder, definition.id],
    },
  };
  return recordPersonalityTendency(ready, {
    stableKey: `${SEED}:${personId}:${marked}`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey: marked
      ? "facet-self-conscious:high"
      : "facet-self-conscious:unmarked",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Controlled change of self-consciousness for the generated person's decision proof.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-self-conscious's public-life reader", () => {
  it("changes one generated person's production vote, preserves evidence and reloads the reason", () => {
    const rng = new SeededRng(SEED);
    const state = rng.pick(lifePlaceStateIdentities());
    const place = rng.pick(
      searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state.jurisdictionKey,
      }),
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed: SEED,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: place.key,
    });
    const person = Object.values(game.world.people).find(
      ({ id }) => id !== game.playerPersonId,
    )!;
    expect(personName(person)).not.toBe("");
    const context: DecisionContext = {
      stableKey: `${SEED}:vote`,
      decisionType: "legislation.member-vote",
      actorPersonId: person.id,
      cutoff: {
        asOfDate: game.world.currentDate,
        historySequenceExclusive: game.world.history.nextSequence,
      },
      subject: {
        kind: "context:legislative-question",
        key: "self-conscious-proof",
        entityId: null,
      },
      options: [
        {
          key: "vote-yea",
          label: "Vote yea",
          description: "Support the proposal.",
        },
        {
          key: "vote-nay",
          label: "Vote nay",
          description: "Oppose the proposal.",
        },
        {
          key: "withhold",
          label: "Withhold",
          description: "Hold off on taking a position.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "held-position",
          optionKey: "vote-yea",
          sourceType: "context:position",
          direction: "supports",
          importance: "slight",
          confidence: "high",
          explanation:
            "The proposal agrees with the position they have expressed.",
          sourceRefs: [],
        },
        {
          stableKey: "further-review",
          optionKey: "withhold",
          sourceType: "context:review",
          direction: "supports",
          importance: "slight",
          confidence: "low",
          explanation: "They also have reason to take more time reviewing it.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    };
    const unmarked = confer(game.world, person.id, false);
    const selfConscious = confer(game.world, person.id, true);
    const before = decideMemberVote(unmarked, {
      ...context,
      cutoff: {
        asOfDate: unmarked.currentDate,
        historySequenceExclusive: unmarked.history.nextSequence,
      },
    });
    const after = decideMemberVote(selfConscious, {
      ...context,
      cutoff: {
        asOfDate: selfConscious.currentDate,
        historySequenceExclusive: selfConscious.history.nextSequence,
      },
    });
    expect(before.disposition).toBe("yea");
    expect(after.disposition).toBe("present-not-voting");
    expect(
      after.evaluation.context.considerations.filter(
        ({ sourceType }) => sourceType === "mind:personality",
      ),
    ).toMatchObject([
      {
        optionKey: "withhold",
        explanation:
          "They want more time before taking a position others will scrutinize.",
      },
    ]);
    // Scrutiny can support withholding, but cannot invent a policy position.
    const quiet = decideMemberVote(selfConscious, {
      ...context,
      cutoff: {
        asOfDate: selfConscious.currentDate,
        historySequenceExclusive: selfConscious.history.nextSequence,
      },
      stableKey: `${SEED}:quiet`,
      considerations: [],
    });
    expect(quiet.evaluation.context.considerations).toMatchObject([
      {
        optionKey: "withhold",
        sourceType: "mind:personality",
        explanation:
          "They want more time before taking a position others will scrutinize.",
      },
    ]);
    expect(
      quiet.evaluation.context.considerations.some(
        ({ optionKey }) => optionKey === "vote-yea" || optionKey === "vote-nay",
      ),
    ).toBe(false);
    expect(quiet.disposition).toBe("present-not-voting");
    const saved = recordDurableDecisionTrace(selfConscious, after.evaluation);
    const reloaded = deserializeWorld(serializeWorld(saved));
    expect(reloaded.history.decisionTraces.at(-1)?.selectedOptionKey).toBe(
      "withhold",
    );
    expect(
      reloaded.history.decisionTraces.at(-1)?.context.considerations,
    ).toContainEqual(
      expect.objectContaining({
        optionKey: "withhold",
        sourceType: "mind:personality",
        explanation:
          "They want more time before taking a position others will scrutinize.",
      }),
    );
    for (const [decisionId, optionKey] of [
      ["campaign.organizer-outreach", "phone-shift"],
      ["campaign.support-request", "defer"],
      ["press.reporter-request-response", "defer"],
      ["press.adviser-assignment-response", "decline"],
    ]) {
      expect(
        registeredTraitConsiderations(
          selfConscious,
          loadedTraitRegistry(),
          person.id,
          SEED,
          decisionId,
        ),
      ).toMatchObject([{ optionKey, sourceType: "mind:personality" }]);
    }
    expect(loadedTraitRegistry().report.rejections).toEqual([]);
    console.info(
      JSON.stringify({
        seed: SEED,
        worldId: game.world.id,
        date: game.world.currentDate,
        place: place.displayName,
        person: personName(person),
        personId: person.id,
        before: before.disposition,
        after: after.disposition,
        decisionId: after.evaluation.decisionId,
      }),
    );
  }, 60_000);
});
