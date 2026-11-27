/**
 * The campaign turn: mail, venues, events, asking for support, the rival's day and the day's work.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { residentsRuntime } from "./residents";
import { keepsWhy } from "../why-kept";
import { closenessBetween } from "./people";
import { decisionLean, termOfLean } from "../trait-decisions";
import { campaignDayOpen, takeCampaignDayChoice } from "../campaign-day";
import type { CoreAPI, PersonId, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { daysBetweenText as daysBetween } from "../kernel/dates";
import { campaignParameter } from "../campaign-data";
import { obligationsOwedTo } from "./legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { answerInterview, candidateAnswers } from "./press";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  petitionCirculating,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./elections";
import { emitMessage, runAd } from "./campaigns-ads";
import { heldInTown, townShareOfRace } from "./campaigns-asks";
import {
  ageOn,
  campaignFor,
  elections,
  pledgeOf,
  pledgesOf,
  save,
  scheduleTurn,
  table,
  townRow,
} from "./campaigns-base";
import type {
  CampaignRow,
  CauseRow,
  ImpressionRow,
  PledgeRow,
  PollRow,
} from "./campaigns-base";
import {
  adultIdsAt,
  countedAdultsAt,
  doorRowsOf,
  newestToldDoor,
  reach,
  townAddresses,
} from "./campaigns-doors";
import {
  askForEndorsement,
  askPlayerForEndorsement,
  askPlayerToVolunteer,
  attackTarget,
  endorsementsOf,
  groupsWeighRace,
} from "./campaigns-endorsements";
import {
  makeStatements,
  nextTopic,
  reachablePeople,
  whoComes,
} from "./campaigns-meetings";
import { askForDonation, askOutsideDonors, spend } from "./campaigns-money";
import { tellPetitionShort } from "./campaigns-petition-short";
import {
  askToSign,
  circulatorShift,
  freeMinor,
  hireCirculatorsForNeed,
  signaturesToGather,
} from "./campaigns-petitions";
import { commissionPoll } from "./campaigns-polls";
import { foldRivalWord, inTouchSince } from "./campaigns-rival-word";
import { volunteerShifts } from "./campaigns-shifts";
import { askToVolunteer } from "./campaigns-volunteers";
import { outsideSeller, seller, unitPrice } from "./campaigns-work";

/**
 * Mail: the campaign addresses its next households in town, as many as the
 * money buys at the printer's and postage's unit prices, out of the amount
 * asked and never past what the campaign holds. The adults in a
 * full household read it (a recorded cause, and the views engine reads the
 * message); a counted household's adults are counted as reached without
 * filling anyone in. Returns the full people it reached.
 */
export function sendMail(
  api: CoreAPI,
  filingId: string,
  amountMinor: number,
  /** Leave the message's event to the caller (a campaign turn). */
  quiet = false,
): readonly CauseRow[] {
  const campaign = campaignFor(api, filingId);
  const printPerPiece = unitPrice(api, "mailer-print");
  const postagePerPiece = unitPrice(api, "postage");
  const perPiece = printPerPiece + postagePerPiece;
  const { list } = townAddresses(api);
  // Never more than the campaign holds, as an ad buy is.
  const available = (api.state as CoreState).cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? freeMinor(campaign)
    : 0;
  // The mail a district campaign sends is spread over the district: the
  // town gets its share of the pieces.
  const pieces = Math.min(
    list.length,
    Math.floor(
      (Math.min(amountMinor, available) *
        townShareOfRace(api, campaign.contestId)) /
        perPiece,
    ),
  );
  if (pieces <= 0) return [];
  // The printer is paid for the print and the Postal Service, never in town,
  // for the postage (campaign-unit-prices mailer-print and postage rows).
  spend(api, filingId, {
    kind: "mail",
    sellerId: seller(api, "mail"),
    amountMinor: pieces * printPerPiece,
    citation: "Mailers at the campaign-unit-prices mailer-print row",
  });
  spend(api, filingId, {
    kind: "mail",
    sellerId: outsideSeller(api),
    amountMinor: pieces * postagePerPiece,
    citation: "Postage at the campaign-unit-prices postage row",
  });
  let cursor = campaign.mailCursor ?? 0;
  let counted = 0;
  const causes: CauseRow[] = [];
  for (let i = 0; i < pieces; i += 1) {
    const address = list[cursor % list.length]!;
    cursor += 1;
    if (address.counted) {
      counted += countedAdultsAt(api, address);
      continue;
    }
    for (const adultId of adultIdsAt(api, address)) {
      const cause = reach(
        api,
        campaign,
        adultId,
        "mail",
        campaign.candidateId,
        {
          carriesPlatform: true,
          weight: campaignParameter("mailWarmthWeight"),
          rapport: 0,
        },
      );
      if (cause) causes.push(cause);
    }
  }
  const after = campaignFor(api, filingId);
  save(api, {
    ...after,
    mailCursor: cursor % Math.max(1, list.length),
    countedReached: (after.countedReached ?? 0) + counted,
  });
  if (!quiet)
    emitMessage(api, after, {
      kind: "campaign-mail",
      id: `campaign-mail:${campaign.id}:${api.state.date}:${cursor}`,
      witnessIds: causes.map((c) => c.voterId),
    });
  return causes;
}

/**
 * The campaign rents an evening at a venue in town (a hall, lodge or
 * restaurant room, `seller`) at the event-venue unit price, paid from its
 * account on the journal: an event's evening and a forum's alike. Returns
 * the venue's seller and the id the journal entry names as its source.
 */
export function rentVenue(
  api: CoreAPI,
  filingId: string,
  purpose: "event" | "forum",
): { readonly sellerId: string; readonly moneyId: string } {
  const sellerId = seller(api, "event");
  const moneyId = spend(api, filingId, {
    kind: "event",
    sellerId,
    amountMinor: unitPrice(api, "event-venue"),
    citation:
      purpose === "forum"
        ? "An evening's venue for a candidate's forum at the campaign-unit-prices event-venue row"
        : "An evening's venue at the campaign-unit-prices event-venue row",
  });
  return { sellerId, moneyId };
}

/**
 * An event: the campaign rents an evening at a venue in town and the
 * candidate speaks on the question it is next behind on (`nextTopic`)
 * to whoever chooses to come (`whoComes`). Only a candidate who is a full person speaks in a
 * room.
 */
export function holdEvent(api: CoreAPI, filingId: string): readonly CauseRow[] {
  const campaign = campaignFor(api, filingId);
  if (!api.state.people.get(campaign.candidateId)?.alive) return [];
  const topic = nextTopic(api, campaign, "speech");
  if (!topic) return [];
  const venue = rentVenue(api, filingId, "event").sellerId;
  const audienceIds = whoComes(api, campaign);
  const causes = makeStatements(api, {
    filingId,
    venue,
    statements: [topic],
    audienceIds,
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
  // While the petition circulates, the evening's audience is asked to sign.
  if (petitionCirculating(api, filingId))
    for (const id of audienceIds) {
      const person = api.state.people.get(id);
      if (person) askToSign(api, filingId, person, "event");
    }
  return causes;
}

/**
 * A world candidate asks for more than money: the people the campaign can
 * reach to give their evenings (`askToVolunteer`, a few each turn, in turn)
 * and the people closest to the candidate to put their name behind them
 * (`askForEndorsement`, each asked once, the closest first). Each person
 * answers from their own record and traits; the controlled person is never
 * asked here. Volunteers join the campaign's reachable people and come to its
 * events; an endorsement reaches the endorser's circle as a cause on record.
 */
export function askForSupport(api: CoreAPI, filingId: string): void {
  const campaign = campaignFor(api, filingId);
  const playerId = (api.state as CoreState).playerId;
  const reachable = reachablePeople(api, campaign);
  const pool = reachable.filter(
    (id) => id !== playerId && !campaign.volunteerIds.includes(id),
  );
  // The player is asked too, when the campaign's lists reach them; nothing answers for them, so the ask
  // is kept and a scene puts it to them (owner, Nov 16: "Work for someone else's campaign... until a
  // race opens").
  if (playerId && reachable.includes(playerId))
    askPlayerToVolunteer(api, filingId);
  const asks = Math.min(pool.length, campaignParameter("volunteerAsksPerTurn"));
  const from = pool.length ? (campaign.volunteerCursor ?? 0) % pool.length : 0;
  for (let i = 0; i < asks; i += 1)
    askToVolunteer(api, filingId, pool[(from + i) % pool.length]!);
  const candidate = api.state.people.get(campaign.candidateId);
  // Who was already asked is the endorsement record itself: every answer a
  // person gave is kept there (a group's backing is not an ask).
  const asked = new Set(
    endorsementsOf(api, filingId).flatMap((row) =>
      row.organizationId === null ? [row.speakerId] : [],
    ),
  );
  const closest = candidate
    ? [...new Set([...candidate.familyIds, ...candidate.knownIds])]
        .filter(
          (id) =>
            id !== candidate.id &&
            !asked.has(id) &&
            !!api.state.people.get(id)?.alive,
        )
        .map((id) => ({
          id,
          tie: closenessBetween(api.state, id, candidate.id),
        }))
        .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))
        .slice(0, campaignParameter("endorsementAsksPerTurn"))
    : [];
  for (const { id } of closest)
    if (id === playerId) askPlayerForEndorsement(api, filingId);
    else askForEndorsement(api, filingId, id);
  // The player's ask that was put off comes back after the offer spacing,
  // until the race is decided (its rows go with it).
  if (playerId) askPlayerForEndorsement(api, filingId, undefined, true);
  save(api, {
    ...campaignFor(api, filingId),
    volunteerCursor: pool.length ? (from + asks) % pool.length : 0,
  });
}

/** What one campaign turn did, for the record and the tests. */
export interface CampaignTurnResult {
  readonly filingId: string;
  readonly asked: number;
  readonly raisedMinor: number;
  readonly spentMinor: number;
  readonly doors: number;
  readonly adReached: number;
  readonly mailReached: number;
  readonly eventAudience: number;
  readonly polled: number;
  /** The whole act the candidate's day was built around (an event or an interview), if any. */
  readonly dayAct: "event" | "interview" | null;
}

/** The day a world candidate chose: a whole act, if any, and hours for the hour-based acts. */
export interface RivalDay {
  readonly callHours: number;
  readonly doorHours: number;
  /** A whole act (an evening event or a press interview) the day is built around, or null. */
  readonly act: "event" | "interview" | null;
  readonly actHours: number;
  /**
   * How what the candidate knows of the race moved this day against the same
   * day unthreatened, or null where it did not (no reading, or a reading that
   * shows them level or ahead).
   */
  readonly steppedUp: SteppedUp | null;
}

/** A day that a rival's standing moved: the reading behind it and what it changed. */
export interface SteppedUp {
  readonly reading: RaceReading & { readonly rivalId: string };
  /** The hours of calls, doors and a whole act the day gained over the same day unthreatened. */
  readonly extraHours: number;
  /** The door hours it gained (a whole act the threat brought on can take some back). */
  readonly extraDoorHours: number;
  /** A candidate who lives outside the town walks its doors because of it. */
  readonly cameHome: boolean;
}

/** What a candidate knows of where their race stands, and the record they know it from. */
export interface RaceReading {
  /** The poll or the word of a rival it came from (a `polls` or `rivalWord` row id). */
  readonly sourceRecordId: string;
  readonly sourceKind: "poll" | "word" | "doors" | "told";
  /** A door reading's evening: the day its newest answers were told (one stepped-up row an evening). */
  readonly sourceDate?: string;
  /** The rival who stands best in it, or null where it names none. */
  readonly rivalId: string | null;
  /** The candidate's own share in it, 0 to 1. */
  readonly ownShare: number;
  /** The best rival's share in it, 0 to 1. */
  readonly rivalShare: number;
  /**
   * The best rival's share minus the candidate's own, -1 to 1 (a poll's by
   * how sure it is: one less its margin of error).
   */
  readonly threat: number;
  /**
   * Word's only: the yeses it counted, each the `pledges` row id
   * (`<voterId>|<contestId>|<candidateId>`) of a yes someone still holds and
   * told the candidate, sorted.
   */
  readonly toldPledgeIds?: readonly string[];
  /** Word's only: everyone the reading heard from, the shares' denominator. */
  readonly covered?: number;
}

export interface RivalWordRow {
  readonly id: string;
  readonly candidateId: string;
  readonly date: string;
  readonly contestId?: string;
  readonly rivalId?: string;
  readonly messageId?: string;
  readonly tellerId?: string;
}

/**
 * A candidate's newest word of a rival in a contest, the row `raceReading`
 * reads: the latest by date, then by id (`foldRivalWord` keeps this row).
 */
export function newestWord(
  rows: readonly RivalWordRow[],
  contestId: string,
): RivalWordRow | undefined {
  return rows
    .filter((row) => row.rivalId && row.contestId === contestId)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    )[0];
}

/**
 * Where a candidate believes their race stands, from what they know and never
 * from anyone's true support: the newer of two records. Their own campaign's
 * latest poll of the contest gives each candidate's share as what that
 * poll's respondents said, of everyone it reached, and its threat counts by
 * how sure the poll is (one less its margin of error: a single answer counts
 * for about half, a commissioned sample of hundreds nearly in full). The
 * newest word of a rival that reached them (a `rivalWord` row, which names
 * the rival and who told them) sets them reading the yeses people have told
 * them (`toldReading`), and so does an evening of their own doors whose
 * residents told them whom they back (the doors row's told answers), on its
 * own, with no word or poll. The newest of the three is what they know now:
 * a door evening only when it is newer than both, and word only when newer
 * than the poll (a poll taken the day word came, or after, is). Null where
 * no record exists (a reading that heard from no one in town is none)
 * (SG-GOV-threat-from-told-yeses).
 */
export function raceReading(
  api: CoreAPI,
  filingId: string,
  candidate: Readonly<PersonState>,
  town: string,
): RaceReading | null {
  const campaign = campaignFor(api, filingId);
  const poll = (
    table(api, "polls").query("byContest", [
      campaign.contestId,
    ]) as unknown as PollRow[]
  )
    .filter((p) => p.campaignId === campaign.id && p.contacted > 0)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    )[0];
  const word = newestWord(
    table(api, "rivalWord").query("byCandidate", [
      candidate.id,
    ]) as unknown as RivalWordRow[],
    campaign.contestId,
  );
  // The evening their own doors were last told something: its door row.
  const doors = newestToldDoor(api, campaign.id);
  const after = (date: string) =>
    (!poll || date > poll.date) && (!word || date > word.date);
  if (doors && after(doors.at))
    return toldReading(api, campaign, candidate, town, {
      id: doors.row.id,
      kind: "doors",
      date: doors.at,
    });
  const fromWord =
    word?.rivalId && (!poll || word.date > poll.date)
      ? toldReading(api, campaign, candidate, town, {
          id: word.id,
          kind: "word",
          date: word.date,
        })
      : null;
  if (fromWord) return fromWord;
  // No word or doors newer than the poll: a yes someone they know told them
  // since (one who gave a candidate their word and has been in touch).
  const heard = newestCircleYes(api, campaign, candidate, town);
  if (heard && (!poll || heard.date > poll.date)) {
    const fromCircle = toldReading(api, campaign, candidate, town, {
      id: heard.id,
      kind: "told",
      date: heard.date,
    });
    if (fromCircle) return fromCircle;
  }
  if (!poll) return null;
  const own = (poll.answers[candidate.id] ?? 0) / poll.contacted;
  const best = Object.entries(poll.answers)
    .filter(
      ([id]) =>
        id !== candidate.id && id !== "undecided" && id !== "no-opinion",
    )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const rival = best ? best[1] / poll.contacted : 0;
  const sure = 1 - (poll.marginOfError ?? 1);
  return {
    sourceRecordId: poll.id,
    sourceKind: "poll",
    rivalId: best?.[0] ?? null,
    ownShare: own,
    rivalShare: rival,
    threat: (rival - own) * sure,
  };
}

/**
 * The yeses the people a candidate knows in town have told them: each one a
 * person alive in town who has given a candidate on the ballot in the contest
 * their word and has been in touch with the candidate since it was first
 * given. `covered` gains everyone they know in town, told or not.
 */
function circleYeses(
  api: CoreAPI,
  campaign: CampaignRow,
  candidate: Readonly<PersonState>,
  town: string,
  onBallot: ReadonlySet<string>,
  covered: Set<string>,
): { readonly voterId: string; readonly pledge: PledgeRow }[] {
  const core = api.state as CoreState;
  const out: { voterId: string; pledge: PledgeRow }[] = [];
  for (const id of candidate.knownIds) {
    const person = api.state.people.get(id);
    if (person?.alive !== true || person.placeId !== town) continue;
    covered.add(id);
    for (const pledge of pledgesOf(api, id))
      if (
        pledge.contestId === campaign.contestId &&
        onBallot.has(pledge.candidateId) &&
        inTouchSince(core, id, candidate.id, pledge.firstDate ?? pledge.date)
      )
        out.push({ voterId: id, pledge });
  }
  return out;
}

/** The newest yes a candidate's circle has told them (its pledge row and day), or none. */
function newestCircleYes(
  api: CoreAPI,
  campaign: CampaignRow,
  candidate: Readonly<PersonState>,
  town: string,
): { readonly id: string; readonly date: string } | undefined {
  const onBallot = new Set(
    ballot(api, campaign.contestId).map((f) => f.personId),
  );
  onBallot.add(candidate.id);
  let best: { id: string; date: string } | undefined;
  for (const { pledge } of circleYeses(
    api,
    campaign,
    candidate,
    town,
    onBallot,
    new Set(),
  ))
    if (
      !best ||
      pledge.date > best.date ||
      (pledge.date === best.date && pledge.id < best.id)
    )
      best = { id: pledge.id, date: pledge.date };
  return best;
}

/**
 * Word of a rival sets a candidate reading the race from the yeses people
 * have told them, never from anyone's true support. Two kinds of people tell
 * them, one rule for each, and each yes counts while its holder still holds
 * it:
 * - someone they know in town who has given a candidate in the contest their
 *   word and has been in touch with them since that word was first given
 *   (the relationship's last contact after it, the check word of a rival
 *   passes by);
 * - a resident still in town, full or counted, who answered the candidate's
 *   own campaign's door, by whom they named at their latest answer there
 *   (`toldAtDoor`, the doors row).
 * Each candidate on the ballot gets a share: the people who told them of a
 * yes to that candidate, over everyone the reading heard from (the people
 * they know in town and everyone in town who answered their doors, each
 * once). The best rival is the one told most, ties by id as the poll's, and
 * none where no one told them of a yes to any rival; the threat is that
 * rival's share less the candidate's own. The word row stays the reading's
 * source. Null where they have heard from no one in town.
 */
function toldReading(
  api: CoreAPI,
  campaign: CampaignRow,
  candidate: Readonly<PersonState>,
  town: string,
  source: {
    readonly id: string;
    readonly kind: "word" | "doors" | "told";
    readonly date: string;
  },
): RaceReading | null {
  const core = api.state as CoreState;
  const contestId = campaign.contestId;
  // stopgapId: SG-GOV-threat-from-told-yeses
  api.stopgap("SG-GOV-threat-from-told-yeses");
  const onBallot = new Set(ballot(api, contestId).map((f) => f.personId));
  onBallot.add(candidate.id);
  const store = residentsRuntime(core)?.store;
  // Alive and in town: a full person by their record, a counted resident
  // while the counts still hold them (not filled in, dead or moved).
  const inTown = (id: string) => {
    const person = api.state.people.get(id);
    return person
      ? person.alive && person.placeId === town
      : store?.countedMember(id as PersonId) !== undefined;
  };
  const covered = new Set<string>();
  // Each yes told to a candidate on the ballot, by its pledge id, to whom.
  const told = new Map<string, string>();
  for (const { pledge } of circleYeses(
    api,
    campaign,
    candidate,
    town,
    onBallot,
    covered,
  ))
    told.set(pledge.id, pledge.candidateId);
  // Each resident's latest answer at the campaign's doors, whichever home
  // they answered it at.
  const answered = new Map<string, { at: string; yes: string | null }>();
  for (const row of doorRowsOf(api, campaign.id)) {
    const at = row.lastDate ?? row.date;
    for (const [voterId, yes] of Object.entries(row.told ?? {})) {
      const prior = answered.get(voterId);
      if (!prior || at > prior.at) answered.set(voterId, { at, yes });
    }
  }
  for (const [voterId, { yes }] of answered) {
    if (!inTown(voterId)) continue;
    covered.add(voterId);
    const pledge =
      yes && onBallot.has(yes) ? pledgeOf(api, voterId, yes, contestId) : null;
    if (pledge) told.set(pledge.id, pledge.candidateId);
  }
  if (!covered.size) return null;
  const counts = new Map<string, number>();
  for (const candidateId of told.values())
    counts.set(candidateId, (counts.get(candidateId) ?? 0) + 1);
  const share = (id: string) => (counts.get(id) ?? 0) / covered.size;
  const best = [...onBallot]
    .filter((id) => id !== candidate.id && share(id) > 0)
    .map((id) => [id, share(id)] as const)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const own = share(candidate.id);
  const rival = best?.[1] ?? 0;
  return {
    sourceRecordId: source.id,
    sourceKind: source.kind,
    ...(source.kind !== "word" ? { sourceDate: source.date } : {}),
    rivalId: best?.[0] ?? null,
    ownShare: own,
    rivalShare: rival,
    threat: rival - own,
    toldPledgeIds: [...told.keys()].sort(),
    covered: covered.size,
  };
}

/**
 * How a world candidate spends their campaign day: a scored pass over the
 * player's own day choices (which are open and their hours,
 * `campaignDayOpen`), by their money, standing, traits and what they know of
 * the race. Every available act gets a score on one scale and nothing flips
 * at a line:
 * - call time for money rises as the bank empties and as they get better
 *   known (donors are easier to reach);
 * - doors rise as they are less known and as they are more sociable;
 * - an event rises with the bank (venue money in hand) and sociability;
 * - an interview rises with how known they are and with holding the seat.
 * The hours their own day leaves (a job takes most of it, rest takes its
 * lean) are split between calls and doors by score share. A whole act
 * (event, interview) is taken when it is the best-scored act of the day,
 * and then takes its share of the day's hours. Ads, mail, staff and polls
 * are bought from the money in `campaignTurn`.
 *
 * A candidate who knows a rival stands ahead of them (`raceReading`: the
 * newer of their own poll and word of the rival) campaigns harder by how far
 * ahead: more hours, more pull to the doors and to an evening event, and one
 * who lives outside the town spends that share of their day in it, at its
 * doors, as far as the threat pulls them. The day says what that changed
 * against the same day unthreatened.
 */
export function rivalDay(
  api: CoreAPI,
  filingId: string,
  candidate: Readonly<PersonState>,
  town: string,
): RivalDay {
  const day = campaignDayOpen(api, filingId, true);
  const offered = (kind: string) =>
    day.find((c) => c.kind === kind)?.available ?? false;
  const calls = offered("raise-money");
  // The signatures a circulating petition still lacks, as a share of what
  // the clerk will count, pull the day toward the doors until the deadline;
  // while it lacks any, a candidate whose district takes in the town walks
  // its doors for them wherever they live.
  const petition = petitionCirculating(api, filingId)
    ? petitionOf(api, filingId)
    : null;
  const target = petition?.needed ? signaturesToGather(api, filingId) : 0;
  const shortfall = target
    ? Math.max(0, target - petition!.signed) / target
    : 0;
  const home = candidate.placeId === town;
  const campaign = campaignFor(api, filingId);
  const cash =
    api.state.organizations.get(campaign.organizationId)?.liquidMinor ?? 0;
  const richness = cash / (cash + unitPrice(api, "event-venue"));
  const known = Math.min(1, campaignRecognition(api, filingId));
  const sociable = Math.max(
    0,
    candidate.traits["people-mind-v1:sociability"] ?? 0,
  );
  const wTrait = campaignParameter("spendTraitWeight");
  const wThreat = campaignParameter("rivalThreatWeight");
  const callScore =
    1 +
    campaignParameter("rivalCallNeedWeight") * (1 - richness) +
    campaignParameter("rivalCallStandingWeight") * known;
  const holdsSeat = holdsTheSeat(api, filingId, candidate.id) ? 1 : 0;
  const interviewScore =
    campaignParameter("rivalActBaseScore") +
    campaignParameter("rivalInterviewKnownWeight") * known +
    campaignParameter("rivalInterviewIncumbentWeight") * holdsSeat;
  const baseHours = candidate.jobId
    ? campaignParameter("rivalHoursWithJob")
    : campaignParameter("rivalHoursWithoutJob");
  // Personality slides the hours between (1 - share) and (1 + share) of
  // the base: even the least campaign-minded candidate walks some doors.
  const leanShare =
    campaignParameter("rivalHoursLeanShare") *
    termOfLean(
      api.state,
      candidate,
      "campaigns.rival-hours",
      decisionLean(
        api.state,
        candidate,
        "campaigns.rival-hours",
        "campaign",
        "rest",
      ),
      0,
    );
  // A world candidate's day never weighs the donor meeting the player's
  // offers (their day's choices read no host, `campaignDayOpen` with
  // `world`); their money comes from call time and the turn's asks.
  // stopgapId: SG-GOV-rival-donor-meeting
  api.stopgap("SG-GOV-rival-donor-meeting");
  const plan = (threat: number): Omit<RivalDay, "steppedUp"> => {
    const pull = wThreat * threat;
    // Someone who lives elsewhere is pulled home to the town's doors only as
    // far as the threat reaches (all the way at a full pull); a petition
    // still short of signatures brings them whatever the race looks like.
    const homePull = home || shortfall > 0 ? 1 : Math.min(1, pull);
    const doors = homePull > 0 && offered("canvass");
    const doorScore =
      1 +
      campaignParameter("rivalDoorUnknownWeight") * (1 - known) +
      campaignParameter("rivalPetitionNeedWeight") * shortfall +
      wTrait * sociable +
      pull;
    const eventScore =
      campaignParameter("rivalActBaseScore") +
      campaignParameter("rivalEventRichWeight") * richness +
      wTrait * sociable +
      pull;
    const bestHourly = Math.max(
      calls ? callScore : 0,
      doors ? homePull * doorScore : 0,
    );
    const canEvent = offered("event") && eventScore > bestHourly;
    const canInterview = offered("interview") && interviewScore > bestHourly;
    const act: RivalDay["act"] =
      canEvent && (!canInterview || eventScore >= interviewScore)
        ? "event"
        : canInterview
          ? "interview"
          : null;
    const actHours = act ? (day.find((c) => c.kind === act)?.hours ?? 0) : 0;
    const ownHours = baseHours * (1 + leanShare + pull);
    // A whole act takes its share of the day; the rest is split by score.
    const hours =
      actHours > 0 ? (ownHours * ownHours) / (ownHours + actHours) : ownHours;
    // In town the hours are split between calls and doors by score. A
    // candidate living elsewhere spends homePull of them in town, and the
    // rest as the day away they would have had (calls from wherever they
    // are, else nothing): their door hours grow from none with the pull,
    // whether or not there are donors left to call.
    const total = (calls ? callScore : 0) + (doors ? doorScore : 0);
    const inTown = (score: number) => (total > 0 ? (hours * score) / total : 0);
    return {
      callHours: calls
        ? homePull * inTown(callScore) + (1 - homePull) * hours
        : 0,
      doorHours: doors ? homePull * inTown(doorScore) : 0,
      act,
      actHours,
    };
  };
  const calm = plan(0);
  const reading = raceReading(api, filingId, candidate, town);
  const threat = Math.max(0, reading?.threat ?? 0);
  if (!reading?.rivalId || threat <= 0) return { ...calm, steppedUp: null };
  const pressed = plan(threat);
  const hoursOf = (d: Omit<RivalDay, "steppedUp">) =>
    d.callHours + d.doorHours + d.actHours;
  const extraHours = hoursOf(pressed) - hoursOf(calm);
  const extraDoorHours = pressed.doorHours - calm.doorHours;
  // Stepped up only where the day gained hours or doors (a threat that
  // brings on an interview in place of an evening's doors is not).
  if (!(extraHours > 0 || extraDoorHours > 0))
    return { ...pressed, steppedUp: null };
  return {
    ...pressed,
    steppedUp: {
      reading: { ...reading, rivalId: reading.rivalId },
      extraHours,
      extraDoorHours,
      cameHome: !home && calm.doorHours === 0 && pressed.doorHours > 0,
    },
  };
}

/** The kind of a world candidate campaigning harder because they know a rival stands ahead. */
export const CAMPAIGN_STEPPED_UP_EVENT = "campaign-stepped-up";

/** One reading of the race that made a world candidate campaign harder. */
export interface SteppedUpRow {
  /** `<filingId>:<sourceRecordId>`: each reading is kept once. */
  readonly id: string;
  readonly filingId: string;
  readonly candidateId: string;
  readonly contestId: string;
  readonly date: string;
  /** The poll or word row the candidate read (`polls` or `rivalWord`). */
  readonly sourceRecordId: string;
  readonly sourceKind: "poll" | "word" | "doors" | "told";
  readonly rivalId: string;
  readonly ownShare: number;
  readonly rivalShare: number;
  /** The rival's share minus the candidate's own in that reading. */
  readonly threat: number;
  /**
   * A word reading's why: everyone it heard from, and how many of them told
   * the candidate of a yes to themselves and to the rival.
   */
  readonly covered?: number;
  readonly toldOwn?: number;
  readonly toldRival?: number;
  /**
   * The yeses to the rival told to the candidate (`pledges` row ids), kept
   * where the player deals with the candidate or the rival (`keepsWhy`).
   */
  readonly rivalToldPledgeIds?: readonly string[];
  readonly extraHours: number;
  readonly extraDoorHours: number;
  readonly cameHome: boolean;
}

/** The readings of the race that made a filing's candidate campaign harder, oldest first. */
export function steppedUpOf(
  api: CoreAPI,
  filingId: string,
): readonly SteppedUpRow[] {
  return (
    table(api, "steppedUp").query("byFiling", [
      filingId,
    ]) as unknown as SteppedUpRow[]
  )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Keep the day a reading of the race made a world candidate campaign harder,
 * once for each reading (a new poll or new word), not every turn the same
 * reading keeps them at it, and tell the candidate's story through an event
 * a scene can name by its row. A word reading keeps its why: how many told
 * the candidate of a yes to each of them, of everyone it heard from, and,
 * where the player deals with either, which yeses to the rival they were.
 */
function recordSteppedUp(
  api: CoreAPI,
  campaign: CampaignRow,
  steppedUp: SteppedUp,
): void {
  const { reading } = steppedUp;
  // One row a source; a door reading's source is an evening, so its day is part of the id.
  const id = reading.sourceDate
    ? `${campaign.filingId}:${reading.sourceRecordId}:${reading.sourceDate}`
    : `${campaign.filingId}:${reading.sourceRecordId}`;
  if (table(api, "steppedUp").get(id)) return;
  const date = api.state.date;
  // Which told yeses made the threat, from the reading's own ids.
  const toldTo = (personId: string) =>
    (reading.toldPledgeIds ?? []).filter((p) => p.endsWith(`|${personId}`));
  const rivalTold = toldTo(reading.rivalId);
  const told =
    reading.covered === undefined
      ? {}
      : {
          covered: reading.covered,
          toldOwn: toldTo(campaign.candidateId).length,
          toldRival: rivalTold.length,
          ...(keepsWhy(
            api.state as CoreState,
            campaign.candidateId,
            reading.rivalId,
          )
            ? { rivalToldPledgeIds: rivalTold }
            : {}),
        };
  const row: SteppedUpRow = {
    id,
    filingId: campaign.filingId,
    candidateId: campaign.candidateId,
    contestId: campaign.contestId,
    date,
    sourceRecordId: reading.sourceRecordId,
    sourceKind: reading.sourceKind,
    rivalId: reading.rivalId,
    ownShare: reading.ownShare,
    rivalShare: reading.rivalShare,
    threat: reading.threat,
    ...told,
    extraHours: steppedUp.extraHours,
    extraDoorHours: steppedUp.extraDoorHours,
    cameHome: steppedUp.cameHome,
  };
  table(api, "steppedUp").put(row as unknown as ModuleRow);
  const contest = elections(api, "contests").get(campaign.contestId) as
    ContestRow | undefined;
  const share = (x: number) => String(Math.round(x * 1000) / 1000);
  // stopgapId: SG-GOV-stepped-up-unread
  api.stopgap("SG-GOV-stepped-up-unread");
  api.emit({
    id: `${CAMPAIGN_STEPPED_UP_EVENT}:${id}`,
    date,
    kind: CAMPAIGN_STEPPED_UP_EVENT,
    personIds: [campaign.candidateId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Campaign ${campaign.id} read ${reading.sourceKind} ${reading.sourceRecordId}`,
      asOf: date,
    },
    facts: {
      steppedUpId: id,
      filingId: campaign.filingId,
      candidateId: campaign.candidateId,
      contestId: campaign.contestId,
      sourceRecordId: reading.sourceRecordId,
      sourceKind: reading.sourceKind,
      rivalId: reading.rivalId,
      ownShare: share(reading.ownShare),
      rivalShare: share(reading.rivalShare),
      threat: share(reading.threat),
      ...(row.covered === undefined
        ? {}
        : {
            covered: String(row.covered),
            toldOwn: String(row.toldOwn),
            toldRival: String(row.toldRival),
          }),
      extraHours: share(steppedUp.extraHours),
      extraDoorHours: share(steppedUp.extraDoorHours),
      cameHome: String(steppedUp.cameHome),
      ...(contest ? { office: contest.title } : {}),
    },
  });
}

/** Whether this candidate holds the seat the contest is for (the incumbent running again). */
function holdsTheSeat(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
  const contest = filing
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(filing.contestId) as unknown as ContestRow | undefined)
    : undefined;
  if (!contest?.incumbentTermId || !api.state.modules.has(OFFICES_MODULE_ID))
    return false;
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(contest.incumbentTermId) as unknown as TermRow | undefined;
  return term?.status === "serving" && term.personId === personId;
}

/**
 * One world candidate's campaign turn. They ask for money from the people
 * the campaign can reach (a few dozen a turn, in turn), knock doors in town
 * for the hours their own day leaves free (a candidate who is a full person
 * living here), and spend what the campaign holds on the reach it buys:
 * ads, mail, an event's venue and a poll, in shares that slide with the
 * candidate's own sociability and deliberation, at a pace that spends it all
 * by election day.
 */
export function campaignTurn(
  api: CoreAPI,
  filingId: string,
  electionDate: string,
): CampaignTurnResult {
  let campaign = campaignFor(api, filingId);
  const startRaised = campaign.raisedMinor;
  const startSpent = campaign.spentMinor;
  const candidate = api.state.people.get(campaign.candidateId);
  const town = townRow(api).townPlaceId;
  // The candidate backs their own campaign first, by the same reasons.
  if (candidate?.alive) askForDonation(api, filingId, candidate.id);
  // The rest of the candidate's turn is a campaign day taken through the
  // player's own choices, chosen among by the candidate's money, standing and
  // traits. The controlled person's money moves only by their own choice, so
  // asks skip them.
  askOutsideDonors(api, filingId);
  // The candidate calls in the favors owed them from deals in office: each
  // colleague who owes one is asked to endorse (campaign-favor-called-in).
  // The player is never answered for: a favor owed by them is asked in a
  // scene and the player's reply is the answer (`askPlayerForEndorsement`).
  if (candidate?.alive)
    for (const owed of obligationsOwedTo(api, candidate.id)) {
      if (owed.owedBy === (api.state as CoreState).playerId)
        askPlayerForEndorsement(api, filingId, owed.id);
      else askForEndorsement(api, filingId, owed.owedBy);
    }
  let doors = 0;
  let asks = 0;
  let dayAct: CampaignTurnResult["dayAct"] = null;
  if (candidate?.alive) {
    const day = rivalDay(api, filingId, candidate, town);
    if (day.steppedUp) recordSteppedUp(api, campaign, day.steppedUp);
    if (day.act === "event" && heldInTown(api, filingId)) {
      takeCampaignDayChoice(api, filingId, "event", { world: true });
      dayAct = "event";
    } else if (day.act === "interview") {
      // Ask the outlet; a yes comes with its questions, which they answer
      // from their platform, their own view and their party.
      const row = takeCampaignDayChoice(api, filingId, "interview", {
        world: true,
      }).interview;
      if (row?.status === "invited") {
        const filing = api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .get(filingId) as unknown as FilingRow;
        answerInterview(
          api,
          row.id,
          candidateAnswers(api, row.questions, filing),
        );
      }
      dayAct = "interview";
    }
    if (day.callHours > 0)
      asks = takeCampaignDayChoice(api, filingId, "raise-money", {
        world: true,
        hours: day.callHours,
      }).asked;
    if (day.doorHours > 0)
      doors = takeCampaignDayChoice(api, filingId, "canvass", {
        world: true,
        hours: day.doorHours,
      }).doorsKnocked;
  }
  // Spending: the share of what's free that keeps an even pace to election day.
  campaign = campaignFor(api, filingId);
  const turnDays = campaignParameter("campaignTurnDays");
  const daysLeft = Math.max(
    0,
    Math.round(
      (Date.parse(`${electionDate}T00:00:00Z`) -
        Date.parse(`${api.state.date}T00:00:00Z`)) /
        86_400_000,
    ),
  );
  // Signatures come first while the petition circulates: the circulators
  // for the part of the race outside the town are paid for before the rest.
  hireCirculatorsForNeed(api, filingId);
  campaign = campaignFor(api, filingId);
  const free = freeMinor(campaign);
  const budget = Math.floor(
    free * Math.min(1, turnDays / Math.max(turnDays, daysLeft)),
  );
  const trait = (key: string) => candidate?.traits[key] ?? 0;
  const w = campaignParameter("spendTraitWeight");
  const shares = {
    ad: campaignParameter("adSpendShare"),
    mail: campaignParameter("mailSpendShare"),
    // Only a candidate who is a person stands in a room.
    event: candidate?.alive
      ? campaignParameter("eventSpendShare") *
        Math.max(0, 1 + w * trait("people-mind-v1:sociability"))
      : 0,
    poll:
      campaignParameter("pollSpendShare") *
      Math.max(0, 1 + w * trait("people-mind-v1:deliberation")),
  };
  const total = shares.ad + shares.mail + shares.event + shares.poll || 1;
  const part = (k: keyof typeof shares) =>
    Math.floor((budget * shares[k]) / total);
  let adReached = 0;
  let mailReached = 0;
  let eventAudience = 0;
  let polled = 0;
  // What the turn bought reaches its audiences as one message, which the
  // views engine reads once for each person it reached.
  const told: string[] = [];
  if (part("ad") > 0) {
    // A challenger facing a rival with a record in office (their votes, the
    // promises they made) puts part of the ad money on showing it, by their
    // own temperament (rival-ad-quotes-a-real-vote; register D-2 and D-5:
    // never a fixed share). The rest carries their own platform.
    const target = attackTarget(api, campaignFor(api, filingId));
    const attackShare = target
      ? Math.min(
          1,
          Math.max(
            0,
            campaignParameter("attackAdShare") *
              (1 + w * trait("people-mind-v1:conflict")),
          ),
        )
      : 0;
    const attackMinor = Math.floor(part("ad") * attackShare);
    if (target && attackMinor > 0) {
      const shown = runAd(api, {
        filingId,
        amountMinor: attackMinor,
        attackFilingId: target.filingId,
        quiet: true,
      });
      adReached += shown.length;
      for (const c of shown) told.push(c.voterId);
    }
    const seen = runAd(api, {
      filingId,
      amountMinor: part("ad") - attackMinor,
      quiet: true,
    });
    adReached += seen.length;
    for (const c of seen) told.push(c.voterId);
  }
  if (part("mail") > 0) {
    const read = sendMail(api, filingId, part("mail"), true);
    mailReached = read.length;
    for (const c of read) told.push(c.voterId);
  }
  if (told.length)
    emitMessage(api, campaignFor(api, filingId), {
      kind: "campaign-message",
      id: `campaign-message:${filingId}:${api.state.date}`,
      witnessIds: told,
    });
  // An event and a poll are bought whole: the campaign sets money aside
  // toward them until it covers one.
  campaign = campaignFor(api, filingId);
  let eventFund = (campaign.eventFundMinor ?? 0) + part("event");
  let pollFund = (campaign.pollFundMinor ?? 0) + part("poll");
  save(api, {
    ...campaign,
    eventFundMinor: eventFund,
    pollFundMinor: pollFund,
  });
  if (eventFund >= unitPrice(api, "event-venue") && daysLeft > 0) {
    if (heldInTown(api, filingId))
      eventAudience = holdEvent(api, filingId).length;
    eventFund -= unitPrice(api, "event-venue");
  }
  const perInterview = campaignParameter("pollCostPerInterviewMinor");
  if (pollFund >= campaignParameter("pollMinimumInterviews") * perInterview) {
    // Set aside before the call: what was put by is free to pay for it.
    save(api, { ...campaignFor(api, filingId), pollFundMinor: 0 });
    const poll = commissionPoll(api, {
      filingId,
      sampleSize: Math.floor(pollFund / perInterview),
    });
    polled = poll.contacted;
    pollFund -= poll.contacted * perInterview;
  }
  save(api, {
    ...campaignFor(api, filingId),
    eventFundMinor: eventFund,
    pollFundMinor: pollFund,
  });
  askForSupport(api, filingId);
  const after = campaignFor(api, filingId);
  return {
    filingId,
    asked: asks,
    raisedMinor: after.raisedMinor - startRaised,
    spentMinor: after.spentMinor - startSpent,
    doors,
    adReached,
    mailReached,
    eventAudience,
    polled,
    dayAct,
  };
}

const contestsSeen = new WeakMap<object, number>();

/**
 * Every few days, each world candidate on the ballot of a contest the town
 * votes in (the player excepted) takes a campaign turn, from the day they
 * filed to election day, and every candidate's volunteers, the player's
 * included, weigh an evening of doors (`volunteerShifts`). Races are noted
 * when their contest appears (the contests table read only when it has
 * grown) and closed once decided (`closeRace`), and word no reader can reach
 * again goes (`foldRivalWord`).
 */
export function campaignWork(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind !== "campaign-turn") return;
  scheduleTurn(api);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const date = api.state.date;
  const contests = elections(api, "contests");
  const races = table(api, "races");
  if (contestsSeen.get(api.state) !== contests.size) {
    for (const row of contests.rows() as unknown as ContestRow[])
      if (row.electionDate >= date && !races.get(row.id))
        races.put({
          id: row.id,
          electionDate: row.electionDate,
        } as unknown as ModuleRow);
    contestsSeen.set(api.state, contests.size);
  }
  const playerId = (api.state as CoreState).playerId;
  const turnDays = campaignParameter("campaignTurnDays");
  // Who gave this evening to a campaign's doors already.
  const walked = new Set<string>();
  for (const race of (
    races.rows() as unknown as {
      id: string;
      electionDate: string;
      lastTurn?: string;
    }[]
  ).slice()) {
    if (race.electionDate < date) {
      // Once its election day has passed, a race's door rows and pledges
      // have no reader (`closeRace`; a race the player ran in keeps its
      // pledges). Its messages and word go as they leave word's window
      // (`foldRivalWord`, after the races are worked).
      closeRace(api, race.id);
      races.remove(race.id);
      continue;
    }
    // A campaign works harder as election day nears: far out its people
    // turn to it now and then, in the last weeks every few days. While its
    // petitions circulate, the nearer day is the filing deadline.
    const contest = contests.get(race.id) as unknown as ContestRow | undefined;
    const toward =
      contest &&
      date <= contest.filingDeadline &&
      ballot(api, race.id).some((f) => f.status === "petitioning")
        ? contest.filingDeadline
        : race.electionDate;
    const daysLeft = daysBetween(date, toward);
    // The wait is counted in whole scheduled turns (they fall `turnDays`
    // apart), so a day nearer than one more turn never costs a skipped turn:
    // near a deadline or an election every scheduled turn works the race.
    const everyTurns = Math.max(
      1,
      Math.round(1 + daysLeft / campaignParameter("campaignRampDays")),
    );
    if (
      race.lastTurn &&
      daysBetween(race.lastTurn, date) < everyTurns * turnDays
    )
      continue;
    races.put({ ...race, lastTurn: date } as unknown as ModuleRow);
    // The town's organizations weigh the race first, so the volunteers they
    // send work this turn; then every campaign's volunteers walk its doors on
    // the days it works, the player's campaign's too (the player's own day is
    // theirs to choose).
    groupsWeighRace(api, race.id);
    for (const filing of ballot(api, race.id)) {
      if (filing.filedOn > date) continue;
      volunteerShifts(api, filing.id, walked);
      circulatorShift(api, filing.id, everyTurns * turnDays);
      if (filing.personId !== playerId)
        campaignTurn(api, filing.id, race.electionDate);
      else tellPetitionShort(api, filing.id, everyTurns * turnDays);
    }
  }
  foldRivalWord(api);
}

/**
 * A decided race's rows that only the race read go once its election day has
 * passed (governing lead, Oct 30 and Nov 1): its door rows (the campaign row
 * keeps its door counts) and its pledges, the "yes" voters gave at its doors,
 * which the door's answer read during the race and the ballot on primary and
 * election day. Every filing of the contest is read by its id, so no
 * campaign row is made. Only this contest's pledges go, by their contest: a
 * voter's yes in another race still open stays. A contest the player filed in
 * keeps every pledge, its rivals' too (CTO, Nov 1 21:25). No cause is kept
 * for a pledge (`foldCauses`), so the drop leaves nothing behind. Its
 * messages and word are not touched here: a filing stays on the ballot after
 * the count, so word of it may still pass on (`foldRivalWord`).
 */
export function closeRace(api: CoreAPI, contestId: string): void {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const filings = elections(api, "filings").query("byContest", [
    contestId,
  ]) as unknown as { id: string; personId: string }[];
  const doors = table(api, "doors");
  const emphasis = table(api, "emphasis");
  for (const filing of filings) {
    for (const row of doors.query("byCampaign", [filing.id]))
      doors.remove(row.id);
    emphasis.remove(filing.id);
  }
  const playerId = (api.state as CoreState).playerId;
  if (filings.some((f) => f.personId === playerId)) return;
  const pledges = table(api, "pledges");
  for (const candidateId of new Set(filings.map((f) => f.personId)))
    for (const row of pledges.query("byCandidate", [
      candidateId,
    ]) as unknown as PledgeRow[])
      if (row.contestId === contestId) pledges.remove(row.id); // The race's gifts, endorsements, polls and stepped-up readings have no
  // reader once it is decided: the campaign row keeps what was raised, and the
  // endorsed and stepped-up events carry what news reads (governing lead,
  // Nov 1). A contest the player filed in keeps every row (returned above).
  const gifts = table(api, "gifts");
  for (const filing of filings)
    for (const row of gifts.query("byCampaign", [filing.id]))
      gifts.remove(row.id);
  const endorsements = table(api, "endorsements");
  for (const row of endorsements.query("byContest", [contestId]))
    endorsements.remove(row.id);
  const polls = table(api, "polls");
  for (const row of polls.query("byContest", [contestId])) polls.remove(row.id);
  const stepped = table(api, "steppedUp");
  for (const filing of filings)
    for (const row of stepped.query("byFiling", [filing.id]))
      stepped.remove(row.id);
}

/**
 * How much of the town a campaign has reached, 0 to 1: the full people who
 * have heard of the candidate and the counted adults its doors and mail
 * reached, over the town's adults of both kinds.
 */
export function campaignRecognition(api: CoreAPI, filingId: string): number {
  const adultAge = api.parameter("votingAge");
  const campaign = table(api, "campaigns").get(filingId) as unknown as
    CampaignRow | undefined;
  if (!campaign) return 0;
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  let namedAdults = 0;
  for (const id of core.peopleByPlace.get(town) ?? []) {
    const p = core.people.get(id);
    if (p?.alive && ageOn(p, api.state.date) >= adultAge) namedAdults += 1;
  }
  const heard = (
    table(api, "impressions").query("byCandidate", [
      campaign.candidateId,
    ]) as unknown as ImpressionRow[]
  ).filter((i) => i.heardOf).length;
  const { countedAdults } = townAddresses(api);
  const all = namedAdults + countedAdults;
  return all
    ? Math.min(
        1,
        (heard + Math.min(countedAdults, campaign.countedReached ?? 0)) / all,
      )
    : 0;
}
