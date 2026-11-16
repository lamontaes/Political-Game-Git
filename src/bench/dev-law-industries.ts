/**
 * Dev mode's Industries check: what this world's changes did to each
 * industry, against the same world given a bill that changes nothing.
 *
 * The twin is built from this world's own recipe (seed, place, start date,
 * the New game choices). Each bill dev mode or the player brought here is a
 * bill in the twin at the same body, on the same day, by the same sponsor,
 * decided the same way, whose sections restate what is in force: passing a
 * bill is news people hear and talk about, so the bill's own stir counts on
 * both sides and only what its law changes is left. A law dev mode set with
 * no bill is a restating row in the twin. Then both worlds are tallied by the
 * one industry count (`industryTally`, dev-industries.ts) and matched by kind
 * and by business. A repeal shows here like any other change.
 *
 * The opening-law check is the same pair with one law the town opened with
 * set aside in the twin from the day after the opening, so the difference is
 * what that law is doing.
 *
 * Read-only for this world; the twin is built, read and dropped. Nothing
 * here runs unless dev mode asks, so a played year is unchanged.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  bodyOf,
  bodyRow,
  committeeRecords,
  draftBill,
  LEGISLATURE_MODULE_ID,
  type BillRow,
  type Provision,
} from "../core2/modules/legislature";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../core2/modules/laws";
import type { LawRowInput } from "../core2/laws-starting";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../core2/business-books";
import { organizationName } from "../core2/past";
import { coreAPI } from "../core2/state";
import type { CoreAPI, CoreState } from "../core2/types";
import {
  industryTally,
  type IndustryBusiness,
  type IndustryRow,
  type IndustryTally,
} from "./dev-industries";
import { buildBenchWorld, buildRecipeOf } from "./world";

/** The twin world as the bench builds it (its director, its place). */
export type TwinWorld = ReturnType<typeof buildBenchWorld>;

/** The provenance a twin's restating rows carry, so a reader can tell them from the world's own. */
export const NULL_BILL = "dev-mode-null-bill";
// The businesses the check lists (a list length, not a model value).
const MOVED_SHOWN = 40;

export interface IndustryMove {
  kindId: string;
  /** The industry's name in the business books ("Agricultural production"). */
  name: string;
  sector: string | null;
  here: IndustryFigures;
  twin: IndustryFigures;
}

export interface IndustryFigures {
  open: number;
  closed: number;
  staff: number;
  salesMinor: number;
  wagesPaidMinor: number;
  operatingCostsMinor: number;
  outsideCostsMinor: number;
  profitMinor: number;
  cashMinor: number;
  priceIndex: number;
}

export interface BusinessMove {
  organizationId: string;
  /** The business's own name. */
  name: string;
  kindId: string;
  here: BusinessFigures | null;
  twin: BusinessFigures | null;
}

export type BusinessFigures = Pick<
  IndustryBusiness,
  | "staff"
  | "salesMinor"
  | "wagesPaidMinor"
  | "profitMinor"
  | "cashMinor"
  | "priceIndex"
  | "closedAt"
>;

export interface IndustriesCheck {
  seed: string;
  placeKey: string;
  from: string;
  to: string;
  /** What the twin was given: a restating row on each day this world gained a law, or one opening law set aside. */
  baseline:
    | { kind: "null-bill"; restated: readonly RestatedRow[] }
    | {
        kind: "opening-law";
        series: string;
        level: string;
        restated: readonly RestatedRow[];
      };
  /** What dev mode did in this world, by control (the twin got only its do-nothing bills). */
  changes: readonly { control: string; count: number }[];
  industries: readonly IndustryMove[];
  /** The businesses whose staff, sales or cash differ most, open, closed or only in one world. */
  businesses: readonly BusinessMove[];
  businessesMoved: number;
  twinMs: number;
}

export interface RestatedRow {
  /** This world's row the twin's row stands beside. */
  lawId: string;
  series: string;
  level: string;
  effectiveDate: string;
  /** The twin's row, or why it has none. */
  twinLawId: string | null;
  why?: "no-row-at-level";
}

function lawRows(api: CoreAPI): LawRowInput[] {
  return api.state.modules.has(LAWS_MODULE_ID)
    ? (api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[])
    : [];
}

/** Restate the law in force at this row's level and series on its date, changing no value. */
function restate(
  api: CoreAPI,
  row: LawRowInput,
  measureId: string,
): RestatedRow {
  const at = lawInForce(api, row.series).levels.find(
    (l) => l.level === row.level && l.row,
  )?.row;
  const out = {
    lawId: row.id,
    series: row.series,
    level: row.level,
    effectiveDate: row.effectiveDate,
  };
  if (!at) return { ...out, twinLawId: null, why: "no-row-at-level" };
  const made = enactLaw(api, {
    jurisdiction: at.jurisdiction,
    level: at.level,
    series: at.series,
    value: at.value ?? 0,
    ...(at.unit ? { unit: at.unit } : {}),
    effectiveDate: row.effectiveDate,
    measureId,
    citation: NULL_BILL,
    terms: { provenance: NULL_BILL, restates: at.id },
  });
  return { ...out, twinLawId: made.id };
}

function figures(row: IndustryRow): IndustryFigures {
  return {
    open: row.open,
    closed: row.closed,
    staff: row.staff,
    salesMinor: row.salesMinor,
    wagesPaidMinor: row.wagesPaidMinor,
    operatingCostsMinor: row.operatingCostsMinor,
    outsideCostsMinor: row.outsideCostsMinor,
    profitMinor: row.profitMinor,
    cashMinor: row.cashMinor,
    priceIndex: row.priceIndex,
  };
}

const NO_FIGURES: IndustryFigures = {
  open: 0,
  closed: 0,
  staff: 0,
  salesMinor: 0,
  wagesPaidMinor: 0,
  operatingCostsMinor: 0,
  outsideCostsMinor: 0,
  profitMinor: 0,
  cashMinor: 0,
  priceIndex: 1,
};

function businessFigures(row: IndustryBusiness): BusinessFigures {
  return {
    staff: row.staff,
    salesMinor: row.salesMinor,
    wagesPaidMinor: row.wagesPaidMinor,
    profitMinor: row.profitMinor,
    cashMinor: row.cashMinor,
    priceIndex: row.priceIndex,
    ...(row.closedAt ? { closedAt: row.closedAt } : {}),
  };
}

/** The industry's name in the business books, else its kind. */
function industryName(kindId: string): string {
  return (
    DEFAULT_BUSINESS_BOOKS_DATA.kinds.find((kind) => kind.id === kindId)
      ?.industry ?? kindId
  );
}

/** Two tallies matched by kind and by business: the one count, read twice. */
export function compareTallies(
  here: IndustryTally,
  twin: IndustryTally,
  nameOf: (organizationId: string) => string = (id) => id,
): Pick<IndustriesCheck, "industries" | "businesses" | "businessesMoved"> {
  const kinds = new Map<string, { here?: IndustryRow; twin?: IndustryRow }>();
  for (const row of here.industries)
    kinds.set(row.kindId, { ...kinds.get(row.kindId), here: row });
  for (const row of twin.industries)
    kinds.set(row.kindId, { ...kinds.get(row.kindId), twin: row });
  const industries = [...kinds.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kindId, pair]) => ({
      kindId,
      name: industryName(kindId),
      sector: (pair.here ?? pair.twin)!.sector,
      here: pair.here ? figures(pair.here) : NO_FIGURES,
      twin: pair.twin ? figures(pair.twin) : NO_FIGURES,
    }));
  const firms = new Map<
    string,
    { kindId: string; here?: IndustryBusiness; twin?: IndustryBusiness }
  >();
  for (const [side, tally] of [
    ["here", here],
    ["twin", twin],
  ] as const)
    for (const row of tally.industries)
      for (const firm of row.businesses)
        firms.set(firm.organizationId, {
          kindId: row.kindId,
          ...firms.get(firm.organizationId),
          [side]: firm,
        });
  const moved = [...firms.entries()]
    .map(([organizationId, pair]) => ({
      organizationId,
      name: nameOf(organizationId),
      kindId: pair.kindId,
      here: pair.here ? businessFigures(pair.here) : null,
      twin: pair.twin ? businessFigures(pair.twin) : null,
    }))
    .filter(
      (row) =>
        !row.here ||
        !row.twin ||
        row.here.staff !== row.twin.staff ||
        row.here.salesMinor !== row.twin.salesMinor ||
        row.here.cashMinor !== row.twin.cashMinor ||
        (row.here.closedAt ?? "") !== (row.twin.closedAt ?? ""),
    );
  // The largest moves first: a business in one world only, then a closing, then cash and sales.
  const weight = (row: BusinessMove) =>
    !row.here || !row.twin
      ? Number.MAX_SAFE_INTEGER
      : (row.here.closedAt ?? "") !== (row.twin.closedAt ?? "")
        ? Number.MAX_SAFE_INTEGER - 1
        : Math.abs(row.here.cashMinor - row.twin.cashMinor) +
          Math.abs(row.here.salesMinor - row.twin.salesMinor);
  moved.sort(
    (a, b) =>
      weight(b) - weight(a) || a.organizationId.localeCompare(b.organizationId),
  );
  return {
    industries,
    businesses: moved.slice(0, MOVED_SHOWN),
    businessesMoved: moved.length,
  };
}

/**
 * Run the twin to `date`, giving it on each day the rows `due` names for that
 * day. Days are walked one at a time only up to the last due day; after that
 * the core runs to the date in one call.
 */
function runTwin(
  twin: CoreState,
  date: string,
  due: Map<string, readonly ((api: CoreAPI) => void)[]>,
) {
  for (const day of [...due.keys()].sort()) {
    if (day > date) break;
    if (twin.date < day) advanceCore(twin, makeIsoDate(day));
    for (const step of due.get(day)!) step(coreAPI(twin));
  }
  if (twin.date < date) advanceCore(twin, makeIsoDate(date));
}

function changesOf(marks: readonly DevMarkRow[]) {
  return [...new Set(marks.map((m) => m.control))].sort().map((control) => ({
    control,
    count: marks.filter((m) => m.control === control).length,
  }));
}

function twinOf(core: CoreState) {
  const recipe = buildRecipeOf(core);
  if (!recipe)
    throw new Error(
      "This world was not built in this session, so it has no recipe to build a twin from.",
    );
  const built = buildBenchWorld(recipe.seed, recipe.date, recipe.options);
  return { recipe, twin: built.core, built };
}

function townOf(core: CoreState): string {
  return core.modules.has(LAWS_MODULE_ID)
    ? lawChain(coreAPI(core)).townPlaceId
    : "";
}

/** What dev mode did in this world, read from its own marks. */
export interface DevMarkRow {
  readonly date: string;
  readonly control: string;
  readonly recordIds: readonly string[];
  readonly facts: Readonly<Record<string, string>>;
}

/** The few DevMode calls the twin needs, on the twin's own DevMode (dev-mode.ts builds it). */
export interface TwinDev {
  decideAt(
    billId: string,
    margin: number | undefined,
    options: {
      votes?: Readonly<Record<string, "yes" | "no" | "abstain">>;
      sign?: boolean;
      overrideMargin?: number;
      discharge?: boolean;
      chairHears?: boolean;
    },
  ): unknown;
}

/** The section that changes nothing: the same subject at what is in force there today. */
function doNothing(api: CoreAPI, bodyLevel: string, p: Provision): Provision {
  if (p.kind === "budget-line") return { ...p, value: 0 };
  const series = (p.kind === "policy-question" ? p.question : p.series)!;
  const answer = lawInForce(api, series);
  const held =
    answer.levels.find((l) => l.level === bodyLevel && l.row)?.row?.value ??
    answer.value;
  if (p.kind === "policy-question")
    return {
      kind: "policy-question",
      question: series,
      value: (held ?? 0) > 0 ? 1 : -1,
    };
  return {
    kind: "law-amount",
    series,
    value: held ?? 0,
    ...(p.unit ? { unit: p.unit } : {}),
  };
}

function billsOf(api: CoreAPI): BillRow[] {
  return api.state.modules.has(LEGISLATURE_MODULE_ID)
    ? (api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[])
    : [];
}

/**
 * The twin's schedule: on each day this world drafted a bill dev mode or the
 * player brought, the twin drafts one at the same body by the same sponsor
 * whose every section restates what is in force; on each day dev mode
 * decided one, the twin's is decided the same way (the margin, votes,
 * signature and override the mark records, and the chair's hearing and
 * discharge as this world's committees recorded them). On each day dev mode
 * set a law with no bill, the twin restates the law in force at that level.
 */
function nullBillSchedule(
  core: CoreState,
  marks: readonly DevMarkRow[],
  twinDev: () => TwinDev,
  from: string,
  restated: RestatedRow[],
) {
  const api = coreAPI(core);
  const due = new Map<string, ((api: CoreAPI) => void)[]>();
  const at = (day: string, step: (api: CoreAPI) => void) =>
    due.set(day, [...(due.get(day) ?? []), step]);
  const brought = new Set<string>();
  for (const mark of marks)
    if (mark.control === "introduce" || mark.control === "decide")
      brought.add(mark.facts.billId ?? mark.recordIds[0] ?? "");
  const bills = billsOf(api).filter(
    (bill) =>
      bill.introduced >= from &&
      (brought.has(bill.id) ||
        (core.playerId !== undefined && bill.sponsorId === core.playerId)),
  );
  // This world's bill id to the twin's, filled in as the twin drafts them.
  const twinBill = new Map<string, string>();
  for (const bill of bills)
    at(bill.introduced, (twinApi) => {
      const kind = bodyOf(twinApi, bill.bodyOfficeId)?.kind;
      const level = (kind && bodyRow(kind)?.level) ?? "";
      const made = draftBill(twinApi, {
        bodyOfficeId: bill.bodyOfficeId,
        sponsorId: bill.sponsorId,
        provisions: bill.provisions.map((p) => doNothing(twinApi, level, p)),
      });
      twinBill.set(bill.id, made.id);
      restated.push({
        lawId: bill.id,
        series: bill.number,
        level,
        effectiveDate: bill.introduced,
        twinLawId: made.id,
      });
    });
  for (const mark of marks) {
    if (mark.control === "decide") {
      const billId = mark.facts.billId ?? "";
      const committees = committeeRecords(api, billId);
      at(mark.date, () => {
        const twinId = twinBill.get(billId);
        if (!twinId) return;
        const votes = mark.facts.votes
          ? Object.fromEntries(
              mark.facts.votes.split(",").map((pair) => {
                const cut = pair.lastIndexOf(":");
                return [pair.slice(0, cut), pair.slice(cut + 1)];
              }),
            )
          : undefined;
        twinDev().decideAt(
          twinId,
          mark.facts.margin !== undefined
            ? Number(mark.facts.margin)
            : undefined,
          {
            ...(votes ? { votes } : {}),
            ...(mark.facts.sign !== undefined
              ? { sign: mark.facts.sign === "true" }
              : {}),
            ...(mark.facts.overrideMargin !== undefined
              ? { overrideMargin: Number(mark.facts.overrideMargin) }
              : {}),
            ...(committees.some((c) => c.chairPicked === true)
              ? { chairHears: true }
              : {}),
            ...(committees.some((c) => c.discharge?.discharged)
              ? { discharge: true }
              : {}),
          },
        );
      });
    }
    if (mark.control === "law")
      for (const lawId of mark.recordIds) {
        const row = lawRows(api).find((r) => r.id === lawId);
        if (row)
          at(mark.date, (twinApi) =>
            restated.push(restate(twinApi, row, `${NULL_BILL}-${lawId}`)),
          );
      }
  }
  return due;
}

/**
 * This world against the same world given a bill that changes nothing: a
 * bill passed in this world is a do-nothing bill passed the same way in the
 * twin, so the bill's own hearings, debates and news count on both sides and
 * only what the law changes is left.
 */
export function industriesAgainstNullBill(
  core: CoreState,
  marks: readonly DevMarkRow[],
  makeTwinDev: (twin: CoreState, built: TwinWorld) => TwinDev,
): IndustriesCheck {
  const started = Date.now();
  const { recipe, twin, built } = twinOf(core);
  let dev: TwinDev | undefined;
  const restated: RestatedRow[] = [];
  const due = nullBillSchedule(
    core,
    marks,
    () => (dev ??= makeTwinDev(twin, built)),
    recipe.date,
    restated,
  );
  runTwin(twin, core.date, due);
  return {
    seed: recipe.seed,
    placeKey: recipe.options.placeKey ?? "",
    from: recipe.date,
    to: core.date,
    baseline: { kind: "null-bill", restated },
    changes: changesOf(marks),
    ...compareTallies(
      industryTally(coreAPI(core), townOf(core)),
      industryTally(coreAPI(twin), townOf(twin)),
      (id) => organizationName(core, id) ?? organizationName(twin, id) ?? "",
    ),
    twinMs: Date.now() - started,
  };
}

/**
 * What a law the town opened with is doing: this world against the same
 * world with that law set aside the day after the opening, and given the
 * same do-nothing bills for whatever was passed here since, so a law passed
 * in play does not count toward the opening law.
 */
export function industriesWithoutOpeningLaw(
  core: CoreState,
  marks: readonly DevMarkRow[],
  makeTwinDev: (twin: CoreState, built: TwinWorld) => TwinDev,
  input: { readonly series: string; readonly level: string },
): IndustriesCheck {
  const started = Date.now();
  const { recipe, twin, built } = twinOf(core);
  const twinApi = coreAPI(twin);
  const held = lawInForce(twinApi, input.series).levels.find(
    (l) => l.level === input.level && l.row,
  )?.row;
  if (!held)
    throw new Error(
      `The town opened with no ${input.level} law on ${input.series}.`,
    );
  // A row on the opening day itself would sit beside that day's starting row.
  const setAside = enactLaw(twinApi, {
    jurisdiction: held.jurisdiction,
    level: held.level,
    series: held.series,
    value: 0,
    ...(held.unit ? { unit: held.unit } : {}),
    effectiveDate: addDays(makeIsoDate(recipe.date), 1),
    measureId: `${NULL_BILL}-opening`,
    citation: NULL_BILL,
    terms: { provenance: NULL_BILL, repeal: true, setsAside: held.id },
  });
  let dev: TwinDev | undefined;
  const restated: RestatedRow[] = [
    {
      lawId: held.id,
      series: held.series,
      level: held.level,
      effectiveDate: setAside.effectiveDate,
      twinLawId: setAside.id,
    },
  ];
  const due = nullBillSchedule(
    core,
    marks,
    () => (dev ??= makeTwinDev(twin, built)),
    recipe.date,
    restated,
  );
  runTwin(twin, core.date, due);
  return {
    seed: recipe.seed,
    placeKey: recipe.options.placeKey ?? "",
    from: recipe.date,
    to: core.date,
    baseline: {
      kind: "opening-law",
      series: input.series,
      level: input.level,
      restated,
    },
    changes: changesOf(marks),
    ...compareTallies(
      industryTally(coreAPI(core), townOf(core)),
      industryTally(twinApi, townOf(twin)),
      (id) => organizationName(core, id) ?? organizationName(twin, id) ?? "",
    ),
    twinMs: Date.now() - started,
  };
}
