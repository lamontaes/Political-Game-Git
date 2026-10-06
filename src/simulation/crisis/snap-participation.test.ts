import { describe, expect, it } from "vitest";
import benefitData from "../../../data/research/money/snap-average-monthly-benefit-by-state-fy2023.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import {
  generateOpeningLifeWithProgress,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { addDays } from "../dates";
import { householdMembershipsAt, peopleInHouseholdAt } from "../life-queries";
import { createOrganization, createWorkRelationship } from "../life";
import {
  createResourceFlow,
  money,
  recordResourceFlowTerms,
} from "../resources";
import { resourceFlowTermsAt } from "../resource-queries";
import {
  cancelFutureDueItem,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { createFutureTransitionHandlerRegistry } from "../future-transition-registry";
import {
  PLACE_OUTCOMES_TRANSITION_KEY,
  placeOutcomesHandler,
} from "../outcome-web/place-outcomes";
import { snapParticipationRecords } from "./snap-participation";

const seed = "session52-snap-random-new-game-ending";
const validStates = new Set(
  Object.keys(benefitData.monthlyBenefitDollarsByPlace),
);
const place = drawRandomPlace(seed, (candidate) =>
  validStates.has(candidate.stateJurisdictionKey ?? ""),
);
describe(`ranked SNAP participation (${place.displayName}, ${place.key}, seed ${seed})`, () => {
  it("ends a named household in a random new game when the recorded place share drops", async () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    });
    const personId = game.playerPersonId;
    let world = game.world;
    const residence = householdMembershipsAt(world, personId).find(
      (membership) => membership.state.residenceRole === "primary",
    );
    expect(residence).toBeDefined();
    const householdId = residence!.household.id;
    const provenance = {
      kind: "authored" as const,
      note: "Recorded new-game work terms used to exercise SNAP ranking.",
    };
    world = createOrganization(world, {
      stableKey: "session52:snap:employer",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Recorded Local Employer",
        classification: "enterprise:services",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    });
    const employerId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: "session52:snap:work",
      personId,
      organizationId: employerId,
      startedAt: world.currentDate,
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Recorded worker",
        occupationClassification: "occupation:cashier",
        locationJurisdictionId: place.context.jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 10, maximumHours: 10 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: place.context.jurisdiction.id,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    world = createResourceFlow(world, {
      stableKey: "session52:snap:recorded-income",
      source: { kind: "organization", organizationId: employerId },
      recipient: { kind: "person", personId },
      startsAt: world.currentDate,
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "compensation:work",
      basisReference: { kind: "work", workRelationshipId: work.id },
      restrictionKind: null,
      jurisdictionId: place.context.jurisdiction.id,
      provenance,
    });
    const householdPeople = new Set(peopleInHouseholdAt(world, householdId));
    for (const flow of world.history.resourceFlows) {
      if (
        !flow.basisKind.startsWith("compensation:") ||
        flow.recipient.kind !== "person" ||
        !householdPeople.has(flow.recipient.personId)
      )
        continue;
      const terms = resourceFlowTermsAt(world, flow.id);
      if (!terms) continue;
      world = recordResourceFlowTerms(world, {
        stableKey: `session52:snap:income:${flow.id}`,
        resourceFlowId: flow.id,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(5_000, "USD"),
        cadenceKind: "schedule:monthly",
        reason: "Recorded monthly income for the proof household.",
        provenance,
        supersedesTermsId: terms.id,
      });
    }

    const session = await generateOpeningLifeWithProgress(
      prepareOpeningLife(game.setup),
      {},
      { ...game, world },
    );
    expect(session.game).toBeDefined();
    let opened = session.game!.world;
    const proofThrough = addDays(opened.currentDate, 150);
    for (const due of [...opened.history.futureDueItems]) {
      if (
        due.transitionKey === PLACE_OUTCOMES_TRANSITION_KEY ||
        due.dueAt < opened.currentDate ||
        due.dueAt > proofThrough
      )
        continue;
      opened = cancelFutureDueItem(opened, {
        stableKey: `session52:snap:isolated:${due.id}`,
        dueItemId: due.id,
        effectiveAt: opened.currentDate,
        reasonKey: "snap-proof:limit-to-place-outcomes",
        context: null,
      });
    }
    const handlers = createFutureTransitionHandlerRegistry([
      [PLACE_OUTCOMES_TRANSITION_KEY, placeOutcomesHandler],
    ]);
    for (let month = 0; month < 5; month += 1) {
      const due = opened.history.futureDueItems
        .filter(
          (item) =>
            item.transitionKey === PLACE_OUTCOMES_TRANSITION_KEY &&
            item.dueAt > opened.currentDate,
        )
        .sort((left, right) => left.dueAt.localeCompare(right.dueAt))[0];
      if (!due) break;
      opened = resolveFutureDueItemsThrough(opened, due.dueAt, handlers);
    }
    const records = snapParticipationRecords(opened).filter(
      (record) => record.householdId === householdId,
    );
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(records[0]!.enrolled).toBe(true);
    expect(records[0]!.monthlyBenefitMinor).toBeGreaterThan(0);
    expect(records[0]!.benefitBasis).toBe("ESTIMATED FROM STATE AVERAGE");
    expect(records[0]!.benefitSource).toContain("snap-sar-fy23.pdf");
    expect(records.at(-1)!.enrolled).toBe(false);
    expect(records.at(-1)).toMatchObject({
      householdId,
      causeId: expect.stringMatching(/^starting-law:/),
      benefitBasis: null,
      monthlyBenefitMinor: null,
    });
    expect(records.at(-1)!.effectiveAt > records[0]!.effectiveAt).toBe(true);
    expect(opened.people[personId]!.givenName).toBeTruthy();
    expect(opened.people[personId]!.familyName).toBeTruthy();
    expect(place.stateJurisdictionKey).toBeTruthy();
    expect(records[0]!.incomeToThreshold).toBeLessThanOrEqual(1.3);
    expect(records.at(-1)!.monthlyWorkHours).toBeGreaterThan(0);
  }, 120_000);
});
