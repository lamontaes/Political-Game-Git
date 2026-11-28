/**
 * The elections engine's reads: its module id, a contest and its petition, who
 * is campaigning or standing, the ballot and what lies ahead in a race, and the
 * filing office, rules and requirements a seat's filers meet, from the research
 * tables. They import only those tables and filing-rule-office.ts, none of them
 * in a ring, so a reader takes them without loading the elections engine's
 * ring; modules/elections.ts re-exports each one and stays the one writer of
 * contests and filings.
 */
import filingTerms from "../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import filingOffice from "../../data/research/elections/filing-office.json" with { type: "json" };
import filingRequirementResearch from "../../data/research/elections/filing-requirements.json" with { type: "json" };
import federalQualifications from "./data/elections/federal-qualifications.json" with { type: "json" };
import fallbackData from "./data/elections/filing-fallbacks.json" with { type: "json" };
import petitionRules from "./data/elections/petition-rules.json" with { type: "json" };
import type { OfficeFamily } from "./elections-calendar";
import { describesByRule, ruleOfficeBody } from "./filing-rule-office";
import type {
  FilingSide,
  FilingRequirements,
  PetitionScale,
  PetitionRule,
  ContestRow,
  FilingRow,
  PetitionRow,
} from "./modules/elections";
import type { CoreAPI } from "./types";

export const ELECTIONS_MODULE_ID = "core2-elections-v1";

/** Whether a race is the town's own or its county's: the local races that local-turnout readings and the web's local-turnout links cover. */
export function isLocalFamily(family: OfficeFamily): boolean {
  return family === "municipalOffice" || family === "countyOffice";
}

export function table(api: CoreAPI, name: string) {
  return api.moduleState(ELECTIONS_MODULE_ID).table(name);
}

interface ReadSide {
  readonly deadline2026?: string | null;
  readonly signatures?: number | null;
  readonly signatureFormula?: string | null;
  readonly petitionInLieuOfFee?: boolean | string | null;
  readonly feeAndPetitionBothRequired?: boolean | null;
}

interface ReadRequirements {
  readonly applicable?: boolean;
  /**
   * Where a family's row names an at-large office but the place elects its
   * district seats under another family's row (the District of Columbia's
   * ward seats on the Council), the family a district seat reads.
   */
  readonly districtSeatsRead?: OfficeFamily;
  readonly filedWith?: string;
  readonly party?: ReadSide;
  readonly independent?: ReadSide;
  readonly minimumAge?: number | null;
  /** An office of the family whose own law sets another age (a Northern Marianas Mayor, 25, beside its council's 21). */
  readonly minimumAgeByOffice?: Readonly<Record<string, number>>;
  readonly residency?: string | null;
  readonly registeredVoterRequired?: boolean | null;
  readonly filingDeadlineRule?: string | null;
  readonly citation?: string | null;
  readonly source?: string | null;
  readonly secondarySources?: readonly string[];
  readonly estimate?: boolean;
}

export function readRequirements(
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
      stateKey,
      source || "data/research/elections/filing-requirements.json",
      petitionScaleFor(usps, family, sideName, read),
    ),
  };
}

/**
 * The place's rule in `petition-rules.json` for one family and side, if it
 * has one: the side's own row, or the party row where the research file's
 * independent row is not an object (as `sideRow` reads it).
 */
function petitionScaleFor(
  usps: string,
  family: OfficeFamily,
  sideName: FilingSide,
  read: ReadRequirements | undefined,
): PetitionScale | undefined {
  const rows = (
    petitionRules.families as unknown as Record<
      string,
      Record<
        string,
        { party?: PetitionScale; independent?: PetitionScale } | undefined
      >
    >
  )[family]?.[`US-${usps}`];
  if (sideName === "party") return rows?.party;
  const own = read?.independent;
  return own && typeof own === "object"
    ? (rows?.independent ?? rows?.party)
    : rows?.party;
}

function sideRow(
  read: ReadRequirements | undefined,
  sideName: FilingSide,
): ReadSide | undefined {
  const own = sideName === "independent" ? read?.independent : read?.party;
  if (own && typeof own === "object") return own;
  return read?.party && typeof read.party === "object" ? read.party : undefined;
}

/**
 * The signatures one side's petition must hold: the place's read count; none
 * where its row says the law asks none (signatures "where the place requires
 * them", owner, Oct 6, prior-rulings/elections.md R5, restored by the Oct 28
 * ruling that filing is a petition); where its row gives a formula, the
 * place's rule in `petition-rules.json`, computed for the race's own
 * electorate (owner, Nov 14: a race needs the number its own law sets).
 * A place and family with neither is a gap in the data, not a count.
 */
function petitionRule(
  side: ReadSide | undefined,
  family: OfficeFamily,
  stateKey: string,
  source: string,
  scale?: PetitionScale,
): PetitionRule {
  if (scale?.count === 0)
    return {
      count: 0,
      basis: "none-in-law",
      formula: scale.text,
      scale,
      source: `${source} ; read in petition-rules.json (estimate): ${scale.text}`,
    };
  if (scale)
    return {
      count: typeof side?.signatures === "number" ? side.signatures : 0,
      basis: "scaled",
      formula: scale.text,
      scale,
      source: `${source} ; sized for the race's electorate by the place's rule in petition-rules.json (estimate): ${scale.text}`,
    };
  const read = side?.signatures;
  if (typeof read === "number" && read > 0)
    return { count: read, basis: "read", formula: null, source };
  const formula = side?.signatureFormula?.trim() || null;
  if (read === 0 && !formula)
    return { count: 0, basis: "none-in-law", formula: null, source };
  // Where the law's petition is only a way around a filing fee (Minnesota's
  // "petition in lieu of fee by ordinance"; Kansas, Michigan, Texas and
  // others), the fee files the candidate and no petition is required: the
  // place asks signatures only of those who choose that route (prior-rulings
  // elections R5, "where the place requires them";
  // elections-petition-larger-than-the-town).
  if (
    typeof read !== "number" &&
    side?.feeAndPetitionBothRequired !== true &&
    (side?.petitionInLieuOfFee === true || /in lieu/i.test(formula ?? ""))
  )
    return { count: 0, basis: "none-in-law", formula, source };
  throw new Error(
    `No petition rule for ${stateKey} ${family}: add its row to petition-rules.json`,
  );
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
  // A district seat reads the row its place's data points it to, where the
  // family's own row is for the body's at-large seats.
  const family =
    (contest.district
      ? readRequirements(town(api).stateKey, contest.family)?.districtSeatsRead
      : undefined) ?? contest.family;
  const kind = contest.officeId.slice(contest.officeId.lastIndexOf(":") + 1);
  const familyRules = filingRequirements(town(api).stateKey, family, side);
  const ownAge = readRequirements(town(api).stateKey, family)
    ?.minimumAgeByOffice?.[kind];
  const stateRules =
    ownAge === undefined ? familyRules : { ...familyRules, minimumAge: ownAge };
  // A Senate or presidential candidate meets the Constitution's age, which a
  // state's age for its own statewide offices cannot lower.
  const federal = (
    federalQualifications.minimumAge as Record<
      string,
      { value: number; citation: string }
    >
  )[kind];
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
  const dated = contest.electionDate.startsWith("2026-")
    ? rules
    : { ...rules, deadline: null };
  // An office the data gives as a rule is the body it points to for this
  // town; where the game cannot know the county, the office without one.
  const body = describesByRule(dated.filedWith)
    ? ruleOfficeBody(dated.filedWith, contest.family, town(api).geoid)
    : null;
  return body ? { ...dated, filedWith: body } : dated;
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

export function town(api: CoreAPI) {
  return table(api, "town").get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
    /** The town's county place, where the world records one. */
    countyPlaceId?: string | null;
  };
}

/** A contest by its id, as its record stands; none for an id that is not one. */
export function contestOf(
  api: CoreAPI,
  contestId: string,
): ContestRow | undefined {
  return table(api, "contests").get(contestId) as unknown as
    ContestRow | undefined;
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
 * Whether a candidacy's campaign works today: it stands in its race
 * (`standing`), or it was announced and waits for its filing window.
 */
export function campaigning(
  filing: Readonly<Pick<FilingRow, "status">>,
): boolean {
  return standing(filing) || filing.status === "announced";
}

/**
 * Whether a filing stands in its race: on the ballot, or circulating its
 * petition until the clerk's check. A short or withdrawn filing does not.
 */
export function standing(filing: Readonly<Pick<FilingRow, "status">>): boolean {
  return filing.status === "on-ballot" || filing.status === "petitioning";
}

/**
 * Whether a filing's race is still ahead: the filing was not withdrawn and
 * its contest is decided on today or later (a petition the clerk found short
 * stays, for the player to see it left them off). A filing keeps "on-ballot"
 * after its race is counted, so what a person is running in now is read
 * through this, never the status alone. A primary's loser is already "withdrawn" when the primary
 * is counted, and a primary's winner stays here until the general.
 */
export function raceAhead(
  api: CoreAPI,
  filing: Readonly<Pick<FilingRow, "status" | "contestId">>,
): boolean {
  if (filing.status === "withdrawn") return false;
  const contest = table(api, "contests").get(filing.contestId) as unknown as
    ContestRow | undefined;
  if (!contest) return false;
  // An announcement never filed is out of the race once its filing closed.
  if (filing.status === "announced" && contest.filingDeadline < api.state.date)
    return false;
  return contest.electionDate >= api.state.date;
}

/**
 * Everyone standing in a contest, filed so far: on the ballot, or with a
 * petition out until the clerk checks it the morning after the deadline, so
 * after that only the names on the ballot. A candidate who has since died is
 * off it: the count, the polling place and the press read the living
 * candidates on the day they look.
 */
export function ballot(api: CoreAPI, contestId: string): readonly FilingRow[] {
  const filings = table(api, "filings");
  const stands = (f: FilingRow) =>
    standing(f) && api.state.people.get(f.personId)?.alive !== false;
  return (
    filings.query("byContest", [contestId]) as unknown as FilingRow[]
  ).filter(
    (f) =>
      stands(f) &&
      // A running mate stands while their governor candidate does.
      (!f.ticketWith ||
        stands(filings.get(f.ticketWith) as unknown as FilingRow)),
  );
}

/** A filing's petition, once opened. */
export function petitionOf(api: CoreAPI, filingId: string): PetitionRow | null {
  return (
    (table(api, "petitions").get(`petition:${filingId}`) as unknown as
      PetitionRow | undefined) ?? null
  );
}

/** Whether a filing's petition is out and has not been checked yet. */
export function petitionCirculating(api: CoreAPI, filingId: string): boolean {
  const petition = petitionOf(api, filingId);
  const filing = table(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
  // An announced candidacy gathers signatures ahead of its filing.
  return Boolean(
    petition &&
    !petition.check &&
    (filing?.status === "petitioning" || filing?.status === "announced") &&
    api.state.date <= petition.due,
  );
}
