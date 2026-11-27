/**
 * Gifts and donors: asking, answering, giving, spending and posting money.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { shareValue } from "../shares";
import { lawApplied } from "../law-reach/applied";
import { householdIncome } from "./people";
import { leanedScore } from "../trait-decisions";
import type { CoreAPI, PersonId, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { basePlaces } from "../race-places";
import { notifySalesReceipt } from "./finance";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { partyLean } from "../campaign-stances";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import { viewOn } from "./views";
import {
  LEGISLATURE_MODULE_ID,
  provisionStance,
  type BillRow,
} from "./legislature";
import { withholdingOnPay } from "./budgets";
import { standing, type ContestRow, type FilingRow } from "./elections";
import {
  ageOn,
  campaignFor,
  elections,
  heldSlots,
  holdMoneySlot,
  medianTransactionBalance,
  partySide,
  rivalFiling,
  save,
  table,
  townOutsideOf,
  townRow,
  transferCash,
} from "./campaigns-base";
import type {
  AskRow,
  CampaignRow,
  GiftRow,
  MoneyRecord,
} from "./campaigns-base";
import {
  AD_KIND,
  CAMPAIGNS_MODULE_ID,
  DONATION_KIND,
  PURCHASE_KIND,
  postedToday,
} from "./campaigns-constants";
import { backingReasons, contributionLimit } from "./campaigns-petitions";
import type { Purchase } from "./campaigns-work";

/** +1 for a member of the candidate's party, minus their party's distance from it otherwise. */
export function partyFit(
  api: CoreAPI,
  campaign: CampaignRow,
  personId: string,
): number {
  if (!api.state.modules.has(PARTIES_MODULE_ID)) return 0;
  const label = filingOf(api, campaign.filingId)?.party ?? null;
  const tie = partyTie(api, personId);
  if (!label || !tie?.partyId) return 0;
  const theirs = partiesHere(api).find((p) => p.id === tie.partyId);
  if (!theirs) return 0;
  if (theirs.name.toLowerCase() === label.toLowerCase()) return 1;
  const a = partyLean(api, label)?.lean ?? 0;
  const b = partyLean(api, theirs.name)?.lean ?? 0;
  // Two parties a whole scale apart are opposed; two near each other, barely.
  return -Math.abs(a - b) / 2;
}

export function filingOf(
  api: CoreAPI,
  filingId: string,
): FilingRow | undefined {
  return elections(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
}

export function giftOf(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): GiftRow | null {
  return (
    (table(api, "gifts").get(`${filingId}|${donorId}`) as unknown as
      GiftRow | undefined) ?? null
  );
}

/**
 * Every donor's running total to one campaign, read off the gifts table's
 * `byCampaign` rows: a donor's ask weighs their gift against the rest of what
 * the campaign was given (donor-ask-facts.ts).
 */
export function giftsToCampaign(
  api: CoreAPI,
  filingId: string,
): readonly GiftRow[] {
  return table(api, "gifts").query("byCampaign", [
    filingId,
  ]) as unknown as GiftRow[];
}

/**
 * A donor's own reasons to give to a candidate: warmth, agreement with the
 * platform, party, how they stand with the candidate, what they have to
 * spare against a typical gift (`spareAgainstGift`, from `giftBudget`) and
 * every trait's lean between giving and keeping. Above zero they would give
 * if they have the cash; at or below it they keep it (and a minor or the
 * dead never give).
 */
export function donorReason(
  api: CoreAPI,
  filingId: string,
  donorId: string,
  budget?: ReturnType<typeof giftBudget>,
): number {
  const adultAge = api.parameter("votingAge");
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < adultAge)
    return Number.NEGATIVE_INFINITY;
  const why = backingReasons(api, campaign, donor);
  const means = spareAgainstGift(budget ?? giftBudget(api, donor));
  return leanedScore(
    api.state,
    donor,
    "campaigns.donate",
    "give",
    "keep",
    why.warmth +
      why.agreement +
      campaignParameter("donorPartyWeight") * why.party +
      campaignParameter("donorRelationshipWeight") * why.relationship +
      campaignParameter("donorMeansWeight") * means,
  );
}

/**
 * What a person has to spare against a typical gift, -1 to 1: the month's
 * income left after taxes and bills plus the savings beyond their cushion
 * (`giftBudget`), set against `donorSpareGiftsAtEven` typical gifts
 * (`donorTypicalGiftMinor`), sliding as (spare - even) / (spare + even). With
 * nothing to spare it reads -1 (a gift would come out of the bills), at that
 * many gifts 0, and it nears 1 as a gift becomes a small part of what they
 * have; never a threshold.
 */
export function spareAgainstGift(
  budget: Pick<
    ReturnType<typeof giftBudget>,
    "discretionaryMinor" | "savingsMinor"
  >,
): number {
  const spare = Math.max(0, budget.discretionaryMinor + budget.savingsMinor);
  const even =
    campaignParameter("donorSpareGiftsAtEven") *
    campaignParameter("donorTypicalGiftMinor");
  return (spare - even) / (spare + even);
}

/** The row after one more gift: the running total, and the month of it (the calendar month of the gift, restarted when the last gift came in an earlier one). */
function grownGift(
  api: CoreAPI,
  prev: GiftRow | null,
  amountMinor: number,
): Pick<GiftRow, "totalMinor" | "lastDate" | "monthMinor"> {
  const date = api.state.date;
  const sameMonth = !!prev && prev.lastDate.slice(0, 7) === date.slice(0, 7);
  return {
    totalMinor: (prev?.totalMinor ?? 0) + amountMinor,
    lastDate: date,
    monthMinor: (sameMonth ? (prev.monthMinor ?? 0) : 0) + amountMinor,
  };
}

/**
 * What a person has already given this calendar month, to every campaign
 * together, read off their gift rows (`byDonor`). A donor's month is one
 * pot: each campaign's ask works from what is left of it, not from the whole.
 */
export function givenInMonth(api: CoreAPI, donorId: string): number {
  const month = api.state.date.slice(0, 7);
  let given = 0;
  for (const row of table(api, "gifts").query("byDonor", [
    donorId,
  ]) as unknown as GiftRow[])
    if (row.lastDate.slice(0, 7) === month) given += row.monthMinor ?? 0;
  return given;
}

/**
 * What a person has to give from, read from their records: their share of
 * their household's monthly income after the taxes payroll withholds from it
 * and the household's monthly living costs (the month's discretionary budget,
 * where a small political gift of $25 to $100 comes from), and the savings
 * they hold beyond a cushion of months of their own living costs (where a
 * larger gift can come from). Income is read through moves' household
 * reader (`householdIncome`: its living members' open jobs and recorded
 * income awards); each job's month of pay loses what the law in force where
 * its worker lives withholds from it (`withholdingOnPay`: income tax, Social
 * Security, Medicare). Shared evenly among the household's adults.
 *
 * A member built in a child role carries no living costs of their own (the
 * opening population puts a household's costs on its heads), so a grown
 * child at home lives on their share of the household's month: that share
 * is their month of living costs for the cushion and for the span their
 * money is weighed against (`weighedAgainst`). Only a household with no
 * recorded living costs at all leaves the month at zero.
 */
export function giftBudget(
  api: CoreAPI,
  person: Readonly<
    Pick<
      PersonState,
      "id" | "householdId" | "liquidMinor" | "livingCostDailyMinor"
    >
  >,
): {
  readonly monthlyIncomeMinor: number;
  readonly monthlyWithheldMinor: number;
  readonly monthlyLivingMinor: number;
  /** The month's spare still left to give from, after this month's gifts. */
  readonly discretionaryMinor: number;
  readonly givenThisMonthMinor: number;
  readonly savingsMinor: number;
  readonly ownMonthLivingMinor: number;
  readonly cushionMinor: number;
} {
  const core = api.state as CoreState;
  const adultAge = api.parameter("votingAge");
  const members = core.households.get(person.householdId)?.memberIds ?? [
    person.id,
  ];
  const income = householdIncome(api, person.householdId);
  // One month length for the pay, the taxes on it, the bills and the
  // cushion: the household income reader's.
  const perMonth = income.monthDays;
  let withheld = 0;
  for (const pay of income.wages)
    withheld += withholdingOnPay(api, {
      personId: pay.personId,
      paidMinor: pay.minor,
      periodDays: income.monthDays,
    });
  let living = 0;
  let adults = 0;
  for (const memberId of members) {
    const member = core.people.get(memberId);
    if (!member?.alive) continue;
    if (ageOn(member, api.state.date) >= adultAge) adults += 1;
    living += member.livingCostDailyMinor * perMonth;
  }
  const share = Math.max(1, adults);
  const householdShare = living / share;
  const recordedOwn = perMonth * person.livingCostDailyMinor;
  const ownMonth = recordedOwn > 0 ? recordedOwn : householdShare;
  const cushion = campaignParameter("caseCushionMonths") * ownMonth;
  const given = givenInMonth(api, person.id);
  return {
    monthlyIncomeMinor: income.minor / share,
    monthlyWithheldMinor: withheld / share,
    monthlyLivingMinor: householdShare,
    discretionaryMinor: Math.max(
      0,
      Math.max(0, income.minor - withheld - living) / share - given,
    ),
    givenThisMonthMinor: given,
    savingsMinor: Math.max(0, person.liquidMinor - cushion),
    ownMonthLivingMinor: ownMonth,
    cushionMinor: cushion,
  };
}

/**
 * Money weighed on a log scale of a span of the person's own living costs,
 * the one shape both of a donor's sources slide on: about one for one while
 * it is small against the span, a few spans for many spans, never in
 * proportion (a dollar weighs less the more of them there are), and never a
 * threshold. The month's spare is weighed against
 * `donationMonthScaleMonths` of their month of living costs, savings against
 * their cushion (`caseCushionMonths`); a donor with no living costs of their
 * own takes both from their share of the household's month (`giftBudget`).
 * Every household holds living costs (a press person seated from a recorded
 * identity gets the one-person household officials get), so a donor always
 * has a span; money weighed against no span counts for nothing, never one
 * for one.
 */
function weighedAgainst(minor: number, spanMinor: number): number {
  return spanMinor > 0 ? spanMinor * Math.log1p(minor / spanMinor) : 0;
}

/**
 * Ask someone for money. What they'd give in all slides with their own
 * reasons (`donorReason`) and with what they have to give from
 * (`giftBudget`): a share of the month's income left after their bills (never
 * more than that month's spare), and a share of their savings beyond a
 * cushion; they give what they'd give beyond what they've already given,
 * never past the legal limit or the cash they hold. The money moves from their account to the campaign's through
 * the journal, and their running total is kept in one row the next ask reads.
 */
export function askForDonation(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): number {
  return donationAnswer(api, filingId, donorId).givenMinor;
}

/** Why an ask brought in nothing, from the donor's own records. */
export type DonationWhy =
  "gave" | "not-warm" | "no-spare" | "at-limit" | "small";

/**
 * An ask answered: what the person gave, or the record-side reason they did
 * not: their reasons to give are at or below zero (`not-warm`), nothing is
 * left of their month's income after their bills and they hold no savings
 * beyond their cushion, or no cash at all (`no-spare`), they have given what
 * the law allows (`at-limit`), or what they'd give is under a whole dollar
 * (`small`).
 */
export function donationAnswer(
  api: CoreAPI,
  filingId: string,
  donorId: string,
  /** Work out what they would give without giving it (an ask the player answers). */
  options: { readonly suggestOnly?: boolean } = {},
): { readonly givenMinor: number; readonly why: DonationWhy } {
  const adultAge = api.parameter("votingAge");
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < adultAge)
    return { givenMinor: 0, why: "no-spare" };
  // Someone standing in the same race campaigns for themselves and funds no
  // rival (`rivalFiling`): no reason to give, as for every other help.
  if (rivalFiling(api, campaign, donorId))
    return { givenMinor: 0, why: "not-warm" };
  const budget = giftBudget(api, donor);
  const reason = donorReason(api, filingId, donorId, budget);
  if (reason <= 0) return { givenMinor: 0, why: "not-warm" };
  if (
    donor.liquidMinor <= 0 ||
    (budget.discretionaryMinor <= 0 && budget.savingsMinor <= 0)
  )
    return { givenMinor: 0, why: "no-spare" };
  const limit = contributionLimit(api, campaign.contestId);
  const gift = giftOf(api, filingId, donorId);
  const given = gift?.totalMinor ?? 0;
  // A small gift comes out of the month's income after the bills, a larger
  // one out of savings too; both slide with how much the donor wants this
  // candidate to win. Each counts on a log scale of the donor's own living
  // costs (a dollar weighs less the more they have): the month's spare
  // against a part of a month of them, so a better-paid donor gives more but
  // not in proportion to the pay, and savings against their cushion, so a
  // nest egg counts about one for one and a fortune a few nest eggs. What
  // comes out of the month never passes the month's spare itself: a warm
  // donor with little left gives at most what is left, not more of the
  // month than they have.
  const reasonToGive = Math.min(1, reason);
  const fromMonth = Math.min(
    budget.discretionaryMinor,
    reasonToGive *
      campaignParameter("donationShareOfMonthPerWarmth") *
      weighedAgainst(
        budget.discretionaryMinor,
        campaignParameter("donationMonthScaleMonths") *
          budget.ownMonthLivingMinor,
      ),
  );
  const fromSavings =
    reasonToGive *
    campaignParameter("donationShareOfCashPerWarmth") *
    weighedAgainst(budget.savingsMinor, budget.cushionMinor);
  const wanted = fromMonth + fromSavings;
  // Whole dollars: what they'd give in all, less what they've given, never
  // more than they hold. A candidate's own money has no limit (Buckley v.
  // Valeo, 424 U.S. 1, 1976; state limits on contributions likewise cover
  // others' gifts).
  const room =
    limit.minor === null || donorId === campaign.candidateId
      ? Infinity
      : limit.minor - given;
  const amount =
    Math.floor(
      Math.max(0, Math.min(wanted - given, room, donor.liquidMinor)) / 100,
    ) * 100;
  // The law reached the donor when it held the gift below what they would
  // have given.
  const wouldGive = Math.min(wanted - given, donor.liquidMinor);
  if (!options.suggestOnly && limit.law && room < wouldGive)
    lawApplied(api, {
      key: limit.law.key,
      lawId: limit.law.id,
      targetId: donorId,
      target: "person",
      engine: CAMPAIGNS_MODULE_ID,
      what: "gift-held-to-the-limit",
      amountMinor: -(wouldGive - Math.max(0, room)),
    });
  if (amount <= 0)
    return { givenMinor: 0, why: room <= 0 ? "at-limit" : "small" };
  if (options.suggestOnly) return { givenMinor: amount, why: "gave" };
  giveDonation(api, filingId, donorId, amount);
  return { givenMinor: amount, why: "gave" };
}

/** A gift moves from the donor's account to the campaign's through the journal, and their running total is kept in one row the next ask reads. */
function giveDonation(
  api: CoreAPI,
  filingId: string,
  donorId: string,
  amount: number,
): void {
  const campaign = campaignFor(api, filingId);
  const limit = contributionLimit(api, campaign.contestId);
  const given = giftOf(api, filingId, donorId)?.totalMinor ?? 0;
  postMoney(
    api,
    DONATION_KIND,
    `donation:${filingId}:${donorId}:${api.state.date}:${given}`,
    donorId,
    campaign.organizationId,
    amount,
    limit.source,
    limit.estimate,
  );
  table(api, "gifts").put({
    id: `${filingId}|${donorId}`,
    campaignId: filingId,
    donorId,
    ...grownGift(api, giftOf(api, filingId, donorId), amount),
  } satisfies GiftRow as unknown as ModuleRow);
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaignFor(api, filingId).raisedMinor + amount,
  });
  recordGift(api, filingId, donorId, amount, given + amount);
}

const asksOf = (api: CoreAPI, personId: string) =>
  table(api, "asks").query("byDonor", [personId]) as unknown as AskRow[];

/**
 * A world candidate's ask reaches the controlled person as a request: one
 * open at a time per campaign, and none again once they have declined that
 * candidate (the next ask reads the answer). The suggested sum is what they
 * would give by their own reasons and cash; nothing moves until they answer.
 * Returns whether a request was written.
 */
export function askPlayerForMoney(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  if (
    asksOf(api, personId).some(
      (row) =>
        row.campaignId === filingId &&
        (row.status === "declined" || askOpen(api, row)),
    )
  )
    return false;
  const { givenMinor, why } = donationAnswer(api, filingId, personId, {
    suggestOnly: true,
  });
  // Nothing to give from (no cash past their cushion, or at the limit): nobody asks.
  if (why !== "gave" || givenMinor <= 0) return false;
  table(api, "asks").put({
    id: `ask:${filingId}:${personId}:${api.state.date}`,
    campaignId: filingId,
    donorId: personId,
    candidateId: campaignFor(api, filingId).candidateId,
    suggestedMinor: givenMinor,
    askedOn: api.state.date,
    status: "pending",
  } satisfies AskRow as unknown as ModuleRow);
  return true;
}

/**
 * An ask is open while it waits on an answer, its candidate is still standing
 * for a race not yet held, and the person asked has not filed against them in
 * it (`rivalFiling`: a rival funds no rival).
 */
function askOpen(api: CoreAPI, row: AskRow): boolean {
  if (row.status !== "pending") return false;
  const filing = filingOf(api, row.campaignId);
  const contest = filing
    ? (elections(api, "contests").get(filing.contestId) as
        ContestRow | undefined)
    : undefined;
  return (
    !!filing &&
    standing(filing) &&
    !!contest &&
    contest.electionDate >= api.state.date &&
    !rivalFiling(api, campaignFor(api, row.campaignId), row.donorId)
  );
}

/** The requests for money waiting on a person's answer, newest first. */
export function donationAsksFor(api: CoreAPI, personId: string): AskRow[] {
  return asksOf(api, personId)
    .filter((row) => askOpen(api, row))
    .sort(
      (a, b) => b.askedOn.localeCompare(a.askedOn) || a.id.localeCompare(b.id),
    );
}

/**
 * The person's answer to an ask: give a sum (the suggested one unless they
 * size it), or decline. False when the ask is no longer open or the sum is
 * not one they can give: whole dollars, within what they hold and within the
 * law's limit.
 */
export function answerDonationAsk(
  api: CoreAPI,
  askId: string,
  answer: "give" | "decline",
  amountMinor?: number,
): boolean {
  const row = table(api, "asks").get(askId) as unknown as AskRow | undefined;
  if (!row || !askOpen(api, row)) return false;
  const settle = (patch: Partial<AskRow>) =>
    table(api, "asks").put({
      ...row,
      ...patch,
      answeredOn: api.state.date,
    } satisfies AskRow as unknown as ModuleRow);
  if (answer === "decline") {
    settle({ status: "declined" });
    return true;
  }
  const donor = api.state.people.get(row.donorId);
  const amount = amountMinor ?? row.suggestedMinor;
  const campaign = campaignFor(api, row.campaignId);
  const limit = contributionLimit(api, campaign.contestId);
  const given = giftOf(api, row.campaignId, row.donorId)?.totalMinor ?? 0;
  const room = limit.minor === null ? Infinity : limit.minor - given;
  if (
    !donor?.alive ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount % 100 !== 0 ||
    amount > donor.liquidMinor ||
    amount > room
  )
    return false;
  giveDonation(api, row.campaignId, row.donorId, amount);
  settle({ status: "given", givenMinor: amount });
  return true;
}

/**
 * Money from the donors outside the town: a race for a seat wider than the
 * town (governor, U.S. Senate, U.S. House, a legislative seat) draws on the
 * adults of its district or state, counted by place at the coarser level.
 * Each turn the campaign's lists reach another share of the adults who lean
 * its candidate's way (`outsideReachPerTurn`); of those, `outsideDonorShare`
 * give, each the savings share of the person rule (the cash a typical donor
 * holds times the share they give per unit of agreement), never past the
 * individual limit; the month's-income share a named donor also gives from
 * is not read here (stopgap SG-GOV-outside-donor-month-income). The gift is one record per place group, from the
 * outside account to the campaign's, so the dollars balance on the journal.
 * Returns the minor units raised.
 */
/**
 * The candidate puts their own money into their campaign: an amount the
 * player chose, from their own cash, never more than they hold. A
 * candidate's own money has no contribution limit (Buckley v. Valeo, 424
 * U.S. 1, 1976). Returns what moved; it counts as the candidate's own gift.
 */
export function contributeOwnMoney(
  api: CoreAPI,
  filingId: string,
  amountMinor: number,
): number {
  const campaign = campaignFor(api, filingId);
  const candidate = api.state.people.get(campaign.candidateId);
  if (!candidate?.alive) return 0;
  const amount = Math.min(
    Math.max(0, Math.floor(amountMinor)),
    Math.max(0, candidate.liquidMinor),
  );
  if (amount <= 0) return 0;
  const given = giftOf(api, filingId, candidate.id)?.totalMinor ?? 0;
  postMoney(
    api,
    DONATION_KIND,
    `donation:${filingId}:${candidate.id}:${api.state.date}:${given}`,
    candidate.id,
    campaign.organizationId,
    amount,
    "The candidate's own money, which no contribution limit covers (Buckley v. Valeo, 424 U.S. 1, 1976).",
    false,
  );
  table(api, "gifts").put({
    id: `${filingId}|${candidate.id}`,
    campaignId: filingId,
    donorId: candidate.id,
    ...grownGift(api, giftOf(api, filingId, candidate.id), amount),
  } satisfies GiftRow as unknown as ModuleRow);
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaignFor(api, filingId).raisedMinor + amount,
  });
  return amount;
}

export function askOutsideDonors(api: CoreAPI, filingId: string): number {
  const campaign = campaignFor(api, filingId);
  const reached = campaign.outsideReached ?? 0;
  if (reached >= 1) return 0;
  const contest = elections(api, "contests").get(
    campaign.contestId,
  ) as unknown as ContestRow;
  const filing = filingOf(api, filingId);
  if (!contest || !filing) return 0;
  const { places } = basePlaces(api, contest);
  if (!places.length) return 0;
  const core = api.state as CoreState;
  const outside = townOutsideOf(
    core.organizations.values(),
    townRow(api).townPlaceId,
  );
  if (!outside) return 0;
  const side = partySide(filing.party ?? null);
  const step = Math.min(1 - reached, campaignParameter("outsideReachPerTurn"));
  const limit = contributionLimit(api, campaign.contestId);
  const minorPerDollar = api.parameter("minorPerDollar");
  const spare =
    medianTransactionBalance(
      campaignParameter("outsideDonorIncomeUsd"),
      api.state.seed,
    ) * minorPerDollar;
  let total = 0;
  for (const place of places) {
    // The share of the place's adults on the candidate's side of the lean
    // order; a candidate with no party draws on half of them.
    const aligned =
      side > 0
        ? place.rightShare
        : side < 0
          ? 1 - place.rightShare
          : shareValue("evenSplit");
    // Their reason to give is how much of the place stands with the candidate.
    const reason = aligned;
    const donors = Math.floor(
      place.eligible * aligned * step * campaignParameter("outsideDonorShare"),
    );
    if (donors <= 0) continue;
    // stopgapId: SG-GOV-outside-donor-month-income
    const each =
      Math.floor(
        Math.min(
          spare * reason * campaignParameter("donationShareOfCashPerWarmth"),
          limit.minor ?? Infinity,
        ) / minorPerDollar,
      ) * minorPerDollar;
    const amount = donors * each;
    if (amount <= 0) continue;
    const donorId = `outside:${place.id}`;
    // The law reached this place's donors when it held each gift below what
    // they would have given.
    const wouldGive =
      spare * reason * campaignParameter("donationShareOfCashPerWarmth");
    if (limit.law && limit.minor !== null && limit.minor < wouldGive)
      lawApplied(api, {
        key: limit.law.key,
        lawId: limit.law.id,
        targetId: donorId,
        target: "group",
        engine: CAMPAIGNS_MODULE_ID,
        what: "gift-held-to-the-limit",
        count: donors,
        amountMinor: -Math.round(donors * (wouldGive - limit.minor)),
      });
    const given = giftOf(api, filingId, donorId)?.totalMinor ?? 0;
    // The outside account pays the campaign's account through the accounts
    // API, a flow recorded in outside-flows.json as the donors' own money.
    const paid = transferCash(
      api,
      `donation-outside:${filingId}:${place.id}:${api.state.date}:${given}`,
      outside.id,
      campaign.organizationId,
      amount,
      {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `${limit.source}; ${donors} donors in ${place.name} at the person rule`,
        estimatedFrom:
          "Pew Research Center, 5 facts about U.S. political donations (2017)",
      },
    );
    if (paid <= 0) continue;
    table(api, "gifts").put({
      id: `${filingId}|${donorId}`,
      campaignId: filingId,
      donorId,
      totalMinor: given + paid,
      lastDate: api.state.date,
      donors: (giftOf(api, filingId, donorId)?.donors ?? 0) + donors,
    } satisfies GiftRow as unknown as ModuleRow);
    total += paid;
  }
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaignFor(api, filingId).raisedMinor + total,
    outsideReached: reached + step,
  });
  return total;
}

/**
 * A purchase from the campaign's account to a seller, on the journal; the
 * campaign's books (spent, and spent by kind) read it. Returns the id the
 * journal entry names as its source (`sourceRef.id`).
 */
export function spend(
  api: CoreAPI,
  filingId: string,
  input: {
    readonly kind: "ad" | Purchase | "circulators";
    readonly sellerId: string;
    readonly amountMinor: number;
    readonly citation: string;
  },
): string {
  const campaign = campaignFor(api, filingId);
  let moneyId = `${input.kind}:${filingId}:${api.state.date}:${campaign.spentMinor}`;
  // A seller outside the town is paid through the accounts API, a flow
  // recorded in outside-flows.json as goods and services bought outside.
  if (api.state.organizations.get(input.sellerId)?.outsideFlow !== undefined) {
    moneyId = `campaign-purchase:${moneyId}`;
    const paid = transferCash(
      api,
      moneyId,
      campaign.organizationId,
      input.sellerId,
      input.amountMinor,
      { tag: "SOURCED", citation: input.citation, asOf: api.state.date },
    );
    if (paid !== input.amountMinor)
      throw new Error(
        "A campaign's purchase outside the town was not paid in full.",
      );
  } else {
    postMoney(
      api,
      input.kind === "ad" ? AD_KIND : PURCHASE_KIND,
      moneyId,
      campaign.organizationId,
      input.sellerId,
      input.amountMinor,
      input.citation,
      false,
    );
    // A sale to a business in town is noticed the way any customer's is, so a
    // sales tax in force reaches it and its seller remits.
    notifySalesReceipt(api, {
      id: moneyId,
      date: api.state.date,
      sellerId: input.sellerId,
      buyerIds: [campaign.organizationId],
      kind: `campaign-${input.kind}`,
      paidMinor: input.amountMinor,
      placeId: api.state.organizations.get(input.sellerId)?.placeId ?? "",
      counted: false,
    });
  }
  const byKind = { ...(campaign.spentByKind ?? {}) };
  byKind[input.kind] = (byKind[input.kind] ?? 0) + input.amountMinor;
  save(api, {
    ...campaign,
    spentMinor: campaign.spentMinor + input.amountMinor,
    spentByKind: byKind,
  });
  return moneyId;
}

/**
 * A gift from someone other than the candidate is a public record, as a
 * campaign finance report names each contributor: who gave, how much, their
 * total, and the share it is of what others have given the campaign. A
 * donor who holds a view on a bill pending before the body the seat sits on
 * names the one they hold most strongly, the bill they will want to talk
 * about.
 */
function recordGift(
  api: CoreAPI,
  filingId: string,
  donorId: string,
  amountMinor: number,
  totalMinor: number,
): void {
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (
    donorId === campaign.candidateId ||
    !donor ||
    !api.state.people.has(campaign.candidateId)
  )
    return;
  const bill = donorsBill(api, campaign, donor);
  // The share of what others have given: the candidate's own money is theirs.
  const outside =
    campaign.raisedMinor -
    (giftOf(api, filingId, campaign.candidateId)?.totalMinor ?? 0);
  api.emit({
    id: `campaign-gift:${filingId}:${donorId}:${api.state.date}:${totalMinor}`,
    date: api.state.date,
    kind: "campaign-gift",
    personIds: [campaign.candidateId, donorId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `A contribution to ${campaign.organizationId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    facts: {
      filingId,
      contestId: campaign.contestId,
      candidateId: campaign.candidateId,
      donorId,
      amountMinor: String(amountMinor),
      totalMinor: String(totalMinor),
      raisedMinor: String(campaign.raisedMinor),
      share: String(amountMinor / outside),
      ...(bill ? { billId: bill.id, number: bill.number } : {}),
    },
  });
}

/**
 * The bill pending before the body a campaign's seat sits on that the donor
 * holds the strongest view on, either way; none where nothing is pending.
 */
function donorsBill(
  api: CoreAPI,
  campaign: CampaignRow,
  donor: Readonly<PersonState>,
): BillRow | undefined {
  if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const contest = elections(api, "contests").get(
    campaign.contestId,
  ) as unknown as ContestRow | undefined;
  if (!contest) return undefined;
  const lean = personLean(api.state.people, donor, townRow(api).lean);
  let best: { bill: BillRow; strength: number } | undefined;
  for (const row of api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .rows() as unknown as BillRow[]) {
    if (row.bodyOfficeId !== contest.officeId || row.status !== "drafted")
      continue;
    if (!row.number) continue;
    const stance = row.provisions[0]
      ? provisionStance(api, row.provisions[0])
      : null;
    if (!stance) continue;
    const strength = Math.abs(
      viewOn(api, donor.id as PersonId, stance.question, lean),
    );
    if (
      strength > 0 &&
      (!best ||
        strength > best.strength ||
        (strength === best.strength && row.id < best.bill.id))
    )
      best = { bill: row, strength };
  }
  return best?.bill;
}

export function postMoney(
  api: CoreAPI,
  kind: string,
  id: string,
  from: string,
  to: string,
  amount: number,
  citation: string,
  estimate: boolean,
) {
  const date = api.state.date;
  const record: MoneyRecord = {
    id,
    kind,
    date,
    source: estimate
      ? { tag: "ESTIMATED", citation, asOf: date, estimatedFrom: citation }
      : { tag: "SOURCED", citation, asOf: date },
    postings: [
      {
        id: `${id}:out`,
        accountId: `cash:${from}:residual`,
        deltaMinor: -amount,
      },
      { id: `${id}:in`, accountId: `cash:${to}:residual`, deltaMinor: amount },
    ],
  };
  // The journal reads the record from its held slot while it posts; no table
  // keeps it. An id is posted once. The engine's ids carry the date, so no
  // later day repeats one, and a running total that every post grows (the
  // donor's gift `totalMinor`, the campaign's `spentMinor`; the journal
  // refuses a zero posting), so no second post that day does; a cause group
  // posts once a month. A later fold of the gifts table must keep a donor's
  // row through the day of its count, or a donation id repeats. A repeat on
  // its day throws here; buyAdTime's caller names its own id and keeps it
  // unique.
  const day = postedToday.get(api.state);
  const posted = day?.date === date ? day.ids : new Set<string>();
  if (day?.date !== date) postedToday.set(api.state, { date, ids: posted });
  if (posted.has(id))
    throw new Error("Campaign payment is already posted today.");
  holdMoneySlot(api, record);
  const state = api.state as CoreState;
  try {
    api.postJournal({
      id: `journal:${date}:${state.cashJournal.nextSequence}`,
      date,
      expectedSequence: state.cashJournal.nextSequence,
      sourceRef: { kind, id },
      postings: record.postings,
    });
    posted.add(id);
  } finally {
    // The entry is posted: the held slot (a second copy of every posting) is let go.
    heldSlots.get(api.state)?.delete(id);
  }
}
