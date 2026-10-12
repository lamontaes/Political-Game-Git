/**
 * Elections, part one: contests and filing (golden path step 3).
 *
 * At the opening every seat covering the town gets its next contest: the
 * election date, the primary and the filing deadline from
 * `elections-calendar.ts`. A person files at the office that takes that
 * contest's filings (`filingOfficeFor`), once, if they meet what that place's
 * rules require: age, residency, registration, and a fee or signatures, read
 * from `data/research/elections/filing-requirements.json` (or the estimated
 * terms in `candidate-filing-terms.json` where a place isn't read yet). The
 * filing, the fee and every signature become records; an unmet rule comes
 * back as structured reasons the English engine words.
 *
 * Signatures are gathered from real people: each signer decides for
 * themselves (`requestSignature`).
 */
import { registerElectorate } from "../electorate";
import { termLimitReached } from "../law-reach/group-a-voting";
import { campaignParameter } from "../campaign-views";
import filingTerms from "../../../data/research/elections/candidate-filing-terms.json" with { type: "json" };
import filingRequirementResearch from "../../../data/research/elections/filing-requirements.json" with { type: "json" };
import filingOffice from "../../../data/research/elections/filing-office.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { CashJournalSourceSlot } from "../journal-state";
import { lifePlaceByKey } from "../../simulation/life-places";
import { nextElectionForSeat, type ElectionDates } from "../elections-calendar";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import type { OfficeInput } from "../offices-local";

export const ELECTIONS_MODULE_ID = "core2-elections-v1";
const FILING_FEE_KIND = "elections:filing-fee";

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
}

export interface FilingRequirements {
  readonly filedWith: string;
  readonly feeMinor: number | null;
  readonly signatures: number | null;
  readonly feeInLieuOfSignatures: boolean;
  readonly minimumAge: number;
  readonly residency: string | null;
  readonly registeredVoter: boolean;
  readonly source: string;
  readonly estimate: boolean;
}

/** One rule checked for a would-be candidate: what's required and where they stand. */
export interface RequirementCheck {
  readonly rule:
    | "filing-deadline"
    | "already-filed"
    | "minimum-age"
    | "residency"
    | "registered-voter"
    | "fee-or-signatures"
    | "term-limit"
    | "fee"
    | "signatures";
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
  readonly feePaidMinor: number;
  readonly signatureCount: number;
  readonly status: "gathering-signatures" | "on-ballot" | "withdrawn";
}

export interface SignatureRow {
  readonly id: string;
  readonly filingId: string;
  readonly signerId: string;
  readonly date: string;
  readonly signed: boolean;
  readonly reason: string;
}

interface FeeRecord {
  readonly id: string;
  readonly date: string;
  readonly source: Source;
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
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
      signatures: {
        indexes: {
          byFiling: { fields: ["filingId"] },
          bySigner: { fields: ["signerId"] },
        },
      },
      fees: {},
      town: {},
    },
  },
  journalSourceProviders: {
    [FILING_FEE_KIND]: (api, reference) => feeSlot(api, reference.id),
  },
};

/**
 * The journal writes its posted marker into the canonical fee record, so each
 * fee resolves to one live object per world.
 */
const feeSlots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function feeSlot(api: CoreAPI, id: string): CashJournalSourceSlot | undefined {
  const slots =
    feeSlots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  feeSlots.set(api.state, slots);
  const cached = slots.get(id);
  if (cached) return cached;
  const fee = table(api, "fees").get(id) as unknown as FeeRecord | undefined;
  if (!fee) return undefined;
  const resolved = {
    kind: FILING_FEE_KIND,
    id: fee.id,
    date: fee.date,
    source: fee.source,
    expectedPostings: fee.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  const slot = {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
  slots.set(id, slot);
  return slot;
}

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
  readonly feeUSD?: number | null;
  readonly signatures?: number | null;
  readonly feeInLieuOfSignatures?: boolean;
  readonly petitionInLieuOfFee?: boolean | string;
  readonly feeAndPetitionBothRequired?: boolean;
}
interface ReadRequirements {
  readonly applicable?: boolean;
  readonly filedWith?: string;
  readonly party?: ReadSide;
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
): FilingRequirements {
  const read = readRequirements(stateKey, family);
  const side = read?.party;
  const usps = stateKey.slice(3);
  const estimated = (
    filingTerms as unknown as {
      places: Record<
        string,
        Record<
          string,
          {
            feeMinorUnits: number;
            signatures: number;
            feeInLieuOfSignatures: boolean;
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
  const fee = typeof side?.feeUSD === "number" ? side.feeUSD : null;
  const signatures =
    typeof side?.signatures === "number" ? side.signatures : null;
  const source = [
    read?.citation,
    read?.source,
    ...(read?.secondarySources ?? []),
  ]
    .filter(Boolean)
    .join(" ; ");
  return {
    filedWith: read?.filedWith ?? localFilingOfficer(usps, family),
    feeMinor:
      fee !== null ? Math.round(fee * 100) : (fallback?.feeMinorUnits ?? null),
    signatures: signatures ?? fallback?.signatures ?? null,
    feeInLieuOfSignatures: side
      ? side.feeAndPetitionBothRequired !== true &&
        (side.feeInLieuOfSignatures === true ||
          side.petitionInLieuOfFee === true)
      : (fallback?.feeInLieuOfSignatures ?? true),
    minimumAge: read?.minimumAge ?? 18,
    residency: read?.residency ?? null,
    registeredVoter: read?.registeredVoterRequired ?? true,
    source:
      source ||
      `data/research/elections/candidate-filing-terms.json: ${fallback?.estimatedFrom ?? "estimated"}`,
    estimate: read ? (read.estimate ?? false) : true,
  };
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
export function filingOfficeFor(api: CoreAPI, contestId: string) {
  const contest = table(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  return filingRequirements(town(api).stateKey, contest.family);
}

/** Every rule for one person filing in one contest, checked today. */
export function checkEligibility(
  api: CoreAPI,
  personId: string,
  contestId: string,
): readonly RequirementCheck[] {
  const contest = table(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  const rules = filingRequirements(town(api).stateKey, contest.family);
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
  const cash = person.liquidMinor;
  const checks: RequirementCheck[] = [
    {
      rule: "filing-deadline",
      met: today <= contest.filingDeadline,
      required: contest.filingDeadline,
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
  const fee = rules.feeMinor ?? 0;
  if (rules.feeInLieuOfSignatures && rules.signatures && fee)
    checks.push({
      rule: "fee-or-signatures",
      met: true,
      required: `${fee} minor units, or ${rules.signatures} signatures`,
      actual: `${cash} minor units on hand`,
      source: rules.source,
    });
  else if (fee)
    checks.push({
      rule: "fee",
      met: cash >= fee,
      required: String(fee),
      actual: String(cash),
      source: rules.source,
    });
  return checks;
}

/**
 * File once. Pays the fee from the candidate's own cash where the person
 * chooses the fee (or the place requires it); otherwise the filing waits for
 * its signatures and goes on the ballot when they're in.
 */
export function fileCandidacy(
  api: CoreAPI,
  input: {
    readonly personId: string;
    readonly contestId: string;
    readonly platform: readonly string[];
    readonly payFee: boolean;
    readonly party?: string | null;
  },
):
  | { readonly status: "refused"; readonly unmet: readonly RequirementCheck[] }
  | { readonly status: FilingRow["status"]; readonly filing: FilingRow } {
  const checks = checkEligibility(api, input.personId, input.contestId);
  const unmet = checks.filter((c) => !c.met);
  const contest = table(api, "contests").get(
    input.contestId,
  ) as unknown as ContestRow;
  const rules = filingRequirements(town(api).stateKey, contest.family);
  const person = api.state.people.get(input.personId)!;
  const fee = rules.feeMinor ?? 0;
  const paying =
    fee > 0 &&
    (input.payFee || !rules.signatures || !rules.feeInLieuOfSignatures);
  if (paying && person.liquidMinor < fee)
    unmet.push({
      rule: "fee",
      met: false,
      required: String(fee),
      actual: String(person.liquidMinor),
      source: rules.source,
    });
  if (unmet.length) return { status: "refused", unmet };
  const today = api.state.date;
  const id = `filing:${input.contestId}:${input.personId}`;
  const needsSignatures = !paying && (rules.signatures ?? 0) > 0;
  const filing: FilingRow = {
    id,
    contestId: input.contestId,
    personId: input.personId,
    filedOn: today,
    filedWith: rules.filedWith,
    platform: [...input.platform],
    party: input.party ?? null,
    feePaidMinor: paying ? fee : 0,
    signatureCount: 0,
    status: needsSignatures ? "gathering-signatures" : "on-ballot",
  };
  table(api, "filings").put(filing as unknown as ModuleRow);
  if (paying) payFee(api, filing, contest, rules, fee);
  if (filing.status === "on-ballot") announce(api, filing, contest);
  return { status: filing.status, filing };
}

function governmentFor(api: CoreAPI, contest: ContestRow): string {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput;
  // The government's own account: its treasury where the budgets engine
  // opened one, else any of its accounts that can take a payment (an
  // outside payer from the opening can't).
  const accounts = [...api.state.organizations.values()]
    .filter(
      (org) =>
        org.governmentFacts?.governmentKey === office.jurisdiction &&
        !org.outsideFlow,
    )
    .sort(
      (a, b) =>
        Number(b.kind === "government-treasury") -
          Number(a.kind === "government-treasury") || a.id.localeCompare(b.id),
    );
  if (accounts[0]) return accounts[0].id;
  // The government that takes the filing isn't in the world yet: record it.
  const id = `organization:government:${office.jurisdiction}`;
  if (!api.state.organizations.has(id))
    api.addOrganization({
      id,
      placeId: town(api).townPlaceId,
      name: office.governmentName,
      kind: "government",
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: office.source,
        asOf: api.state.date,
      },
      governmentFacts: { governmentKey: office.jurisdiction },
    });
  return id;
}

function payFee(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
  rules: FilingRequirements,
  fee: number,
): void {
  const government = governmentFor(api, contest);
  const id = `fee:${filing.id}`;
  const record: FeeRecord = {
    id,
    date: api.state.date,
    source: rules.estimate
      ? {
          tag: "ESTIMATED",
          citation: rules.source,
          asOf: api.state.date,
          estimatedFrom: rules.source,
        }
      : { tag: "SOURCED", citation: rules.source, asOf: api.state.date },
    postings: [
      {
        id: `${id}:out`,
        accountId: `cash:${filing.personId}:residual`,
        deltaMinor: -fee,
      },
      {
        id: `${id}:in`,
        accountId: `cash:${government}:residual`,
        deltaMinor: fee,
      },
    ],
  };
  table(api, "fees").put(record as unknown as ModuleRow);
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: FILING_FEE_KIND, id },
    postings: record.postings,
  });
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

/**
 * Ask one person to sign a candidate's petition. They sign if they may (an
 * adult who lives here and hasn't signed this petition) and they choose to:
 * someone who knows the candidate signs; a stranger signs when their own
 * openness outweighs their wariness (stand-in until PEOPLE's views let them
 * weigh the platform: SG-GOV-signature-decision).
 */
export function requestSignature(
  api: CoreAPI,
  filingId: string,
  signerId: string,
): SignatureRow {
  const filing = table(api, "filings").get(filingId) as unknown as FilingRow;
  const signer = api.state.people.get(signerId);
  const today = api.state.date;
  const already = (
    table(api, "signatures").query("byFiling", [
      filingId,
    ]) as unknown as SignatureRow[]
  ).some((s) => s.signerId === signerId && s.signed);
  const age = signer
    ? Number(today.slice(0, 4)) - Number(signer.birthDate.slice(0, 4))
    : 0;
  let signed = false;
  let reason: string;
  if (!signer || !signer.alive) reason = "not-available";
  else if (already) reason = "already-signed";
  else if (age < 18 || signer.placeId !== town(api).townPlaceId)
    reason = "not-eligible-to-sign";
  else if (signer.knownIds.has(filing.personId)) {
    signed = true;
    reason = "knows-the-candidate";
  } else {
    // stopgapId: SG-GOV-signature-decision
    api.stopgap("SG-GOV-signature-decision");
    signed =
      (signer.traits["people-mind-v1:sociability"] ?? 0) >
      (signer.traits["people-mind-v1:conflict"] ?? 0);
    reason = signed ? "open-to-the-candidate" : "wary-of-a-stranger";
  }
  const row: SignatureRow = {
    id: `signature:${filingId}:${signerId}:${today}`,
    filingId,
    signerId,
    date: today,
    signed,
    reason,
  };
  table(api, "signatures").put(row as unknown as ModuleRow);
  if (signed) {
    const contest = table(api, "contests").get(
      filing.contestId,
    ) as unknown as ContestRow;
    const rules = filingRequirements(town(api).stateKey, contest.family);
    const count = filing.signatureCount + 1;
    const done =
      filing.status === "gathering-signatures" &&
      count >= (rules.signatures ?? 0);
    const next: FilingRow = {
      ...filing,
      signatureCount: count,
      status: done ? "on-ballot" : filing.status,
    };
    table(api, "filings").put(next as unknown as ModuleRow);
    if (done) announce(api, next, contest);
  }
  return row;
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
