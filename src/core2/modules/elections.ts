/**
 * Elections, part one: contests and filing (golden path step 3).
 *
 * At the opening every seat covering the town gets its next contest: the
 * election date, the primary and the filing deadline from
 * `elections-calendar.ts`. A person files at the office that takes that
 * contest's filings (`filingOfficeFor`), once, if they meet what that place's
 * rules require: age, residency and registration, read from
 * `data/research/elections/filing-requirements.json` (or the estimated terms
 * in `candidate-filing-terms.json` where a place isn't read yet). Filing is
 * a petition, signatures, the clerk's check, then the ballot (owner, Oct 28,
 * reversing the Oct 13 "no fee or petition" ruling): a filing opens a
 * petition with the signatures the place's law asks (`petitionRule`), the
 * candidate's campaign gathers them (`signPetition`, from the campaign
 * engine's doors, events and circle), and the voting engine's clerk checks
 * them the morning after the deadline (`keepPetitionCheck`). No fee is
 * charged. The filing becomes a record; an unmet rule comes back as
 * structured reasons the English engine words.
 */
import { registerElectorate } from "../electorate";
import {
  recordTermLimitFiling,
  termLimitReached,
} from "../law-reach/group-a-voting";
import { campaignParameter } from "../campaign-views";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import { partyName } from "../appointments";
import fallbackData from "../data/elections/filing-fallbacks.json" with { type: "json" };
import federalQualifications from "../data/elections/federal-qualifications.json" with { type: "json" };
import filingTerms from "../../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import filingRequirementResearch from "../../../data/research/elections/filing-requirements.json" with { type: "json" };
import filingOffice from "../../../data/research/elections/filing-office.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
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
/** This world's swing from 2024, for the engines outside elections that read a place's lean. */
export {
  publishedSenateSeats,
  worldRoster,
  worldSeatParty,
  worldSwing,
} from "../electorate-places";

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
  /** The signatures the side's petition must hold. */
  readonly petition: PetitionRule;
}

/** The signatures a place's law asks of one side's petition for one family of offices. */
export interface PetitionRule {
  /** Signatures of the district's voters the petition must hold. */
  readonly count: number;
  /**
   * "read" where the place's row gives the count, "none-in-law" where it
   * says the law asks none (a fee or a declaration instead: no petition).
   * Otherwise the count is the read counts' median for the family and side:
   * the row gives a formula ("formula") or nothing ("unread").
   */
  readonly basis: "read" | "formula" | "none-in-law" | "unread";
  /** The place's own words for the rule, where its row gives a formula. */
  readonly formula: string | null;
  readonly source: string;
}

/** A signature on a petition: who signed, the day, and how the campaign asked. */
export interface PetitionSigner {
  readonly personId: string;
  readonly on: string;
  readonly via: "door" | "event" | "circle";
}

/** One filing's petition: what the law asks, what this world's clerk counts, who signed, and the check. */
export interface PetitionRow {
  readonly id: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly personId: string;
  /** The law's count for the whole district, and how it was read. */
  readonly rule: PetitionRule;
  /**
   * The count the clerk checks in this world: the rule's count where the town
   * is the district, the town's share of it where the district reaches past
   * the town (SG-GOV-petition-town-share).
   */
  readonly needed: number;
  /** The day it was taken out (the filing's day). */
  readonly opened: string;
  /** The last day to hand the petition in. */
  readonly due: string;
  readonly signers: readonly PetitionSigner[];
  /** The clerk's check: the day, the signatures that stood and those struck. */
  readonly check?: {
    readonly on: string;
    readonly valid: number;
    readonly struckIds: readonly string[];
  };
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
    | "term-limit"
    | "district-residency";
  readonly met: boolean;
  readonly required: string;
  readonly actual: string;
  readonly source: string;
  /** For an unmet minimum age: the day they turn the required age. */
  readonly metOn?: string;
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
  /**
   * "petitioning" while the candidate gathers signatures, then "on-ballot"
   * or "short" by the clerk's check; "withdrawn" for one who left the race
   * or lost a primary.
   */
  readonly status: "petitioning" | "on-ballot" | "short" | "withdrawn";
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
      // One petition a filing: the signatures the law asks, who signed and
      // the clerk's check (`openPetition`, `signPetition`).
      petitions: {
        indexes: { byContest: { fields: ["contestId"] } },
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
  readonly signatures?: number | null;
  readonly signatureFormula?: string | null;
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
    petition: petitionRule(
      sideRow(read, sideName),
      family,
      sideName,
      source || "data/research/elections/filing-requirements.json",
    ),
  };
}

/** A side's row as an object, the party side where the independents' is not one. */
function sideRow(
  read: ReadRequirements | undefined,
  sideName: FilingSide,
): ReadSide | undefined {
  const own = sideName === "independent" ? read?.independent : read?.party;
  if (own && typeof own === "object") return own;
  return read?.party && typeof read.party === "object" ? read.party : undefined;
}

/** Each family and side's read signature counts, from every place's row. */
const readCounts = new Map<string, readonly number[]>();
function readCountsFor(family: OfficeFamily, sideName: FilingSide) {
  const key = `${family}|${sideName}`;
  const held = readCounts.get(key);
  if (held) return held;
  const places = (
    filingRequirementResearch as unknown as {
      places: Record<string, Record<string, ReadRequirements>>;
    }
  ).places;
  const counts = Object.values(places)
    .map((row) => sideRow(row?.[family], sideName)?.signatures)
    .filter((n): n is number => typeof n === "number" && n > 0)
    .sort((a, b) => a - b);
  readCounts.set(key, counts);
  return counts;
}

/**
 * The signatures one side's petition must hold: the place's read count; none
 * where its row says the law asks none (signatures "where the place requires
 * them", owner, Oct 6, prior-rulings/elections.md R5, restored by the Oct 28
 * ruling that filing is a petition); or where its row gives a formula or
 * nothing, the read counts' median for the family and side ("estimate from
 * similar places and mark it estimated", R5).
 */
function petitionRule(
  side: ReadSide | undefined,
  family: OfficeFamily,
  sideName: FilingSide,
  source: string,
): PetitionRule {
  const read = side?.signatures;
  if (typeof read === "number" && read > 0)
    return { count: read, basis: "read", formula: null, source };
  const formula = side?.signatureFormula?.trim() || null;
  if (read === 0 && !formula)
    return { count: 0, basis: "none-in-law", formula: null, source };
  const counts = readCountsFor(family, sideName);
  const mid = Math.floor(counts.length / 2);
  const median = counts.length
    ? counts.length % 2
      ? counts[mid]!
      : Math.ceil((counts[mid - 1]! + counts[mid]!) / 2)
    : 0;
  return {
    count: median,
    basis: formula ? "formula" : "unread",
    formula,
    source: `${source} ; estimated: the median of the read ${family} ${sideName} signature counts`,
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
  const stateRules = filingRequirements(
    town(api).stateKey,
    contest.family,
    side,
  );
  if (stateRules.fallbacks.length) {
    // stopgapId: SG-GOV-filing-fallbacks
    api.stopgap("SG-GOV-filing-fallbacks");
  }
  // Where the place's row gives a formula or no signature count, the
  // petition asks the read counts' median (`petitionRule`).
  if (
    stateRules.petition.basis === "formula" ||
    stateRules.petition.basis === "unread"
  ) {
    // stopgapId: SG-GOV-petition-count-estimated
    api.stopgap("SG-GOV-petition-count-estimated");
  }
  // A Senate or presidential candidate meets the Constitution's age, which a
  // state's age for its own statewide offices cannot lower.
  const federal = (
    federalQualifications.minimumAge as Record<
      string,
      { value: number; citation: string }
    >
  )[contest.officeId.slice(contest.officeId.lastIndexOf(":") + 1)];
  const rules =
    federal && federal.value > stateRules.minimumAge
      ? {
          ...stateRules,
          minimumAge: federal.value,
          source: [federal.citation, stateRules.source]
            .filter(Boolean)
            .join(" ; "),
        }
      : stateRules;
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
  // An office its law creates later is first filled at the last election
  // before its first term, as a term ending then would be.
  let dates = at(holder?.endDate ?? office.firstTermStart ?? null);
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

/**
 * The ward a ward seat represents and the ward a person lives in, null for an
 * at-large seat or a person whose home is not placed. The voting engine holds
 * the town's wards and registers the lookup.
 */
let wardResidency:
  | ((
      api: CoreAPI,
      contest: ContestRow,
      person: Readonly<PersonState>,
    ) => { readonly seatWard: number; readonly homeWard: number } | null)
  | null = null;
export function registerWardResidency(
  lookup: NonNullable<typeof wardResidency>,
): void {
  wardResidency = lookup;
}

/** The day someone born on `birthDate` turns `years` (a February 29 birthday counts on March 1 in a common year). */
function birthdayOn(birthDate: string, years: number): string {
  const year = Number(birthDate.slice(0, 4)) + years;
  const monthDay = birthDate.slice(5);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return `${year}-${monthDay === "02-29" && !leap ? "03-01" : monthDay}`;
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
      ...(age < rules.minimumAge
        ? { metOn: birthdayOn(person.birthDate, rules.minimumAge) }
        : {}),
    },
    {
      rule: "residency",
      met: resident,
      required: rules.residency ?? "lives in the area the office serves",
      actual: resident ? "lives here" : "lives elsewhere",
      source: rules.source,
    },
  ];
  // A seat chosen by part of town asks its candidate to live in that part.
  // The check carries the two wards as record data; the clerk's words for it
  // come from the English engine.
  // stopgapId: SG-GOV-ward-residency
  const wards =
    resident && !holdsSeat
      ? (wardResidency?.(api, contest, person) ?? null)
      : null;
  if (wards !== null) {
    api.stopgap("SG-GOV-ward-residency");
    checks.push({
      rule: "district-residency",
      met: wards.homeWard === wards.seatWard,
      required: String(wards.seatWard),
      actual: String(wards.homeWard),
      source:
        "Assumed: most charters with district seats ask it (SG-GOV-ward-residency)",
    });
  }
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

/**
 * File once, at no charge: the candidate takes out a petition and stands in
 * the race while it circulates; the clerk's check after the deadline puts
 * them on the ballot or leaves them short.
 */
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
  // A term limit in force reached this filing (law-reach, group A).
  recordTermLimitFiling(api, input.personId, contest.officeId);
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
    status: "petitioning",
  };
  table(api, "filings").put(filing as unknown as ModuleRow);
  announce(api, filing, contest);
  // The clerk takes a filing whose law asks no signatures at the counter
  // (the voting engine's check, on the announcement): read it back.
  const kept = table(api, "filings").get(id) as unknown as FilingRow;
  return { status: kept.status, filing: kept };
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
  // The ballot is public: each candidate already on it learns who filed
  // against them, a record of their own.
  for (const other of ballot(api, contest.id))
    if (
      other.personId !== filing.personId &&
      api.state.people.get(other.personId)?.alive
    )
      api.emit({
        id: `${RIVAL_FILED_EVENT}:${filing.id}:${other.personId}`,
        date: api.state.date,
        kind: RIVAL_FILED_EVENT,
        personIds: [
          other.personId,
          ...(api.state.people.has(filing.personId) ? [filing.personId] : []),
        ],
        placeId: town(api).townPlaceId,
        source: {
          tag: "SOURCED",
          citation: `Filing ${filing.id}, on the ballot beside ${other.id}`,
          asOf: api.state.date,
        },
        facts: {
          invitedId: other.personId,
          rivalId: filing.personId,
          filingId: filing.id,
          contestId: contest.id,
          office: contest.title,
        },
      });
}

/** The kind of a candidate's own record that someone filed against them. */
export const RIVAL_FILED_EVENT = "rival-filed";

/**
 * Whether a filing stands in its race: on the ballot, or circulating its
 * petition until the clerk's check. A short or withdrawn filing does not.
 */
export function standing(filing: Readonly<Pick<FilingRow, "status">>): boolean {
  return filing.status === "on-ballot" || filing.status === "petitioning";
}

/**
 * Everyone standing in a contest, filed so far: on the ballot, or with a
 * petition out until the clerk checks it the morning after the deadline, so
 * after that only the names on the ballot. A candidate who has since died is
 * off it: the count, the polling place and the press read the living
 * candidates on the day they look.
 */
export function ballot(api: CoreAPI, contestId: string): readonly FilingRow[] {
  return (
    table(api, "filings").query("byContest", [
      contestId,
    ]) as unknown as FilingRow[]
  ).filter(
    (f) => standing(f) && api.state.people.get(f.personId)?.alive !== false,
  );
}

/** The last day a filing's petition may be handed in: its side's own deadline, else the contest's. */
export function petitionDue(api: CoreAPI, filing: FilingRow): string {
  const contest = table(api, "contests").get(
    filing.contestId,
  ) as unknown as ContestRow;
  const rules = filingRulesFor(
    api,
    contest,
    filing.party ? "party" : "independent",
  );
  return rules.deadline ?? contest.filingDeadline;
}

/** A filing's petition, once opened. */
export function petitionOf(api: CoreAPI, filingId: string): PetitionRow | null {
  return (
    (table(api, "petitions").get(`petition:${filingId}`) as unknown as
      PetitionRow | undefined) ?? null
  );
}

/** Open a petitioning filing's petition (the voting engine sizes what its clerk counts). */
export function openPetition(
  api: CoreAPI,
  filing: FilingRow,
  input: { readonly rule: PetitionRule; readonly needed: number },
): PetitionRow {
  const row: PetitionRow = {
    id: `petition:${filing.id}`,
    filingId: filing.id,
    contestId: filing.contestId,
    personId: filing.personId,
    rule: input.rule,
    needed: input.needed,
    opened: filing.filedOn,
    due: petitionDue(api, filing),
    signers: [],
  };
  table(api, "petitions").put(row as unknown as ModuleRow);
  return row;
}

/** Whether a filing's petition is out and has not been checked yet. */
export function petitionCirculating(api: CoreAPI, filingId: string): boolean {
  const petition = petitionOf(api, filingId);
  const filing = table(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
  return Boolean(
    petition &&
    !petition.check &&
    filing?.status === "petitioning" &&
    api.state.date <= petition.due,
  );
}

/**
 * Add a signature to a circulating petition, once a person: the campaign
 * engine asks, and the signer answers from their own reasons. Returns
 * whether the name was added.
 */
export function signPetition(
  api: CoreAPI,
  filingId: string,
  personId: string,
  via: PetitionSigner["via"],
): boolean {
  if (!petitionCirculating(api, filingId)) return false;
  const petition = petitionOf(api, filingId)!;
  if (personId === petition.personId) return false;
  if (petition.signers.some((s) => s.personId === personId)) return false;
  table(api, "petitions").put({
    ...petition,
    signers: [...petition.signers, { personId, on: api.state.date, via }],
  } as unknown as ModuleRow);
  return true;
}

/** Who has signed a filing's petition, by id. */
export function petitionSignerIds(
  api: CoreAPI,
  filingId: string,
): ReadonlySet<string> {
  return new Set(
    (petitionOf(api, filingId)?.signers ?? []).map((s) => s.personId),
  );
}

/** The kind of the public record of a clerk's petition check. */
export const PETITION_CHECKED_EVENT = "petition-checked";

/**
 * Keep the clerk's check of a petition: the filing goes on the ballot with
 * enough signatures standing, or is left short. The check is a public
 * record the candidate, the press and the town learn.
 */
export function keepPetitionCheck(
  api: CoreAPI,
  filingId: string,
  check: { readonly valid: number; readonly struckIds: readonly string[] },
): FilingRow["status"] {
  const petition = petitionOf(api, filingId);
  const filing = table(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
  if (!petition || !filing || filing.status !== "petitioning")
    return filing?.status ?? "withdrawn";
  const status = check.valid >= petition.needed ? "on-ballot" : "short";
  table(api, "petitions").put({
    ...petition,
    check: { on: api.state.date, ...check },
  } as unknown as ModuleRow);
  table(api, "filings").put({ ...filing, status } as unknown as ModuleRow);
  const contest = table(api, "contests").get(
    filing.contestId,
  ) as unknown as ContestRow;
  api.emit({
    id: `${PETITION_CHECKED_EVENT}:${filing.id}`,
    date: api.state.date,
    kind: PETITION_CHECKED_EVENT,
    personIds: api.state.people.has(filing.personId) ? [filing.personId] : [],
    placeId: town(api).townPlaceId,
    source: {
      tag: petition.rule.basis === "read" ? "SOURCED" : "ESTIMATED",
      citation: petition.rule.source,
      asOf: api.state.date,
      ...(petition.rule.basis === "read"
        ? {}
        : { estimatedFrom: "SG-GOV-petition-count-estimated" }),
    },
    publicRecord: true,
    news: true,
    facts: {
      filingId: filing.id,
      petitionId: petition.id,
      contestId: contest.id,
      office: contest.title,
      status,
      signatures: String(petition.signers.length),
      valid: String(check.valid),
      needed: String(petition.needed),
      filedWith: filing.filedWith,
    },
  });
  return status;
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
