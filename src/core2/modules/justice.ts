/**
 * Justice, the small version (owner, October 14, 2026: "Courts, trials,
 * prisons: build a small version"). A crime the corruption engine recorded
 * reaches a prosecutor only through someone who knows of it: the official
 * who refused a bribe, or someone a party told. Each step is decided from
 * the records, never a roll:
 *
 * 1. Report: the person who knows weighs reporting against their tie to the
 *    accused and their own traits.
 * 2. Investigation: the prosecutor weighs the evidence, how prominent the
 *    corrupted office is and their own party against the accused's. An open
 *    investigation follows the money: every payment the accused made or took
 *    on the books brings in the other party.
 * 3. Charge and plea: after the charging time, each target is charged when
 *    the evidence clears the prosecutor's bar (raised by the cases they have
 *    lost); a charged defendant pleads when the case against them, net of
 *    what their money buys in defense, would convict.
 * 4. Trial: on the state's time to disposition, the verdict is the same read
 *    of evidence against defense, with its reasons.
 * 5. Sentence: the state's range for the offense, slid by the bribe's size
 *    and the office; a fine paid to the treasury on the journal, probation, or
 *    prison. A conviction vacates the person's seats by the place's
 *    forfeiture rule. Prison ends the job and the person's own choices until
 *    release; release returns them with the conviction on record.
 *
 * Every step is an event the news and the director read: the hearing and the
 * verdict play as scenes when the person is the player or in their circle.
 */
import { registerModule } from "../state";
import { completedMonthsBetween, makeIsoDate } from "../kernel/dates";
import { decisionLean } from "../trait-decisions";
import type { CashJournalSourceSlot } from "../journal-state";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  Source,
} from "../types";
import { CORRUPTION_MODULE_ID, type CrimeRecord } from "./corruption";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import { lawChain } from "./laws";
import { vacateSeat } from "./offices";
import { closenessBetween } from "../closeness";
import {
  briberyRange,
  chargeDecisionDays,
  bribeProceedsForfeited,
  convictionForfeitsOffice,
  dispositionDays,
  justiceParameter,
  partyOf,
  prominenceOf,
  prosecutorFor,
  servingTermsOf,
  type ProsecutorOffice,
} from "../justice-law";
import { holdInCustody, releaseFromCustody } from "../justice-custody";
import { decidePretrial, endPretrial } from "../justice-pretrial";

export const JUSTICE_MODULE_ID = "core2-justice-v1";
const FINE_KIND = "justice-fine";

export interface ComplaintRow {
  readonly id: string;
  readonly crimeId: string;
  readonly reporterId: PersonId;
  /** A party to the act (the official who refused) or someone a party told. */
  readonly basis: "witness" | "told";
  readonly date: string;
  /** Everyone the records show knew of the act when it was reported. */
  readonly knewIds: readonly PersonId[];
  readonly prosecutorOfficeId: string;
  readonly reasons: Readonly<Record<string, number>>;
}

export interface InvestigationRow {
  readonly id: string;
  /** The complaints it rests on, the first one opening it. */
  readonly complaintIds: readonly string[];
  readonly crimeId: string;
  readonly prosecutorOfficeId: string;
  readonly prosecutorPersonId: PersonId | null;
  readonly opened: boolean;
  readonly date: string;
  readonly reasons: Readonly<Record<string, number>>;
  /** Filled once open: who is under investigation, for which acts, on what evidence. */
  readonly targets: readonly InvestigationTarget[];
  readonly status: "declined" | "open" | "closed";
}

export interface InvestigationTarget {
  readonly personId: PersonId;
  readonly crimeIds: readonly string[];
  /** Each piece of evidence: a witness complaint, a report from someone told, a payment on the books. */
  readonly evidence: readonly {
    readonly kind: "witness" | "told" | "payment";
    readonly recordId: string;
    readonly strength: number;
  }[];
  readonly strength: number;
}

export interface CaseRow {
  readonly id: string;
  readonly investigationId: string;
  readonly prosecutorOfficeId: string;
  readonly defendantId: PersonId;
  readonly crimeIds: readonly string[];
  readonly evidence: number;
  readonly date: string;
  readonly status:
    "no-charge" | "charged" | "convicted" | "acquitted" | "dismissed";
  readonly plea: boolean;
  readonly trialDate: string | null;
  readonly reasons: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly sentenceId: string | null;
  /** The defendant testified against another target for a lighter sentence. */
  readonly cooperated?: boolean;
  /** The targets whose cases this defendant's testimony strengthened. */
  readonly testifiedAgainst?: readonly PersonId[];
}

export interface SentenceRow {
  readonly id: string;
  readonly caseId: string;
  readonly personId: PersonId;
  readonly date: string;
  readonly severity: number;
  readonly fineMinor: number;
  readonly finePaidMinor: number;
  /** The bribe money the defendant took, forfeited to the treasury ahead of the fine. */
  readonly forfeitureMinor: number;
  readonly forfeiturePaidMinor: number;
  readonly treasuryId: string | null;
  readonly probationMonths: number;
  readonly custodyMonths: number;
  readonly releaseDate: string | null;
  readonly seatsVacated: readonly string[];
  /** Every job the prison term ended. */
  readonly jobsEnded: readonly string[];
  readonly reasons: Readonly<Record<string, number>>;
  readonly source: Source;
}

export interface CustodyRow {
  readonly id: string;
  readonly personId: PersonId;
  readonly sentenceId: string;
  readonly from: string;
  readonly until: string;
  readonly status: "serving" | "released" | "died";
  readonly priorEligible: boolean | null;
}

const p = (api: CoreAPI, key: string) => justiceParameter(api, key);
const table = (api: CoreAPI, name: string) =>
  api.moduleState(JUSTICE_MODULE_ID).table(name);
const crimes = (api: CoreAPI) =>
  api.moduleState(CORRUPTION_MODULE_ID).table("crimes");

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + Math.round(days) * 86_400_000)
    .toISOString()
    .slice(0, 10);

function closeness(api: CoreAPI, a: PersonId, b: PersonId): number {
  for (const id of api.state.relationshipsByPerson.get(a) ?? []) {
    const row = api.state.relationships.get(id)!;
    if (row.actorId === b || row.otherId === b) return row.level;
  }
  return api.parameter("zero");
}

/** A person's trait lean between two options of a justice decision, or none for someone not a person yet. */
function lean(
  api: CoreAPI,
  personId: PersonId | null,
  decision: string,
  toward: string,
  over: string,
): number {
  const person = personId ? api.state.people.get(personId) : undefined;
  return person
    ? decisionLean(api.state, person, decision, toward, over)
    : api.parameter("zero");
}

const one = (api: CoreAPI) => api.parameter("one");
const zero = (api: CoreAPI) => api.parameter("zero");
const clamp01 = (api: CoreAPI, x: number) =>
  Math.max(zero(api), Math.min(one(api), x));

/** Evidence pieces combine as independent proofs: one less the chance that every one fails. */
function combined(api: CoreAPI, strengths: readonly number[]): number {
  return (
    one(api) - strengths.reduce((rest, s) => rest * (one(api) - s), one(api))
  );
}

function town(api: CoreAPI): string {
  return lawChain(api).townPlaceId;
}

function emit(
  api: CoreAPI,
  kind: string,
  id: string,
  personIds: readonly PersonId[],
  facts: Record<string, string>,
  source: Source,
): void {
  api.emit({
    id,
    date: api.state.date,
    kind,
    personIds,
    placeId: town(api),
    facts,
    publicRecord: true,
    news: true,
    source,
  });
}

// ---------------------------------------------------------------------------
// 1. Reports

/** New crimes since the last day read: the corruption engine's table only grows. */
const seen = new WeakMap<object, number>();

function intake(api: CoreAPI): void {
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return;
  const rows = crimes(api).rows() as unknown as CrimeRecord[];
  const from = seen.get(api.state) ?? cursor(api);
  if (rows.length === from) return;
  seen.set(api.state, rows.length);
  table(api, "cursor").put({ id: "crimes", count: rows.length });
  for (const crime of rows.slice(from))
    // The official who refused a bribe saw the offer; one who took it is a party and keeps quiet unless they fall out (the corruption engine's telling).
    if (crime.offered && !crime.taken)
      considerReport(api, crime, crime.officialId, "witness");
}

function cursor(api: CoreAPI): number {
  return (
    (table(api, "cursor").get("crimes") as unknown as { count: number })
      ?.count ?? 0
  );
}

/** What moves someone who knows of a crime to report it, and the sum; read-only. */
export function reportReasons(
  api: CoreAPI,
  crime: CrimeRecord,
  reporterId: PersonId,
  basis: "witness" | "told",
): { reasons: ComplaintRow["reasons"]; pull: number } {
  const accused =
    crime.offererId === reporterId ? crime.officialId : crime.offererId;
  const reasons = {
    duty: p(api, basis === "witness" ? "reportDutyPull" : "reportHearsayPull"),
    traits:
      p(api, "reportTraitWeight") *
      lean(api, reporterId, "justice.report", "report", "keep-quiet"),
    tie: -p(api, "reportTieWeight") * closeness(api, reporterId, accused),
  };
  const pull = Object.values(reasons).reduce((a, b) => a + b, zero(api));
  return { reasons, pull };
}

/** Someone who knows of a crime decides whether to report it to the prosecutor. */
export function considerReport(
  api: CoreAPI,
  crime: CrimeRecord,
  reporterId: PersonId,
  basis: "witness" | "told",
): ComplaintRow | null {
  const reporter = api.state.people.get(reporterId);
  if (!reporter?.alive) return null;
  if (inCustody(api, reporterId)) return null;
  const { reasons, pull } = reportReasons(api, crime, reporterId, basis);
  if (pull <= zero(api)) return null;
  const prosecutor = prosecutorFor(api);
  const complaint: ComplaintRow = {
    id: `complaint:${crime.id}:${reporterId}`,
    crimeId: crime.id,
    reporterId,
    basis,
    date: api.state.date,
    knewIds: [...new Set([crime.offererId, crime.officialId, reporterId])],
    prosecutorOfficeId: prosecutor.officeId,
    reasons,
  };
  if (table(api, "complaints").get(complaint.id)) return null;
  table(api, "complaints").put(complaint as unknown as ModuleRow);
  weighInvestigation(api, complaint, crime, prosecutor);
  return complaint;
}

// ---------------------------------------------------------------------------
// 2. Investigation

/** Who a complaint accuses: the offerer always, and the official when they took it, never the reporter. */
function accusedBy(complaint: ComplaintRow, crime: CrimeRecord): PersonId[] {
  return [crime.offererId, ...(crime.taken ? [crime.officialId] : [])].filter(
    (id) => id !== complaint.reporterId,
  );
}

function weighInvestigation(
  api: CoreAPI,
  complaint: ComplaintRow,
  crime: CrimeRecord,
  prosecutor: ProsecutorOffice,
): InvestigationRow {
  const accused = accusedBy(complaint, crime);
  // A complaint against someone already under investigation joins it: a
  // second refused offer is more testimony in the same case.
  const open = (
    table(api, "investigations").rows() as unknown as InvestigationRow[]
  ).find(
    (row) =>
      row.status === "open" &&
      row.targets.some((t) => accused.includes(t.personId)),
  );
  if (open) {
    const joined: InvestigationRow = {
      ...open,
      complaintIds: [...open.complaintIds, complaint.id],
      targets: followTheMoney(api, [...open.complaintIds, complaint.id]),
    };
    table(api, "investigations").put(joined as unknown as ModuleRow);
    return joined;
  }
  const evidence = p(
    api,
    complaint.basis === "witness" ? "witnessEvidence" : "hearsayEvidence",
  );
  // The case is about the office that was offered or sold.
  const prominence = prominenceOf(api, crime.officialId);
  const accusedParty = partyOf(api, crime.officialId);
  const sameParty =
    prosecutor.party !== null && accusedParty === prosecutor.party
      ? one(api)
      : zero(api);
  const reasons = {
    evidence,
    prominence,
    sameParty: -p(api, "prosecutorPartyWeight") * sameParty,
    traits:
      p(api, "prosecutorTraitWeight") *
      lean(api, prosecutor.personId, "justice.prosecute", "pursue", "decline"),
    bar: -p(api, "investigateBar"),
    workload:
      -p(api, "prosecutorWorkloadWeight") * workload(api, prosecutor.officeId),
  };
  const worth =
    evidence * prominence * (one(api) + reasons.sameParty) +
    reasons.traits +
    reasons.bar +
    reasons.workload;
  const opened = worth > zero(api) && accused.length > 0;
  const row: InvestigationRow = {
    id: `investigation:${crime.id}:${api.state.date}`,
    complaintIds: [complaint.id],
    crimeId: crime.id,
    prosecutorOfficeId: prosecutor.officeId,
    prosecutorPersonId: prosecutor.personId,
    opened,
    date: api.state.date,
    reasons: { ...reasons, worth },
    targets: opened ? followTheMoney(api, [complaint.id]) : [],
    status: opened ? "open" : "declined",
  };
  table(api, "investigations").put(row as unknown as ModuleRow);
  if (opened) {
    const days = chargeDecisionDays(api);
    api.moduleCalendar(JUSTICE_MODULE_ID).schedule({
      key: `charge:${row.id}`,
      date: addDays(api.state.date, days.days),
      kind: "charge-decision",
      source: days.source,
      sourceRecordIds: [row.id],
    });
  }
  return row;
}

/**
 * Who the investigation reaches: each complaint's accused on its testimony,
 * then every payment on the books between them and anyone else (the
 * corruption engine records each taken bribe with its journal posting), and
 * the other party to each.
 */
function followTheMoney(
  api: CoreAPI,
  complaintIds: readonly string[],
): InvestigationTarget[] {
  const pieces = new Map<
    PersonId,
    {
      crimeIds: Set<string>;
      evidence: InvestigationTarget["evidence"][number][];
    }
  >();
  const add = (
    personId: PersonId,
    crimeId: string,
    piece: InvestigationTarget["evidence"][number],
  ) => {
    let row = pieces.get(personId);
    if (!row)
      pieces.set(personId, (row = { crimeIds: new Set(), evidence: [] }));
    row.crimeIds.add(crimeId);
    if (!row.evidence.some((e) => e.recordId === piece.recordId))
      row.evidence.push(piece);
  };
  const reporters = new Set<PersonId>();
  for (const id of complaintIds) {
    const complaint = table(api, "complaints").get(id) as unknown as
      ComplaintRow | undefined;
    const crime = complaint
      ? (crimes(api).get(complaint.crimeId) as unknown as
          CrimeRecord | undefined)
      : undefined;
    if (!complaint || !crime) continue;
    reporters.add(complaint.reporterId);
    const testimony = {
      kind: complaint.basis,
      recordId: complaint.id,
      strength: p(
        api,
        complaint.basis === "witness" ? "witnessEvidence" : "hearsayEvidence",
      ),
    };
    for (const personId of accusedBy(complaint, crime))
      add(personId, crime.id, testimony);
  }
  // Subpoenaed books: every taken bribe with an accused as a party.
  const queue = [...pieces.keys()];
  const visited = new Set<PersonId>(queue);
  while (queue.length) {
    const personId = queue.shift()!;
    const paid = [
      ...(crimes(api).query("byOfferer", [
        personId,
      ]) as unknown as CrimeRecord[]),
      ...(crimes(api).query("byOfficial", [
        personId,
      ]) as unknown as CrimeRecord[]),
    ].filter((c) => c.taken);
    for (const row of paid) {
      const payment = {
        kind: "payment" as const,
        recordId: `${row.id}:from`,
        strength: p(api, "paymentEvidence"),
      };
      for (const party of [row.offererId, row.officialId]) {
        if (reporters.has(party)) continue;
        add(party, row.id, payment);
        if (!visited.has(party)) {
          visited.add(party);
          queue.push(party);
        }
      }
    }
  }
  return [...pieces.entries()]
    .map(([personId, row]) => ({
      personId,
      crimeIds: [...row.crimeIds].sort(),
      evidence: row.evidence,
      strength: combined(
        api,
        row.evidence.map((e) => e.strength),
      ),
    }))
    .sort((a, b) => a.personId.localeCompare(b.personId));
}

// ---------------------------------------------------------------------------
// 3. Charge and plea

/** The share of the office's tried cases it lost. */
/**
 * How full a prosecutor's desk is, as a share of what the office carries: its
 * open investigations and its charged cases not yet decided, read when it
 * weighs opening or charging another (the indexes are by office, so nothing
 * scans the world).
 */
function workload(api: CoreAPI, officeId: string): number {
  const open = (
    table(api, "investigations").query("byOffice", [
      officeId,
    ]) as unknown as InvestigationRow[]
  ).filter((row) => row.status === "open").length;
  const pending = (
    table(api, "cases").query("byOffice", [officeId]) as unknown as CaseRow[]
  ).filter((row) => row.status === "charged").length;
  return (open + pending) / p(api, "prosecutorCaseloadCapacity");
}

function lossShare(api: CoreAPI, officeId: string): number {
  const tried = (
    table(api, "cases").query("byOffice", [officeId]) as unknown as CaseRow[]
  ).filter(
    (c) => !c.plea && (c.status === "convicted" || c.status === "acquitted"),
  );
  const lost = tried.filter((c) => c.status === "acquitted").length;
  return lost / (tried.length + 1);
}

/** What the defendant's money buys in defense, 0 to 1, against a felony defense's cost. */
function resources(api: CoreAPI, personId: PersonId): number {
  const person = api.state.people.get(personId);
  return clamp01(api, (person?.liquidMinor ?? 0) / p(api, "defenseCostMinor"));
}

/** The case's margin for conviction: evidence, net of the defense, against the standard of proof. */
function verdictMargin(api: CoreAPI, evidence: number, personId: PersonId) {
  const defense = p(api, "defenseWeight") * resources(api, personId);
  return {
    evidence,
    defense: -defense,
    bar: -p(api, "convictionBar"),
    margin: evidence - defense - p(api, "convictionBar"),
  };
}

export function chargeDecision(api: CoreAPI, investigationId: string): void {
  const inv = table(api, "investigations").get(investigationId) as unknown as
    InvestigationRow | undefined;
  if (!inv || inv.status !== "open") return;
  const stateKey = lawChain(api).stateKey;
  const living = inv.targets.filter(
    (t) => api.state.people.get(t.personId)?.alive,
  );
  const desk = workload(api, inv.prosecutorOfficeId);
  const chargeReasons = (strength: number) => ({
    evidence: strength,
    bar: -p(api, "chargeBar"),
    record:
      -p(api, "prosecutorLossWeight") * lossShare(api, inv.prosecutorOfficeId),
    workload: -p(api, "prosecutorWorkloadWeight") * desk,
  });
  const chargedOn = (strength: number) => {
    const r = chargeReasons(strength);
    return r.evidence + r.bar + r.record + r.workload > zero(api);
  };
  const pleaOn = (strength: number, personId: PersonId) => {
    const trial = verdictMargin(api, strength, personId);
    const traits =
      p(api, "pleaTraitWeight") *
      lean(api, personId, "justice.plea", "plead", "fight");
    return { ...trial, traits, pleads: trial.margin + traits > zero(api) };
  };
  // A target who would be charged and would plead weighs giving up another
  // target for a lighter sentence: the cut against how close they are to the
  // other (their relationship record). Their testimony then strengthens the
  // case against the rest; it is read from each person's own records.
  const witnesses = new Map<
    PersonId,
    { against: PersonId[]; reasons: Record<string, number> }
  >();
  // One target at most turns witness in an investigation: the one for whom
  // giving the others up is worth the most (two would only give each other up).
  const offers: {
    personId: PersonId;
    against: PersonId[];
    reasons: Record<string, number>;
    worth: number;
  }[] = [];
  for (const target of living) {
    if (!chargedOn(target.strength)) continue;
    if (!pleaOn(target.strength, target.personId).pleads) continue;
    const others = living.filter((o) => o.personId !== target.personId);
    if (!others.length) continue;
    const tie = Math.max(
      ...others.map((o) =>
        closenessBetween(api.state as CoreState, target.personId, o.personId),
      ),
    );
    const reasons = {
      sentenceCut: p(api, "cooperationSentenceShare"),
      loyalty: -p(api, "cooperationLoyaltyWeight") * tie,
    };
    const worth = reasons.sentenceCut + reasons.loyalty;
    if (worth > zero(api))
      offers.push({
        personId: target.personId,
        against: others.map((o) => o.personId),
        reasons,
        worth,
      });
  }
  const best = offers.sort(
    (a, b) => b.worth - a.worth || a.personId.localeCompare(b.personId),
  )[0];
  if (best)
    witnesses.set(best.personId, {
      against: best.against,
      reasons: best.reasons,
    });
  for (const target of living) {
    // Another target's testimony adds to the case against this one.
    const testimony = [...witnesses].filter(
      ([witness, w]) =>
        witness !== target.personId && w.against.includes(target.personId),
    );
    const strength = Math.min(
      one(api),
      target.strength + testimony.length * p(api, "cooperationEvidence"),
    );
    const charge = chargeReasons(strength);
    const charged = chargedOn(strength);
    const id = `case:${inv.id}:${target.personId}`;
    if (!charged) {
      table(api, "cases").put({
        id,
        investigationId: inv.id,
        prosecutorOfficeId: inv.prosecutorOfficeId,
        defendantId: target.personId,
        crimeIds: target.crimeIds,
        evidence: strength,
        date: api.state.date,
        status: "no-charge",
        plea: false,
        trialDate: null,
        reasons: { charge },
        sentenceId: null,
      } satisfies CaseRow as unknown as ModuleRow);
      continue;
    }
    // The defendant weighs a plea: how the trial would go, and their own
    // leaning between conceding and fighting.
    // stopgapId: SG-GOV-justice-player-choices
    api.stopgap("SG-GOV-justice-player-choices");
    const { pleads: weighed, ...plea } = pleaOn(strength, target.personId);
    const witness = witnesses.get(target.personId);
    const pleads = weighed || !!witness;
    const days = dispositionDays(api, stateKey);
    const trialDate = pleads ? null : addDays(api.state.date, days.days);
    const row: CaseRow = {
      id,
      investigationId: inv.id,
      prosecutorOfficeId: inv.prosecutorOfficeId,
      defendantId: target.personId,
      crimeIds: target.crimeIds,
      evidence: strength,
      date: api.state.date,
      status: "charged",
      plea: pleads,
      trialDate,
      reasons: {
        charge,
        plea,
        ...(witness ? { cooperation: witness.reasons } : {}),
        ...(testimony.length
          ? {
              testimony: {
                witnesses: testimony.length,
                added: strength - target.strength,
              },
            }
          : {}),
      },
      sentenceId: null,
      ...(witness
        ? { cooperated: true, testifiedAgainst: witness.against }
        : {}),
    };
    table(api, "cases").put(row as unknown as ModuleRow);
    emit(
      api,
      "justice.charged",
      `justice.charged:${id}`,
      [target.personId],
      {
        caseId: id,
        offense: "bribery",
        prosecutorOfficeId: inv.prosecutorOfficeId,
        plea: String(pleads),
        ...(witness ? { cooperated: "true" } : {}),
        ...(trialDate ? { trialDate } : {}),
      },
      days.source,
    );
    if (pleads) convict(api, row, true);
    else {
      const wait = decidePretrial(api, JUSTICE_MODULE_ID, id, target.personId);
      const bailTreasury = treasuryFor(api, inv.prosecutorOfficeId);
      if (wait?.decision === "posted" && bailTreasury)
        holdBail(api, id, target.personId, bailTreasury, wait.bailMinor);
      if (wait)
        emit(
          api,
          wait.decision === "held"
            ? "justice.held-before-trial"
            : "justice.bail-set",
          `justice.pretrial:${id}`,
          [target.personId],
          {
            caseId: id,
            decision: wait.decision,
            bailMinor: String(wait.bailMinor),
            ...(wait.lawId ? { lawId: wait.lawId } : {}),
          },
          days.source,
        );
      api.moduleCalendar(JUSTICE_MODULE_ID).schedule({
        key: `trial:${id}`,
        date: trialDate!,
        kind: "trial",
        source: days.source,
        sourceRecordIds: [id],
      });
    }
  }
  table(api, "investigations").put({
    ...inv,
    status: "closed",
  } as unknown as ModuleRow);
}

// ---------------------------------------------------------------------------
// 4. Trial

function trial(api: CoreAPI, caseId: string): void {
  const row = table(api, "cases").get(caseId) as unknown as CaseRow | undefined;
  if (!row || row.status !== "charged") return;
  endPretrial(api, JUSTICE_MODULE_ID, caseId);
  returnBail(api, caseId);
  const person = api.state.people.get(row.defendantId);
  if (!person?.alive) {
    table(api, "cases").put({
      ...row,
      status: "dismissed",
    } as unknown as ModuleRow);
    return;
  }
  const verdict = verdictMargin(api, row.evidence, row.defendantId);
  const guilty = verdict.margin > zero(api);
  const decided: CaseRow = {
    ...row,
    reasons: { ...row.reasons, verdict },
  };
  if (guilty) {
    convict(api, decided, false);
    return;
  }
  table(api, "cases").put({
    ...decided,
    status: "acquitted",
  } as unknown as ModuleRow);
  emit(
    api,
    "justice.acquitted",
    `justice.acquitted:${row.id}`,
    [row.defendantId],
    { caseId: row.id, offense: "bribery" },
    {
      tag: "SOURCED",
      citation: "A trial verdict from the case's evidence against the defense.",
      asOf: api.state.date,
    },
  );
}

// ---------------------------------------------------------------------------
// 5. Sentence

function convict(api: CoreAPI, row: CaseRow, plea: boolean): void {
  const chain = lawChain(api);
  const range = briberyRange(api, chain.stateKey);
  const bribe = row.crimeIds
    .map((id) => crimes(api).get(id) as unknown as CrimeRecord | undefined)
    .filter((c): c is CrimeRecord => !!c)
    .reduce((sum, c) => sum + c.amountMinor, 0);
  // Severity, 0 to 1: the bribe's size against the guideline's scale, and the
  // office that was sold or offered.
  const officeProminence = Math.max(
    ...row.crimeIds.map((id) => {
      const crime = crimes(api).get(id) as unknown as CrimeRecord | undefined;
      return crime
        ? prominenceOf(api, crime.officialId)
        : p(api, "prominenceTown");
    }),
  );
  const size = bribe / (bribe + p(api, "severityScaleMinor"));
  const office = clamp01(
    api,
    (officeProminence - p(api, "prominenceTown")) /
      (p(api, "prominenceStatewide") - p(api, "prominenceTown")),
  );
  const sizeWeight = p(api, "severitySizeWeight");
  const severity = sizeWeight * size + (one(api) - sizeWeight) * office;
  const discount =
    (plea ? one(api) - p(api, "pleaDiscount") : one(api)) *
    (row.cooperated ? one(api) - p(api, "cooperationSentenceShare") : one(api));
  // The months a court would set in the range, served on probation up to the
  // guideline's probation-only zone.
  const months = range.maxMonths * severity * discount;
  const custodyMonths = Math.round(
    Math.max(range.minMonths, months - p(api, "custodyFloorMonths")),
  );
  const probationMonths =
    custodyMonths > zero(api)
      ? 0
      : Math.round(
          p(api, "probationMinMonths") +
            (p(api, "probationMaxMonths") - p(api, "probationMinMonths")) *
              severity,
        );
  // The bribe money the defendant took is forfeited first, from what they
  // hold, then the fine is collected from what is left.
  const proceeds = row.crimeIds
    .map((id) => crimes(api).get(id) as unknown as CrimeRecord | undefined)
    .filter(
      (c): c is CrimeRecord =>
        !!c && c.taken && c.officialId === row.defendantId,
    )
    .reduce((sum, c) => sum + c.amountMinor, 0);
  const forfeit = bribeProceedsForfeited(api, chain.stateKey);
  const forfeitureMinor = Math.round(proceeds * forfeit.share);
  const fineMinor = Math.round(p(api, "fineMultiple") * bribe * severity);
  const sentenceId = `sentence:${row.id}`;
  const forfeiture = convictionForfeitsOffice(api, chain.stateKey);
  const seats = forfeiture.forfeits
    ? servingTermsOf(api, row.defendantId).map((t) => t.seatId)
    : [];
  const person = api.state.people.get(row.defendantId);
  const jobIds =
    custodyMonths > zero(api) && person ? currentJobs(api, person.id) : [];
  const releaseDate =
    custodyMonths > zero(api)
      ? addDays(api.state.date, custodyMonths * p(api, "daysPerMonth"))
      : null;
  const treasury = treasuryFor(api, row.prosecutorOfficeId);
  const forfeited = treasury
    ? payToTreasury(
        api,
        `forfeiture:${sentenceId}`,
        "forfeiture",
        row.defendantId,
        treasury,
        forfeitureMinor,
      )
    : 0;
  const paid = treasury
    ? payToTreasury(
        api,
        `fine:${sentenceId}`,
        "fine",
        row.defendantId,
        treasury,
        fineMinor,
      )
    : 0;
  const sentence: SentenceRow = {
    id: sentenceId,
    caseId: row.id,
    personId: row.defendantId,
    date: api.state.date,
    severity,
    fineMinor,
    finePaidMinor: paid,
    forfeitureMinor,
    forfeiturePaidMinor: forfeited,
    treasuryId: treasury,
    probationMonths,
    custodyMonths,
    releaseDate,
    seatsVacated: seats,
    jobsEnded: jobIds,
    reasons: {
      bribeMinor: bribe,
      proceedsMinor: proceeds,
      size,
      office,
      plea: plea ? one(api) : zero(api),
      rangeMinMonths: range.minMonths,
      rangeMaxMonths: range.maxMonths,
      courtMonths: months,
    },
    source: range.source,
  };
  table(api, "sentences").put(sentence as unknown as ModuleRow);
  table(api, "cases").put({
    ...row,
    status: "convicted",
    plea,
    sentenceId,
  } as unknown as ModuleRow);
  emit(
    api,
    "justice.convicted",
    `justice.convicted:${row.id}`,
    [row.defendantId],
    {
      caseId: row.id,
      sentenceId,
      offense: "bribery",
      plea: String(plea),
      fineMinor: String(fineMinor),
      forfeitureMinor: String(forfeitureMinor),
      forfeitedMinor: String(forfeited),
      probationMonths: String(probationMonths),
      custodyMonths: String(custodyMonths),
    },
    range.source,
  );
  for (const seatId of seats) vacateSeat(api, seatId, "conviction");
  if (custodyMonths > zero(api)) imprison(api, sentence, jobIds);
}

/** The treasury of the government whose prosecutor brought the case. */
function treasuryFor(api: CoreAPI, officeId: string): string | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const level =
    officeId.includes(":attorney-general") || officeId.startsWith("prosecutor:")
      ? "state"
      : "county";
  const gov =
    governments(api).find((g) => g.level === level) ??
    governments(api).find((g) => g.level === "state");
  if (!gov) return null;
  const state = api.state as CoreState;
  return state.cashJournal.accounts.has(`cash:${gov.organizationId}:residual`)
    ? gov.organizationId
    : null;
}

interface FineRecord {
  readonly id: string;
  readonly reason: "fine" | "forfeiture" | "bail" | "bail-return";
  readonly date: string;
  readonly personId: PersonId;
  readonly treasuryId: string;
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function fineSlot(api: CoreAPI, id: string): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, "fines").get(id) as unknown as FineRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind: FINE_KIND,
    id: row.id,
    date: row.date,
    source: {
      tag: "SOURCED",
      citation:
        row.reason === "forfeiture"
          ? "The bribe money a court forfeits on a bribery conviction, paid to the treasury."
          : row.reason === "bail"
            ? "A defendant's bail, held in the court escrow under the prosecuting government's treasury until the trial."
            : row.reason === "bail-return"
              ? "A defendant's bail, returned in full from the court escrow when the trial opens."
              : "A court's fine on a bribery conviction, paid to the treasury.",
      asOf: row.date,
    },
    expectedPostings: row.postings.map((x) => ({ ...x })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  const slot = {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
  map.set(id, slot);
  return slot;
}

/** A fine or a forfeiture from the person's own cash to the treasury, as much as they have; the rest stays owed on the sentence. */
function payToTreasury(
  api: CoreAPI,
  recordId: string,
  reason: FineRecord["reason"],
  personId: PersonId,
  treasuryId: string,
  amountMinor: number,
  /** Where the money lands: the treasury's spendable cash unless a held fund is named. */
  toAccountId: string = `cash:${treasuryId}:residual`,
): number {
  const state = api.state as CoreState;
  const from = `cash:${personId}:residual`;
  const person = api.state.people.get(personId);
  const amount = Math.min(amountMinor, Math.max(0, person?.liquidMinor ?? 0));
  if (amount <= 0 || !state.cashJournal.accounts.has(from)) return 0;
  const record: FineRecord = {
    id: recordId,
    reason,
    date: api.state.date,
    personId,
    treasuryId,
    postings: [
      { id: "person", accountId: from, deltaMinor: -amount },
      { id: "treasury", accountId: toAccountId, deltaMinor: amount },
    ],
  };
  table(api, "fines").put(record as unknown as ModuleRow);
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: FINE_KIND, id: record.id },
    postings: record.postings,
  });
  return amount;
}

/**
 * The court escrow fund under a treasury's owner: bail sits here, apart from
 * the cash the government can spend, until the trial returns it.
 */
function escrowOf(api: CoreAPI, treasuryId: string): string {
  const state = api.state as CoreState;
  const id = `account:${treasuryId}:court-escrow`;
  if (!state.cashJournal.accounts.has(id))
    api.registerCashAccount({
      id,
      ownerId: treasuryId,
      name: "court-escrow",
      allocatedMinor: 0,
      source: {
        tag: "SOURCED",
        citation:
          "Bail is held by the court apart from the government's own funds until the case is heard.",
        asOf: api.state.date,
      },
    });
  return id;
}

/** Bail posted: the bail leaves the defendant's cash for the court escrow under the treasury, held until the trial. */
function holdBail(
  api: CoreAPI,
  caseId: string,
  personId: PersonId,
  treasuryId: string,
  bailMinor: number,
): void {
  payToTreasury(
    api,
    `bail:${caseId}`,
    "bail",
    personId,
    treasuryId,
    bailMinor,
    escrowOf(api, treasuryId),
  );
}

/** The trial opens: the escrow hands the whole bail back, whatever the treasury has spent since. */
function returnBail(api: CoreAPI, caseId: string): void {
  const held = table(api, "fines").get(`bail:${caseId}`) as unknown as
    FineRecord | undefined;
  if (!held || table(api, "fines").get(`bail-return:${caseId}`)) return;
  const state = api.state as CoreState;
  const heldMinor = held.postings.find((x) => x.id === "treasury")!.deltaMinor;
  const record: FineRecord = {
    id: `bail-return:${caseId}`,
    reason: "bail-return",
    date: api.state.date,
    personId: held.personId,
    treasuryId: held.treasuryId,
    postings: [
      {
        id: "treasury",
        accountId: escrowOf(api, held.treasuryId),
        deltaMinor: -heldMinor,
      },
      {
        id: "person",
        accountId: `cash:${held.personId}:residual`,
        deltaMinor: heldMinor,
      },
    ],
  };
  table(api, "fines").put(record as unknown as ModuleRow);
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: FINE_KIND, id: record.id },
    postings: record.postings,
  });
}

// ---------------------------------------------------------------------------
// Prison

/** Every job the person still works, read from their work commitments. */
function currentJobs(api: CoreAPI, personId: PersonId): string[] {
  const state = api.state as CoreState;
  const ids = new Set<string>();
  for (const id of state.work.commitmentsByPerson.get(personId) ?? []) {
    const c = state.work.commitments.get(id);
    if (!c || c.endsAt !== undefined || !c.jobId) continue;
    const job = state.jobs.get(c.jobId);
    if (job && job.endsAt === undefined) ids.add(c.jobId);
  }
  const own = api.state.people.get(personId)?.jobId;
  const ownJob = own ? state.jobs.get(own) : undefined;
  if (own && ownJob && ownJob.endsAt === undefined) ids.add(own);
  return [...ids].sort();
}

function imprison(
  api: CoreAPI,
  sentence: SentenceRow,
  jobIds: readonly string[],
): void {
  const prior = holdInCustody(api, sentence.personId);
  const custody: CustodyRow = {
    id: `custody:${sentence.id}`,
    personId: sentence.personId,
    sentenceId: sentence.id,
    from: api.state.date,
    until: sentence.releaseDate!,
    status: "serving",
    priorEligible: prior ?? null,
  };
  table(api, "custody").put(custody as unknown as ModuleRow);
  // The jobs end the next morning, before any shift: today's may be worked.
  if (jobIds.length) endCustodyJobs(api, custody, jobIds);
  emit(
    api,
    "justice.imprisoned",
    `justice.imprisoned:${sentence.id}`,
    [sentence.personId],
    {
      sentenceId: sentence.id,
      custodyMonths: String(sentence.custodyMonths),
      releaseDate: custody.until,
    },
    sentence.source,
  );
  api.moduleCalendar(JUSTICE_MODULE_ID).schedule({
    key: `release:${custody.id}`,
    date: custody.until,
    kind: "release",
    source: sentence.source,
    sourceRecordIds: [custody.id],
  });
}

/** End jobs held when imprisonment begins, before their next shift. */
function endCustodyJobs(
  api: CoreAPI,
  custody: CustodyRow,
  jobIds: readonly string[],
): void {
  const state = api.state as CoreState;
  for (const jobId of jobIds) {
    const key = `keep-from-work:${jobId}`;
    const calendar = api.moduleCalendar(JUSTICE_MODULE_ID);
    const prior = calendar.get(key);
    if (prior?.status === "pending") continue;
    // The same position can hire the same person again later.
    if (prior) calendar.forget(key);
    // Ended on its first day, before the day's work (calendar work runs first).
    const starts = [
      ...(state.work.commitmentsByPerson.get(custody.personId) ?? []),
    ]
      .map((id) => state.work.commitments.get(id))
      .filter((c) => c?.jobId === jobId)
      .map((c) => c!.startsAt)
      .sort()[0];
    api.moduleCalendar(JUSTICE_MODULE_ID).schedule({
      key,
      date:
        starts && starts > api.state.date ? starts : addDays(api.state.date, 1),
      kind: "keep-from-work",
      source: {
        tag: "SOURCED",
        citation: "A person serving a prison term cannot work a job outside.",
        asOf: api.state.date,
      },
      sourceRecordIds: [custody.id, jobId],
    });
    // Until it ends, it is not the job they work: no shift is offered.
    if (api.state.people.get(custody.personId)?.jobId === jobId)
      api.updatePerson(custody.personId, { jobId: undefined });
  }
}

function release(api: CoreAPI, custodyId: string): void {
  const custody = table(api, "custody").get(custodyId) as unknown as
    CustodyRow | undefined;
  if (!custody || custody.status !== "serving") return;
  const person = api.state.people.get(custody.personId);
  if (!person?.alive) {
    table(api, "custody").put({
      ...custody,
      status: "died",
    } as unknown as ModuleRow);
    return;
  }
  releaseFromCustody(api, custody.personId, custody.priorEligible ?? undefined);
  table(api, "custody").put({
    ...custody,
    status: "released",
  } as unknown as ModuleRow);
  emit(
    api,
    "justice.released",
    `justice.released:${custody.id}`,
    [custody.personId],
    { sentenceId: custody.sentenceId },
    {
      tag: "SOURCED",
      citation: "Release at the end of the prison term the court set.",
      asOf: api.state.date,
    },
  );
}

// ---------------------------------------------------------------------------
// Reads for other engines

/** Whether the person is serving a prison term today. */
export function inCustody(api: CoreAPI, personId: PersonId): boolean {
  if (!api.state.modules.has(JUSTICE_MODULE_ID)) return false;
  return (
    table(api, "custody").query("byPerson", [
      personId,
    ]) as unknown as CustodyRow[]
  ).some((row) => row.status === "serving");
}

/** The person's convictions on record by a date: what views, the press and candidacy read. */
export function convictionsOf(
  api: CoreAPI,
  personId: PersonId,
  date: string = api.state.date,
): readonly CaseRow[] {
  if (!api.state.modules.has(JUSTICE_MODULE_ID)) return [];
  return (
    table(api, "cases").query("byDefendant", [personId]) as unknown as CaseRow[]
  ).filter((row) => row.status === "convicted" && row.date <= date);
}

/**
 * Whether the person still has a sentence to serve for a conviction by a
 * date: a prison term not yet ended, or a probation term not yet run out.
 * The court's fine does not keep a sentence open.
 */
export function sentenceUnfinished(
  api: CoreAPI,
  personId: PersonId,
  date: string = api.state.date,
): boolean {
  return convictionsOf(api, personId, date).some((row) => {
    const sentence = row.sentenceId
      ? (table(api, "sentences").get(row.sentenceId) as unknown as
          SentenceRow | undefined)
      : undefined;
    if (!sentence) return false;
    if (sentence.releaseDate !== null) return sentence.releaseDate > date;
    return (
      completedMonthsBetween(makeIsoDate(sentence.date), makeIsoDate(date)) <
      sentence.probationMonths
    );
  });
}

export function casesOf(api: CoreAPI, personId: PersonId): readonly CaseRow[] {
  if (!api.state.modules.has(JUSTICE_MODULE_ID)) return [];
  return table(api, "cases").query("byDefendant", [
    personId,
  ]) as unknown as CaseRow[];
}

// ---------------------------------------------------------------------------

function onTold(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  // The corruption engine's telling: a party falls out and tells the person
  // they are closest to, who now knows and may report it.
  if (!api.state.modules.has(CORRUPTION_MODULE_ID)) return;
  for (const key of Object.keys(event.facts ?? {})) {
    if (!key.startsWith("crime:")) continue;
    const crime = crimes(api).get(key.slice("crime:".length)) as unknown as
      CrimeRecord | undefined;
    if (!crime) continue;
    for (const listener of event.personIds)
      considerReport(api, crime, listener, "told");
  }
}

function justiceWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const id = work.sourceRecordIds[0]!;
  if (work.kind === "charge-decision") chargeDecision(api, id);
  else if (work.kind === "trial") trial(api, id);
  else if (work.kind === "release") release(api, id);
  else if (work.kind === "keep-from-work") {
    const jobId = work.sourceRecordIds[1]!;
    const custody = table(api, "custody").get(id) as unknown as
      CustodyRow | undefined;
    if (
      custody?.status === "serving" &&
      currentJobs(api, custody.personId).includes(jobId)
    ) {
      const state = api.state as CoreState;
      if (state.work.lastAttendanceByJob.get(jobId)?.date === api.state.date)
        // Worked today already: end it tomorrow, before the day's work.
        api.moduleCalendar(JUSTICE_MODULE_ID).schedule({
          key: `${work.key}:${api.state.date}`,
          date: addDays(api.state.date, 1),
          kind: work.kind,
          source: work.source,
          sourceRecordIds: work.sourceRecordIds,
        });
      else api.endJob(jobId, `${custody.id}:${api.state.date}`);
    }
  }
}

export const JUSTICE_MODULE: CoreModule = {
  id: JUSTICE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      cursor: {},
      complaints: { indexes: { byCrime: { fields: ["crimeId"] } } },
      investigations: {
        indexes: {
          byCrime: { fields: ["crimeId"] },
          byOffice: { fields: ["prosecutorOfficeId"] },
        },
      },
      cases: {
        indexes: {
          byDefendant: { fields: ["defendantId"] },
          byOffice: { fields: ["prosecutorOfficeId"] },
        },
      },
      sentences: {},
      custody: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byStatus: { fields: ["status"] },
        },
      },
      fines: {},
      pretrial: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
  eventKinds: ["crime.told"],
  onEvent: (api, event) => onTold(api, event),
  onAfterDay: (api) => intake(api),
  onCalendarWork: (api, work) => justiceWork(api, work),
  journalSourceProviders: {
    [FINE_KIND]: (api, reference) => fineSlot(api, reference.id),
  },
};

/** Register the justice engine; it needs the laws, offices and budgets opened first. */
export function openJustice(core: CoreState): void {
  if (!core.modules.has(JUSTICE_MODULE_ID))
    registerModule(core, JUSTICE_MODULE);
}
