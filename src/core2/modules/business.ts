/**
 * Businesses growing, first cut: every business has an owner, and each
 * month the owner chooses how much of that month's profit to draw, never
 * more than the profit the business has kept. Draws move through the ledger.
 */
import { chooseAct } from "../choice";
import businessData from "../data/business/business.json" with { type: "json" };
import businessParameters from "../data/business/parameters.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import type { ActOffer, CoreAPI, CoreModule, CoreState } from "../types";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import { shiftPurchaseShare } from "../residents-economy";
import { lendForFounding } from "./credit";
import { registerEmployer } from "./jobs";
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

/** Room in each industry: incumbents' demand above their capacity, as a share of capacity. */
function marketRoom(
  api: CoreAPI,
): Map<string, { room: number; incumbents: string[]; staff: number }> {
  const c = core(api);
  const out = new Map<
    string,
    { demand: number; capacity: number; incumbents: string[]; staff: number }
  >();
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt || !book.capacityMinor) continue;
    const row = out.get(book.kindId) ?? {
      demand: 0,
      capacity: 0,
      incumbents: [],
      staff: 0,
    };
    // Real demand, in the business's own opening prices.
    row.demand += book.annualDemandMinor / (book.price / book.anchorPrice || 1);
    row.capacity += book.capacityMinor;
    row.incumbents.push(id);
    row.staff += c.finance.jobsByOrganization.get(id)?.size ?? 0;
    out.set(book.kindId, row);
  }
  return new Map(
    [...out].map(([kind, row]) => [
      kind,
      {
        room: Math.max(0, row.demand / row.capacity - 1),
        incumbents: row.incumbents,
        staff: row.staff,
      },
    ]),
  );
}

/** Working-age full people choose whether to start a business where a market has room. */
function foundings(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const rooms = [...marketRoom(api)]
    .filter(([, row]) => row.room > 0)
    .sort((a, b) => b[1].room - a[1].room);
  if (!rooms.length) return;
  const [kindId, market] = rooms[0]!;
  const owners = new Set(
    (
      store(api).table("owners").query("all", [true]) as unknown as OwnerRow[]
    ).map((row) => row.ownerId),
  );
  const seekers = c.modules.has("jobs")
    ? api.moduleState("jobs").table("seekers")
    : undefined;
  const traits = businessData.traits;
  for (const person of [...c.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const age =
      daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
      p("jobsDaysPerYear");
    if (
      !person.alive ||
      owners.has(person.id) ||
      age < p("businessFounderMinimumAge") ||
      age >= p("businessFounderMaximumAge")
    )
      continue;
    const traitPull =
      ((person.traits[traits.enterprising] ?? 0) +
        (person.traits[traits.risk] ?? 0)) /
      p("macroTraitScaleBoard");
    const unemployed = seekers?.get(person.id) && !person.jobId ? 1 : 0;
    const result = chooseAct(c, person.id, [
      option(0, {}),
      foundOption(kindId, {
        baseline: p("businessFoundBaseline"),
        room: p("businessFoundRoomWeight") * market.room,
        traits: p("businessFoundTraitWeight") * traitPull,
        lostWork: p("businessFoundUnemployedWeight") * unemployed,
      }),
    ]);
    if (result.selected!.definition.id !== businessData.actions.found.id)
      continue;
    found(api, person.id, kindId, market);
    // One founding a month and town; the next month's room is measured afresh.
    return;
  }
}

function foundOption(
  kindId: string,
  reasons: Record<string, number>,
): ActOffer {
  const base = option(1, reasons);
  return {
    ...base,
    definition: {
      ...base.definition,
      id: businessData.actions.found.id,
      actKinds: businessData.actions.found.actKinds,
    },
    targetId: `business-found:${kindId}`,
  };
}

function found(
  api: CoreAPI,
  founderId: string,
  kindId: string,
  market: { room: number; incumbents: string[]; staff: number },
): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const founder = c.people.get(founderId)!;
  const id = `organization:founded:${kindId}:${founderId}:${c.date}`;
  const source = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation: businessData.source.citation,
    estimatedFrom: `Founded by ${founderId} where the town's ${kindId} businesses had demand ${(market.room * 100).toFixed(1)} percent above their capacity.`,
  };
  api.addOrganization({
    id,
    placeId: founder.placeId,
    name: businessData.namePattern
      .replace("{founder}", founder.familyName)
      .replace("{kind}", kindId),
    kind: "employer",
    liquidMinor: 0,
    source,
  });
  const share = 1 / (market.incumbents.length + 1);
  const monthly = shiftPurchaseShare(c, new Set(market.incumbents), id, share);
  const kind = DEFAULT_BUSINESS_BOOKS_DATA.kinds.find(
    (row) => row.id === kindId,
  )!;
  const annualDemandMinor = monthly * p("macroMonthsPerYear");
  const annualPayrollMinor = annualDemandMinor * p(kind.payrollShareParameter);
  const annualOtherCostsMinor = Math.max(
    0,
    annualDemandMinor * (1 - p(kind.marginParameter)) - annualPayrollMinor,
  );
  api.addBusinessBooks({
    organizationId: id,
    kindId,
    annualPayrollMinor,
    annualDemandMinor,
    annualOtherCostsMinor,
    openingTownIncomeMinor: 0,
    capacityMinor: annualDemandMinor,
    price: 1,
    costContractIds: [],
    source,
  });
  const loan = lendForFounding(
    api,
    id,
    ((annualPayrollMinor + annualOtherCostsMinor) / p("macroMonthsPerYear")) *
      p("businessStartupMonthsOfCosts"),
    p("businessStartupTermMonths"),
  );
  const book = c.finance.businesses.get(id)!;
  store(api).table("owners").put({
    id,
    isOwner: true,
    ownerId: founderId,
    since: c.date,
    basis: "founder",
    salesThrough: book.salesReceivedMinor,
    wagesThrough: book.wagesPaidMinor,
    operatingThrough: book.operatingPaidMinor,
    retainedMinor: 0,
  });
  if (c.modules.has("jobs"))
    registerEmployer(api, id, Math.max(1, Math.round(market.staff * share)));
  store(api).table("foundings").put({
    id,
    organizationId: id,
    founderId,
    kindId,
    date: c.date,
    room: market.room,
    customersMonthlyMinor: monthly,
    loanMinor: loan,
    incumbents: market.incumbents.length,
  });
  api.emit({
    id: `event:organization.founded:${id}`,
    date: c.date,
    kind: "organization.founded",
    personIds: [founderId],
    placeId: founder.placeId,
    source,
    publicRecord: true,
    topic: id,
  });
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
      foundings: {},
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
    foundings(api);
    scheduleMonth(api);
  },
  onDay(api) {
    if (!store(api).table("state").get("business:state")) open(api);
  },
};
