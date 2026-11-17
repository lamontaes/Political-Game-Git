/**
 * What the apology over a missed payment may lean on (Story lead, Nov 17, the
 * owed-apology rewrite). The quarrel record (`family.quarrel`) names the
 * missed payment (`missedId`); each fact is read from the one record that
 * holds it and set only where it holds it (an effect is a read, not a
 * record), so a line that needs it plays only where it is true:
 *
 * - `loan`: what the payment was for, as people say it, from the missed
 *   payment's loan kind (payment-words.json); a kind with no name is not said;
 * - `lender`: who was not paid, by the lender organization's name, from the
 *   credit engine's loan row;
 * - `behind`: how far behind the loan is, in words and never a figure, from
 *   the row's past-due money against its payment (apology-reads.json);
 * - `household-short`: the household's liquid money does not cover a month of
 *   what its pay leaves of its living costs (family-stake.ts's read);
 * - `due-next`: the day the credit engine bills next, which the
 *   `pay-on-time` promise settles against;
 * - `quarreled-before`: an earlier `family.quarrel` between the two over a
 *   different missed payment.
 *
 * Read when the scene is composed, never on a day tick.
 */
import { daysBetweenText } from "../core2/kernel/dates";
import { loanOf, nextBillingDay } from "../core2/modules/business";
import { FAMILY_QUARREL } from "../core2/modules/partnerships";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { dayAhead } from "../english/day-words";
import { paymentSaid } from "../english/payment-words";
import type { Fact } from "../english/scene-talk-words";
import readsFile from "./data/apology-reads.json" with { type: "json" };
import { householdMoney } from "./family-stake";
import { organizationName } from "./words";

/** The purpose the scene plays under (its variants are `owed-apology.<name>`). */
export const APOLOGY_PURPOSE = "owed-apology";

/** The kind of the credit engine's missed-payment record. */
const PAYMENT_MISSED = "credit.payment-missed";

const READS = readsFile as unknown as {
  behind: readonly { upToPayments?: number; said: string }[];
  householdShortRunwayDays: number;
};

/** How far behind a loan is, as people say it, from its past-due money over its payment. */
export function behindSaid(pastDueMinor: number, paymentMinor: number): string {
  const payments = pastDueMinor / paymentMinor;
  return (
    READS.behind.find(
      (row) => row.upToPayments === undefined || payments <= row.upToPayments,
    ) ?? READS.behind[READS.behind.length - P.one]!
  ).said;
}

/** What an apology's reads are read against. */
export interface ApologyReadsInput {
  /** The quarrel record (`family.quarrel`). */
  readonly causeId: string;
  /** The wronged one and the borrower (the player). */
  readonly wrongedId: PersonId;
  readonly borrowerId: PersonId;
}

export function apologyReads(
  core: Readonly<CoreState>,
  input: ApologyReadsInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const { causeId, wrongedId, borrowerId } = input;
  const quarrel = core.durableLog.get(causeId);
  if (!quarrel) return facts;
  const api = coreAPI(core as CoreState);
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  const missedId = quarrel.facts?.missedId;
  const missed = missedId ? core.durableLog.get(missedId) : undefined;
  if (missed?.kind === PAYMENT_MISSED) {
    const loanKind = missed.facts?.loanKind;
    const loanId = missed.facts?.loanId;
    const said = paymentSaid(loanKind);
    if (said) facts.loan = fact(said, [causeId, missed.id]);
    const loan =
      loanId && core.modules.has("credit") ? loanOf(api, loanId) : undefined;
    if (loan) {
      const lender = core.organizations.get(loan.lenderId);
      if (lender)
        facts.lender = fact(organizationName(lender), [
          causeId,
          loan.id,
          lender.id,
        ]);
      if (loan.pastDueMinor > P.zero && loan.paymentMinor > P.zero)
        facts.behind = fact(behindSaid(loan.pastDueMinor, loan.paymentMinor), [
          causeId,
          loan.id,
        ]);
      const due = nextBillingDay(api);
      const said = due ? dayAhead(due, core.date) : null;
      if (due && said) facts["due-next"] = fact(said, [causeId, loan.id]);
    }
  }
  // The household's money against a month of what its pay leaves of its costs.
  const borrower = core.people.get(borrowerId);
  const household = borrower && core.households.get(borrower.householdId);
  if (household) {
    const members = household.memberIds
      .map((id) => core.people.get(id))
      .filter((row): row is NonNullable<typeof row> => !!row?.alive);
    const { liquid, cost } = householdMoney(core, members);
    if (cost > P.zero && liquid / cost < READS.householdShortRunwayDays)
      facts["household-short"] = fact("yes", [
        causeId,
        household.id,
        ...members.map((row) => row.id),
      ]);
  }
  // An earlier quarrel between the same two over another missed payment.
  const earlier: string[] = [];
  for (const id of core.logByKind.get(FAMILY_QUARREL) ?? []) {
    const event = core.durableLog.get(id);
    if (!event || event.id === causeId || event.date >= quarrel.date) continue;
    if (event.facts?.missedId === missedId) continue;
    if (
      event.personIds.includes(wrongedId) &&
      event.personIds.includes(borrowerId) &&
      daysBetweenText(event.date, quarrel.date) > P.zero
    )
      earlier.push(event.id);
  }
  if (earlier.length)
    facts["quarreled-before"] = fact("yes", [causeId, ...earlier]);
  return facts;
}
