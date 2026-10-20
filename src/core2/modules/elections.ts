/**
 * Elections, part one: contests and filing (golden path step 3).
 *
 * At the opening every seat covering the town gets its next contest: the
 * election date, the primary and the filing deadline from
 * `elections-calendar.ts`. A person files at the office that takes that
 * contest's filings (`filingOfficeFor`), once, if they meet what that place's
 * rules require: age, residency and registration, read from
 * `data/research/elections/filing-requirements.json` (or the estimated terms
 * in `candidate-filing-terms.json` where a place isn't read yet). No one pays
 * a fee or gathers petition signatures to file (owner, Oct 13: the
 * simulation is the depth); a filing puts the candidate on the ballot. The
 * filing becomes a record; an unmet rule comes back as structured reasons the
 * English engine words.
 */
import { registerElectorate } from "../electorate";
import { termLimitReached } from "../law-reach/group-a-voting";
import { campaignParameter } from "../campaign-views";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import { partyName } from "../appointments";
import fallbackData from "../data/elections/filing-fallbacks.json" with { type: "json" };
import filingTerms from "../../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import filingRequirementResearch from "../../../data/research/elections/filing-requirements.json" with { type: "json" };
import filingOffice from "../../../data/research/elections/filing-office.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { corePlaceByJurisdictionId, corePlaceByKey } from "../place-lookup";
import {
  municipalFilingDeadline,
  nextElectionForSeat,
  officeFamily,
  specialElectionDate,
  type ElectionDates,
  type OfficeFamily,
} from "../elections-calendar";
import { FILING_LEAD_SOURCE } from "../gov-rules/town-election-calendar";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";

export const ELECTIONS_MODULE_ID = "core2-elections-v1";

export { officeFamily, type OfficeFamily };

export interface ContestRow extends ElectionDates {
  readonly id: string;
  readonly officeId: string;
  readonly seatId: string;
  readonly title: string;
  readonly level: string;
  readonly district: string | null;
  readonly family: OfficeFamily;
  readonly incumbentTermId: string | null;
  /** A special election: the vacancy it fills and the unexpired term's end. */
  readonly special?: {
    readonly vacancyId: string;
    readonly termEnd: string | null;
  };
}

export interface FilingRequirements {
  readonly filedWith: string;
  readonly minimumAge: number;
  readonly residency: string | null;
  readonly registeredVoter: boolean;
  readonly source: string;
  readonly estimate: boolean;
  /** Which of these rules came from the fallback data, not the place's own row (SG-GOV-filing-fallbacks). */
  readonly fallbacks: readonly (
    "filedWith" | "minimumAge" | "registeredVoter"
  )[];
  /** The side's own filing deadline where the law sets one apart (independents). */
  readonly deadline: string | null;
}

/** Party candidates and independents file on their own terms. */
export type FilingSide = "party" | "independent";

/** One rule checked for a would-be candidate: what's required and where they stand. */
export interface RequirementCheck {
  readonly rule:
    | "filing-deadline"
    | "already-filed"
    | "minimum-age"
    | "residency"
    | "party-member"
    | "term-limit";

  readonly met: boolean;
  readonly required: string;
  readonly actual: string;
  readonly source: string;
}

export interface FilingRow {
  readonly id: string;
  readonly contestId: string;
  readonly personId: string;
  readonly filedOn: string;
  readonly filedWith: string;
  readonly platform: readonly string[];
  /** The party label on the ballot, where the candidate runs under one. */
  readonly party?: string | null;
  readonly status: "on-ballot" | "withdrawn";
  /** How a candidate the world put on the ballot came to stand (an incumbent again, a party's nominee). */
  readonly how?: string;
}

export const ELECTIONS_MODULE: CoreModule = {
  id: ELECTIONS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      contests: {
        indexes: {
          byOffice: { fields: ["officeId"] },
          bySeat: { fields: ["seatId"] },
          byDate: { fields: ["electionDate"] },
        },
      },
      filings: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byPerson: { fields: ["personId"] },
        },
      },
      town: {},
      // How the law settled an exact tie: a lot, or a deciding body's votes.
      ties: {},
    },
  },
  // A holder who took office changes who the seat's open contests are
  // against: the incumbent is the term serving when the vote comes.
  eventKinds: ["took-office"],
  onEvent: (api, event) => {
    const seatId = event.facts?.seatId;
    if (typeof seatId === "string") syncSeatContests(api, seatId);
  },
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(ELECTIONS_MODULE_ID).table(name);
}

interface ReadSide {
  readonly deadline2026?: string | null;
}
interface ReadRequirements {
  readonly applicable?: boolean;
  readonly filedWith?: string;
  readonly party?: ReadSide;
  readonly independent?: ReadSide;
  readonly minimumAge?: number | null;
  readonly residency?: string | null;
  readonly registeredVoterRequired?: boolean | null;
  readonly filingDeadlineRule?: string | null;
  readonly citation?: string | null;
  readonly source?: string | null;
  readonly secondarySources?: readonly string[];
  readonly estimate?: boolean;
}

function readRequirements(
  stateKey: string,
  family: OfficeFamily,
): ReadRequirements | undefined {
  return (
    filingRequirementResearch as unknown as {
      places: Record<string, Record<string, ReadRequirements>>;
    }
  ).places[stateKey]?.[family];
}

/** What one place requires to file for one family of offices. */
export function filingRequirements(
  stateKey: string,
  family: OfficeFamily,
  sideName: FilingSide = "party",
): FilingRequirements {
  const read = readRequirements(stateKey, family);
  const side =
    sideName === "independent"
      ? (read?.independent ?? read?.party)
      : read?.party;
  const usps = stateKey.slice(3);
  const estimated = (
    filingTerms as unknown as {
      places: Record<
        string,
        Record<
          string,
          {
            estimatedFrom?: string;
          }
        >
      >;
    }
  ).places[usps];
  const legacyFamily =
    family === "countyOffice" || family === "municipalOffice"
      ? "local"
      : family === "usHouse"
        ? "congressional"
        : family;
  const fallback = side
    ? undefined
    : (estimated?.[legacyFamily] ?? Object.values(estimated ?? {})[0]);
  const source = [
    read?.citation,
    read?.source,
    ...(read?.secondarySources ?? []),
  ]
    .filter(Boolean)
    .join(" ; ");
  const fallbacks: ("filedWith" | "minimumAge" | "registeredVoter")[] = [];
  if (!read?.filedWith) fallbacks.push("filedWith");
  if (typeof read?.minimumAge !== "number") fallbacks.push("minimumAge");
  if (typeof read?.registeredVoterRequired !== "boolean")
    fallbacks.push("registeredVoter");
  return {
    filedWith: read?.filedWith ?? localFilingOfficer(usps, family),
    minimumAge: read?.minimumAge ?? fallbackAge(family),
    residency: read?.residency ?? null,
    registeredVoter:
      typeof read?.registeredVoterRequired === "boolean"
        ? read.registeredVoterRequired
        : fallbackData.registeredVoterRequired.value,
    source:
      source ||
      `data/research/elections/candidate-filing-terms.json: ${fallback?.estimatedFrom ?? "estimated"}`,
    estimate: read ? (read.estimate ?? false) || fallbacks.length > 0 : true,
    fallbacks,
    deadline: side?.deadline2026 ?? null,
  };
}

/** The minimum age to file where the place's row has none, from `filing-fallbacks.json`. */
function fallbackAge(family: OfficeFamily): number {
  return fallbackData.minimumAge[family].value;
}

/** The filing rules for one contest and side. */
export function filingRulesFor(
  api: CoreAPI,
  contest: ContestRow,
  side: FilingSide,
): FilingRequirements {
  const rules = filingRequirements(town(api).stateKey, contest.family, side);
  if (rules.fallbacks.length) {
    // stopgapId: SG-GOV-filing-fallbacks
    api.stopgap("SG-GOV-filing-fallbacks");
  }
  // A side's own deadline is read for the 2026 cycle only; other years'
  // contests keep the deadline from their own calendar.
  return contest.electionDate.startsWith("2026-")
    ? rules
    : { ...rules, deadline: null };
}

function localFilingOfficer(usps: string, family: OfficeFamily): string {
  const office = filingOffice as unknown as {
    clerkTitles: Record<string, string>;
    filingOfficers: {
      states: Record<
        string,
        Record<string, { level?: string; title?: string | null }>
      >;
    };
  };
  const state = office.filingOfficers.states[usps];
  if (family === "countyOffice")
    return (
      state?.county?.title ??
      office.clerkTitles.county ??
      fallbackData.filingOfficer.countyOffice
    );
  if (family === "municipalOffice")
    return (
      state?.municipal?.title ??
      office.clerkTitles.municipality ??
      fallbackData.filingOfficer.municipalOffice
    );
  return fallbackData.filingOfficer[family];
}

/** Put every seat covering the town on its next contest. */
export function openElections(core: CoreState): void {
  if (!core.modules.has(ELECTIONS_MODULE_ID))
    registerModule(core, ELECTIONS_MODULE);
  registerElectorate(core);
  const api = coreAPI(core);
  const place = corePlaceByKey(api.state.placeMetadata.placeKey ?? "");
  if (!place?.stateJurisdictionKey) throw new Error("Elections need the town.");
  const stateKey = place.stateJurisdictionKey;
  const geoid = place.sourceGeoid ?? place.key;
  table(api, "town").put({
    id: "town",
    stateKey,
    geoid,
    townPlaceId: place.context.jurisdiction.id,
  });
  for (const entry of townSeats(api)) {
    const contest = contestFor(api, entry);
    if (contest) table(api, "contests").put(contest as unknown as ModuleRow);
  }
}

/** A seat's next contest from today: its real dates, filing deadline and incumbent. */
function contestFor(
  api: CoreAPI,
  { office, seat, holder }: ReturnType<typeof townSeats>[number],
): ContestRow | null {
  // The vice president is the president's running mate, not a race.
  if (!office.elected || office.kind === "vice-president") return null;
  const { stateKey, geoid } = town(api);
  const tomorrow = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) + 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const at = (termEnd: string | null, onDate = api.state.date) =>
    nextElectionForSeat({
      office,
      stateKey,
      placeGeoid: geoid,
      termEnd,
      onDate,
    });
  let dates = at(holder?.endDate ?? null);
  // A holder whose seat's election passed with no one elected holds over;
  // the seat's next election comes a full term on.
  if (
    dates &&
    dates.electionDate <= api.state.date &&
    holder?.endDate &&
    office.termYears
  )
    dates = at(
      `${Number(holder.endDate.slice(0, 4)) + office.termYears}${holder.endDate.slice(4)}`,
    );
  // A seat whose election is today (decided, or with no one elected) looks
  // for the regular election after it.
  if (dates && dates.electionDate <= api.state.date) {
    dates = at(null, tomorrow);
    // With no term recorded either, the seat's next regular election is a
    // typical term on (an estimate where the office's term isn't read).
    const years =
      office.termYears ?? campaignParameter("officeTermYearsEstimate");
    if (dates && dates.electionDate <= api.state.date)
      dates = at(
        `${Number(api.state.date.slice(0, 4)) + years + 1}-01-01`,
        tomorrow,
      );
  }
  if (!dates || dates.electionDate <= api.state.date) return null;
  const family = officeFamily(office);
  noteEstimates(api, dates);
  return {
    ...dates,
    id: `contest:${seat.id}:${dates.electionDate}`,
    officeId: office.id,
    seatId: seat.id,
    title: office.title,
    level: office.level,
    district: seat.district,
    family,
    incumbentTermId: holder?.id ?? null,
  };
}

/**
 * A contest whose dates rest on an estimate registers it where it runs
 * (the filing lead, SG-GOV-filing-deadline-estimate).
 */
function noteEstimates(api: CoreAPI, dates: ElectionDates): void {
  if (dates.sources.includes(FILING_LEAD_SOURCE)) {
    // stopgapId: SG-GOV-filing-deadline-estimate
    api.stopgap("SG-GOV-filing-deadline-estimate");
  }
}

/**
 * A special election for a vacant seat: the seat's race on the date the
 * vacancy rule sets, filing open from today and closing the place's usual
 * number of days before (the estimate where none is read); the winner serves
 * the unexpired term.
 */
export function specialContestFor(
  api: CoreAPI,
  race: {
    readonly vacancyId: string;
    readonly seatId: string;
    readonly electionDate: string;
    readonly termEnd: string | null;
  },
): ContestRow | null {
  const entry = townSeats(api).find((s) => s.seat.id === race.seatId);
  if (!entry || !entry.office.elected) return null;
  const family = officeFamily(entry.office);
  const { stateKey } = town(api);
  const vacancy = api
    .moduleState(OFFICES_MODULE_ID)
    .table("vacancies")
    .get(race.vacancyId) as unknown as { since: string } | undefined;
  // The election day is the state's law for this office (or the estimate);
  // a town's filing closes by its own state rule where read.
  const day = specialElectionDate({
    office: entry.office,
    stateKey: entry.office.jurisdiction.startsWith("US-")
      ? entry.office.jurisdiction
      : stateKey,
    vacancyDate: vacancy?.since ?? api.state.date,
  });
  if (day.basis === "estimated") {
    // stopgapId: SG-GOV-special-election-timing
    api.stopgap("SG-GOV-special-election-timing");
  }
  const own =
    family === "municipalOffice"
      ? municipalFilingDeadline(stateKey, race.electionDate)
      : null;
  const deadline =
    own?.date ??
    new Date(
      Date.parse(`${race.electionDate}T00:00:00Z`) -
        campaignParameter("specialFilingDaysBefore") * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
  const contest: ContestRow = {
    id: `contest:${race.seatId}:${race.electionDate}:special`,
    officeId: entry.office.id,
    seatId: race.seatId,
    title: entry.office.title,
    level: entry.office.level,
    district: entry.seat.district,
    family,
    incumbentTermId: entry.holder?.id ?? null,
    electionDate: race.electionDate,
    primaryDate: null,
    filingOpens: api.state.date,
    filingDeadline: deadline > api.state.date ? deadline : api.state.date,
    basis: own && !own.estimated && day.basis === "read" ? "read" : "estimated",
    sources: [
      `vacancy ${race.vacancyId}`,
      day.source,
      ...(own ? [own.source] : []),
    ],
    special: { vacancyId: race.vacancyId, termEnd: race.termEnd },
  };
  if (table(api, "contests").get(contest.id)) return null;
  table(api, "contests").put(contest as unknown as ModuleRow);
  return contest;
}

/**
 * Open a seat's next contest once its last one is decided: each cycle has
 * its own contest, so the record carries into the next election. Returns
 * null where the seat has no future election or it is already open.
 */
export function openNextContest(
  api: CoreAPI,
  seatId: string,
): ContestRow | null {
  const entry = townSeats(api).find((s) => s.seat.id === seatId);
  if (!entry) return null;
  const contest = contestFor(api, entry);
  if (!contest || table(api, "contests").get(contest.id)) return null;
  table(api, "contests").put(contest as unknown as ModuleRow);
  return contest;
}

function town(api: CoreAPI) {
  return table(api, "town").get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
}

/** Contests whose filing is open today, soonest deadline first. */
export function openContests(api: CoreAPI): readonly ContestRow[] {
  const today = api.state.date;
  return (table(api, "contests").rows() as unknown as ContestRow[])
    .map((c) => syncIncumbent(api, c))
    .filter(
      (c) =>
        c.filingDeadline >= today &&
        (c.filingOpens === null || c.filingOpens <= today),
    )
    .sort((a, b) => a.filingDeadline.localeCompare(b.filingDeadline));
}

/** Where a contest's filings are taken, and what that place requires. */
export function filingOfficeFor(
  api: CoreAPI,
  contestId: string,
  side: FilingSide = "party",
) {
  const contest = table(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  return filingRulesFor(api, contest, side);
}

/** Every rule for one person filing in one contest, checked today. */
export function checkEligibility(
  api: CoreAPI,
  personId: string,
  contestId: string,
  /** The party the person files with; none files as an independent. */
  party: string | null = "party",
): readonly RequirementCheck[] {
  const contest = table(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  const side: FilingSide = party ? "party" : "independent";
  const rules = filingRulesFor(api, contest, side);
  const deadline = rules.deadline ?? contest.filingDeadline;
  const person = api.state.people.get(personId);
  if (!person) throw new Error(`No such person: ${personId}`);
  const today = api.state.date;
  const age =
    Number(today.slice(0, 4)) -
    Number(person.birthDate.slice(0, 4)) -
    (today.slice(5) < person.birthDate.slice(5) ? 1 : 0);
  const filed = (
    table(api, "filings").query("byPerson", [
      personId,
    ]) as unknown as FilingRow[]
  ).some((f) => f.status !== "withdrawn" && f.contestId === contestId);
  // Where they must live: the town for a local seat; the state for a state
  // or federal one (a district's own residency rule is in the requirement
  // text the place's records give).
  // Whoever holds the seat met its residency rule when they took it.
  const holdsSeat = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        contest.seatId,
        "serving",
      ]) as unknown as TermRow[]
  ).some((t) => t.personId === personId);
  const national = contest.officeId === "office:US:president";
  const resident =
    holdsSeat ||
    (contest.level === "federal" || contest.level === "state"
      ? national
        ? stateOfPlace(person.placeId) !== null
        : stateOfPlace(person.placeId) === town(api).stateKey
      : person.placeId === town(api).townPlaceId);
  const checks: RequirementCheck[] = [
    {
      rule: "filing-deadline",
      met:
        today <= deadline &&
        (contest.filingOpens === null || today >= contest.filingOpens),
      required:
        contest.filingOpens !== null
          ? `${contest.filingOpens} to ${deadline}`
          : deadline,
      actual: today,
      source: contest.sources.join(" ; "),
    },
    {
      rule: "already-filed",
      met: !filed,
      required: "one filing per contest",
      actual: filed ? "filed" : "not filed",
      source: "File once (owner, Oct 8)",
    },
    {
      rule: "minimum-age",
      met: age >= rules.minimumAge,
      required: String(rules.minimumAge),
      actual: String(age),
      source: rules.source,
    },
    {
      rule: "residency",
      met: resident,
      required: rules.residency ?? "lives in the area the office serves",
      actual: resident ? "lives here" : "lives elsewhere",
      source: rules.source,
    },
  ];
  // Registration is research metadata, not a modeled status. The game has
  // no separate registration step (AGENTS.md: no paperwork); do not report
  // an adult resident as registered without a registration record.
  // Filing under a party's label takes membership in it: the person's own
  // tie to that party (joining reads their views against the party's
  // positions, in the parties engine). Anyone else files as an independent,
  // on the independents' terms the place's records set. ("party" alone asks
  // about a party filing in general, before a party is named.)
  if (party && party !== "party" && api.state.modules.has(PARTIES_MODULE_ID)) {
    const tie = partyTie(api, personId);
    // An officeholder elected or appointed under the label is its member.
    const held = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byPerson", [personId]) as unknown as TermRow[]
    ).some((t) => partyName(t.party) === partyName(party));
    const member =
      held || (tie?.tie === "party" && partyIdFor(api, party) === tie.partyId);
    checks.push({
      rule: "party-member",
      met: member,
      required: `member of the ${party} party`,
      actual: member
        ? "member"
        : tie?.tie === "party"
          ? "member of another party"
          : "no party",
      source:
        "Party nomination rules (data/research/elections/party-nomination-rules-2026.json)",
    });
  }
  // A legislative term limit in force (law-reach, group A).
  if (termLimitReached(api, personId, contest.officeId))
    checks.push({
      rule: "term-limit",
      met: false,
      required: "years in this office under the term limit",
      actual: "limit reached",
      source: "legislative term limit in force",
    });
  return checks;
}

/** File once, at no charge: the candidate is on the ballot. */
export function fileCandidacy(
  api: CoreAPI,
  input: {
    readonly personId: string;
    readonly contestId: string;
    readonly platform: readonly string[];
    readonly party?: string | null;
  },
):
  | { readonly status: "refused"; readonly unmet: readonly RequirementCheck[] }
  | { readonly status: FilingRow["status"]; readonly filing: FilingRow } {
  const checks = checkEligibility(
    api,
    input.personId,
    input.contestId,
    input.party ?? null,
  );
  const unmet = checks.filter((c) => !c.met);
  const contest = table(api, "contests").get(
    input.contestId,
  ) as unknown as ContestRow;
  const rules = filingRulesFor(
    api,
    contest,
    input.party ? "party" : "independent",
  );
  if (unmet.length) return { status: "refused", unmet };
  const today = api.state.date;
  const id = `filing:${input.contestId}:${input.personId}`;
  const filing: FilingRow = {
    id,
    contestId: input.contestId,
    personId: input.personId,
    filedOn: today,
    filedWith: rules.filedWith,
    platform: [...input.platform],
    party: input.party ?? null,
    status: "on-ballot",
  };
  table(api, "filings").put(filing as unknown as ModuleRow);
  announce(api, filing, contest);
  return { status: filing.status, filing };
}

/** The state a place lies in, from the place records. */
function stateOfPlace(placeId: string): string | null {
  const place = corePlaceByJurisdictionId(placeId as never);
  // An official kept at the state level is placed at the state itself.
  if (!place) return /^US-[A-Z]{2}$/.test(placeId) ? placeId : null;
  return place.stateJurisdictionKey ?? null;
}

/** The party organization a ballot label names in the town's state, by name. */
function partyIdFor(api: CoreAPI, label: string): string | null {
  const key = partyName(label)?.trim().toLowerCase();
  return (
    partiesHere(api).find(
      (p) => partyName(p.name)?.trim().toLowerCase() === key,
    )?.id ?? null
  );
}

/** Announce a filing: a public record the news and the town learn. */
export function announce(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
): void {
  api.emit({
    id: `candidate-filed:${filing.id}`,
    date: api.state.date,
    kind: "candidate-filed",
    personIds: api.state.people.has(filing.personId) ? [filing.personId] : [],
    placeId: town(api).townPlaceId,
    // The tag follows the contest's basis: its dates are read from the law
    // or they are an estimate.
    source: {
      tag: contest.basis === "read" ? "SOURCED" : "ESTIMATED",
      citation: contest.sources.join(" ; "),
      asOf: api.state.date,
      ...(contest.basis === "read"
        ? {}
        : { estimatedFrom: "SG-GOV-filing-deadline-estimate" }),
    },
    publicRecord: true,
    news: true,
    facts: {
      filingId: filing.id,
      contestId: contest.id,
      office: contest.title,
      electionDate: contest.electionDate,
      filedWith: filing.filedWith,
    },
  });
}

/**
 * Everyone on the ballot for a contest, filed so far. A candidate who has
 * since died is off it: the count, the polling place and the press read the
 * living candidates on the day they look.
 */
export function ballot(api: CoreAPI, contestId: string): readonly FilingRow[] {
  return (
    table(api, "filings").query("byContest", [
      contestId,
    ]) as unknown as FilingRow[]
  ).filter(
    (f) =>
      f.status === "on-ballot" &&
      api.state.people.get(f.personId)?.alive !== false,
  );
}

/** The term serving on a seat today, or null. */
function servingTerm(api: CoreAPI, seatId: string): TermRow | null {
  return (api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [seatId, "serving"])[0] ?? null) as TermRow | null;
}

/**
 * Point a contest not yet held at the term serving on its seat now: a holder
 * who left, an appointee or a special election's winner is the incumbent.
 */
export function syncIncumbent(api: CoreAPI, contest: ContestRow): ContestRow {
  if (contest.electionDate < api.state.date) return contest;
  const serving = servingTerm(api, contest.seatId);
  if (!serving || serving.id === contest.incumbentTermId) return contest;
  const next = { ...contest, incumbentTermId: serving.id };
  table(api, "contests").put(next as unknown as ModuleRow);
  return next;
}

/** Sync every open contest of one seat (called when a holder takes office). */
export function syncSeatContests(api: CoreAPI, seatId: string): void {
  for (const contest of table(api, "contests").query("bySeat", [
    seatId,
  ]) as unknown as ContestRow[])
    syncIncumbent(api, contest);
}

/** The contests held on one date, each pointed at its seat's serving term. */
export function contestsOnDate(
  api: CoreAPI,
  date: string,
): readonly ContestRow[] {
  return (
    table(api, "contests").query("byDate", [date]) as unknown as ContestRow[]
  ).map((c) => syncIncumbent(api, c));
}

/** The incumbent's term, for a contest's record: the term serving on the seat now. */
export function incumbentOf(api: CoreAPI, contestId: string): TermRow | null {
  const found = table(api, "contests").get(contestId) as unknown as ContestRow;
  const contest = syncIncumbent(api, found);
  return contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow)
    : null;
}
