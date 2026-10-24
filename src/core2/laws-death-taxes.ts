/**
 * Estate and inheritance taxes as the law in force reads them when an estate
 * settles (the homelessness package, GOV part): the federal estate tax and a
 * state's on the estate above its exemption, then a state's inheritance tax
 * on each heir's share by their relation to the decedent. Each comes from
 * the law row in force for that jurisdiction on the day, so a bill that
 * changes the exemption or the rate changes what the next estate pays.
 */
import { LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI } from "./types";

interface Schedule {
  readonly exemption: number;
  readonly minRate: number;
  readonly maxRate?: number;
  readonly slideOver?: number;
}

/** A tax owed to one jurisdiction under one law, in cents. */
export interface DeathTax {
  readonly jurisdiction: string;
  readonly series: "estate-tax" | "inheritance-tax";
  readonly lawId: string;
  readonly amountMinor: number;
  /** For an inheritance tax: the heir whose share paid it. */
  readonly heirId?: string;
}

/**
 * A death tax a bill adopted where none stood sets only a rate: with no
 * schedule of its own, it taxes the whole amount at that rate, with no
 * exemption, until a bill gives it one.
 */
function flatSchedule(api: CoreAPI, rate: number): Schedule {
  // stopgapId: SG-LAW-death-tax-no-schedule
  api.stopgap("SG-LAW-death-tax-no-schedule");
  return { exemption: 0, minRate: rate };
}

/** The row in force for a jurisdiction and series on a date: the latest that has begun and not ended. */
function rowInForce(
  api: CoreAPI,
  jurisdiction: string,
  series: string,
): LawRowInput | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  const date = api.state.date;
  const rows = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .query("bySeries", [jurisdiction, series]) as unknown as LawRowInput[];
  return (
    rows
      .filter(
        (r) => r.effectiveDate <= date && (!r.endDate || r.endDate > date),
      )
      .sort(
        (a, b) =>
          b.effectiveDate.localeCompare(a.effectiveDate) ||
          b.id.localeCompare(a.id),
      )[0] ?? null
  );
}

/**
 * The tax on an amount above a schedule's exemption. The rate rises on a
 * sliding scale from the low rate to the top rate across `slideOver` dollars
 * of taxable amount (a flat rate where there is no slide), and applies to the
 * whole taxable amount at that point's average: the area under the line.
 */
export function scheduleTax(
  amountMinor: number,
  schedule: Schedule,
  topRate: number,
): number {
  const taxable = Math.max(0, amountMinor / 100 - schedule.exemption);
  if (taxable <= 0) return 0;
  const low = schedule.minRate;
  const high = schedule.maxRate ?? topRate;
  const slide = schedule.slideOver ?? 0;
  const within = slide > 0 ? Math.min(taxable, slide) : 0;
  // Over the slide, the rate climbs evenly; past it, every dollar pays the top.
  const sliding =
    slide > 0 ? within * (low + ((high - low) * within) / slide / 2) : 0;
  const beyond = (taxable - within) * (slide > 0 ? high : low);
  // Dollars times a percent rate is cents.
  return Math.round(sliding + beyond);
}

/** The estate taxes owed on an estate: the federal government's, then the decedent's state's. */
export function estateTaxes(
  api: CoreAPI,
  stateKey: string | null,
  estateMinor: number,
): readonly DeathTax[] {
  const out: DeathTax[] = [];
  for (const jurisdiction of ["US", ...(stateKey ? [stateKey] : [])]) {
    const row = rowInForce(api, jurisdiction, "estate-tax");
    if (!row || row.value === null || row.value === undefined) continue;
    const schedule = row.terms as unknown as Schedule | undefined;
    const amountMinor = scheduleTax(
      estateMinor,
      schedule && "minRate" in schedule
        ? schedule
        : flatSchedule(api, row.value),
      row.value,
    );
    if (amountMinor > 0)
      out.push({
        jurisdiction,
        series: "estate-tax",
        lawId: row.id,
        amountMinor,
      });
  }
  return out;
}

/** A state's inheritance tax on one heir's share, by their relation to the decedent. */
export function inheritanceTax(
  api: CoreAPI,
  stateKey: string | null,
  relation: string,
  shareMinor: number,
): DeathTax | null {
  if (!stateKey) return null;
  const row = rowInForce(api, stateKey, "inheritance-tax");
  if (!row || row.value === null || row.value === undefined) return null;
  const terms = row.terms as unknown as
    { classes?: Record<string, Schedule>; others?: Schedule } | undefined;
  const amountMinor = scheduleTax(
    shareMinor,
    terms?.classes?.[relation] ?? terms?.others ?? flatSchedule(api, row.value),
    row.value,
  );
  return amountMinor > 0
    ? {
        jurisdiction: stateKey,
        series: "inheritance-tax",
        lawId: row.id,
        amountMinor,
      }
    : null;
}
