/**
 * Officials hold their office as a paid job (money stress audit defect 9).
 * Every official the officials engine seats, in town or anywhere else, gets
 * a salaried post (a job with no shift hours) and is paid on the 1st of each
 * month for the days they served: the town's state treasury pays its own
 * state's offices; the federal government and other states pay theirs as
 * outside payers.
 * Salaries come from `data/research/offices/official-salaries-2026.json`.
 *
 * The salary is a monthly transfer, with the law in force's taxes withheld
 * from it as from a paycheck. Stopgap SG-CORE-official-salary: another state's officials are
 * paid by that state's government as an outside payer, since only the
 * town's own governments keep treasuries; offices the salary table lacks
 * (an auditor, a public service commissioner) are paid the state
 * treasurer's salary.
 */
import salaries from "../../../data/research/offices/official-salaries-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { BUDGETS_MODULE_ID, governments, withholdPay } from "./budgets";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./officials";
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import type { ModuleRow } from "../module-data";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import { outsideGovernment } from "../outside-governments";

export const OFFICIAL_PAY_MODULE_ID = "core2-official-pay-v1";
const STOPGAP = "SG-CORE-official-salary";

type SalaryRow = Readonly<Record<string, number | string | boolean | null>>;
const TABLE = salaries as unknown as {
  federal: SalaryRow & { source: string };
  states: Readonly<Record<string, SalaryRow & { source: string }>>;
};

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
  /** Paid for every day before this one. */
  paidFrom: string;
  /** The day the office ended, when it has. */
  endedOn: string | null;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICIAL_PAY_MODULE_ID).table(name);

const isFederal = (row: OfficialRow) =>
  FEDERAL_KEYS[row.officeKind] !== undefined ||
  FEDERAL_KEYS[row.bodyKind] !== undefined;

/** The office's yearly salary in cents and where the figure comes from. */
export function officialSalary(
  row: OfficialRow,
): { annualMinor: number; citation: string } | null {
  const federal =
    FEDERAL_KEYS[row.officeKind] ?? FEDERAL_KEYS[row.bodyKind] ?? undefined;
  if (federal) {
    const dollars = TABLE.federal[federal];
    return typeof dollars === "number"
      ? {
          annualMinor: dollars * 100,
          citation: `${federal}: ${TABLE.federal.source}`,
        }
      : null;
  }
  const state = TABLE.states[row.stateKey];
  if (!state) return null;
  const own =
    row.bodyKind === "legislature"
      ? "legislatorAnnual"
      : STATE_KEYS[row.officeKind];
  for (const key of [...(own ? [own] : []), ...STATEWIDE_FALLBACK]) {
    const dollars = state[key];
    if (typeof dollars === "number")
      return {
        annualMinor: dollars * 100,
        citation: `${row.stateKey} ${key}${key === own ? "" : ` (paid like the ${key}; the table has no row for ${row.officeKind})`}: ${state.source}`,
      };
  }
  return null;
}

/**
 * Who pays an office: the town's state treasury for its own state's offices;
 * the federal government (paid nationally, not from one town's taxes) and
 * other states' governments as outside payers.
 */
function payerFor(api: CoreAPI, row: OfficialRow): string {
  if (!isFederal(row) && api.state.modules.has(BUDGETS_MODULE_ID)) {
    const own = governments(api).find(
      (g) => g.level === "state" && g.id === row.stateKey,
    );
    if (own) return own.organizationId;
  }
  api.stopgap(STOPGAP);
  return outsideGovernment(api, isFederal(row) ? "US" : row.stateKey);
}

function seat(api: CoreAPI, row: OfficialRow): void {
  const person = api.state.people.get(row.id);
  if (!person?.alive || table(api, "pay").get(row.id)) return;
  const salary = officialSalary(row);
  if (!salary) return;
  api.stopgap(STOPGAP);
  const payerId = payerFor(api, row);
  const jobId = `job:office:${row.seatId}:${row.id}`;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation: salary.citation,
    estimatedFrom: "official-salaries-2026 (recalled published values)",
  };
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
    paidFrom: api.state.date,
    endedOn: null,
  } satisfies PayRow as unknown as ModuleRow);
}

/** Pays each official for the days served since their last pay, on the 1st. */
function payMonth(api: CoreAPI): void {
  const accounts = api.accounts();
  const today = makeIsoDate(api.state.date);
  for (const raw of table(api, "pay").rows()) {
    const row = raw as unknown as PayRow;
    const through = row.endedOn && row.endedOn < today ? row.endedOn : today;
    const days = daysBetween(makeIsoDate(row.paidFrom), makeIsoDate(through));
    if (days <= 0) continue;
    const yearDays = daysBetween(
      makeIsoDate(`${Number(today.slice(0, 4)) - 1}${today.slice(4)}`),
      today,
    );
    const amountMinor = Math.round((row.annualMinor * days) / yearDays);
    if (amountMinor > 0 && api.state.people.get(row.personId)?.alive) {
      const receipt = accounts.transfer({
        id: `salary:${row.personId}:${today}`,
        from: accounts.main(row.payerId),
        to: accounts.main(row.personId),
        amountMinor,
        reasonKey: "official.salary",
        partial: true,
        source: {
          tag: "ESTIMATED",
          asOf: today,
          citation: `${days} days in office at ${row.annualMinor} a year. ${row.citation}`,
          estimatedFrom: "official-salaries-2026 (recalled published values)",
        },
      });
      // Pay in full or short, the taxes the law in force takes out come from
      // what the official was paid, as they do from any paycheck.
      if (receipt.paidMinor > 0 && api.state.modules.has(BUDGETS_MODULE_ID))
        withholdPay(api, {
          id: receipt.id,
          personId: row.personId,
          paidMinor: receipt.paidMinor,
          fromAt: row.paidFrom,
          throughAt: addDays(makeIsoDate(through), -1),
        });
    }
    if (row.endedOn && row.endedOn <= today) table(api, "pay").remove(row.id);
    else
      table(api, "pay").put({
        ...row,
        paidFrom: through,
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
