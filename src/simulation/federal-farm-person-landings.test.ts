import { afterAll, describe, expect, it } from "vitest";
import {
  appendProgram,
  base,
  enact,
  procedure,
  provenance,
} from "../../tests/fixtures/funded-service-fixture";
import { cash } from "../../tests/fixtures/public-program-fixture";
import { addDays } from "./dates";
import {
  FARM_PAYMENT_QUESTION,
  exposeFarmPaymentCap,
} from "./federal-farm-payments";
import { programOperatorOrganization } from "./governing/program-governing";
import { settleProgramInstallment } from "./governing/public-program";
import { createOrganization, createWorkRelationship } from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { createResourcePosition, money } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrityFully, withWorldIntegrityDeferred } from "./world";
import type { PublicProgramCommitmentRecord, World } from "./types";

function fixture(stateKey: string) {
  const jurisdiction = stateJurisdictionForKey(stateKey)!;
  const national = NATIONAL_ELECTION_JURISDICTION.id;
  let world = ensureNationalElectionJurisdiction({
    ...base,
    jurisdictions: { ...base.jurisdictions, [jurisdiction.id]: jurisdiction },
    jurisdictionOrder: [
      ...new Set([...base.jurisdictionOrder, jurisdiction.id]),
    ],
  });
  world = enact(world, national, "yes", FARM_PAYMENT_QUESTION, [
    {
      questionKey: FARM_PAYMENT_QUESTION,
      key: "cap",
      value: 50_000,
      unit: "dollars/year",
    },
  ]);
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const key = `farm:person-${stateKey.toLowerCase()}`;
  world = createOrganization(world, {
    stableKey: key,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: key,
      classification: "enterprise:agriculture",
      locationJurisdictionId: jurisdiction.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `${key}:operator`,
    personId: procedure.playerPersonId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:agriculture",
    compensation: "paid",
    authority: "directs-others",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Farm manager",
      occupationClassification: null,
      locationJurisdictionId: jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 1, maximumHours: 1 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdiction.id,
      },
    },
  });
  const operator = programOperatorOrganization(world, key, jurisdiction.id);
  expect(operator.organizationId).toBe(organizationId);
  world = operator.world;
  world = createOrganization(world, {
    stableKey: `${key}:account`,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: `${key}:account`,
      classification: "sector:government",
      locationJurisdictionId: national,
    },
  });
  const accountId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: `${key}:cash`,
    owner: { kind: "organization", organizationId: accountId },
    openedAt: world.currentDate,
    openingBalance: money(20_000_000, "USD"),
    provenance,
  });
  const appropriation = appendProgram(
    world,
    national,
    "appropriation",
    {
      accountOrganizationId: accountId,
      amount: money(20_000_000, "USD"),
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 30),
      sourceMeasureId: measureId,
      basis: { kind: "authored-fixture", note: provenance.note },
    },
    key,
  );
  const committed = appendProgram(
    appropriation.world,
    national,
    "commitment",
    {
      appropriationId: appropriation.record.id,
      alternativeKey: key,
      alternativeTitle: key,
      decidedByPersonId: procedure.playerPersonId,
      authority: provenance.note,
      recipientOrganizationId: organizationId,
      installments: [0, 0].map(() => ({
        dueAt: world.currentDate,
        amount: money(10_000_000, "USD"),
        purpose: "operating",
      })),
      deliveryLeadDays: null,
    },
    key,
  );
  return {
    world: committed.world,
    commitment: committed.record as PublicProgramCommitmentRecord,
    organizationId,
    accountId,
  };
}

describe("federal farm caps reach recorded managers", () => {
  let audit: World;
  afterAll(() => assertWorldIntegrityFully(audit));
  it(
    "caps actual payment and records the manager's rule change in every one of 56 places",
    () =>
      withWorldIntegrityDeferred(() => {
        const places = lifePlaceStateIdentities();
        expect(places).toHaveLength(56);
        for (const place of places) {
          const f = fixture(place.jurisdictionKey);
          const paid = settleProgramInstallment(f.world, f.commitment.id, 0);
          expect(paid.installment?.status, place.jurisdictionKey).toBe(
            "posted",
          );
          expect(cash(paid.world, f.organizationId)).toBe(5_000_000);
          expect(cash(paid.world, f.accountId)).toBe(15_000_000);
          expect(
            paid.world.history.lawExposures?.find(
              (row) => row.sourceRecordId === paid.installment!.eventId,
            ),
          ).toMatchObject({
            personId: procedure.playerPersonId,
            channel: "business-rule",
            direction: "cost",
            amount: null,
          });
          const exhausted = settleProgramInstallment(
            paid.world,
            f.commitment.id,
            1,
          );
          expect(exhausted.installment?.status).toBe("failed");
          expect(exhausted.installment?.reason).toMatch(/cap is exhausted/);
          expect(
            exhausted.world.history.lawExposures?.find(
              (row) => row.sourceRecordId === exhausted.installment!.eventId,
            ),
          ).toMatchObject({
            personId: procedure.playerPersonId,
            direction: "cost",
          });
          expect(
            exposeFarmPaymentCap(exhausted.world, f.commitment, {
              ...exhausted.installment!,
              reason: "The appropriation lapsed before this payment fell due.",
            }),
          ).toBe(exhausted.world);
          expect(
            settleProgramInstallment(exhausted.world, f.commitment.id, 1).world,
          ).toBe(exhausted.world);
          audit = exhausted.world;
          if (place === places[0]) {
            const saved = deserializeWorld(serializeWorld(audit));
            expect(
              settleProgramInstallment(saved, f.commitment.id, 1).world,
            ).toBe(saved);
          }
        }
      }),
    30_000,
  );
});
