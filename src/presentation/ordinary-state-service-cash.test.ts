import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { addDays, daysBetween } from "../simulation/dates";
import {
  introduceAutomaticLawMeasure,
  stateTransitAutomaticLawContext,
} from "../simulation/governing/automatic-legislation";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import {
  GOVERNING_NPC_DECISION,
  governingMatters,
  openProgramMattersForAllOffices,
} from "../simulation/governing/state-governing";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../simulation/governing/officeholder-principles";
import {
  programAppropriations,
  programCapacity,
  programCommitments,
  programInstallments,
  programOutturns,
  programPosition,
} from "../simulation/governing/public-program";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import {
  availableMeasureSteps,
  measurePosition,
  nextMeasureStableKey,
  recordEnactment,
} from "../simulation/legislation";
import { legislativeBlueprint } from "../simulation/legislation-scenarios";
import {
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { ensureStateLegislatureOpening } from "../simulation/nationwide-world/state-legislature-opening";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../simulation/nationwide-world/state-executives";
import { resourcePositionAt } from "../simulation/resource-queries";
import { makeCurrencyCode } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import {
  CRUNCH46_WORLD_OPENING_VERSION,
  PUBLIC_CASH_OPENING_PROFILE_VERSION,
} from "../simulation/world-setup/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { applyLegislativeStep } from "./legislation-session";
import { publishLegislativeTransition } from "./publish-legislative-transition";

const PROGRAM = "transit:ak";
const USD = makeCurrencyCode("USD");

function cash(world: World, organizationId: EntityId): number {
  return (
    resourcePositionAt(world, { kind: "organization", organizationId }, USD)
      ?.liquidBalance.minorUnits ?? 0
  );
}

function advance(world: World, days: number): World {
  return advanceWorld(world, days, createCampaignElectionTransitionRegistry());
}

function advanceTo(world: World, date: IsoDate): World {
  const days = daysBetween(world.currentDate, date);
  return days > 0 ? advance(world, days) : world;
}

describe("ordinary opening cash reaches a state service outturn", () => {
  it("uses supplied legislative votes, then the NPC governor's program decision and saved payment", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-AK",
      scope: "locality",
    })[0]!;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "member-agenda-US-AK",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    const jurisdictionId = stateJurisdictionForKey("US-AK")!.id;
    let world = ensureWorldStartingConditions(game.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    world = ensureStateExecutiveIncumbent(world, game.playerPersonId, "AK");
    world = ensureStateLegislatureOpening(world, game.playerPersonId, "AK");
    const opening = worldOpeningRecord(world)?.publicCashOpening;
    expect(opening?.contractVersion).toBe(PUBLIC_CASH_OPENING_PROFILE_VERSION);
    const openingCash = opening?.stateByJurisdictionId[jurisdictionId];
    expect(openingCash).toBe(10_000_000_000);
    const blueprint = legislativeBlueprint("alaska");
    const chamber = blueprint.pack.chambers.find(
      (candidate) => candidate.introductionAllowed,
    )!;
    const seated = seatedChamberForPack(
      world,
      blueprint.pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    expect(seated).not.toBeNull();
    const memberIds = seated!.body.members.flatMap((member) =>
      member.personId ? [member.personId] : [],
    );
    world = ensureOfficeholderPrinciples(world, memberIds);
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (candidate) =>
        candidate.stableKey ===
        "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    )!;
    const sponsor = memberIds
      .map((personId) => ({
        personId,
        leaning: principledLeaning(world, personId, proposition.id),
      }))
      .find((entry) => entry.leaning.score >= 3);
    expect(sponsor).toBeDefined();
    const automaticContext = stateTransitAutomaticLawContext(
      world,
      jurisdictionId,
    );
    expect(automaticContext).not.toBeNull();
    const introduced = introduceAutomaticLawMeasure(world, {
      jurisdictionId,
      context: automaticContext!,
      propositionId: proposition.id,
      answer: "yes",
      intakeKey: "ordinary-state-service-cash:ak",
      stableKey: "ordinary-state-service-cash:ak:measure",
      // The fixture supplies the designation and vote plan. HB 17 gives the
      // saved NPC matter a deterministic restore-units choice; ordinary
      // numbering here would give HB 202 and an operating choice instead.
      // This bill is not claimed as an ordinary agenda selection.
      designation: "HB 17",
      sponsorPersonId: sponsor!.personId,
      originChamberKey: chamber.chamberKey,
      principleRecordIds: sponsor!.leaning.recordIds,
      principleScore: sponsor!.leaning.score,
    });
    expect(introduced).not.toBeNull();
    if (!introduced) throw new Error("The typed service bill did not file.");
    world = introduced.world;
    const bill = world.history.legislativeMeasures!.find(
      (record) => record.id === introduced.measureId,
    )!;
    const lineage = world.history.legislativeDraftLineages?.find(
      (record) => record.measureId === bill.id,
    );
    expect(lineage).toMatchObject({
      familyKey: "appropriations",
      variantKey: "transit-staged-service-v2",
      authorityKey: "standing:rural-transit-assistance",
    });
    const clause = currentMeasureProvisions(world, bill.id).find(
      (provision) => provision.provisionKey === "amount-provided",
    );
    expect(clause?.operativeEffect).toEqual({
      kind: "public-program-appropriation",
    });
    expect(clause?.fiscalExposureMinorUnits).toBeGreaterThan(0);

    const procedure = {
      pack: blueprint.pack,
      measureId: bill.id,
      bodies: blueprint.pack.chambers.map(
        (forum) =>
          seatedChamberForPack(
            world,
            blueprint.pack.packId,
            forum.chamberKey,
            forum.name,
          )!.body,
      ),
      committeeMemberCount: chamber.committees[0]!.appointedMembers,
      votePlan: blueprint.votePlan,
      governorAction: "signed" as const,
      governorRationale:
        "Supplied fictional executive disposition for this test.",
    };
    for (
      let guard = 0;
      guard < 40 && measurePosition(world, bill.id).outcome === null;
      guard++
    ) {
      const step = availableMeasureSteps(world, bill.id).find(
        (candidate) => candidate !== "offer-amendment",
      );
      if (!step) throw new Error("The supplied legislative route has no step.");
      const beforeStep = world;
      world = publishLegislativeTransition(
        beforeStep,
        step === "record-enactment"
          ? recordEnactment(beforeStep, {
              stableKey: nextMeasureStableKey(
                beforeStep,
                bill.id,
                `measure:${bill.id}:enactment`,
              ),
              measureId: bill.id,
              effectiveAt: addDays(beforeStep.currentDate, 90),
            })
          : applyLegislativeStep(procedure, beforeStep, step).world,
      );
    }
    expect(measurePosition(world, bill.id).outcome).toBe("enacted");
    expect(
      (world.history.legislativeVotes ?? []).some(
        (vote) =>
          vote.measureId === bill.id &&
          vote.purpose === "floor-stage" &&
          vote.provenance.method === "authored-fixture",
      ),
    ).toBe(true);

    const appropriation = programAppropriations(world, PROGRAM).find(
      (record) => record.sourceMeasureId === bill.id,
    );
    expect(appropriation).toBeDefined();
    if (!appropriation)
      throw new Error("The enacted v2 clause wrote no program appropriation.");
    const account = publicTaxAccountForJurisdiction(world, jurisdictionId)!;
    expect(cash(world, account.organizationId)).toBe(openingCash);
    const initialAccountPosition = world.history.resourcePositions.find(
      (record) =>
        record.owner.kind === "organization" &&
        record.owner.organizationId === account.organizationId &&
        record.openingBalance.currency === USD,
    );
    expect(initialAccountPosition?.openingBalance.minorUnits).toBe(openingCash);
    expect(initialAccountPosition?.provenance).toMatchObject({
      kind: "authored",
      note: expect.stringContaining(PUBLIC_CASH_OPENING_PROFILE_VERSION),
    });
    expect(appropriation.accountOrganizationId).toBe(account.organizationId);
    expect(appropriation.amount.minorUnits).toBe(
      clause!.fiscalExposureMinorUnits,
    );
    expect(programCapacity(world, PROGRAM)).toMatchObject({
      unitsTotal: 1,
      unitsOperational: 0,
      basis: { kind: "game-profile" },
    });
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === "AK",
    );
    expect(governor?.personId).toBeDefined();
    expect(governor?.personId).not.toBe(game.playerPersonId);
    const cashBeforeCommitment = cash(world, account.organizationId);
    expect(cashBeforeCommitment).toBeGreaterThan(0);
    expect(programInstallments(world, PROGRAM)).toHaveLength(0);

    world = advanceTo(world, appropriation.availableFrom);
    world = openProgramMattersForAllOffices(world, new Set([appropriation.id]));
    const matter = governingMatters(world).find(
      (record) => record.appropriationId === appropriation.id,
    );
    expect(matter).toMatchObject({
      family: "program",
      holderPersonId: governor!.personId,
      status: "open",
    });
    expect(matter?.options.map((option) => option.key)).toContain(
      "program:restore-units",
    );
    const decisionDue = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === GOVERNING_NPC_DECISION &&
        item.entityIds.includes(matter!.id),
    );
    expect(decisionDue).toBeDefined();
    world = advanceTo(world, decisionDue!.dueAt);
    const decision = governingMatters(world).find(
      (record) => record.id === matter!.id,
    );
    expect(decision?.status).toBe("decided");
    expect(decision?.decision?.tags).toContain("decided-by:officeholder");
    expect(decision?.decision?.tags).toContain("choice:program:restore-units");
    const commitment = programCommitments(world, PROGRAM).find(
      (record) => record.appropriationId === appropriation.id,
    );
    expect(commitment?.decidedByPersonId).toBe(governor!.personId);
    expect(commitment?.alternativeKey).toBe("restore-units");
    const installment = programInstallments(world, PROGRAM).find(
      (record) => record.commitmentId === commitment?.id,
    );
    expect(installment?.status).toBe("posted");
    expect(installment?.resourceFlowId).not.toBeNull();
    const payment = commitment!.installments[0]!.amount.minorUnits;
    expect(cash(world, account.organizationId)).toBeLessThan(
      cashBeforeCommitment,
    );
    expect(
      programPosition(world, PROGRAM, appropriation.id).posted.minorUnits,
    ).toBe(payment);
    expect(programOutturns(world, PROGRAM)).toHaveLength(0);

    const deliveryDate = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === "public-program:delivery" &&
        item.provenance.kind === "simulated" &&
        item.provenance.sourceEntityIds.includes(installment!.eventId),
    )?.dueAt;
    expect(deliveryDate).toBeDefined();
    world = advanceTo(world, deliveryDate!);
    const outturn = programOutturns(world, PROGRAM).find(
      (record) => record.commitmentId === commitment!.id,
    );
    expect(outturn).toMatchObject({
      restoredUnits: 1,
      unitsOperational: 1,
      recordedAt: deliveryDate,
    });
    expect(
      programPosition(world, PROGRAM, appropriation.id).unitsOperational,
    ).toBe(1);

    const reopened = deserializeWorld(serializeWorld(world));
    expect(worldOpeningRecord(reopened)?.publicCashOpening).toEqual(opening);
    expect(programAppropriations(reopened, PROGRAM)).toEqual(
      programAppropriations(world, PROGRAM),
    );
    expect(programCommitments(reopened, PROGRAM)).toEqual(
      programCommitments(world, PROGRAM),
    );
    expect(programInstallments(reopened, PROGRAM)).toEqual(
      programInstallments(world, PROGRAM),
    );
    expect(programOutturns(reopened, PROGRAM)).toEqual(
      programOutturns(world, PROGRAM),
    );
    expect(cash(reopened, account.organizationId)).toBe(
      cash(world, account.organizationId),
    );
  }, 900_000);
});
