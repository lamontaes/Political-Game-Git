/// <reference types="node" />
import { afterAll, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
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
import { resourcePositionAt } from "../resource-queries";
import { personTrait } from "../people-traits";
import { personName } from "../people";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceFlowTerms,
  money,
} from "../resources";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { recordWorldEvent, withWorldIntegrityDeferred } from "../world";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../types";
import {
  collectTownRent,
  hudRentRowFor,
  housingLawYes,
  renewTownLeases,
  RENT_LAW_KEYS,
  startTownLeases,
  townLeases,
} from "./town-rent";

// Authored price-path inputs exercise the existing cap; no production price changes.
vi.mock("./housing-market", () => ({
  homePriceLevel: (_world: World, _town: EntityId, date: string) =>
    date >= "2027-01-01" ? 1.4 : 1,
}));
const SEED = "team4-town-rent-stamps-20260930";
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM4_RECORD_RENT_STAMPS === "1")
    writeFileSync(
      "/tmp/team4-rent-stamp-fixture-receipt.json",
      JSON.stringify(
        {
          seed: SEED,
          proof:
            "controlled writer fixtures; not nationwide or natural enactment",
          receipts,
        },
        null,
        2,
      ),
    );
});
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
const provenance = {
  kind: "authored" as const,
  note: "Controlled rent stamp writer fixture.",
};
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
    sequence: 900001,
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
    sequence: 900002,
    measureId: id,
    resolvedAt: makeIsoDate(effective),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effective),
    outcomeEventId: world.history.events.at(-1)!.id,
  };
  return {
    ...world,
    jurisdictions: { ...world.jurisdictions, [jurisdiction.id]: jurisdiction },
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

describe("saved town rent consequences retain governing laws", () => {
  it.each(places)(
    "stamps actual capped renewal, affordable lease and represented case in %s",
    (placeKey) =>
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
        const terms = renewed.history.resourceFlowTerms.find(
          (row) => row.stableKey === `${lease.flow.stableKey}:renewal:1`,
        )!;
        expect(terms.reason).toContain("Rent stabilization");
        expect(terms.lawEffectStamps?.[0]).toMatchObject({
          questionKey: RENT_LAW_KEYS.rentStabilization,
          effectKind: "price-cost",
          jurisdictionId: town,
          appliedAt: due,
        });
        expect(isLawEffectStamp(terms.lawEffectStamps![0])).toBe(true);
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

        let affordable = enact(
          world,
          town,
          RENT_LAW_KEYS.inclusionary,
          "yes",
          effective,
        );
        affordable = {
          ...affordable,
          history: {
            ...affordable.history,
            dwellings: affordable.history.dwellings.map((row) =>
              row.id === lease.dwellingId
                ? {
                    ...row,
                    classification: "residential:apartment" as const,
                    establishedAt: addDays(effective, 1),
                  }
                : row,
            ),
            housingTenures: [
              ...affordable.history.housingTenures,
              {
                ...affordable.history.housingTenures.find(
                  (row) => row.id === lease.tenureId,
                )!,
                id: `${lease.tenureId}:affordable` as EntityId,
                stableKey: "test:affordable-tenure",
              },
            ],
            housingTenureStates: [
              ...affordable.history.housingTenureStates.map((row) => ({
                ...row,
                status: "ended" as const,
              })),
              {
                ...affordable.history.housingTenureStates.find(
                  (row) => row.housingTenureId === lease.tenureId,
                )!,
                id: `${lease.tenureId}:affordable:state` as EntityId,
                stableKey: "test:affordable-tenure:state",
                housingTenureId: `${lease.tenureId}:affordable` as EntityId,
                status: "active" as const,
              },
            ],
            resourceObligationStates:
              affordable.history.resourceObligationStates.map((row) =>
                row.resourceObligationId === lease.obligationId
                  ? { ...row, status: "ended" as const }
                  : row,
              ),
            resourceObligations: affordable.history.resourceObligations.map(
              (row) =>
                row.id === lease.obligationId
                  ? { ...row, stableKey: `${row.stableKey}:prior` }
                  : row,
            ),
            resourceFlows: affordable.history.resourceFlows.map((row) =>
              row.id === lease.flow.id
                ? { ...row, stableKey: `${row.stableKey}:prior` }
                : row,
            ),
            resourceFlowTerms: affordable.history.resourceFlowTerms.map(
              (row) =>
                row.resourceFlowId === lease.flow.id
                  ? { ...row, stableKey: `${row.stableKey}:prior` }
                  : affordable.history.resourceFlows.find(
                        (flow) => flow.id === row.resourceFlowId,
                      )?.basisKind === "compensation:work"
                    ? { ...row, amount: money(100_00, "USD") }
                    : row,
            ),
          },
        };
        affordable = createResourceFlow(affordable, {
          stableKey: "fixture-income",
          source: lease.flow.recipient,
          recipient: lease.flow.source,
          startsAt: due,
          amount: money(100_00, "USD"),
          cadenceKind: "schedule:monthly",
          basisKind: "compensation:work",
          basisReference: { kind: "housing", housingTenureId: lease.tenureId },
          restrictionKind: null,
          jurisdictionId: town,
          provenance,
        });
        const letWorld = startTownLeases(affordable, due);
        const newLease = townLeases(letWorld, due).find(
          (row) =>
            row.tenureId === `${lease.tenureId}:affordable` && !row.ended,
        )!;
        expect(newLease.regime).toBe("affordable");
        const affordableTerms = letWorld.history.resourceFlowTerms.find(
          (row) => row.resourceFlowId === newLease.flow.id,
        )!;
        expect(affordableTerms.lawEffectStamps?.[0]).toMatchObject({
          questionKey: RENT_LAW_KEYS.inclusionary,
          effectKind: "price-cost",
        });
        const legacyAffordable = recordResourceFlowTerms(letWorld, {
          stableKey: "test:legacy-affordable-terms",
          resourceFlowId: newLease.flow.id,
          effectiveAt: addDays(due, -1),
          status: "active",
          amount: money(
            Math.round(affordableTerms.amount.minorUnits * 0.9),
            "USD",
          ),
          cadenceKind: affordableTerms.cadenceKind,
          reason: "Controlled prior-year affordable rent.",
          provenance,
          supersedesTermsId: affordableTerms.id,
        });
        const affordableRenewed = renewTownLeases(legacyAffordable, due);
        const affordableRenewal =
          affordableRenewed.history.resourceFlowTerms.find(
            (row) => row.stableKey === `${newLease.flow.stableKey}:renewal:1`,
          )!;
        expect(affordableRenewal.amount).toEqual({
          ...affordableTerms.amount,
          minorUnits: Math.round(affordableTerms.amount.minorUnits / 100) * 100,
        });
        expect(affordableRenewal.lawEffectStamps?.[0]).toMatchObject({
          questionKey: RENT_LAW_KEYS.inclusionary,
          governingLawKey: affordableTerms.lawEffectStamps![0]!.governingLawKey,
        });

        let counsel = enact(
          world,
          town,
          RENT_LAW_KEYS.rightToCounsel,
          "yes",
          effective,
        );
        counsel = {
          ...counsel,
          control: { kind: "observer" },
          history: { ...counsel.history, resourceTransferOutcomes: [] },
        };
        counsel = createResourcePosition(counsel, {
          stableKey: "fixture-rent-cash",
          owner: { kind: "person", personId: lease.leaseholderId },
          openedAt: effective,
          openingBalance: money(0, "USD"),
          provenance,
        });
        // Recorded zero cash makes missed rent observable, rather than unknown.
        const first = addDays(due, 35);
        const firstMonth = makeIsoDate(`${first.slice(0, 7)}-01`);
        let cases = collectTownRent(atDate(counsel, firstMonth), firstMonth);
        cases = collectTownRent(
          atDate(cases, `${addDays(first, 35).slice(0, 7)}-01`),
          makeIsoDate(`${addDays(first, 35).slice(0, 7)}-01`),
        );
        cases = collectTownRent(
          atDate(cases, `${addDays(first, 70).slice(0, 7)}-01`),
          makeIsoDate(`${addDays(first, 70).slice(0, 7)}-01`),
        );
        cases = collectTownRent(
          atDate(cases, `${addDays(first, 105).slice(0, 7)}-01`),
          makeIsoDate(`${addDays(first, 105).slice(0, 7)}-01`),
        );
        const represented = cases.history.events.filter((row) =>
          (row as typeof row & LawEffectStampedRecord).lawEffectStamps?.some(
            (stamp) =>
              stamp.questionKey === RENT_LAW_KEYS.rightToCounsel &&
              stamp.sourceRecordIds?.includes(lease.flow.id),
          ),
        );
        expect(
          represented.length,
          JSON.stringify({
            law: housingLawYes(
              cases,
              town,
              RENT_LAW_KEYS.rightToCounsel,
              effective,
            ),
            events: cases.history.events
              .filter(
                (row) =>
                  row.type.startsWith("housing.eviction") ||
                  row.type === "housing.evicted",
              )
              .map((row) => ({ date: row.occurredAt, summary: row.summary })),
          }),
        ).toBeGreaterThan(0);
        const reopened = JSON.parse(
          JSON.stringify({ renewed, letWorld, affordableRenewed, cases }),
        );
        expect(
          reopened.renewed.history.resourceFlowTerms.find(
            (row: { id: string }) => row.id === terms.id,
          ).lawEffectStamps,
        ).toEqual(terms.lawEffectStamps);
        expect(
          reopened.letWorld.history.resourceFlowTerms.find(
            (row: { id: string }) => row.id === affordableTerms.id,
          ).lawEffectStamps,
        ).toEqual(affordableTerms.lawEffectStamps);
        expect(
          reopened.affordableRenewed.history.resourceFlowTerms.find(
            (row: { id: string }) => row.id === affordableRenewal.id,
          ).lawEffectStamps,
        ).toEqual(affordableRenewal.lawEffectStamps);
        for (const event of represented) {
          const saved = event as typeof event & LawEffectStampedRecord;
          expect(
            reopened.cases.history.events.find(
              (row: { id: string }) => row.id === event.id,
            ).lawEffectStamps,
          ).toEqual(saved.lawEffectStamps);
          expect(saved.lawEffectStamps![0]!.sourceRecordIds).toContain(
            event.id,
          );
        }
        receipts.push({
          placeKey,
          placeName: lifePlaceByKey(placeKey)!.context.jurisdiction.name,
          tenantPersonId: lease.leaseholderId,
          tenantName: personName(world.people[lease.leaseholderId]!),
          affordableTenantPersonId: newLease.leaseholderId,
          affordableTenantName: personName(
            letWorld.people[newLease.leaseholderId]!,
          ),
          cappedRenewal: terms,
          affordableLease: affordableTerms,
          affordableRenewal,
          representedCases: represented.map((event) => ({
            id: event.id,
            occurredAt: event.occurredAt,
            involvedEntityIds: event.involvedEntityIds,
            summary: event.summary,
            lawEffectStamps: (event as typeof event & LawEffectStampedRecord)
              .lawEffectStamps,
          })),
        });
        console.info(
          JSON.stringify({
            placeKey,
            tenant: personName(world.people[lease.leaseholderId]!),
            seed: SEED,
            cappedRentMinor: terms.amount.minorUnits,
            affordableRentMinor: affordableTerms.amount.minorUnits,
            representedCases: represented.length,
          }),
        );
      }),
  );
});
