import type {
  EntityId,
  IsoDate,
  LawExposureRecord,
  MoneyAmount,
  World,
} from "../simulation";
import { householdMembershipsAt } from "../simulation/life-queries";
import { moneyText } from "../simulation/money-text";
import { STATES } from "../simulation/state-reference";
import { proseDate } from "./prose-dates";

/**
 * How a law reached the player, in the player's own account.
 *
 * Every lane that makes an enacted law do something to a person writes a law
 * exposure (`../simulation/law-exposure.ts`): the law, how it reached them,
 * and the money next to their pay. This turns one such record into the
 * sentence the Journal shows. It names the law by its short title and says
 * what it did, in money when the record has an amount. Nothing is added that
 * the record does not hold: no feeling, no cause beyond the law itself.
 */

/** What the law did through each channel, for a cost and for a gain. */
const CHANNEL_WORDS: Record<
  LawExposureRecord["channel"],
  { readonly cost: string; readonly gain: string; readonly none: string }
> = {
  paycheck: {
    cost: "took {amount} from {whose} paycheck",
    gain: "added {amount} to {whose} paycheck",
    none: "changed {whose} paycheck",
  },
  "tax-payment": {
    cost: "cost {whom} {amount} in taxes",
    gain: "returned {amount} in taxes to {whom}",
    none: "changed the taxes {whom} paid",
  },
  benefit: {
    cost: "cut {amount} from a benefit paid to {whom}",
    gain: "paid {whom} {amount} in benefits",
    none: "changed a benefit {whom} received",
  },
  "job-rule": {
    cost: "cost {whom} {amount} at work",
    gain: "gained {whom} {amount} at work",
    none: "changed the rules at {whose} job",
  },
  "business-rule": {
    cost: "cost {whose} business {amount}",
    gain: "saved {whose} business {amount}",
    none: "changed the rules for {whose} business",
  },
  "public-service": {
    cost: "cost {whom} {amount} for a public service",
    gain: "saved {whom} {amount} on a public service",
    none: "changed a public service {whom} used",
  },
  rent: {
    cost: "raised {whose} rent by {amount}",
    gain: "lowered {whose} rent by {amount}",
    none: "changed the rules on {whose} rent",
  },
};

function amountText(exposure: LawExposureRecord): string {
  const amount = exposure.amount!;
  return exposure.cadence === "monthly"
    ? `${moneyText(amount)} a month`
    : moneyText(amount);
}

/**
 * The share of a month's pay, "about 4% of a month's pay", when both the
 * amount and the pay are recorded in the same currency; null otherwise.
 */
function shareOfPay(exposure: LawExposureRecord): string | null {
  const amount: MoneyAmount | null = exposure.amount;
  const pay = exposure.monthlyPay;
  if (!amount || !pay || pay.minorUnits <= 0) return null;
  if (amount.currency !== pay.currency) return null;
  const percent = (amount.minorUnits / pay.minorUnits) * 100;
  if (percent < 0.5) return "less than 1% of a month's pay";
  return `about ${Math.round(percent)}% of a month's pay`;
}

/**
 * The Journal's sentence for one exposure of `personId`, or null when the
 * law's record cannot be read.
 */
export function lawExposureSentence(
  world: World,
  personId: EntityId,
  exposure: LawExposureRecord,
): string | null {
  if (exposure.personId !== personId) return null;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === exposure.measureId,
  );
  const title = measure?.shortTitle?.trim();
  if (!title) return null;
  const via =
    exposure.relation !== "own" && exposure.viaPersonId
      ? world.people[exposure.viaPersonId]
      : null;
  if (exposure.relation !== "own" && !via) return null;
  const friend = exposure.relation === "friend";
  const whose = friend ? "their" : via ? `${via.givenName}'s` : "your";
  const whom = friend ? "them" : via ? via.givenName : "you";
  const direction =
    exposure.amount === null || exposure.direction === "none"
      ? "none"
      : exposure.direction;
  const words = CHANNEL_WORDS[exposure.channel][direction]
    .replace("{whose}", whose)
    .replace("{whom}", whom)
    .replace("{amount}", direction === "none" ? "" : amountText(exposure));
  const share = direction === "none" ? null : shareOfPay(exposure);
  const named = /^the\s/i.test(title) ? title.replace(/^the\s/i, "") : title;
  const parkOutturn = (world.history.publicProgramRecords ?? []).find(
    (record) =>
      record.kind === "capacity-outturn" &&
      record.id === exposure.sourceRecordId &&
      record.programKey.startsWith("parks:"),
  );
  if (
    exposure.channel === "public-service" &&
    exposure.direction === "none" &&
    parkOutturn?.kind === "capacity-outturn"
  )
    return parkOutturn.unitsOperational > 0
      ? parkOutturn.restoredUnits === null
        ? `The ${named} recorded ${parkOutturn.unitsOperational} operational ${parkOutturn.unitLabel ?? "park service units"} for ${parkOutturn.serviceLabel ?? "park service"} in your area; how many units were newly restored is unknown and estimated.`
        : `The ${named} recorded ${parkOutturn.unitsOperational} operational ${parkOutturn.unitLabel ?? "park service units"} for ${parkOutturn.serviceLabel ?? "park service"} in your area.`
      : `The ${named} recorded zero operational units for ${parkOutturn.serviceLabel ?? "park service"} in your area; closed is derived from the count because no open-state field is recorded.`;
  const sentence = friend
    ? `${via!.givenName} told you the ${named} ${words}`
    : `The ${named} ${words}`;
  return share ? `${sentence}, ${share}.` : `${sentence}.`;
}

/** One Journal line a law wrote into the player's pay or rent. */
export interface LawMoneyLine {
  readonly id: string;
  readonly at: IsoDate;
  readonly sequence: number;
  readonly text: string;
  readonly sourceId: EntityId;
}

function lawTitles(
  world: World,
  measureIds: readonly EntityId[],
): string | null {
  const titles = measureIds.flatMap((id) => {
    const title = (world.history.legislativeMeasures ?? [])
      .find((row) => row.id === id)
      ?.shortTitle?.trim();
    return title ? [title.replace(/^the\s/i, "")] : [];
  });
  if (titles.length === 0) return null;
  return `the ${[...new Set(titles)].join(" and the ")}`;
}

/**
 * The tax a paycheck row is, as a person names it: "Nevada income tax",
 * "the Guam paid family leave premium". The place's name comes from the
 * row's own authority ("US-NV"), so a territory or D.C. is not called a state.
 */
function taxName(taxKey: string, authorityKey: string): string | null {
  const place = STATES[authorityKey.replace(/^US-/, "")]?.name;
  if (!place) return null;
  if (taxKey.endsWith(":wage-income-tax")) return `${place} income tax`;
  if (taxKey.endsWith(":paid-leave-premium"))
    return `the ${place} paid family leave premium`;
  return null;
}

/**
 * The paycheck lines a law wrote: each of the person's paychecks whose tax
 * was set, or ended, by a law enacted in play. The tax rows carry the law
 * that governed them (`../simulation/statutory-tax.ts`); a tax the place
 * began with and no law has touched is not shown here.
 */
export function paycheckLawLines(
  world: World,
  personId: EntityId,
): readonly LawMoneyLine[] {
  const lines: LawMoneyLine[] = [];
  for (const row of world.history.statutoryTaxLiabilities ?? []) {
    if (row.payer.kind !== "person" || row.payer.personId !== personId)
      continue;
    if (!row.lawMeasureIds?.length || row.occurredAt > world.currentDate)
      continue;
    const tax = taxName(row.taxKey, row.authorityKey);
    const law = lawTitles(world, row.lawMeasureIds);
    if (!tax || !law) continue;
    const day = proseDate(row.occurredAt);
    let text: string;
    if (row.status === "not-imposed" && row.collection === "none")
      text = `No ${tax.replace(/^the /, "")} came out of your ${day} paycheck of ${moneyText(row.wages)}, because ${law} ended it.`;
    else if (
      row.collection === "withheld-from-pay" &&
      row.liability &&
      row.liability.minorUnits > 0
    )
      text = `Because of ${law}, ${moneyText(row.liability)} for ${tax} came out of your ${day} paycheck of ${moneyText(row.wages)}.`;
    else continue;
    lines.push({
      id: `law-paycheck:${row.id}`,
      at: row.occurredAt,
      sequence: row.sequence,
      text,
      sourceId: row.id,
    });
  }
  return lines;
}

/** "a month", "a week", "a shift", from a terms record's cadence. */
function cadenceWords(cadenceKind: string): string {
  if (/completed-shift/.test(cadenceKind)) return " a shift";
  if (/biweekly/.test(cadenceKind)) return " every two weeks";
  if (/semimonthly/.test(cadenceKind)) return " twice a month";
  if (/weekly/.test(cadenceKind)) return " a week";
  if (/monthly/.test(cadenceKind)) return " a month";
  return "";
}

/**
 * The rent notices and pay changes a law wrote: each change to the rent of
 * the person's home, or to the pay of the person's job, that the record
 * traces to a law's enactment, with the reason the terms record gives
 * (`../simulation/living-world/town-rent.ts`, `town-pay.ts`).
 */
export function rentAndPayLawLines(
  world: World,
  personId: EntityId,
): readonly LawMoneyLine[] {
  const enactmentEvents = new Set(
    (world.history.legislativeEnactments ?? []).flatMap((row) =>
      row.outcomeEventId ? [row.outcomeEventId] : [],
    ),
  );
  if (enactmentEvents.size === 0) return [];
  const homes = new Map(
    householdMembershipsAt(world, personId).map((row) => [
      row.household.id,
      row.membership.startedAt,
    ]),
  );
  const flows = new Map<
    EntityId,
    { readonly kind: "rent" | "pay"; readonly since: IsoDate }
  >();
  for (const flow of world.history.resourceFlows) {
    if (flow.basisReference.kind === "housing") {
      const since =
        flow.source.kind === "person" && flow.source.personId === personId
          ? flow.startsAt
          : flow.source.kind === "household"
            ? (homes.get(flow.source.householdId) ?? null)
            : null;
      if (since) flows.set(flow.id, { kind: "rent", since });
    } else if (
      flow.basisReference.kind === "work" &&
      flow.recipient.kind === "person" &&
      flow.recipient.personId === personId
    )
      flows.set(flow.id, { kind: "pay", since: flow.startsAt });
  }
  const termsById = new Map(
    world.history.resourceFlowTerms.map((row) => [row.id, row]),
  );
  const lines: LawMoneyLine[] = [];
  for (const terms of world.history.resourceFlowTerms) {
    const flow = flows.get(terms.resourceFlowId);
    if (!flow || terms.effectiveAt < flow.since) continue;
    if (terms.effectiveAt > world.currentDate) continue;
    if (
      terms.provenance.kind !== "simulated-event" ||
      !enactmentEvents.has(terms.provenance.eventId)
    )
      continue;
    const amount = `${moneyText(terms.amount)}${cadenceWords(terms.cadenceKind)}`;
    const day = proseDate(terms.effectiveAt);
    const reason = terms.reason?.trim();
    const before = terms.supersedesTermsId
      ? termsById.get(terms.supersedesTermsId)
      : undefined;
    const what = flow.kind === "rent" ? "Your rent" : "Your pay";
    const moved =
      before &&
      before.amount.currency === terms.amount.currency &&
      before.cadenceKind === terms.cadenceKind &&
      before.amount.minorUnits !== terms.amount.minorUnits
        ? `${what} ${before.amount.minorUnits < terms.amount.minorUnits ? "rose" : "fell"} from ${moneyText(before.amount)} to ${amount} on ${day}.`
        : null;
    const said = moved ?? `${what} was set at ${amount} on ${day}.`;
    lines.push({
      id: `law-${flow.kind}:${terms.id}`,
      at: terms.effectiveAt,
      sequence: terms.sequence,
      text: reason ? `${said} ${reason}` : said,
      sourceId: terms.id,
    });
  }
  return lines;
}
