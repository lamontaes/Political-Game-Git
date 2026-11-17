/**
 * Dev mode forces the elections' scenes through the elections engine's own writers (pool item
 * dev-force-every-scene-through-its-writer; owner, Nov 15: "a part of the dev mode should be able to
 * trace and force every scene to play"). Each recipe writes the cause record the way the engine
 * writes it in play, and the director stages the scene from that record id on the day after:
 *  - `file`: the world runs to the first day a race the player may enter takes filings, and the
 *    player files at the counter (`fileForOffice`, the clerk's own check; candidate-filed). It brings
 *    about the clerk's scene (`filing`) and the talk at home with the one the filing puts something
 *    at risk for (`family-filing`).
 *  - `result`: the player's filing (made as above where there is none waiting on a count) gathers
 *    its signatures through the campaign day's own canvass, the clerk checks it, and the world runs
 *    to the count (the voting engine's election-result or primary-result). A loss brings about the
 *    candidate's night (`race-lost`) and the talk at home after it (`family-loss`); the voters
 *    decide the race, so a win is said instead. The talks at home stage only with someone at home the
 *    race puts something of theirs at risk for (family-stake.ts); with no one, that is said.
 * The caller marks every write `scene-forced`; a forced scene never counts as played.
 */
import {
  campaignDayChoices,
  takeCampaignDayChoice,
} from "../core2/campaign-day";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  petitionCirculating,
  petitionOf,
  playerContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { CoreAPI, PersonId } from "../core2/types";
import type { DevMode } from "./dev-mode";
import { fileForOffice } from "./government";

/** The elections' situation types dev mode can force, by recipe. */
export const ELECTIONS_SCENES: Readonly<Record<string, "file" | "result">> = {
  filing: "file",
  "family-filing": "file",
  "race-lost": "result",
  "family-loss": "result",
};

/** The elections' types no recipe can force, with why (a reason key of the scene view's labels). */
export const ELECTIONS_REASONS: Readonly<Record<string, string>> = {
  "party-recruit": "party-decides",
};

/** Why a recipe could not run, or ran and did not bring the cause, a reason key of the view's labels. */
export type ElectionsRefusal =
  "no-race" | "no-ballot" | "no-count" | "won" | "no-stake" | "no-player";

export interface ElectionsForce {
  readonly recipe: "elections";
  readonly way: "file" | "result";
  readonly personId: string | null;
  readonly written: readonly string[];
  readonly causeRecords: readonly string[];
  readonly staged: boolean;
  readonly outcome: string | null;
  readonly heldBack: readonly { typeKey: string; reason: string }[];
  readonly refused?: ElectionsRefusal;
}

/** How long the world may run for a filing window or a count: two years of days. */
const CAP = 730;

const filingsOf = (api: CoreAPI, personId: string) =>
  (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).filter((row) => row.personId === personId);

const contestOf = (api: CoreAPI, contestId: string) =>
  api.moduleState(ELECTIONS_MODULE_ID).table("contests").get(contestId) as
    ContestRow | undefined;

/**
 * The player files for the soonest race that takes their filing, the world running a day at a time
 * until one does (a race opens its filing on its own day, and some refuse a filer on their rules).
 */
function fileSoonest(
  mode: DevMode,
  api: CoreAPI,
  playerId: string,
): FilingRow | undefined {
  const filedFor = new Set(filingsOf(api, playerId).map((f) => f.contestId));
  for (let day = 0; day <= CAP; day += 1) {
    for (const contest of [...playerContests(api)]
      .filter((row) => !filedFor.has(row.id))
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )) {
      let result: { filing?: FilingRow } | undefined;
      try {
        result = fileForOffice(mode.core, playerId, contest.id) as {
          filing?: FilingRow;
        };
      } catch {
        // The clerk's bar for this race: the next one is tried.
        continue;
      }
      if (
        result.filing &&
        ["petitioning", "on-ballot"].includes(result.filing.status)
      )
        return result.filing;
    }
    mode.advance(addDays(makeIsoDate(mode.core.date), 1));
  }
  return undefined;
}

/** A filing of the player's whose count has not come: on the ballot, or with its petition still out. */
function waitingFiling(api: CoreAPI, playerId: string, today: string) {
  return filingsOf(api, playerId)
    .filter(
      (row) =>
        ["petitioning", "on-ballot"].includes(row.status) &&
        (contestOf(api, row.contestId)?.electionDate ?? "") >= today,
    )
    .sort((a, b) =>
      (contestOf(api, a.contestId)?.electionDate ?? "").localeCompare(
        contestOf(api, b.contestId)?.electionDate ?? "",
      ),
    )[0];
}

/** Forces one of the elections' situation types for the player through the elections' own writers. */
export function forceElectionsScene(
  mode: DevMode,
  typeKey: string,
): ElectionsForce {
  const way = ELECTIONS_SCENES[typeKey];
  if (!way) throw new Error("No such situation type.");
  const api = coreAPI(mode.core);
  const playerId = mode.core.playerId as PersonId | undefined;
  const written: string[] = [];
  const refuse = (refused: ElectionsRefusal): ElectionsForce => ({
    recipe: "elections",
    way,
    personId: playerId ?? null,
    written,
    causeRecords: [],
    staged: false,
    outcome: null,
    heldBack: [],
    refused,
  });
  if (!playerId || !mode.director || !mode.core.people.get(playerId)?.alive)
    return refuse("no-player");
  if (!mode.director.ledger.people.has(playerId))
    mode.director.watch(mode.core, playerId);
  const book = mode.director.ledger.people.get(playerId)!;
  const day = () => mode.advance(addDays(makeIsoDate(mode.core.date), 1));
  let scheduled = book.schedule.length;

  if (way === "file") {
    const filing = fileSoonest(mode, api, playerId);
    if (!filing) return refuse("no-race");
    scheduled = book.schedule.length;
    written.push(filing.id, `candidate-filed:${filing.id}`);
    day();
  } else {
    let filing = waitingFiling(api, playerId, mode.core.date);
    if (!filing) {
      filing = fileSoonest(mode, api, playerId);
      if (!filing) return refuse("no-race");
    }
    written.push(filing.id);
    // The petition: the player canvasses on each day the campaign day offers it, until it holds what
    // the clerk counts or its time is up, and the clerk's check comes the day after it is due.
    const short = () => {
      const held = petitionOf(api, filing!.id);
      return (
        !!held &&
        petitionCirculating(api, filing!.id) &&
        held.signed < held.needed
      );
    };
    for (let n = 0; short() && n <= CAP; n += 1) {
      if (
        campaignDayChoices(api, filing.id).find((c) => c.kind === "canvass")
          ?.available
      )
        takeCampaignDayChoice(api, filing.id, "canvass");
      day();
    }
    const due = petitionOf(api, filing.id)?.due;
    if (due && mode.core.date <= due)
      mode.advance(addDays(makeIsoDate(due), 1));
    const status = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(filing.id) as unknown as FilingRow | undefined
    )?.status;
    if (status !== "on-ballot") return refuse("no-ballot");
    // The world runs to the count that names the player in this race.
    const contestId = filing.contestId;
    const counted = () =>
      ["election-result", "primary-result"].flatMap((kind) =>
        [...(mode.core.logByKind.get(kind) ?? [])].filter((id) => {
          const record = mode.core.durableLog.get(id);
          return (
            record?.facts?.contestId === contestId &&
            record.personIds.includes(playerId)
          );
        }),
      );
    for (let n = 0; !counted().length && n <= CAP; n += 1) {
      scheduled = book.schedule.length;
      day();
    }
    const count = counted()[0];
    if (!count) return refuse("no-count");
    written.push(count);
    // The count is read on the day it is written: a day more, for a scene that comes the morning after.
    if (
      !book.schedule
        .slice(scheduled)
        .some((row) => book.momentsById.get(row.momentId)?.causeId === count)
    )
      day();
    if (mode.core.durableLog.get(count)?.facts?.winnerId === playerId)
      return refuse("won");
  }

  const fresh = book.schedule.slice(scheduled);
  const bound = fresh.find((row) =>
    row.bindings.some((binding) => binding.typeKey === typeKey),
  );
  // The talk at home is staged only with someone the race puts something of theirs at risk for.
  if (!bound && typeKey.startsWith("family-")) return refuse("no-stake");
  const moment = bound ? book.momentsById.get(bound.momentId) : undefined;
  return {
    recipe: "elections",
    way,
    personId: playerId,
    written,
    causeRecords: moment ? [moment.causeId] : [],
    staged: !!bound,
    outcome: bound?.outcome ?? null,
    heldBack: fresh.flatMap((row) =>
      (row.heldBack ?? []).filter((held) => held.typeKey === typeKey),
    ),
  };
}
