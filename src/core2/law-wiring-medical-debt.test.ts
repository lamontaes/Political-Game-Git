/**
 * Medical bills and medical debt in a played world (world-medical-spending-
 * categories, health-medical-debt-record): a place drawn from all 56 on a
 * seed nobody chose, the bench world with every module installed, built
 * twice from the same seed. In one the Medicaid expansion is in force at
 * every level of the town's chain; in its twin it is repealed. Each month the
 * coverage engine bills every household of the places whose money the world
 * keeps by its members' coverage and health records, and the household pays
 * from what it holds; a bill unpaid past the 120-day wait goes to collections
 * as a medical-debt record on the household's books.
 *
 * (a) In the drawn town, a household whose member has a serious illness under
 *     way (a health case with an onset event, care need one) pays more for
 *     the month than a healthy household of the same size and plans, both
 *     paid in full by journal entries; members covered by a plan are billed
 *     less than uncovered ones; and every payment is a balanced journal entry
 *     from the household's members' main accounts to the main account of the
 *     medical seller its row names, one of the town's when it has any.
 * (b) A named low-income household carries a smaller medical-debt record
 *     with the expansion than in its twin, where the twin never held the
 *     expansion in the played window: in a month when a member held Medicaid
 *     coverage in the expansion world (their own coverage records, by person
 *     id) and none in the twin, its bill was lower, and the place-level
 *     expansion row was left out of its collections share. The law reach pays
 *     the adult nothing for the coverage, so the bill is the expansion's one
 *     path into the household's money; Medicaid's own part of the care is
 *     paid to the household's seller by the treasuries that day, by journal
 *     entry. A counted household in the town is priced at Medicaid's share the
 *     same way, by its members' own coverage records.
 *
 * Each part is read in the first drawn place that can show it (a full town
 * household with a serious illness under way is rare, and a twin's own
 * lawmakers may enact the expansion again); a place that cannot is passed
 * over with its reason, and the next is drawn.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coverageSpellsNow, spellOn } from "./health-own";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  FEDERAL_MEDICAID_LINE,
  governmentAt,
  STATE_MEDICAID_LINE,
  type CoverageSpell,
} from "./law-reach/group-b-money";
import type { TreasuryMonthRow } from "./budgets-treasury";
import { advanceCore } from "./life";
import type { MedicalBillRow } from "./medical-bills";
import { BUDGETS_MODULE_ID, outsideAccountOf } from "./modules/budgets";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { medicalDebtOf } from "./modules/credit";
import { healthReport } from "./modules/health";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { WEB_LINKS } from "./outcome-web-model";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import bills from "./data/health/medical-bills.json" with { type: "json" };

const SEED = process.env.MEDICAL_DEBT_SEED ?? randomBytes(20).toString("hex");
const EXPAND =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const TWIN_LINK = "medicaid-expansion-to-medical-debt";
/** Months played: the first unpaid bills pass the 120-day wait in the fifth. */
const MONTHS = 8;
const TRIES = 10;

/** The close's per-payee rounding on a line, far below a month's care. */
const CENT_ROUNDING = 100;

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);

/** The expansion's rows at each level of the town's chain, oldest first. */
function expansionRows(api: CoreAPI) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.map(({ level, jurisdiction }) => ({
    level,
    jurisdiction,
    rows: [
      ...(laws.query("bySeries", [
        jurisdiction,
        EXPAND,
      ]) as unknown as LawRowInput[]),
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
  }));
}

/** Each level of the town's chain whose latest row, whatever its date, says yes. */
function levelsHoldingYes(api: CoreAPI) {
  return expansionRows(api).flatMap(({ level, jurisdiction, rows }) => {
    const latest = rows.at(-1);
    return latest?.value === 1
      ? [{ level, jurisdiction, effectiveDate: latest.effectiveDate }]
      : [];
  });
}

/**
 * The expansion's rows in force on some day of [from, to] that say yes, at
 * any level of the chain: the row in force on `from` and every row taking
 * effect after it, up to `to`.
 */
function heldYes(api: CoreAPI, from: string, to: string): LawRowInput[] {
  return expansionRows(api).flatMap(({ rows }) => {
    const before = rows.filter((r) => r.effectiveDate <= from).at(-1);
    const during = rows.filter(
      (r) => r.effectiveDate > from && r.effectiveDate <= to,
    );
    return [...(before ? [before] : []), ...during].filter(
      (r) => r.value === 1,
    );
  });
}

/** The expansion in force from tomorrow at the state (else the nearest level that may hold it). */
function enact(api: CoreAPI): string {
  if (levelsHoldingYes(api).length) return "already in force";
  for (const level of ["state", "city", "county", "federal"] as const) {
    const at = lawChain(api).levels.find((l) => l.level === level);
    if (!at) continue;
    return enactLaw(api, {
      jurisdiction: at.jurisdiction,
      level,
      series: EXPAND,
      value: 1,
      effectiveDate: tomorrow(api),
      measureId: "medical-debt-test-enact",
      citation: "Medical debt test: the expansion enacted",
    }).id;
  }
  throw new Error("no level of the chain can enact the expansion");
}

/**
 * The expansion repealed at every level that holds it, now or by a bill
 * already passed: the repeal rows, and the last day one takes effect.
 */
function repeal(api: CoreAPI): { ids: string[]; lastDay: string } {
  let lastDay: string = tomorrow(api);
  const ids = levelsHoldingYes(api).map(
    ({ level, jurisdiction, effectiveDate }) => {
      const day =
        effectiveDate > api.state.date
          ? addDays(makeIsoDate(effectiveDate), 1)
          : tomorrow(api);
      if (day > lastDay) lastDay = day;
      return enactLaw(api, {
        jurisdiction,
        level,
        series: EXPAND,
        value: 0,
        effectiveDate: day,
        measureId: "medical-debt-test-repeal",
        citation: "Medical debt test: the expansion repealed in the twin",
      }).id;
    },
  );
  return { ids, lastDay };
}

const billsOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(COVERAGE_MODULE_ID)
    .table("medicalBills")
    .rows() as unknown as MedicalBillRow[];

/** The town's sellers of medical care, as the bills choose among them. */
function townSellers(api: CoreAPI, town: string): Set<string> {
  const core = api.state as CoreState;
  const kinds = new Set(bills.medicalSellerClassifications);
  return new Set(
    [...core.organizations.values()]
      .filter(
        (org) =>
          org.placeId === town &&
          kinds.has(org.classification ?? "") &&
          !core.finance.businesses.get(org.id)?.closedAt &&
          core.cashJournal.residualAccountByOwner.has(org.id),
      )
      .map((org) => org.id),
  );
}

/**
 * Each journal entry the bills posted, by world and journal id: what its
 * lines sum to, and the lines of a full household's payment (a counted
 * place's entry has a line for every group, so only its sum is kept).
 */
const posted = new Map<
  string,
  {
    source: string;
    sum: number;
    lines?: { accountId: string; deltaMinor: number }[];
  }
>();
/** The world being played, so the two worlds' journal ids do not collide. */
let playing = "";
/** The treasuries' payments of Medicaid's part of the care, by world: the day, the entry and the account paid. */
const medicaidCare: {
  world: string;
  date: string;
  id: string;
  source: string;
  to: string;
  minor: number;
}[] = [];

/**
 * Every bill row of each month as it stood after the 1st (full and counted),
 * with the health cases under way that day (their onset event, by billed day
 * and person); each full household's payment in the drawn town is read
 * against the journal the month it was made, while its members and seller
 * still stand.
 */
function play(
  core: CoreState,
  where: string,
): {
  rows: MedicalBillRow[];
  outside: MedicalBillRow | null;
  onsets: Map<string, string>;
  checked: number;
  /** Each seller's day of Medicaid care (the town's sellers and the outside account), as the treasuries paid it, by seller and day. */
  care: Map<string, SellerCare>;
  /** The town's employer policyholders after each month's review (full and counted records), by billed day. */
  employerPlans: Map<string, number>;
} {
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const rows: MedicalBillRow[] = [];
  let outside: MedicalBillRow | null = null;
  const onsets = new Map<string, string>();
  const care = new Map<string, SellerCare>();
  const employerPlans = new Map<string, number>();
  let checked = 0;
  for (let month = 0; month < MONTHS; month += 1) {
    const day = makeIsoDate(core.date);
    const next = addDays(makeIsoDate(`${day.slice(0, 7)}-02`), 31);
    advanceCore(core, makeIsoDate(`${next.slice(0, 7)}-02`));
    const billed = `${core.date.slice(0, 7)}-01`;
    const thisMonth = billsOf(core).filter((row) => row.date === billed);
    employerPlans.set(billed, employerPolicyholders(api, town));
    // The town's rows are kept (two worlds' every household-month do not
    // fit the heap), and one row elsewhere that reads the place row.
    rows.push(...thisMonth.filter((row) => row.placeId === town));
    outside ??=
      thisMonth.find(
        (row) => row.placeId !== town && row.webLinks.includes(TWIN_LINK),
      ) ?? null;
    for (const c of healthReport(core).cases)
      if (c.onsetEventId) onsets.set(`${billed}|${c.personId}`, c.onsetEventId);
    const sellers = townSellers(api, town);
    const outsideAccount = outsideAccountOf(api);
    // Medicaid's part of the care, by seller (each town seller, and the
    // outside account where a household has no seller in its place): what
    // the treasuries paid each that day is the sum of round(medicaidMinor x
    // weight) over the households that pay it, and the federal leg is that
    // sum at the match in force, paid in full.
    const match = lawInForce(api, "medicaid-match");
    const share = governmentAt(api, "federal")
      ? Math.min(1, Math.max(0, (match.value ?? 0) / 100))
      : 0;
    const owedBySeller = new Map<string, { minor: number; rows: string[] }>();
    for (const row of thisMonth) {
      if (!row.sellerId) continue;
      const minor = Math.round(
        row.members.reduce((n, m) => n + (m.medicaidMinor ?? 0), 0) *
          row.weight,
      );
      if (minor <= 0) continue;
      const owed = owedBySeller.get(row.sellerId) ?? { minor: 0, rows: [] };
      owed.minor += minor;
      owed.rows.push(row.id);
      owedBySeller.set(row.sellerId, owed);
    }
    for (const sellerId of new Set([
      ...sellers,
      ...owedBySeller.keys(),
      ...(outsideAccount ? [outsideAccount] : []),
    ])) {
      const account = api.accounts().main(sellerId);
      const paid = medicaidCare.filter(
        (p) => p.world === playing && p.date === billed && p.to === account,
      );
      const owed = owedBySeller.get(sellerId) ?? { minor: 0, rows: [] };
      const federal = paid
        .filter((p) => p.source.includes("+medicaid-match"))
        .reduce((n, p) => n + p.minor, 0);
      const total = paid.reduce((n, p) => n + p.minor, 0);
      const at = `${where}: ${sellerId} on ${billed}`;
      expect(
        total,
        `${at}: Medicaid's part of ${owed.rows.length} households' care`,
      ).toBe(owed.minor);
      expect(
        federal,
        `${at}: the federal leg at the match ${match.value} (${match.governing?.id})`,
      ).toBe(Math.round(owed.minor * share));
      if (owed.minor > 0)
        care.set(`${sellerId}|${billed}`, {
          minor: owed.minor,
          federal,
          match: match.value ?? 0,
          matchLawId: match.governing?.id ?? null,
          households: owed.rows.length,
          journalIds: paid.map((p) => p.id),
        });
    }
    // The month closes before the bills (the module calendar runs before
    // the modules' days), so the care paid on the 1st is noted since that
    // close: the federal leg on the federal health line and never on a
    // welfare and Medicaid line, which the federal budget lacks; the whole
    // care on the state's welfare and Medicaid line.
    const paidToday = medicaidCare.filter(
      (p) => p.world === playing && p.date === billed,
    );
    const federalToday = paidToday
      .filter((p) => p.source.includes("+medicaid-match"))
      .reduce((n, p) => n + p.minor, 0);
    const careToday = paidToday.reduce((n, p) => n + p.minor, 0);
    const sinceClose = (id: string) =>
      (
        api.moduleState(BUDGETS_MODULE_ID).table("sinceClose").get(id) as
          { lines: Record<string, number> } | undefined
      )?.lines ?? {};
    const federalGov = governmentAt(api, "federal");
    const stateGov = governmentAt(api, "state");
    if (federalGov) {
      const lines = sinceClose(federalGov.id);
      expect(
        lines[STATE_MEDICAID_LINE],
        `${where}: ${federalGov.id} notes no ${STATE_MEDICAID_LINE} line since the close of ${billed}`,
      ).toBeUndefined();
      expect(
        lines[FEDERAL_MEDICAID_LINE] ?? 0,
        `${where}: ${federalGov.id} ${FEDERAL_MEDICAID_LINE} since the close of ${billed} holds the federal legs`,
      ).toBeGreaterThanOrEqual(federalToday);
    }
    if (stateGov)
      expect(
        sinceClose(stateGov.id)[STATE_MEDICAID_LINE] ?? 0,
        `${where}: ${stateGov.id} ${STATE_MEDICAID_LINE} since the close of ${billed} holds the care`,
      ).toBeGreaterThanOrEqual(careToday);
    for (const row of thisMonth) {
      if (row.counted || row.placeId !== town || row.paidMinor <= 0) continue;
      const at = `${where}: ${row.id} on ${row.date}`;
      expect(row.journalIds.length, at).toBeGreaterThan(0);
      // The household's own seller: the town's, where it has one, else the
      // outside account.
      expect(
        sellers.size
          ? sellers.has(row.sellerId ?? "")
          : row.sellerId === outsideAccount,
        `${at}: seller ${row.sellerId} (the town's: ${[...sellers].join(", ") || "none"})`,
      ).toBe(true);
      const sellerAccount = api.accounts().main(row.sellerId!);
      const memberAccounts = new Set(
        row.members.map((m) =>
          core.cashJournal.residualAccountByOwner.get(m.personId),
        ),
      );
      let moved = 0;
      for (const id of row.journalIds) {
        const entry = posted.get(`${playing}|${id}`);
        expect(entry, `${at}: ${id}`).toBeDefined();
        expect(entry!.source, id).toContain(row.householdId);
        expect(entry!.sum, `${at}: ${id} balances`).toBe(0);
        for (const line of entry!.lines!)
          if (line.deltaMinor > 0) {
            expect(line.accountId, `${at}: ${id} pays the seller`).toBe(
              sellerAccount,
            );
            moved += line.deltaMinor;
          } else if (line.deltaMinor < 0)
            expect(
              memberAccounts.has(line.accountId),
              `${at}: ${id} draws on ${line.accountId}, a member's main account`,
            ).toBe(true);
      }
      expect(moved, `${at} paid`).toBe(row.paidMinor);
      checked += 1;
    }
  }
  return { rows, outside, onsets, checked, care, employerPlans };
}

/**
 * The town's employer policyholders as the coverage engine's records hold
 * them now: full policyholders and counted policy records, each counted
 * record by its id.
 */
function employerPolicyholders(api: CoreAPI, town: string): number {
  const core = api.state as CoreState;
  const coverage = api.moduleState(COVERAGE_MODULE_ID);
  const full = (
    coverage.table("coverage").rows() as unknown as {
      personId: string;
      householdId: string;
      plan: string;
      holderId: string | null;
      to: string | null;
    }[]
  ).filter(
    (row) =>
      row.to === null &&
      row.plan === "employer" &&
      row.holderId === row.personId &&
      core.households.get(row.householdId as never)?.placeId === town,
  ).length;
  const counted = (
    coverage.table("countedCoverage").rows() as unknown as {
      placeId: string;
      to: string | null;
    }[]
  ).filter((row) => row.to === null && row.placeId === town).length;
  return full + counted;
}

/** A town seller's day of Medicaid care: what was owed and paid, and the federal leg at the match. */
interface SellerCare {
  readonly minor: number;
  readonly federal: number;
  readonly match: number;
  readonly matchLawId: string | null;
  readonly households: number;
  readonly journalIds: readonly string[];
}

/**
 * The care inside the treasuries' lines over the played window: the federal
 * leg counts against the federal health line and the whole care against the
 * state's welfare and Medicaid line (months closed and what is noted since
 * the last close), and those lines were paid within their dues, so the care
 * was paid within each line's total, not on top of it. (Each month's read in
 * play() checks the federal leg never lands on a welfare and Medicaid line,
 * which the federal budget lacks; the federal month's welfare line holds the
 * SNAP benefits the law reach counts there, pool item
 * laws-federal-benefits-on-a-line-the-federal-budget-lacks.)
 */
function careInsideLines(
  api: CoreAPI,
  where: string,
  legs: { federal: number; total: number },
): string {
  const federal = governmentAt(api, "federal");
  const state = governmentAt(api, "state");
  // With no state treasury, Medicaid's part is paid by no one (payMedicaidCare).
  if (!state) {
    expect(legs.total, `${where}: no state treasury`).toBe(0);
    return "no state treasury, so no Medicaid care paid";
  }
  const budgets = api.moduleState(BUDGETS_MODULE_ID);
  const months = budgets
    .table("treasuryMonths")
    .rows() as unknown as TreasuryMonthRow[];
  const since = (id: string, line: string) =>
    (
      budgets.table("sinceClose").get(id) as unknown as
        { lines: Record<string, number> } | undefined
    )?.lines[line] ?? 0;
  const inTown = (id: string, line: string) =>
    months
      .filter((m) => m.governmentId === id)
      .reduce((n, m) => n + (m.lines[line]?.inTownMinor ?? 0), 0) +
    since(id, line);
  for (const m of months.filter(
    (row) => row.governmentId === state.id || row.governmentId === federal?.id,
  )) {
    // The line that carries the care is paid within its due: the care
    // in town is part of the line's total, not paid on top of it.
    const line =
      m.governmentId === federal?.id
        ? FEDERAL_MEDICAID_LINE
        : STATE_MEDICAID_LINE;
    const row = m.lines[line];
    if (row)
      expect(
        row.inTownMinor + row.aidMinor + row.providersMinor + row.outsideMinor,
        `${where}: ${m.id} ${line} paid within its due ${row.dueMinor}`,
      ).toBeLessThanOrEqual(row.dueMinor + CENT_ROUNDING);
  }
  const federalHealth = federal ? inTown(federal.id, FEDERAL_MEDICAID_LINE) : 0;
  const stateWelfare = inTown(state.id, STATE_MEDICAID_LINE);
  expect(
    federalHealth,
    `${where}: federal ${FEDERAL_MEDICAID_LINE} in town`,
  ).toBeGreaterThanOrEqual(legs.federal);
  expect(
    stateWelfare,
    `${where}: state ${STATE_MEDICAID_LINE} in town`,
  ).toBeGreaterThanOrEqual(legs.total);
  return `the federal legs ${legs.federal} inside the federal ${FEDERAL_MEDICAID_LINE} line's in-town ${federalHealth}, the care ${legs.total} inside the state ${STATE_MEDICAID_LINE} line's in-town ${stateWelfare}, ${months.filter((m) => m.governmentId === state.id || m.governmentId === federal?.id).length} treasury months each paying those lines within their dues`;
}

/** The sorted plans of a row's members, for comparing like households. */
const plansOf = (row: MedicalBillRow) =>
  row.members
    .map((m) => m.plan)
    .sort()
    .join(",");

describe("medical bills and medical debt in a played world", () => {
  it("the expansion's medical-debt link is researched and runs from the law", () => {
    const row = WEB_LINKS.find((link) => link.key === TWIN_LINK)!;
    expect(row.from).toBe(`law:${EXPAND}`);
    expect(row.to).toBe("finance.medical-debt-in-collections");
    expect(row.size).toBeLessThan(0);
  });

  it(
    `bills follow coverage and health, and the expansion shrinks a low-income household's medical debt (MEDICAL_DEBT_SEED=${SEED})`,
    { timeout: 3_600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      setJournalTrace((input) => {
        if (input.sourceRef.id.startsWith("reach-b:medicaid-care:"))
          for (const p of input.postings)
            if (p.deltaMinor > 0)
              medicaidCare.push({
                world: playing,
                date: input.date,
                id: input.id,
                source: input.sourceRef.id,
                to: p.accountId,
                minor: p.deltaMinor,
              });
        if (!input.sourceRef.id.startsWith("medical:")) return;
        const counted = input.sourceRef.id.startsWith("medical:counted:");
        posted.set(`${playing}|${input.id}`, {
          source: input.sourceRef.id,
          sum: input.postings.reduce((n, p) => n + p.deltaMinor, 0),
          ...(counted
            ? {}
            : {
                lines: input.postings.map((p) => ({
                  accountId: p.accountId,
                  deltaMinor: p.deltaMinor,
                })),
              }),
        });
      });
      const passed: string[] = [];
      // Each part takes the first drawn place that can show it.
      let proofA: string | null = null;
      let proofB: string | null = null;
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(SEED, `law-wiring-medical-debt:${attempt}`);
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          // One world at a time, keeping only what the checks read, so the
          // two worlds are never held at once.
          posted.clear();
          medicaidCare.length = 0;
          let town = "";
          const where = () =>
            `${drawn.name}, ${drawn.state} (${drawn.key}, town ${town}), world seed ${drawn.seed}`;
          const run = (world: "expanded" | "twin") => {
            const core = build();
            const api = coreAPI(core);
            town = lawChain(api).townPlaceId;
            const start = api.state.date;
            const repealed = world === "twin" ? repeal(api) : null;
            const change =
              world === "expanded" ? enact(api) : repealed!.ids.join(", ");
            playing = world;
            const played = play(core, where());
            const end = api.state.date;
            // The twin's own lawmakers may enact the expansion again in the
            // window: its law rows say whether it ever held it.
            const held = repealed
              ? heldYes(api, repealed.lastDay, end).map(
                  (r) => `${r.id} from ${r.effectiveDate}`,
                )
              : [];
            const debts = new Map(
              [...core.households.keys()].map((id) => [
                id,
                medicalDebtOf(api, id),
              ]),
            );
            // The billed residents' own coverage stretches, by person id.
            const spells = new Map<string, readonly CoverageSpell[]>();
            const stretches = coverageSpellsNow(api);
            for (const row of played.rows)
              for (const m of row.members) {
                const list = stretches?.get(m.personId);
                if (list) spells.set(m.personId, list);
              }
            // The account of the seller each town row paid, to read the
            // treasuries' payments of Medicaid's part against.
            const sellerAccounts = new Map(
              played.rows
                .filter((row) => row.sellerId)
                .map((row) => [
                  `${row.id}|${row.date}`,
                  api.accounts().main(row.sellerId!),
                ]),
            );
            // Every Medicaid-care payment of the world, inside the lines.
            const legs = medicaidCare.filter((p) => p.world === world);
            const lines = careInsideLines(api, where(), {
              federal: legs
                .filter((p) => p.source.includes("+medicaid-match"))
                .reduce((n, p) => n + p.minor, 0),
              total: legs.reduce((n, p) => n + p.minor, 0),
            });
            return {
              ...played,
              change,
              debts,
              held,
              spells,
              start,
              end,
              sellerAccounts,
              lines,
            };
          };
          const withExpansion = run("expanded");
          const inTwin = run("twin");
          const worldOf = new Map<MedicalBillRow, "expanded" | "twin">([
            ...withExpansion.rows.map((row) => [row, "expanded"] as const),
            ...inTwin.rows.map((row) => [row, "twin"] as const),
          ]);
          const onsetOf = (row: MedicalBillRow, personId: string) =>
            (worldOf.get(row) === "expanded"
              ? withExpansion.onsets
              : inTwin.onsets
            ).get(`${row.date}|${personId}`);
          const all = [...withExpansion.rows, ...inTwin.rows];
          const full = all.filter(
            (row) => !row.counted && row.placeId === town,
          );

          const partA = (): string | null => {
            // (a) A household with a member whose serious illness is under way
            // (care need one, a health case with an onset event) against a
            // healthy household (every member's care need none) of the same
            // size and plans, the same world and month, both in the drawn
            // town, both owing nothing before and paying the month's bill in
            // full by journal entries.
            const paidInFull = full.filter(
              (row) =>
                row.journalIds.length > 0 &&
                row.askedMinor === row.billMinor &&
                row.paidMinor === row.billMinor &&
                row.paidMinor > 0,
            );
            const likeOf = (row: MedicalBillRow) =>
              `${worldOf.get(row)}|${row.date}|${row.members.length}|${plansOf(row)}`;
            const healthy = new Map<string, MedicalBillRow>();
            for (const row of paidInFull)
              if (
                row.members.every((m) => m.careNeed === 0) &&
                row.billMinor > (healthy.get(likeOf(row))?.billMinor ?? -1)
              )
                healthy.set(likeOf(row), row);
            const illRow = paidInFull.find(
              (row) =>
                healthy.has(likeOf(row)) &&
                row.members.some(
                  (m) => m.careNeed === 1 && onsetOf(row, m.personId),
                ),
            );
            if (!illRow) {
              passed.push(
                `(a) ${where()}: no town household with a serious illness under way paid its month in full beside a healthy household of the same size and plans (${full.filter((row) => row.members.some((m) => m.careNeed === 1)).length} town household-months with one)`,
              );
              return null;
            }
            const ill = illRow.members.find(
              (m) => m.careNeed === 1 && onsetOf(illRow, m.personId),
            )!;
            const well = healthy.get(likeOf(illRow))!;
            expect(
              illRow.paidMinor,
              `${where()}: ${illRow.id} (${ill.personId} ill) against ${well.id} on ${illRow.date}`,
            ).toBeGreaterThan(well.paidMinor);
            expect(
              withExpansion.checked + inTwin.checked,
              `${where()}: town payments read against the journal`,
            ).toBeGreaterThan(0);
            // Covered members are billed less than uncovered ones, at the same
            // care need, in town households of the same size.
            const memberBills = full.flatMap((row) =>
              row.members
                .filter((m) => m.careNeed === 0)
                .map((m) => ({ ...m, size: row.members.length, row })),
            );
            const pair = (covered: "employer" | "medicaid") => {
              for (const c of memberBills.filter((m) => m.plan === covered)) {
                const u = memberBills.find(
                  (m) =>
                    m.plan === "none" &&
                    m.size === c.size &&
                    worldOf.get(m.row) === worldOf.get(c.row) &&
                    m.row.date === c.row.date,
                );
                if (u) return { c, u };
              }
              return undefined;
            };
            const employer = pair("employer");
            expect(
              employer,
              `${where()}: an employer-covered and an uncovered member`,
            ).toBeDefined();
            expect(employer!.c.billMinor).toBeLessThan(employer!.u.billMinor);
            const medicaid = pair("medicaid");
            if (medicaid)
              expect(medicaid.c.billMinor).toBeLessThan(medicaid.u.billMinor);
            return `(a) ${where()}; ${worldOf.get(illRow)} world, ${illRow.date}: ${illRow.id} paid ${illRow.paidMinor} by ${illRow.journalIds.join(", ")} to ${illRow.sellerId}; its member ${ill.personId} (${ill.plan}, care need ${ill.careNeed}, health case onset ${onsetOf(illRow, ill.personId)}) billed ${ill.billMinor}. Healthy ${well.id} paid ${well.paidMinor} by ${well.journalIds.join(", ")} to ${well.sellerId} (care needs ${well.members.map((m) => m.careNeed).join(", ")}; plans ${plansOf(well)}). Employer member ${employer!.c.personId} ${employer!.c.billMinor} against uncovered ${employer!.u.personId} ${employer!.u.billMinor}${medicaid ? `; Medicaid member ${medicaid.c.personId} ${medicaid.c.billMinor} against uncovered ${medicaid.u.personId} ${medicaid.u.billMinor}` : ""}. ${withExpansion.checked + inTwin.checked} town household payments read line by line (members' main accounts to the seller's); ${posted.size} medical journal entries, each balanced.`;
          };

          const partB = (): string | null => {
            // (b) The twin must not have held the expansion in the window.
            if (inTwin.held.length) {
              passed.push(
                `(b) ${where()}: the twin held the expansion in the played window (${inTwin.held.join("; ")})`,
              );
              return null;
            }
            // A town household's months when, in the expansion world, a member
            // held Medicaid coverage and, in the twin, none did, with every
            // member's care need the same in both and every other member on
            // the same plan, so only the expansion's coverage differs.
            const twinRows = new Map(
              inTwin.rows
                .filter((row) => !row.counted)
                .map((row) => [`${row.householdId}|${row.date}`, row]),
            );
            const months = withExpansion.rows
              .filter(
                (row) =>
                  !row.counted &&
                  row.placeId === town &&
                  row.members.some((m) => m.plan === "medicaid"),
              )
              .flatMap((row) => {
                const twin = twinRows.get(`${row.householdId}|${row.date}`);
                if (!twin || twin.members.some((m) => m.plan === "medicaid"))
                  return [];
                const there = new Map(twin.members.map((m) => [m.personId, m]));
                const same =
                  twin.members.length === row.members.length &&
                  row.members.every(
                    (m) =>
                      there.get(m.personId)?.careNeed === m.careNeed &&
                      (m.plan === "medicaid" ||
                        there.get(m.personId)?.plan === m.plan),
                  );
                return same ? [{ expanded: row, twin }] : [];
              });
            const gap = (c: {
              expandedDebt?: { balanceMinor: number };
              twinDebt?: { balanceMinor: number };
            }) =>
              (c.twinDebt?.balanceMinor ?? 0) -
              (c.expandedDebt?.balanceMinor ?? 0);
            const compared = [
              ...new Set(months.map((m) => m.expanded.householdId)),
            ]
              .map((id) => ({
                id,
                month: months.find((m) => m.expanded.householdId === id)!,
                expandedDebt: withExpansion.debts.get(id),
                twinDebt: inTwin.debts.get(id),
              }))
              .filter((c) => (c.twinDebt?.balanceMinor ?? 0) > 0)
              .sort((a, b) => gap(b) - gap(a));
            const named = compared[0];
            if (!named) {
              passed.push(
                `(b) ${where()}: no town household with Medicaid coverage only in the expansion world carried medical debt in the twin (${months.length} household-months compared)`,
              );
              return null;
            }
            const { expanded, twin } = named.month;
            const at = `${where()}: ${named.id} on ${expanded.date}`;
            // That month its bill is lower with the expansion, by bill record.
            expect(
              expanded.billMinor,
              `${at}: ${expanded.id} against the twin's ${twin.id}`,
            ).toBeLessThan(twin.billMinor);
            // The coverage it read is the members' own: each Medicaid member
            // holds a stretch of coverage on the billed day.
            const covered = expanded.members.filter(
              (m) => m.plan === "medicaid",
            );
            for (const m of covered)
              expect(
                spellOn(withExpansion.spells.get(m.personId), expanded.date),
                `${at}: ${m.personId}'s coverage records`,
              ).toBeDefined();
            // Medicaid's own part of their care was paid to the household's
            // seller that day by the treasuries, by journal entry.
            // (play() checked every town seller's day: the receipts equal the
            // sum of round(medicaidMinor x weight) over its households, the
            // federal leg that sum at the match in force, paid in full.)
            const sellerAccount = withExpansion.sellerAccounts.get(
              `${expanded.id}|${expanded.date}`,
            );
            const care = medicaidCare.filter(
              (p) =>
                p.world === "expanded" &&
                p.date === expanded.date &&
                p.to === sellerAccount,
            );
            const sellerDay = withExpansion.care.get(
              `${expanded.sellerId}|${expanded.date}`,
            );
            const own = Math.round(
              covered.reduce((n, m) => n + (m.medicaidMinor ?? 0), 0) *
                expanded.weight,
            );
            expect(
              sellerDay?.minor ?? 0,
              `${at}: Medicaid's part paid to ${expanded.sellerId} holds this household's ${own}`,
            ).toBeGreaterThanOrEqual(own);

            // The expansion moves the town's employer plans not at all: the
            // coverage engine leaves its and the work requirement's
            // place-level coverage links out in the town, whose Medicaid
            // coverage the reach keeps by person id. The first month billed,
            // before the two worlds' money has parted.
            const firstBilled = [...withExpansion.employerPlans.keys()][0]!;
            expect(
              withExpansion.employerPlans.get(firstBilled),
              `${where()}: the town's employer policyholders on ${firstBilled} with the expansion and in the twin`,
            ).toBe(inTwin.employerPlans.get(firstBilled));
            // The place row is left out of its share: its own records carry it.
            expect(expanded.ownRecordsFor, at).toContain(TWIN_LINK);
            expect(expanded.webLinks, at).not.toContain(TWIN_LINK);
            // Its medical debt is smaller with the expansion.
            expect(named.expandedDebt?.balanceMinor ?? 0, at).toBeLessThan(
              named.twinDebt!.balanceMinor,
            );
            // A counted household in the town meets the expansion the same
            // way: a member priced at Medicaid's share by their own coverage
            // record, the place row left out, every month of both worlds.
            const countedTown = all.filter(
              (row) => row.counted && row.placeId === town,
            );
            for (const row of countedTown)
              expect(
                row.webLinks,
                `${where()}: ${row.id} on ${row.date}`,
              ).not.toContain(TWIN_LINK);
            const countedMedicaid = withExpansion.rows.find(
              (row) =>
                row.counted &&
                row.placeId === town &&
                row.members.some(
                  (m) =>
                    m.plan === "medicaid" &&
                    spellOn(withExpansion.spells.get(m.personId), row.date),
                ),
            );
            if (!countedMedicaid) {
              passed.push(
                `(b) ${where()}: no counted household in the town held Medicaid coverage in the expansion world (${countedTown.length} counted town household-months)`,
              );
              return null;
            }
            expect(countedMedicaid.ownRecordsFor).toContain(TWIN_LINK);
            const countedMember = countedMedicaid.members.find(
              (m) =>
                m.plan === "medicaid" &&
                spellOn(
                  withExpansion.spells.get(m.personId),
                  countedMedicaid.date,
                ),
            )!;
            const recordsOf = (personId: string, date: string) =>
              spellOn(withExpansion.spells.get(personId), date)!.recordIds.join(
                " ",
              );
            const outside = withExpansion.outside ?? inTwin.outside;
            return `(b) ${where()}; expansion ${withExpansion.change} in one world, repealed in the twin (${inTwin.change || "not held"}); played ${withExpansion.start} to ${withExpansion.end}; the twin held it on no day of the window. ${named.id}: medical debt ${named.expandedDebt?.balanceMinor ?? 0} with the expansion (${named.expandedDebt?.id ?? "no record"}) against ${named.twinDebt!.balanceMinor} in the twin (${named.twinDebt!.id}, first sent ${named.twinDebt!.chargedOffAt}, last ${named.twinDebt!.lastSentAt} ${named.twinDebt!.lastSentMinor} from ${named.twinDebt!.lastBillId}). On ${expanded.date} ${expanded.id} billed ${expanded.billMinor} with the expansion (Medicaid members ${covered.map((m) => `${m.personId} ${m.billMinor}, Medicaid's part ${m.medicaidMinor}, coverage records ${recordsOf(m.personId, expanded.date)}`).join("; ")}; its part ${own}; the treasuries paid ${expanded.sellerId} ${sellerDay!.minor} that day for ${sellerDay!.households} households, the sum of their Medicaid parts, the federal leg ${sellerDay!.federal} at the match ${sellerDay!.match} (${sellerDay!.matchLawId}), paid in full: ${care.map((p) => `${p.minor} by ${p.id} (${p.source.includes("+medicaid-match") ? "federal" : "state"})`).join(", ")}; ${withExpansion.lines}) against ${twin.billMinor} in the twin (plans ${plansOf(twin)}); own records for ${expanded.ownRecordsFor.join(", ")}, web links ${expanded.webLinks.join(", ") || "none"}. The town's employer policyholders on ${firstBilled}: ${withExpansion.employerPlans.get(firstBilled)} with the expansion, ${inTwin.employerPlans.get(firstBilled)} in the twin. Counted: ${countedMedicaid.id} on ${countedMedicaid.date}, member ${countedMember.personId} at Medicaid's share billed ${countedMember.billMinor} (coverage records ${recordsOf(countedMember.personId, countedMedicaid.date)}), own records for ${countedMedicaid.ownRecordsFor.join(", ")}; ${countedTown.length} counted town household-months, none reading the place row${outside ? `; outside the town ${outside.id} (${outside.placeId}) reads it, share ${outside.collectionsShare} (${outside.webRecordId})` : ""}`;
          };
          for (const [id, entry] of posted)
            expect(
              entry.sum,
              `${where()}: ${id} (${entry.source}) balances`,
            ).toBe(0);
          proofA ??= partA();
          proofB ??= partB();
          if (!proofA || !proofB) continue;
          process.stdout.write(
            `MEDICAL-DEBT (MEDICAL_DEBT_SEED=${SEED})\n${proofA}\n${proofB}\nPassed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed ${proofA ? "part (b)" : proofB ? "part (a)" : "either part"}: ${passed.join("; ")}`,
        );
      } finally {
        setJournalTrace(null);
        setBookkeeping(bookkeeping);
      }
    },
  );
});
