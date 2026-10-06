import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { ageOnDate } from "./dates";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { ensurePeopleTraitCatalog } from "./people-traits";
import { traitDefinitionFromPack, type RegisteredTrait } from "./trait-packs";
import { traitRegistryFor } from "./trait-registry";
import { decideAnotherTerm } from "./careers/another-term";
import { drawRandomPlace } from "../../tests/support/random-place";
import type { EntityId, World } from "./types";
import {
  PERSONALITY_TRAIT_READERS,
  traitsWithoutReaderOrDebt,
} from "./personality-trait-registry";

const TRAIT_KEY = "personality-v1:voluntary-effort";

function setVoluntaryEffort(
  world: World,
  personId: EntityId,
  trait: RegisteredTrait,
  pole: "low" | "high",
): World {
  const definition = traitDefinitionFromPack(trait);
  return recordPersonalityTendency(world, {
    stableKey: `test:${TRAIT_KEY}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles[pole].key,
    strength: "strong",
    confidence: "high",
    scopeTags: ["career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Controlled two-person trait comparison in a generated new game.",
    }),
    supersedesTendencyId: null,
  });
}

describe("voluntary effort in career choices", () => {
  it("is registered as a reader and no longer listed as unconnected debt", () => {
    expect(
      PERSONALITY_TRAIT_READERS.find(({ trait }) => trait === TRAIT_KEY),
    ).toMatchObject({
      kind: "decision",
      reader: "decideAnotherTerm — src/simulation/careers/another-term.ts",
    });
    expect(traitsWithoutReaderOrDebt()).not.toContain(TRAIT_KEY);
  });

  it("changes a named NPC's recorded choice in a random-place new game", () => {
    const seed = "session49-t9-voluntary-effort";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: place.key,
      household: "shares-a-home",
    });
    const base = ensurePeopleTraitCatalog(game.world);
    const candidates = Object.values(base.people)
      .filter(
        (person) =>
          person.id !== game.playerPersonId &&
          ageOnDate(person.birthDate, base.currentDate) >= 18 &&
          !base.history.personalityTendencies.some(
            (record) => record.personId === person.id,
          ),
      )
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const [highPersonId, lowPersonId] = candidates
      .slice(0, 2)
      .map(({ id }) => id);
    const pairedWorld = base;

    const trait = traitRegistryFor(pairedWorld).traits.get(TRAIT_KEY);
    expect(trait).toBeDefined();
    const definition = traitDefinitionFromPack(trait!);
    const withTraitDefinition: World = {
      ...pairedWorld,
      mindCatalog: {
        ...pairedWorld.mindCatalog,
        tendencies: {
          ...pairedWorld.mindCatalog.tendencies,
          [definition.id]: definition,
        },
        tendencyOrder: pairedWorld.mindCatalog.tendencies[definition.id]
          ? pairedWorld.mindCatalog.tendencyOrder
          : [...pairedWorld.mindCatalog.tendencyOrder, definition.id],
      },
    };
    const highWorld = setVoluntaryEffort(
      withTraitDefinition,
      highPersonId,
      trait!,
      "high",
    );
    const lowWorld = setVoluntaryEffort(
      withTraitDefinition,
      lowPersonId,
      trait!,
      "low",
    );
    const decision = {
      subjectKey: "same-recorded-public-office",
      onDate: base.currentDate,
      termEnds: base.currentDate,
      serving: [],
      decisionType: "election.consider-another-term",
      traitsPrepared: true,
    } as const;
    const high = decideAnotherTerm(highWorld, {
      ...decision,
      personId: highPersonId,
      stableKey: "session49:voluntary-effort:high",
    });
    const low = decideAnotherTerm(lowWorld, {
      ...decision,
      personId: lowPersonId,
      stableKey: "session49:voluntary-effort:low",
    });
    const highTrace = high.world.history.decisionTraces.at(-1)!;
    const lowTrace = low.world.history.decisionTraces.at(-1)!;
    const highReason = highTrace.context.considerations.find((row) =>
      row.stableKey.includes(TRAIT_KEY),
    );
    const lowReason = lowTrace.context.considerations.find((row) =>
      row.stableKey.includes(TRAIT_KEY),
    );

    expect(highTrace.selectedOptionKey).toBe("seek");
    expect(lowTrace.selectedOptionKey).toBe("step-down");
    expect(highReason).toMatchObject({
      optionKey: "seek",
      sourceType: "mind:personality",
      explanation: "They are willing to keep working at public service.",
    });
    expect(lowReason).toMatchObject({
      optionKey: "step-down",
      sourceType: "mind:personality",
      explanation: "They prefer not to take on another term's sustained work.",
    });
    console.info("T9 voluntary-effort random-place proof", {
      seed,
      placeKey: place.key,
      worldId: base.id,
      highPersonId,
      lowPersonId,
      highTrait: trait!.poles.high.key,
      highChoice: highTrace.selectedOptionKey,
      highTraceId: highTrace.id,
      highTraitRecordId:
        highReason?.sourceRefs[0]?.kind === "personality-tendency"
          ? highReason.sourceRefs[0].tendencyRecordId
          : null,
      lowTrait: trait!.poles.low.key,
      lowChoice: lowTrace.selectedOptionKey,
      lowTraceId: lowTrace.id,
      lowTraitRecordId:
        lowReason?.sourceRefs[0]?.kind === "personality-tendency"
          ? lowReason.sourceRefs[0].tendencyRecordId
          : null,
    });
  });
});
