import { describe, expect, it, vi } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import {
  campaignLifeOutreachTransitionHandler,
  ensureCampaignLifeOutreach,
} from "../../campaign-life-activities";
import { campaignLifeActivityRecords } from "../../campaign-queries";
import { CAMPAIGN_LIFE_OUTREACH_KEY } from "../../campaign-life-types";
import * as decisionEngine from "../../decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { ensureLivingWorldOpening } from "../../living-world/opening";
import {
  ensureHomePartyChapters,
  homePartyChapters,
} from "../../living-world/party-chapters";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import { deserializeWorld, serializeWorld } from "../../serialization";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  World,
} from "../../types";

const TRAIT = "personality-v1:facet-mischievous";
const SEED = "session132-facet-mischievous-generated-proof";

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
      ? "facet-mischievous:high"
      : "facet-mischievous:unmarked",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Controlled change of mischievousness for the generated person's decision proof.",
    }),
    supersedesTendencyId: null,
  });
}

function canonical(reasons: readonly DecisionConsideration[]) {
  return [...reasons].sort((left, right) =>
    left.stableKey.localeCompare(right.stableKey),
  );
}

describe("facet-mischievous's social-life reader", () => {
  it("changes a named generated organizer's production outreach without changing another actor", () => {
    const rng = new SeededRng(SEED);
    const state = rng.pick(lifePlaceStateIdentities());
    const place = rng.pick(
      searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state.jurisdictionKey,
      }),
    );
    const captured: DecisionEvaluation[] = [];
    const evaluate = decisionEngine.evaluateDecision;
    const spy = vi
      .spyOn(decisionEngine, "evaluateDecision")
      .mockImplementation((world, context) => {
        const result = evaluate(world, context);
        if (context.decisionType === "campaign.organizer-outreach")
          captured.push(result);
        return result;
      });
    try {
      // Preserve every generated trait. Look for a naturally compatible
      // organizer instead of requiring their entire outreach reading to be empty.
      // All candidates are produced by the canonical chapter writer.
      const findScenario = () => {
        for (let attempt = 0; attempt < 1; attempt += 1) {
          const gameSeed = `${SEED}:world:${attempt}`;
          const game = createNewGameWorld({
            ...DEFAULT_NEW_GAME_SETUP,
            startKind: "custom",
            seed: gameSeed,
            startAge: 40,
            depth: "summarize-earlier-life",
            questionnaire: "skipped",
            placeKey: place.key,
          });
          const base = ensureHomePartyChapters(
            ensureLivingWorldOpening(game.world, game.playerPersonId),
            game.playerPersonId,
          );
          for (const chapter of homePartyChapters(base)) {
            const actorId = chapter.organizerPersonId;
            if (!actorId || actorId === game.playerPersonId) continue;
            const scheduled = ensureCampaignLifeOutreach(
              base,
              game.playerPersonId,
              chapter.organizationId,
            );
            const item = scheduled.history.futureDueItems.find(
              (candidate) =>
                candidate.transitionKey === CAMPAIGN_LIFE_OUTREACH_KEY &&
                candidate.entityIds.includes(chapter.organizationId),
            );
            if (!item) continue;
            const unmarked = confer(scheduled, actorId, false);
            const marked = confer(scheduled, actorId, true);
            const beforeStart = captured.length;
            const before = campaignLifeOutreachTransitionHandler(
              unmarked,
              item,
            );
            const beforeEvaluation =
              captured.length > beforeStart ? captured.at(-1) : undefined;
            const afterStart = captured.length;
            const after = campaignLifeOutreachTransitionHandler(marked, item);
            const afterEvaluation =
              captured.length > afterStart ? captured.at(-1) : undefined;
            if (
              beforeEvaluation &&
              afterEvaluation &&
              beforeEvaluation.selectedOptionKey !== "town-hall" &&
              afterEvaluation.selectedOptionKey === "town-hall" &&
              after.reasonKey === "campaign:offered"
            ) {
              return {
                game,
                gameSeed,
                base,
                actorId,
                item,
                unmarked,
                marked,
                before,
                beforeEvaluation,
                after,
                afterEvaluation,
              };
            }
          }
        }
        return undefined;
      };
      const scenario = findScenario();
      expect(scenario).toBeDefined();
      if (!scenario)
        throw new Error(
          "No naturally compatible outreach organizer in the canonical generated world.",
        );
      const {
        game,
        gameSeed,
        base,
        actorId,
        item,
        unmarked,
        marked,
        before,
        beforeEvaluation,
        after,
        afterEvaluation,
      } = scenario;
      expect(personName(base.people[actorId]!)).not.toBe("");
      expect(beforeEvaluation.context.actorPersonId).toBe(actorId);
      expect(afterEvaluation.context.actorPersonId).toBe(actorId);
      expect(beforeEvaluation.selectedOptionKey).not.toBe("town-hall");
      expect(afterEvaluation.selectedOptionKey).toBe("town-hall");
      expect(after.reasonKey).toBe("campaign:offered");
      expect(campaignLifeActivityRecords(after.world).at(-1)?.form).toBe(
        "town-hall",
      );
      expect(
        canonical(
          afterEvaluation.context.considerations.filter(
            ({ sourceType }) => sourceType !== "mind:personality",
          ),
        ),
      ).toEqual(
        canonical(
          beforeEvaluation.context.considerations.filter(
            ({ sourceType }) => sourceType !== "mind:personality",
          ),
        ),
      );
      // Every other personality reason must survive the controlled change.
      const unrelated = (reasons: readonly DecisionConsideration[]) =>
        canonical(
          reasons.filter(
            ({ stableKey }) => !stableKey.includes(`:trait:${TRAIT}:`),
          ),
        );
      expect(unrelated(afterEvaluation.context.considerations)).toEqual(
        unrelated(beforeEvaluation.context.considerations),
      );
      expect(afterEvaluation.context.considerations).toContainEqual(
        expect.objectContaining({
          optionKey: "town-hall",
          sourceType: "mind:personality",
          explanation:
            "They favor a social gathering with room for playful exchanges that test small social boundaries.",
        }),
      );
      expect(afterEvaluation.context.cutoff.historySequenceExclusive).toBe(
        marked.history.nextSequence,
      );
      expect(beforeEvaluation.context.cutoff.historySequenceExclusive).toBe(
        unmarked.history.nextSequence,
      );
      const peer = Object.values(base.people).find(
        ({ id }) => id !== actorId && id !== game.playerPersonId,
      );
      expect(peer).toBeDefined();
      if (!peer)
        throw new Error("No generated peer for the unchanged control.");
      expect(
        canonical(
          registeredTraitConsiderations(
            marked,
            loadedTraitRegistry(),
            peer.id,
            SEED,
            "campaign.organizer-outreach",
            game.playerPersonId,
          ),
        ),
      ).toEqual(
        canonical(
          registeredTraitConsiderations(
            unmarked,
            loadedTraitRegistry(),
            peer.id,
            SEED,
            "campaign.organizer-outreach",
            game.playerPersonId,
          ),
        ),
      );
      const reloaded = deserializeWorld(serializeWorld(marked));
      const replayed = campaignLifeOutreachTransitionHandler(reloaded, item);
      expect(replayed.reasonKey).toBe(after.reasonKey);
      expect(canonical(captured.at(-1)!.context.considerations)).toEqual(
        canonical(afterEvaluation.context.considerations),
      );
      expect(campaignLifeActivityRecords(replayed.world).at(-1)?.form).toBe(
        "town-hall",
      );
      expect(
        registeredTraitConsiderations(
          marked,
          loadedTraitRegistry(),
          actorId,
          SEED,
          "legislation.member-vote",
        ).filter(({ stableKey }) => stableKey.includes(`:trait:${TRAIT}:`)),
      ).toEqual([]);
      for (const [decisionId, optionKey] of [
        ["campaign.support-request", "defer"],
        ["press.reporter-request-response", "accept"],
        ["press.adviser-assignment-response", "accept"],
      ]) {
        expect(
          registeredTraitConsiderations(
            marked,
            loadedTraitRegistry(),
            actorId,
            SEED,
            decisionId,
          ).filter(({ stableKey }) => stableKey.includes(`:trait:${TRAIT}:`)),
        ).toMatchObject([{ optionKey, sourceType: "mind:personality" }]);
      }
      console.info(
        JSON.stringify({
          seed: gameSeed,
          selectionSeed: SEED,
          place: place.displayName,
          worldId: base.id,
          person: personName(base.people[actorId]!),
          personId: actorId,
          before: beforeEvaluation.selectedOptionKey,
          after: afterEvaluation.selectedOptionKey,
          beforeReason: before.reasonKey,
          afterReason: after.reasonKey,
        }),
      );
    } finally {
      spy.mockRestore();
    }
  }, 60_000);
});
