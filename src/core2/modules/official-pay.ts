/**
 * Officials hold their office as a paid job (money stress audit defect 9).
 * Every official the officials engine seats, in town or anywhere else, gets
 * a salaried post (a job with no shift hours) and is paid on the 1st of each
 * month for the days they served: the town's state treasury pays its own
 * state's offices; the federal government and other states pay theirs as
 * outside payers (the game keeps treasuries only for the town's own
 * governments, and the federal one holds the town's share). Each payday is a gross
 * paycheck from the treasury, and the taxes the law in force says come out
 * of it go to each government with a treasury, as for any paycheck.
 * Salaries come from `data/research/offices/official-salaries-2026.json`:
 * a governor's is sourced, the rest are estimates with a spread; an office
 * the table lacks (an auditor, a public service commissioner) is paid the
 * state treasurer's salary, and its citation says so.
 *
 * An official with no household cost of their own (everyone filled in from
 * a recorded identity) is given one the day they are seated: the Consumer
 * Expenditure basket and a studio's rent, and the savings a family at their
 * pay keeps (official-living). Each payday they spend that month's cost out
 * of what they hold, to the outside account (their sellers are not in town).
 */
import salaries from "../../../data/research/offices/official-salaries-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { BUDGETS_MODULE_ID, governments, withholdPay } from "./budgets";
import { notePublicPay } from "../budgets-treasury";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./officials";
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import payFacts from "../../../data/source/official-office-pay/facts.json" with { type: "json" };
import { outsideGovernment } from "../outside-governments";
import { officialHousehold } from "../official-living";
import { outsideAccountOf } from "../budgets-treasury";

export const OFFICIAL_PAY_MODULE_ID = "core2-official-pay-v1";

type SalaryRow = Readonly<Record<string, number | string | boolean | null>>;
const TABLE = salaries as unknown as {
  federal: SalaryRow & { source: string };
  states: Readonly<Record<string, SalaryRow & { source: string }>>;
  provenance: {
    estimated: {
      spreadPct: { governor: number; legislator: number; statewide: number };
      estimatedFrom: string;
    };
  };
};
/** The sourced annual figures, each with the statute or commission it was read from. */
const SOURCED_PAY = new Map(
  payFacts.facts.map((c) => [`${c.office}:${c.state}`, c]),
);

/** Which salary row pays each office kind (the research file's keys). */
const FEDERAL_KEYS: Readonly<Record<string, string>> = {
  president: "president",
  "vice-president": "vicePresident",
  "us-senate": "senator",
  "us-house": "representative",
};
const STATE_KEYS: Readonly<Record<string, string>> = {
  governor: "governor",
  "lieutenant-governor": "lieutenantGovernor",
  "attorney-general": "attorneyGeneral",
  "secretary-of-state": "secretaryOfState",
  treasurer: "treasurer",
};
/** A statewide office the table lacks, or lists as not separate, is paid like these, in order. */
const STATEWIDE_FALLBACK = ["treasurer", "secretaryOfState", "attorneyGeneral"];

interface PayRow {
  id: string;
  personId: string;
  jobId: string;
  payerId: string;
  annualMinor: number;
  citation: string;
  /** The figure's own provenance: SOURCED, or an estimate with its spread. */
  source: Source;
  /** Paid for every day before this one. */
  paidFrom: string;
  /** Pay earned that the treasury could not cover yet; paid first on the next payday it can. */
  owedMinor?: number;
  /** The day the office ended, when it has. */
  endedOn: string | null;
  /** The official's household was estimated here, so they spend what it costs each payday. */
  spends: boolean;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICIAL_PAY_MODULE_ID).table(name);

const isFederal = (row: OfficialRow) =>
  FEDERAL_KEYS[row.officeKind] !== undefined ||
  FEDERAL_KEYS[row.bodyKind] !== undefined;

export interface OfficialSalary {
  readonly annualMinor: number;
  readonly citation: string;
  readonly tag: "SOURCED" | "ESTIMATED";
  /** For an estimate: how far, in percent, the figure may be from the true one. */
  readonly spreadPct?: number;
  readonly estimatedFrom?: string;
}

/** The office's yearly salary in cents and where the figure comes from. */
export function officialSalary(row: OfficialRow): OfficialSalary | null {
  const federal =
    FEDERAL_KEYS[row.officeKind] ?? FEDERAL_KEYS[row.bodyKind] ?? undefined;
  if (federal) {
    const dollars = TABLE.federal[federal];
    return typeof dollars === "number"
      ? {
          annualMinor: dollars * 100,
          citation: `${federal}: ${TABLE.federal.source}`,
          tag: "SOURCED",
        }
      : null;
  }
  const state = TABLE.states[row.stateKey];
  if (!state) return null;
  const own =
    row.bodyKind === "legislature"
      ? "legislatorAnnual"
      : STATE_KEYS[row.officeKind];
  const spread = TABLE.provenance.estimated.spreadPct;
  for (const key of [...(own ? [own] : []), ...STATEWIDE_FALLBACK]) {
    const usps = row.stateKey.replace(/^US-/, "");
    const published =
      key === "governor"
        ? SOURCED_PAY.get(`governor:${usps}`)
        : key === "legislatorAnnual"
          ? SOURCED_PAY.get(`state-legislator:${usps}`)
          : undefined;
    const dollars = published?.annualDollars ?? state[key];
    if (typeof dollars !== "number") continue;
    const via =
      key === own
        ? ""
        : ` (paid like the ${key}; the table has no row for ${row.officeKind})`;
    if (published)
      return {
        annualMinor: dollars * 100,
        citation: `${row.stateKey} ${key}${via}: ${published.sourceUrl} (${published.referencePeriod}). ${published.locator}`,
        tag: "SOURCED",
      };
    return {
      annualMinor: dollars * 100,
      citation: `${row.stateKey} ${key}${via}: ${state.source}`,
      tag: "ESTIMATED",
      spreadPct:
        key === "governor"
          ? spread.governor
          : key === "legislatorAnnual"
            ? spread.legislator
            : spread.statewide,
      estimatedFrom: TABLE.provenance.estimated.estimatedFrom,
    };
  }
  return null;
}

const salarySource = (salary: OfficialSalary, asOf: string): Source =>
  salary.tag === "SOURCED"
    ? { tag: "SOURCED", asOf, citation: salary.citation }
    : {
        tag: "ESTIMATED",
        asOf,
        citation: salary.citation,
        estimatedFrom: `${salary.estimatedFrom} Spread: ${salary.spreadPct} percent either way.`,
      };

/**
 * Who pays an office: the town's state treasury for its own state's offices.
 * Federal officials are paid nationally, and another state's government pays
 * its own; both are outside payers, since the town's federal treasury holds
 * only the town's share of federal taxes and no other state keeps a treasury
 * here. The taxes withheld from their pay still go to every treasury kept.
 */
function payerFor(api: CoreAPI, row: OfficialRow): string {
  if (!isFederal(row) && api.state.modules.has(BUDGETS_MODULE_ID)) {
    const own = governments(api).find(
      (g) => g.level === "state" && g.id === row.stateKey,
    );
    if (own) return own.organizationId;
  }
  return outsideGovernment(api, isFederal(row) ? "US" : row.stateKey);
}

function seat(api: CoreAPI, row: OfficialRow): void {
  const person = api.state.people.get(row.id);
  if (!person?.alive || table(api, "pay").get(row.id)) return;
  const salary = officialSalary(row);
  if (!salary) {
    // An office the table has no pay for still has a person with a household to keep, on no pay.
    keepHousehold(api, row, 0);
    return;
  }
  const payerId = payerFor(api, row);
  const jobId = `job:office:${row.seatId}:${row.id}`;
  const source = salarySource(salary, api.state.date);
  // Someone already working keeps their job (many legislatures sit part
  // time) and is paid the salary besides; anyone else holds the office as
  // their job.
  const working =
    person.jobId !== undefined &&
    (api.state as CoreState).jobs.get(person.jobId)?.endsAt === undefined;
  if (!working)
    api.startSalariedPost({
      id: jobId,
      personId: row.id,
      organizationId: payerId,
      title: row.officeKind,
      wageDailyMinor: Math.round(salary.annualMinor / 365),
      hoursDaily: 0,
      source,
    });
  table(api, "pay").put({
    id: row.id,
    personId: row.id,
    jobId: working ? person.jobId! : jobId,
    payerId,
    annualMinor: salary.annualMinor,
    citation: salary.citation,
    source,
    paidFrom: api.state.date,
    endedOn: null,
    spends: keepHousehold(api, row, salary.annualMinor),
  } satisfies PayRow as unknown as ModuleRow);
}

/** Gives a seated official the living cost and savings their pay implies; false when they already had a household cost. */
function keepHousehold(
  api: CoreAPI,
  row: OfficialRow,
  annualMinor: number,
): boolean {
  const person = api.state.people.get(row.id);
  if (!person || person.livingCostDailyMinor > 0) return false;
  const home = officialHousehold(api, row.stateKey, annualMinor);
  api.updatePerson(row.id, { livingCostDailyMinor: home.livingCostDailyMinor });
  if (home.savingsMinor > 0) {
    const accounts = api.accounts();
    accounts.transfer({
      id: `savings:${row.id}:${api.state.date}`,
      from: accounts.main(
        outsideGovernment(api, isFederal(row) ? "US" : row.stateKey),
      ),
      to: accounts.main(row.id),
      amountMinor: home.savingsMinor,
      reasonKey: "official.savings",
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `What a family at ${annualMinor} a year keeps in checking and savings (SCF 2022).`,
        estimatedFrom: "scf-transaction-accounts-2022",
      },
    });
  }
  return true;
}

/** What an official spends on living for the days since their last payday, out of what they hold. */
function spendDays(api: CoreAPI, row: PayRow, days: number): void {
  const person = api.state.people.get(row.personId);
  const outside = outsideAccountOf(api);
  if (!person?.alive || !outside) return;
  const accounts = api.accounts();
  accounts.transfer({
    id: `living:${row.personId}:${api.state.date}`,
    from: accounts.main(row.personId),
    to: accounts.main(outside),
    amountMinor: person.livingCostDailyMinor * days,
    reasonKey: "official.living",
    partial: true,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: `${days} days of the household's living cost (official-living).`,
      estimatedFrom: "BLS Consumer Expenditure Survey and HUD fair market rent",
    },
  });
}

/** Pays each official for the days served since their last pay, on the 1st. */
function payMonth(api: CoreAPI): void {
  const accounts = api.accounts();
  const today = makeIsoDate(api.state.date);
  for (const raw of table(api, "pay").rows()) {
    const row = raw as unknown as PayRow;
    const through = row.endedOn && row.endedOn < today ? row.endedOn : today;
    const days = Math.max(
      0,
      daysBetween(makeIsoDate(row.paidFrom), makeIsoDate(through)),
    );
    const yearDays = daysBetween(
      makeIsoDate(`${Number(today.slice(0, 4)) - 1}${today.slice(4)}`),
      today,
    );
    const earnedMinor = Math.round((row.annualMinor * days) / yearDays);
    const dueMinor = earnedMinor + (row.owedMinor ?? 0);
    let owedMinor = 0;
    if (dueMinor > 0 && api.state.people.get(row.personId)?.alive) {
      const receipt = accounts.transfer({
        id: `salary:${row.personId}:${today}`,
        from: accounts.main(row.payerId),
        to: accounts.main(row.personId),
        amountMinor: dueMinor,
        reasonKey: "official.salary",
        partial: true,
        source: {
          ...row.source,
          asOf: today,
          citation: `${days} days in office at ${row.annualMinor} a year${row.owedMinor ? `, with ${row.owedMinor} still owed from earlier paydays` : ""}. ${row.citation}`,
        },
      });
      owedMinor = dueMinor - receipt.paidMinor;
      if (receipt.paidMinor > 0 && api.state.modules.has(BUDGETS_MODULE_ID)) {
        // The treasury's spending on the post's line, and the taxes out of the paycheck.
        notePublicPay(api, {
          id: receipt.id,
          organizationId: row.payerId,
          jobId: `job:office:${row.id}`,
          personId: row.personId,
          paidMinor: receipt.paidMinor,
        });
        withholdPay(api, {
          id: receipt.id,
          personId: row.personId,
          paidMinor: receipt.paidMinor,
          fromAt: row.paidFrom,
          throughAt: addDays(makeIsoDate(through), -1),
        });
      }
      if (row.spends && days > 0) spendDays(api, row, days);
    } else if (dueMinor <= 0 && days <= 0) continue;
    if (row.endedOn && row.endedOn <= today && owedMinor === 0)
      table(api, "pay").remove(row.id);
    else
      table(api, "pay").put({
        ...row,
        paidFrom: through,
        owedMinor,
      } as unknown as ModuleRow);
  }
}

/** Seat new officials, and end the post of anyone whose term ended. */
function review(api: CoreAPI): void {
  const officials = api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .rows() as unknown as OfficialRow[];
  for (const row of officials) {
    if (row.ended === null) {
      seat(api, row);
      continue;
    }
    const pay = table(api, "pay").get(row.id) as unknown as PayRow | undefined;
    if (!pay || pay.endedOn) continue;
    const job = (api.state as CoreState).jobs.get(pay.jobId);
    if (job?.id.startsWith("job:office:") && job.endsAt === undefined)
      api.endJob(pay.jobId, `office-ended:${row.seatId}:${row.ended}`);
    table(api, "pay").put({
      ...pay,
      endedOn: row.ended,
    } as unknown as ModuleRow);
  }
}

const seenOfficials = new WeakMap<object, number>();

export const OFFICIAL_PAY_MODULE: CoreModule = {
  id: OFFICIAL_PAY_MODULE_ID,
  state: { schemaVersion: 1, tables: { pay: {} } },
  onDay(api) {
    if (!api.state.modules.has(OFFICIALS_MODULE_ID)) return undefined;
    // New officials are seated the day the roster grows; ended terms are
    // read on paydays. One look at the roster's size on other days.
    const size = api.moduleState(OFFICIALS_MODULE_ID).table("officials").size;
    const payday = api.state.date.endsWith("-01");
    if (payday || seenOfficials.get(api.state) !== size) {
      seenOfficials.set(api.state, size);
      review(api);
    }
    if (payday) payMonth(api);
    return undefined;
  },
};

export function openOfficialPay(core: CoreState): void {
  if (core.modules.has(OFFICIAL_PAY_MODULE_ID)) return;
  registerModule(core, OFFICIAL_PAY_MODULE);
  review(coreAPI(core));
}
