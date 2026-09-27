import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  daysBetween,
  makeIsoDate,
  simulationMinutesBetween,
} from "../simulation/dates";
import { applyEnactedLawEffects } from "../simulation/enacted-law-effects";
import {
  commitPublicProgram,
  programAppropriations,
  programInstallments,
} from "../simulation/governing/public-program";
import { programOperatorOrganization } from "../simulation/governing/program-governing";
import { seatsForChamber } from "../simulation/legislature-game-profile";
import {
  legislativePackForJurisdiction,
  legislativeWorkKey,
} from "../simulation/legislative-institutions";
import { legislativeProcedureForJurisdiction } from "../simulation/legislative-procedure-world";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../simulation/legislation-scenarios";
import {
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_PROGRAM_KEY,
} from "../simulation/legislation-transit-families";
import {
  lifePlaceByJurisdictionId,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../simulation/nationwide-world/state-executives";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import type { World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  ensureWorldStartingConditions,
  worldOpeningRecord,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../simulation/world-setup/types";
import { applyLegislativeStep } from "./legislation-session";
import { fileDraft } from "./legislation-docket";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import {
  readTransitDecisionReport,
  unreadTransitDecisionReportIds,
} from "./transit-report-reading";
import { projectWorld39Journal } from "./world39-journal";
import { projectWorld39News } from "./world39-news";
import { NewsDesk } from "../player/news/NewsDesk";
import { TimeCommandProvider } from "../player/time-command-runner";

/** Synthetic passage inputs test the saved spending writers, not voter behavior. */
function enactedTransitBill(stateUsps: string) {
  const jurisdictionId = stateJurisdictionForKey(`US-${stateUsps}`)?.id;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${stateUsps}`,
    scope: "locality",
  })[0];
  if (!jurisdictionId || !place) throw new Error(`${stateUsps}: no locality`);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `all-state-transit-payment:${stateUsps}`,
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  });
  let world = ensureWorldStartingConditions(game.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  const savedProcedure = legislativeProcedureForJurisdiction(
    world,
    jurisdictionId,
  );
  if (!savedProcedure)
    throw new Error(`${stateUsps}: no saved opening procedure`);
  // A biennial odd-year opening remains on its own calendar. Time advances
  // through the ordinary world writer before this synthetic bill is filed.
  if (
    savedProcedure.sessionCadence === "biennial" &&
    savedProcedure.sessionYearParity === "odd"
  ) {
    world = advanceWorld(
      world,
      daysBetween(world.currentDate, makeIsoDate("2027-01-05")),
      createCampaignElectionTransitionRegistry(),
    );
  }
  world = ensureStateExecutiveIncumbent(world, game.playerPersonId, stateUsps);
  const pack = legislativePackForJurisdiction(jurisdictionId);
  if (!pack) throw new Error(`${stateUsps}: no legislature`);
  const filed = fileDraft(world, {
    scenarioKey: legislativeWorkKey(pack),
    playerPersonId: game.playerPersonId,
    jurisdictionId,
    familyKey: "appropriations",
    variantKey: STATE_TRANSIT_VARIANT_KEY,
    authorityKey: TRANSIT_PROGRAM_KEY,
    parameterValues: {
      appropriation: { kind: "money", minorUnits: 2_000_000, currency: "USD" },
      "service-window": { kind: "enumerated", value: "weekday" },
    },
  });
  world = filed.world;
  const measureId = filed.bill.measureId;
  const bodies = pack.chambers.map((chamber) => {
    const seats = seatsForChamber(pack, chamber.chamberKey)?.seats;
    if (!seats)
      throw new Error(`${stateUsps}: no seats in ${chamber.chamberKey}`);
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats,
      [],
      pack.structure === "unicameral",
    );
  });
  const votePlan: Record<string, { readonly yea: number }> = {};
  for (const chamber of pack.chambers) {
    const seats = bodies.find((body) => body.chamberKey === chamber.chamberKey)!
      .members.length;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(seats, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Supplied fictional signature for the payment fixture.",
  };
  for (let guard = 0; guard < 40; guard++) {
    if (measurePosition(world, measureId).outcome === "enacted") break;
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) throw new Error(`${stateUsps}: no passage step`);
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(procedure, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return {
    world,
    measureId,
    jurisdictionId,
    playerPersonId: game.playerPersonId,
  };
}

function paidService(stateUsps: string) {
  const enacted = enactedTransitBill(stateUsps);
  let { world } = enacted;
  const programKey = `transit:${stateUsps.toLowerCase()}`;
  const appropriations = programAppropriations(world, programKey).filter(
    (row) => row.sourceMeasureId === enacted.measureId,
  );
  expect(appropriations).toHaveLength(1);
  const appropriation = appropriations[0]!;
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === enacted.measureId && row.outcome === "enacted",
  );
  expect(appropriation.availableFrom).toBe(enactment?.effectiveAt);
  expect(appropriation.amount.minorUnits).toBe(2_000_000);
  const account = publicTaxAccountForJurisdiction(
    world,
    enacted.jurisdictionId,
  )!;
  expect(appropriation.accountOrganizationId).toBe(account.organizationId);
  expect(
    worldOpeningRecord(world)?.publicCashOpening?.stateByJurisdictionId[
      enacted.jurisdictionId
    ],
  ).toBeGreaterThan(0);

  const days = daysBetween(world.currentDate, appropriation.availableFrom);
  if (days > 0)
    world = advanceWorld(
      world,
      days,
      createCampaignElectionTransitionRegistry(),
    );
  const operator = programOperatorOrganization(
    world,
    programKey,
    enacted.jurisdictionId,
  );
  world = operator.world;
  const governor = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === stateUsps,
  );
  if (!governor) throw new Error(`${stateUsps}: no executive holder`);
  const choice = {
    appropriationId: appropriation.id,
    alternative: {
      key: "one-paid-vehicle-hour",
      title: "Pay one modeled vehicle-service hour",
      installments: [
        {
          afterDays: 0,
          amount: money(10_000, "USD"),
          purpose: "operating" as const,
        },
      ],
      deliveryLeadDays: null,
    },
    personId: governor.personId,
    office: { kind: "state-executive" as const },
    recipientOrganizationId: operator.organizationId,
  };
  const committed = commitPublicProgram(world, choice);
  expect(committed.ok).toBe(true);
  if (!committed.ok) throw new Error(`${stateUsps}: ${committed.reason}`);
  const saved = deserializeWorld(serializeWorld(committed.world));
  const installments = programInstallments(saved, programKey);
  expect(installments).toHaveLength(1);
  expect(installments[0]?.status).toBe("posted");
  const flowId = installments[0]?.resourceFlowId;
  expect(flowId).toBeDefined();
  const flow = saved.history.resourceFlows.find((row) => row.id === flowId);
  expect(flow?.source).toEqual({
    kind: "organization",
    organizationId: account.organizationId,
  });
  expect(flow?.recipient).toEqual({
    kind: "organization",
    organizationId: operator.organizationId,
  });
  expect(flow?.jurisdictionId).toBe(enacted.jurisdictionId);
  expect(
    saved.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId === flowId &&
        row.status === "completed" &&
        row.transferredAmount.minorUnits === 10_000,
    ),
  ).toHaveLength(1);
  const service = saved.history.events.filter(
    (row) =>
      row.type === "transit.program-paid-service-hours" &&
      row.involvedEntityIds.includes(enacted.measureId),
  );
  expect(service).toHaveLength(1);
  expect(service[0]?.summary).toContain("1 vehicle-service hour");
  const servicePlace = service[0]?.jurisdictionId
    ? lifePlaceByJurisdictionId(service[0].jurisdictionId)
    : null;
  expect(servicePlace?.stateJurisdictionKey).toBe(`US-${stateUsps}`);
  expect(
    saved.history.metricStates.filter(
      (row) =>
        row.provenance.kind === "simulated" &&
        row.provenance.sourceEntityIds.includes(service[0]!.id) &&
        row.value.kind === "quantity" &&
        row.value.quantity.numerator === 1 &&
        row.value.quantity.denominator === 1 &&
        row.value.quantity.unit === "duration:vehicle-service-hour",
    ),
  ).toHaveLength(1);
  expect(
    programAppropriations(saved, programKey).filter(
      (row) => row.sourceMeasureId === enacted.measureId,
    ),
  ).toHaveLength(1);
  expect(serializeWorld(applyEnactedLawEffects(saved, enacted.measureId))).toBe(
    serializeWorld(saved),
  );
  const replay = commitPublicProgram(saved, choice);
  expect(replay.ok).toBe(false);
  expect(serializeWorld(replay.world)).toBe(serializeWorld(saved));
  return saved;
}

describe("same fictional state transit bill reaches exact paid service", () => {
  it.each(US_STATE_USPS)(
    "%s: enacted authority pays one saved hour",
    (usps) => {
      const world: World = paidService(usps);
      expect(
        world.history.events.filter(
          (row) => row.type === "transit.program-paid-service-hours",
        ),
      ).toHaveLength(1);
    },
  );

  it.each(["AK", "CO"])(
    "%s: resident experience and a player's read report survive Continue",
    (usps) => {
      const world = paidService(usps);
      if (world.control.kind !== "person")
        throw new Error(`${usps}: no controlled player`);
      const playerId = world.control.personId;
      const ride = world.history.events.find(
        (event) => event.type === "transit.modeled-rider-experience",
      );
      const report = world.history.events.find(
        (event) => event.type === "transit.government-decision-reported",
      );
      expect(ride).toBeDefined();
      expect(report?.jurisdictionId).toBe(
        stateJurisdictionForKey(`US-${usps}`)?.id,
      );
      const riderId = ride?.participants.find(
        (participant) => participant.role === "presence:transit-rider",
      )?.personId;
      expect(riderId).toBeDefined();
      expect(riderId).not.toBe(playerId);
      expect(
        world.history.knowledge.some(
          (row) =>
            row.personId === riderId &&
            row.eventId === ride?.id &&
            row.source.kind === "direct",
        ),
      ).toBe(true);
      expect(
        projectWorld39Journal(world, riderId!).entries.some(
          (entry) => entry.sourceId === ride?.id,
        ),
      ).toBe(true);
      const publication = world.history.publications?.find(
        (row) => row.sourceEventId === report?.id,
      );
      expect(publication).toBeDefined();
      expect(
        projectWorld39News(world, playerId).publications.items.some(
          (item) => item.publicationId === publication?.id,
        ),
      ).toBe(true);
      expect(unreadTransitDecisionReportIds(world).has(publication!.id)).toBe(
        true,
      );
      const newsMarkup = renderToStaticMarkup(
        createElement(
          TimeCommandProvider,
          {
            runner: {
              pending: false,
              submit: () => {},
              perform: () => {},
            },
          },
          createElement(NewsDesk, {
            world,
            context: "read",
            onContextChange: () => {},
            mode: "front",
            outletKey: null,
            onModeChange: () => {},
            onOutletChange: () => {},
            onOpenPerson: () => {},
            around: null,
            directory: null,
            press: null,
          }),
        ),
      );
      expect(newsMarkup).toContain(`data-story-id="${publication!.id}"`);
      expect(newsMarkup).toContain("Reading this report takes 10 minutes");
      expect(
        projectWorld39Journal(world, playerId).entries.some(
          (entry) => entry.sourceId === ride?.id,
        ),
      ).toBe(false);
      const missing = readTransitDecisionReport(
        world,
        report!.id,
        createCampaignElectionTransitionRegistry(),
      );
      expect(missing.completed).toBe(false);
      expect(missing.world).toBe(world);

      const read = readTransitDecisionReport(
        world,
        publication!.id,
        createCampaignElectionTransitionRegistry(),
      );
      expect(read.completed).toBe(true);
      expect(
        simulationMinutesBetween(world.currentMoment, read.world.currentMoment),
      ).toBe(10);
      const knowledge = read.world.history.knowledge.find(
        (row) => row.personId === playerId && row.eventId === report?.id,
      );
      expect(knowledge?.source).toEqual({
        kind: "public-record",
        reference: `publication:${publication!.id}`,
      });
      expect(knowledge?.believedSummary).toContain("Governor");
      const continued = deserializeWorld(serializeWorld(read.world));
      expect(
        projectWorld39News(continued, playerId).learnedEventIds.has(report!.id),
      ).toBe(true);
      expect(
        projectWorld39Journal(continued, playerId).entries.some(
          (entry) => entry.sourceId === knowledge?.id,
        ),
      ).toBe(true);
      expect(
        projectWorld39Journal(continued, playerId).entries.some(
          (entry) => entry.sourceId === ride?.id,
        ),
      ).toBe(false);
      const repeated = readTransitDecisionReport(
        continued,
        publication!.id,
        createCampaignElectionTransitionRegistry(),
      );
      expect(repeated.completed).toBe(false);
      expect(serializeWorld(repeated.world)).toBe(serializeWorld(continued));
    },
  );
});
