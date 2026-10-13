/**
 * Retirement claims during play (stand-in SG-CORE-retirement-claims-in-play,
 * until GOV's Social Security program). A full person who reaches their own
 * claim age (a decision inside the law: retirement-claim.ts) and has enough
 * covered work starts a monthly award from the place's Social Security payer,
 * sized as the opening sizes awards. Claims are indexed by date; nothing scans
 * the town each day.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import ages from "../data/social-security-ages.json" with { type: "json" };
import incomeData from "../data/opening-income.json" with { type: "json" };
import fundingData from "../data/opening-income-funding.json" with { type: "json" };
import { retirementClaimAgeMonths } from "../retirement-claim";
import { addResidentFlow, endFlowPart } from "../residents-economy";
import { decisionLean } from "../trait-decisions";
import { residentPerson, residentsRuntime } from "./residents";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
  Source,
} from "../types";
import { registerWorldMapPart } from "../snapshot";

export const RETIREMENT_CLAIMS_MODULE_ID = "core2-retirement-claims-v1";
const STOPGAP = "SG-CORE-retirement-claims-in-play";

interface Runtime {
  known: Set<PersonId>;
  /** The year the counts were last checked for people nearing the earliest claim age. */
  countedIndexedYear?: string;
  byDate: Map<IsoDate, PersonId[]>;
  claimed: Map<PersonId, Claim>;
  indexedPeople?: number;
}

interface Claim {
  date: IsoDate;
  monthlyMinor: number;
  /** Paid into the place's residents account while the claimant is counted. */
  counted: boolean;
  obligationId: string;
}
const runtimes = new WeakMap<CoreState, Runtime>();
registerWorldMapPart("core2-retirement-claims", runtimes);

/** Who has claimed in play, with the date and monthly award. */
export function retirementClaims(
  core: CoreState,
): ReadonlyMap<PersonId, Claim> {
  return runtimes.get(core)?.claimed ?? new Map();
}

function monthsAfter(date: string, months: number): IsoDate {
  const at = new Date(`${date}T00:00:00.000Z`);
  const day = at.getUTCDate();
  at.setUTCDate(1);
  at.setUTCMonth(at.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0),
  ).getUTCDate();
  at.setUTCDate(Math.min(day, last));
  return makeIsoDate(at.toISOString().slice(0, 10));
}

function receivesRetirement(core: CoreState, personId: PersonId): boolean {
  for (const id of core.finance.incomeContractsByPerson.get(personId) ?? [])
    if (core.finance.contracts.get(id)?.kind === "income.retirement")
      return true;
  return false;
}

interface Claimant {
  birthDate: string;
  liquidMinor: number;
  livingCostDailyMinor: number;
  traits: Readonly<Record<string, number>>;
}

function claimDateOf(api: CoreAPI, person: Claimant): IsoDate | undefined {
  const p = (key: string) => api.parameter(key);
  const cost = person.livingCostDailyMinor;
  const months = retirementClaimAgeMonths(
    {
      birthYear: Number(person.birthDate.slice(0, 4)),
      bufferMonths:
        cost > 0
          ? person.liquidMinor / ((cost * p("daysPerMeanYear")) / 12)
          : p(incomeData.parameters.claimFullBufferMonths),
      patience: decisionLean(
        api.state,
        person,
        "retirement.claim-age",
        "wait-to-claim",
        "claim-now",
      ),
    },
    {
      anchorYearsBeforeFull: p(
        incomeData.parameters.claimAnchorYearsBeforeFull,
      ),
      traitPullYears: p(incomeData.parameters.claimTraitPullYears),
      needPullYears: p(incomeData.parameters.claimNeedPullYears),
      fullBufferMonths: p(incomeData.parameters.claimFullBufferMonths),
    },
  );
  return monthsAfter(person.birthDate, months);
}

function schedule(rt: Runtime, date: IsoDate, personId: PersonId): void {
  rt.byDate.set(date, [...(rt.byDate.get(date) ?? []), personId]);
}

function index(api: CoreAPI, rt: Runtime): void {
  const core = api.state;
  // The counted population claims too, from their own records. Nobody claims
  // before the earliest claim age, so each year only those within two years
  // of it are indexed; the same dates as indexing everyone at once.
  const year = core.date.slice(0, 4);
  if (rt.countedIndexedYear !== year) {
    rt.countedIndexedYear = year;
    const [y, m] = core.date.split("-").map(Number) as [number, number];
    const soonest = ages.earliestClaimAgeMonths - 24;
    for (const record of residentsRuntime(core)?.households.values() ?? [])
      for (const person of record.people) {
        if (rt.known.has(person.id)) continue;
        const [by, bm] = person.birthDate.split("-").map(Number) as [
          number,
          number,
        ];
        if ((y - by) * 12 + (m - bm) < soonest) continue;
        rt.known.add(person.id);
        if (
          record.contracts.some(
            (row) =>
              row.kind === "income.retirement" &&
              row.recipientIncome?.personId === person.id,
          )
        )
          continue;
        const date = claimDateOf(api, person);
        if (date && date > core.date) schedule(rt, date, person.id);
      }
  }
  if (
    rt.known.size >= core.people.size &&
    rt.indexedPeople === core.people.size
  )
    return;
  rt.indexedPeople = core.people.size;
  for (const person of core.people.values()) {
    if (rt.known.has(person.id)) {
      // A counted claimant filled in takes their award with them.
      if (rt.claimed.get(person.id)?.counted) moveToPerson(api, rt, person.id);
      continue;
    }
    rt.known.add(person.id);
    if (!person.alive || receivesRetirement(core, person.id)) continue;
    const date = claimDateOf(api, person);
    if (!date || date <= core.date) continue;
    schedule(rt, date, person.id);
  }
}

/** A filled-in claimant's award now pays them, not the residents' account. */
function moveToPerson(api: CoreAPI, rt: Runtime, personId: PersonId): void {
  const row = rt.claimed.get(personId)!;
  const flow = residentsRuntime(api.state)?.flows.get(row.obligationId);
  if (!flow || !endFlowPart(api.state, row.obligationId, row.obligationId))
    return;
  const accounts = api.accounts();
  const id = `${row.obligationId}:own`;
  accounts.addObligation({
    id,
    from: accounts.main(flow.payerId),
    to: accounts.main(personId),
    amountMinor: row.monthlyMinor,
    firstDueAt: flow.nextAt,
    cadence: { kind: "months", every: 1 },
    accruesArrears: false,
    reasonKey: "income.retirement",
    source: flow.source,
  });
  rt.claimed.set(personId, { ...row, counted: false, obligationId: id });
}

function claim(api: CoreAPI, rt: Runtime, personId: PersonId): void {
  const core = api.state;
  const full = core.people.get(personId);
  const person = full ?? residentPerson(core, personId);
  if (!person || (full && (!full.alive || receivesRetirement(core, personId))))
    return;
  const residentsId = full
    ? undefined
    : residentsRuntime(core)?.input.accounts.find(
        (row) => row.placeId === person.placeId,
      )?.accountId;
  if (!full && !residentsId) return;
  const p = (key: string) => api.parameter(key);
  const keys = incomeData.parameters;
  // Covered work from adult life to the claim, as the opening estimates it.
  const age =
    (Date.parse(`${core.date}T00:00:00Z`) -
      Date.parse(`${person.birthDate}T00:00:00Z`)) /
    (p("daysPerMeanYear") * 86_400_000);
  const reliability = person.traits["people-mind-v1:reliability"] ?? 0;
  const fraction = Math.max(
    0,
    Math.min(
      1,
      p(keys.coveredFraction) + reliability * p(keys.coveredTraitPull),
    ),
  );
  const coveredMonths = Math.floor(
    Math.max(0, age - p(keys.careerStartAgeYears)) * 12 * fraction,
  );
  if (coveredMonths < p(keys.minimumCoveredMonths)) return;
  const factor = Math.max(
    p(keys.benefitFactorMinimum),
    Math.min(
      p(keys.benefitFactorMaximum),
      coveredMonths / p(keys.benefitReferenceCoveredMonths),
    ),
  );
  const monthlyMinor = Math.floor(p(keys.benefitMonthlyMinor) * factor);
  // The federal Social Security outside flow pays (one per world).
  const payer = [...core.organizations.values()].find(
    (row) =>
      row.outsideFlow !== undefined &&
      row.id.startsWith(`${fundingData.contributorIdPrefix}:`),
  );
  if (!payer || monthlyMinor <= 0) return;
  api.stopgap(STOPGAP);
  const accounts = api.accounts();
  const id = `retirement-claim:${personId}`;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: core.date,
    citation: `${payer.source.citation} Claim age and award as the opening estimates them (src/core2/retirement-claim.ts; data/opening-income.json).`,
    estimatedFrom: `Claimed at ${age.toFixed(1)} with ${coveredMonths} modeled covered months; award ${monthlyMinor} minor units a month.`,
  };
  const firstDueAt = addDays(makeIsoDate(core.date), 1);
  if (residentsId) {
    // A counted claimant's award joins the residents' income (their spending
    // follows it) until they're filled in.
    addResidentFlow(core, {
      id,
      kind: "retirement",
      financeKind: "income.retirement",
      payerId: payer.id,
      payeeId: residentsId,
      residentsId,
      placeId: person.placeId,
      amountMinor: monthlyMinor,
      firstAt: firstDueAt,
      cadence: {
        kind: "months",
        every: 1,
        day: Number(firstDueAt.slice(8, 10)),
      },
      salesReceipt: false,
      marketAdjusted: false,
      amountByContract: { [id]: monthlyMinor },
      source,
    });
  } else
    accounts.addObligation({
      id,
      from: accounts.main(payer.id),
      to: accounts.main(personId),
      amountMinor: monthlyMinor,
      firstDueAt,
      cadence: { kind: "months", every: 1 },
      accruesArrears: false,
      reasonKey: "income.retirement",
      source,
    });
  rt.claimed.set(personId, {
    date: core.date,
    monthlyMinor,
    counted: !full,
    obligationId: `retirement-claim:${personId}`,
  });
}

export const RETIREMENT_CLAIMS_MODULE: CoreModule = {
  id: RETIREMENT_CLAIMS_MODULE_ID,
  onDay(api) {
    const core = api.state;
    let rt = runtimes.get(core);
    if (!rt) {
      rt = {
        known: new Set(),
        byDate: new Map(),
        claimed: new Map(),
      };
      runtimes.set(core, rt);
    }
    index(api, rt);
    const due = rt.byDate.get(core.date);
    if (!due) return undefined;
    rt.byDate.delete(core.date);
    for (const id of due) claim(api, rt, id);
    return undefined;
  },
};
