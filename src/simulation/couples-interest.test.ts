import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { makeIsoDate } from "./dates";
import { createLifeMindCatalog, LIFE_MIND_IDS } from "./life-mind-content";
import { createMindProvenance, recordPersonalValue } from "./mind";
import { recordRelationshipInteraction } from "./records";
import { romanticConsiderations } from "./couples";
import {
  ROMANTIC_ORIENTATION_COHORTS,
  romanticOrientationCohortForBirthDate,
  seededRomanticOrientation,
} from "./romantic-orientation";
import { establishLifePersonality } from "./life-personality";
import { createWorld } from "./world";
import type { EntityId, World } from "./types";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";

function lifeWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: Object.values(demo.jurisdictions),
    people: demo.personOrder.map((id) => demo.people[id]!),
    mindCatalog: createLifeMindCatalog(),
  });
}

describe("romantic interest from time together", () => {
  it("cites repeated pair-specific interactions without exposing a score", () => {
    let world = createDemoWorld("couples-interest-recorded-time");
    const [answerer, asker] = world.personOrder;
    if (!answerer || !asker)
      throw new Error("Expected two people in demo world.");
    for (let index = 0; index < 3; index += 1) {
      world = recordRelationshipInteraction(world, {
        stableKey: `couples-interest:${index}`,
        personIds: [answerer, asker],
        eventId: null,
        occurredAt: world.currentDate,
        kind: "contact:conversation",
        change: "maintained",
        significance: "meaningful",
        summary: "They spent time together.",
        tags: ["work:shared-office"],
      });
    }
    const reasons = romanticConsiderations(world, "interest", answerer, asker);
    expect(reasons.map((reason) => reason.stableKey)).toContain(
      "interest:time-together",
    );
    expect(reasons.map((reason) => reason.stableKey)).toContain(
      "interest:shared-setting",
    );
    expect(
      reasons.find((reason) => reason.stableKey === "interest:time-together")
        ?.sourceRefs,
    ).toHaveLength(3);
    expect(JSON.stringify(reasons)).not.toMatch(
      /compatibility|score|percentage/i,
    );
  });

  it("records a private, stable cohort-calibrated orientation at birth", () => {
    const world = lifeWorld("couples-interest-orientation");
    const personId = world.personOrder[0]!;
    const person = world.people[personId]!;
    const established = establishLifePersonality(world, personId);
    const record = established.history.personalityTendencies.find(
      (candidate) =>
        candidate.personId === personId &&
        candidate.tendencyId === LIFE_MIND_IDS.romanticOrientation,
    );
    expect(record?.recordedAt).toBe(person.birthDate);
    expect(record?.scopeTags).toEqual(["life:romantic-orientation:private"]);
    expect(record?.confidence).toBe("low");
    expect(record?.expressionKey).toBe(
      seededRomanticOrientation(established, personId),
    );
    expect(
      establishLifePersonality(established, personId).history
        .personalityTendencies,
    ).toEqual(established.history.personalityTendencies);
    expect(
      romanticOrientationCohortForBirthDate(makeIsoDate("1999-01-01"))
        .selfIdentificationShare,
    ).toBe(0.223);
    expect(ROMANTIC_ORIENTATION_COHORTS.at(-1)?.basis).toBe("estimated");
  });

  it("creates the private orientation record as part of a new game", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "couples-interest-new-game-orientation",
      startAge: 24,
      questionnaire: "skipped",
    });
    const playerRecord = game.world.history.personalityTendencies.find(
      (record) =>
        record.personId === game.playerPersonId &&
        record.tendencyId === LIFE_MIND_IDS.romanticOrientation,
    );
    expect(playerRecord?.recordedAt).toBe(
      game.world.people[game.playerPersonId]!.birthDate,
    );
    const livingPeople = game.world.personOrder.filter(
      (id) =>
        !game.world.history.personDeaths.some((death) => death.personId === id),
    );
    const withRecord = new Set(
      game.world.history.personalityTendencies
        .filter(
          (record) => record.tendencyId === LIFE_MIND_IDS.romanticOrientation,
        )
        .map((record) => record.personId),
    );
    expect(livingPeople.every((id) => withRecord.has(id))).toBe(true);
  });

  it("weighs shared recorded values without exposing a compatibility number", () => {
    let world = lifeWorld("couples-interest-values");
    const [answerer, asker] = world.personOrder as readonly [
      EntityId,
      EntityId,
      ...EntityId[],
    ];
    for (const [personId, suffix] of [
      [answerer, "answerer"],
      [asker, "asker"],
    ] as const) {
      world = recordPersonalValue(world, {
        stableKey: `couples-interest:value:${suffix}`,
        personId,
        valueId: LIFE_MIND_IDS.connection,
        recordedAt: world.currentDate,
        orientation: "embraces",
        strength: "moderate",
        salience: "moderate",
        qualification: null,
        provenance: createMindProvenance("authored"),
        supersedesValueId: null,
      });
    }
    expect(
      romanticConsiderations(world, "values", answerer, asker).find(
        (consideration) => consideration.stableKey === "values:shared-values",
      )?.sourceRefs,
    ).toHaveLength(2);
  });
});
