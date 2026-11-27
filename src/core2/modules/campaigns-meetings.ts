/**
 * Donor meetings and the speeches given at them.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { closenessBetween, ENCOUNTERS } from "./people";
import {
  decisionLean,
  decisionTraitWeight,
  leanedYes,
} from "../trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter, type Stance } from "../campaign-data";
import { PARTIES_MODULE_ID, partiesHere, type TieRow } from "./parties";
import { deliverSpeech, SPEECH_MODULE_ID } from "./people";
import {
  atLargeGroup,
  ballot,
  petitionCirculating,
  type ContestRow,
} from "./elections";
import {
  ageOn,
  campaignFor,
  clamp,
  elections,
  impressionOf,
  rivalFiling,
  save,
  table,
  townRow,
} from "./campaigns-base";
import type {
  CampaignAct,
  CampaignRow,
  CauseRow,
  ImpressionRow,
} from "./campaigns-base";
import { causeSourceId, rapport, reach, retell } from "./campaigns-doors";
import { donationAnswer, filingOf } from "./campaigns-money";
import type { DonationWhy } from "./campaigns-money";
import { askToSign, backingReasons } from "./campaigns-petitions";

/**
 * Everyone a campaign can reach without canvassing a stranger, through the
 * records that link them: the candidate's family, the people they know and
 * have a relationship with, the members of their party in town, the people
 * the campaign has already reached, and its volunteers, never a rival on the
 * same ballot. In id order.
 */
export function reachablePeople(
  api: CoreAPI,
  campaign: CampaignRow,
): readonly string[] {
  const ids = new Set<string>(campaign.volunteerIds);
  const candidate = api.state.people.get(campaign.candidateId);
  if (candidate) for (const id of circleOf(api, candidate)) ids.add(id);
  const label = filingOf(api, campaign.filingId)?.party ?? null;
  if (label && api.state.modules.has(PARTIES_MODULE_ID)) {
    const party = partiesHere(api).find(
      (p) => p.name.toLowerCase() === label.toLowerCase(),
    );
    if (party)
      for (const tie of api
        .moduleState(PARTIES_MODULE_ID)
        .table("ties")
        .query("byParty", [party.id]) as unknown as TieRow[])
        ids.add(tie.personId);
  }
  for (const row of table(api, "impressions").query("byCandidate", [
    campaign.candidateId,
  ]) as unknown as ImpressionRow[])
    if (row.heardOf) ids.add(row.voterId);
  ids.delete(campaign.candidateId);
  // Someone standing in the same race campaigns for themselves
  // (`rivalFiling`), so no campaign's list reaches them, nor the people they
  // live with, who back their run: not to ask for money, nor to enlist. The
  // race is the contest and, for at-large seats up the same day (one race the
  // voting engine counts together), its sibling seats; only standing filings
  // count, and other offices on the same day's ballot are other races.
  const contest = elections(api, "contests").get(campaign.contestId) as
    ContestRow | undefined;
  for (const seat of contest
    ? atLargeGroup(api, contest)
    : [{ id: campaign.contestId }])
    for (const f of ballot(api, seat.id)) {
      if (f.personId === campaign.candidateId) continue;
      ids.delete(f.personId);
      const home = api.state.people.get(f.personId)?.householdId;
      if (home && home !== candidate?.householdId)
        for (const member of api.state.households.get(home)?.memberIds ?? [])
          ids.delete(member);
    }
  return [...ids].sort();
}

/**
 * A person's own circle, as the records link them: their family, the people
 * they know and anyone they keep a relationship with.
 */
export function circleOf(
  api: CoreAPI,
  person: Readonly<PersonState>,
): ReadonlySet<string> {
  const ids = new Set<string>([...person.familyIds, ...person.knownIds]);
  for (const rel of api.state.relationshipsByPerson.get(person.id) ?? []) {
    const row = api.state.relationships.get(rel);
    if (row) ids.add(row.actorId === person.id ? row.otherId : row.actorId);
  }
  return ids;
}

/**
 * Who comes to a candidate's event: of the people the campaign can reach who
 * live in town, each adult whose own reasons to back the candidate (warmth,
 * agreement, party, how they stand with the candidate) and every trait's
 * lean toward attending outweigh the hours their work already takes. The
 * campaign's volunteers come. A rival standing in the same race gives their
 * evenings to their own run (`rivalFiling`) and does not come.
 */
export function whoComes(
  api: CoreAPI,
  campaign: CampaignRow,
): readonly string[] {
  const adultAge = api.parameter("votingAge");
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const volunteers = new Set(campaign.volunteerIds);
  return reachablePeople(api, campaign).filter((id) => {
    const person = core.people.get(id);
    if (!person?.alive || person.placeId !== town) return false;
    if (ageOn(person, api.state.date) < adultAge) return false;
    if (rivalFiling(api, campaign, id)) return false;
    return volunteers.has(id) || comes(api, campaign, person, 0);
  });
}

/**
 * Whether an adult comes to a candidate's evening: their own reasons to back
 * the candidate (warmth, agreement, party, how they stand with the
 * candidate), the pull of whoever invited them (`invitation`, zero for a
 * public event) and every trait's lean toward attending, against the hours
 * their work already takes.
 */
function comes(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
  invitation: number,
): boolean {
  return leanedYes(
    api.state,
    person,
    "parties.attend",
    "attend",
    "stay-home",
    eveningReason(api, campaign, person, invitation),
  );
}

/**
 * An adult's reasons to give a candidate an evening, before personality:
 * their reasons to back the candidate (warmth, agreement, party, how they
 * stand with the candidate) and an invitation's pull, less the hours their
 * work already takes. A read: nothing is asked or kept (`comes` and a donor
 * meeting's host settle it with their trait lean).
 */
export function eveningReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
  invitation: number,
): number {
  const core = api.state as CoreState;
  const why = backingReasons(api, campaign, person);
  const weeklyWork = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((c) => core.work.commitments.get(c)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  return (
    why.warmth +
    why.agreement +
    campaignParameter("donorPartyWeight") * why.party +
    campaignParameter("donorRelationshipWeight") * why.relationship +
    invitation -
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes")
  );
}

/** Someone a donor meeting could seat or ask: a living, filled-in adult in town who is neither the candidate, the controlled person nor a rival standing in the same race (`rivalFiling`). */
function canJoinDonorMeeting(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState> | undefined,
): person is PersonState {
  return (
    !!person?.alive &&
    person.tier !== "husk" &&
    person.placeId === townRow(api).townPlaceId &&
    person.id !== campaign.candidateId &&
    // The controlled person's home and money move only by their own choice.
    person.id !== (api.state as CoreState).playerId &&
    ageOn(person, api.state.date) >= api.parameter("votingAge") &&
    !rivalFiling(api, campaign, person.id)
  );
}

/** The trait decision a donor meeting's host settles: giving a campaign their time. */
const HOST_DECISION = {
  id: "campaigns.volunteer",
  yes: "volunteer",
  no: "decline",
} as const;

/**
 * A possible host's reasons to lend their home for an evening, read without
 * keeping anything: their reasons to give the candidate an evening (warmth,
 * agreement with the platform, party, how they stand with the candidate,
 * against the hours their work takes, as a guest's are) plus their trait lean
 * toward giving a campaign their time times the decision's calibrated weight
 * (`decisionLean` times `decisionTraitWeight`, the trait-decisions module's
 * pure read). The same sum `leanedYes` settles when the host is asked in
 * `holdDonorMeeting`; reading it here saves no `person.weighed` record, so the
 * day's choices name a host without recording a decision nobody was asked.
 */
function hostScore(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  return (
    eveningReason(api, campaign, person, 0) +
    decisionLean(
      api.state,
      person,
      HOST_DECISION.id,
      HOST_DECISION.yes,
      HOST_DECISION.no,
    ) *
      decisionTraitWeight(api.state, HOST_DECISION.id)
  );
}

/**
 * Who would host a donor meeting (a house party for the candidate): of the
 * candidate's own circle in town (family, the people they know, anyone they
 * keep a relationship with) who have not hosted for this campaign yet, the
 * warmest backer by `hostScore`. A read: nobody is asked here and nothing is
 * kept; the host's own yes is weighed and recorded once, when the meeting is
 * held (`holdDonorMeeting`). Null when nobody's reasons are above zero. Ties
 * go to the lower id.
 */
export function donorMeetingHost(
  api: CoreAPI,
  campaign: CampaignRow,
): string | null {
  const candidate = api.state.people.get(campaign.candidateId);
  if (!candidate?.alive) return null;
  const hosted = new Set(campaign.donorMeetingHostIds ?? []);
  const zero = api.parameter("zero");
  let best: { id: string; score: number } | null = null;
  for (const id of circleOf(api, candidate)) {
    if (hosted.has(id)) continue;
    const person = api.state.people.get(id);
    if (!canJoinDonorMeeting(api, campaign, person)) continue;
    const score = hostScore(api, campaign, person);
    if (
      score > zero &&
      (!best || score > best.score || (score === best.score && id < best.id))
    )
      best = { id, score };
  }
  return best?.id ?? null;
}

/**
 * The adults of a donor meeting host's own circle in town (family, the people
 * they know, anyone they keep a relationship with) who could come, the
 * closest first (family before anyone).
 */
export function hostCircle(
  api: CoreAPI,
  campaign: CampaignRow,
  hostId: string,
): readonly string[] {
  const host = api.state.people.get(hostId);
  if (!host?.alive) return [];
  return [...circleOf(api, host)]
    .filter((id) => id !== hostId)
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => canJoinDonorMeeting(api, campaign, p))
    .map((p) => ({ id: p.id, tie: hostTie(api, host, p) }))
    .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))
    .map((row) => row.id);
}

/**
 * Who a donor meeting invites: the host's own circle first (`hostCircle`),
 * then the campaign's own list (everyone it can reach, the warmest first), as
 * a house party's list is built from the host's friends and the campaign's
 * contacts; as many as one party's list holds (`donorMeetingInvitesMax`).
 */
export function donorMeetingInvitees(
  api: CoreAPI,
  campaign: CampaignRow,
  hostId: string,
): readonly string[] {
  const own = hostCircle(api, campaign, hostId);
  if (!api.state.people.get(hostId)?.alive) return [];
  const listed = new Set([hostId, ...own]);
  const list = reachablePeople(api, campaign)
    .filter((id) => !listed.has(id))
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => canJoinDonorMeeting(api, campaign, p))
    .map((p) => ({
      id: p.id,
      warmth: impressionOf(api, p.id, campaign.candidateId)?.warmth ?? 0,
    }))
    .sort((a, b) => b.warmth - a.warmth || a.id.localeCompare(b.id))
    .map((row) => row.id);
  return [...own, ...list].slice(
    0,
    campaignParameter("donorMeetingInvitesMax"),
  );
}

/** How a guest stands with the host who invited them: 1 for family, else their closeness. */
const hostTie = (
  api: CoreAPI,
  host: Readonly<PersonState>,
  guest: Readonly<PersonState>,
) =>
  guest.familyIds.has(host.id)
    ? 1
    : clamp(closenessBetween(api.state, guest.id, host.id));

/** What a donor meeting did: who hosted, who was invited and came, what each said to the ask. */
export interface DonorMeetingResult {
  /** The meeting's event id (`campaign-donor-meeting:...`) in the durable log. */
  readonly id: string;
  readonly hostId: string;
  readonly invitedIds: readonly string[];
  /** The guests who came, the host not counted. */
  readonly guestIds: readonly string[];
  /** What hearing the candidate in the room made of each person there. */
  readonly causes: readonly CauseRow[];
  /** Each person in the room asked for money (the host first), with what they gave or why not. */
  readonly answers: readonly {
    readonly personId: string;
    readonly givenMinor: number;
    readonly why: DonationWhy;
  }[];
  readonly raisedMinor: number;
}

/** What a campaign has said so far, one row a filing (`nextTopic`): every act's question counted, and each kind of act's own. */
interface EmphasisRow {
  readonly id: string;
  readonly counts: Readonly<Record<string, number>>;
  readonly byKind: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/**
 * The question a campaign's next act is about (every act carrying the lead alone
 * replaced): the platform question furthest behind its share of what the
 * campaign has said so far, this act counted, taking its place in the whole
 * and in its own kind of act (an ad, a mailer, a night of doors, an event or
 * donor meeting's speech), so an evening of doors is not always about the
 * question the ads never reach. Each question's share is its platform score's
 * (`platformShares`), so the question the town backs most at the candidate's
 * conviction is spoken of most, and the others in their turns; ties go to the
 * platform's order. No roll: the same record gives the same question. The
 * count is the filing's `emphasis` row, kept for an act that is taken and not
 * for one that reached nobody. Undefined for a platform that takes no side.
 */
export function nextTopic(
  api: CoreAPI,
  campaign: CampaignRow,
  kind: string,
): Stance | undefined {
  const sides = campaign.platform.filter((s) => s.position !== 0);
  if (!sides.length) return undefined;
  const emphasis = table(api, "emphasis");
  const row = emphasis.get(campaign.filingId) as unknown as
    EmphasisRow | undefined;
  const all = row?.counts ?? {};
  const own = row?.byKind[kind] ?? {};
  const sum = (c: Readonly<Record<string, number>>) =>
    Object.values(c).reduce((t, n) => t + n, 0) + 1;
  const allTotal = sum(all);
  const ownTotal = sum(own);
  const equal = 1 / sides.length;
  let pick = sides[0]!;
  let behind = -Infinity;
  for (const stance of sides) {
    const share = campaign.platformShares?.[stance.question] ?? equal;
    const gap =
      share * allTotal -
      (all[stance.question] ?? 0) +
      (share * ownTotal - (own[stance.question] ?? 0));
    if (gap > behind) {
      behind = gap;
      pick = stance;
    }
  }
  const bump = (c: Readonly<Record<string, number>>) => ({
    ...c,
    [pick.question]: (c[pick.question] ?? 0) + 1,
  });
  emphasis.put({
    id: campaign.filingId,
    counts: bump(all),
    byKind: { ...(row?.byKind ?? {}), [kind]: bump(own) },
  } as unknown as ModuleRow);
  return pick;
}

/**
 * A donor meeting: a house party at a supporter's home. The host
 * (`donorMeetingHost`) gives their evening and invites their own circle and
 * the campaign's list (`donorMeetingInvitees`); each guest comes by the same
 * rule as a candidate's event (`comes`), with their tie to the host as the
 * invitation's pull (`donorMeetingHostTieWeight`), and the campaign's
 * volunteers come. The candidate meets everyone there they did not know (the
 * encounter engine's meeting, at the host's home), speaks to the room on
 * the question it is next behind on (`nextTopic`: a face-to-face
 * speech, heard and retold as one), and the evening ends by asking each person there, the
 * host first, through `donationAnswer`: the gift rows, the journal and the
 * public `campaign-gift` record follow from it. No venue is paid; the host's
 * hours are recorded. While the petition circulates, the room is asked to
 * sign. Null when the candidate or the host cannot be there.
 */
export function holdDonorMeeting(
  api: CoreAPI,
  filingId: string,
  hostId: string,
): DonorMeetingResult | null {
  const campaign = campaignFor(api, filingId);
  const candidate = api.state.people.get(campaign.candidateId);
  const host = api.state.people.get(hostId);
  if (!candidate?.alive || !canJoinDonorMeeting(api, campaign, host))
    return null;
  // The host is asked here, once: lending their home is their own yes, the
  // one decision on record (a `person.weighed` row where they are in focus),
  // on the same sum `donorMeetingHost` read without keeping it.
  if (
    (campaign.donorMeetingHostIds ?? []).includes(hostId) ||
    !leanedYes(
      api.state,
      host,
      HOST_DECISION.id,
      HOST_DECISION.yes,
      HOST_DECISION.no,
      eveningReason(api, campaign, host, 0),
    )
  )
    return null;
  const date = api.state.date;
  const invitedIds = donorMeetingInvitees(api, campaign, hostId);
  const pull = campaignParameter("donorMeetingHostTieWeight");
  const volunteers = new Set(campaign.volunteerIds);
  const guestIds = invitedIds.filter((id) => {
    const guest = api.state.people.get(id)!;
    return (
      volunteers.has(id) ||
      comes(api, campaign, guest, pull * hostTie(api, host, guest))
    );
  });
  const room = [hostId, ...guestIds];
  const id = `campaign-donor-meeting:${filingId}:${date}:${hostId}`;
  // The candidate meets everyone in the room they did not know, at the
  // host's home: the evening's hours shared among them.
  const hours = campaignParameter("playerDonorMeetingHours");
  for (const personId of room)
    if (!candidate.knownIds.has(personId))
      api.meet(candidate.id, personId, {
        placeId: host.householdId,
        sourceId: id,
        cause: ENCOUNTERS.causes.metOnVisit,
        hours: hours / room.length,
      });
  const topic = nextTopic(api, campaign, "speech");
  const venue = `home:${host.householdId}`;
  const causes = makeStatements(api, {
    filingId,
    venue,
    statements: topic ? [topic] : [],
    audienceIds: room,
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
  api.recordActivityTime(
    hostId,
    "campaign",
    campaignParameter("donorMeetingHostHours") * 60,
    {
      tag: "SOURCED",
      citation: `Campaign ${campaign.id} donor meeting at ${venue}`,
      asOf: date,
    },
  );
  if (petitionCirculating(api, filingId))
    for (const personId of room)
      askToSign(api, filingId, api.state.people.get(personId)!, "event");
  const answers = room.map((personId) => ({
    personId,
    ...donationAnswer(api, filingId, personId),
  }));
  const raisedMinor = answers.reduce((t, a) => t + a.givenMinor, 0);
  const latest = campaignFor(api, filingId);
  save(api, {
    ...latest,
    donorMeetingHostIds: [...(latest.donorMeetingHostIds ?? []), hostId],
  });
  const donorIds = answers
    .filter((a) => a.givenMinor > 0)
    .map((a) => a.personId);
  api.emit({
    id,
    date,
    kind: "campaign-donor-meeting",
    personIds: [campaign.candidateId, hostId],
    witnessIds: guestIds,
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Campaign ${campaign.id} donor meeting at ${venue}`,
      asOf: date,
    },
    facts: {
      filingId,
      contestId: campaign.contestId,
      candidateId: campaign.candidateId,
      hostId,
      householdId: host.householdId,
      invited: String(invitedIds.length),
      came: String(guestIds.length),
      gave: String(donorIds.length),
      raisedMinor: String(raisedMinor),
      donorIds: donorIds.join(","),
      ...(topic
        ? {
            speechId: statementSpeechId(campaign.candidateId, date, {
              act: "speech",
              venue,
            }),
          }
        : {}),
    },
  });
  return { id, hostId, invitedIds, guestIds, causes, answers, raisedMinor };
}

/**
 * Give a speech. The audience is who chooses to come (`whoComes`); each
 * hears the platform, decides for themselves and tells their family. Every
 * statement is recorded as a promise.
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
  return makeStatements(api, {
    ...input,
    audienceIds: whoComes(api, campaign),
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
  // A state or federal candidate who isn't a full person has no rapport to read.
  const speaker = api.state.people.get(campaign.candidateId);
  const causes: CauseRow[] = [];
  // One entry per question: a stance on a question already in the platform
  // updates it.
  const said = new Map(input.statements.map((st) => [st.question, st]));
  const withStatements = {
    ...campaign,
    platform: [
      ...campaign.platform.map((st) => said.get(st.question) ?? st),
      ...[...said.values()].filter(
        (st) => !campaign.platform.some((p) => p.question === st.question),
      ),
    ],
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
        rapport:
          input.faceToFace && speaker ? rapport(speaker, listener) / 2 : 0,
      },
    );
    if (!cause) continue;
    causes.push(cause);
    retell(api, withStatements, listener, cause);
  }
  for (const stance of said.values()) {
    // Its own record: who, when, how, where and on which question.
    const promiseId = `promise:${campaign.candidateId}:${api.state.date}:${input.act}:${input.venue}:${stance.question}`;
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
        sourceId: causeSourceId(api, cause),
        access: input.faceToFace ? "perceived" : "public",
      });
  }
  save(api, {
    ...campaignFor(api, input.filingId),
    platform: withStatements.platform,
  });
  // In person (a speech, a town hall) and in a debate (owner, Oct 14: the
  // audience's views move by the same read as a speech), a candidate who is
  // a person is heard as a speaker on each statement's question: the speech
  // engine moves those who heard it by the candidate's standing with them
  // and lets them retell it at home. Interviews reach their readers and
  // viewers through the causes above.
  if (
    (input.faceToFace || input.act === "debate") &&
    speaker &&
    api.state.modules.has(SPEECH_MODULE_ID)
  ) {
    const audienceIds = [...new Set(causes.map((c) => c.voterId))].filter(
      (id) => id !== speaker.id && api.state.people.get(id)?.alive,
    );
    input.statements.forEach((statement, index) =>
      deliverSpeech(api, {
        id:
          statementSpeechId(campaign.candidateId, api.state.date, input) +
          (index ? `:${index}` : ""),
        speakerId: speaker.id,
        placeId: speaker.placeId,
        topic: statement.question,
        desiredChange: statement.position > 0 ? "enact" : "repeal",
        audienceIds,
        groupUnwatched: true,
        // The statement's own promise record: who, when, how, where, which question.
        occasion: {
          recordId: `promise:${campaign.candidateId}:${api.state.date}:${input.act}:${input.venue}:${statement.question}`,
          kind: input.act,
        },
      }),
    );
  }
  return causes;
}

/** The speech a candidate's statements make, by who, when, how and where. */
export function statementSpeechId(
  candidateId: string,
  date: string,
  input: { readonly act: string; readonly venue: string },
): string {
  return `${statementSpeechPrefix(candidateId, date)}${input.act}:${input.venue}`;
}

/** What every speech a candidate's statements make on a day begins with: a scene tells a campaign speech from another speech by it. */
export function statementSpeechPrefix(
  candidateId: string,
  date: string,
): string {
  return `speech:${candidateId}:${date}:`;
}
