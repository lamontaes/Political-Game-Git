/**
 * Price and sales-tax laws follow their money to the people it reached, in a
 * played world: each law's applied rows (full households, counted groups,
 * sellers and treasuries), the journal posts that cite it, the outcome-web
 * month that read it, and its repeal.
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
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
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
  const posts: { id: string; ref: string; gross: number }[] = [];
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
    if (!(input.id + input.sourceRef.id).includes("law:")) return;
    let gross = 0;
    for (const p of input.postings) if (p.deltaMinor > 0) gross += p.deltaMinor;
    posts.push({ id: input.id, ref: input.sourceRef.id, gross });
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
  for (const key of YES_LAWS) {
    const row = lawInForce(api, key).governing;
    expect(row, `${where}: ${key} in force`).toBeTruthy();
    lawIds.set(key, row!.id);
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
    const rows = current(applied(core, law.key), enactedOn);
    const lawId = lawIds.get(law.key)!;
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
    const cited = posts.filter(
      (p) => p.id.includes(lawId) && p.id.startsWith("price:") === false,
    );
    const priced = posts.filter(
      (p) => (p.id + p.ref).includes(lawId) && p.gross > 0,
    );
    expect(
      priced.length + cited.length,
      `${where}: ${law.key} moved no money (law ${lawId})`,
    ).toBeGreaterThan(0);
    const reached = households[0] ?? groups[0]!;
    evidence[law.key] = {
      applied: reached.id,
      journal: (priced[0] ?? cited[0])!.id,
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
    const sale = posts.find(
      (p) => (p.id + p.ref).includes(lawIds.get(CANNABIS)!) && p.gross > 0,
    );
    expect(
      sale,
      `${where}: a journal entry of the cannabis sale`,
    ).toBeDefined();
    evidence[CANNABIS] = {
      applied: buyer.id,
      journal: sale!.id,
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
    expect(
      rows.every((r) => r.amountMinor < 0),
      `${where}: a spared tax is money not paid`,
    ).toBe(true);
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
    }
  }

  // The outcome web read each cause and, where a researched lag has passed, moved the measure.
  {
    const rowsByMonth = months(core).filter((m) => m.date > enactedOn);
    expect(rowsByMonth.length, `${where}: web months`).toBeGreaterThan(10);
    const last = rowsByMonth[rowsByMonth.length - 1]!;
    const elapsedMonths = Math.floor(PLAYED_DAYS / 30);
    for (const key of YES_LAWS) {
      const links = WEB_LINKS.filter(
        (l) => l.from === `law:${key}` && l.status === "built",
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
          expect(
            last.effects[link.key] ?? 0,
            `${where}: ${link.key} at baseline`,
          ).toBe(0);
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
  const before = posts.length;
  advanceCore(core, addDays(makeIsoDate(core.date), REPEAL_DAYS));
  for (const key of YES_LAWS) {
    expect(
      open(applied(core, key)),
      `${where}: ${key} still applied after repeal on ${repealedOn}`,
    ).toHaveLength(0);
    const lawId = lawIds.get(key)!;
    expect(
      posts.slice(before).filter((p) => (p.id + p.ref).includes(lawId)),
      `${where}: ${key} still moved money after repeal`,
    ).toHaveLength(0);
  }

  // A sales-tax rate change and its restoration: each is a new row the sellers are recorded under.
  {
    const old = lawInForce(api, SALES_TAX);
    const level = old.levels.find((l) => l.row && l.level === "state")!;
    // Sellers are recorded at their next sales (a new yearly rate row takes effect on January 1).
    advanceUntilRecorded(core, level.row!.id, 0);
    const oldRows = open(applied(core, SALES_TAX));
    expect(
      oldRows.length,
      `${where}: sellers recorded under the rate in force ${level.row!.id} on ${core.date}`,
    ).toBeGreaterThan(0);
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
      `${where}: sellers recorded under the restored rate ${restored}`,
    ).toBe(true);
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
