/**
 * Campaigning (golden path step 4): between filing and election day, support
 * comes only from the people a campaign actually reaches.
 *
 * Every act (a door, a speech, an ad, an endorsement, a volunteer's door, a
 * retelling at home) reaches specific people. Each person then changes what
 * they know (they've heard of the candidate; they know the platform) and how
 * warm they are toward the candidate, for their own reasons: how far the
 * platform sits from their own views, how the meeting went with this
 * canvasser, who told them. Every change is a recorded cause; nothing moves
 * support without one. Polls ask real people and report what they said.
 *
 * Views come from a stand-in until OPUS-PEOPLE's views engine lands
 * (`campaign-views.ts`, SG-GOV-views-stand-in).
 */
import { registerElectorate } from "../electorate";
import { partySide } from "../appointments";
import { residentsRuntime } from "./residents";
import { fillInPerson } from "../state";
import limits from "../../../data/research/campaign-reality/campaign-contribution-limits.json" with { type: "json" };
import finance from "../../../data/research/campaigns/campaign-finance-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
  Source,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { CashJournalSourceSlot } from "../journal-state";
import { townDistrict } from "../offices-state";
import {
  campaignParameter,
  districtLean,
  personLean,
  platformAgreement,
  type Stance,
} from "../campaign-views";
import { recordAppeal } from "./record";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./elections";

export const CAMPAIGNS_MODULE_ID = "core2-campaigns-v1";
const DONATION_KIND = "campaigns:donation";
const AD_KIND = "campaigns:ad-buy";

export interface CampaignRow {
  readonly id: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly platform: readonly Stance[];
  readonly organizationId: string;
  readonly volunteerIds: readonly string[];
  readonly staffIds: readonly string[];
  readonly doorsKnocked: readonly string[];
  readonly raisedMinor: number;
  readonly spentMinor: number;
}

export interface ImpressionRow {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly contestId: string;
  readonly heardOf: boolean;
  readonly knowsPlatform: boolean;
  readonly warmth: number;
  readonly causes: number;
}

export type CampaignAct =
  | "door"
  | "volunteer-door"
  | "speech"
  | "interview"
  | "town-hall"
  | "debate"
  | "retold"
  | "ad"
  | "attack-ad"
  | "endorsement"
  | "donation-ask"
  | "constituent-case";

/** Why one person's view of one candidate changed, once. */
export interface CauseRow {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly date: string;
  readonly act: CampaignAct;
  readonly actorId: string;
  readonly warmthBefore: number;
  readonly warmthAfter: number;
  /** The person's own reasons, as numbers the English engine words. */
  readonly agreement: number | null;
  readonly rapport: number;
  readonly weight: number;
}

export interface PromiseRow {
  readonly id: string;
  readonly candidateId: string;
  readonly contestId: string;
  readonly date: string;
  readonly stance: Stance;
  readonly venue: string;
  readonly audience: number;
}

export interface PollRow {
  readonly id: string;
  readonly campaignId: string;
  readonly contestId: string;
  readonly date: string;
  readonly contacted: number;
  readonly answers: Readonly<Record<string, number>>;
  readonly marginOfError: number | null;
  readonly respondentIds: readonly string[];
}

interface MoneyRecord {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly source: Source;
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function moneySlot(
  api: CoreAPI,
  id: string,
): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, "money").get(id) as unknown as MoneyRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind: row.kind,
    id: row.id,
    date: row.date,
    source: row.source,
    expectedPostings: row.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  const slot = {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
  map.set(id, slot);
  return slot;
}

export const CAMPAIGNS_MODULE: CoreModule = {
  id: CAMPAIGNS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      campaigns: { indexes: { byContest: { fields: ["contestId"] } } },
      impressions: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      causes: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      promises: { indexes: { byCandidate: { fields: ["candidateId"] } } },
      polls: { indexes: { byContest: { fields: ["contestId"] } } },
      money: {},
      town: {},
    },
  },
  journalSourceProviders: {
    [DONATION_KIND]: (api, reference) => moneySlot(api, reference.id),
    [AD_KIND]: (api, reference) => moneySlot(api, reference.id),
  },
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(CAMPAIGNS_MODULE_ID).table(name);
}
function elections(api: CoreAPI, name: string) {
  return api.moduleState(ELECTIONS_MODULE_ID).table(name);
}
const clamp = (x: number) => Math.max(-1, Math.min(1, x));
const ageOn = (
  person: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
) => Number(date.slice(0, 4)) - Number(person.birthDate.slice(0, 4));

/** A filing's platform: stance strings written "question=+1" or "question=-1". */
export function parsePlatform(platform: readonly string[]): readonly Stance[] {
  return platform.flatMap((entry) => {
    const [question, position] = entry.split("=");
    const value = Number(position);
    return question && Number.isFinite(value)
      ? [{ question, position: Math.max(-1, Math.min(1, value)) }]
      : [];
  });
}

/** Register the module and note the town's starting lean (stand-in for views). */
export function openCampaigns(core: CoreState): void {
  registerElectorate(core);
  if (!core.modules.has(CAMPAIGNS_MODULE_ID))
    registerModule(core, CAMPAIGNS_MODULE);
  const api = coreAPI(core);
  const town = elections(api, "town").get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
  const district = townDistrict(
    town.geoid,
    town.stateKey.slice(3),
    "congressional",
    core.date,
  );
  // stopgapId: SG-GOV-views-stand-in
  api.stopgap("SG-GOV-views-stand-in");
  table(api, "town").put({
    id: "town",
    ...town,
    lean: districtLean(district?.geoid ?? null, town.stateKey),
  });
}

function townRow(api: CoreAPI) {
  return table(api, "town").get("town") as unknown as {
    stateKey: string;
    townPlaceId: string;
    lean: number;
  };
}

/** The campaign of a filing, started the first time it's used. */
export function campaignFor(api: CoreAPI, filingId: string): CampaignRow {
  const existing = table(api, "campaigns").get(filingId) as unknown as
    CampaignRow | undefined;
  if (existing) return existing;
  const filing = elections(api, "filings").get(
    filingId,
  ) as unknown as FilingRow;
  if (!filing) throw new Error(`No filing ${filingId}`);
  const person = api.state.people.get(filing.personId)!;
  const organizationId = `organization:campaign:${filingId}`;
  if (!api.state.organizations.has(organizationId))
    api.addOrganization({
      id: organizationId,
      placeId: townRow(api).townPlaceId,
      name: `${person.givenName} ${person.familyName} campaign`,
      kind: "campaign-committee",
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: `Filing ${filingId}`,
        asOf: api.state.date,
      },
    });
  const row: CampaignRow = {
    id: filingId,
    filingId,
    contestId: filing.contestId,
    candidateId: filing.personId,
    platform: parsePlatform(filing.platform),
    organizationId,
    volunteerIds: [],
    staffIds: [],
    doorsKnocked: [],
    raisedMinor: 0,
    spentMinor: 0,
  };
  table(api, "campaigns").put(row as unknown as ModuleRow);
  return row;
}

function save(api: CoreAPI, row: CampaignRow) {
  table(api, "campaigns").put(row as unknown as ModuleRow);
}

export function impressionOf(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
): ImpressionRow | null {
  return (
    (table(api, "impressions").get(`${voterId}|${candidateId}`) as unknown as
      ImpressionRow | undefined) ?? null
  );
}

/**
 * One person reached by one act. They learn the candidate's name (and the
 * platform where the act carries it); their warmth moves toward what they make
 * of it: their agreement with the platform plus how the meeting went, by the
 * act's weight. Returns the recorded cause.
 */
function reach(
  api: CoreAPI,
  campaign: CampaignRow,
  voterId: string,
  act: CampaignAct,
  actorId: string,
  options: {
    readonly carriesPlatform: boolean;
    readonly weight: number;
    readonly rapport: number;
    readonly target?: number;
  },
): CauseRow | null {
  const voter = api.state.people.get(voterId);
  if (!voter?.alive || voterId === campaign.candidateId) return null;
  const date = api.state.date;
  const before = impressionOf(api, voterId, campaign.candidateId);
  const lean = personLean(api.state.people, voter, townRow(api).lean);
  const knowsPlatform =
    (before?.knowsPlatform ?? false) || options.carriesPlatform;
  const agreement = knowsPlatform
    ? platformAgreement(lean, campaign.platform)
    : null;
  const target = clamp(options.target ?? (agreement ?? 0) + options.rapport);
  const warmthBefore = before?.warmth ?? 0;
  const warmthAfter = clamp(
    warmthBefore + options.weight * (target - warmthBefore),
  );
  const cause: CauseRow = {
    id: `cause:${voterId}:${campaign.candidateId}:${date}:${(before?.causes ?? 0) + 1}`,
    voterId,
    candidateId: campaign.candidateId,
    date,
    act,
    actorId,
    warmthBefore,
    warmthAfter,
    agreement,
    rapport: options.rapport,
    weight: options.weight,
  };
  table(api, "causes").put(cause as unknown as ModuleRow);
  table(api, "impressions").put({
    id: `${voterId}|${campaign.candidateId}`,
    voterId,
    candidateId: campaign.candidateId,
    contestId: campaign.contestId,
    heardOf: true,
    knowsPlatform,
    warmth: warmthAfter,
    causes: (before?.causes ?? 0) + 1,
  } as unknown as ModuleRow);
  if (!before?.heardOf)
    api.observe(voterId, {
      key: `candidate:${campaign.candidateId}`,
      value: campaign.contestId,
      learnedAt: date,
      sourceId: cause.id,
      access:
        act === "retold" ? "told" : act.endsWith("ad") ? "public" : "perceived",
    });
  return cause;
}

/**
 * What an official did for a person outside any campaign (helping with their
 * problem, or turning them away) moves the person's warmth toward the
 * official, recorded as a cause the next election reads.
 */
export function touchImpression(
  api: CoreAPI,
  input: {
    readonly voterId: string;
    readonly officialId: string;
    readonly act: CampaignAct;
    readonly target: number;
    readonly weight: number;
    readonly rapport: number;
  },
): CauseRow | null {
  const voter = api.state.people.get(input.voterId);
  if (!voter?.alive || input.voterId === input.officialId) return null;
  const date = api.state.date;
  const before = impressionOf(api, input.voterId, input.officialId);
  const warmthBefore = before?.warmth ?? 0;
  const warmthAfter = clamp(
    warmthBefore + input.weight * (clamp(input.target) - warmthBefore),
  );
  const cause: CauseRow = {
    id: `cause:${input.voterId}:${input.officialId}:${date}:${(before?.causes ?? 0) + 1}`,
    voterId: input.voterId,
    candidateId: input.officialId,
    date,
    act: input.act,
    actorId: input.officialId,
    warmthBefore,
    warmthAfter,
    agreement: null,
    rapport: input.rapport,
    weight: input.weight,
  };
  table(api, "causes").put(cause as unknown as ModuleRow);
  table(api, "impressions").put({
    id: `${input.voterId}|${input.officialId}`,
    voterId: input.voterId,
    candidateId: input.officialId,
    contestId: (before as { contestId?: string } | null)?.contestId ?? null,
    heardOf: true,
    knowsPlatform: before?.knowsPlatform ?? false,
    warmth: warmthAfter,
    causes: (before?.causes ?? 0) + 1,
  } as unknown as ModuleRow);
  return cause;
}

/** How a face-to-face meeting goes: both people's sociability, by the weight the parameters give it. */
function rapport(a: Readonly<PersonState>, b: Readonly<PersonState>): number {
  const social =
    ((a.traits["people-mind-v1:sociability"] ?? 0) +
      (b.traits["people-mind-v1:sociability"] ?? 0)) /
    2;
  return campaignParameter("rapportWeight") * social;
}

/** Family and friends hear about it from the person who was there. */
function retell(
  api: CoreAPI,
  campaign: CampaignRow,
  teller: Readonly<PersonState>,
  cause: CauseRow,
): void {
  for (const id of teller.familyIds) {
    const listener = api.state.people.get(id);
    if (!listener?.alive || ageOn(listener, api.state.date) < 18) continue;
    reach(api, campaign, id, "retold", teller.id, {
      carriesPlatform: cause.agreement !== null,
      weight:
        campaignParameter("secondhandWeight") *
        Math.abs(cause.warmthAfter - cause.warmthBefore) *
        2,
      rapport: 0,
      target: cause.warmthAfter,
    });
  }
}

/**
 * Knock on doors for some hours: the montage. Households not yet visited, in
 * the order they stand. At each door the most outgoing adult answers, if
 * anyone in the house is willing to open to a stranger; they talk with the
 * canvasser, and tell their household. Returns everyone met at a door, in
 * order, so the screen can stop on a porch.
 */
export function knockDoors(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly canvasserId: string;
    readonly hours: number;
  },
): readonly CauseRow[] {
  let campaign = campaignFor(api, input.filingId);
  const canvasser = api.state.people.get(input.canvasserId)!;
  const efficiency =
    1 +
    campaignParameter("canvasserReliabilityEfficiency") *
      (canvasser.traits["people-mind-v1:reliability"] ?? 0);
  const doors = Math.floor(
    input.hours * campaignParameter("doorsPerCanvasserHour") * efficiency,
  );
  api.recordActivityTime(input.canvasserId, "campaign", input.hours * 60, {
    tag: "SOURCED",
    citation: `Campaign ${campaign.id}`,
    asOf: api.state.date,
  });
  const done = new Set(campaign.doorsKnocked);
  const town = townRow(api).townPlaceId;
  const core = api.state as CoreState;
  // The whole town's doors: full households and counted ones alike.
  const rt = residentsRuntime(core);
  const homes = [
    ...[...api.state.households.values()]
      .filter((h) => h.placeId === town)
      .map((h) => ({
        id: h.id,
        adults: [...h.memberIds]
          .map((id) => api.state.people.get(id))
          .filter(
            (p): p is PersonState =>
              !!p && p.alive && ageOn(p, api.state.date) >= 18,
          )
          .map((p) => ({
            id: p.id,
            traits: p.traits,
            birthDate: p.birthDate,
            slots: [...(core.work.commitmentsByPerson.get(p.id) ?? [])]
              .map((c) => core.work.commitments.get(c))
              .filter((c) => !!c),
          })),
      })),
    ...[...(rt?.households.values() ?? [])]
      .filter((r) => r.household.placeId === town)
      .map((r) => ({
        id: r.household.id,
        adults: r.people
          .filter((p) => ageOn(p, api.state.date) >= 18)
          .map((p) => ({
            id: p.id,
            traits: p.traits,
            birthDate: p.birthDate,
            slots: r.workCommitments.filter((c) => c.personId === p.id),
          })),
      })),
  ]
    .filter((h) => !done.has(h.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, doors);
  const perHour = Math.max(1, doors / Math.max(1, input.hours));
  const start = campaignParameter("canvassStartHour") * 60;
  const met: CauseRow[] = [];
  for (const [index, home] of homes.entries()) {
    done.add(home.id);
    // Who's home at the minute of the knock: not at a scheduled shift.
    const minute = start + Math.floor((index * 60) / perHour);
    const athome = home.adults.filter(
      (a) => !a.slots.some((c) => atWork(c!, api.state.date, minute)),
    );
    // The most outgoing one home opens to a stranger if they're willing.
    // Older residents answer more (contact rates rise with age in field
    // experiments; Green and Gerber 2019).
    const willing = (a: {
      traits: Readonly<Record<string, number>>;
      birthDate: string;
    }) =>
      (a.traits["people-mind-v1:sociability"] ?? 0) +
      ((a.traits["people-mind-v1:conflict"] ?? 0) +
        (a.traits["people-mind-v1:risk"] ?? 0)) /
        2 +
      (ageOn(a, api.state.date) - campaignParameter("doorAnswerPivotAge")) /
        campaignParameter("doorAnswerAgeSpan");
    const opener = athome
      .sort((a, b) => willing(b) - willing(a) || a.id.localeCompare(b.id))
      .find((a) => willing(a) > campaignParameter("doorAnswerThreshold"));
    if (!opener) continue;
    // A counted household is filled in when its door opens (the owner's
    // on-click design): the person who answers is a full person from then on.
    if (!api.state.people.has(opener.id)) fillInPerson(core, opener.id);
    const answers = api.state.people.get(opener.id);
    if (!answers) continue;
    const cause = reach(
      api,
      campaign,
      answers.id,
      input.canvasserId === campaign.candidateId ? "door" : "volunteer-door",
      input.canvasserId,
      {
        carriesPlatform: true,
        weight: campaignParameter("doorContactWeight"),
        rapport: rapport(canvasser, answers),
      },
    );
    if (!cause) continue;
    if (input.canvasserId !== answers.id)
      api.relationship(input.canvasserId, answers.id, "contact", 0.1);
    met.push(cause);
    retell(api, campaign, answers, cause);
  }
  campaign = { ...campaignFor(api, input.filingId), doorsKnocked: [...done] };
  save(api, campaign);
  return met;
}

/** The pollster the campaign pays (a stand-in seller until the town's businesses include one). */
function pollster(api: CoreAPI): string {
  const id = `organization:pollster:${townRow(api).townPlaceId}`;
  if (!api.state.organizations.has(id))
    api.addOrganization({
      id,
      placeId: townRow(api).townPlaceId,
      name: "Polling firm",
      kind: "pollster",
      liquidMinor: 0,
      source: {
        tag: "ESTIMATED",
        citation: "Stand-in seller of poll interviews",
        asOf: api.state.date,
        estimatedFrom: "pollCostPerInterviewMinor",
      },
    });
  return id;
}

/** Whether a work commitment has its holder at a shift at this minute of this day. */
function atWork(
  commitment: Readonly<{
    anchorDate: string;
    periodDays: number;
    slots: readonly {
      offsetDays: number;
      startMinute: number;
      minutes: number;
    }[];
    startsAt: string;
    endsAt?: string;
  }>,
  date: string,
  minute: number,
): boolean {
  if (commitment.startsAt > date) return false;
  if (commitment.endsAt !== undefined && commitment.endsAt <= date)
    return false;
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${commitment.anchorDate}T00:00:00Z`)) /
      86_400_000,
  );
  const day =
    ((days % commitment.periodDays) + commitment.periodDays) %
    commitment.periodDays;
  return commitment.slots.some(
    (slot) =>
      slot.offsetDays === day &&
      minute >= slot.startMinute &&
      minute < slot.startMinute + slot.minutes,
  );
}

/**
 * Ask someone to volunteer. They say yes when liking the candidate,
 * closeness, an outgoing or dutiful temperament outweigh the hours their
 * work already takes.
 */
export function askToVolunteer(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge")
  )
    return false;
  const warmth = impressionOf(api, personId, campaign.candidateId)?.warmth ?? 0;
  // Whether they give their evenings to it: how much they like the
  // candidate, how close they are, their temperament (outgoing, dutiful),
  // against the hours their work already takes.
  const core = api.state as CoreState;
  const tie =
    core.relationships.get([personId, campaign.candidateId].sort().join(":"))
      ?.level ?? 0;
  const family = person.familyIds.has(campaign.candidateId) ? 1 : 0;
  const weeklyWork = [...(core.work.commitmentsByPerson.get(personId) ?? [])]
    .map((id) => core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  const drive =
    warmth +
    campaignParameter("volunteerClosenessWeight") * (tie + family) +
    ((person.traits["people-mind-v1:sociability"] ?? 0) +
      (person.traits["personality-v1:facet-duty-bound"] ?? 0)) /
      2 -
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes");
  const yes = drive > campaignParameter("volunteerThreshold");
  if (yes && !campaign.volunteerIds.includes(personId))
    save(api, {
      ...campaign,
      volunteerIds: [...campaign.volunteerIds, personId],
    });
  return yes;
}

/** The individual contribution limit for this contest, in minor units (null: no limit), and its source. */
export function contributionLimit(
  api: CoreAPI,
  contestId: string,
): {
  readonly minor: number | null;
  readonly source: string;
  readonly estimate: boolean;
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
    const federal = research.federal.individualToCandidate;
    return {
      minor: federal.usd * 100,
      source: `${federal.source} ${federal.sourceUrl}`,
      estimate: false,
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
 * Ask someone for money. They give if they like the candidate, a share of
 * their own cash by how warm they are, never over the legal limit. The money
 * moves from their account to the campaign's through the journal.
 */
export function askForDonation(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): number {
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < 18) return 0;
  const warmth = impressionOf(api, donorId, campaign.candidateId)?.warmth ?? 0;
  if (warmth <= 0 || donor.liquidMinor <= 0) return 0;
  const limit = contributionLimit(api, campaign.contestId);
  const given = (table(api, "money").rows() as unknown as MoneyRecord[])
    .filter(
      (m) =>
        m.kind === DONATION_KIND &&
        m.id.includes(`:${donorId}:`) &&
        m.id.includes(filingId),
    )
    .reduce((sum, m) => sum + Math.max(0, m.postings[1]!.deltaMinor), 0);
  const want = Math.floor(
    donor.liquidMinor *
      warmth *
      campaignParameter("donationShareOfCashPerWarmth"),
  );
  const amount = Math.max(
    0,
    Math.min(want, limit.minor === null ? want : limit.minor - given),
  );
  if (amount <= 0) return 0;
  postMoney(
    api,
    DONATION_KIND,
    `donation:${filingId}:${donorId}:${api.state.date}`,
    donorId,
    campaign.organizationId,
    amount,
    limit.source,
    limit.estimate,
  );
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaign.raisedMinor + amount,
  });
  return amount;
}

function postMoney(
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
  table(api, "money").put(record as unknown as ModuleRow);
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${date}:${state.cashJournal.nextSequence}`,
    date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind, id },
    postings: record.postings,
  });
}

/**
 * Give a speech. Everyone who already knows the candidate and lives here is
 * the audience they can draw (stand-in for who turns up: people the scene
 * places there); each hears the platform, decides for themselves and tells
 * their family. Every statement is recorded as a promise.
 */
export function giveSpeech(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly venue: string;
    readonly statements: readonly Stance[];
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  const heard = [
    ...new Set([
      ...(
        table(api, "impressions").query("byCandidate", [
          campaign.candidateId,
        ]) as unknown as ImpressionRow[]
      )
        .filter((i) => i.heardOf)
        .map((i) => i.voterId),
      ...campaign.volunteerIds,
    ]),
  ].sort();
  return makeStatements(api, {
    ...input,
    audienceIds: heard,
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
}

/**
 * Statements made to an audience (a speech's crowd, an interview's readers or
 * viewers): each person in it hears the platform with the statements added,
 * decides for themselves and tells their family, and every statement is
 * recorded as a promise only its audience heard.
 */
export function makeStatements(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly venue: string;
    readonly statements: readonly Stance[];
    readonly audienceIds: readonly string[];
    readonly act: CampaignAct;
    readonly weight: number;
    /** In person: how the meeting goes adds to what they make of it. */
    readonly faceToFace: boolean;
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  const speaker = api.state.people.get(campaign.candidateId)!;
  const causes: CauseRow[] = [];
  const withStatements = {
    ...campaign,
    platform: [...campaign.platform, ...input.statements],
  };
  for (const id of input.audienceIds) {
    const listener = api.state.people.get(id);
    if (!listener) continue;
    const cause = reach(
      api,
      withStatements,
      id,
      input.act,
      campaign.candidateId,
      {
        carriesPlatform: true,
        weight: input.weight,
        rapport: input.faceToFace ? rapport(speaker, listener) / 2 : 0,
      },
    );
    if (!cause) continue;
    causes.push(cause);
    retell(api, withStatements, listener, cause);
  }
  for (const [index, stance] of input.statements.entries()) {
    const promiseId = `promise:${campaign.candidateId}:${api.state.date}:${input.act}:${index}`;
    table(api, "promises").put({
      id: promiseId,
      candidateId: campaign.candidateId,
      contestId: campaign.contestId,
      date: api.state.date,
      stance,
      venue: input.venue,
      audience: causes.length,
    } as unknown as ModuleRow);
    // Who heard it: only they can hold the promise against the speaker.
    for (const cause of causes)
      api.observe(cause.voterId, {
        key: promiseId,
        value: "heard",
        learnedAt: api.state.date,
        sourceId: cause.id,
        access: input.faceToFace ? "perceived" : "public",
      });
  }
  save(api, {
    ...campaignFor(api, input.filingId),
    platform: withStatements.platform,
  });
  return causes;
}

/** Where an ad is bought: an outlet and its followers (the press registers it). */
let adOutlet:
  | ((
      api: CoreAPI,
    ) => { organizationId: string; followerIds: readonly string[] } | null)
  | null = null;
export function registerAdOutlet(fn: typeof adOutlet): void {
  adOutlet = fn;
}

/**
 * Run an ad: spend from the campaign's account; the people it reaches are the
 * ones who see the most media (stand-in: adults with the fewest work hours,
 * SG-GOV-ad-reach-media-habits). An attack ad carries a rival's public record
 * and moves warmth toward the rival down for people who disagree with it.
 */
export function runAd(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly amountMinor: number;
    readonly attackFilingId?: string;
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  const account = api.state.organizations.get(campaign.organizationId)!;
  const available = (api.state as CoreState).cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? campaign.raisedMinor - campaign.spentMinor
    : 0;
  const amount = Math.min(input.amountMinor, available);
  void account;
  if (amount <= 0) return [];
  // Ad time from the town's own outlets where the press is open: the buyer's
  // audience is the outlet's followers.
  const outlet = adOutlet?.(api) ?? null;
  const media =
    outlet?.organizationId ?? `organization:media:${townRow(api).townPlaceId}`;
  if (!api.state.organizations.has(media))
    api.addOrganization({
      id: media,
      placeId: townRow(api).townPlaceId,
      name: "Local media",
      kind: "media",
      liquidMinor: 0,
      source: {
        tag: "ESTIMATED",
        citation: "Stand-in seller of ad time",
        asOf: api.state.date,
        estimatedFrom: "SG-GOV-ad-reach-media-habits",
      },
    });
  postMoney(
    api,
    AD_KIND,
    `ad:${input.filingId}:${api.state.date}:${campaign.spentMinor}`,
    campaign.organizationId,
    media,
    amount,
    "Ad buy",
    false,
  );
  save(api, {
    ...campaignFor(api, input.filingId),
    spentMinor: campaign.spentMinor + amount,
  });
  const contacts = Math.floor(
    (amount / 1000) * campaignParameter("adContactsPerThousandMinor"),
  );
  const town = townRow(api).townPlaceId;
  if (!outlet)
    // stopgapId: SG-GOV-ad-reach-media-habits
    api.stopgap("SG-GOV-ad-reach-media-habits");
  const followers = outlet
    ? outlet.followerIds
        .map((id) => api.state.people.get(id))
        .filter((p): p is PersonState => p !== undefined)
        .slice(0, contacts)
        .map((p) => ({ p, work: 0 }))
    : null;
  const viewers =
    followers ??
    [...api.state.people.values()]
      .filter(
        (p) => p.alive && p.placeId === town && ageOn(p, api.state.date) >= 18,
      )
      .map((p) => ({
        p,
        work: [
          ...((api.state as CoreState).work.commitmentsByPerson.get(p.id) ??
            []),
        ].reduce(
          (s, id) =>
            s +
            ((api.state as CoreState).work.commitments.get(id)
              ?.expectedWeeklyMinutes ?? 0),
          0,
        ),
      }))
      .sort((a, b) => a.work - b.work || a.p.id.localeCompare(b.p.id))
      .slice(0, contacts);
  const target = input.attackFilingId
    ? campaignFor(api, input.attackFilingId)
    : campaign;
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
          ? { target: clamp(attack.reduce((sum, r) => sum + r.effect, 0)) }
          : {}),
      },
    );
    if (cause) causes.push(cause);
  }
  return causes;
}

/**
 * Ask someone to endorse. They endorse only the candidate whose platform they
 * agree with most among those they know of, never for a price; everyone who
 * knows them hears it.
 */
export function askForEndorsement(
  api: CoreAPI,
  filingId: string,
  endorserId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const endorser = api.state.people.get(endorserId);
  if (!endorser?.alive) return false;
  const lean = personLean(api.state.people, endorser, townRow(api).lean);
  const mine = platformAgreement(lean, campaign.platform);
  const rivals = (
    table(api, "campaigns").query("byContest", [
      campaign.contestId,
    ]) as unknown as CampaignRow[]
  )
    .filter((c) => c.id !== campaign.id)
    .map((c) => platformAgreement(lean, c.platform));
  if (mine <= 0 || rivals.some((r) => r >= mine)) return false;
  for (const id of [...endorser.knownIds, ...endorser.familyIds]) {
    const listener = api.state.people.get(id);
    if (!listener) continue;
    reach(api, campaign, id, "endorsement", endorserId, {
      carriesPlatform: true,
      weight: campaignParameter("endorsementWeight"),
      rapport: 0,
      target: clamp(mine),
    });
  }
  return true;
}

/**
 * Commission a poll: the pollster calls adults in the town in a fixed order
 * from the pollster's list (the sampling frame), and records what each said.
 * Someone who has heard of no candidate is undecided; someone who leans
 * toward a candidate but avoids conflict says "no opinion". True support is
 * never reported, only what people said.
 */
export function commissionPoll(
  api: CoreAPI,
  input: { readonly filingId: string; readonly sampleSize: number },
): PollRow {
  const campaign = campaignFor(api, input.filingId);
  const town = townRow(api).townPlaceId;
  const date = api.state.date;
  const core = api.state as CoreState;
  // The whole town is the frame: full people and the counted residents.
  const rt = residentsRuntime(core);
  const frame = [
    ...[...api.state.people.values()]
      .filter((p) => p.alive && p.placeId === town && ageOn(p, date) >= 18)
      .map((p) => ({ id: p.id, traits: p.traits, birthDate: p.birthDate })),
    ...[...(rt?.households.values() ?? [])]
      .filter((r) => r.household.placeId === town)
      .flatMap((r) => r.people)
      .filter((p) => !api.state.people.has(p.id) && ageOn(p, date) >= 18)
      .map((p) => ({ id: p.id, traits: p.traits, birthDate: p.birthDate })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  // The pollster is paid per completed interview, from the campaign's money.
  const perInterview = campaignParameter("pollCostPerInterviewMinor");
  const available = core.cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? campaign.raisedMinor - campaign.spentMinor
    : 0;
  const affordable = Math.min(
    input.sampleSize,
    Math.floor(available / Math.max(1, perInterview)),
  );
  const offset =
    (table(api, "polls").query("byContest", [campaign.contestId]).length *
      input.sampleSize) %
    Math.max(1, frame.length);
  const dialed = [...frame.slice(offset), ...frame.slice(0, offset)];
  // Most people called don't take a poll; who does is who'd answer a stranger.
  const respondents: (typeof frame)[number][] = [];
  for (const person of dialed) {
    if (respondents.length >= affordable) break;
    const willing =
      (person.traits["people-mind-v1:sociability"] ?? 0) +
      (person.traits["people-mind-v1:reliability"] ?? 0) / 2 +
      (ageOn(person, date) - campaignParameter("doorAnswerPivotAge")) /
        campaignParameter("doorAnswerAgeSpan");
    if (willing > campaignParameter("pollAnswerThreshold"))
      respondents.push(person);
  }
  const answers: Record<string, number> = {};
  const lean0 = townRow(api).lean;
  const filings = ballot(api, campaign.contestId);
  for (const person of respondents) {
    const impressions = (
      table(api, "impressions").query("byVoter", [
        person.id,
      ]) as unknown as ImpressionRow[]
    )
      .filter((i) => i.contestId === campaign.contestId && i.heardOf)
      .sort((a, b) => b.warmth - a.warmth);
    const best = impressions[0];
    // Someone no campaign reached names their party's candidate if they
    // hold a party view, else they're undecided.
    const lean = personLean(api.state.people, person, lean0);
    const partyPick =
      Math.abs(lean) >= campaignParameter("pollPartyCue")
        ? filings.find((f) => partySide(f.party ?? null) === Math.sign(lean))
        : undefined;
    const answer =
      best && best.warmth > 0
        ? (person.traits["people-mind-v1:conflict"] ?? 0) < 0
          ? "no-opinion"
          : best.candidateId
        : (partyPick?.personId ?? "undecided");
    answers[answer] = (answers[answer] ?? 0) + 1;
  }
  const n = respondents.length;
  const lead = Math.max(
    0,
    ...Object.entries(answers)
      .filter(([k]) => k !== "undecided" && k !== "no-opinion")
      .map(([, v]) => v),
  );
  const share = n ? lead / n : 0;
  const poll: PollRow = {
    id: `poll:${campaign.id}:${date}:${offset}`,
    campaignId: campaign.id,
    contestId: campaign.contestId,
    date,
    contacted: n,
    answers,
    marginOfError: n
      ? Math.round(
          1.96 *
            Math.sqrt((Math.max(share, 0.5) * (1 - Math.max(share, 0.5))) / n) *
            1000,
        ) / 1000
      : null,
    respondentIds: respondents.map((p) => p.id),
  };
  // An empty poll isn't a poll: nothing is paid or kept.
  if (n === 0) return poll;
  postMoney(
    api,
    AD_KIND,
    `poll:${input.filingId}:${date}:${campaign.spentMinor}`,
    campaign.organizationId,
    pollster(api),
    n * perInterview,
    "Poll interviews",
    false,
  );
  save(api, {
    ...campaignFor(api, input.filingId),
    spentMinor: campaign.spentMinor + n * perInterview,
  });
  table(api, "polls").put(poll as unknown as ModuleRow);
  return poll;
}

/** Why one person feels as they do about a candidate: every recorded cause, oldest first. */
export function causesFor(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
): readonly CauseRow[] {
  return (
    table(api, "causes").query("byVoter", [voterId]) as unknown as CauseRow[]
  )
    .filter((c) => c.candidateId === candidateId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * A rival's campaign day: candidates other than the controlled person knock
 * doors for the hours their own day leaves free (no job: an evening and a
 * weekend's worth; a job: one evening), with their volunteers.
 */
export function rivalCampaignDay(
  api: CoreAPI,
  contestId: string,
  exceptPersonId: string | null,
): number {
  let reached = 0;
  for (const filing of (
    elections(api, "filings").query("byContest", [
      contestId,
    ]) as unknown as FilingRow[]
  ).filter((f) => f.status === "on-ballot")) {
    const campaign = campaignFor(api, filing.id);
    if (campaign.candidateId === exceptPersonId) continue;
    const candidate = api.state.people.get(campaign.candidateId);
    if (!candidate?.alive) continue;
    const hours = candidate.jobId
      ? campaignParameter("rivalHoursWithJob")
      : campaignParameter("rivalHoursWithoutJob");
    reached += knockDoors(api, {
      filingId: campaign.filingId,
      canvasserId: campaign.candidateId,
      hours,
    }).length;
  }
  return reached;
}

export type { ContestRow };
