/// <reference types="node" />
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as programs from "./program-governing";
import * as governing from "./state-governing";
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
  publicProgramHandlers,
  PUBLIC_PROGRAM_DELIVERY,
  declareProgramCapacity,
  programInstallments,
  programOutturns,
  programDeliveryHandler,
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
const receiptBaseline = process.env.G8_RECEIPT_BASELINE === "1";
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
  ...publicProgramHandlers(),
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
    if (!matter.deadline) throw new Error("The program deadline is missing.");
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
        ...publicProgramHandlers(),
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
    // The newly saved receipt reports directly; the blocked due stays intact.
    const automatic = arrived.history.events.filter(
      (event) =>
        event.type === GOVERNING_OUTCOME &&
        event.tags.includes(`matter:${matterId}`),
    );
    expect(automatic).toHaveLength(receiptBaseline ? 0 : 1);
    if (!receiptBaseline) {
      expect(automatic[0]!.occurredAt).toBe(delivery.dueAt);
      expect(automatic[0]!.tags).toContain(`source-record:${outturn.id}`);
      expect(automatic[0]!.tags).toContain(`source-event:${outturn.eventId}`);
      expect(automatic[0]!.tags).toContain(
        `decision:${governingMatterById(arrived, matterId)!.decision!.id}`,
      );
    }
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
      automaticReportsAtDelivery: automatic.length,
      laterReports: result.outcomes.length,
      paidHash: hash(paid),
      programRecordsHash: createHash("sha256")
        .update(JSON.stringify(arrived.history.publicProgramRecords))
        .digest("hex"),
      flowsHash: createHash("sha256")
        .update(JSON.stringify(arrived.history.resourceFlows))
        .digest("hex"),
      paymentIds: arrived.history.resourceTransferOutcomes.map((row) => row.id),
    });
  });

  it("reports immediate native maintenance only after its actual governing work is complete", () => {
    const alternatives = programs.programAlternativesFor;
    // An explicitly supplied immediate-delivery fixture exercises the existing
    // null-lead route; production alternatives and their timing are unchanged.
    const immediate = vi
      .spyOn(programs, "programAlternativesFor")
      .mockImplementation((world, appropriation) =>
        alternatives(world, appropriation).map((alternative) =>
          alternative.key === "restore-units"
            ? { ...alternative, deliveryLeadDays: null }
            : alternative,
        ),
      );
    let world: World;
    try {
      const result = decideGoverningMatter(
        opened,
        matterId,
        "program:restore-units",
      );
      expect(result.ok).toBe(true);
      world = result.world;
    } finally {
      immediate.mockRestore();
    }
    const outturn = programOutturns(world, TRANSIT).at(-1)!;
    expect(outturn.restoredUnits).toBeGreaterThan(0);
    expect(outturn.recordedAt).toBe(world.currentDate);
    const completed = completedGoverningMatterWork(world, matterId)!;
    const decision = governingMatterById(world, matterId)!.decision!;
    expect(completed.outcomeEventId).toBe(decision.id);
    expect(completed.sequence).toBeLessThan(outturn.sequence);
    const outcomes = world.history.events.filter(
      (event) =>
        event.type === GOVERNING_OUTCOME &&
        event.tags.includes(`matter:${matterId}`),
    );
    expect(outcomes).toHaveLength(receiptBaseline ? 0 : 1);
    if (!receiptBaseline) {
      expect(outcomes[0]!.tags).toContain(`source-record:${outturn.id}`);
      expect(outcomes[0]!.sequence).toBeGreaterThan(outturn.sequence);
      const saved = deserializeWorld(serializeWorld(world));
      expect(
        governing.reviewGoverningOutturns(saved, new Set([outturn.id])),
      ).toBe(saved);
      expect(governing.reviewGoverningOutturns(saved, new Set())).toBe(saved);
      const appropriationId = governingMatterById(
        saved,
        matterId,
      )!.appropriationId!;
      expect(
        governing.reviewGoverningOutturns(saved, new Set([appropriationId])),
      ).toBe(saved);
    }
    receipts.push({
      case: "immediate-receipt",
      seed,
      personId: managerId,
      name: personName(world.people[managerId]!),
      matterId,
      workId,
      decisionId: decision.id,
      outturnId: outturn.id,
      immediateReports: outcomes.length,
    });
  });
  it("receipt identity survives reload and repeat of the actual scheduled delivery", () => {
    const outturn = programOutturns(delivered, TRANSIT).at(-1)!;
    const deliveryDue = delivered.history.futureDueItems.find(
      (due) =>
        due.transitionKey === PUBLIC_PROGRAM_DELIVERY &&
        due.dueAt === outturn.recordedAt,
    )!;
    expect(deliveryDue).toBeDefined();
    const continued = deserializeWorld(serializeWorld(delivered));
    expect(programOutturns(continued, TRANSIT)).toEqual(
      programOutturns(delivered, TRANSIT),
    );
    expect(continued.history.publicProgramRecords).toEqual(
      delivered.history.publicProgramRecords,
    );
    expect(governingMatterById(continued, matterId)).toEqual(
      governingMatterById(delivered, matterId),
    );
    expect(completedGoverningMatterWork(continued, matterId)).toEqual(
      completedGoverningMatterWork(delivered, matterId),
    );
    // The first delivery was clock-driven. This replay checks the existing
    // handler's duplicate guard without writing a report or new due item.
    const repeated = programDeliveryHandler(continued, deliveryDue);
    expect(repeated.status).toBe("resolved");
    expect(repeated.outcomeEventId).toBeNull();
    expect(repeated.world).toBe(continued);
    const later = advanceWorld(
      continued,
      1,
      createFutureTransitionHandlerRegistry([
        ...publicProgramHandlers(),
        [GOVERNING_DEADLINE, governingDeadlineHandler],
        [GOVERNING_FOLLOW_UP, governingFollowUpHandler],
      ]),
    );
    expect(programOutturns(later, TRANSIT)).toEqual(
      programOutturns(continued, TRANSIT),
    );
    expect(later.history.publicProgramRecords).toEqual(
      continued.history.publicProgramRecords,
    );
    expect(later.history.resourceFlows).toEqual(
      continued.history.resourceFlows,
    );
    expect(later.history.resourceTransferOutcomes).toEqual(
      continued.history.resourceTransferOutcomes,
    );
    receipts.push({
      case: "delivery-repeat-identity",
      seed,
      personId: managerId,
      name: personName(later.people[managerId]!),
      matterId,
      workId,
      outturnId: outturn.id,
      commitmentId: outturn.commitmentId,
      installmentId: outturn.installmentId,
      sourceEventId: outturn.eventId,
      deliveryDueId: deliveryDue.id,
      repeatedWorldUnchanged: repeated.world === continued,
    });
  });
});
