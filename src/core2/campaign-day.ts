/**
 * A campaign day for the player (owner, Oct 14, 2026): a handful of choices,
 * each an act read from the records, no more than that. Knock on doors in a
 * neighborhood, hold an event, give an interview, raise money, rest.
 *
 * Nothing here is a new mechanic. Each choice runs the campaign engine's own
 * act (`knockDoors`, `holdEvent`, `requestInterview`, `askForDonation`) with
 * the player's own hours; availability is read from the records the engine
 * keeps (doors knocked, the campaign's cash, the press desk's week, the gifts
 * already given). No choice is decided by a roll. Choices carry ids and
 * numbers only; the English engine words them.
 */
import { residentsRuntime } from "./modules/residents";
import { campaignParameter } from "./campaign-views";
import unitPrices from "../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };
import {
  CAMPAIGNS_MODULE_ID,
  askForDonation,
  campaignFor,
  doorsKnockedOf,
  giftOf,
  holdEvent,
  knockDoors,
  reachablePeople,
  type CampaignRow,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
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
import type { CoreAPI, CoreState } from "./types";
import type { ModuleRow } from "./module-data";

export type CampaignDayKind =
  "canvass" | "event" | "interview" | "raise-money" | "rest";

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
        readonly doorsLeft: number;
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
      readonly kind: "interview";
      readonly facts: {
        /** Interviews an outlet has invited the player to answer. */
        readonly invitedInterviewIds: readonly string[];
        /** Outlets with room this week that would take the ask. */
        readonly outlets: readonly {
          readonly outletId: string;
          readonly roomLeft: number;
        }[];
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
  readonly raisedMinor: number;
  /** The money record id of the event's venue, on the journal's `campaigns:purchase`. */
  readonly eventMoneyId: string | null;
  readonly interview: InterviewRow | null;
}

export interface CampaignDayOptions {
  /** For `interview`: which outlet to ask (default: the first with room). */
  readonly outletId?: string;
  /** For `interview`: the player's answers; leave out to answer later with `answerInterview`. */
  readonly answers?: readonly InterviewAnswer[];
  /** For `interview`: answer an invitation already waiting. */
  readonly interviewId?: string;
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
  interview: "playerInterviewHours",
  "raise-money": "playerCallTimeHours",
  rest: "playerRestHours",
};

const elections = (api: CoreAPI, name: string) =>
  api.moduleState(ELECTIONS_MODULE_ID).table(name);
const ageOn = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

const eventVenuePrice = () =>
  (
    unitPrices as unknown as {
      prices: Record<string, { priceMinorUnits: number }>;
    }
  ).prices["event-venue"]!.priceMinorUnits;

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
    filing.status === "on-ballot" &&
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
  const pool = reachablePeople(api, campaign).filter(
    (id) => !world || id !== playerId,
  );
  const askable = pool.filter((id) => {
    const person = api.state.people.get(id);
    return (
      !!person?.alive &&
      person.tier !== "husk" &&
      ageOn(person.birthDate, api.state.date) >= 18 &&
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

  const knocked = doorsKnockedOf(api, campaign.id).length;
  const doorsLeft = Math.max(0, townHouseholdCount(api) - knocked);

  const cash =
    api.state.organizations.get(campaign.organizationId)?.liquidMinor ?? 0;
  const price = eventVenuePrice();
  const candidateAlive = !!api.state.people.get(campaign.candidateId)?.alive;

  const invited = interviewsFor(api, filing.personId)
    .filter((i) => i.filingId === filingId && i.status === "invited")
    .map((i) => i.id);
  const outlets = outletsHere(api).flatMap((outlet) => {
    const roomLeft = weekRoom(api, outlet.id);
    const done = interviewsFor(api, filing.personId).some(
      (i) =>
        i.outletId === outlet.id &&
        i.filingId === filingId &&
        i.status !== "declined",
    );
    const bar =
      outlet.kind !== "television" ||
      newsworthiness(api, filing) >= pressParameter("televisionBar");
    return roomLeft > 0 && !done && bar
      ? [{ outletId: outlet.id, roomLeft }]
      : [];
  });

  const { pool, askable } = peopleToAsk(api, campaign, world);
  const gifts = pool.length - askable.length;

  return [
    {
      kind: "canvass",
      filingId,
      hours: hours("canvass"),
      available: doorsLeft > 0,
      facts: {
        doorsLeft,
        doorsKnocked: knocked,
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
      kind: "interview",
      filingId,
      hours: hours("interview"),
      available: invited.length > 0 || outlets.length > 0,
      facts: { invitedInterviewIds: invited, outlets },
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
    raisedMinor: 0,
    eventMoneyId: null,
    interview: null,
  };

  if (choice === "canvass") {
    const before = doorsKnockedOf(api, campaign.id).length;
    // knockDoors records the player's hours itself.
    const met = knockDoors(api, { filingId, canvasserId: player, hours });
    return {
      ...base,
      causeIds: met.map((c) => c.id),
      doorsKnocked: doorsKnockedOf(api, campaign.id).length - before,
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
    for (const id of askedIds) {
      const amount = askForDonation(api, filingId, id);
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
    return { ...base, asked: askedIds.length, giftIds, raisedMinor: raised };
  }

  // rest: no campaign act and no activity record; the day is the player's own.
  return base;
}

/** Days left before the election, for a screen's header. */
export function campaignDaysLeft(api: CoreAPI, filingId: string): number {
  const { contest } = contextOf(api, filingId);
  return Math.max(0, daysBetween(api.state.date, contest.electionDate));
}
