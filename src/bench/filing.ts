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
import { seatHolder } from "../core2/modules/voting";
import {
  openFilingVisit,
  pickContest,
  type FilingVisit,
} from "../director/filing-visit";
import { backdropFile, stagePeople, type StageReason } from "./scene";
import { fileForOffice } from "./government";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import type { CoreState, PersonId } from "../core2/types";
import { wordSceneMove, type Fact } from "../english/scene-talk-words";

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
  /**
   * Each offered race told apart before the player picks, from its records:
   * the seat (its district, or its place among the body's seats up that
   * day), the election date and who holds the seat now.
   */
  seats: Record<string, SeatFacts>;
  /** What the counter shows once an office is named: its rules and the choices made with the filing. */
  overlay?: FilingOverlay;
  result?: unknown;
  /**
   * The narrator's setup before the clerk speaks: who is behind the counter
   * and what the player came for, worded by the English engine from the
   * filing-clerk scene's narration and citing the records it stands on.
   */
  intro: { text: string; sourceRecordIds: readonly string[] }[];
}

export interface SeatFacts {
  seat: string | null;
  electionDate: string;
  holder: string | null;
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

/**
 * The narrator's setup at a counter, from the filing-clerk scene's own
 * narration bank (the director fires the same scene when a filing is made).
 * The seat is named only when the counter takes one race, so the line never
 * says a seat the player did not pick.
 */
function counterIntro(
  core: CoreState,
  playerId: string,
  clerkId: string,
  title: string,
  recordId: string,
  contests: readonly { id: string; title: string }[],
): BenchFilingVisit["intro"] {
  const clerk = core.people.get(clerkId as PersonId)!;
  const facts: Record<string, Fact> = {
    name: {
      text: `${clerk.givenName} ${clerk.familyName}`,
      sourceRecordIds: [clerkId],
    },
    // A title the record capitalizes only at its start ("County clerk") is said
    // in running text as a common noun; one with proper names stays as written.
    post: {
      text: /^\S+( [a-z]+)*$/.test(title)
        ? `${title.charAt(0).toLowerCase()}${title.slice(1)}`
        : title,
      sourceRecordIds: [recordId],
    },
  };
  if (contests.length === 1)
    facts.office = {
      text: contests[0]!.title,
      sourceRecordIds: [contests[0]!.id],
    };
  const worded = wordSceneMove({
    move: {
      step: "narrate",
      move: "narrate",
      role: "narrator",
      purpose: "filing-clerk",
      key: "routine",
    },
    facts,
    seed: core.seed,
    speakerId: clerkId,
    traits: {},
    momentKey: `counter:${playerId}:${clerkId}:${recordId}`,
    said: new Set(),
  });
  return worded && "text" in worded
    ? [
        {
          text: worded.text,
          sourceRecordIds: Object.values(facts).flatMap(
            (fact) => fact.sourceRecordIds,
          ),
        },
      ]
    : [];
}

/** The player walks into the office that takes filings for these contests. */
export function openBenchFilingVisit(
  core: CoreState,
  playerId: string,
  filedWith: string,
  minuteOfDay: number,
): BenchFilingVisit {
  const api = coreAPI(core);
  const open = openContests(api).filter(
    (row) => filingOfficeFor(api, row.id).filedWith === filedWith,
  );
  // Contests are told apart by their own records, in one parenthesis: a
  // seat's district; the year of election, where seats of the same title
  // are elected in different years (a state's two Senate seats); and the
  // seat's place among those of its body elected the same day at large.
  const titled = open.map((row) => `${row.title}|${row.district ?? ""}`);
  const yearOf = (i: number) => open[i]!.electionDate.slice(0, 4);
  const contests = open.map((row, i) => {
    const same = titled.flatMap((t, j) => (t === titled[i] ? [j] : []));
    const years = new Set(same.map(yearOf));
    const sameYear = same.filter((j) => yearOf(j) === yearOf(i));
    const parts = [
      ...(row.district ? [row.district] : []),
      ...(years.size > 1 ? [yearOf(i)] : []),
      ...(sameYear.length > 1 ? [String(sameYear.indexOf(i) + 1)] : []),
    ];
    return {
      id: row.id,
      title: parts.length ? `${row.title} (${parts.join(", ")})` : row.title,
      filingDeadline: row.filingDeadline,
      sourceIds: row.sources,
    };
  });
  const seats = Object.fromEntries(
    open.map((row, i) => {
      const sameDay = titled.flatMap((t, j) =>
        t === titled[i] && open[j]!.electionDate === row.electionDate
          ? [j]
          : [],
      );
      const holder = seatHolder(api, row);
      return [
        row.id,
        {
          // Seats sharing a district (at large) are numbered among themselves.
          seat:
            sameDay.length > 1
              ? [row.district, String(sameDay.indexOf(i) + 1)]
                  .filter(Boolean)
                  .join(" ")
              : row.district,
          electionDate: row.electionDate,
          holder: holder
            ? `${holder.identity.givenName} ${holder.identity.familyName}`
            : null,
        },
      ];
    }),
  );
  if (!contests.length) throw new Error("No open contest files there.");
  // The clerk the contest's filing office records name (none for a state or federal counter).
  const clerkRow = filingClerkFor(api, contests[0]!.id);
  const clerk = clerkRow?.personId;
  const visit = openFilingVisit(core, playerId, contests, clerk ?? undefined);
  const place = officePlace(filedWith);
  const player = core.people.get(playerId)!;
  const cast: { id: string; name: string; reason: StageReason }[] = [
    {
      id: playerId,
      name: `${player.givenName} ${player.familyName}`,
      reason: "you",
    },
  ];
  if (clerk) {
    const row = core.people.get(clerk)!;
    cast.push({
      id: clerk,
      name: `${row.givenName} ${row.familyName}`,
      reason: "clerk",
    });
  }
  return {
    visit,
    filedWith,
    place,
    intro: clerkRow
      ? counterIntro(
          core,
          playerId,
          clerkRow.personId,
          clerkRow.title,
          clerkRow.recordId,
          contests,
        )
      : [],
    backdrop: backdropFile(place, minuteOfDay),
    people: stagePeople(core, place, cast).people,
    names: Object.fromEntries(cast.map((row) => [row.id, row.name])),
    seats,
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
    return { ...state, visit: { ...state.visit, choices: [] }, result };
  }
  return { ...state, visit: { ...state.visit, choices: [] } };
}
