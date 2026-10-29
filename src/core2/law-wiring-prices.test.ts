/**
 * Price and sales-tax laws follow their money to the people it reached, in a
 * played world: each law's applied rows (full households, counted groups,
 * sellers and treasuries), the journal posts that cite it, the outcome-web
 * month that read it, and its repeal. The ban on new gas hookups, whose money
 * moves only when a builder starts a project, is followed in its own case.
 */
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { LAW_REACH_HOST_ID } from "./law-reach/host";
import { LAW_APPLIED_TABLE, type LawAppliedRow } from "./law-reach/applied";
import { WEB_LINKS } from "./outcome-web-model";
import type { LawRowInput } from "./laws-starting";
import { BUDGETS_MODULE_ID } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { licensedSellers } from "./modules/place-prices";
import { purchaseTaxes } from "./modules/purchase-tax";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const P = "us-policy-positions:";
const FARE_FREE = `${P}transportation-infrastructure.fare-free-transit`;
const MILEAGE = `${P}transportation-infrastructure.mileage-fee-replaces-fuel-tax`;
const BROADBAND = `${P}transportation-infrastructure.public-broadband`;
const CLEAN = `${P}environment-energy.clean-electricity-standard`;
const BOTTLE = `${P}environment-energy.bottle-deposit`;
const CARBON = `${P}environment-energy.price-carbon`;
const CANNABIS = `${P}business-commerce.legalize-cannabis-sales`;
const GROCERIES = `${P}fiscal.exempt-groceries-from-sales-tax`;
const GAS_BAN = `${P}environment-energy.ban-new-gas-hookups`;
const SALES_TAX = "sales-tax";
const LOCAL_AVERAGE = "local-sales-tax-average";

/** Laws a monthly price settlement applies, with the good whose rule carries each and whether a treasury or provider is paid. */
const PRICE_LAWS: readonly {
  key: string;
  good: string;
  paysPublic: boolean;
}[] = [
  { key: FARE_FREE, good: "transit-fare", paysPublic: false },
  { key: MILEAGE, good: "vehicle-miles", paysPublic: true },
  { key: BROADBAND, good: "broadband", paysPublic: true },
  { key: CLEAN, good: "electricity", paysPublic: false },
  { key: BOTTLE, good: "beverage-container", paysPublic: false },
  { key: CARBON, good: "fuel", paysPublic: true },
];
const YES_LAWS = [...PRICE_LAWS.map((l) => l.key), CANNABIS, GROCERIES];

/** A year and a month of play: past the longest lag a researched link of these laws has that a year can show (litter, emissions: 12 months). */
const PLAYED_DAYS = 375;
const REPEAL_DAYS = 35;
/**
 * The ban's money moves when a builder starts a project, which a small town
 * does less than once a year (the audit towns' first starts came at 440 and 745
 * days): the case plays up to the longest wait a labor law's run uses, a month
 * at a time, and draws another place where no builder started one.
 */
const GAS_WINDOW_DAYS = 760;
const GAS_STEP_DAYS = 30;
const GAS_DRAWS = 3;

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

function setAll(api: CoreAPI, key: string, value: 0 | 1, tag: string): void {
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: key,
      value,
      effectiveDate: api.state.date,
      measureId: `test:${tag}:${key}:${value}`,
      citation: "Controlled law case in a generated year.",
    });
}

function inForceNow(api: CoreAPI, key: string): boolean {
  const date = api.state.date;
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.some(({ jurisdiction }) => {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
}

function applied(core: CoreState, key: string): LawAppliedRow[] {
  return (
    coreAPI(core)
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .rows() as unknown as LawAppliedRow[]
  ).filter((r) => r.key === key);
}
const open = (rows: LawAppliedRow[]) => rows.filter((r) => !r.endedOn);
/**
 * The rows recorded since the laws took effect, open or ended: a later law
 * row on the same key (a council re-enacting it) closes rows until the
 * engine's next monthly settlement records them again.
 */
const current = (rows: LawAppliedRow[], since: string) =>
  rows.filter((r) => r.since >= since);

/**
 * A sales-tax row records the sellers it taxes at their next sales, which a
 * town settles on its paydays: a small town may have none in a fortnight.
 * Play fifteen days at a time (at most sixty) until a seller is recorded
 * under the row in force.
 */
function advanceUntilRecorded(
  core: CoreState,
  lawId: string,
  firstDays = 15,
): void {
  const recorded = () =>
    open(applied(core, SALES_TAX)).some((r) => r.lawId === lawId);
  if (firstDays === 0 && recorded()) return;
  for (let step = 0; step < 4; step += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 15));
    if (recorded()) return;
  }
}

function months(core: CoreState): WebMonth[] {
  return coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as WebMonth[];
}

describe("price and sales-tax laws reach people and move money", () => {
  afterAll(() => setJournalTrace(null));

  it("is followed to households, groups, sellers and treasuries", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      // A place with no sales tax in force has nothing for the tax laws to
      // collect on: draw again (every place tried is named on failure).
      let ran = false;
      // PRICES_WORLD_SEED with PRICES_PLACE_KEY replays one recorded draw first.
      const pinnedSeed = process.env.PRICES_WORLD_SEED;
      const pinnedKey = process.env.PRICES_PLACE_KEY;
      if (pinnedSeed && pinnedKey) {
        const pinned = {
          seed: pinnedSeed,
          key: pinnedKey,
          name: "pinned",
          state: "",
        } as ReturnType<typeof drawPlace>;
        tried.push(`${pinned.key} (pinned, seed ${pinned.seed})`);
        ran = run(pinned, tried);
      }
      for (let attempt = 0; attempt < 4 && !ran; attempt += 1) {
        const drawn = drawPlace(seed, `law-wiring-prices:${attempt}`);
        tried.push(`${drawn.key} (${drawn.state}, seed ${drawn.seed})`);
        ran = run(drawn, tried);
      }
      expect(
        ran,
        `no drawn place had a sales tax and payers; tried ${tried.join("; ")}`,
      ).toBe(true);
    } finally {
      setJournalTrace(null);
      setBookkeeping(true);
    }
  }, 600_000); // every law in force, the longest lag a year can show. // A dense place (Guam took 390 seconds on shared CPU) plays 375 days of
});

function run(
  drawn: ReturnType<typeof drawPlace>,
  tried: readonly string[],
): boolean {
  const where = `seed ${drawn.seed}, place ${drawn.key} ${drawn.name}`;
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const api = coreAPI(core);
  const sales = lawInForce(api, SALES_TAX);
  if (!(sales.value && sales.value > 0)) return false;
  // The cannabis law's buyers buy from the town's licensed sellers, its open
  // retail stores, which open their books on the world's first day: a town
  // with none (Huntley, Wyoming) is redrawn before anything is played.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  if (!licensedSellers(core, lawChain(api).townPlaceId).length) return false;
  // For each law row the test enacted: its first post that pays money and
  // its first post that cites it by id, and whether any post cites it after
  // the repeal. A year of every post would not fit a test worker's memory.
  const watched: string[] = [];
  const firstPriced = new Map<string, string>();
  const firstCited = new Map<string, string>();
  const afterRepeal = new Set<string>();
  let repealed = false;
  // A seller's first sales-tax remittance once the laws are in force, by the
  // account that paid it: the journal entry of the tax money.
  const remittances = new Map<string, string>();
  let recording = false;
  // Keep only the posts that cite a law row (a price rule's cause names it).
  setJournalTrace((input) => {
    if (recording && input.sourceRef.id.startsWith("sales-tax:")) {
      const payer = input.postings.find((p) => p.deltaMinor < 0)?.accountId;
      if (payer && !remittances.has(payer))
        remittances.set(payer, `${input.id} (${input.sourceRef.id})`);
    }
    const text = input.id + input.sourceRef.id;
    if (!text.includes("law:")) return;
    let gross = 0;
    for (const p of input.postings) if (p.deltaMinor > 0) gross += p.deltaMinor;
    for (const lawId of watched) {
      if (!text.includes(lawId)) continue;
      if (repealed) afterRepeal.add(lawId);
      else {
        if (gross > 0 && !firstPriced.has(lawId))
          firstPriced.set(lawId, input.id);
        if (
          input.id.includes(lawId) &&
          !input.id.startsWith("price:") &&
          !firstCited.has(lawId)
        )
          firstCited.set(lawId, input.id);
      }
    }
  });

  // Phase 0: the laws start repealed where the starting law has them in force.
  const startedYes = new Set(YES_LAWS.filter((k) => inForceNow(api, k)));
  for (const key of startedYes) setAll(api, key, 0, "off");
  advanceCore(core, addDays(makeIsoDate(core.date), 35));
  for (const key of YES_LAWS)
    expect(
      open(applied(core, key)),
      `${where}: ${key} applied with the law off`,
    ).toHaveLength(0);

  // Phase 1: every law in force, a year and more of play.
  const enactedOn = core.date;
  recording = true;
  for (const key of YES_LAWS) setAll(api, key, 1, "on");
  const lawIds = new Map<string, string>();
  /** Every row the test enacted for each law, one per level of the chain. */
  const ownRows = new Map<string, Set<string>>();
  for (const key of YES_LAWS) {
    const answer = lawInForce(api, key);
    const row = answer.governing;
    expect(row, `${where}: ${key} in force`).toBeTruthy();
    lawIds.set(key, row!.id);
    ownRows.set(
      key,
      new Set(answer.levels.flatMap((l) => (l.row ? [l.row.id] : []))),
    );
    watched.push(row!.id);
  }
  advanceCore(core, addDays(makeIsoDate(core.date), PLAYED_DAYS));

  const rules = api
    .moduleState("place-prices")
    .table("rules")
    .rows() as unknown as { good: string; cause: string; payeeId?: string }[];
  const payers: string[] = [];
  /** For each law: the applied row, the journal entry of its money and the household or person it reached, named by record id. */
  const evidence: Record<
    string,
    { applied: string; journal: string; reached: string }
  > = {};
  const sellerRemittance = (sellerId: string) =>
    remittances.get(
      core.cashJournal.residualAccountByOwner.get(sellerId) ?? "",
    );
  for (const law of PRICE_LAWS) {
    const rule = rules.find((r) => r.cause.includes(law.key));
    expect(rule, `${where}: ${law.key} price rule`).toBeDefined();
    const all = current(applied(core, law.key), enactedOn);
    const lawId = lawIds.get(law.key)!;
    // The budgets engine also reaches each government whose lines the law
    // moves (a fare-free system's lost fares), under that government's own
    // row of the law; every other record is the price engine's.
    for (const row of all.filter((r) => r.engine !== "place-prices")) {
      expect(row.engine, `${where}: ${row.id}`).toBe(BUDGETS_MODULE_ID);
      expect(row.target, `${where}: ${row.id}`).toBe("government");
      expect(
        ownRows.get(law.key)!.has(row.lawId),
        `${where}: ${row.id} names ${row.lawId}`,
      ).toBe(true);
    }
    const rows = all.filter((r) => r.engine === "place-prices");
    const households = rows.filter((r) => r.target === "household");
    const groups = rows.filter((r) => r.target === "group");
    expect(
      households.length + groups.length,
      `${where}: ${law.key} reached nobody (law ${lawId}, rule cause ${rule!.cause}, ${core.date}; open ${rows.length}, all ${applied(core, law.key).length}, ended ${applied(core, law.key).filter((r) => r.endedOn).length}, ended on ${[...new Set(applied(core, law.key).map((r) => r.endedOn))].join(",")})`,
    ).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.lawId, `${where}: ${row.id}`).toBe(lawId);
      expect(row.engine).toBe("place-prices");
    }
    for (const row of groups)
      expect(row.count, `${where}: ${row.id} group count`).toBeGreaterThan(0);
    expect(
      rows.some((r) => r.amountMinor !== 0),
      `${where}: ${law.key} rows carry the price change paid`,
    ).toBe(true);
    if (households.length) payers.push(households[0]!.id);
    if (law.paysPublic)
      expect(
        rows.filter((r) => r.target === "government").length,
        `${where}: ${law.key} treasury received`,
      ).toBeGreaterThan(0);
    // The money: journal posts that cite this law's row, paid by its payers.
    const journal = firstPriced.get(lawId) ?? firstCited.get(lawId);
    expect(
      journal,
      `${where}: ${law.key} moved no money (law ${lawId})`,
    ).toBeDefined();
    const reached = households[0] ?? groups[0]!;
    evidence[law.key] = {
      applied: reached.id,
      journal: journal!,
      reached: reached.targetId,
    };
  }

  // Cannabis: licensed sellers received, households and groups paid.
  {
    const rows = current(applied(core, CANNABIS), enactedOn);
    expect(
      rows.filter((r) => r.target === "household" || r.target === "group")
        .length,
      `${where}: cannabis buyers`,
    ).toBeGreaterThan(0);
    expect(
      rows.filter((r) => r.target === "organization").length,
      `${where}: cannabis sellers`,
    ).toBeGreaterThan(0);
    const buyer = rows.find(
      (r) => r.target === "household" || r.target === "group",
    )!;
    const sale = firstPriced.get(lawIds.get(CANNABIS)!);
    expect(
      sale,
      `${where}: a journal entry of the cannabis sale`,
    ).toBeDefined();
    evidence[CANNABIS] = {
      applied: buyer.id,
      journal: sale!,
      reached: buyer.targetId,
    };
  }

  // Groceries: the sales tax skips part of retail sales for full and counted buyers.
  {
    const rows = current(applied(core, GROCERIES), enactedOn);
    const exempt = [...purchaseTaxes(core).values()].filter(
      (t) => t.exemptions?.length && t.endedAt === undefined,
    );
    expect(
      exempt.length,
      `${where}: a tax carries the exemption`,
    ).toBeGreaterThan(0);
    expect(
      rows.filter((r) => r.target === "person" || r.target === "household")
        .length,
      `${where}: full buyers spared`,
    ).toBeGreaterThan(0);
    expect(
      rows.filter((r) => r.target === "group" && r.count > 1).length,
      `${where}: counted buyers spared`,
    ).toBeGreaterThan(0);
    // Prices are tax-inclusive: a buyer's cash does not change, only the seller's remittance does.
    expect(
      rows.filter((r) => r.target !== "organization").map((r) => r.amountMinor),
      `${where}: buyers' cash is unchanged, so their rows carry 0`,
    ).toSatisfy((amounts: number[]) => amounts.every((a) => a === 0));
    expect(
      rows.filter((r) => r.target === "organization").map((r) => r.amountMinor),
      `${where}: a spared seller kept the tax it would have remitted`,
    ).toSatisfy((amounts: number[]) => amounts.every((a) => a < 0));
    expect(
      rows.filter((r) => r.target === "organization").length,
      `${where}: sellers spared`,
    ).toBeGreaterThan(0);
    const spared = rows.find(
      (r) => r.target === "person" || r.target === "household",
    )!;
    const seller = rows.find((r) => r.target === "organization")!;
    expect(
      sellerRemittance(seller.targetId),
      `${where}: the spared seller ${seller.targetId} remitted the tax`,
    ).toBeDefined();
    evidence[GROCERIES] = {
      applied: spared.id,
      journal: sellerRemittance(seller.targetId)!,
      reached: spared.targetId,
    };
  }

  // Sales tax: sellers collect under the row in force (the place's own or the state's average local rate).
  {
    const city = lawInForce(api, SALES_TAX).levels;
    const series = city
      .filter((l) => l.row && !l.setAside && l.level !== "federal")
      .map((l) => l.row!.series);
    expect(
      series.every((s) => s === SALES_TAX || s === LOCAL_AVERAGE),
      `${where}: sales tax rows ${series.join(",")}`,
    ).toBe(true);
    for (const l of city) {
      if (!l.row || l.setAside || l.level === "federal") continue;
      const rows = current(applied(core, l.row.series), enactedOn).filter(
        (r) => r.lawId === l.row!.id,
      );
      // A row at a rate of zero or less taxes no sale (syncSalesTax collects
      // under positive rates only), so it applies to no seller. New Jersey's
      // state average local rate is such a row: Tax Foundation shows -0.02
      // because Salem County charges half the state rate, which pulls the
      // average below zero.
      if (!((l.row.value ?? 0) > 0)) {
        expect(
          rows,
          `${where}: ${l.row.series} row ${l.row.id} (rate ${l.row.value}) taxes no sale, so it reaches nobody`,
        ).toHaveLength(0);
        continue;
      }
      expect(
        rows.length,
        `${where}: ${l.row.series} row ${l.row.id} reached no seller`,
      ).toBeGreaterThan(0);
      expect(
        rows.some((r) => r.amountMinor > 0),
        `${where}: ${l.row.series} rows carry the tax collected`,
      ).toBe(true);
      // The buyers paid it: full people and the place's counted residents, each with the people it stands for.
      const buyers = rows.filter(
        (r) => r.target === "person" || r.target === "group",
      );
      expect(
        buyers.some((r) => r.target === "person" && r.amountMinor > 0),
        `${where}: ${l.row.series} full buyers paid`,
      ).toBe(true);
      expect(
        buyers.some(
          (r) => r.target === "group" && r.amountMinor > 0 && r.count > 1,
        ),
        `${where}: ${l.row.series} counted buyers paid`,
      ).toBe(true);
      const seller = rows.find(
        (r) => r.target === "organization" && r.amountMinor > 0,
      )!;
      const buyer = buyers.find(
        (r) => r.target === "person" && r.amountMinor > 0,
      )!;
      expect(
        sellerRemittance(seller.targetId),
        `${where}: seller ${seller.targetId} remitted ${l.row.series}`,
      ).toBeDefined();
      evidence[l.row.series] = {
        applied: buyer.id,
        journal: sellerRemittance(seller.targetId)!,
        reached: buyer.targetId,
      };
      // The sales tax is every level's rate together: a state with no rate of
      // its own (its row at zero) is named by the level that taxes the sale.
      evidence[SALES_TAX] ??= evidence[l.row.series];
    }
  }

  // The outcome web read each cause and, where a researched lag has passed, moved the measure.
  {
    const rowsByMonth = months(core).filter((m) => m.date > enactedOn);
    expect(rowsByMonth.length, `${where}: web months`).toBeGreaterThan(10);
    const last = rowsByMonth[rowsByMonth.length - 1]!;
    const elapsedMonths = Math.floor(PLAYED_DAYS / 30);
    for (const key of YES_LAWS) {
      // A link an engine carries (links.json carriedBy) is not run by the web.
      const links = WEB_LINKS.filter(
        (l) => l.from === `law:${key}` && l.status === "built" && !l.carriedBy,
      );
      // A law no researched link starts from has no cause for the web to read.
      if (links.length)
        expect(
          last.values[`law:${key}`],
          `${where}: web month ${last.id} reads ${key}`,
        ).toBe(1);
      for (const link of links) {
        const baselineYes = startedYes.has(key);
        // A law back where the place began moves nothing; a lag past the
        // elapsed months has not yet shown.
        if (baselineYes) {
          // A link phased in over months still averages the month or two
          // that phase 0 held the law off (35 days spans at most two month
          // rows), so it is off by at most that share of its size.
          const months = Math.max(1, link.phaseInMonths ?? 1);
          const effect = last.effects[link.key] ?? 0;
          if (months === 1)
            expect(effect, `${where}: ${link.key} at baseline`).toBe(0);
          else
            expect(
              Math.abs(effect),
              `${where}: ${link.key} at baseline, phased over ${months} months`,
            ).toBeLessThanOrEqual(
              (Math.abs(link.size ?? 0) * 2) / months + 1e-12,
            );
          continue;
        }
        if (link.lagMonths > elapsedMonths) {
          expect(
            last.effects[link.key] ?? 0,
            `${where}: ${link.key} lags ${link.lagMonths} months`,
          ).toBe(0);
          continue;
        }
        expect(
          last.effects[link.key],
          `${where}: ${link.key} (${link.to}) in ${last.id}`,
        ).toBeDefined();
        expect(
          last.effects[link.key],
          `${where}: ${link.key} (${link.to}) did not move`,
        ).not.toBe(0);
      }
    }
  }

  // Repeal: the rows end and the prices stop.
  for (const key of YES_LAWS) setAll(api, key, 0, "repeal");
  const repealedOn = core.date;
  repealed = true;
  advanceCore(core, addDays(makeIsoDate(core.date), REPEAL_DAYS));
  for (const key of YES_LAWS) {
    expect(
      open(applied(core, key)),
      `${where}: ${key} still applied after repeal on ${repealedOn}`,
    ).toHaveLength(0);
    const lawId = lawIds.get(key)!;
    expect(
      afterRepeal.has(lawId),
      `${where}: ${key} still moved money after repeal`,
    ).toBe(false);
  }

  // A sales-tax rate change and its restoration: each is a new row the sellers are recorded under.
  {
    const old = lawInForce(api, SALES_TAX);
    const level = old.levels.find((l) => l.row && l.level === "state")!;
    // A state with no sales tax of its own has a state row at zero, which
    // taxes no sale (syncSalesTax collects under positive rates only): the
    // raise below then starts from zero, and the restore taxes nobody again.
    const oldRate = level.row!.value ?? 0;
    if (oldRate > 0) {
      // Sellers are recorded at their next sales (a new yearly rate row takes effect on January 1).
      advanceUntilRecorded(core, level.row!.id, 0);
      const oldRows = open(applied(core, SALES_TAX));
      expect(
        oldRows.length,
        `${where}: sellers recorded under the rate in force ${level.row!.id} on ${core.date}`,
      ).toBeGreaterThan(0);
    } else
      expect(
        open(applied(core, SALES_TAX)).filter((r) => r.lawId === level.row!.id),
        `${where}: the state rate ${level.row!.id} is ${oldRate}, so it taxes no sale`,
      ).toHaveLength(0);
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: SALES_TAX,
      value: (level.row!.value ?? 0) + 1,
      effectiveDate: api.state.date,
      measureId: "test:sales-tax:raise",
      citation: "Controlled law case in a generated year.",
    });
    const stateRow = () =>
      lawInForce(api, SALES_TAX).levels.find((l) => l.level === "state")!.row!
        .id;
    const raised = stateRow();
    advanceUntilRecorded(core, raised);
    expect(raised, `${where}: raised row`).not.toBe(level.row!.id);
    expect(
      open(applied(core, SALES_TAX)).some((r) => r.lawId === raised),
      `${where}: sellers recorded under the raised rate ${raised}`,
    ).toBe(true);
    expect(
      open(applied(core, SALES_TAX)).some((r) => r.lawId === level.row!.id),
      `${where}: the replaced rate ${level.row!.id} still open`,
    ).toBe(false);
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: SALES_TAX,
      value: level.row!.value ?? 0,
      effectiveDate: api.state.date,
      measureId: "test:sales-tax:restore",
      citation: "Controlled law case in a generated year.",
    });
    const restored = stateRow();
    advanceUntilRecorded(core, restored);
    expect(restored, `${where}: restored row`).not.toBe(raised);
    const rows = open(applied(core, SALES_TAX));
    expect(
      rows.some((r) => r.lawId === restored),
      oldRate > 0
        ? `${where}: sellers recorded under the restored rate ${restored}`
        : `${where}: the restored rate ${restored} is ${oldRate}, so it taxes no sale`,
    ).toBe(oldRate > 0);
    expect(
      rows.some((r) => r.lawId === raised),
      `${where}: the raised rate ${raised} still open after restoring`,
    ).toBe(false);
  }
  // Every law of the family is named by an applied row, a journal entry and
  // the household or person it reached.
  for (const key of [...YES_LAWS, SALES_TAX]) {
    const named = evidence[key];
    expect(named, `${where}: evidence for ${key}`).toBeDefined();
    for (const value of Object.values(named!))
      expect(
        value,
        `${where}: ${key} evidence ${JSON.stringify(named)}`,
      ).toBeTruthy();
  }
  console.info(
    `prices family evidence, ${where}\n${JSON.stringify(evidence, null, 1)}`,
  );
  void tried;
  void payers;
  return true;
}

describe("the ban on new gas hookups reaches a builder and the cost of its project", () => {
  afterAll(() => setJournalTrace(null));

  it("is followed to the builder's applied row and its first payment", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      // A builder starting a project is the ban's subject: where none started
      // in the window, draw again (every place tried is named on failure);
      // once one has, a missing read or record fails.
      let ran = false;
      for (let attempt = 0; attempt < GAS_DRAWS && !ran; attempt += 1) {
        const drawn = drawPlace(seed, `law-wiring-prices-gas:${attempt}`);
        tried.push(`${drawn.key} (${drawn.state}, seed ${drawn.seed})`);
        ran = runGasBan(drawn);
      }
      expect(
        ran,
        `no drawn place had a builder start a project in ${GAS_WINDOW_DAYS} days under the ban; tried ${tried.join("; ")}`,
      ).toBe(true);
    } finally {
      setJournalTrace(null);
      setBookkeeping(true);
    }
  }, 1_800_000); // up to three places of 760 days each
});

interface ProjectRow {
  id: string;
  kind: string;
  startedAt: string;
  payerId: string;
  builderId: string;
  placeId: string;
  monthlyCostMinor: number;
  lawIds?: { allElectric?: string };
}

/** Enact the ban at the town's level and play until a builder starts a project under it; false where none did. */
function runGasBan(drawn: ReturnType<typeof drawPlace>): boolean {
  const where = `seed ${drawn.seed}, place ${drawn.key} ${drawn.name}`;
  const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const api = coreAPI(core);
  // The first journal entry of each project's monthly payment, by project id
  // (a payment's source id is "construction:<project id>:<date>").
  const firstPayment = new Map<string, string>();
  setJournalTrace((input) => {
    const id = input.sourceRef.id;
    if (!id.startsWith("construction:project:")) return;
    const project = id.slice("construction:".length, id.lastIndexOf(":"));
    if (!firstPayment.has(project))
      firstPayment.set(project, `${input.id} (${id})`);
  });

  // Phase 0: the ban starts repealed where the starting law has it in force.
  if (inForceNow(api, GAS_BAN)) {
    setAll(api, GAS_BAN, 0, "off");
    advanceCore(core, addDays(makeIsoDate(core.date), REPEAL_DAYS));
    expect(
      open(applied(core, GAS_BAN)),
      `${where}: ${GAS_BAN} applied with the law off`,
    ).toHaveLength(0);
  }

  // Phase 1: the town's own body enacts it.
  const town = (["city", "county", "state"] as const)
    .map((level) => lawChain(api).levels.find((l) => l.level === level))
    .find((l) => l);
  expect(town, `${where}: a level that can enact the ban`).toBeDefined();
  enactLaw(api, {
    jurisdiction: town!.jurisdiction,
    level: town!.level,
    series: GAS_BAN,
    value: 1,
    effectiveDate: api.state.date,
    measureId: "test:gas-ban:on",
    citation: "Controlled law case in a generated year.",
  });
  const governing = lawInForce(api, GAS_BAN).governing;
  expect(governing, `${where}: the ban in force`).toBeTruthy();
  const lawId = governing!.id;
  const enactedOn = core.date;

  const projects = () =>
    api
      .moduleState("housing")
      .table("projects")
      .rows() as unknown as ProjectRow[];
  // A builder starting a project in the town is the ban's subject, and the
  // start is the housing engine's own choice, not the ban's record: where none
  // started in the window, the place is redrawn. A project started on the day
  // of enactment was decided before it.
  const townPlaceId = lawChain(api).townPlaceId;
  let project: ProjectRow | undefined;
  for (
    let played = 0;
    played < GAS_WINDOW_DAYS && !project;
    played += GAS_STEP_DAYS
  ) {
    advanceCore(core, addDays(makeIsoDate(core.date), GAS_STEP_DAYS));
    project = projects().find(
      (p) => p.placeId === townPlaceId && p.startedAt > enactedOn,
    );
  }
  if (!project) return false;
  // Once a builder has started one, the ban must have been read for it.
  expect(
    project.lawIds?.allElectric,
    `${where}: ${project.id} started under the ban without reading it`,
  ).toBe(lawId);

  // The builder who started it is on an applied row that records the cost the
  // code changed, and its first payment is on the journal.
  const rows = current(applied(core, GAS_BAN), enactedOn).filter(
    (r) => r.lawId === lawId,
  );
  const row = rows.find((r) => r.targetId === project!.payerId);
  expect(
    row,
    `${where}: no applied row names ${project.payerId}, who started ${project.id} under ${lawId} (rows ${rows.map((r) => r.id).join(", ")})`,
  ).toBeDefined();
  expect(row!.target, `${where}: ${row!.id}`).toBe("organization");
  expect(row!.engine, `${where}: ${row!.id}`).toBe("housing");
  expect(
    row!.amountMinor,
    `${where}: ${row!.id} records what the code changed in ${project.id}`,
  ).not.toBe(0);
  const journal = firstPayment.get(project.id);
  expect(
    journal,
    `${where}: a journal entry of ${project.id}'s first payment`,
  ).toBeDefined();
  console.info(
    `gas hookup ban evidence, ${where}, ${project.kind} project started ${project.startedAt}\n${JSON.stringify(
      {
        [GAS_BAN]: {
          applied: row!.id,
          journal,
          reached: project.payerId,
          builder: project.builderId,
          amountMinor: row!.amountMinor,
          project: project.id,
        },
      },
      null,
      1,
    )}`,
  );
  return true;
}
