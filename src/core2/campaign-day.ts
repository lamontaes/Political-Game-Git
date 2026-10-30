/**
 * A campaign day for the player (owner, Oct 14, 2026): a handful of choices,
 * each an act read from the records, no more than that. Knock on doors in a
 * neighborhood, hold an event, host a forum, give an interview, raise money,
 * meet donors at a supporter's house party, rest.
 *
 * Nothing here is a new mechanic. Each choice runs an engine's own act
 * (`knockDoors`, `holdEvent`, the meetings engine's `holdTownHall`,
 * `requestInterview`, `askForDonation`, `holdDonorMeeting`) with the player's
 * own hours; availability is read from the records the engines keep (doors
 * knocked, the campaign's cash, the town halls held, the press desk's week, the gifts
 * already given). No choice is decided by a roll. Choices carry ids and
 * numbers only; the English engine words them.
 */
import { daysBetweenText as daysBetween } from "./kernel/dates";
import { residentsRuntime } from "./modules/residents";
import { campaignParameter } from "./campaign-views";
import {
  CAMPAIGNS_MODULE_ID,
  causeSummariesOf,
  donationAnswer,
  type DonationWhy,
  unitPrice,
  askCircleToSign,
  askToSign,
  campaignFor,
  doorsKnockedOf,
  giftOf,
  donorMeetingHost,
  holdDonorMeeting,
  hostCircle,
  holdEvent,
  knockDoors,
  reachablePeople,
  rentVenue,
  type CampaignRow,
  type CauseRow,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  petitionCirculating,
  standing,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  PRESS_MODULE_ID,
  answerInterview,
  interviewsFor,
  newsworthiness,
  outletsHere,
  pressParameter,
  requestInterview,
  type InterviewAnswer,
  type InterviewRow,
} from "./modules/press";
import {
  MEETINGS_MODULE_ID,
  holdTownHall,
  townHallId,
  type TownHallRow,
} from "./modules/meetings";
import type { CoreAPI, CoreState } from "./types";
import type { ModuleRow } from "./module-data";

export type CampaignDayKind =
  | "canvass"
  | "event"
  | "forum"
  | "interview"
  | "raise-money"
  | "donor-meeting"
  | "rest";

interface DayChoiceBase {
  readonly filingId: string;
  /** The player's hours the choice takes (a parameter, not a roll). */
  readonly hours: number;
  /** Whether the records let the player take it today. */
  readonly available: boolean;
}

export type CampaignDayChoice =
  | (DayChoiceBase & {
      readonly kind: "canvass";
      readonly facts: {
        /** The town's households, full and counted. */
        readonly households: number;
        /** Households whose door the campaign has not knocked yet. */
        readonly doorsLeft: number;
        /** Every door knocked so far, a second pass included. */
        readonly doorsKnocked: number;
        readonly doorsThisShift: number;
      };
    })
  | (DayChoiceBase & {
      readonly kind: "event";
      readonly facts: {
        readonly venuePriceMinor: number;
        readonly cashMinor: number;
        readonly platformStances: number;
      };
    })
  | (DayChoiceBase & {
      readonly kind: "forum";
      readonly facts: {
        /** The evening's venue, the same hall an event rents. */
        readonly venuePriceMinor: number;
        readonly cashMinor: number;
        /** Whether the town's public meetings are kept (the meetings engine). */
        readonly meetingsKept: boolean;
        /** The stances the candidate answers from; a question it does not hold is declined. */
        readonly platformStances: number;
        /** The town hall the candidate already hosted today, if any: one a day. */
        readonly heldTodayId: string | null;
      };
    })
  | (DayChoiceBase & {
      readonly kind: "interview";
      readonly facts: {
        /** Interviews an outlet has invited the player to answer. */
        readonly invitedInterviewIds: readonly string[];
        /** Outlets with room this week that would take the ask. */
        readonly outlets: readonly {
          readonly outletId: string;
          readonly roomLeft: number;
        }[];
        /** Outlets here; of them, those that already interviewed the candidate and those with no room left this week. */
        readonly outletsHere: number;
        readonly outletsDone: number;
        readonly outletsFull: number;
      };
    })
  | (DayChoiceBase & {
      readonly kind: "raise-money";
      readonly facts: {
        readonly peopleLeft: number;
        readonly reachable: number;
        readonly giftsSoFar: number;
        readonly asksThisSession: number;
      };
    })
  | (DayChoiceBase & {
      readonly kind: "donor-meeting";
      readonly facts: {
        /** The candidate's warmest backer who would host, or null when nobody would. */
        readonly hostId: string | null;
        /** The adults of the host's own circle who could come (the campaign's own list is invited beside them). */
        readonly hostCircle: number;
        /** Donor meetings already held for the campaign. */
        readonly heldSoFar: number;
      };
    })
  | (DayChoiceBase & {
      readonly kind: "rest";
      readonly facts: Record<string, never>;
    });

export interface CampaignDayResult {
  readonly kind: CampaignDayKind;
  readonly filingId: string;
  readonly date: string;
  readonly hours: number;
  /** Cause rows (record ids) the act wrote: doors answered, an event's audience. */
  readonly causeIds: readonly string[];
  readonly doorsKnocked: number;
  /** People asked for money (raise-money). */
  readonly asked: number;
  /** Gift rows (`filingId|donorId`) that grew, and the minor units they added. */
  readonly giftIds: readonly string[];
  /** Each person asked for money, with what they gave or why not (raise-money, donor-meeting). */
  readonly answers: readonly {
    readonly personId: string;
    readonly givenMinor: number;
    readonly why: DonationWhy;
  }[];
  readonly raisedMinor: number;
  /** The money record id of the event's or forum's venue, on the journal's `campaigns:purchase`. */
  readonly eventMoneyId: string | null;
  /** The forum's town hall row (meetings engine): who came, what they asked, what the host answered. */
  readonly townHall: TownHallRow | null;
  readonly interview: InterviewRow | null;
  /** The donor meeting held (donor-meeting): its event id, the host and the guests who came. */
  readonly donorMeeting: {
    readonly id: string;
    readonly hostId: string;
    readonly guestIds: readonly string[];
  } | null;
}

export interface CampaignDayOptions {
  /** For `interview`: which outlet to ask (default: the first with room). */
  readonly outletId?: string;
  /** For `interview`: the player's answers; leave out to answer later with `answerInterview`. */
  readonly answers?: readonly InterviewAnswer[];
  /** For `interview`: answer an invitation already waiting. */
  readonly interviewId?: string;
  /**
   * For `forum`: the player's answers by question (questions left out are
   * declined); leave out to answer from the platform, declining what it does
   * not hold.
   */
  readonly forumAnswers?: Readonly<Record<string, number | null>>;
  /**
   * A world candidate's day (rivals take the same choices as
   * the player): the same acts for any living candidate on the ballot, whose
   * money and doors the campaign engine runs, never the controlled person's.
   */
  readonly world?: boolean;
  /** The hours this day takes, where a candidate's own day leaves fewer or more than the player's. */
  readonly hours?: number;
}

const HOURS_PARAMETER: Readonly<Record<CampaignDayKind, string>> = {
  canvass: "playerCanvassHours",
  event: "playerEventHours",
  forum: "playerForumHours",
  interview: "playerInterviewHours",
  "raise-money": "playerCallTimeHours",
  "donor-meeting": "playerDonorMeetingHours",
  rest: "playerRestHours",
};

const elections = (api: CoreAPI, name: string) =>
  api.moduleState(ELECTIONS_MODULE_ID).table(name);
const ageOn = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));

/** The town's households, full and counted, as the campaign engine's doors walk them. */
function townHouseholdCount(api: CoreAPI): number {
  const core = api.state as CoreState;
  const town = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string } | undefined
  )?.townPlaceId;
  if (!town) return 0;
  const ids = new Set<string>();
  for (const id of core.peopleByPlace.get(town) ?? []) {
    const person = core.people.get(id);
    if (person?.alive && core.households.has(person.householdId))
      ids.add(person.householdId);
  }
  for (const h of residentsRuntime(core)?.store.liveHouseholds() ?? [])
    if (h.placeId === town && !core.households.has(h.id)) ids.add(h.id);
  return ids.size;
}

function contextOf(api: CoreAPI, filingId: string, world = false) {
  const filing = elections(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
  if (!filing) throw new Error(`No filing ${filingId}`);
  const contest = elections(api, "contests").get(
    filing.contestId,
  ) as unknown as ContestRow;
  const open =
    standing(filing) &&
    (world
      ? !!api.state.people.get(filing.personId)?.alive &&
        filing.personId !== (api.state as CoreState).playerId
      : filing.personId === (api.state as CoreState).playerId) &&
    filing.filedOn <= api.state.date &&
    api.state.date <= contest.electionDate;
  return { filing, contest, open };
}

function weekRoom(api: CoreAPI, outletId: string): number {
  const since = (() => {
    const d = new Date(`${api.state.date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().slice(0, 10);
  })();
  const taken = (
    api
      .moduleState(PRESS_MODULE_ID)
      .table("interviews")
      .query("byOutlet", [outletId]) as unknown as InterviewRow[]
  ).filter((i) => i.status !== "declined" && i.date >= since).length;
  return Math.max(0, pressParameter("interviewsPerWeek") - taken);
}

/** Who the player could ask for money today: reachable adults who haven't given. */
function peopleToAsk(api: CoreAPI, campaign: CampaignRow, world = false) {
  // The controlled person's money moves only by their own choice, so a world
  // candidate's asks skip them.
  const playerId = (api.state as CoreState).playerId;
  const adultAge = api.parameter("votingAge");
  const pool = reachablePeople(api, campaign).filter(
    (id) => !world || id !== playerId,
  );
  const askable = pool.filter((id) => {
    const person = api.state.people.get(id);
    return (
      !!person?.alive &&
      person.tier !== "husk" &&
      ageOn(person.birthDate, api.state.date) >= adultAge &&
      !giftOf(api, campaign.filingId, id)
    );
  });
  return { pool, askable };
}

const asksPerSession = (hours: number) =>
  Math.floor(hours * campaignParameter("playerAsksPerCallHour"));

/**
 * The player's choices for a campaign day, in a fixed order, each with the
 * record facts that make it available or not. Empty outside the window
 * between filing and election day, or for a filing that is not the player's.
 */
/**
 * Why the records keep a campaign outing from the player today, as the key of
 * its words in the screen's controls and the record figures they show.
 */
export function whyNotToday(
  choice: CampaignDayChoice,
): { key: string; priceMinor?: number; cashMinor?: number } | undefined {
  switch (choice.kind) {
    case "canvass":
      return choice.facts.households > 0 ? undefined : { key: "noHouseholds" };
    case "event":
      if (choice.facts.platformStances === 0) return { key: "noPlatform" };
      return choice.facts.cashMinor < choice.facts.venuePriceMinor
        ? {
            key: "eventMoney",
            priceMinor: choice.facts.venuePriceMinor,
            cashMinor: choice.facts.cashMinor,
          }
        : undefined;
    case "forum":
      if (!choice.facts.meetingsKept) return { key: "noMeetings" };
      if (choice.facts.platformStances === 0) return { key: "noPlatform" };
      if (choice.facts.heldTodayId) return { key: "forumHeld" };
      return choice.facts.cashMinor < choice.facts.venuePriceMinor
        ? {
            key: "eventMoney",
            priceMinor: choice.facts.venuePriceMinor,
            cashMinor: choice.facts.cashMinor,
          }
        : undefined;
    case "interview": {
      const { outletsHere, outletsDone, outletsFull } = choice.facts;
      if (outletsHere === 0) return { key: "noOutlet" };
      if (outletsDone === outletsHere) return { key: "interviewed" };
      // The rest have no room this week, or (television) want a better-known candidate.
      return { key: outletsFull > 0 ? "outletsFull" : "notKnown" };
    }
    case "raise-money":
      return {
        key: choice.facts.reachable === 0 ? "nobodyReached" : "allGave",
      };
    case "donor-meeting":
      return choice.facts.hostId ? undefined : { key: "noHost" };
    default:
      return undefined;
  }
}

/** One candidate's standing in a contest, read from the campaign engine's cause rows. */
export interface CandidateStanding {
  readonly filingId: string;
  readonly candidateId: string;
  readonly name: string;
  /** Whether this is the person asking. */
  readonly you: boolean;
  readonly acts: readonly {
    readonly act: string;
    readonly reached: number;
    readonly warmer: number;
    readonly cooler: number;
  }[];
  /** Voters reached, each once however many acts reached them. */
  readonly reached: number;
  readonly warmer: number;
  readonly cooler: number;
}

/**
 * The causes a contest turns on: for each candidate on its ballot, the acts
 * that reached voters (doors, speeches, ads, a retelling) with how many were
 * reached and how many came away warmer or cooler, and the same read once per
 * voter (a voter reached by two acts counts once), which is what the race's
 * standing sentences say. Read from the cause rows the campaign engine kept.
 */
export function contestStanding(
  api: CoreAPI,
  contestId: string,
  personId: string,
): readonly CandidateStanding[] {
  const filings = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byContest", [contestId]) as unknown as FilingRow[]
  ).filter(standing);
  return filings.map((filing) => {
    const rows = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("causes")
      .query("byCandidate", [filing.personId]) as unknown as CauseRow[];
    const acts = new Map<
      string,
      { act: string; reached: number; warmer: number; cooler: number }
    >();
    // Each voter's warmth moved by the sum of what every act did to it.
    const moved = new Map<string, number>();
    // Closed races' causes, folded with the same sums in the same order.
    for (const summary of causeSummariesOf(api, filing.personId)) {
      for (const [act, count] of Object.entries(summary.acts)) {
        const entry = acts.get(act) ?? {
          act,
          reached: 0,
          warmer: 0,
          cooler: 0,
        };
        entry.reached += count.reached;
        entry.warmer += count.warmer;
        entry.cooler += count.cooler;
        acts.set(act, entry);
      }
      moved.set(summary.voterId, summary.moved);
    }
    for (const row of rows) {
      const entry = acts.get(row.act) ?? {
        act: row.act,
        reached: 0,
        warmer: 0,
        cooler: 0,
      };
      entry.reached += 1;
      if (row.warmthAfter > row.warmthBefore) entry.warmer += 1;
      else if (row.warmthAfter < row.warmthBefore) entry.cooler += 1;
      acts.set(row.act, entry);
      moved.set(
        row.voterId,
        (moved.get(row.voterId) ?? 0) + (row.warmthAfter - row.warmthBefore),
      );
    }
    const person = api.state.people.get(filing.personId);
    return {
      filingId: filing.id,
      candidateId: filing.personId,
      name: person
        ? `${person.givenName} ${person.familyName}`
        : filing.personId,
      you: filing.personId === personId,
      acts: [...acts.values()].sort((a, b) => a.act.localeCompare(b.act)),
      reached: moved.size,
      warmer: [...moved.values()].filter((d) => d > 0).length,
      cooler: [...moved.values()].filter((d) => d < 0).length,
    };
  });
}

export function campaignDayChoices(
  api: CoreAPI,
  filingId: string,
  world = false,
): readonly CampaignDayChoice[] {
  const { filing, open } = contextOf(api, filingId, world);
  if (!open) return [];
  const campaign = campaignFor(api, filingId);
  const hours = (kind: CampaignDayKind) =>
    campaignParameter(HOURS_PARAMETER[kind]);

  const households = townHouseholdCount(api);
  const doorsLeft = Math.max(
    0,
    households - doorsKnockedOf(api, campaign.id).length,
  );

  const cash =
    api.state.organizations.get(campaign.organizationId)?.liquidMinor ?? 0;
  const price = unitPrice(api, "event-venue");
  const candidateAlive = !!api.state.people.get(campaign.candidateId)?.alive;
  // A forum is the meetings engine's town hall, hosted by the candidate: one
  // a day, read by its id (no scan).
  const meetingsKept = api.state.modules.has(MEETINGS_MODULE_ID);
  const heldTodayId =
    meetingsKept &&
    api
      .moduleState(MEETINGS_MODULE_ID)
      .table("townHalls")
      .get(townHallId(campaign.candidateId, api.state.date))
      ? townHallId(campaign.candidateId, api.state.date)
      : null;

  const invited = interviewsFor(api, filing.personId)
    .filter((i) => i.filingId === filingId && i.status === "invited")
    .map((i) => i.id);
  let outletsDone = 0,
    outletsFull = 0;
  const here = outletsHere(api);
  const outlets = here.flatMap((outlet) => {
    const roomLeft = weekRoom(api, outlet.id);
    const done = interviewsFor(api, filing.personId).some(
      (i) =>
        i.outletId === outlet.id &&
        i.filingId === filingId &&
        i.status !== "declined",
    );
    if (done) outletsDone += 1;
    else if (roomLeft <= 0) outletsFull += 1;
    const bar =
      outlet.kind !== "television" ||
      newsworthiness(api, filing) >= pressParameter("televisionBar");
    return roomLeft > 0 && !done && bar
      ? [{ outletId: outlet.id, roomLeft }]
      : [];
  });

  const { pool, askable } = peopleToAsk(api, campaign, world);
  const gifts = pool.length - askable.length;
  // A world candidate's day (`rivalDay`) never takes the donor meeting, so
  // their turn reads no host: the choice stands unavailable for them.
  // stopgapId: SG-GOV-rival-donor-meeting
  const hostId =
    candidateAlive && !world ? donorMeetingHost(api, campaign) : null;

  return [
    {
      kind: "canvass",
      filingId,
      hours: hours("canvass"),
      // Every door knocked, the canvass goes round again: open while the
      // town has a door.
      available: households > 0,
      facts: {
        households,
        doorsLeft,
        doorsKnocked: campaign.doorsKnockedCount ?? 0,
        doorsThisShift: Math.floor(
          hours("canvass") * campaignParameter("doorsPerCanvasserHour"),
        ),
      },
    },
    {
      kind: "event",
      filingId,
      hours: hours("event"),
      available:
        candidateAlive && campaign.platform.length > 0 && cash >= price,
      facts: {
        venuePriceMinor: price,
        cashMinor: cash,
        platformStances: campaign.platform.length,
      },
    },
    {
      kind: "forum",
      filingId,
      hours: hours("forum"),
      // The residents bring the questions and the candidate answers from
      // their platform, so a forum needs one, as an event does; then the
      // venue's evening and a day the candidate has not hosted one.
      available:
        candidateAlive &&
        meetingsKept &&
        campaign.platform.length > 0 &&
        !heldTodayId &&
        cash >= price,
      facts: {
        venuePriceMinor: price,
        cashMinor: cash,
        meetingsKept,
        platformStances: campaign.platform.length,
        heldTodayId,
      },
    },
    {
      kind: "interview",
      filingId,
      hours: hours("interview"),
      available: invited.length > 0 || outlets.length > 0,
      facts: {
        invitedInterviewIds: invited,
        outlets,
        outletsHere: here.length,
        outletsDone,
        outletsFull,
      },
    },
    {
      kind: "raise-money",
      filingId,
      hours: hours("raise-money"),
      available: askable.length > 0,
      facts: {
        peopleLeft: askable.length,
        reachable: pool.length,
        giftsSoFar: gifts,
        asksThisSession: Math.min(
          askable.length,
          asksPerSession(hours("raise-money")),
        ),
      },
    },
    {
      kind: "donor-meeting",
      filingId,
      hours: hours("donor-meeting"),
      available: hostId !== null,
      facts: {
        hostId,
        hostCircle: hostId ? hostCircle(api, campaign, hostId).length : 0,
        heldSoFar: campaign.donorMeetingHostIds?.length ?? 0,
      },
    },
    {
      kind: "rest",
      filingId,
      hours: hours("rest"),
      available: true,
      facts: {},
    },
  ];
}

/**
 * Take one of the day's choices. Throws when the records say it is not
 * available. Every dollar moves through the engine's journal paths.
 */
export function takeCampaignDayChoice(
  api: CoreAPI,
  filingId: string,
  choice: CampaignDayKind,
  options: CampaignDayOptions = {},
): CampaignDayResult {
  const world = options.world ?? false;
  const offered = campaignDayChoices(api, filingId, world).find(
    (c) => c.kind === choice,
  );
  if (!offered?.available)
    throw new Error(`Campaign day choice not available: ${choice}`);
  // While the petition circulates, the candidate's day starts with asking
  // the people closest to them to sign.
  askCircleToSign(api, filingId);
  const campaign = campaignFor(api, filingId);
  const player = campaign.candidateId;
  const hours = options.hours ?? offered.hours;
  const date = api.state.date;
  const spendTime = () =>
    api.recordActivityTime(player, "campaign", hours * 60, {
      tag: "SOURCED",
      citation: `Campaign ${campaign.id}`,
      asOf: date,
    });
  const base: CampaignDayResult = {
    kind: choice,
    filingId,
    date,
    hours,
    causeIds: [],
    doorsKnocked: 0,
    asked: 0,
    giftIds: [],
    answers: [],
    raisedMinor: 0,
    eventMoneyId: null,
    townHall: null,
    interview: null,
    donorMeeting: null,
  };

  if (choice === "canvass") {
    const before = campaign.doorsKnockedCount ?? 0;
    // knockDoors records the player's hours itself.
    const met = knockDoors(api, {
      filingId,
      canvasserId: player,
      hours,
      // A world candidate's door reaches residents as a count; only the
      // player's own campaign fills them in on meeting.
      fillCounted: !world,
    });
    return {
      ...base,
      causeIds: met.map((c) => c.id),
      doorsKnocked:
        (campaignFor(api, filingId).doorsKnockedCount ?? 0) - before,
    };
  }

  if (choice === "event") {
    const moneyId = `event:${filingId}:${date}:${campaign.spentMinor}`;
    const causes = holdEvent(api, filingId);
    spendTime();
    return {
      ...base,
      causeIds: causes.map((c) => c.id),
      eventMoneyId: moneyId,
    };
  }

  if (choice === "forum") {
    // The campaign rents the evening as it does an event's; the room is the
    // meetings engine's town hall, filled by each resident's own drive to
    // come (`townHallDrives`), whether or not the campaign had reached them.
    const { moneyId } = rentVenue(api, filingId, "forum");
    const hall = holdTownHall(api, {
      hostId: player,
      filingId,
      ...(options.forumAnswers ? { answers: options.forumAnswers } : {}),
    });
    spendTime();
    // While the petition circulates, those who came are asked to sign, as
    // at an event.
    if (petitionCirculating(api, filingId))
      for (const id of hall.attendeeIds) {
        const person = api.state.people.get(id);
        if (person) askToSign(api, filingId, person, "event");
      }
    return {
      ...base,
      causeIds: hall.causeIds,
      eventMoneyId: moneyId,
      townHall: hall,
    };
  }

  if (choice === "interview") {
    const waiting =
      options.interviewId ??
      (options.outletId
        ? undefined
        : offered.kind === "interview"
          ? offered.facts.invitedInterviewIds[0]
          : undefined);
    let row: InterviewRow | undefined = waiting
      ? interviewsFor(api, player).find((i) => i.id === waiting)
      : undefined;
    if (!row || row.status !== "invited") {
      const outletId =
        options.outletId ??
        (offered.kind === "interview"
          ? offered.facts.outlets[0]?.outletId
          : undefined);
      if (!outletId) throw new Error("No outlet to ask for an interview");
      row = requestInterview(api, { filingId, outletId });
    }
    if (row.status === "invited") {
      spendTime();
      if (options.answers) row = answerInterview(api, row.id, options.answers);
    }
    return { ...base, interview: row };
  }

  if (choice === "raise-money") {
    const { pool, askable } = peopleToAsk(api, campaign, world);
    const asks = Math.min(askable.length, asksPerSession(hours));
    // Walk the list from where the last session stopped (the campaign's own
    // cursor), skipping those who have already given.
    const start = pool.length ? (campaign.askCursor ?? 0) % pool.length : 0;
    const askedIds: string[] = [];
    let steps = 0;
    for (; steps < pool.length && askedIds.length < asks; steps += 1) {
      const id = pool[(start + steps) % pool.length]!;
      if (askable.includes(id)) askedIds.push(id);
    }
    spendTime();
    let raised = 0;
    const giftIds: string[] = [];
    const answers: {
      personId: string;
      givenMinor: number;
      why: DonationWhy;
    }[] = [];
    for (const id of askedIds) {
      const { givenMinor: amount, why } = donationAnswer(api, filingId, id);
      answers.push({ personId: id, givenMinor: amount, why });
      if (amount > 0) {
        raised += amount;
        giftIds.push(`${filingId}|${id}`);
      }
    }
    const latest = campaignFor(api, filingId);
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .put({
        ...latest,
        askCursor: pool.length ? (start + steps) % pool.length : 0,
      } as unknown as ModuleRow);
    return {
      ...base,
      asked: askedIds.length,
      giftIds,
      answers,
      raisedMinor: raised,
    };
  }

  if (choice === "donor-meeting") {
    const hostId =
      offered.kind === "donor-meeting" ? offered.facts.hostId : null;
    const meeting = hostId ? holdDonorMeeting(api, filingId, hostId) : null;
    if (!meeting) throw new Error("No donor meeting could be held");
    spendTime();
    return {
      ...base,
      causeIds: meeting.causes.map((c) => c.id),
      asked: meeting.answers.length,
      giftIds: meeting.answers
        .filter((a) => a.givenMinor > 0)
        .map((a) => `${filingId}|${a.personId}`),
      answers: meeting.answers,
      raisedMinor: meeting.raisedMinor,
      donorMeeting: {
        id: meeting.id,
        hostId: meeting.hostId,
        guestIds: meeting.guestIds,
      },
    };
  }

  // rest: no campaign act and no activity record; the day is the player's own.
  return base;
}

/** Days left before the election, for a screen's header. */
export function campaignDaysLeft(api: CoreAPI, filingId: string): number {
  const { contest } = contextOf(api, filingId);
  return Math.max(0, daysBetween(api.state.date, contest.electionDate));
}
