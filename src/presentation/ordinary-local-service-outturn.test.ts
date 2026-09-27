import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { daysBetween } from "../simulation/dates";
import { governmentUnitsForPlace } from "../simulation/government-units";
import {
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
  scheduleLocalMemberAgendaIntakes,
} from "../simulation/governing/member-agenda";
import {
  programAppropriations,
  programAuthority,
  programCapacity,
  programCommitments,
  programInstallments,
  programOutturns,
  programPosition,
  PUBLIC_PROGRAM_DELIVERY,
} from "../simulation/governing/public-program";
import {
  GOVERNING_NPC_DECISION,
  governingMatters,
  openProgramMattersForAllOffices,
} from "../simulation/governing/state-governing";
import type { PrincipleRecordInput } from "../simulation/history";
import { measurePosition } from "../simulation/legislation";
import { requireLifePlace } from "../simulation/life-places";
import { ensureMunicipalCouncilOpening } from "../simulation/municipal-council-opening";
import { municipalSeats } from "../simulation/municipal-public-work";
import { COUNCIL_READING_DUE } from "../simulation/municipal-ordinance-procedure";
import { ensureHomeLocalGovernments } from "../simulation/nationwide-world/local-governments";
import {
  createFormationContext,
  recordPrinciples,
} from "../simulation/politics";
import { resourcePositionAt } from "../simulation/resource-queries";
import { makeCurrencyCode } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { publicTaxAccountForIdentity } from "../simulation/tax-policy";
import type {
  EntityId,
  IsoDate,
  PublicGovernmentIdentity,
  World,
} from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;
const handlers = createCampaignElectionTransitionRegistry();
const USD = makeCurrencyCode("USD");

function advanceTo(world: World, date: IsoDate): World {
  const days = daysBetween(world.currentDate, date);
  return days > 0 ? advanceWorld(world, days, handlers) : world;
}

function cash(world: World, organizationId: EntityId): number {
  return (
    resourcePositionAt(world, { kind: "organization", organizationId }, USD)
      ?.liquidBalance.minorUnits ?? 0
  );
}

describe("ordinary local NPC maintenance service", () => {
  it("carries the city's enacted bill through its manager, cash payment and dated capacity outturn", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ordinary-local-fiscal-prattville-autauga",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    });
    let world = ensureWorldStartingConditions(game.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    const opening = worldOpeningRecord(world);
    expect(opening?.openingVersion).toBe(CRUNCH46_WORLD_OPENING_VERSION);
    world = ensureHomeLocalGovernments(world, game.playerPersonId);
    world = ensureMunicipalCouncilOpening(world, city.id);
    const members = municipalSeats(world, city.id).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    );
    expect(members).toHaveLength(5);
    const manager = municipalSeats(world, city.id).find(
      (seat) => seat.role === "professional-manager",
    );
    expect(manager).toBeDefined();
    expect(manager?.personId).not.toBe(game.playerPersonId);
    expect(members.some((seat) => seat.personId === manager?.personId)).toBe(
      false,
    );
    expect(ensureMunicipalCouncilOpening(world, city.id)).toBe(world);
    const seatedReload = deserializeWorld(serializeWorld(world));
    expect(
      municipalSeats(seatedReload, city.id).find(
        (seat) => seat.role === "professional-manager",
      ),
    ).toEqual(manager);

    // Saved NPC principles make the mapped bill available. Its introduction,
    // vote, enactment, and later executive choice follow their own writers.
    const supporting = ["fiscal-restraint", "environmental-stewardship"].map(
      (key) =>
        Object.values(world.policyCatalog.principles).find(
          (principle) => principle.stableKey === `us-policy-positions:${key}`,
        )!,
    );
    expect(supporting.every(Boolean)).toBe(true);
    const reasons: PrincipleRecordInput[] = members.flatMap((member) =>
      supporting.map((principle) => ({
        stableKey: `ordinary-local-service:${city.id}:${member.personId}:${principle.stableKey}`,
        personId: member.personId,
        principleId: principle.id,
        formedAt: world.currentDate,
        stance: "endorses" as const,
        conviction: "settled" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("other:drawn-before-play", {
          note: "Saved NPC member reasons for a fictional local maintenance proposal; no bill or vote is supplied.",
        }),
        supersedesPrincipleRecordId: null,
      })),
    );
    world = recordPrinciples(world, reasons);
    world = scheduleLocalMemberAgendaIntakes(world);
    const intake = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === LOCAL_MEMBER_AGENDA_INTAKE &&
        item.stableKey.startsWith(
          `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(city.id)}:`,
        ),
    );
    if (!intake) throw new Error("The city's admitted intake was not queued.");
    world = advanceTo(world, intake.dueAt);
    expect(
      world.history.futureDueItemStates
        .filter((state) => state.dueItemId === intake.id)
        .at(-1)?.status,
    ).toBe("resolved");
    const measure = (world.history.legislativeMeasures ?? []).find((record) =>
      record.stableKey.startsWith(
        `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(city.id)}:`,
      ),
    );
    expect(measure?.sponsorPersonId).not.toBe(game.playerPersonId);
    if (!measure) throw new Error("The NPC city bill was not filed.");
    for (
      let guard = 0;
      guard < 8 && !measurePosition(world, measure.id).terminal;
      guard++
    ) {
      const reading = world.history.futureDueItems
        .filter(
          (item) =>
            item.transitionKey === COUNCIL_READING_DUE &&
            item.entityIds.includes(measure.id) &&
            !world.history.futureDueItemStates.some(
              (state) =>
                state.dueItemId === item.id && state.status === "resolved",
            ),
        )
        .sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
      if (!reading) throw new Error("The city bill has no due reading.");
      world = advanceTo(world, reading.dueAt);
    }
    expect(measurePosition(world, measure.id).outcome).toBe("enacted");
    expect(
      world.history.legislativeVotes?.find(
        (vote) => vote.measureId === measure.id,
      )?.provenance.method,
    ).toBe("member-decisions");

    const identity: PublicGovernmentIdentity = {
      kind: "local-government",
      governmentKey: city.id,
      jurisdictionId: measure.jurisdictionId,
    };
    const appropriations = (world.history.publicProgramRecords ?? []).filter(
      (record) =>
        record.kind === "appropriation" &&
        record.sourceMeasureId === measure.id,
    );
    expect(appropriations).toHaveLength(1);
    const appropriation = appropriations[0];
    if (!appropriation || appropriation.kind !== "appropriation")
      throw new Error("The local bill wrote no appropriation.");
    expect(appropriation.publicGovernmentIdentity).toEqual(identity);
    expect(appropriation.amount.minorUnits).toBeGreaterThan(0);
    expect(
      programAppropriations(world, appropriation.programKey, identity),
    ).toContainEqual(appropriation);
    const capacity = programCapacity(world, appropriation.programKey, identity);
    expect(capacity).toMatchObject({
      unitsTotal: 1,
      unitsOperational: 0,
      serviceLabel: "modeled local road-maintenance service",
      basis: { kind: "game-profile" },
    });
    const account = publicTaxAccountForIdentity(world, identity);
    expect(account?.organizationId).toBe(appropriation.accountOrganizationId);
    const openingCash = cash(world, appropriation.accountOrganizationId);
    expect(openingCash).toBeGreaterThan(appropriation.amount.minorUnits);
    expect(openingCash).toBe(opening?.publicCashOpening?.localMinorUnits);
    const office = { kind: "municipal" as const, governmentKey: city.id };
    expect(
      programAuthority(world, manager!.personId, office, appropriation).status,
    ).toBe("available");

    world = advanceTo(world, appropriation.availableFrom);
    world = openProgramMattersForAllOffices(world, new Set([appropriation.id]));
    const matter = governingMatters(world).find(
      (record) => record.appropriationId === appropriation.id,
    );
    expect(matter).toMatchObject({
      family: "program",
      holderPersonId: manager!.personId,
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
    if (!decisionDue) throw new Error("The manager has no NPC decision due.");
    world = advanceTo(world, decisionDue.dueAt);
    const decision = governingMatters(world).find(
      (record) => record.id === matter!.id,
    );
    expect(decision?.status).toBe("decided");
    expect(decision?.decision?.tags).toContain("decided-by:officeholder");
    expect(decision?.decision?.tags).toContain("choice:program:restore-units");
    const commitment = programCommitments(
      world,
      appropriation.programKey,
      identity,
    ).find((record) => record.appropriationId === appropriation.id);
    expect(commitment).toMatchObject({
      alternativeKey: "restore-units",
      decidedByPersonId: manager!.personId,
    });
    const installment = programInstallments(
      world,
      appropriation.programKey,
      identity,
    ).find((record) => record.commitmentId === commitment?.id);
    expect(installment).toMatchObject({ status: "posted" });
    expect(installment?.resourceFlowId).toBeTruthy();
    expect(cash(world, appropriation.accountOrganizationId)).toBeLessThan(
      openingCash,
    );
    expect(
      programPosition(world, appropriation.programKey, appropriation.id).posted
        .minorUnits,
    ).toBe(commitment?.installments[0]?.amount.minorUnits);
    expect(
      programOutturns(world, appropriation.programKey, identity),
    ).toHaveLength(0);

    const delivery = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === PUBLIC_PROGRAM_DELIVERY &&
        item.provenance.kind === "simulated" &&
        item.provenance.sourceEntityIds.includes(installment!.eventId),
    );
    if (!delivery) throw new Error("The paid maintenance has no delivery due.");
    expect(daysBetween(world.currentDate, delivery.dueAt)).toBe(90);
    world = advanceTo(world, delivery.dueAt);
    const outturn = programOutturns(
      world,
      appropriation.programKey,
      identity,
    ).find((record) => record.commitmentId === commitment?.id);
    expect(outturn).toMatchObject({
      recordedAt: delivery.dueAt,
      restoredUnits: 1,
      unitsOperational: 1,
      serviceLabel: "modeled local road-maintenance service",
    });
    expect(
      programPosition(world, appropriation.programKey, appropriation.id)
        .unitsOperational,
    ).toBe(1);

    const reopened = deserializeWorld(serializeWorld(world));
    expect(worldOpeningRecord(reopened)).toEqual(opening);
    expect(
      programAppropriations(reopened, appropriation.programKey, identity),
    ).toEqual(programAppropriations(world, appropriation.programKey, identity));
    expect(
      programCommitments(reopened, appropriation.programKey, identity),
    ).toEqual(programCommitments(world, appropriation.programKey, identity));
    expect(
      programInstallments(reopened, appropriation.programKey, identity),
    ).toEqual(programInstallments(world, appropriation.programKey, identity));
    expect(
      programOutturns(reopened, appropriation.programKey, identity),
    ).toEqual(programOutturns(world, appropriation.programKey, identity));
    expect(cash(reopened, appropriation.accountOrganizationId)).toBe(
      cash(world, appropriation.accountOrganizationId),
    );
  }, 900_000);
});
