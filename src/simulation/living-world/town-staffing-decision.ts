import { activeWorkRelationshipsAt } from "../life-queries";
import { evaluateDecision } from "../decisions";
import { recordWorldEvent } from "../world";
import {
  townBusinessHasRoomToHire,
  townBusinessLaysOff,
  townBusinessKindBooks,
} from "./town-business-books";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  World,
} from "../types";

/** One employer's recorded books, frozen before its staffing decision. */
export function decideTownStaffingFromBooks(
  world: World,
  organizationId: EntityId,
  stableKey: string,
  action: "hire" | "layoff",
  targets: readonly {
    readonly key: string;
    readonly personId: EntityId;
    readonly payrollPaid?: number;
    readonly sourceRecordIds?: readonly EntityId[];
  }[],
  staff: number,
  townAveragePay = 0,
): { readonly world: World; readonly evaluation: DecisionEvaluation } | null {
  const books = world.townFinances?.businesses[organizationId];
  if (
    !books ||
    books.openedAt > world.currentDate ||
    books.lastQuarterPay === undefined
  )
    return null;
  const dead = new Set(
    world.history.personDeaths
      .filter((row) => row.diedAt <= world.currentDate)
      .map((row) => row.personId),
  );
  const active = world.personOrder.flatMap((personId) =>
    dead.has(personId)
      ? []
      : activeWorkRelationshipsAt(world, personId).filter(
          (job) => job.relationship.organizationId === organizationId,
        ),
  );
  const managers = active.filter(
    (job) => job.relationship.authority === "directs-others",
  );
  staff = Math.max(staff, active.length);
  if (managers.length !== 1 || targets.length === 0) return null;
  const manager = managers[0]!;
  const actorPersonId = manager.relationship.personId;
  const canAct =
    action === "hire"
      ? townBusinessHasRoomToHire(books, staff, townAveragePay)
      : townBusinessLaysOff(books, staff) ||
        (staff > 1 && books.lastQuarterNet < 0);
  const reviewed = recordWorldEvent(world, {
    stableKey: `${stableKey}:books-review`,
    type: "labor.payroll-reviewed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[actorPersonId]!.homeJurisdictionId,
    involvedEntityIds: [
      actorPersonId,
      organizationId,
      manager.relationship.id,
      ...targets.map((row) => row.personId),
    ],
    participants: [
      {
        personId: actorPersonId,
        role: "focus:reviewer",
        detail: "Reviewed the employer's recorded business books.",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      "labor:books-review",
      `books-round:${books.lastRound}`,
      ...targets.flatMap((target) =>
        (target.sourceRecordIds ?? []).map((id) => `source:${id}`),
      ),
    ],
    summary:
      "The employer's manager reviewed its recorded sales, payroll, net income and cash.",
    context: {
      location: null,
      socialContext: "An employer staffing review.",
      pressure: JSON.stringify({
        ...books,
        kindPayShare: townBusinessKindBooks(books.kind).payShare,
        staff,
        townAveragePay,
        action,
        targets,
      }),
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = reviewed.history.events.find(
    (row) => row.stableKey === `${stableKey}:books-review`,
  )!;
  const sourceRefs: DecisionConsideration["sourceRefs"] = [
    { kind: "historical-event", eventId: event.id },
    {
      kind: "life-history",
      reference: { family: "work-role", recordId: manager.role.id },
    },
    {
      kind: "life-history",
      reference: { family: "work-status", recordId: manager.status.id },
    },
  ];
  const considerations: DecisionConsideration[] = [
    {
      stableKey: `${stableKey}:books:hold`,
      optionKey: "hold-staff",
      sourceType: "context:business-books",
      direction: canAct ? "opposes" : "supports",
      importance: "strong",
      confidence: "high",
      sourceRefs,
      explanation: `Recorded quarter ${books.lastRound}: payroll ${books.lastQuarterPay}, sales ${books.annualRevenue / 4}, net ${books.lastQuarterNet}, cash ${books.cash}; the books ${canAct ? "support" : "do not support"} this ${action}.`,
    },
  ];
  for (const target of targets) {
    if (books.lastQuarterNet !== 0) {
      const losses = books.lastQuarterNet < 0;
      considerations.push({
        stableKey: `${stableKey}:net:${target.key}`,
        optionKey: target.key,
        sourceType: "context:business-books",
        direction: (action === "layoff" ? losses : !losses)
          ? "supports"
          : "opposes",
        importance: "moderate",
        confidence: "high",
        sourceRefs,
        explanation: `The books recorded ${books.lastQuarterNet} net dollars in quarter ${books.lastRound}.`,
      });
    }
    const cashCoversLoss =
      books.cash > 0 && books.cash >= Math.max(0, -books.lastQuarterNet);
    considerations.push({
      stableKey: `${stableKey}:cash:${target.key}`,
      optionKey: target.key,
      sourceType: "context:business-books",
      direction: (action === "hire" ? cashCoversLoss : !cashCoversLoss)
        ? "supports"
        : "opposes",
      importance: "moderate",
      confidence: "high",
      sourceRefs,
      explanation: `Recorded cash ${books.cash} ${cashCoversLoss ? "covers" : "does not cover"} the recorded quarter's loss ${Math.max(0, -books.lastQuarterNet)}.`,
    });
    considerations.push({
      stableKey: `${stableKey}:books:${target.key}`,
      optionKey: target.key,
      sourceType: "context:business-books",
      direction: canAct ? "supports" : "opposes",
      importance: "strong",
      confidence: "high",
      sourceRefs,
      explanation:
        action === "hire"
          ? canAct
            ? "The recorded sales and costs cover payroll with this additional worker."
            : "The recorded sales and costs do not cover this additional worker."
          : canAct
            ? "The recorded books show losses or payroll exceeding what sales cover."
            : "The recorded books support keeping the current payroll.",
    });
    // Compare actual payroll saved, never tenure, IDs or a random worker.
    // Equal savings supply equal reasons and leave the target undecided.
    if (canAct && action === "layoff" && target.payrollPaid !== undefined) {
      for (const other of targets) {
        if (
          other.payrollPaid === undefined ||
          target.payrollPaid <= other.payrollPaid
        )
          continue;
        considerations.push({
          stableKey: `${stableKey}:saving:${target.key}:${other.key}`,
          optionKey: target.key,
          sourceType: "context:recorded-payroll",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          sourceRefs,
          explanation: `Ending this job removes ${target.payrollPaid} recorded payroll minor units, more than the ${other.payrollPaid} for the other job.`,
        });
      }
    }
  }
  return {
    world: reviewed,
    evaluation: evaluateDecision(reviewed, {
      stableKey,
      decisionType: "labor.employer-staffing",
      actorPersonId,
      cutoff: {
        asOfDate: reviewed.currentDate,
        historySequenceExclusive: reviewed.history.nextSequence,
      },
      subject: {
        kind: "context:employment",
        key: organizationId,
        entityId: organizationId,
      },
      options: [
        {
          key: "hold-staff",
          label: "Keep staffing unchanged",
          description: "Keep the current staff.",
        },
        ...targets.map((target) => ({
          key: target.key,
          label: action === "hire" ? "Hire this worker" : "End this job",
          description: `Review the recorded staffing option for ${target.personId}.`,
        })),
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    }),
  };
}
