/**
 * Groups, endorsements and how outlets and groups weigh a race.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { closenessBetween } from "./people";
import { feelingBetween } from "../closeness";
import { leanedScore } from "../trait-decisions";
import type {
  CoreAPI,
  CoreEventInput,
  PersonId,
  CoreState,
  PersonState,
} from "../types";
import type { ModuleRow } from "../module-data";
import { addDays, makeIsoDate } from "../kernel/dates";
import { personLean } from "../campaign-views";
import {
  campaignParameter,
  PLATFORM_QUESTIONS,
  type Stance,
} from "../campaign-data";
import { partyPosition } from "../campaign-stances";
import { PARTIES_MODULE_ID, partiesHere, partyMemberIds } from "./parties";
import {
  INTEREST_GROUPS_MODULE_ID,
  groupStance,
  groupsHere,
} from "./interest-groups";
import { ownerOf } from "./business";
import { agreementWith, viewOn } from "./views";
import {
  obligationsOwedBetween,
  obligationsOwedTo,
  refuseObligation,
  settleObligation,
} from "./legislature";
import { ACCEPTING_MOVES, REFUSING_MOVES } from "./press";
import { ballot, type ContestRow } from "./elections";
import {
  ageOn,
  campaignFor,
  causeGroupsIn,
  clamp,
  elections,
  promisesOf,
  rivalFiling,
  table,
  townRow,
  votesCast,
} from "./campaigns-base";
import type {
  CampaignRow,
  EndorsementReason,
  EndorsementRow,
  OrganizedGroup,
} from "./campaigns-base";
import { reach } from "./campaigns-doors";
import { askToVolunteer, castVolunteer } from "./campaigns-volunteers";

/**
 * The organizations in a place that can back a candidate, read-only, from
 * the engines that keep them: the interest-groups engine's groups (a
 * residents' group's question and side, an employers' group against the
 * policy that binds it), the drives engine's cause groups (the topic its
 * founder's drive wants changed) and each party's chapter (the party's
 * position on every question, its chair speaking). Members are the full
 * people who belong and live in the place. Nothing is written.
 */
export function organizedGroupsIn(
  api: CoreAPI,
  placeId: string,
): readonly OrganizedGroup[] {
  const core = api.state as CoreState;
  const living = (id: string) => {
    const person = core.people.get(id);
    return !!person?.alive && person.placeId === placeId;
  };
  const out: OrganizedGroup[] = [];
  if (core.modules.has(INTEREST_GROUPS_MODULE_ID))
    for (const group of groupsHere(api)) {
      if (core.organizations.get(group.organizationId)?.placeId !== placeId)
        continue;
      // An employers' group's people are the owners of the businesses in it.
      const people = group.memberPersonIds ?? [
        ...new Set(
          group.memberOrganizationIds.flatMap((id) => ownerOf(api, id) ?? []),
        ),
      ];
      out.push({
        organizationId: group.organizationId,
        kind: "interest-group",
        speakerId: group.lobbyistId,
        memberIds: people.filter(living).sort(),
        stance: groupStance(group),
      });
    }
  for (const group of causeGroupsIn(api, placeId)) {
    const memberIds = group.memberIds.filter(living);
    out.push({
      organizationId: group.organizationId,
      kind: "cause-group",
      // Its founder speaks for it while they belong; else its longest-standing member.
      speakerId:
        group.founderId && memberIds.includes(group.founderId)
          ? group.founderId
          : (memberIds[0] ?? null),
      memberIds,
      stance: [
        {
          question: group.topic,
          position: group.desiredChange === "repeal" ? -1 : 1,
        },
      ],
    });
  }
  if (core.modules.has(PARTIES_MODULE_ID))
    for (const party of partiesHere(api)) {
      if (core.organizations.get(party.organizationId)?.placeId !== placeId)
        continue;
      out.push({
        organizationId: party.organizationId,
        kind: "party-chapter",
        speakerId: party.leaderId,
        memberIds: partyMemberIds(api, party.id).filter(living).sort(),
        stance: PLATFORM_QUESTIONS.flatMap((question) => {
          const position = partyPosition(api, party.name, question);
          return position ? [{ question, position }] : [];
        }),
      });
    }
  return out;
}

/**
 * How far a stance agrees with a platform, the question it disagrees with
 * most, the holder's own stance on the question it agrees with most, and how
 * many of the platform's questions it takes a side on.
 */
interface PlatformRead {
  readonly agreement: number;
  readonly issue: string | null;
  /** The holder's own position on the question they agree on most, or null where they agree on none. */
  readonly agreesOn: Stance | null;
  readonly shared: number;
}

/**
 * Agreement of stated positions with a platform: the mean of position times
 * the platform's over the platform's questions the holder has a position on
 * (none in common, none either way), the question they disagree on most,
 * and the one they agree on most (the largest product above nothing, ties
 * to the lower question id) with their own position on it.
 */
function platformRead(
  platform: readonly Stance[],
  positionOn: (question: string) => number | undefined,
): PlatformRead {
  let sum = 0;
  let held = 0;
  let worst = 0;
  let issue: string | null = null;
  let best = 0;
  let agreesOn: Stance | null = null;
  for (const stance of platform) {
    const own = positionOn(stance.question);
    if (own === undefined) continue;
    const part = own * stance.position;
    sum += part;
    held += 1;
    if (part < worst) {
      worst = part;
      issue = stance.question;
    }
    if (
      part > 0 &&
      (part > best ||
        (part === best &&
          agreesOn !== null &&
          stance.question < agreesOn.question))
    ) {
      best = part;
      agreesOn = { question: stance.question, position: own };
    }
  }
  return {
    agreement: held ? clamp(sum / held) : 0,
    issue,
    agreesOn,
    shared: held,
  };
}

/** The campaigns of everyone standing in a contest who has filed by today. */
/**
 * The rival in a campaign's race whose record in office an attack ad could
 * show: the one with the most recorded votes and promises, other than the
 * candidate; none where no rival has a record.
 */
export function attackTarget(
  api: CoreAPI,
  campaign: CampaignRow,
): CampaignRow | undefined {
  let best: { row: CampaignRow; items: number } | undefined;
  for (const row of raceCampaigns(api, campaign.contestId)) {
    if (row.candidateId === campaign.candidateId) continue;
    const items =
      votesCast(api.state as CoreState, row.candidateId).length +
      promisesOf(api, row.candidateId).length;
    if (items > 0 && (!best || items > best.items)) best = { row, items };
  }
  return best?.row;
}

function raceCampaigns(api: CoreAPI, contestId: string): CampaignRow[] {
  return ballot(api, contestId)
    .filter((filing) => filing.filedOn <= api.state.date)
    .map((filing) => campaignFor(api, filing.id));
}

/** What weighing one candidate against the race came to (`weighEndorsement`). */
export interface EndorsementWeighing extends PlatformRead {
  /** A favor the endorser owed the candidate, weighed in and settled by a yes. */
  readonly obligationId?: string;
  readonly yes: boolean;
  readonly reason: EndorsementReason;
  readonly tie: number;
  readonly backing: number;
  readonly score: number;
  readonly rival: {
    readonly filingId: string;
    readonly backing: number;
  } | null;
}

/**
 * The one rule by which anyone gives an endorsement, a person a candidate
 * asks and a group's speaker alike: their backing of each candidate is how
 * far what they stand for agrees with the candidate's platform, plus their
 * tie to the candidate (`endorsementTieWeight`); their temperament toward
 * endorsing goes on top. They endorse this candidate only when that is
 * above nothing and no rival in the race draws as much backing; never for
 * a price. A group speaks only for its stance: it weighs a candidate only
 * when the platform takes up at least one of its questions (none in common:
 * it declines, and that candidate is no rival either), and it backs only a
 * candidate it agrees with, its speaker's tie adding to that agreement but
 * never standing in for it. A person may back a friend whose platform they
 * do not share; that yes is kept as the tie it is (`close-tie`). Someone
 * standing in the race backs their own run (`rivalFiling`): asked for
 * themselves or speaking for a group, they endorse no rival in it, their own
 * filing the rival they prefer.
 */
function weighEndorsement(
  api: CoreAPI,
  endorser: Readonly<PersonState>,
  campaign: CampaignRow,
  field: readonly CampaignRow[],
  agreementOf: (platform: readonly Stance[]) => PlatformRead,
  speaksFor: "self" | "group",
): EndorsementWeighing {
  const backingOf = (row: CampaignRow) => {
    const read = agreementOf(row.platform);
    const tie =
      row.candidateId === endorser.id
        ? 0
        : feelingBetween(api.state, endorser.id, row.candidateId);
    // A favor the endorser owes this candidate from a deal they took
    // (campaign-favor-called-in): worth what a favor is worth in the
    // legislature, more the closer they are; a person speaks for themselves.
    const owed =
      speaksFor === "self"
        ? obligationsOwedBetween(api, endorser.id, row.candidateId)[0]
        : undefined;
    const favor = owed
      ? campaignParameter("dealWeight") * (1 + Math.max(0, tie))
      : 0;
    return {
      ...read,
      tie,
      backing:
        read.agreement +
        campaignParameter("endorsementTieWeight") * tie +
        favor,
      ...(owed ? { obligationId: owed.id } : {}),
    };
  };
  const weighed = (read: PlatformRead) =>
    speaksFor === "self" || read.shared > 0;
  const mine = backingOf(campaign);
  const own = rivalFiling(api, campaign, endorser.id);
  if (own)
    return {
      ...mine,
      score: 0,
      rival: {
        filingId: own.id,
        backing: backingOf(campaignFor(api, own.id)).backing,
      },
      yes: false,
      reason: "prefers-rival",
    };
  if (!weighed(mine))
    return { ...mine, score: 0, rival: null, yes: false, reason: "declines" };
  const score = leanedScore(
    api.state,
    endorser,
    "campaigns.endorse",
    "endorse",
    "decline",
    mine.backing,
  );
  const rival =
    field
      .filter((row) => row.id !== campaign.id)
      .map((row) => ({ filingId: row.id, read: backingOf(row) }))
      .filter(({ read }) => weighed(read))
      .map(({ filingId, read }) => ({ filingId, backing: read.backing }))
      .sort(
        (a, b) => b.backing - a.backing || a.filingId.localeCompare(b.filingId),
      )[0] ?? null;
  const outdone = rival !== null && rival.backing >= mine.backing;
  const yes =
    score > 0 && !outdone && (speaksFor === "self" || mine.agreement > 0);
  return {
    ...mine,
    score,
    rival,
    yes,
    reason: yes
      ? mine.agreement > 0
        ? "agrees"
        : "close-tie"
      : rival !== null && outdone
        ? rival.backing > 0
          ? "prefers-rival"
          : "disagrees"
        : mine.agreement <= 0
          ? "disagrees"
          : "declines",
  };
}

/** A filing's endorsement answers: the people asked and the groups that backed it. */
export function endorsementsOf(
  api: CoreAPI,
  filingId: string,
): readonly EndorsementRow[] {
  return table(api, "endorsements").query("byFiling", [
    filingId,
  ]) as unknown as EndorsementRow[];
}

/**
 * Keep an endorsement answer, and when it is a yes, say it in public: the
 * core event the press, the scenes and the rival campaign read by its id.
 * A group's yes names the stance it stands on (stanceQuestion and
 * stancePosition), for the paper to say what a group with no name is for.
 */
function keepEndorsement(api: CoreAPI, row: EndorsementRow): void {
  table(api, "endorsements").put(row as unknown as ModuleRow);
  if (row.answer !== "yes") return;
  api.emit({
    id: `campaign-endorsed:${row.id}`,
    date: api.state.date,
    kind: "campaign-endorsed",
    personIds: [...new Set([row.candidateId, row.speakerId])].filter((id) =>
      api.state.people.has(id),
    ),
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `An endorsement of ${campaignFor(api, row.filingId).organizationId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    facts: {
      endorsementId: row.id,
      filingId: row.filingId,
      contestId: row.contestId,
      candidateId: row.candidateId,
      speakerId: row.speakerId,
      ...(row.organizationId ? { organizationId: row.organizationId } : {}),
      ...(row.stance
        ? {
            stanceQuestion: row.stance.question,
            stancePosition: String(row.stance.position),
          }
        : {}),
      agreement: String(row.agreement),
      tie: String(row.tie),
      score: String(row.score),
      reached: String(row.reached),
      volunteers: String(row.volunteerIds.length),
    },
  });
}

/** An endorsement's answer as its record, from the weighing that gave it. */
function endorsementRow(
  campaign: CampaignRow,
  date: string,
  input: {
    readonly id: string;
    readonly speakerId: string;
    readonly organizationId: string | null;
    readonly askerId: string | null;
    readonly weighing: EndorsementWeighing;
    readonly reached: number;
    readonly volunteerIds: readonly string[];
  },
): EndorsementRow {
  const w = input.weighing;
  return {
    id: input.id,
    filingId: campaign.id,
    contestId: campaign.contestId,
    candidateId: campaign.candidateId,
    date,
    speakerId: input.speakerId,
    organizationId: input.organizationId,
    askerId: input.askerId,
    answer: w.yes ? "yes" : "no",
    reason: w.reason,
    ...(w.obligationId ? { obligationId: w.obligationId } : {}),
    issue: w.issue,
    // A group speaks for its stance; a person's own word stands on no group's.
    stance: input.organizationId !== null ? w.agreesOn : null,
    rivalFilingId: w.rival?.filingId ?? null,
    agreement: w.agreement,
    tie: w.tie,
    backing: w.backing,
    rivalBacking: w.rival?.backing ?? null,
    score: w.score,
    reached: input.reached,
    volunteerIds: input.volunteerIds,
  };
}

/** Everyone who hears of an endorsement is moved toward the endorser's own backing. */
function endorsementHeard(
  api: CoreAPI,
  campaign: CampaignRow,
  speakerId: string,
  listenerIds: readonly string[],
  act: "endorsement" | "group-endorsement",
  score: number,
): number {
  let reached = 0;
  for (const id of new Set(listenerIds)) {
    if (!api.state.people.has(id)) continue;
    const cause = reach(api, campaign, id, act, speakerId, {
      carriesPlatform: true,
      weight: campaignParameter("endorsementWeight"),
      rapport: 0,
      target: clamp(score),
    });
    if (cause) reached += 1;
  }
  return reached;
}

/**
 * How someone asked for themselves weighs endorsing a campaign's candidate
 * today, by the one rule (`weighEndorsement`) against everyone standing in
 * its race, reading their own views: what `askForEndorsement` settles, with
 * no answer kept.
 */
export function endorsementWeighing(
  api: CoreAPI,
  campaign: CampaignRow,
  endorser: Readonly<PersonState>,
): EndorsementWeighing {
  const lean = personLean(api.state.people, endorser, townRow(api).lean);
  return weighEndorsement(
    api,
    endorser,
    campaign,
    raceCampaigns(api, campaign.contestId),
    (platform) => ({
      ...platformRead(platform, (question) =>
        viewOn(api, endorser.id, question, lean),
      ),
      agreement: agreementWith(api, endorser.id, lean, platform),
    }),
    "self",
  );
}

/**
 * Ask someone to endorse. They endorse only the candidate they back most
 * among those standing (`weighEndorsement`: their agreement with the
 * platform and their tie to the candidate), never for a price; everyone who
 * knows them hears it. Every answer is kept with its reason (a yes once
 * given stands; a no may be asked again as views move).
 */
export function askForEndorsement(
  api: CoreAPI,
  filingId: string,
  endorserId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const endorser = api.state.people.get(endorserId);
  if (!endorser?.alive) return false;
  const id = `endorsement:${filingId}:${endorserId}`;
  const held = table(api, "endorsements").get(id) as unknown as
    EndorsementRow | undefined;
  if (held?.answer === "yes") return true;
  const weighing = endorsementWeighing(api, campaign, endorser);
  const reached = weighing.yes
    ? endorsementHeard(
        api,
        campaign,
        endorserId,
        [...endorser.knownIds, ...endorser.familyIds],
        "endorsement",
        weighing.score,
      )
    : 0;
  keepEndorsement(
    api,
    endorsementRow(campaign, api.state.date, {
      id,
      speakerId: endorserId,
      organizationId: null,
      askerId: campaign.candidateId,
      weighing,
      reached,
      volunteerIds: [],
    }),
  );
  // A favor owed and weighed in is repaid by the endorsement.
  if (weighing.yes && weighing.obligationId)
    settleObligation(api, weighing.obligationId, id);
  return weighing.yes;
}

/** The kind of the event that asks the player to endorse a candidate: the scene's cause. */
export const ENDORSEMENT_ASKED_EVENT = "endorsement-asked";

/** A campaign asking the player to give it evenings (the record a `volunteer-ask` scene stages from). */
export const VOLUNTEER_ASKED_EVENT = "volunteer-asked";

/** The player's kept answer to one campaign's ask to volunteer. */
interface VolunteerAskRow {
  readonly id: string;
  readonly filingId: string;
  readonly candidateId: string;
  readonly personId: string;
  /** The day it was asked, or last asked again. */
  readonly date: string;
  readonly answer: "asked" | "yes" | "no";
}

/**
 * A campaign whose lists reach the player (their circle, their party, people who heard of the
 * candidate: `reachablePeople`) asks them to give it evenings, as it asks everyone it reaches
 * (`askToVolunteer`). No engine answers for the controlled person: the ask is kept as `asked` and a
 * scene puts it to them; their reply writes the yes or the no (`answerVolunteerAsk`). An ask put off
 * comes back after the offer spacing days until the race is decided; a no stands for the race. A player
 * under the volunteering age, or standing in the same race, is not asked.
 */
export function askPlayerToVolunteer(api: CoreAPI, filingId: string): void {
  const playerId = (api.state as CoreState).playerId;
  const player = playerId ? api.state.people.get(playerId) : undefined;
  if (!player?.alive) return;
  const campaign = campaignFor(api, filingId);
  if (campaign.volunteerIds.includes(player.id)) return;
  const date = api.state.date;
  if (
    ageOn(player, date) < campaignParameter("minimumVolunteerAge") ||
    rivalFiling(api, campaign, player.id)
  )
    return;
  const contest = elections(api, "contests").get(campaign.contestId) as
    ContestRow | undefined;
  if (!contest || contest.electionDate <= date) return;
  const id = `volunteer-ask:${filingId}:${player.id}`;
  const held = table(api, "volunteerAsks").get(id) as unknown as
    VolunteerAskRow | undefined;
  if (held && held.answer !== "asked") return;
  if (
    held &&
    held.date >
      addDays(makeIsoDate(date), -campaignParameter("offerSpacingDays"))
  )
    return;
  const row: VolunteerAskRow = {
    id,
    filingId,
    candidateId: campaign.candidateId,
    personId: player.id,
    date,
    answer: "asked",
  };
  table(api, "volunteerAsks").put(row as unknown as ModuleRow);
  const candidate = api.state.people.get(campaign.candidateId);
  api.emit({
    id: `${VOLUNTEER_ASKED_EVENT}:${id}:${date}`,
    date,
    kind: VOLUNTEER_ASKED_EVENT,
    personIds: candidate
      ? [candidate.id as PersonId, player.id as PersonId]
      : [player.id as PersonId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `The campaign of ${campaign.candidateId} asks the player to volunteer`,
      asOf: date,
    },
    facts: {
      askId: id,
      filingId,
      campaignId: campaign.id,
      contestId: campaign.contestId,
      candidateId: campaign.candidateId,
      askedId: player.id,
      office: contest.title ?? "",
      closeness:
        closenessBetween(api.state, player.id, campaign.candidateId) > 0
          ? "close"
          : "distant",
      ...(held ? { again: "yes" } : {}),
    },
  });
}

/**
 * The player's reply in the `volunteer-ask` scene: a yes is cast for them and the campaign takes them on
 * through its own ask (`askToVolunteer`, which keeps them on its volunteers and writes the
 * `campaign-volunteer-joined` record); a no stands for the race; a put-off keeps the ask open to come
 * back after the offer spacing days.
 */
export function answerVolunteerAsk(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "volunteer-ask") return;
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== VOLUNTEER_ASKED_EVENT) return;
  const held = table(api, "volunteerAsks").get(
    String(cause.facts?.askId ?? ""),
  ) as unknown as VolunteerAskRow | undefined;
  if (!held || held.answer === "yes") return;
  const move = String(facts.move);
  const yes = ACCEPTING_MOVES.has(move);
  if (!yes && !REFUSING_MOVES.has(move) && move !== "refuse") return;
  // A no said in this same scene may be given up on the press that follows it; any other no stands.
  if (held.answer === "no" && !(yes && held.date === api.state.date)) return;
  table(api, "volunteerAsks").put({
    ...held,
    date: api.state.date,
    answer: yes ? "yes" : "no",
  } as unknown as ModuleRow);
  if (!yes) return;
  castVolunteer(api, held.filingId, held.personId, true);
  askToVolunteer(api, held.filingId, held.personId);
}

/**
 * A candidate's campaign asks the player to endorse them (the player is one
 * of the closest people it asks, or owes the candidate a favor from a deal).
 * No engine answers for the controlled person: the ask is kept on the same
 * endorsement row as `asked`, carrying the asker's own reasons (the weighing
 * as it stands today) and any favor named, and a scene puts it to the
 * player; their reply writes the yes or the no (`answerEndorsementAsk`).
 * An ask put off comes back after the offer spacing days, as a new scene,
 * until the race is decided; a player who is a rival in the race is not asked.
 */
export function askPlayerForEndorsement(
  api: CoreAPI,
  filingId: string,
  calledIn?: string,
  renew = false,
): void {
  const playerId = (api.state as CoreState).playerId;
  const player = playerId ? api.state.people.get(playerId) : undefined;
  if (!player?.alive) return;
  const campaign = campaignFor(api, filingId);
  // The favor behind the ask, when the player owes the candidate one: the
  // deal named by the loop that calls it in, else the first they still owe.
  const obligationId =
    calledIn ??
    obligationsOwedBetween(api, player.id, campaign.candidateId)[0]?.id;
  const id = `endorsement:${filingId}:${player.id}`;
  const held = table(api, "endorsements").get(id) as unknown as
    EndorsementRow | undefined;
  if (renew && held?.answer !== "asked") return;
  if (held && held.answer !== "asked") return;
  if (rivalFiling(api, campaign, player.id)) return;
  const date = api.state.date;
  if (held) {
    // Put off: it comes back once the spacing has passed, and a favor
    // named later is added to the same ask.
    const due =
      held.date <=
      addDays(makeIsoDate(date), -campaignParameter("offerSpacingDays"));
    if (!due && !(obligationId && !held.obligationId)) return;
    if (!due) {
      table(api, "endorsements").put({
        ...held,
        obligationId,
      } as unknown as ModuleRow);
      return;
    }
  } else if (renew) return;
  const weighing = endorsementWeighing(api, campaign, player);
  const base = endorsementRow(campaign, date, {
    id,
    speakerId: player.id,
    organizationId: null,
    askerId: campaign.candidateId,
    weighing,
    reached: 0,
    volunteerIds: [],
  });
  const row: EndorsementRow = {
    ...base,
    answer: "asked",
    ...((obligationId ?? held?.obligationId)
      ? { obligationId: obligationId ?? held?.obligationId }
      : {}),
  };
  table(api, "endorsements").put(row as unknown as ModuleRow);
  const contest = elections(api, "contests").get(campaign.contestId) as
    ContestRow | undefined;
  api.emit({
    id: `${ENDORSEMENT_ASKED_EVENT}:${id}:${date}`,
    date,
    kind: ENDORSEMENT_ASKED_EVENT,
    personIds: [campaign.candidateId, player.id],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `The campaign of ${campaignFor(api, filingId).candidateId} asks the player to endorse them`,
      asOf: date,
    },
    facts: {
      endorsementId: id,
      filingId,
      contestId: campaign.contestId,
      candidateId: campaign.candidateId,
      askedId: player.id,
      contestTitle: contest?.title ?? "",
      office: contest?.title ?? "",
      reason: row.reason,
      // What the asker can give reasons from, each only where a record holds
      // it: the deal behind a favor (its bill), how close the two are (kin or
      // one household, else not), a word the player already gave another
      // candidate in the race, and that this is the second asking.
      ...(row.obligationId
        ? {
            obligationId: row.obligationId,
            ...(billOfObligation(api, campaign.candidateId, row.obligationId)
              ? {
                  billId: billOfObligation(
                    api,
                    campaign.candidateId,
                    row.obligationId,
                  ),
                }
              : {}),
          }
        : {}),
      closeness:
        player.familyIds.has(campaign.candidateId) ||
        player.householdId ===
          api.state.people.get(campaign.candidateId)?.householdId
          ? "close"
          : "distant",
      ...(givenAnother(api, campaign.contestId, campaign.candidateId, player.id)
        ? { endorsedAnother: "yes" }
        : {}),
      ...(held ? { again: "yes" } : {}),
    },
  });
}

/** The bill a favor was owed over: the deal's own bill, from the obligation row. */
function billOfObligation(
  api: CoreAPI,
  candidateId: string,
  obligationId: string,
): string {
  return (
    obligationsOwedTo(api, candidateId).find((o) => o.id === obligationId)
      ?.billId ?? ""
  );
}

/** Whether the person already gave their word to another candidate in this race. */
function givenAnother(
  api: CoreAPI,
  contestId: string,
  candidateId: string,
  personId: string,
): boolean {
  return (
    table(api, "endorsements").query("byContest", [
      contestId,
    ]) as unknown as EndorsementRow[]
  ).some(
    (row) =>
      row.speakerId === personId &&
      row.answer === "yes" &&
      row.candidateId !== candidateId,
  );
}

/**
 * The player's reply in the scene that asked them to endorse: an accepting
 * move is their yes (kept through `keepEndorsement`, so it is public, their
 * circle hears it and a favor owed is settled); a refusing move is a no, kept
 * as the row's answer (the scene's ending strains the tie, as it does for
 * anyone refused); a put-off leaves the ask open for its return.
 */
export function answerEndorsementAsk(
  api: CoreAPI,
  event: Readonly<CoreEventInput>,
): void {
  const facts = event.facts ?? {};
  if (facts.typeKey !== "endorsement-ask") return;
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== ENDORSEMENT_ASKED_EVENT) return;
  const move = String(facts.move);
  const yes = ACCEPTING_MOVES.has(move);
  // "refuse" is the hold on a no after the asker presses.
  if (!yes && !REFUSING_MOVES.has(move) && move !== "refuse") return;
  const held = table(api, "endorsements").get(
    String(cause.facts?.endorsementId ?? ""),
  ) as unknown as EndorsementRow | undefined;
  // A yes stands. A no said in this same scene (the day it was asked) may be
  // given up on the press that follows it; any other no stands too.
  if (!held || held.answer === "yes" || held.answer === "withdrawn") return;
  if (held.answer === "no" && !(yes && held.date === api.state.date)) return;
  const campaign = campaignFor(api, held.filingId);
  const player = api.state.people.get(held.speakerId);
  if (!player) return;
  const reached = yes
    ? endorsementHeard(
        api,
        campaign,
        player.id,
        [...player.knownIds, ...player.familyIds],
        "endorsement",
        held.score,
      )
    : 0;
  keepEndorsement(api, {
    ...held,
    date: api.state.date,
    answer: yes ? "yes" : "no",
    reached,
  });
  if (held.obligationId) {
    if (yes) settleObligation(api, held.obligationId, held.id);
    else refuseObligation(api, held.obligationId, held.id);
  }
}

/**
 * Where a group stands on a question, as it weighs a candidate: its own
 * cause where it has one (`OrganizedGroup.stance`), and on every other
 * question a candidate runs on, the position its members adopt, the mean of
 * their own views (a group's questionnaire asks what its members want; a
 * member who holds no view pulls it toward none). Undefined where it has no
 * cause on the question and no member living. Each question is read once.
 */
export function groupPositions(
  api: CoreAPI,
  group: Pick<OrganizedGroup, "stance" | "memberIds">,
): (question: string) => number | undefined {
  const core = api.state as CoreState;
  const held = new Map(group.stance.map((s) => [s.question, s.position]));
  const members = group.memberIds.flatMap((id) => {
    const person = core.people.get(id);
    return person?.alive
      ? [{ id, lean: personLean(core.people, person, townRow(api).lean) }]
      : [];
  });
  return (question) => {
    if (held.has(question)) return held.get(question);
    if (!members.length) return undefined;
    let sum = 0;
    for (const m of members) sum += viewOn(api, m.id, question, m.lean);
    const mean = sum / members.length;
    held.set(question, mean);
    return mean;
  };
}

/**
 * The organizations in town weigh a race on its campaign turn (owner, Oct
 * 29: "she was working with the Democratic Socialists of America... then
 * her campaign gained steam"). Each group's speaker weighs every candidate
 * standing, the player among them, by the one endorsement rule, reading
 * the group's stance where a person reads their own views; they endorse the
 * one they back above all rivals among those whose platform takes up the
 * group's cause and agrees with it, and no one when none stands out (asked
 * again on later turns, as ties and the field change). A group backs one
 * candidate in a race, once: its members hear it as an endorsement, and each
 * is asked to give their evenings, deciding from their own reasons, their
 * tie to the speaker, their share in the group's cause and their free
 * hours. A group the player speaks for decides only by the player's choice.
 */
export function groupsWeighRace(api: CoreAPI, contestId: string): void {
  const field = raceCampaigns(api, contestId);
  if (!field.length) return;
  const core = api.state as CoreState;
  const backed = new Set(
    (
      table(api, "endorsements").query("byContest", [
        contestId,
      ]) as unknown as EndorsementRow[]
    ).flatMap((row) =>
      row.organizationId && row.answer === "yes" ? [row.organizationId] : [],
    ),
  );
  for (const group of organizedGroupsIn(api, townRow(api).townPlaceId)) {
    if (
      backed.has(group.organizationId) ||
      !group.speakerId ||
      group.speakerId === core.playerId ||
      !group.stance.length
    )
      continue;
    const speaker = core.people.get(group.speakerId);
    if (!speaker?.alive) continue;
    // A group speaks for its own cause: a platform that leaves every one of
    // its questions out gives it nothing to stand on, whatever its members
    // think of the rest; one that takes one up is weighed whole, the rest by
    // what its members want.
    const own = new Set(group.stance.map((s) => s.question));
    const positionOn = groupPositions(api, group);
    const agreementOf = (platform: readonly Stance[]) =>
      platformRead(
        platform,
        platform.some((s) => own.has(s.question))
          ? positionOn
          : () => undefined,
      );
    for (const campaign of field) {
      const weighing = weighEndorsement(
        api,
        speaker,
        campaign,
        field,
        agreementOf,
        "group",
      );
      if (!weighing.yes) continue;
      const reached = endorsementHeard(
        api,
        campaign,
        speaker.id,
        group.memberIds.filter((id) => id !== speaker.id),
        "group-endorsement",
        weighing.score,
      );
      const volunteerIds: string[] = [];
      for (const memberId of group.memberIds) {
        const member = core.people.get(memberId);
        if (
          !member ||
          memberId === core.playerId ||
          memberId === campaign.candidateId ||
          campaignFor(api, campaign.id).volunteerIds.includes(memberId)
        )
          continue;
        const stake = agreementWith(
          api,
          memberId,
          personLean(core.people, member, townRow(api).lean),
          group.stance,
        );
        if (
          askToVolunteer(api, campaign.id, memberId, {
            askerId: speaker.id,
            stake,
          })
        )
          volunteerIds.push(memberId);
      }
      keepEndorsement(
        api,
        endorsementRow(campaign, api.state.date, {
          id: `endorsement:${campaign.id}:${group.organizationId}`,
          speakerId: speaker.id,
          organizationId: group.organizationId,
          askerId: null,
          weighing,
          reached,
          volunteerIds,
        }),
      );
      break;
    }
  }
}

/**
 * An outlet weighs a race it covers (owner, Oct 16: papers endorse, "if it
 * happens in real life, sure"; its endorsement follows its own leanings and
 * the record, no dice). Its head, who sets its line, weighs every candidate
 * standing by the one endorsement rule (`weighEndorsement`), reading their
 * own views as a group's speaker reads the group's stance: the outlet backs
 * the one candidate its head agrees with above every rival, among those whose
 * platform shares a question with those views, and no one when none stands
 * out (weighed again on a later week as the field and its platforms change).
 * It endorses once in a race, under the outlet's own name (its
 * organization): its followers hear it as an endorsement, and the paper
 * prints it as every endorsement is printed (`campaign-endorsed`). True once
 * the outlet has backed someone in the race.
 */
export function outletWeighsRace(
  api: CoreAPI,
  contestId: string,
  outlet: {
    readonly organizationId: string;
    readonly headId: string | null;
    readonly followerIds: readonly string[];
  },
): boolean {
  const field = raceCampaigns(api, contestId);
  if (!field.length) return false;
  if (
    (
      table(api, "endorsements").query("byContest", [
        contestId,
      ]) as unknown as EndorsementRow[]
    ).some(
      (row) =>
        row.organizationId === outlet.organizationId && row.answer === "yes",
    )
  )
    return true;
  const head = outlet.headId ? api.state.people.get(outlet.headId) : undefined;
  if (!head?.alive) return false;
  const lean = personLean(api.state.people, head, townRow(api).lean);
  const agreementOf = (platform: readonly Stance[]) => ({
    ...platformRead(platform, (question) =>
      viewOn(api, head.id, question, lean),
    ),
    agreement: agreementWith(api, head.id, lean, platform),
  });
  for (const campaign of field) {
    const weighing = weighEndorsement(
      api,
      head,
      campaign,
      field,
      agreementOf,
      "group",
    );
    if (!weighing.yes) continue;
    const reached = endorsementHeard(
      api,
      campaign,
      head.id,
      outlet.followerIds.filter((id) => id !== head.id),
      "endorsement",
      weighing.score,
    );
    keepEndorsement(api, {
      ...endorsementRow(campaign, api.state.date, {
        id: `endorsement:${campaign.id}:${outlet.organizationId}`,
        speakerId: head.id,
        organizationId: outlet.organizationId,
        askerId: null,
        weighing,
        reached,
        volunteerIds: [],
      }),
      // A paper is not a group with a cause: its head weighed the platform
      // by their own views, so no group stance is kept for the paper to be
      // told by ("The group wants ...", Words lead, Nov 15, on #9466).
      stance: null,
    });
    return true;
  }
  return false;
}
