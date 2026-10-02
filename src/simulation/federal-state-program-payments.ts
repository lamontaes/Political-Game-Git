import { currentPresidentOf } from "./crisis/offices";
import { commitPublicProgram } from "./governing/public-program";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { lawInForce } from "./governing/law-in-force";
import { stateKeyForJurisdiction } from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { money } from "./resources";
import { publicTaxAccountForJurisdiction } from "./tax-policy";
import type { EntityId, World } from "./types";

/** Bind admitted payable inputs to the existing cash/authority/payment writer. */
export function postFederalStateProgramPayments(start: World): {
  world: World;
  blocked: readonly {
    appropriationId: EntityId;
    claimKey: string;
    reason: string;
  }[];
} {
  let world = start;
  const blocked: {
    appropriationId: EntityId;
    claimKey: string;
    reason: string;
  }[] = [];
  const nation = NATIONAL_ELECTION_JURISDICTION.id;
  for (const appropriation of start.history.publicProgramRecords ?? []) {
    if (
      appropriation.kind !== "appropriation" ||
      !appropriation.statePaymentClaims?.length
    )
      continue;
    for (const claim of appropriation.statePaymentClaims) {
      const refuse = (reason: string) =>
        blocked.push({
          appropriationId: appropriation.id,
          claimKey: claim.stableKey,
          reason,
        });
      if (claim.dueAt > world.currentDate) continue;
      const existing = (world.history.publicProgramRecords ?? []).some(
        (record) =>
          record.kind === "commitment" &&
          record.appropriationId === appropriation.id &&
          record.federalStatePayment?.claimKey === claim.stableKey,
      );
      if (existing) continue;
      if (
        !claim.stableKey.trim() ||
        appropriation.jurisdictionId !== nation ||
        appropriation.amount.currency !== "USD" ||
        appropriation.availableFrom > world.currentDate ||
        appropriation.availableThrough < world.currentDate ||
        claim.periodStartsAt > claim.periodEndsAt ||
        claim.periodEndsAt > claim.dueAt ||
        claim.periodStartsAt < appropriation.availableFrom ||
        claim.dueAt > appropriation.availableThrough
      ) {
        refuse(
          "The saved claim has no available federal authority and payable period.",
        );
        continue;
      }
      const jurisdiction = world.jurisdictions[claim.recipientJurisdictionId];
      const recipient =
        jurisdiction && stateKeyForJurisdiction(jurisdiction)
          ? publicTaxAccountForJurisdiction(world, jurisdiction.id)
          : null;
      const payer = publicTaxAccountForJurisdiction(world, nation);
      if (
        !recipient ||
        !payer ||
        payer.organizationId !== appropriation.accountOrganizationId ||
        recipient.organizationId === payer.organizationId
      ) {
        refuse(
          "The claim needs its recorded canonical federal payer and state recipient.",
        );
        continue;
      }
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === claim.amountTerm.questionKey,
      );
      const law = proposition
        ? lawInForce(world, nation, proposition.id, claim.dueAt)
        : null;
      const term =
        law?.answer === "yes" && law.measureId === appropriation.sourceMeasureId
          ? readFinalEnactedLawTerm(world, law, {
              questionKey: claim.amountTerm.questionKey,
              termKey: claim.amountTerm.termKey,
              unit: claim.amountTerm.unit,
              onDate: claim.dueAt,
            })
          : null;
      if (
        !term ||
        !Number.isFinite(term.value) ||
        term.value < 0 ||
        (claim.amountTerm.unit === "ratio" && term.value > 1)
      ) {
        refuse("The claim has no exact supported final adopted payment term.");
        continue;
      }
      const ids = [...new Set(claim.eligibleExpenditureIds)].sort();
      if (
        ids.length !== claim.eligibleExpenditureIds.length ||
        (claim.amountTerm.unit === "ratio" && !ids.length)
      ) {
        refuse(
          "A matching claim needs distinct actual paid expenditure references.",
        );
        continue;
      }
      const alreadyAllocated = new Set(
        (world.history.publicProgramRecords ?? []).flatMap((record) =>
          record.kind === "commitment"
            ? (record.federalStatePayment?.eligibleExpenditureIds ?? [])
            : [],
        ),
      );
      const sourceRecordIds = new Set<EntityId>([
        appropriation.id,
        ...term.sourceRecordIds,
      ]);
      let base = 0;
      let invalid = false;
      for (const id of ids) {
        const outcome = world.history.resourceTransferOutcomes.find(
          (row) => row.id === id,
        );
        const flow =
          outcome &&
          world.history.resourceFlows.find(
            (row) => row.id === outcome.resourceFlowId,
          );
        const reference = flow?.basisReference;
        const expense =
          reference?.kind === "public-program"
            ? (world.history.publicProgramRecords ?? []).find(
                (row) => row.id === reference.commitmentId,
              )
            : null;
        if (
          !outcome ||
          outcome.status !== "completed" ||
          outcome.transferredAmount.currency !== "USD" ||
          outcome.transferredAmount.minorUnits <= 0 ||
          outcome.occurredAt < claim.periodStartsAt ||
          outcome.occurredAt > claim.periodEndsAt ||
          flow?.source.kind !== "organization" ||
          flow.source.organizationId !== recipient.organizationId ||
          flow.recipient.kind !== "organization" ||
          flow.recipient.organizationId === recipient.organizationId ||
          flow.recipient.organizationId === payer.organizationId ||
          expense?.kind !== "commitment" ||
          expense.programKey !== appropriation.programKey ||
          expense.jurisdictionId !== claim.recipientJurisdictionId ||
          !(world.history.publicProgramRecords ?? []).some(
            (row) =>
              row.kind === "installment" &&
              row.commitmentId === expense.id &&
              row.status === "posted" &&
              row.resourceFlowId === flow.id,
          ) ||
          alreadyAllocated.has(id)
        ) {
          invalid = true;
          break;
        }
        base += outcome.transferredAmount.minorUnits;
        sourceRecordIds.add(outcome.id);
        sourceRecordIds.add(flow.id);
        sourceRecordIds.add(expense.id);
      }
      if (invalid || !Number.isSafeInteger(base)) {
        refuse(
          "The expenditure base is ineligible, unrecorded or already allocated.",
        );
        continue;
      }
      const amount =
        claim.amountTerm.unit === "minor"
          ? term.value
          : Math.floor(base * term.value);
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        refuse(
          "The adopted term supplies no supported positive payable amount.",
        );
        continue;
      }
      const president = currentPresidentOf(world);
      if (!president) {
        refuse(
          "The federal payment needs the recorded current executive authority.",
        );
        continue;
      }
      const committed = commitPublicProgram(world, {
        appropriationId: appropriation.id,
        alternative: {
          key: `state-payment:${claim.stableKey}`,
          title: `Recorded ${appropriation.programKey} payment`,
          installments: [
            { afterDays: 0, amount: money(amount, "USD"), purpose: "grant" },
          ],
          deliveryLeadDays: null,
        },
        personId: president.personId,
        office: { kind: "federal-executive" },
        recipientOrganizationId: recipient.organizationId,
        federalStatePayment: {
          claimKey: claim.stableKey,
          eligibleExpenditureIds: ids,
          sourceRecordIds: [...sourceRecordIds].sort(),
          periodStartsAt: claim.periodStartsAt,
          periodEndsAt: claim.periodEndsAt,
        },
      });
      if (!committed.ok) {
        refuse(committed.reason);
        continue;
      }
      world = committed.world;
      const failed = (world.history.publicProgramRecords ?? []).find(
        (row) =>
          row.kind === "installment" &&
          row.commitmentId === committed.recordId &&
          row.status === "failed",
      );
      if (failed?.kind === "installment")
        refuse(failed.reason ?? "Payment did not post.");
    }
  }
  return { world, blocked };
}
