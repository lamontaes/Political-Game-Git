/** A Nashville game in which Congress has raised the federal minimum wage. */
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import { recordWorldEvent } from "../../src/simulation/world";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

export const NASHVILLE = "4752006";
const POLICY = createProductionPolicyCatalog();
const RAISE_QUESTION = POLICY.propositionOrder.find(
  (id) =>
    POLICY.propositions[id]!.stableKey ===
    "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
)!;

/**
 * A Nashville game in which Congress has answered "should the federal minimum
 * wage go up?" yes, in force `effectiveInDays` after the game opens. The Act
 * is recorded the way the legislative route records one; it carries no
 * dollar figure, so the raise is the marked placeholder rate.
 */
export function nashvilleWithFederalRaise(effectiveInDays: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "town-federal-minimum-wage-nashville",
      placeKey: NASHVILLE,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const opened = game.world.currentDate;
  const nashville = lifePlaceByKey(NASHVILLE)!.context.jurisdiction;
  const recorded = recordWorldEvent(game.world, {
    stableKey: "event:test:federal-wage:enacted",
    type: "legislation.measure-enacted",
    occurredAt: opened,
    recordedAt: opened,
    jurisdictionId: nashville.id,
    involvedEntityIds: [game.playerPersonId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.enacted"],
    summary: "H.R. 1 became law.",
    context: {
      location: {
        jurisdictionId: nashville.id,
        label: nashville.name,
        setting: null,
      },
      socialContext: "The measure completed every required step.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const measure: LegislativeMeasureRecord = {
    id: "measure_federal_wage" as EntityId,
    stableKey: "test:federal-wage",
    sequence: 1,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "us-congress-v1",
    designation: "H.R. 1",
    shortTitle: "Raise the federal minimum wage",
    summary: "A test Act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: opened,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [RAISE_QUESTION],
    propositionAnswers: [{ propositionId: RAISE_QUESTION, answer: "yes" }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_federal_wage" as EntityId,
    stableKey: "test:federal-wage:enactment",
    sequence: 1_000_001,
    measureId: measure.id,
    resolvedAt: opened,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: addDays(opened, effectiveInDays),
    outcomeEventId: recorded.history.events.find(
      (event) => event.stableKey === "event:test:federal-wage:enacted",
    )!.id,
  };
  const world = {
    ...recorded,
    policyCatalog: POLICY,
    history: {
      ...recorded.history,
      legislativeMeasures: [
        ...(recorded.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(recorded.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  } as World;
  return { world, opened, effectiveAt: enactment.effectiveAt! };
}

export function onDate(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}
