import research from "../../data/research/laws/student-debt-relief.json" with { type: "json" };
import { ageOnDate } from "./dates";
import { policyTermsInForce } from "./governing/policy-bill-terms";
import {
  stateKeyForJurisdiction,
  lifePlaceByJurisdictionId,
} from "./life-places";
import { educationHistoryEvidenceForPerson } from "./life-queries";
import {
  loanTermsAt,
  openHouseholdLoan,
  recordDebtRelief,
} from "./household-loans";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  outstandingDebtAt,
  resourceFlowTermsAt,
  resourcePositionAt,
} from "./resource-queries";
import { money } from "./resources";
import type { EntityId, IsoDate, World } from "./types";

export const STUDENT_DEBT_RELIEF_QUESTION =
  "us-federal-positions:education.forgive-student-loans";

/** Recorded annual compensation. An unsupported cadence remains unavailable. */
export function recordedAnnualPayCents(
  world: World,
  personId: EntityId,
): number | null {
  let total = 0;
  let known = false;
  for (const flow of world.history.resourceFlows) {
    if (
      flow.recipient.kind !== "person" ||
      flow.recipient.personId !== personId ||
      !flow.basisKind.startsWith("compensation:")
    )
      continue;
    const terms = resourceFlowTermsAt(world, flow.id);
    if (!terms || terms.status !== "active") continue;
    const period = /(biweekly|semimonthly|weekly|monthly)/.exec(
      terms.cadenceKind,
    )?.[1];
    const perYear = period
      ? (
          { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 } as Record<
            string,
            number
          >
        )[period]
      : undefined;
    if (!perYear) return null;
    known = true;
    total += terms.amount.minorUnits * perYear;
  }
  return known ? Math.round(total) : null;
}

function loanBorrowers(world: World): Map<EntityId, EntityId> {
  const sources = new Map(
    world.history.resourceFlows.map((flow) => [flow.id, flow.source]),
  );
  return new Map(
    world.history.resourceObligations.flatMap((debt) => {
      const source = sources.get(debt.resourceFlowId);
      return source?.kind === "person"
        ? [[debt.id, source.personId] as const]
        : [];
    }),
  );
}

/** Populate unread education financing once; a known loan (even paid off) wins. */
export function ensureStudentDebt(world: World): World {
  let next = world;
  const owners = loanBorrowers(world);
  const borrowers = new Set(
    (world.history.loanTerms ?? [])
      .filter((row) => row.kind === "student")
      .map((row) => owners.get(row.resourceObligationId)),
  );
  for (const person of Object.values(world.people)) {
    const age = ageOnDate(person.birthDate, world.currentDate);
    if (age < 18 || age >= research.model.remainingDebtEndAge) continue;
    if (borrowers.has(person.id)) continue;
    const college = educationHistoryEvidenceForPerson(world, person.id).some(
      (row) =>
        row.source === "canonical"
          ? row.enrollment.programKind.startsWith("postsecondary:")
          : /college|university|bachelor|master|associate|doctor/i.test(
              `${row.fact.institution} ${row.fact.credential ?? ""}`,
            ),
    );
    if (!college) continue;
    const income = recordedAnnualPayCents(world, person.id);
    const position = resourcePositionAt(
      world,
      { kind: "person", personId: person.id },
      money(0, "USD").currency,
    );
    // Existing liquid resources sufficient to finance the proxy balance mean no inferred borrowing.
    if (
      position &&
      position.liquidBalance.minorUnits >=
        research.balanceMedianCents * research.model.financingIncomeMultiple
    )
      continue;
    const factor = Math.max(
      research.balanceSpread[0]!,
      Math.min(
        research.balanceSpread[1]!,
        (research.model.remainingDebtEndAge - age) / 30 +
          (income === null ? 0 : income / (research.medianPaymentCents * 1200)),
      ),
    );
    next = openHouseholdLoan(next, {
      stableKey: `estimated-student-debt:${person.id}`,
      borrower: { kind: "person", personId: person.id },
      lenderOrganizationId: null,
      lenderKind: "federal-government",
      kind: "student",
      principal: money(Math.round(research.balanceMedianCents * factor), "USD"),
      marketAnnualRateBasisPoints: research.annualRateBasisPoints,
      rateCap: null,
      repayment: { kind: "installment", termMonths: research.termMonths },
      lateFee: null,
      missedPaymentsToDefault: research.model.missedPaymentsToDefault,
      missedPaymentsToCollections: research.model.missedPaymentsToCollections,
      jurisdictionId: person.homeJurisdictionId,
      housingTenureId: null,
      provenance: {
        kind: "authored",
        note: `ESTIMATED FROM AVERAGE: recorded college history, age ${age}, annual pay ${income ?? "unrecorded"}; SHED median and spread in data/research/laws/student-debt-relief.json.`,
      },
    });
  }
  return next;
}

/** A single cap across all eligible federal loans, remembered across saves and later passes. */
export function applyStudentDebtRelief(world: World): World {
  const reading = policyTermsInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    STUDENT_DEBT_RELIEF_QUESTION,
    world.currentDate,
  );
  if (!reading?.terms) return world;
  const { capPerBorrowerCents, incomeLimitAnnualCents } = reading.terms.values;
  if (capPerBorrowerCents === undefined || incomeLimitAnnualCents === undefined)
    return world;
  let next = world;
  const owners = loanBorrowers(world);
  for (const debt of world.history.resourceObligations) {
    const terms = loanTermsAt(next, debt.id, next.currentDate);
    if (
      terms?.kind !== "student" ||
      terms.lenderKind !== "federal-government" ||
      !owners.has(debt.id)
    )
      continue;
    const personId = owners.get(debt.id)!;
    const income = recordedAnnualPayCents(next, personId);
    // A missing income record does not establish eligibility.
    if (income === null || income > incomeLimitAnnualCents) continue;
    const used = (next.history.debtReliefs ?? [])
      .filter(
        (row) =>
          row.measureId === reading.law.measureId &&
          owners.get(row.resourceObligationId) === personId,
      )
      .reduce((sum, row) => sum + row.amount.minorUnits, 0);
    const balance = outstandingDebtAt(next, debt.id);
    if (!balance) continue;
    const amount = Math.min(balance.minorUnits, capPerBorrowerCents - used);
    if (amount <= 0) continue;
    next = recordDebtRelief(next, {
      stableKey: `student-relief:${reading.law.measureId}:${debt.id}`,
      resourceObligationId: debt.id,
      relievedAt: next.currentDate,
      amount: money(amount, balance.currency),
      measureId: reading.law.measureId,
      reason: `DECIDED: recorded annual pay ${income} cents is within filed limit ${incomeLimitAnnualCents}; remaining borrower cap ${capPerBorrowerCents - used}; outstanding balance ${balance.minorUnits}.`,
    });
  }
  return next;
}

export function studentDebtReliefOutlay(
  world: World,
  month: IsoDate,
): readonly { measureId: EntityId; dollars: number }[] {
  const totals = new Map<EntityId, number>();
  for (const row of world.history.debtReliefs ?? []) {
    const terms = loanTermsAt(world, row.resourceObligationId, row.relievedAt);
    if (terms?.kind !== "student" || terms.lenderKind !== "federal-government")
      continue;
    if (row.relievedAt.slice(0, 7) !== month.slice(0, 7)) continue;
    totals.set(
      row.measureId,
      (totals.get(row.measureId) ?? 0) + row.amount.minorUnits,
    );
  }
  return [...totals].map(([measureId, cents]) => ({
    measureId,
    dollars: Math.round(cents / 100),
  }));
}

/** Actual balances currently past due, in dollars; relief never creates a payment. */
export function pastDueDebtDollars(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate,
): number {
  const owners = loanBorrowers(world);
  const state = world.jurisdictions[jurisdictionId]
    ? stateKeyForJurisdiction(world.jurisdictions[jurisdictionId]!)
    : null;
  let cents = 0;
  for (const debt of world.history.resourceObligations) {
    const owner = owners.get(debt.id);
    const person = owner ? world.people[owner] : undefined;
    if (!person) continue;
    const homeState = lifePlaceByJurisdictionId(
      person.homeJurisdictionId,
    )?.stateJurisdictionKey;
    if (
      jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id &&
      person.homeJurisdictionId !== jurisdictionId &&
      (!state || state !== homeState)
    )
      continue;
    const standing = (world.history.debtStandings ?? [])
      .filter(
        (row) =>
          row.resourceObligationId === debt.id && row.effectiveAt <= onDate,
      )
      .at(-1);
    if (
      !standing ||
      !["late", "default", "collections"].includes(standing.standing)
    )
      continue;
    cents +=
      outstandingDebtAt(world, debt.id, {
        asOfDate: onDate,
        historySequenceExclusive: world.history.nextSequence,
      })?.minorUnits ?? 0;
  }
  return cents / 100;
}
