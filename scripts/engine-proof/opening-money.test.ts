import { beforeAll, describe, expect, it, vi } from "vitest";
import type * as EnactedLawEffects from "../../src/simulation/enacted-law-effects";
import type { EntityId, IsoDate, World } from "../../src/simulation/types";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { observerSetup } from "../../src/presentation/observer-world";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../src/presentation/time-command";
import {
  initializeLivingCostsFlow,
  livingCostsFlowFor,
  settleLivingCosts,
} from "../../src/simulation/cost-of-living";
import {
  initializeOfficeSalaryFlows,
  PAID_OFFICE_KINDS,
} from "../../src/simulation/office-salary";
import {
  householdMembershipsAt,
  workStatusAt,
} from "../../src/simulation/life-queries";
import { townLeases } from "../../src/simulation/living-world/town-rent";
import { MORTGAGE_BASIS } from "../../src/simulation/home-purchase";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import {
  addDays,
  daysBetween,
  isoDateFromParts,
} from "../../src/simulation/dates";
import { PLAYER_MONTHLY_MONEY_KEY } from "../../src/simulation/player-monthly-money";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { nationalPlacePlan, watchedIdentity } from "./places";

// Observe the final dispatcher input, then delegate to its actual implementation.
// No consequence rows, eligibility, amount, person, or outcome are injected.
const dispatch = vi.hoisted(() => ({ worlds: [] as World[] }));
vi.mock("../../src/simulation/enacted-law-effects", async (importOriginal) => {
  const original = await importOriginal<typeof EnactedLawEffects>();
  return {
    ...original,
    applyStartingLawConsequences(world: World) {
      dispatch.worlds.push(world);
      return original.applyStartingLawConsequences(world);
    },
  };
});

const selected = nationalPlacePlan("c5-full-opening-money-20261001", 1)
  .watched[0]!;
let opening: World;
let personId: EntityId;
let livingId: EntityId;
let first: IsoDate;
let openingPayload: string;
let openedSession: ReturnType<typeof generateOpeningLife>;

function nextFirst(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number);
  return isoDateFromParts(
    year! + (month === 12 ? 1 : 0),
    month === 12 ? 1 : month! + 1,
    1,
  );
}
function dateInventory(dates: readonly IsoDate[], onDate: IsoDate) {
  const histogram = Object.fromEntries(
    [...new Set(dates)]
      .sort()
      .map((date) => [date, dates.filter((value) => value === date).length]),
  );
  return {
    count: dates.length,
    beforeOpening: dates.filter((date) => date < onDate).length,
    atOpening: dates.filter((date) => date === onDate).length,
    afterOpening: dates.filter((date) => date > onDate).length,
    dates: histogram,
  };
}
function openingInventory(world: World, subjectId: EntityId) {
  const jobs = world.history.workRelationships.filter((work) =>
    work.kind.startsWith("employment:"),
  );
  const leases = townLeases(world, world.currentDate);
  const mortgages = world.history.resourceFlows.filter(
    (flow) => flow.basisKind === MORTGAGE_BASIS,
  );
  const home = world.people[subjectId]!.homeJurisdictionId;
  const laws = Object.values(world.policyCatalog.propositions).flatMap(
    (question) => {
      const law = lawInForce(world, home, question.id, world.currentDate);
      return law
        ? [
            {
              questionKey: question.stableKey,
              origin: law.origin,
              operativeAt: law.operativeAt,
              lawId: law.measureId,
            },
          ]
        : [];
    },
  );
  return {
    onDate: world.currentDate,
    scope:
      "All saved employment, lease and mortgage contracts; resolved catalog laws only for this person's saved home jurisdiction. Historical start dates are retained, not rewritten to opening.",
    jobs: dateInventory(
      jobs.map((work) => work.startedAt),
      world.currentDate,
    ),
    leases: dateInventory(
      leases.map((lease) => lease.flow.startsAt),
      world.currentDate,
    ),
    mortgages: dateInventory(
      mortgages.map((flow) => flow.startsAt),
      world.currentDate,
    ),
    homeLaws: {
      ...dateInventory(
        laws.map((law) => law.operativeAt),
        world.currentDate,
      ),
      rows: laws,
    },
    enactedMeasures: (world.history.legislativeEnactments ?? []).filter(
      (row) => row.outcome === "enacted",
    ).length,
  };
}
function livingPayments(world: World) {
  return world.history.resourceTransferOutcomes.filter(
    (outcome) => outcome.resourceFlowId === livingId,
  );
}
function comparablePayments(world: World) {
  // Different clock controls append different positions. Preserve IDs, dates,
  // money, source joins and statuses; compare only the actual living outcomes.
  return livingPayments(world).map(({ sequence: _sequence, ...record }) => {
    void _sequence;
    return record;
  });
}
beforeAll(() => {
  dispatch.worlds.length = 0;
  openedSession = generateOpeningLife(
    prepareOpeningLife(observerSetup(selected.seed, selected.placeKey)),
  );
  const game = openedSession.game;
  if (!game) throw new Error("Full controlled opening did not produce a game");
  opening = game.world;
  personId = game.playerPersonId;
  const flow = livingCostsFlowFor(opening, personId);
  if (!flow)
    throw new Error("Actual controlled opening supplied no living-cost flow");
  livingId = flow.id;
  first = nextFirst(opening.currentDate);
  openingPayload = serializeWorld(opening);
  process.stdout.write(
    JSON.stringify({
      kind: "full-opening-money",
      identity: watchedIdentity(opening, personId, selected.placeKey),
      inventory: openingInventory(opening, personId),
      livingFlowId: livingId,
      livingStartsAt: flow.startsAt,
      nextFirst: first,
    }) + "\n",
  );
});

describe("C5 money bases in the actual full opening", () => {
  it("exposes real initializer flows before the final starting-law dispatch without paying them", () => {
    expect(dispatch.worlds).toHaveLength(1);
    const beforeLaws = dispatch.worlds[0]!;
    expect(beforeLaws.control).toEqual({ kind: "person", personId });
    // Assert the real eligibility inputs, rather than declaring an applicable
    // person or adding funds/household/office work to the opening.
    expect(beforeLaws.people[personId]).toBeDefined();
    expect(
      beforeLaws.history.personDeaths.some(
        (death) =>
          death.personId === personId && death.diedAt <= beforeLaws.currentDate,
      ),
    ).toBe(false);
    expect(
      beforeLaws.history.resourcePositions.some(
        (position) =>
          position.owner.kind === "person" &&
          position.owner.personId === personId,
      ),
    ).toBe(true);
    expect(
      householdMembershipsAt(beforeLaws, personId).filter(
        (entry) => entry.state.residenceRole === "primary",
      ),
    ).toHaveLength(1);
    const living = livingCostsFlowFor(beforeLaws, personId)!;
    expect(living.id).toBe(livingId);
    expect(living.startsAt).toBe(beforeLaws.currentDate);
    const eligibleOffices = beforeLaws.history.workRelationships.filter(
      (work) =>
        work.personId === personId &&
        work.organizationId !== null &&
        PAID_OFFICE_KINDS.includes(work.kind) &&
        ["paid", "mixed"].includes(work.compensation) &&
        workStatusAt(beforeLaws, work.id)?.status === "active",
    );
    for (const work of eligibleOffices) {
      expect(
        beforeLaws.history.resourceFlows.some(
          (flow) =>
            flow.basisReference.kind === "work" &&
            flow.basisReference.workRelationshipId === work.id,
        ),
      ).toBe(true);
    }
    const salaryFlows = beforeLaws.history.resourceFlows.filter(
      (flow) =>
        flow.stableKey.startsWith("office-salary:") &&
        flow.recipient.kind === "person" &&
        flow.recipient.personId === personId,
    );
    for (const flow of salaryFlows) {
      expect(flow.startsAt).toBe(beforeLaws.currentDate);
      expect(flow.basisReference.kind).toBe("work");
      if (flow.basisReference.kind !== "work")
        throw new Error("Office salary lacks canonical saved work");
      const workId = flow.basisReference.workRelationshipId;
      const work = beforeLaws.history.workRelationships.find(
        (row) => row.id === workId,
      );
      expect(work?.personId).toBe(personId);
      expect(work?.organizationId).toBeTruthy();
      expect(PAID_OFFICE_KINDS).toContain(work?.kind);
      expect(["paid", "mixed"]).toContain(work?.compensation);
      expect(workStatusAt(beforeLaws, work!.id)?.status).toBe("active");
    }
    const openedFlows = new Set([
      living.id,
      ...salaryFlows.map((flow) => flow.id),
    ]);
    expect(
      beforeLaws.history.resourceTransferOutcomes.filter((row) =>
        openedFlows.has(row.resourceFlowId),
      ),
    ).toHaveLength(0);
    expect(
      opening.history.resourceTransferOutcomes.filter((row) =>
        openedFlows.has(row.resourceFlowId),
      ),
    ).toHaveLength(0);
    expect(
      beforeLaws.history.futureDueItems.some(
        (item) =>
          item.transitionKey === PLAYER_MONTHLY_MONEY_KEY &&
          item.entityIds.includes(personId) &&
          item.dueAt === first,
      ),
    ).toBe(true);
    process.stdout.write(
      JSON.stringify({
        kind: "money-before-law-dispatch",
        personId,
        livingId,
        eligibleOfficeWorkIds: eligibleOffices.map((work) => work.id),
        salaryFlows: salaryFlows.map((flow) => ({
          id: flow.id,
          startsAt: flow.startsAt,
          basis: flow.basisReference,
        })),
        payments: 0,
        dispatches: dispatch.worlds.length,
      }) + "\n",
    );
  });

  it("preserves the opening and existing initializer contracts across repeat/save/reopen", () => {
    expect(generateOpeningLife(openedSession)).toBe(openedSession);
    expect(dispatch.worlds).toHaveLength(1);
    const reloaded = deserializeWorld(openingPayload);
    expect(initializeOfficeSalaryFlows(reloaded, personId)).toBe(reloaded);
    expect(initializeLivingCostsFlow(reloaded, personId)).toBe(reloaded);
    expect(settleLivingCosts(reloaded, personId)).toBe(reloaded);
    expect(serializeWorld(reloaded)).toBe(openingPayload);
    expect(livingCostsFlowFor(reloaded, personId)?.id).toBe(livingId);
    expect(livingPayments(reloaded)).toHaveLength(0);
  });

  it("settles the full opening's living flow on the first through Day, Week and days command including reload", () => {
    const distance = daysBetween(opening.currentDate, first);
    let days = deserializeWorld(openingPayload);
    for (let day = 0; day < distance; day++) {
      days = passOrdinaryDays(days, 1);
      expect(days.currentDate).toBe(addDays(opening.currentDate, day + 1));
      if (days.currentDate < first)
        expect(livingPayments(days)).toHaveLength(0);
    }
    let weeks = deserializeWorld(openingPayload);
    const weekCount = Math.ceil(distance / 7);
    for (let week = 0; week < weekCount; week++)
      weeks = passOrdinaryDays(weeks, 7);
    expect(weeks.currentDate).toBe(addDays(opening.currentDate, weekCount * 7));
    const command = submitTimeCommand(
      deserializeWorld(openingPayload),
      {
        requestId: "c5-full-opening-first",
        personId,
        sourceMoment: opening.currentMoment,
        command: { kind: "days", days: distance },
      },
      () => 0,
    );
    expect(command.receipt.status).toBe("accepted");
    for (const world of [days, weeks, command.world]) {
      expect(world.currentDate >= first).toBe(true);
      expect(livingPayments(world)).toHaveLength(1);
      expect(livingPayments(world)[0]?.occurredAt).toBe(first);
      expect(settleLivingCosts(world, personId)).toBe(world);
    }
    expect(days.currentDate).toBe(first);
    expect(command.world.currentDate).toBe(first);
    expect(comparablePayments(days)).toEqual(comparablePayments(weeks));
    expect(comparablePayments(days)).toEqual(comparablePayments(command.world));
    process.stdout.write(
      JSON.stringify({
        kind: "full-opening-first-payment",
        identity: watchedIdentity(days, personId, selected.placeKey),
        first,
        distance,
        livingId,
        payments: comparablePayments(days),
      }) + "\n",
    );
  });
});
