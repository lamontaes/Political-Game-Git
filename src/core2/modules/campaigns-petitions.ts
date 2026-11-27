/**
 * Contribution limits, petitions, signatures and hired circulators.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { shareValue } from "../shares";
import { closenessBetween } from "./people";
import { leanedYes } from "../trait-decisions";
import limits from "../../../data/research/campaign-reality/campaign-contribution-limits.json" with { type: "json" };
import finance from "../../../data/research/campaigns/campaign-finance-2026.json" with { type: "json" };
import type { CoreAPI, CoreState, PersonState } from "../types";
import { ageOnDate, daysBetweenText as daysBetween } from "../kernel/dates";
import { wideElectorate } from "../race-places";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { agreementWith } from "./views";
import { lawInForce, LAWS_MODULE_ID } from "./laws";
import {
  petitionCirculating,
  petitionOf,
  petitionSigners,
  signOutside,
  signPetition,
  type ContestRow,
  type PetitionSigner,
} from "./elections";
import { townElectorate } from "./campaigns-asks";
import {
  campaignFor,
  clamp,
  elections,
  impressionOf,
  partySide,
  save,
  townOutsideOf,
  townRow,
} from "./campaigns-base";
import type { CampaignRow } from "./campaigns-base";
import { circleOf } from "./campaigns-meetings";
import { filingOf, partyFit, spend } from "./campaigns-money";
import { unitPrice } from "./campaigns-work";

/** The law series holding each office class's limit, where the research gives a state a number. */
const STATE_CONTRIBUTION_SERIES: Readonly<Record<string, string>> = {
  governor: "state-contribution-limit-governor",
  stateSenate: "state-contribution-limit-state-senate",
  stateHouse: "state-contribution-limit-state-house",
  local: "state-contribution-limit-local",
};

/** The individual contribution limit for this contest, in minor units (null: no limit), and its source. */
export function contributionLimit(
  api: CoreAPI,
  contestId: string,
): {
  readonly minor: number | null;
  readonly source: string;
  readonly estimate: boolean;
  /** The law row the limit stands on (its series and record id), where one is open. */
  readonly law?: { readonly key: string; readonly id: string };
} {
  const contest = elections(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  const research = finance as unknown as {
    federal: {
      individualToCandidate: { usd: number; source: string; sourceUrl: string };
    };
    limits: Record<
      string,
      Record<
        string,
        | {
            usd: number | string;
            source: string;
            sourceUrl?: string;
            estimate?: boolean;
          }
        | string
      >
    >;
  };
  if (contest.family === "usHouse" || contest.officeId.endsWith(":us-senate")) {
    // The limit is federal law in force (Congress can raise or lower it);
    // the research's figure stays the fallback where no law row is open.
    const federal = research.federal.individualToCandidate;
    const law = (api.state as CoreState).modules.has(LAWS_MODULE_ID)
      ? lawInForce(api, "federal-campaign-contribution-limit")
      : null;
    const fromLaw =
      law && law.value !== null && law.governing ? law.value : null;
    return {
      minor: (fromLaw ?? federal.usd) * 100,
      source:
        fromLaw !== null && law?.governing
          ? `${String(law.governing.source)}`
          : `${federal.source} ${federal.sourceUrl}`,
      estimate: false,
      ...(fromLaw !== null && law?.governing
        ? {
            law: {
              key: "federal-campaign-contribution-limit",
              id: law.governing.id,
            },
          }
        : {}),
    };
  }
  const key =
    contest.family === "statewideExecutive"
      ? "governor"
      : contest.family === "stateLegislative"
        ? contest.officeId.endsWith("legislature-upper")
          ? "stateSenate"
          : "stateHouse"
        : "local";
  // The state's law in force on the limit, where the research gives it a number.
  const series = STATE_CONTRIBUTION_SERIES[key];
  if (series && (api.state as CoreState).modules.has(LAWS_MODULE_ID)) {
    const law = lawInForce(api, series);
    const stateRow = law.levels.find(
      (level) => level.level === "state" && !level.setAside,
    )?.row;
    if (stateRow && typeof stateRow.value === "number")
      return {
        minor: stateRow.value * 100,
        source: String(stateRow.source),
        estimate: stateRow.estimate === true,
        law: { key: series, id: stateRow.id },
      };
  }
  const row = research.limits[townRow(api).stateKey]?.[key];
  if (row && typeof row === "object") {
    const source = [row.source, row.sourceUrl].filter(Boolean).join(" ");
    if (row.usd === "unlimited")
      return { minor: null, source, estimate: row.estimate ?? false };
    if (typeof row.usd === "number")
      return { minor: row.usd * 100, source, estimate: row.estimate ?? false };
  }
  const fallback = (
    limits as unknown as {
      fallback: { amountMinorUnits: number; source: string };
    }
  ).fallback;
  return {
    minor: fallback.amountMinorUnits,
    source: fallback.source,
    estimate: true,
  };
}

/**
 * Why a person would back a campaign with money or an evening, roughly -1 to
 * 1 per part: how warm they are toward the candidate, how far the platform
 * agrees with their own views, whether they share (or oppose) the
 * candidate's party, and how they stand with the candidate personally.
 */
export function backingReasons(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly familyIds?: ReadonlySet<string>;
  },
): {
  readonly warmth: number;
  readonly agreement: number;
  readonly party: number;
  readonly relationship: number;
} {
  const warmth =
    impressionOf(api, person.id, campaign.candidateId)?.warmth ?? 0;
  const lean = personLean(api.state.people, person, townRow(api).lean);
  const agreement = agreementWith(api, person.id, lean, campaign.platform);
  const party = partyFit(api, campaign, person.id);
  const level = person.familyIds?.has(campaign.candidateId)
    ? 1
    : clamp(closenessBetween(api.state, person.id, campaign.candidateId));
  return { warmth, agreement, party, relationship: level };
}

/**
 * A voter's reasons to sign a candidate's petition, before personality: how
 * they stand with the candidate (warmth, agreement with the platform, party,
 * the tie between them), weighed as an evening's attendance is, plus
 * signing's low bar: a name on a petition puts a neighbor on the ballot and
 * is not a vote (`petitionSignOpenness`).
 */
export function signReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly familyIds?: ReadonlySet<string>;
  },
): number {
  const why = backingReasons(api, campaign, person);
  return (
    why.warmth +
    why.agreement +
    campaignParameter("donorPartyWeight") * why.party +
    campaignParameter("donorRelationshipWeight") * why.relationship +
    campaignParameter("petitionSignOpenness")
  );
}

/**
 * Whether a person is on the count's roll today (the roll the clerk checks a
 * petition against). The voting engine registers it when it opens (it reads
 * this module, so this module cannot import it).
 */
type PetitionRoll = (api: CoreAPI, personId: string) => boolean;
let onPetitionRoll: PetitionRoll | null = null;
export function registerPetitionRoll(roll: PetitionRoll): void {
  onPetitionRoll = roll;
}

/**
 * How many signatures a campaign gathers for a filing's petition: the clerk's
 * count plus the names already off the roll today, which the clerk would
 * strike (the clerk strikes only a signer who is not on the roll that
 * morning). Read from the roll and the signatures held, never a share picked
 * in advance: each day a signer leaves the roll the target rises by one, so a
 * campaign is never left short by a name it knew was gone. Zero where the
 * petition asks for none.
 */
export function signaturesToGather(api: CoreAPI, filingId: string): number {
  const needed = petitionOf(api, filingId)?.needed ?? 0;
  if (!needed || !onPetitionRoll) return needed;
  let off = 0;
  for (const signer of petitionSigners(api, filingId))
    if (!onPetitionRoll(api, signer.personId)) off += 1;
  return needed + off;
}

/**
 * Whether a door asks for a signature: the petition circulates and holds less
 * than what a campaign gathers (`signaturesToGather`: the clerk's count plus
 * the names off the roll). Past that, a door asks for the vote (owner, Nov
 * 14). One rule for the player's doors, a world candidate's and a volunteer's.
 */
export function petitionAsksAtDoors(api: CoreAPI, filingId: string): boolean {
  if (!petitionCirculating(api, filingId)) return false;
  const petition = petitionOf(api, filingId);
  return (
    !petition?.needed || petition.signed < signaturesToGather(api, filingId)
  );
}

/**
 * Ask someone to sign a filing's circulating petition: an adult signs when
 * their reasons (`signReason`) and every trait's lean between signing and
 * declining say so, and the elections engine adds the name once. The
 * controlled person answers for themselves and is never signed up here; the
 * clerk later strikes a name not on the count's roll. Returns whether they
 * signed.
 */
export function askToSign(
  api: CoreAPI,
  filingId: string,
  signer: Readonly<Pick<PersonState, "id" | "traits" | "birthDate">> & {
    readonly familyIds?: ReadonlySet<string>;
  },
  via: PetitionSigner["via"],
): boolean {
  if (!petitionCirculating(api, filingId)) return false;
  const campaign = campaignFor(api, filingId);
  // A signer is a voter that day: of voting age to the day, as the count's
  // roll reads it.
  if (
    signer.id === campaign.candidateId ||
    signer.id === (api.state as CoreState).playerId ||
    ageOnDate(signer.birthDate, api.state.date) < api.parameter("votingAge")
  )
    return false;
  return (
    leanedYes(
      api.state,
      signer,
      "campaigns.sign-petition",
      "sign",
      "decline",
      signReason(api, campaign, signer),
    ) && signPetition(api, filingId, signer.id, via)
  );
}

/**
 * A race's electorate where it reaches past the town, read for its
 * petition's circulators: the town's voters set apart (`wideElectorate`).
 */
function petitionReach(
  api: CoreAPI,
  contestId: string,
): ReturnType<typeof wideElectorate> {
  const held: NonNullable<ReturnType<typeof reaches.get>> =
    reaches.get(api.state) ?? new Map();
  reaches.set(api.state, held);
  const kept = held.get(contestId);
  if (kept && daysBetween(kept.asOf, api.state.date) < 90) return kept.reach;
  const contest = elections(api, "contests").get(contestId) as unknown as
    ContestRow | undefined;
  const reach = contest
    ? wideElectorate(api, contest, {
        voters: townElectorate(api),
        population: Number(api.state.placeMetadata.referencePopulation) || 0,
      })
    : null;
  held.set(contestId, { asOf: api.state.date, reach });
  return reach;
}
// A race's places, read again a quarter after they were last read, as
// `townShareOfRace` does: counting the town's adults walks every person, and
// the circulators read the reach on every race turn of every wider filing.
const reaches = new WeakMap<
  object,
  Map<
    string,
    {
      readonly asOf: string;
      readonly reach: ReturnType<typeof wideElectorate>;
    }
  >
>();

/** Whether a filing's petition circulates for a race that reaches past the town, so circulators can be hired for it. */
export function circulatorsCanWork(api: CoreAPI, filingId: string): boolean {
  return (
    petitionCirculating(api, filingId) &&
    !!petitionReach(api, campaignFor(api, filingId).contestId)?.outside.length
  );
}

/**
 * What a campaign holds and has not set aside: raised less spent, less its
 * funds for an event, a poll and circulators. The one figure every purchase
 * (an ad, a poll, mail, a venue) and every hire budgets from, so none spends
 * money another has been promised (a purchase from the raised-less-spent
 * total once spent the circulators' fund, and their pay then fell due with
 * the cash gone: Tutu, U.S. Virgin Islands, 2026-05-09, "owner after").
 */
export function freeMinor(campaign: CampaignRow): number {
  return Math.max(
    0,
    campaign.raisedMinor -
      campaign.spentMinor -
      (campaign.eventFundMinor ?? 0) -
      (campaign.pollFundMinor ?? 0) -
      (campaign.circulatorFundMinor ?? 0),
  );
}

/**
 * What an evening out may cost the campaign: the cash it holds less the
 * money it has set aside for circulators and for a poll, which an evening
 * never takes (the money set aside for an event is the event's own).
 */
export function eveningMoneyMinor(api: CoreAPI, campaign: CampaignRow): number {
  const cash =
    api.state.organizations.get(campaign.organizationId)?.liquidMinor ?? 0;
  return Math.max(
    0,
    cash - (campaign.circulatorFundMinor ?? 0) - (campaign.pollFundMinor ?? 0),
  );
}

/**
 * The campaign hires paid petition circulators to gather signatures among
 * its race's voters outside the town (a county, district, state or federal
 * race: the town holds only part of the electorate the law counts). The
 * amount is set aside from what the campaign holds, never more; the
 * circulators work until the petition is due and are paid as their
 * signatures come in (`circulatorShift`). Returns what was set aside.
 */
export function hireCirculators(
  api: CoreAPI,
  filingId: string,
  amountMinor: number,
): number {
  if (!petitionCirculating(api, filingId)) return 0;
  const campaign = campaignFor(api, filingId);
  if (!petitionReach(api, campaign.contestId)?.outside.length) return 0;
  const hasAccount = (api.state as CoreState).cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  );
  const set = Math.min(
    Math.max(0, Math.floor(amountMinor)),
    hasAccount ? freeMinor(campaign) : 0,
  );
  if (set <= 0) return 0;
  save(api, {
    ...campaign,
    circulatorFundMinor: (campaign.circulatorFundMinor ?? 0) + set,
    circulatorShiftOn: campaign.circulatorFundMinor
      ? campaign.circulatorShiftOn
      : api.state.date,
  });
  return set;
}

/** Who a campaign pays for circulators: a political consulting firm in town, else the firms outside it (the outside account). */
function circulatorSeller(api: CoreAPI): string | null {
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const employers = core.organizationsByPlaceKind.get(`${town}:employer`);
  const local = [...(employers ?? [])]
    .sort()
    .find(
      (id) =>
        core.organizations.get(id)?.classification ===
        "enterprise:political-consulting",
    );
  return local ?? townOutsideOf(core.organizations.values(), town)?.id ?? null;
}

/**
 * The circulators' work since their last turn: the fund is spent at an even
 * pace to the petition's last day, so the signatures arrive over the days
 * the petition circulates, never at once. Each place of the race outside the
 * town gives signatures in proportion to its voters, up to the voters there
 * who would sign: those on the candidate's side of the lean order, and of the
 * rest the share signing's low bar reaches (`petitionSignOpenness`), less
 * what the place has already given. Paid at the per-signature price, on the
 * journal, to the consulting seller. The race's last turn inside the
 * petition's days spends what is left; money still held when the petition
 * is handed in goes back to the campaign. Returns the signatures added.
 */
export function circulatorShift(
  api: CoreAPI,
  filingId: string,
  /** Days until the race's next turn: a turn whose next one falls past the due day is the petition's last. */
  nextTurnInDays = 0,
): number {
  const campaign = campaignFor(api, filingId);
  const fund = campaign.circulatorFundMinor ?? 0;
  if (fund <= 0) return 0;
  const petition = petitionOf(api, filingId);
  const reach = petitionReach(api, campaign.contestId);
  if (!petition || !petitionCirculating(api, filingId) || !reach) {
    save(api, { ...campaign, circulatorFundMinor: 0 });
    return 0;
  }
  const since = campaign.circulatorShiftOn ?? petition.opened;
  const elapsed = Math.max(0, daysBetween(since, api.state.date));
  const remaining = Math.max(0, daysBetween(api.state.date, petition.due));
  if (elapsed <= 0 && remaining > 0) return 0;
  // The last turn the petition's days hold spends what is left: money kept
  // for a turn that falls after the due day would never reach a signature.
  const share =
    remaining < nextTurnInDays || remaining <= 0
      ? 1
      : elapsed / (elapsed + remaining);
  const price = unitPrice(api, "petition-signature");
  let want = Math.floor((fund * share) / price);
  const sellerId = circulatorSeller(api);
  if (want <= 0 || !sellerId) return 0;
  const filing = filingOf(api, filingId);
  const side = partySide(filing?.party ?? null);
  const openness = Math.min(1, campaignParameter("petitionSignOpenness"));
  const outsideEligible = reach.outside.reduce((n, p) => n + p.eligible, 0);
  const held = petition.outsideSigned ?? {};
  const got: [string, number][] = [];
  let total = 0;
  for (const place of reach.outside) {
    const aligned =
      side > 0
        ? place.rightShare
        : side < 0
          ? 1 - place.rightShare
          : shareValue("evenSplit");
    const willing = Math.floor(
      place.eligible * (1 - (1 - aligned) * (1 - openness)) -
        (held[place.id] ?? 0),
    );
    const n = Math.min(
      Math.max(0, willing),
      Math.floor((want * place.eligible) / outsideEligible),
    );
    if (n > 0) {
      got.push([place.id, n]);
      total += n;
    }
  }
  if (total <= 0) return 0;
  spend(api, filingId, {
    kind: "circulators",
    sellerId,
    amountMinor: total * price,
    citation: `${total} petition signatures at the campaign-unit-prices petition-signature row`,
  });
  signOutside(api, filingId, got);
  want = total;
  save(api, {
    ...campaignFor(api, filingId),
    circulatorFundMinor: Math.max(0, fund - want * price),
    circulatorShiftOn: api.state.date,
  });
  return total;
}

/**
 * A world candidate whose race reaches past the town hires circulators for
 * the part of the signatures still lacking that the town cannot give: the
 * share of the race's voters outside it, at the per-signature price, from
 * what the campaign holds. A campaign with no money hires none and may not
 * qualify.
 */
export function hireCirculatorsForNeed(api: CoreAPI, filingId: string): number {
  const petition = petitionOf(api, filingId);
  if (!petition || !petitionCirculating(api, filingId)) return 0;
  const campaign = campaignFor(api, filingId);
  const reach = petitionReach(api, campaign.contestId);
  if (!reach?.outside.length) return 0;
  const price = unitPrice(api, "petition-signature");
  const lacking =
    signaturesToGather(api, filingId) -
    petition.signed -
    Math.floor((campaign.circulatorFundMinor ?? 0) / price);
  if (lacking <= 0) return 0;
  const outsideShare =
    reach.outside.reduce((n, p) => n + p.eligible, 0) / reach.eligible;
  return hireCirculators(
    api,
    filingId,
    Math.ceil(lacking * outsideShare) * price,
  );
}

/**
 * While the petition circulates, the candidate asks the people closest to
 * them to sign, once a day, a few at a time, the closest first, each once:
 * their family, the people they know and anyone they keep a relationship
 * with, who live in the town. Returns how many signed.
 */
export function askCircleToSign(api: CoreAPI, filingId: string): number {
  if (!petitionCirculating(api, filingId)) return 0;
  const campaign = campaignFor(api, filingId);
  if (campaign.petitionAskedOn === api.state.date) return 0;
  const candidate = api.state.people.get(campaign.candidateId);
  if (!candidate?.alive) return 0;
  const town = townRow(api).townPlaceId;
  const asked = new Set(campaign.petitionAskedIds ?? []);
  const circle = [...circleOf(api, candidate)]
    .filter((id) => id !== candidate.id && !asked.has(id))
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => !!p?.alive && p.placeId === town)
    .map((p) => ({
      p,
      tie: p.familyIds.has(candidate.id)
        ? 1
        : closenessBetween(api.state, p.id, candidate.id),
    }))
    .sort((a, b) => b.tie - a.tie || a.p.id.localeCompare(b.p.id))
    .slice(0, campaignParameter("petitionCircleAsksPerDay"));
  let signed = 0;
  for (const { p } of circle) {
    asked.add(p.id);
    if (askToSign(api, filingId, p, "circle")) signed += 1;
  }
  save(api, {
    ...campaignFor(api, filingId),
    petitionAskedIds: [...asked],
    petitionAskedOn: api.state.date,
  });
  return signed;
}
