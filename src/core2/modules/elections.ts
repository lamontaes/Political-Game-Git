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
import filingTerms from "../../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import filingRequirementResearch from "../../../data/research/elections/filing-requirements.json" with { type: "json" };
import filingOffice from "../../../data/research/elections/filing-office.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { lifePlaceByKey } from "../../simulation/life-places";
import { nextElectionForSeat, type ElectionDates } from "../elections-calendar";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import type { OfficeInput } from "../offices-local";

export const ELECTIONS_MODULE_ID = "core2-elections-v1";

export type OfficeFamily =
  | "statewideExecutive"
  | "stateLegislative"
  | "usHouse"
  | "countyOffice"
  | "municipalOffice";

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
    | "registered-voter"
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
        },
      },
      filings: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byPerson: { fields: ["personId"] },
        },
      },
      town: {},
    },
  },
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(ELECTIONS_MODULE_ID).table(name);
}

export function officeFamily(office: OfficeInput): OfficeFamily {
  if (office.kind.startsWith("us-house")) return "usHouse";
  if (office.kind.startsWith("legislature-")) return "stateLegislative";
  if (office.level === "federal" || office.level === "state")
    return "statewideExecutive";
  if (office.level === "county") return "countyOffice";
  return "municipalOffice";
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

/**
 * The local filing deadline the law states as days before the election
 * ("the 78th day before the election"), or null where it doesn't.
 */
export function deadlineDaysBefore(
  stateKey: string,
  family: OfficeFamily,
): number | null {
  const rule = readRequirements(stateKey, family)?.filingDeadlineRule ?? "";
  const found =
    /(\d+)(?:st|nd|rd|th)?\s+days?\s+(?:before|prior to)\s+the\s+(?:general\s+|regular\s+|municipal\s+)?election/i.exec(
      rule,
    );
  return found ? Number(found[1]) : null;
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
  return {
    filedWith: read?.filedWith ?? localFilingOfficer(usps, family),
    minimumAge: read?.minimumAge ?? 18,
    residency: read?.residency ?? null,
    registeredVoter: read?.registeredVoterRequired ?? true,
    source:
      source ||
      `data/research/elections/candidate-filing-terms.json: ${fallback?.estimatedFrom ?? "estimated"}`,
    estimate: read ? (read.estimate ?? false) : true,
    deadline: side?.deadline2026 ?? null,
  };
}

/** The filing rules for one contest and side. */
export function filingRulesFor(
  api: CoreAPI,
  contest: ContestRow,
  side: FilingSide,
): FilingRequirements {
  return filingRequirements(town(api).stateKey, contest.family, side);
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
    return state?.county?.title ?? office.clerkTitles.county ?? "County clerk";
  if (family === "municipalOffice")
    return (
      state?.municipal?.title ??
      office.clerkTitles.municipality ??
      "Municipal clerk"
    );
  return "Secretary of State";
}

/** Put every seat covering the town on its next contest. */
export function openElections(core: CoreState): void {
  if (!core.modules.has(ELECTIONS_MODULE_ID))
    registerModule(core, ELECTIONS_MODULE);
  registerElectorate(core);
  const api = coreAPI(core);
  const place = lifePlaceByKey(api.state.placeMetadata.placeKey ?? "");
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
  const daysBefore =
    family === "countyOffice" || family === "municipalOffice"
      ? deadlineDaysBefore(stateKey, family)
      : null;
  const deadline =
    daysBefore !== null && dates.basis === "estimated"
      ? new Date(
          Date.parse(`${dates.electionDate}T00:00:00Z`) -
            daysBefore * 86_400_000,
        )
          .toISOString()
          .slice(0, 10)
      : dates.filingDeadline;
  return {
    ...dates,
    filingDeadline: deadline,
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
  const days =
    (family === "countyOffice" || family === "municipalOffice"
      ? deadlineDaysBefore(town(api).stateKey, family)
      : null) ?? campaignParameter("specialFilingDaysBefore");
  const deadline = new Date(
    Date.parse(`${race.electionDate}T00:00:00Z`) - days * 86_400_000,
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
    basis: "estimated",
    sources: [`vacancy ${race.vacancyId}`],
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
  const resident = person.placeId === town(api).townPlaceId;
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
  if (rules.registeredVoter) {
    // stopgapId: SG-GOV-voter-registration-assumed
    api.stopgap("SG-GOV-voter-registration-assumed");
    checks.push({
      rule: "registered-voter",
      met: age >= 18 && resident,
      required: "registered to vote here",
      actual: age >= 18 && resident ? "registered" : "not registered here",
      source: rules.source,
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

function announce(api: CoreAPI, filing: FilingRow, contest: ContestRow): void {
  api.emit({
    id: `candidate-filed:${filing.id}`,
    date: api.state.date,
    kind: "candidate-filed",
    personIds: [filing.personId],
    placeId: town(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: contest.sources.join(" ; "),
      asOf: api.state.date,
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

/** Everyone on the ballot for a contest, filed so far. */
export function ballot(api: CoreAPI, contestId: string): readonly FilingRow[] {
  return (
    table(api, "filings").query("byContest", [
      contestId,
    ]) as unknown as FilingRow[]
  ).filter((f) => f.status === "on-ballot");
}

/** The incumbent's term, for a contest's record. */
export function incumbentOf(api: CoreAPI, contestId: string): TermRow | null {
  const contest = table(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  return contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow)
    : null;
}
