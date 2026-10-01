/// <reference types="node" />
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  city,
  FIXTURE,
  pay,
  TRANSIT,
} from "../../../tests/fixtures/public-program-fixture";
import { addDays, daysBetween } from "../dates";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  scheduleFutureDueItem,
} from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { personName } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { money } from "../resources";
import {
  ensureLocalPublicAccount,
  publicTaxAccountForIdentity,
} from "../tax-policy";
import { workItemState } from "../time-work";
import type { EntityId, World } from "../types";
import { advanceWorld, assertWorldIntegrity } from "../world";
import {
  PUBLIC_PROGRAM_HANDLERS,
  PUBLIC_PROGRAM_DELIVERY,
  declareProgramCapacity,
  programInstallments,
  programOutturns,
  recordProgramAppropriation,
} from "./public-program";
import {
  GOVERNING_DEADLINE,
  GOVERNING_FOLLOW_UP,
  GOVERNING_OUTCOME,
  completedGoverningMatterWork,
  decideGoverningMatter,
  governingDeadlineHandler,
  governingFollowUpHandler,
  governingMatterById,
  governingMatters,
  openProgramMattersForAllOffices,
} from "./state-governing";

const baseline = process.env.G8_ACTION_BASELINE === "1";
const seed = "G8-recorded-governing-action";
const receipts: unknown[] = [];
let opened: World;
let noAction: World;
let paid: World;
let delivered: World;
let matterId: EntityId;
let managerId: EntityId;
let workId: EntityId;
const handlers = createFutureTransitionHandlerRegistry([
  ...PUBLIC_PROGRAM_HANDLERS,
  [GOVERNING_DEADLINE, governingDeadlineHandler],
]);
const reports = createFutureTransitionHandlerRegistry([
  [GOVERNING_FOLLOW_UP, governingFollowUpHandler],
]);

function hash(world: World) {
  return createHash("sha256").update(JSON.stringify(world)).digest("hex");
}
function report(world: World) {
  const input = scheduleFutureDueItem(world, {
    stableKey: `G8:controlled-report:${world.currentDate}:${matterId}`,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: GOVERNING_FOLLOW_UP,
    entityIds: [matterId],
    jurisdictionId: governingMatterById(world, matterId)!.openedEvent
      .jurisdictionId,
    provenance: {
      kind: "authored",
      note: "Controlled callback to the actual saved program matter; no invented duty or bill.",
    },
  });
  const output = advanceWorld(input, 1, reports);
  expect(output.history.publicProgramRecords).toEqual(
    input.history.publicProgramRecords,
  );
  expect(output.history.resourceFlows).toEqual(input.history.resourceFlows);
  expect(output.history.resourceTransferOutcomes).toEqual(
    input.history.resourceTransferOutcomes,
  );
  const outcomes = output.history.events.filter(
    (event) =>
      event.type === GOVERNING_OUTCOME &&
      event.tags.includes(`matter:${matterId}`),
  );
  return { input, output, outcomes };
}

beforeAll(() => {
  const g = city(seed, 2_000_000_00);
  managerId = g.manager;
  const identity = {
    kind: "local-government" as const,
    jurisdictionId: g.jurisdictionId,
    governmentKey: g.governmentKey,
  };
  let world = ensureLocalPublicAccount(g.world, identity);
  const account = publicTaxAccountForIdentity(world, identity)!;
  world = pay(
    world,
    "G8:explicit-local-receipt",
    g.payer,
    account.organizationId,
    2_000_000_00,
  );
  world = declareProgramCapacity(world, {
    edition: "G8:local-capacity",
    programKey: TRANSIT,
    jurisdictionId: g.jurisdictionId,
    publicGovernmentIdentity: identity,
    serviceLabel: "Fixture city bus service",
    unitLabel: "buses",
    unitsTotal: 10,
    unitsOperational: 8,
    monthlyOperatingNeed: money(200_000_00, "USD"),
    completedPermille: 600,
    restorationCostPerUnit: money(150_000_00, "USD"),
    basis: FIXTURE,
  }).world;
  const appropriation = recordProgramAppropriation(world, {
    edition: "G8:local-appropriation",
    programKey: TRANSIT,
    jurisdictionId: g.jurisdictionId,
    publicGovernmentIdentity: identity,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 364),
    basis: FIXTURE,
  });
  opened = openProgramMattersForAllOffices(
    appropriation.world,
    new Set([appropriation.id]),
  );
  const matter = governingMatters(opened).find(
    (entry) =>
      entry.appropriationId === appropriation.id &&
      entry.holderPersonId === managerId,
  )!;
  expect(matter).toBeDefined();
  expect(matter.workItemId).not.toBeNull();
  matterId = matter.id;
  workId = matter.workItemId!;
  const declined = decideGoverningMatter(opened, matterId, "program:no-action");
  expect(declined.ok).toBe(true);
  noAction = declined.world;
  const funded = decideGoverningMatter(
    opened,
    matterId,
    "program:restore-units",
  );
  expect(funded.ok).toBe(true);
  paid = funded.world;
  expect(
    programInstallments(paid, TRANSIT).some((row) => row.status === "posted"),
  ).toBe(true);
  expect(programOutturns(paid, TRANSIT)).toHaveLength(0);
  const delivery = paid.history.futureDueItems.find(
    (due) => due.transitionKey === PUBLIC_PROGRAM_DELIVERY,
  )!;
  expect(delivery).toBeDefined();
  delivered = advanceWorld(
    paid,
    daysBetween(paid.currentDate, delivery.dueAt),
    handlers,
  );
  expect(
    programOutturns(delivered, TRANSIT).at(-1)?.restoredUnits,
  ).toBeGreaterThan(0);
}, 30000);

afterAll(() => {
  if (process.env.G8_ACTION_PROOF_PATH)
    writeFileSync(
      process.env.G8_ACTION_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("governing work and delivery require their own saved actions", () => {
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "does not turn a completed no-spending decision into delivery for an observer in %s",
    (code) => {
      const jurisdiction = stateJurisdictionForKey(`US-${code}`)!;
      const observer = noAction.personOrder.at(-1)!;
      const world: World = {
        ...noAction,
        people: {
          ...noAction.people,
          [observer]: {
            ...noAction.people[observer]!,
            homeJurisdictionId: jurisdiction.id,
            establishedFacts: noAction.people[observer]!.establishedFacts.map(
              (fact) =>
                fact.kind === "residence" && fact.endedAt === null
                  ? { ...fact, jurisdictionId: jurisdiction.id }
                  : fact,
            ),
          },
        },
        jurisdictions: {
          ...noAction.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [
          ...new Set([...noAction.jurisdictionOrder, jurisdiction.id]),
        ],
      };
      expect(
        completedGoverningMatterWork(world, matterId)?.outcomeEventId,
      ).toBe(governingMatterById(world, matterId)!.decision!.id);
      expect(programOutturns(world, TRANSIT)).toHaveLength(0);
      const result = report(world);
      expect(result.outcomes).toHaveLength(baseline ? 1 : 0);
      const continued = deserializeWorld(serializeWorld(result.output));
      expect(completedGoverningMatterWork(continued, matterId)).toEqual(
        completedGoverningMatterWork(world, matterId),
      );
      const repeated = advanceWorld(continued, 1, reports);
      expect(
        repeated.history.events.filter(
          (event) => event.type === GOVERNING_OUTCOME,
        ),
      ).toEqual(
        continued.history.events.filter(
          (event) => event.type === GOVERNING_OUTCOME,
        ),
      );
      expect(repeated.history.publicProgramRecords).toEqual(
        continued.history.publicProgramRecords,
      );
      receipts.push({
        case: "decision-only",
        code,
        seed,
        personId: managerId,
        name: personName(world.people[managerId]!),
        inputHash: hash(result.input),
        outputHash: hash(result.output),
        outcomes: result.outcomes.map((event) => ({
          id: event.id,
          summary: event.summary,
          tags: event.tags,
        })),
      });
    },
  );

  it("does not count an open work item or a cancellation as fulfillment", () => {
    expect(completedGoverningMatterWork(opened, matterId)).toBeNull();
    const completed = workItemState(noAction, workId);
    const cancelled: World = {
      ...noAction,
      history: {
        ...noAction.history,
        workItemStates: noAction.history.workItemStates.map((row) =>
          row.id === completed.id ? { ...row, status: "cancelled" } : row,
        ),
      },
    };
    expect(completedGoverningMatterWork(cancelled, matterId)).toBeNull();
    const result = report(cancelled);
    expect(result.outcomes).toHaveLength(baseline ? 1 : 0);
    receipts.push({
      case: "cancelled",
      inputHash: hash(result.input),
      outputHash: hash(result.output),
      outcomes: result.outcomes.length,
    });
  });

  it("keeps the native lapsed decision cancelled rather than fulfilled", () => {
    const matter = governingMatterById(opened, matterId)!;
    const lapsed = advanceWorld(
      opened,
      daysBetween(opened.currentDate, matter.deadline),
      handlers,
    );
    expect(governingMatterById(lapsed, matterId)?.status).toBe("lapsed");
    expect(workItemState(lapsed, workId).status).toBe("cancelled");
    expect(completedGoverningMatterWork(lapsed, matterId)).toBeNull();
    const result = report(lapsed);
    expect(result.outcomes).toHaveLength(baseline ? 1 : 0);
    const continued = deserializeWorld(serializeWorld(result.output));
    expect(workItemState(continued, workId).status).toBe("cancelled");
    expect(completedGoverningMatterWork(continued, matterId)).toBeNull();
    receipts.push({
      case: "native-lapse",
      inputHash: hash(result.input),
      outputHash: hash(result.output),
      outcomes: result.outcomes.length,
    });
  });

  it("requires completion to cite this matter's own decision", () => {
    const completed = workItemState(noAction, workId);
    const mismatch: World = {
      ...noAction,
      history: {
        ...noAction.history,
        workItemStates: noAction.history.workItemStates.map((row) =>
          row.id === completed.id ? { ...row, outcomeEventId: matterId } : row,
        ),
      },
    };
    expect(completedGoverningMatterWork(mismatch, matterId)).toBeNull();
    expect(() => assertWorldIntegrity(mismatch)).toThrow(
      /invalid outcome event/,
    );
    receipts.push({
      case: "mismatched-outcome",
      inputHash: hash(mismatch),
      outputHash: hash(mismatch),
      invalidStateRefused: true,
    });
  });

  it("does not count posted money as delivered maintenance", () => {
    expect(completedGoverningMatterWork(paid, matterId)).not.toBeNull();
    const result = report(paid);
    expect(result.outcomes).toHaveLength(baseline ? 1 : 0);
    receipts.push({
      case: "payment-only",
      inputHash: hash(result.input),
      outputHash: hash(result.output),
      outcomes: result.outcomes.length,
    });
  });

  it("reports the saved delivered outturn and preserves its source across Save/Continue", () => {
    const outturn = programOutturns(delivered, TRANSIT).at(-1)!;
    const source = delivered.history.events.find(
      (event) => event.id === outturn.eventId,
    )!;
    const result = report(delivered);
    expect(result.outcomes).toHaveLength(1);
    if (!baseline) {
      expect(result.outcomes[0]!.summary).toBe(source.summary);
      expect(result.outcomes[0]!.tags).toContain(`source-event:${source.id}`);
    }
    const continued = deserializeWorld(serializeWorld(result.output));
    expect(
      completedGoverningMatterWork(continued, matterId)?.outcomeEventId,
    ).toBe(governingMatterById(continued, matterId)!.decision!.id);
    const repeated = advanceWorld(continued, 1, reports);
    expect(
      repeated.history.events.filter(
        (event) => event.type === GOVERNING_OUTCOME,
      ),
    ).toEqual(
      continued.history.events.filter(
        (event) => event.type === GOVERNING_OUTCOME,
      ),
    );
    expect(repeated.history.publicProgramRecords).toEqual(
      continued.history.publicProgramRecords,
    );
    receipts.push({
      case: "delivered",
      seed,
      name: personName(delivered.people[managerId]!),
      personId: managerId,
      workId,
      matterId,
      outturnId: outturn.id,
      sourceEventId: source.id,
      restoredUnits: outturn.restoredUnits,
      inputHash: hash(result.input),
      outputHash: hash(result.output),
      summary: result.outcomes[0]!.summary,
    });
  });

  it("receipt timing keeps an early report blocked until its linked appropriation actually delivers", () => {
    const early = report(paid);
    expect(early.outcomes).toHaveLength(0);
    const earlyDue = early.output.history.futureDueItems.find((due) =>
      due.stableKey.startsWith("G8:controlled-report:"),
    )!;
    expect(earlyDue).toBeDefined();
    const earlyState = futureDueItemStateAt(early.output, earlyDue.id, {
      asOfDate: early.output.currentDate,
      historySequenceExclusive: early.output.history.nextSequence,
    });
    expect(earlyState?.status).toBe("blocked");
    expect(earlyState?.reasonKey).toBe("governing:no-delivery-receipt");
    const delivery = early.output.history.futureDueItems.find(
      (due) => due.transitionKey === PUBLIC_PROGRAM_DELIVERY,
    )!;
    expect(delivery.dueAt > early.output.currentDate).toBe(true);
    const continued = deserializeWorld(serializeWorld(early.output));
    const arrived = advanceWorld(
      continued,
      daysBetween(continued.currentDate, delivery.dueAt),
      createFutureTransitionHandlerRegistry([
        ...PUBLIC_PROGRAM_HANDLERS,
        [GOVERNING_DEADLINE, governingDeadlineHandler],
        [GOVERNING_FOLLOW_UP, governingFollowUpHandler],
      ]),
    );
    const outturn = programOutturns(arrived, TRANSIT).at(-1)!;
    expect(outturn.restoredUnits).toBeGreaterThan(0);
    expect(outturn.recordedAt).toBe(delivery.dueAt);
    const installment = arrived.history.publicProgramRecords!.find(
      (record) => record.id === outturn.installmentId,
    )!;
    expect(installment.kind).toBe("installment");
    if (installment.kind !== "installment")
      throw new Error("Missing installment");
    expect(installment.status).toBe("posted");
    expect(installment.commitmentId).toBe(outturn.commitmentId);
    const commitment = arrived.history.publicProgramRecords!.find(
      (record) => record.id === outturn.commitmentId,
    )!;
    expect(commitment.kind).toBe("commitment");
    if (commitment.kind !== "commitment") throw new Error("Missing commitment");
    expect(commitment.appropriationId).toBe(
      governingMatterById(arrived, matterId)!.appropriationId,
    );
    // A blocked callback is not a polling or later-receipt retry mechanism.
    expect(
      arrived.history.events.filter(
        (event) =>
          event.type === GOVERNING_OUTCOME &&
          event.tags.includes(`matter:${matterId}`),
      ),
    ).toHaveLength(0);
    expect(
      futureDueItemStateAt(arrived, earlyDue.id, {
        asOfDate: arrived.currentDate,
        historySequenceExclusive: arrived.history.nextSequence,
      }),
    ).toEqual(earlyState);
    const result = report(deserializeWorld(serializeWorld(arrived)));
    const source = arrived.history.events.find(
      (event) => event.id === outturn.eventId,
    )!;
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0]!.summary).toBe(source.summary);
    expect(result.outcomes[0]!.tags).toContain(`source-event:${source.id}`);
    expect(result.outcomes[0]!.tags).toContain(`source-record:${outturn.id}`);
    receipts.push({
      case: "receipt-timing",
      seed,
      personId: managerId,
      name: personName(arrived.people[managerId]!),
      matterId,
      appropriationId: commitment.appropriationId,
      commitmentId: commitment.id,
      installmentId: installment.id,
      outturnId: outturn.id,
      sourceEventId: source.id,
      earlyReportDate: early.output.currentDate,
      deliveryDate: outturn.recordedAt,
      laterReportDate: result.output.currentDate,
      earlyReports: early.outcomes.length,
      automaticReportsAtDelivery: 0,
      laterReports: result.outcomes.length,
    });
  });
});
