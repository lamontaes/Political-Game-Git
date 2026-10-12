/**
 * Retirement claims during play (stand-in SG-CORE-retirement-claims-in-play,
 * until GOV's Social Security program). A full person who reaches their own
 * claim age (a decision inside the law: retirement-claim.ts) and has enough
 * covered work starts a monthly award from the place's Social Security payer,
 * sized as the opening sizes awards. Claims are indexed by date; nothing scans
 * the town each day.
 */
import { addDays, makeIsoDate } from "../../simulation/dates";
import incomeData from "../data/opening-income.json" with { type: "json" };
import fundingData from "../data/opening-income-funding.json" with { type: "json" };
import { retirementClaimAgeMonths } from "../retirement-claim";
import { decisionLean } from "../trait-decisions";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  IsoDate,
  PersonId,
} from "../types";

export const RETIREMENT_CLAIMS_MODULE_ID = "core2-retirement-claims-v1";
const STOPGAP = "SG-CORE-retirement-claims-in-play";

interface Runtime {
  known: Set<PersonId>;
  byDate: Map<IsoDate, PersonId[]>;
  claimed: Map<PersonId, { date: IsoDate; monthlyMinor: number }>;
}
const runtimes = new WeakMap<CoreState, Runtime>();

/** Who has claimed in play, with the date and monthly award. */
export function retirementClaims(
  core: CoreState,
): ReadonlyMap<PersonId, { date: IsoDate; monthlyMinor: number }> {
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

function claimDateOf(api: CoreAPI, personId: PersonId): IsoDate | undefined {
  const person = api.state.people.get(personId)!;
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

function index(api: CoreAPI, rt: Runtime): void {
  const core = api.state;
  if (rt.known.size === core.people.size) return;
  for (const person of core.people.values()) {
    if (rt.known.has(person.id)) continue;
    rt.known.add(person.id);
    if (!person.alive || receivesRetirement(core, person.id)) continue;
    const date = claimDateOf(api, person.id);
    if (!date || date <= core.date) continue;
    rt.byDate.set(date, [...(rt.byDate.get(date) ?? []), person.id]);
  }
}

function claim(api: CoreAPI, rt: Runtime, personId: PersonId): void {
  const core = api.state;
  const person = core.people.get(personId);
  if (!person?.alive || receivesRetirement(core, personId)) return;
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
  accounts.addObligation({
    id: `retirement-claim:${personId}`,
    from: accounts.main(payer.id),
    to: accounts.main(personId),
    amountMinor: monthlyMinor,
    firstDueAt: addDays(makeIsoDate(core.date), 1),
    cadence: { kind: "months", every: 1 },
    accruesArrears: false,
    reasonKey: "income.retirement",
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: `${payer.source.citation} Claim age and award as the opening estimates them (src/core2/retirement-claim.ts; data/opening-income.json).`,
      estimatedFrom: `Claimed at ${age.toFixed(1)} with ${coveredMonths} modeled covered months; award ${monthlyMinor} minor units a month.`,
    },
  });
  rt.claimed.set(personId, { date: core.date, monthlyMinor });
}

export const RETIREMENT_CLAIMS_MODULE: CoreModule = {
  id: RETIREMENT_CLAIMS_MODULE_ID,
  onDay(api) {
    const core = api.state;
    let rt = runtimes.get(core);
    if (!rt) {
      rt = { known: new Set(), byDate: new Map(), claimed: new Map() };
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
