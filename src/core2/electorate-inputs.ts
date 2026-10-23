/**
 * What the electorate the world doesn't name reads from the world before it
 * votes (`electorate.ts`): each candidate's public standing (incumbency,
 * offices held, the campaign's books, the officeholder's
 * votes) and the race's conditions (the cycle, the national economy against
 * the opening, the town's jobs and crime). Every effect is sized in research
 * terms (two-party vote share in an evenly split electorate) and turned into
 * appeal on the lean scale once. Pure readings: nothing here changes the
 * world.
 */
import { storyDelivered } from "./modules/news";
import data from "./data/electorate/parameters.json" with { type: "json" };
import { partySide } from "./appointments";
import { campaignParameter } from "./campaign-views";
import {
  electionLawTurnoutCost,
  felonyDisenfranchisedShare,
} from "./law-reach/group-a-voting";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { crimeChange } from "./modules/crime";
import { OUTCOME_WEB_MODULE_ID, placeOutcome } from "./modules/outcome-web";
import { recordAppeal } from "./modules/record";
import type { CoreAPI, PersonState } from "./types";

const PARAMS = (
  data as unknown as { parameters: Record<string, { value: number }> }
).parameters;

/** One number from the electorate's parameter table. */
export function electorateParameter(key: string): number {
  const row = PARAMS[key];
  if (!row) throw new Error(`Unknown electorate parameter: ${key}`);
  return row.value;
}

const TYPICAL_SPEND = (
  data as unknown as {
    typicalSpendPerVoteMinor: { byFamily: Record<string, number> };
  }
).typicalSpendPerVoteMinor.byFamily;

/** Typical spending per two-party vote for an office family, cents. */
export function typicalSpendPerVote(family: string): number {
  return TYPICAL_SPEND[family] ?? TYPICAL_SPEND.stateLegislative ?? 0;
}

/** Appeal on the lean scale for a share of the two-party vote. */
export function appealOfShare(share: number): number {
  return share * electorateParameter("appealPerShare");
}

/** What the voters know of one candidate, from the records. */
export interface CandidateInputs {
  readonly id: string;
  readonly party: string | null;
  /** -1 the Democratic family, +1 Republican, 0 otherwise. */
  readonly side: number;
  readonly incumbent: boolean;
  /** Has held elected office (another seat, or this one before). */
  readonly experienced: boolean;
  /** What the campaign's books show it spent; null where the world records no campaign (the typical race). */
  readonly spentMinor: number | null;
  /** The officeholder's recorded votes and promises, weighed at the race's lean (record.ts units). */
  readonly record: number;
  /** Of the party holding the presidency. */
  readonly presidentsParty: boolean;
  /** Of the party holding this seat. */
  readonly seatPartyHolder: boolean;
}

/** The exact jobs reading a race consumed, even if the web row is later refreshed. */
export interface UnemploymentReading {
  readonly value: number;
  readonly base: number;
  readonly webRecordId: string;
  readonly engineRecordId: string | null;
  readonly openingRecordId: string;
  /** The story that told the town of it. */
  readonly heardInStoryId?: string;
}

/** The conditions every voter in the race sees. */
export interface RaceConditions {
  readonly cycle: "presidential" | "midterm" | "off-cycle";
  /** Federal offices feel the national economy whole; state offices in part. */
  readonly federal: boolean;
  /** Typical spending per two-party vote for the race's office, cents. */
  readonly typicalSpendPerVote: number;
  /** The race's two-party voters at the opening (sizes the typical campaign). */
  readonly raceVotes: number;
  readonly national: {
    readonly unemploymentChange: number;
    readonly inflationChange: number;
  };
  /** The town, whose voters (and the place around it) feel its jobs and crime. */
  readonly town: {
    readonly placeId: string;
    readonly unemploymentChange: number;
    readonly unemploymentReading?: UnemploymentReading;
    readonly crimeChange: number;
  } | null;
}

/** One candidate's public standing, as vote shares in an evenly split electorate. */
export interface CandidateReasons {
  readonly id: string;
  readonly party: string | null;
  readonly side: number;
  readonly incumbency: number;
  readonly experience: number;
  readonly spending: number;
  readonly record: number;
  readonly economy: number;
  readonly midterm: number;
  /** Felt by the town's own voters (and the place around it) only. */
  readonly local: number;
  readonly localUnemployment?: UnemploymentReading & {
    readonly contribution: number;
  };
  /** Everything but `local`. */
  readonly total: number;
}

/** Each candidate's public standing, from their inputs and the race's conditions. */
export function candidateReasons(
  candidate: CandidateInputs,
  conditions: RaceConditions,
): CandidateReasons {
  const p = electorateParameter;
  const typical =
    conditions.typicalSpendPerVote * Math.max(1, conditions.raceVotes);
  const spending =
    candidate.spentMinor === null || !typical
      ? 0
      : p("spendingSharePerLogUnit") *
        Math.log(
          Math.max(
            candidate.spentMinor,
            p("spendingFloorShareOfTypical") * typical,
          ) / typical,
        );
  const economy = candidate.presidentsParty
    ? -(conditions.federal ? 1 : p("downBallotNationalShare")) *
      (p("unemploymentShare") * conditions.national.unemploymentChange +
        p("inflationShare") * conditions.national.inflationChange)
    : 0;
  const midterm =
    candidate.presidentsParty && conditions.cycle === "midterm"
      ? -campaignParameter("midtermSwing")
      : 0;
  const local =
    candidate.seatPartyHolder && conditions.town
      ? -(
          p("localUnemploymentShare") * conditions.town.unemploymentChange +
          p("localCrimeShare") *
            (conditions.town.crimeChange / p("crimeChangeUnit"))
        )
      : 0;
  const parts = {
    incumbency: candidate.incumbent ? campaignParameter("incumbencyShare") : 0,
    experience:
      !candidate.incumbent && candidate.experienced
        ? p("experiencedCandidateShare")
        : 0,
    spending,
    record: p("recordShareWeight") * candidate.record,
    economy,
    midterm,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    id: candidate.id,
    party: candidate.party,
    side: candidate.side,
    ...parts,
    local,
    ...(conditions.town?.unemploymentReading
      ? {
          localUnemployment: {
            ...conditions.town.unemploymentReading,
            contribution: candidate.seatPartyHolder
              ? -p("localUnemploymentShare") *
                conditions.town.unemploymentChange
              : 0,
          },
        }
      : {}),
    total,
  };
}

/** The national economy against the opening: unemployment and inflation, in points. */
export function nationalEconomyChange(api: CoreAPI): {
  unemploymentChange: number;
  inflationChange: number;
} {
  if (!api.state.modules.has("macro"))
    return { unemploymentChange: 0, inflationChange: 0 };
  const store = api.moduleState("macro");
  const state = store.table("state").get("macro:state") as unknown as
    { openingMonth: string; latestMonth: string } | undefined;
  if (!state) return { unemploymentChange: 0, inflationChange: 0 };
  const month = (m: string) =>
    store.table("months").get(`macro-month:${m}`) as unknown as
      { unemploymentPct: number; inflationPct: number } | undefined;
  const opening = month(state.openingMonth),
    latest = month(state.latestMonth);
  if (!opening || !latest) return { unemploymentChange: 0, inflationChange: 0 };
  return {
    unemploymentChange: latest.unemploymentPct - opening.unemploymentPct,
    inflationChange: latest.inflationPct - opening.inflationPct,
  };
}

/** The election laws' cost and the barred share at the opening, per world. */
const openings = new WeakMap<object, { lawCost: number; barred: number }>();

function typicalVoter(api: CoreAPI) {
  const age = electorateParameter("typicalVoterAgeYears");
  const year = Number(api.state.date.slice(0, 4)) - age;
  return {
    id: "electorate:typical-voter",
    traits: {},
    birthDate: `${String(year).padStart(4, "0")}${api.state.date.slice(4)}`,
  };
}

function lawCostToday(api: CoreAPI): number {
  return electionLawTurnoutCost(
    api,
    typicalVoter(api),
    electorateParameter("typicalWeeklyWorkMinutes"),
  );
}

/** Remember the opening's election laws, which the 2024 turnout already reflects. */
export function rememberOpeningElectorate(api: CoreAPI): void {
  if (openings.has(api.state)) return;
  openings.set(api.state, {
    lawCost: lawCostToday(api),
    barred: felonyDisenfranchisedShare(api),
  });
}

/**
 * Against the opening's election laws (which the 2024 turnout every place is
 * sized from already reflects): how much more voting costs a typical voter
 * in the town's state today, and the share barred today and at the opening.
 */
export function electorateChange(api: CoreAPI): {
  readonly lawCost: number;
  readonly barred: number;
  readonly openingBarred: number;
} {
  rememberOpeningElectorate(api);
  const opening = openings.get(api.state)!;
  return {
    lawCost: lawCostToday(api) - opening.lawCost,
    barred: felonyDisenfranchisedShare(api),
    openingBarred: opening.barred,
  };
}

/** The party holding the presidency, from the seated president. */
export function presidentSide(api: CoreAPI): number {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return 0;
  const term = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
  )[0];
  return partySide(term?.party ?? null);
}

/**
 * The race's conditions. `townPlaceId` names the town whose voters (and the
 * place around it) feel its jobs and crime; `raceVotes` sizes the race.
 */
export function raceConditions(
  api: CoreAPI,
  input: {
    readonly federal: boolean;
    readonly family: string;
    readonly cycle: RaceConditions["cycle"];
    readonly raceVotes: number;
    readonly townPlaceId: string | null;
  },
): RaceConditions {
  rememberOpeningElectorate(api);
  // The national mood is the economy and the midterm penalty; no record of
  // the president's approval exists to read it from.
  // stopgapId: SG-GOV-electorate-approval
  api.stopgap("SG-GOV-electorate-approval");
  return {
    cycle: input.cycle,
    federal: input.federal,
    typicalSpendPerVote: typicalSpendPerVote(input.family),
    raceVotes: input.raceVotes,
    national: nationalEconomyChange(api),
    town: input.townPlaceId
      ? {
          placeId: input.townPlaceId,
          ...townConditions(api, input.townPlaceId),
        }
      : null,
  };
}

/**
 * The town's unemployment (points) against the outcome web's base, and crime
 * (share above its first month) from the victimization records, as the town
 * has heard of them: a measure counts only once a story carrying it has
 * reached someone who lives there (the story is cited), since nobody
 * attributes a change they have not learned of. Where the world keeps no
 * news, nothing is heard and no change reaches the vote.
 */
function townConditions(api: CoreAPI, placeId: string) {
  if (!api.state.modules.has(OUTCOME_WEB_MODULE_ID))
    return { unemploymentChange: 0, crimeChange: 0 };
  const jobsStory = storyDelivered(api, placeId, "labor.unemployment-pct");
  const jobs = jobsStory
    ? placeOutcome(api, placeId, "labor.unemployment-pct")
    : undefined;
  const crimeHeard = [
    "crime.burglary",
    "crime.robbery",
    "crime.assault",
    "crime.vandalism",
  ].some((measure) => storyDelivered(api, placeId, measure));
  return {
    unemploymentChange:
      jobs && jobs.base !== undefined ? jobs.value - jobs.base : 0,
    ...(jobs && jobs.base !== undefined
      ? {
          unemploymentReading: {
            value: jobs.value,
            base: jobs.base,
            webRecordId: jobs.recordId,
            engineRecordId: jobs.engineRecordId,
            openingRecordId: placeId,
            heardInStoryId: jobsStory!.storyId,
          },
        }
      : {}),
    // The crimes that happened to the town's households, from the victimization records.
    crimeChange: crimeHeard ? crimeChange(api, placeId) : 0,
  };
}

/** Whether a person has held elected office before. */
function heldOffice(api: CoreAPI, personId: string): boolean {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return false;
  return (
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byPerson", [personId]) as unknown as TermRow[]
    ).length > 0
  );
}

/**
 * One candidate's inputs from the records. A named person brings their own
 * offices, campaign books and votes (a scandal is read by each voter from
 * the news that reached them, in voting.ts); an official the world doesn't
 * name yet is a typical candidate of their party (their campaign spends the
 * typical race's amount), with an incumbent's standing where they hold the
 * seat.
 */
export function candidateInputs(
  api: CoreAPI,
  input: {
    readonly id: string;
    readonly party: string | null;
    readonly filingId: string | null;
    readonly incumbent: boolean;
    readonly seatParty: string | null;
    /** The race's own lean, -1 to 1, at which the record is weighed. */
    readonly raceLean: number;
    /** A side other than the party label's (an independent who caucuses with a party). */
    readonly side?: number;
    /** The seat holder's side, where it isn't the party label's. */
    readonly seatSide?: number;
  },
): CandidateInputs {
  const side = input.side ?? partySide(input.party);
  const person = api.state.people.get(input.id);
  const named = Boolean(person);
  const campaign =
    input.filingId && api.state.modules.has(CAMPAIGNS_MODULE_ID)
      ? (api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .get(input.filingId) as unknown as { spentMinor: number } | undefined)
      : undefined;
  const record =
    named && input.incumbent
      ? recordAppeal(
          api,
          { id: "electorate:typical-voter" } as unknown as PersonState,
          input.id,
          input.raceLean,
          true,
        ).total
      : 0;
  const president = presidentSide(api);
  return {
    id: input.id,
    party: input.party,
    side,
    incumbent: input.incumbent,
    experienced: input.incumbent || (named && heldOffice(api, input.id)),
    // The campaign's books, by one rule for every candidate, named or not:
    // a campaign the world runs is read as it spent; a candidate with no
    // campaign in the world runs the typical race's.
    spentMinor: campaign ? campaign.spentMinor : null,
    record,
    presidentsParty: side !== 0 && side === president,
    seatPartyHolder:
      side !== 0 &&
      input.seatParty !== null &&
      side === (input.seatSide ?? partySide(input.seatParty)),
  };
}
