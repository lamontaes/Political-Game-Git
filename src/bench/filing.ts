import { coreAPI } from "../core2/state";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import {
  checkEligibility,
  filingOfficeFor,
  openContests,
  type RequirementCheck,
} from "../core2/modules/elections";
import {
  PARTIES_MODULE_ID,
  partiesHere,
  partyTie,
} from "../core2/modules/parties";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import {
  confirmFiled,
  openFilingVisit,
  pickContest,
  type FilingVisit,
} from "../director/filing-visit";
import { backdropFile, stagePeople } from "./scene";
import { fileForOffice } from "./government";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState } from "../core2/types";

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);

/** The picture for the office that takes a contest's filings. */
function officePlace(filedWith: string): string {
  const name = filedWith.toLowerCase();
  for (const row of scenePlaces.filingOffices)
    if (!row.match || new RegExp(row.match).test(name)) {
      const place = row.places.find((p) => PICTURED.has(p));
      if (place) return place;
    }
  return "clerk-counter";
}

export interface BenchFilingVisit {
  visit: FilingVisit;
  filedWith: string;
  place: string;
  backdrop: ReturnType<typeof backdropFile>;
  people: ReturnType<typeof stagePeople>["people"];
  names: Record<string, string>;
  /** What the counter shows once an office is named: its rules and the choices made with the filing. */
  overlay?: FilingOverlay;
  result?: unknown;
}

export interface FilingOverlay {
  contestId: string;
  title: string;
  filingDeadline: string;
  checks: readonly RequirementCheck[];
  questions: readonly string[];
  /** The ballot labels of the parties here. */
  parties: readonly string[];
  /** The label of the party the player is tied to, if any; the form starts there. */
  party: string | null;
}

/** The contest's rules and the platform and party choices, read from the records. */
function overlayFor(
  core: CoreState,
  playerId: string,
  contestId: string,
): FilingOverlay {
  const api = coreAPI(core);
  const contest = openContests(api).find((row) => row.id === contestId)!;
  const parties = core.modules.has(PARTIES_MODULE_ID) ? partiesHere(api) : [];
  const tie = parties.length ? partyTie(api, playerId) : null;
  return {
    contestId,
    title: contest.district
      ? `${contest.title} (${contest.district})`
      : contest.title,
    filingDeadline: contest.filingDeadline,
    checks: checkEligibility(api, playerId, contestId),
    questions: PLATFORM_QUESTIONS,
    parties: parties.map((row) => row.name),
    party: parties.find((row) => row.id === tie?.partyId)?.name ?? null,
  };
}

/** The player walks into the office that takes filings for these contests. */
export function openBenchFilingVisit(
  core: CoreState,
  playerId: string,
  filedWith: string,
  minuteOfDay: number,
): BenchFilingVisit {
  const api = coreAPI(core);
  const contests = openContests(api)
    .filter((row) => filingOfficeFor(api, row.id).filedWith === filedWith)
    .map((row) => ({
      id: row.id,
      // Seats elected by district are told apart by their district record.
      title: row.district ? `${row.title} (${row.district})` : row.title,
      filingDeadline: row.filingDeadline,
      sourceIds: row.sources,
    }));
  if (!contests.length) throw new Error("No open contest files there.");
  // The clerk the contest's filing office records name (none for a state or federal counter).
  const clerk = filingClerkFor(api, contests[0]!.id)?.personId;
  const visit = openFilingVisit(core, playerId, contests, clerk ?? undefined);
  const place = officePlace(filedWith);
  const player = core.people.get(playerId)!;
  const cast = [
    { id: playerId, name: `${player.givenName} ${player.familyName}` },
  ];
  if (clerk) {
    const row = core.people.get(clerk)!;
    cast.push({ id: clerk, name: `${row.givenName} ${row.familyName}` });
  }
  return {
    visit,
    filedWith,
    place,
    backdrop: backdropFile(place, minuteOfDay),
    people: stagePeople(core, place, cast).people,
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
  };
}

/** The player's choice at the counter: name an office, file, or leave. */
export function chooseAtCounter(
  core: CoreState,
  state: BenchFilingVisit,
  key: string,
  /** Stances as "question=position" and a party id, or null to run without one. */
  filing: { platform?: readonly string[]; party?: string | null } = {},
): BenchFilingVisit {
  const choice = state.visit.choices.find((row) => row.key === key);
  if (!choice) throw new Error("Not an offered choice.");
  const api = coreAPI(core);
  const action = choice.action;
  if (action.kind === "pick") {
    const visit = pickContest(
      core,
      state.visit,
      action.contestId,
      filingOfficeFor(api, action.contestId),
      checkEligibility(api, state.visit.playerId, action.contestId),
    );
    return {
      ...state,
      visit,
      overlay: overlayFor(core, state.visit.playerId, action.contestId),
    };
  }
  if (action.kind === "file") {
    const result = fileForOffice(
      core,
      state.visit.playerId,
      action.contestId,
      filing,
    );
    state.visit.lines.push({
      speaker: "player",
      text: choice.text,
      sourceRecordIds: choice.sourceRecordIds,
    });
    if (result.status !== "refused")
      confirmFiled(core, state.visit, action.contestId, result.filing.id);
    return { ...state, visit: { ...state.visit, choices: [] }, result };
  }
  return { ...state, visit: { ...state.visit, choices: [] } };
}
