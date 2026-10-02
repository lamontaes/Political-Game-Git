import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { serializeWorld, deserializeWorld } from "../serialization";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForceAtStart } from "../governing/law-in-force";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { taxRowRevenueChange } from "./fiscal";
import { CANNABIS_TAX_EFFECT } from "./rules";
import { TAX_QUESTION_EFFECTS } from "./rules";

const CANNABIS = "proposition_cannabis" as EntityId;
const QUESTIONS = { "business-commerce.legalize-cannabis-sales": CANNABIS };
interface Law {
  readonly question: EntityId;
  readonly answer: "yes" | "no";
  readonly effectiveAt: string;
}

function worldWith(stateKey: string, laws: readonly Law[]): World {
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  return {
    id: "world_test" as EntityId,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: Object.fromEntries(
        Object.entries(QUESTIONS).map(([key, id]) => [
          id,
          { id, stableKey: `us-policy-positions:${key}` },
        ]),
      ),
    },
    history: {
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId,
        propositionIds: [law.question],
        propositionAnswers: [
          { propositionId: law.question, answer: law.answer },
        ],
      })),
      legislativeEnactments: laws.map((law, at) => ({
        id: `enactment_${at}` as EntityId,
        sequence: 1000 + at,
        measureId: `measure_${at}` as EntityId,
        resolvedAt: makeIsoDate(law.effectiveAt),
        outcome: "enacted",
        effectiveAt: makeIsoDate(law.effectiveAt),
      })),
    },
  } as unknown as World;
}

const seed = "team6-cannabis-revenue-20260930";
const probe = worldWith(lifePlaceStateIdentities()[0]!.jurisdictionKey, []);
function placeWith(answer: "yes" | "no") {
  const eligible = lifePlaceStateIdentities().filter((place) => {
    const state = stateJurisdictionForKey(place.jurisdictionKey)!;
    return (
      lawInForceAtStart(probe, state.id, CANNABIS, probe.currentDate) === answer
    );
  });
  const place =
    eligible[new SeededRng(seed + answer).integer(0, eligible.length)]!;
  return place.jurisdictionKey;
}
function budget(stateKey: string) {
  return {
    level: "state" as const,
    lawJurisdictionId: stateJurisdictionForKey(stateKey)!.id,
    population: 1000,
  };
}

// Frozen existing financial contract for the data-row migration, not a sales receipt.
describe("cannabis tax-row migration preserves the existing financial contract", () => {
  it("retains the existing sourced amount, retail lag, selective-tax destination and basis", () => {
    const row = TAX_QUESTION_EFFECTS.find(
      (entry) =>
        entry.questionKey ===
        "us-policy-positions:business-commerce.legalize-cannabis-sales",
    );
    expect(CANNABIS_TAX_EFFECT.perResidentRevenue.annualAmount).toBe(40.7);
    expect(CANNABIS_TAX_EFFECT.perResidentRevenue.firstSaleLagMonths).toBe(11);
    expect(row?.source).toBe("selectiveSalesTaxes");
    expect(row?.toYes).toBeNull();
    expect(row?.toNo).toBeNull();
    expect(row?.basis).toContain("Marijuana Policy Project");
  });
  it("reads the supplied row amount, lag and scope rather than a named-law constant", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
    ]);
    const original = CANNABIS_TAX_EFFECT.perResidentRevenue;
    const row = {
      ...CANNABIS_TAX_EFFECT,
      levels: ["city"] as const,
      perResidentRevenue: {
        annualAmount: original.annualAmount * 2,
        firstSaleLagMonths: original.firstSaleLagMonths - 1,
      },
    };
    const government = { ...budget(place), level: "city" as const };
    expect(
      taxRowRevenueChange(world, government, row, makeIsoDate("2027-01-28")),
    ).toEqual({
      reason: "sales-legalized",
      annualRevenueDelta:
        row.perResidentRevenue.annualAmount * government.population,
      sourceMeasureId: "measure_0",
    });
    expect(
      taxRowRevenueChange(world, budget(place), row, makeIsoDate("2027-01-28")),
    ).toEqual({
      reason: "not-state-budget",
      annualRevenueDelta: 0,
      sourceMeasureId: null,
    });
    const withoutRevenue = { ...row, perResidentRevenue: undefined };
    expect(
      taxRowRevenueChange(
        world,
        government,
        withoutRevenue,
        makeIsoDate("2027-01-28"),
      ),
    ).toEqual({
      reason: "not-per-resident-row",
      annualRevenueDelta: 0,
      sourceMeasureId: null,
    });
  });
  it("preserves adoption timing, annual amount, law attribution and read-only reload parity", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
    ]);
    const before = JSON.stringify(world);
    const government = budget(place);
    expect(
      taxRowRevenueChange(
        world,
        government,
        CANNABIS_TAX_EFFECT,
        makeIsoDate("2027-01-31"),
      ),
    ).toEqual({
      reason: "waiting-for-retail",
      annualRevenueDelta: 0,
      sourceMeasureId: null,
    });
    const expected = {
      reason: "sales-legalized",
      annualRevenueDelta: 40_700,
      sourceMeasureId: "measure_0",
    };
    expect(
      taxRowRevenueChange(
        world,
        government,
        CANNABIS_TAX_EFFECT,
        makeIsoDate("2027-02-28"),
      ),
    ).toEqual(expected);
    expect(
      taxRowRevenueChange(
        JSON.parse(before) as World,
        government,
        CANNABIS_TAX_EFFECT,
        makeIsoDate("2027-02-28"),
      ),
    ).toEqual(expected);
    expect(JSON.stringify(world)).toBe(before);
  });
  it("preserves immediate repeal loss and earlier unchanged reading", () => {
    const place = placeWith("yes");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "no", effectiveAt: "2026-04-01" },
    ]);
    expect(
      taxRowRevenueChange(
        world,
        budget(place),
        CANNABIS_TAX_EFFECT,
        makeIsoDate("2026-03-31"),
      ).reason,
    ).toBe("same-answer");
    expect(
      taxRowRevenueChange(
        world,
        budget(place),
        CANNABIS_TAX_EFFECT,
        makeIsoDate("2026-04-01"),
      ),
    ).toEqual({
      reason: "sales-ended",
      annualRevenueDelta: -40_700,
      sourceMeasureId: "measure_0",
    });
  });
  it("preserves unknown-law refusal and state-only scope", () => {
    const place = placeWith("no");
    const world = worldWith(place, [
      { question: CANNABIS, answer: "yes", effectiveAt: "2026-03-01" },
    ]);
    expect(
      taxRowRevenueChange(
        world,
        {
          ...budget(place),
          lawJurisdictionId: "jurisdiction_unresearched" as EntityId,
        },
        CANNABIS_TAX_EFFECT,
        makeIsoDate("2027-03-01"),
      ),
    ).toEqual({
      reason: "starting-law-not-established",
      annualRevenueDelta: 0,
      sourceMeasureId: null,
    });
    for (const level of ["county", "city"] as const)
      expect(
        taxRowRevenueChange(
          world,
          { ...budget(place), level },
          CANNABIS_TAX_EFFECT,
          makeIsoDate("2027-03-01"),
        ),
      ).toEqual({
        reason: "not-state-budget",
        annualRevenueDelta: 0,
        sourceMeasureId: null,
      });
  });
});

it("opens one new game in a random place with the retired-module row", () => {
  const openingSeed = "a17-existing-row-new-game";
  const place = drawRandomPlace(openingSeed);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: place.key,
    seed: openingSeed,
  });
  expect(game.world.people[game.playerPersonId]).toBeDefined();
  const question = Object.values(game.world.policyCatalog.propositions).find(
    (row) => row.stableKey === CANNABIS_TAX_EFFECT.questionKey,
  );
  expect(question).toBeDefined();
  const rows = TAX_QUESTION_EFFECTS.filter(
    (row) => row.questionKey === question!.stableKey,
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toBe(CANNABIS_TAX_EFFECT);
  const government = {
    level: "state" as const,
    lawJurisdictionId: stateJurisdictionForKey(place.stateJurisdictionKey!)!.id,
    population: 1000,
  };
  const reading = taxRowRevenueChange(
    game.world,
    government,
    CANNABIS_TAX_EFFECT,
    game.world.currentDate,
  );
  const bytes = serializeWorld(game.world);
  const loaded = deserializeWorld(bytes);
  expect(
    taxRowRevenueChange(
      loaded,
      government,
      CANNABIS_TAX_EFFECT,
      loaded.currentDate,
    ),
  ).toEqual(reading);
  expect(loaded.people[game.playerPersonId]).toEqual(
    game.world.people[game.playerPersonId],
  );
  console.info(
    "A17_NEW_GAME",
    JSON.stringify({
      seed: openingSeed,
      place: place.key,
      jurisdiction: place.stateJurisdictionKey,
      playerId: game.playerPersonId,
      reading,
    }),
  );
});
