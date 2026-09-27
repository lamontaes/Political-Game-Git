import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { createOrganization } from "../life";
import { createResourcePosition, money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  ensurePublicGovernmentAccount,
  publicOrganizationKey,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import type { World } from "../types";
import { advanceWorld } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  programInstallments,
  programOutturns,
  programPosition,
  recordProgramAppropriation,
} from "./public-program";
import { programOperatorOrganization } from "./program-governing";
import { FIXTURE, cash } from "../../../tests/fixtures/public-program-fixture";

const PROGRAM_KEY = "passenger-rail:us";
const PAYMENT = money(100_000_00, "USD");

function advance(world: World, count: number): World {
  return advanceWorld(world, count, createCampaignElectionTransitionRegistry());
}

describe("federal public-program outlay metric", () => {
  it("records the posted service payment on its exact federal day and jurisdiction", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "federal-public-program-outlay-metric",
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game;
    if (!game) throw new Error("Expected an ordinary opening life.");

    let world = ensureNationalElectionJurisdiction(game.world);
    const president = currentPresidentOf(world);
    if (!president) throw new Error("Expected a sitting President.");
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const publicOrganizationId = publicOrganizationKey(jurisdictionId);
    world = createOrganization(world, {
      stableKey: publicOrganizationId,
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: FIXTURE.note },
      initialProfile: {
        name: "Federal public government",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const publicGovernment = world.history.organizations.at(-1)!;
    world = createResourcePosition(world, {
      stableKey: `${publicOrganizationId}:modeled-receipts:USD`,
      owner: { kind: "organization", organizationId: publicGovernment.id },
      openedAt: world.currentDate,
      openingBalance: money(150_000_00, "USD"),
      provenance: { kind: "authored", note: FIXTURE.note },
    });
    world = ensurePublicGovernmentAccount(world, {
      kind: "jurisdiction",
      jurisdictionId,
    });
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
    expect(account?.organizationId).toBe(publicGovernment.id);
    if (!account) throw new Error("Expected the federal public account.");

    world = declareProgramCapacity(world, {
      edition: "federal-outlay-metric",
      programKey: PROGRAM_KEY,
      jurisdictionId,
      serviceLabel: "Passenger rail service",
      unitLabel: "service units",
      unitsTotal: 1,
      unitsOperational: 0,
      monthlyOperatingNeed: money(1, "USD"),
      completedPermille: null,
      restorationCostPerUnit: PAYMENT,
      basis: FIXTURE,
    }).world;
    const written = recordProgramAppropriation(world, {
      edition: "federal-outlay-metric",
      programKey: PROGRAM_KEY,
      jurisdictionId,
      accountOrganizationId: account.organizationId,
      amount: money(150_000_00, "USD"),
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 30),
      basis: FIXTURE,
    });
    world = written.world;
    const appropriation = programAppropriations(world, PROGRAM_KEY).find(
      (record) => record.id === written.id,
    );
    if (!appropriation)
      throw new Error("The federal appropriation is missing.");

    const operator = programOperatorOrganization(
      world,
      PROGRAM_KEY,
      jurisdictionId,
    );
    world = operator.world;
    const dueAt = addDays(world.currentDate, 1);
    const committed = commitPublicProgram(world, {
      appropriationId: appropriation.id,
      alternative: {
        key: "federal-one-day-outlay-proof",
        title: "One federal service payment",
        installments: [
          { afterDays: 1, amount: PAYMENT, purpose: "maintenance" },
        ],
        deliveryLeadDays: 1,
      },
      personId: president.personId,
      office: { kind: "federal-executive" },
      recipientOrganizationId: operator.organizationId,
    });
    expect(committed.ok).toBe(true);
    if (!committed.ok) throw new Error(committed.reason);

    world = advance(committed.world, 1);
    const installment = programInstallments(world, PROGRAM_KEY).find(
      (record) => record.commitmentId === committed.recordId,
    );
    expect(installment).toMatchObject({ status: "posted", recordedAt: dueAt });
    if (!installment) throw new Error("The federal payment did not post.");
    const metricId = Object.values(world.metricCatalog.definitions).find(
      (definition) => definition.stableKey === "government.outlays",
    )?.id;
    expect(metricId).toBeDefined();
    const metric = world.history.metricStates.find(
      (record) => record.metricId === metricId,
    );
    expect(metric).toMatchObject({
      scope: { jurisdictionId, segmentKey: null },
      referencePeriod: { kind: "interval", startsAt: dueAt, endsAt: dueAt },
      value: { kind: "money", money: PAYMENT },
      provenance: {
        kind: "simulated",
        sourceEntityIds: [installment.eventId],
      },
    });
    expect(cash(world, account.organizationId)).toBe(50_000_00);
    expect(cash(world, operator.organizationId)).toBe(PAYMENT.minorUnits);

    world = advance(world, 1);
    expect(programOutturns(world, PROGRAM_KEY)).toHaveLength(1);
    expect(programPosition(world, PROGRAM_KEY)).toMatchObject({
      posted: PAYMENT,
      unitsOperational: 1,
    });
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      reopened.history.metricStates.find(
        (record) => record.metricId === metricId,
      ),
    ).toEqual(metric);
    expect(programOutturns(reopened, PROGRAM_KEY)).toEqual(
      programOutturns(world, PROGRAM_KEY),
    );
  }, 120_000);
});
