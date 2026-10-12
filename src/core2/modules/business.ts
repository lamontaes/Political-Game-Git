/**
 * Businesses growing, first cut: every business has an owner, and each
 * month the owner chooses how much of that month's profit to draw, never
 * more than the profit the business has kept. Draws move through the ledger.
 */
import { chooseAct } from "../choice";
import businessData from "../data/business/business.json" with { type: "json" };
import businessParameters from "../data/business/parameters.json" with { type: "json" };
import { addDays, makeIsoDate } from "../../simulation/dates";
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import type { ActOffer, CoreAPI, CoreModule, CoreState } from "../types";
import { transferCash } from "../world-transfer";

export const BUSINESS_MODULE_ID = "business";
export const BUSINESS_PARAMETERS = businessParameters as unknown as Readonly<
  Record<string, Parameter>
>;
const PULL = "business:pull";

interface OwnerRow {
  id: string;
  ownerId: string;
  since: string;
  basis: string;
  /** Book counters at the last draw, to measure this month's profit. */
  salesThrough: number;
  wagesThrough: number;
  operatingThrough: number;
  /** Profit earned and not yet drawn; the most an owner can take. */
  retainedMinor: number;
}

function store(api: CoreAPI) {
  return api.moduleState(BUSINESS_MODULE_ID);
}
const core = (api: CoreAPI) => api.state as CoreState;

function option(share: number, reasons: Record<string, number>): ActOffer {
  const row = share > 0 ? businessData.actions.draw : businessData.actions.keep;
  return {
    definition: {
      id: row.id,
      actKinds: row.actKinds,
      goalKinds: [],
      need: businessData.need,
      effortParameter: businessData.effortParameter,
      effectParameter: businessData.effectParameter,
      targetKind: businessData.targetKind,
      effect: businessData.effect,
    },
    targetId: `business-draw:${share}`,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: PULL,
      weightParameter: "one",
      arguments: { value: String(value), share: String(share) },
    })),
  };
}

/** The opening's owners: each business's highest-paid current worker, as owner-operator. */
function open(api: CoreAPI): void {
  const c = core(api);
  // Owners are generated as owner-operators until founding gives businesses their founders.
  stopgap("SG-WORLD-business-opening-owners");
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    const staff = [...(c.finance.jobsByOrganization.get(id) ?? [])]
      .map((jobId) => c.jobs.get(jobId)!)
      .filter((job) => job.endsAt === undefined && c.people.get(job.personId))
      .sort(
        (a, b) =>
          (b.hourlyMinor ?? 0) - (a.hourlyMinor ?? 0) ||
          c.people
            .get(a.personId)!
            .birthDate.localeCompare(c.people.get(b.personId)!.birthDate) ||
          a.id.localeCompare(b.id),
      );
    if (!staff.length) continue;
    store(api).table("owners").put({
      id,
      isOwner: true,
      ownerId: staff[0]!.personId,
      since: c.date,
      basis: "highest-paid-worker",
      salesThrough: book.salesReceivedMinor,
      wagesThrough: book.wagesPaidMinor,
      operatingThrough: book.operatingPaidMinor,
      retainedMinor: 0,
    });
  }
  store(api).table("state").put({ id: "business:state", openedAt: c.date });
  scheduleMonth(api);
}

function scheduleMonth(api: CoreAPI): void {
  const next =
    addDays(
      makeIsoDate(`${api.state.date.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-01";
  api.moduleCalendar(BUSINESS_MODULE_ID).schedule({
    key: `month:${next}`,
    date: next,
    kind: "business-month",
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: businessData.source.citation,
    },
    sourceRecordIds: ["business:state"],
  });
}

function month(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  for (const row of store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[]) {
    const book = c.finance.businesses.get(row.id),
      owner = c.people.get(row.ownerId);
    if (!book || book.closedAt || !owner || !owner.alive) continue;
    const profit =
      book.salesReceivedMinor -
      row.salesThrough -
      (book.wagesPaidMinor - row.wagesThrough) -
      (book.operatingPaidMinor - row.operatingThrough);
    const retained = Math.max(0, row.retainedMinor + profit);
    const cash = c.organizations.get(row.id)!.liquidMinor;
    const cushion =
      (book.annualPayrollMinor / p("macroMonthsPerYear")) *
      p("businessCushionMonths");
    const ownerDays =
      owner.livingCostDailyMinor > 0
        ? owner.liquidMinor / owner.livingCostDailyMinor
        : Number.POSITIVE_INFINITY;
    const short = cushion > 0 ? Math.max(0, 1 - cash / cushion) : 0;
    const need = 1 / (1 + ownerDays / p("businessDaysPerMonth"));
    let drawn = 0,
      share = 0;
    if (retained > 0) {
      const result = chooseAct(
        c,
        owner.id,
        businessData.drawShares.map((s) =>
          option(s, {
            need: p("businessDrawNeedWeight") * need * s,
            keep: -p("businessDrawKeepWeight") * short * s,
            size: -p("businessDrawSizeWeight") * s * s,
          }),
        ),
      );
      share = Number(result.selected!.targetId.split(":").at(-1));
      if (share > 0)
        drawn = transferCash(
          api,
          `owner-draw:${row.id}:${c.date}`,
          row.id,
          owner.id,
          retained * share,
          {
            tag: "ESTIMATED",
            asOf: c.date,
            citation: businessData.source.citation,
            estimatedFrom: `The owner's draw: ${share} of ${retained} minor units of profit kept, chosen from their own money and the business's cash.`,
          },
        );
    }
    store(api)
      .table("draws")
      .put({
        id: `draw:${row.id}:${c.date}`,
        organizationId: row.id,
        ownerId: owner.id,
        date: c.date,
        profitMinor: profit,
        retainedBeforeMinor: retained,
        share,
        drawnMinor: drawn,
        cashMinor: cash,
        cushionMinor: cushion,
      });
    store(api)
      .table("owners")
      .put({
        ...row,
        isOwner: true,
        salesThrough: book.salesReceivedMinor,
        wagesThrough: book.wagesPaidMinor,
        operatingThrough: book.operatingPaidMinor,
        retainedMinor: retained - drawn,
      });
  }
}

/** Who owns a business, for jobs (who decided a layoff) and the bench. */
export function ownerOf(
  api: CoreAPI,
  organizationId: string,
): string | undefined {
  if (!(api.state as CoreState).modules.has(BUSINESS_MODULE_ID))
    return undefined;
  return (
    store(api).table("owners").get(organizationId) as OwnerRow | undefined
  )?.ownerId;
}

export const BUSINESS_MODULE: CoreModule = {
  id: BUSINESS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      owners: { indexes: { all: { fields: ["isOwner"] } } },
      draws: { indexes: { byOrganization: { fields: ["organizationId"] } } },
    },
  },
  reasonProviders: {
    [PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  onCalendarWork(api, work) {
    if (work.kind !== "business-month") return;
    month(api);
    scheduleMonth(api);
  },
  onDay(api) {
    if (!store(api).table("state").get("business:state")) open(api);
  },
};
