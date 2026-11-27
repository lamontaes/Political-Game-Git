/**
 * Ads: the outlets, buying time and running an ad.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import type { CoreAPI, PersonId, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { VIEWS_MODULE_ID, VIEWS_SPEAKER_KEY } from "./views";
import { hearAsGroups, hearsAsPerson } from "../hearer-groups";
import { townShareOfRace } from "./campaigns-asks";
import {
  campaignFor,
  recordAppeal,
  save,
  table,
  townRow,
} from "./campaigns-base";
import type { CampaignRow, CauseRow } from "./campaigns-base";
import {
  AD_KIND,
  CAMPAIGNS_MODULE_ID,
  CANVASS_MESSAGE_KIND,
  clamp,
} from "./campaigns-constants";
import { reach } from "./campaigns-doors";
import { nextTopic } from "./campaigns-meetings";
import { postMoney, spend } from "./campaigns-money";
import { freeMinor } from "./campaigns-petitions";
import { keptMessageDates, latestMessages } from "./campaigns-rival-word";

/** Where an ad is bought: an outlet and its followers (the press registers it). */
let adOutlet:
  | ((api: CoreAPI) => {
      organizationId: string;
      followerIds: readonly string[];
      countedFollowers: number;
    } | null)
  | null = null;
export function registerAdOutlet(fn: typeof adOutlet): void {
  adOutlet = fn;
}

/**
 * Whom ad time reaches and who sells it: the town's outlet and its
 * followers. Where no press is open there is no outlet to sell ad time and
 * no audience to reach, so nothing is bought.
 */
export function adAudience(
  api: CoreAPI,
  amount: number,
): {
  readonly media: string;
  readonly viewers: readonly { p: PersonState }[];
  /** Counted adults the ad reaches, by the same rule times their count. */
  readonly countedViewers: number;
} | null {
  const outlet = adOutlet?.(api) ?? null;
  if (!outlet) return null;
  const contacts = Math.floor(
    (amount / 1000) * campaignParameter("adContactsPerThousandMinor"),
  );
  const full = outlet.followerIds
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => p !== undefined);
  // One rule for both tiers: the contacts the money buys fall on the outlet's
  // followers, full and counted alike, in the same proportion; the most
  // engaged full followers are reached first.
  const followers = full.length + outlet.countedFollowers;
  const share = followers ? Math.min(1, contacts / followers) : 0;
  const viewers = full
    .slice(0, Math.round(share * full.length))
    .map((p) => ({ p }));
  return {
    media: outlet.organizationId,
    viewers,
    countedViewers: Math.round(share * outlet.countedFollowers),
  };
}

/** Whether this world sells ad time: the campaigns engine is installed and open. */
export function adTimeForSale(api: CoreAPI): boolean {
  return (
    (api.state as CoreState).modules.has(CAMPAIGNS_MODULE_ID) &&
    table(api, "town").get("town") !== undefined &&
    (adOutlet?.(api) ?? null) !== null
  );
}

/**
 * Buy ad time outside a campaign (a cause group's ad): the buyer pays the
 * seller on the journal and gets the people the ad reaches, the same
 * audience a campaign's ad buys. `recordId` is the payment's journal source
 * id and must never repeat (carry the date): no record keeps it once posted,
 * and only a repeat on the same day throws.
 */
export function buyAdTime(
  api: CoreAPI,
  input: {
    readonly buyerId: string;
    readonly amountMinor: number;
    readonly recordId: string;
    readonly citation: string;
  },
): readonly PersonState[] {
  if (input.amountMinor <= 0) return [];
  const sold = adAudience(api, input.amountMinor);
  if (!sold) return [];
  const { media, viewers } = sold;
  postMoney(
    api,
    AD_KIND,
    input.recordId,
    input.buyerId,
    media,
    input.amountMinor,
    input.citation,
    false,
  );
  return viewers.map((row) => row.p);
}

/**
 * Run an ad: spend from the campaign's account on the town outlet's ad time;
 * the people it reaches are that outlet's followers. An attack ad carries a rival's public record
 * and moves warmth toward the rival down for people who disagree with it.
 */
export function runAd(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly amountMinor: number;
    readonly attackFilingId?: string;
    /** Leave the message's event to the caller (a campaign turn sends one for all it bought). */
    readonly quiet?: boolean;
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  const account = api.state.organizations.get(campaign.organizationId)!;
  const available = (api.state as CoreState).cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? freeMinor(campaign)
    : 0;
  // A campaign for an office the town is only part of spreads its ad money
  // over the whole district, so this town's outlet sells it the town's share.
  const amount = Math.floor(
    Math.min(input.amountMinor, available) *
      townShareOfRace(api, campaign.contestId),
  );
  void account;
  if (amount <= 0) return [];
  const sold = adAudience(api, amount);
  if (!sold) return [];
  const { media, viewers, countedViewers } = sold;
  spend(api, input.filingId, {
    kind: "ad",
    sellerId: media,
    amountMinor: amount,
    citation: "Ad buy from the outlet's ad time",
  });
  const target = input.attackFilingId
    ? campaignFor(api, input.attackFilingId)
    : campaign;
  // The counted adults the ad reached are counted as reached, as a mailer's
  // are, and the buy is kept as a record of who it reached.
  if (countedViewers > 0) {
    const reached = campaignFor(api, target.filingId);
    save(api, {
      ...reached,
      countedReached: (reached.countedReached ?? 0) + countedViewers,
    });
  }
  if (viewers.length + countedViewers > 0) {
    const buyer = campaignFor(api, campaign.filingId);
    save(api, {
      ...buyer,
      adReaches: [
        ...(buyer.adReaches ?? []),
        {
          id: `ad-reach:${campaign.id}:${api.state.date}:${buyer.spentMinor}`,
          date: api.state.date,
          outletId: media,
          full: viewers.length,
          counted: countedViewers,
        },
      ],
    });
  }
  const causes: CauseRow[] = [];
  for (const { p } of viewers) {
    // An attack ad shows the viewer the rival's record at its worst for them:
    // the votes they disagree with and the promises broken. A clean record
    // gives it nothing to show.
    const attack = input.attackFilingId
      ? recordAppeal(
          api,
          p,
          target.candidateId,
          personLean(api.state.people, p, townRow(api).lean),
          true,
          true,
        ).reasons.filter((r) => r.effect < 0)
      : null;
    if (attack && !attack.length) continue;
    // The ad tells them of the broken promises it shows.
    for (const reason of attack ?? [])
      if (reason.kind === "broken-promise")
        api.observe(p.id, {
          key: reason.itemId,
          value: "shown-broken",
          learnedAt: api.state.date,
          sourceId: `attack-ad:${campaign.candidateId}:${api.state.date}`,
          access: "public",
        });
    const cause = reach(
      api,
      target,
      p.id,
      attack ? "attack-ad" : "ad",
      campaign.candidateId,
      {
        carriesPlatform: !attack,
        weight: campaignParameter("adWarmthWeight"),
        rapport: 0,
        ...(attack
          ? {
              target: clamp(attack.reduce((sum, r) => sum + r.effect, 0)),
              shownIds: attack.map((r) => r.itemId),
            }
          : {}),
      },
    );
    if (cause) causes.push(cause);
  }
  // The one an attack ad ran against holds it against whoever bought it: the
  // drives engine reads this record and answers by their own temperament
  // (a grudge, proving themselves, a cause or carrying on), never by a roll.
  if (
    input.attackFilingId &&
    causes.length > 0 &&
    target.candidateId !== campaign.candidateId &&
    api.state.people.get(target.candidateId as PersonId)?.alive &&
    api.state.people.get(campaign.candidateId as PersonId)?.alive
  )
    api.emit({
      id: `campaign.attacked:${campaign.id}:${api.state.date}:${campaign.spentMinor}`,
      date: api.state.date,
      kind: "campaign.attacked",
      personIds: [target.candidateId as PersonId],
      placeId: api.state.people.get(target.candidateId as PersonId)!.placeId,
      publicRecord: false,
      topic: campaign.candidateId,
      desiredChange: "campaign.attacked",
      facts: {
        attackerId: campaign.candidateId,
        contestId: campaign.contestId,
      },
      source: {
        tag: "SOURCED",
        citation: `Attack ad against ${target.candidateId} bought by ${campaign.candidateId}`,
        asOf: api.state.date,
      },
    });
  // The ad's message is a public record its viewers saw: the views engine
  // moves each one's stance on its question.
  if (!input.attackFilingId && !input.quiet)
    emitMessage(api, campaign, {
      kind: "campaign-ad",
      id: `campaign-ad:${campaign.id}:${api.state.date}:${campaign.spentMinor}`,
      witnessIds: causes.map((c) => c.voterId),
    });
  return causes;
}

/**
 * A campaign's message, kept as a `messages` row (its kind, the question
 * it is next behind on as its topic, `nextTopic`, and who it reached) that word of a rival
 * passes on from (`rivalWordPassedOn`). A paid message (an ad, a mailer) is
 * also an event its audience learns: it carries that topic and the change
 * the candidate wants, and the candidate's lean on the views engine's scale,
 * so the views engine moves each reader's or viewer's stance on that
 * question (nearer the candidate, more). An evening of doors
 * (CANVASS_MESSAGE_KIND) is kept as the row alone: each person met at a door
 * was reached face to face there (`reach`), and no reader of a paid
 * message's event takes it for one.
 */
export function emitMessage(
  api: CoreAPI,
  campaign: CampaignRow,
  input: {
    readonly kind: string;
    readonly id: string;
    readonly witnessIds: readonly string[];
  },
): void {
  const witnessIds = [...new Set(input.witnessIds)].filter(
    (id) => id !== campaign.candidateId && api.state.people.has(id),
  );
  if (!witnessIds.length) return;
  const lead = nextTopic(api, campaign, input.kind);
  if (!lead) return;
  const messages = table(api, "messages");
  const kept = keptMessageDates(api);
  messages.put({
    id: input.id,
    kind: input.kind,
    contestId: campaign.contestId,
    candidateId: campaign.candidateId,
    date: api.state.date,
    topic: lead.question,
    position: lead.position,
    witnessIds,
  } as unknown as ModuleRow);
  // The contest's latest message date moves with the row
  // (`latestMessageDates`); one that no longer matches the table is dropped,
  // to be filled again from the rows.
  if (!kept) latestMessages.delete(api.state);
  else {
    const at = kept.latest.get(campaign.contestId);
    if (at === undefined || api.state.date > at)
      kept.latest.set(campaign.contestId, api.state.date);
    kept.size = messages.size;
    kept.noted = messages.get(input.id);
  }
  if (input.kind === CANVASS_MESSAGE_KIND) return;
  // Level of detail (owner, Nov 9): a world candidate's paid message reaches
  // the viewers nobody watches once per group of like hearers, the rest as
  // people (`hearAsGroups`). The message row above keeps every viewer.
  let asPeople = witnessIds;
  if (
    campaign.candidateId !== api.state.playerId &&
    api.state.modules.has(VIEWS_MODULE_ID)
  ) {
    asPeople = witnessIds.filter((id) => hearsAsPerson(api, id));
    if (asPeople.length < witnessIds.length) {
      const people = new Set(asPeople);
      const impulse = Math.abs(campaignParameter("adViewsImpulse"));
      hearAsGroups(
        api,
        {
          event: { id: input.id, date: api.state.date },
          speakerId: campaign.candidateId,
          topic: lead.question,
          desiredChange: lead.position > 0 ? "enact" : "repeal",
          size: impulse > 0 ? impulse : 1,
        },
        witnessIds.filter(
          (id) => !people.has(id) && api.state.people.get(id)?.alive,
        ),
      );
    }
    if (!asPeople.length) return;
  }
  api.emit({
    id: input.id,
    date: api.state.date,
    kind: input.kind,
    personIds: api.state.people.has(campaign.candidateId)
      ? [campaign.candidateId]
      : [],
    witnessIds: asPeople,
    placeId: townRow(api).townPlaceId,
    topic: lead.question,
    desiredChange: lead.position > 0 ? "enact" : "repeal",
    moodImpulse: campaignParameter("adViewsImpulse"),
    facts: {
      campaignId: campaign.id,
      candidateId: campaign.candidateId,
      // The views engine weighs the message by how each person stands with
      // the candidate who makes the case.
      [VIEWS_SPEAKER_KEY]: campaign.candidateId,
    },
    source: {
      tag: "SOURCED",
      citation: `Campaign ${campaign.id} paid message`,
      asOf: api.state.date,
    },
  });
}
