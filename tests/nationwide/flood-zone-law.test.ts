import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { observerPlace } from "../../src/presentation/observer-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  crisisRecords,
  declareHazardEpisode,
  disasterAssessment,
  householdLocationAt,
} from "../../src/simulation";
import { makeIsoDate } from "../../src/simulation/dates";
import { lawInForceAtStart } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import {
  FLOOD_DAMAGE_OUTCOME,
  OUTCOME_WEB_CALIBRATED_AT,
  outcomeFactor,
} from "../../src/simulation/outcome-web";
import { placeOutcomeKey } from "../../src/simulation/outcome-web/place-outcomes";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation/types";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";

/*
 * A state law that keeps new building out of flood zones means a flood
 * damages fewer homes once its lag has passed, and repealing one means more.
 * The place is drawn from all 56 by the seed.
 */

const QUESTION_KEY =
  "us-policy-positions:environment-energy.restrict-building-in-flood-zones";
const seed = "flood-zone-law-1";
const place = observerPlace(seed);

describe(`a flood-zone building law and flood damage (${place.displayName})`, () => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
      questionnaire: "skipped",
    }),
  ).game!;
  const home = householdLocationAt(
    game.world,
    game.world.history.households[0]!.id,
  )!.jurisdictionId;
  const stateKey = placeOutcomeKey(home)!;
  const state = stateJurisdictionForKey(stateKey)!.id;
  const question = Object.values(game.world.policyCatalog.propositions).find(
    (proposition) => proposition.stableKey === QUESTION_KEY,
  )!;

  /** The world three years on, with or without a state law changing the answer. */
  function world(answer: "yes" | "no" | null): World {
    const later = makeIsoDate("2030-01-05");
    const base: World = { ...game.world, currentDate: later };
    if (answer === null) return base;
    const measure: LegislativeMeasureRecord = {
      id: "measure_flood_zone_test" as EntityId,
      stableKey: "test:flood-zone",
      sequence: game.world.history.nextSequence,
      jurisdictionId: state,
      rulePackId: "test",
      designation: "HB 1",
      shortTitle: "A flood-zone building act",
      summary: "A test act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-10"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [question.id],
      propositionAnswers: [{ propositionId: question.id, answer }],
    };
    const enactment: LegislativeEnactmentRecord = {
      id: "enactment_flood_zone_test" as EntityId,
      stableKey: "test:flood-zone:enactment",
      sequence: game.world.history.nextSequence,
      measureId: measure.id,
      resolvedAt: makeIsoDate("2026-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2027-01-01"),
      outcomeEventId: "event_flood_zone_test" as EntityId,
    };
    return {
      ...base,
      history: {
        ...base.history,
        legislativeMeasures: [
          ...(base.history.legislativeMeasures ?? []),
          measure,
        ],
        legislativeEnactments: [
          ...(base.history.legislativeEnactments ?? []),
          enactment,
        ],
      },
    };
  }

  /** Homes a major flood damaged, over the same declared floods. */
  function homesDamaged(w: World): number {
    return withWorldIntegrityDeferred(() => {
      let total = 0;
      for (let index = 0; index < 5; index += 1) {
        const next = declareHazardEpisode(w, {
          stableKey: `flood-zone-test-${index}`,
          family: "flood",
          magnitude: "major",
          stateUsps: stateKey.slice(3),
          jurisdictionIds: [home],
          durationDays: 4,
          basis: "Declared test episode; not a local hazard prediction.",
          sourceReference: null,
        });
        const episode = crisisRecords(next).findLast(
          (record) => record.kind === "hazard-episode",
        )!;
        const assessment = disasterAssessment(next, episode.id)!;
        total += assessment.damaged.household + assessment.damaged.dwelling;
      }
      return total;
    });
  }

  it("fewer homes flood once the law has kept building out of the zone, more after a repeal", () => {
    const began = lawInForceAtStart(
      game.world,
      state,
      question.id,
      OUTCOME_WEB_CALIBRATED_AT,
    );
    const changed = began === "yes" ? "no" : "yes";
    const withChange = world(changed);
    const factor = outcomeFactor(
      withChange,
      home,
      FLOOD_DAMAGE_OUTCOME,
      withChange.currentDate,
    ).multiplier;
    const without = homesDamaged(world(null));
    const withLaw = homesDamaged(withChange);
    expect(without).toBeGreaterThan(20);
    if (changed === "yes") {
      expect(factor).toBeLessThan(1);
      expect(withLaw).toBeLessThan(without);
    } else {
      expect(factor).toBeGreaterThan(1);
      expect(withLaw).toBeGreaterThan(without);
    }
    // Keeping the law the place began with changes nothing.
    expect(homesDamaged(world(began === "yes" ? "yes" : "no"))).toBe(without);
  });
});
