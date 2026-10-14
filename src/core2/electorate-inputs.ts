/**
 * What the simulated electorate reads from the world before it counts a race
 * (`electorate-blocks.ts`): each candidate's record (incumbency, offices held,
 * a public scandal, the campaign's books, the officeholder's votes) and the
 * race's conditions (the cycle, the national economy against the opening,
 * the town's jobs and crime, the election laws in force against the
 * opening's). Pure readings: nothing here changes the world.
 */
import { partySide } from "./appointments";
import {
  electorateParameter,
  nationalEconomyChange,
  typicalSpendPerVote,
  type CandidateInputs,
  type RaceConditions,
} from "./electorate-blocks";
import {
  electionLawTurnoutCost,
  felonyDisenfranchisedShare,
} from "./law-reach/group-a-voting";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { CORRUPTION_MODULE_ID } from "./modules/corruption";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { OUTCOME_WEB_MODULE_ID, placeOutcome } from "./modules/outcome-web";
import { recordAppeal } from "./modules/record";
import type { CoreAPI, PersonState } from "./types";

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
 * The race's conditions. `town` names the town's own block (its voters are
 * counted apart) and, where it is a county, the county whose voters feel the
 * town's jobs and crime; `townsState` is whether the town's election laws
 * govern the race.
 */
export function raceConditions(
  api: CoreAPI,
  input: {
    readonly date: string;
    readonly federal: boolean;
    readonly family: string;
    readonly cycle: RaceConditions["cycle"];
    readonly cycleShare: number;
    readonly townsState: boolean;
    readonly town: {
      readonly blockId: string | null;
      readonly localBlockId: string | null;
      readonly placeId: string;
      readonly votersCounted: number;
    } | null;
  },
): RaceConditions {
  rememberOpeningElectorate(api);
  const opening = openings.get(api.state)!;
  // The national mood is the economy and the midterm penalty; no record of
  // the president's approval exists to read it from.
  // stopgapId: SG-GOV-electorate-approval
  api.stopgap("SG-GOV-electorate-approval");
  const local = input.town?.localBlockId
    ? townConditions(api, input.town.placeId)
    : { unemploymentChange: 0, crimeChange: 0 };
  return {
    cycle: input.cycle,
    cycleShare: input.cycleShare,
    federal: input.federal,
    typicalSpendPerVote: typicalSpendPerVote(input.family),
    national: nationalEconomyChange(api),
    town: input.town
      ? {
          blockId: input.town.blockId,
          localBlockId: input.town.localBlockId,
          votersCounted: input.town.votersCounted,
          ...local,
        }
      : null,
    lawCostChange: input.townsState ? lawCostToday(api) - opening.lawCost : 0,
    barredChange: input.townsState
      ? felonyDisenfranchisedShare(api) - opening.barred
      : 0,
  };
}

/** The town's unemployment (points) and crime (share above base) against the outcome web's base. */
function townConditions(api: CoreAPI, placeId: string) {
  if (!api.state.modules.has(OUTCOME_WEB_MODULE_ID))
    return { unemploymentChange: 0, crimeChange: 0 };
  const jobs = placeOutcome(api, placeId, "labor.unemployment-pct");
  let crime = 0,
    counted = 0;
  for (const measure of [
    "crime.burglary",
    "crime.robbery",
    "crime.assault",
    "crime.vandalism",
  ]) {
    const row = placeOutcome(api, placeId, measure);
    if (!row?.base) continue;
    crime += row.value / row.base - 1;
    counted += 1;
  }
  return {
    unemploymentChange:
      jobs && jobs.base !== undefined ? jobs.value - jobs.base : 0,
    crimeChange: counted ? crime / counted : 0,
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

/** Whether a taken bribe of the person's has surfaced by the date: a public scandal. */
function scandalOf(api: CoreAPI, personId: string, date: string): boolean {
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return false;
  const store = api.moduleState(CORRUPTION_MODULE_ID);
  for (const crime of store
    .table("crimes")
    .query("byOfficial", [personId]) as unknown as {
    id: string;
    taken: boolean;
  }[]) {
    if (!crime.taken) continue;
    if (
      (
        store.table("surfaced").query("byCrime", [crime.id]) as unknown as {
          date: string;
        }[]
      ).some((s) => s.date <= date)
    )
      return true;
  }
  return false;
}

/**
 * One candidate's inputs from the records. A named person brings their own
 * offices, scandals, campaign books and votes; an official the world doesn't
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
    scandal: scandalOf(api, input.id, api.state.date),
    // A named candidate's campaign books (none kept: nothing spent); an
    // official the world doesn't name runs the typical campaign unless their
    // books show spending.
    spentMinor: named
      ? (campaign?.spentMinor ?? 0)
      : campaign?.spentMinor
        ? campaign.spentMinor
        : null,
    record,
    presidentsParty: side !== 0 && side === president,
    seatPartyHolder:
      side !== 0 &&
      input.seatParty !== null &&
      side === (input.seatSide ?? partySide(input.seatParty)),
  };
}
