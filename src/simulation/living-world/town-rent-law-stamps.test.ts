/// <reference types="node" />
import { describe, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { addDays, makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import {
  lifePlaceByKey,
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { SeededRng } from "../rng";
import { resourceFlowTermsAt, resourcePositionAt } from "../resource-queries";
import { personTrait } from "../people-traits";
import { recordFiledProvision } from "../legislative-politics";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { money } from "../resources";
import { recordWorldEvent, withWorldIntegrityDeferred } from "../world";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";
import {
  hudRentRowFor,
  renewTownLeases,
  RENT_LAW_KEYS,
  startTownLeases,
  townLeases,
} from "./town-rent";
import { RENT_COVERAGE_VALUES } from "../law-consequences/rent-stabilization-row";

// Authored price-path inputs exercise the existing cap; no production price changes.
vi.mock("./housing-market", () => ({
  homePriceLevel: (_world: World, _town: EntityId, date: string) =>
    date >= "2027-01-01" ? 1.4 : 1,
}));
const SEED = "team4-town-rent-stamps-20260930";
const largest = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  const place = lifePlaceByKey(key);
  if (!place || !hudRentRowFor(place.context.jurisdiction.id)) continue;
  const state = place.stateJurisdictionKey;
  if (!state) continue;
  if ((largest.get(state)?.[1] ?? -1) < Number(count))
    largest.set(state, [key, Number(count)]);
}
const available = [...largest.values()].map(([key]) => key);
const rng = new SeededRng(SEED);
const places: string[] = [];
while (places.length < 5)
  places.push(...available.splice(rng.integer(0, available.length), 1));
function atDate(world: World, date: string): World {
  const day = makeIsoDate(date);
  return {
    ...world,
    currentDate: day,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
  };
}

function enact(
  world: World,
  town: EntityId,
  key: string,
  answer: "yes" | "no",
  effective: string,
): World {
  const stateKey = lifePlaceByJurisdictionId(town)!.stateJurisdictionKey;
  // Fixtures pass the actual sampled place's state via its town record below.
  const jurisdiction = stateJurisdictionForKey(stateKey!)!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === key,
  )!;
  const id = `measure_fixture_${key.split(".").at(-1)}_${answer}` as EntityId;
  world = recordWorldEvent(
    {
      ...world,
      jurisdictions: {
        ...world.jurisdictions,
        [jurisdiction.id]: jurisdiction,
      },
    },
    {
      stableKey: `test:${id}:event`,
      type: "law.enacted",
      occurredAt: makeIsoDate(effective),
      recordedAt: makeIsoDate(effective),
      jurisdictionId: jurisdiction.id,
      involvedEntityIds: [jurisdiction.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "Controlled enacted housing law.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    },
  );
  const measure: LegislativeMeasureRecord = {
    id,
    stableKey: `test:${id}`,
    sequence: world.history.nextSequence,
    jurisdictionId: jurisdiction.id,
    rulePackId: "test",
    designation: "Act 1",
    shortTitle: "Housing law",
    summary: "Controlled canonical law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate(effective),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `${id}:enactment` as EntityId,
    stableKey: `test:${id}:enactment`,
    sequence: 0,
    measureId: id,
    resolvedAt: makeIsoDate(effective),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effective),
    outcomeEventId: world.history.events.at(-1)!.id,
  };
  let next: World = {
    ...world,
    jurisdictions: { ...world.jurisdictions, [jurisdiction.id]: jurisdiction },
    history: {
      ...world.history,
      nextSequence: measure.sequence + 1,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
    },
  };
  if (key === RENT_LAW_KEYS.rentStabilization && answer === "yes") {
    next = recordFiledProvision(next, {
      stableKey: `test:${id}:provision`,
      measureId: id,
      provisionKey: "housing-rule",
      sectionNumber: 1,
      heading: "Housing rule fixture",
      text: "Controlled rent term fixture.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "Recorded market tenants",
      },
      applicationScope: { jurisdictionId: jurisdiction.id, segmentKey: null },
      lawCategories: [
        {
          questionKey: key,
          key: "coverage",
          values: RENT_COVERAGE_VALUES.filter((value) =>
            value.startsWith("market:"),
          ),
        },
      ],
      lawTerms: [{ questionKey: key, key: "cap", value: 0.1, unit: "ratio" }],
    });
  }
  const enactmentSequence = next.history.nextSequence;
  return {
    ...next,
    history: {
      ...next.history,
      nextSequence: enactmentSequence + 1,
      legislativeEnactments: [
        ...(next.history.legislativeEnactments ?? []),
        { ...enactment, sequence: enactmentSequence },
      ],
    },
  };
}

describe("saved town rent consequences apply recorded stabilization terms", () => {
  it.each(places)("applies the recorded rent cap in %s", (placeKey) =>
    withWorldIntegrityDeferred(() => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          placeKey,
          seed: `${SEED}:${placeKey}`,
          startAge: 24,
          questionnaire: "skipped",
        }),
      ).game!;
      let world = startTownLeases(game.world, game.world.currentDate);
      const town = lifePlaceByKey(placeKey)!.context.jurisdiction.id;
      const lease = townLeases(world).find(
        (row) =>
          row.town === town &&
          row.regime === "market" &&
          row.flow.recipient.kind === "person" &&
          personTrait(world, row.leaseholderId, "reliability").value >= 0 &&
          !resourcePositionAt(
            world,
            { kind: "person", personId: row.leaseholderId },
            money(0, "USD").currency,
          ),
      )!;
      expect(lease, `${placeKey} ${SEED}`).toBeDefined();
      const due = makeIsoDate(
        `${Number(lease.flow.startsAt.slice(0, 4)) + 1}${lease.flow.startsAt.slice(4)}`,
      );
      const effective = makeIsoDate("2026-01-01");
      world = enact(
        world,
        town,
        RENT_LAW_KEYS.rentStabilization,
        "yes",
        effective,
      );
      world = atDate(world, due);
      const renewed = renewTownLeases(world, due);
      const terms = resourceFlowTermsAt(renewed, lease.flow.id)!;
      expect(terms.reason).toContain("Price terms under");
      expect(terms.lawEffectStamps?.[0]).toMatchObject({
        questionKey: RENT_LAW_KEYS.rentStabilization,
        effectKind: "price-cost",
        jurisdictionId: town,
        appliedAt: due,
      });
      const prior = resourceFlowTermsAt(world, lease.flow.id)!;
      expect(terms.amount.minorUnits).toBe(
        Math.floor(prior.amount.minorUnits * 1.1),
      );
      expect(
        renewed.history.lawExposures?.some(
          (exposure) =>
            exposure.personId === lease.leaseholderId &&
            exposure.measureId === terms.lawEffectStamps![0]!.governingLawKey &&
            exposure.sourceRecordId === terms.id,
        ),
      ).toBe(true);
      expect(
        renewTownLeases(renewed, due).history.resourceFlowTerms,
      ).toHaveLength(renewed.history.resourceFlowTerms.length);
      const noCap = renewTownLeases(
        enact(
          world,
          town,
          RENT_LAW_KEYS.rentStabilization,
          "no",
          addDays(effective, 1),
        ),
        due,
      );
      expect(
        noCap.history.resourceFlowTerms.find(
          (row) => row.stableKey === terms.stableKey,
        )?.lawEffectStamps,
      ).toBeUndefined();
    }),
  );
});
