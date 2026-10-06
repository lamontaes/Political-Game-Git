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

const TRAIT = "personality-v1:facet-informal";
const SEED = "session132-facet-informal-generated-proof";

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
    expressionKey: marked ? "facet-informal:high" : "facet-informal:unmarked",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Controlled change of informality for the generated person's decision proof.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-informal's public-life reader", () => {
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
    const person = Object.values(game.world.people).find(({ id }) => {
      if (id === game.playerPersonId) return false;
      // Keep every other generated trait; choose a subject whose existing
      // temperament adds no vote argument, rather than clearing their mind.
      return (
        registeredTraitConsiderations(
          confer(game.world, id, false),
          loadedTraitRegistry(),
          id,
          SEED,
          "legislation.member-vote",
        ).length === 0
      );
    });
    expect(person).toBeDefined();
    if (!person)
      throw new Error("No generated NPC without a vote-trait argument.");
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
        key: "informal-proof",
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
            "They have an expressed position they can state without further ceremony.",
          sourceRefs: [],
        },
        {
          stableKey: "further-review",
          optionKey: "withhold",
          sourceType: "context:review",
          direction: "supports",
          importance: "moderate",
          confidence: "medium",
          explanation:
            "They also have reason to wait for a formal occasion to state their position.",
          sourceRefs: [],
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    };
    const unmarked = confer(game.world, person.id, false);
    const informal = confer(game.world, person.id, true);
    const before = decideMemberVote(unmarked, {
      ...context,
      cutoff: {
        asOfDate: unmarked.currentDate,
        historySequenceExclusive: unmarked.history.nextSequence,
      },
    });
    const after = decideMemberVote(informal, {
      ...context,
      cutoff: {
        asOfDate: informal.currentDate,
        historySequenceExclusive: informal.history.nextSequence,
      },
    });
    expect(before.disposition).toBe("present-not-voting");
    expect(after.disposition).toBe("yea");
    expect(before.evaluation.context.considerations).toEqual(
      [...context.considerations].sort((a, b) =>
        a.stableKey < b.stableKey ? -1 : a.stableKey > b.stableKey ? 1 : 0,
      ),
    );
    expect(
      after.evaluation.context.considerations.filter(
        ({ sourceType }) => sourceType !== "mind:personality",
      ),
    ).toEqual(
      [...context.considerations].sort((a, b) =>
        a.stableKey < b.stableKey ? -1 : a.stableKey > b.stableKey ? 1 : 0,
      ),
    );
    expect(
      after.evaluation.context.considerations.filter(
        ({ sourceType }) => sourceType === "mind:personality",
      ),
    ).toMatchObject([
      {
        optionKey: "vote-yea",
        explanation:
          "They favor stating their existing position directly without additional ceremony.",
      },
    ]);
    // Informality alone supplies neither a missing policy position nor a nay vote.
    const quiet = decideMemberVote(informal, {
      ...context,
      stableKey: `${SEED}:quiet`,
      cutoff: {
        asOfDate: informal.currentDate,
        historySequenceExclusive: informal.history.nextSequence,
      },
      considerations: [],
    });
    expect(quiet.evaluation.context.considerations).toEqual([]);
    expect(quiet.disposition).toBe("present-not-voting");
    const peer = Object.values(game.world.people).find(
      ({ id }) => id !== game.playerPersonId && id !== person.id,
    );
    expect(peer).toBeDefined();
    if (!peer)
      throw new Error("No second generated NPC for the unchanged control.");
    const peerContext = {
      ...context,
      stableKey: `${SEED}:peer`,
      actorPersonId: peer.id,
    };
    expect(
      decideMemberVote(unmarked, {
        ...peerContext,
        cutoff: {
          asOfDate: unmarked.currentDate,
          historySequenceExclusive: unmarked.history.nextSequence,
        },
      }).disposition,
    ).toBe(
      decideMemberVote(informal, {
        ...peerContext,
        cutoff: {
          asOfDate: informal.currentDate,
          historySequenceExclusive: informal.history.nextSequence,
        },
      }).disposition,
    );
    const saved = recordDurableDecisionTrace(informal, after.evaluation);
    const reloaded = deserializeWorld(serializeWorld(saved));
    expect(reloaded.history.decisionTraces.at(-1)?.selectedOptionKey).toBe(
      "vote-yea",
    );
    expect(
      reloaded.history.decisionTraces.at(-1)?.context.considerations,
    ).toEqual(after.evaluation.context.considerations);
    for (const [decisionId, optionKey] of [
      ["campaign.organizer-outreach", "door-canvass"],
      ["campaign.support-request", "grant"],
      ["press.reporter-request-response", "accept"],
      ["press.adviser-assignment-response", "accept"],
    ]) {
      expect(
        registeredTraitConsiderations(
          informal,
          loadedTraitRegistry(),
          person.id,
          SEED,
          decisionId,
        ).filter(({ stableKey }) => stableKey.includes(`:trait:${TRAIT}:`)),
      ).toMatchObject([{ optionKey, sourceType: "mind:personality" }]);
      expect(
        registeredTraitConsiderations(
          unmarked,
          loadedTraitRegistry(),
          person.id,
          SEED,
          decisionId,
        ).filter(({ stableKey }) => stableKey.includes(`:trait:${TRAIT}:`)),
      ).toEqual([]);
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
