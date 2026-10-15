/* global process, console */
// Per-business diagnosis of closures over one year in a drawn place.
// Usage: CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/closures.mjs --seed S [--days 365]
// M0-08's command: under the golden-path runner it takes GOLDEN_PATH_SEED and
// GOLDEN_PATH_PLACE_KEY, and exits 1 when any of the six checks fails. The
// world is the played world (buildBenchWorld: two-level, every module), and
// the sixth check rejects any money owed to the outside world that no
// recorded exchange matches (src/core2/data/outside-flows.json).
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { setBookkeeping } = await at("src/core2/bookkeeping.ts");
const { coreAPI } = await at("src/core2/state.ts");
const { drawPlace } = await at("scripts/core2-year/place.ts");
const { advanceCore } = await at("src/core2/life.ts");
const outsideFlows = (await at("src/core2/data/outside-flows.json")).default;
const { addDays, makeIsoDate } = await at("src/core2/kernel/dates.ts");
const seed = value(
  "--seed",
  process.env.GOLDEN_PATH_SEED ??
    (await import("node:crypto")).randomBytes(16).toString("hex"),
);
const { corePlaceByKey } = await at("src/core2/place-lookup.ts");
const givenKey = process.env.GOLDEN_PATH_PLACE_KEY;
const place = givenKey
  ? {
      seed,
      key: givenKey,
      name: corePlaceByKey(givenKey)?.formalName ?? givenKey,
      state: corePlaceByKey(givenKey)?.stateJurisdictionKey ?? "",
    }
  : drawPlace(seed, "core2-year");
setBookkeeping(false);
const started = performance.now();
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
// The opening's cash, kept for the closing comparison below.
const input = {
  startedAt: core.date,
  organizations: [...core.organizations.values()].map((o) => ({
    id: o.id,
    name: o.name,
    kind: o.kind,
    liquidMinor: o.liquidMinor,
  })),
  people: [...core.people.values()].map((p) => ({
    liquidMinor: p.liquidMinor,
  })),
};
const orgs = new Map([...core.organizations.values()].map((o) => [o.id, o]));
// Every journal entry that touches an outside account, matched to the
// recorded exchange behind it.
const journal = core.cashJournal;
const flowRow = (entry) =>
  outsideFlows.flows.find(
    (row) =>
      row.kind === entry.sourceRef.kind &&
      (!row.idPrefix || entry.sourceRef.id.split(/[:@]/)[0] === row.idPrefix),
  );
const unmatched = new Map();
const byClass = new Map();
{
  const api = coreAPI(core);
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    for (const posting of entry.postings) {
      const owner = journal.accounts.get(posting.accountId)?.ownerId;
      if (!owner || !journal.externalFlowsByOwner.has(owner)) continue;
      const row = flowRow(entry);
      const key = row
        ? `${row.matchedBy}: ${row.kind}${row.idPrefix ? ` ${row.idPrefix}` : ""}`
        : `${entry.sourceRef.kind} ${entry.sourceRef.id.split(/[:@]/)[0]}`;
      const totals = row ? byClass : unmatched;
      const t = totals.get(key) ?? { owedMinor: 0, entries: 0 };
      // An outside account paying in (a negative posting) is money the town now owes it.
      t.owedMinor -= posting.deltaMinor;
      t.entries += 1;
      totals.set(key, t);
    }
    return post(entry);
  };
}
const opening = new Map(
  [...core.finance.businesses.values()].map((b) => [
    b.organizationId,
    {
      cash: core.organizations.get(b.organizationId).liquidMinor,
      annualPayroll: b.annualPayrollMinor,
      annualDemand: b.annualDemandMinor,
      annualOther: b.annualOtherCostsMinor,
    },
  ]),
);
const cashTotal = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  );
const openingCash = cashTotal();
const traceFirm = value("--trace-firm", "");
const traced = new Map();
if (traceFirm) {
  const { coreAPI } = await at("src/core2/state.ts");
  const api = coreAPI(core);
  const id = input.organizations.find((o) => o.name === traceFirm)?.id;
  const account = core.cashJournal.residualAccountByOwner.get(id);
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    for (const row of entry.postings)
      if (row.accountId === account) {
        const key = `${entry.sourceRef.kind}:${entry.sourceRef.id.replace(/[@:].*$/, "")}:${row.deltaMinor < 0 ? "out" : "in"}`;
        traced.set(key, (traced.get(key) ?? 0) + row.deltaMinor);
      }
    return post(entry);
  };
}
const monthly = new Map();
let cursor = makeIsoDate(input.startedAt);
const days = Number(value("--days", "365"));
for (let i = 0; i < days; i++) {
  const next = addDays(cursor, 1);
  advanceCore(core, next);
  for (const b of core.finance.businesses.values()) {
    const row = monthly.get(b.organizationId) ?? [];
    if (next.endsWith("-01") || i === days - 1)
      row.push({
        at: next,
        cash: core.organizations.get(b.organizationId).liquidMinor,
        sales: b.salesReceivedMinor,
        wagesPaid: b.wagesPaidMinor,
        wagesRequested: b.wagesRequestedMinor,
        operatingPaid: b.operatingPaidMinor,
        received: b.receivedMinor,
        demand: b.annualDemandMinor,
        other: b.annualOtherCostsMinor,
      });
    monthly.set(b.organizationId, row);
  }
  cursor = next;
}
const $ = (m) => Math.round((m ?? 0) / 100);
const rows = [...core.finance.businesses.values()].map((b) => {
  // A business founded during the year opens at zero: its founding capital
  // came by a journaled transfer, which the cash totals already count.
  const o = opening.get(b.organizationId) ?? {
    cash: 0,
    annualPayroll: b.annualPayrollMinor,
    annualDemand: b.annualDemandMinor,
    annualOther: b.annualOtherCostsMinor,
  };
  const history = monthly.get(b.organizationId) ?? [];
  const last = history.at(-1) ?? {};
  return {
    name: (
      orgs.get(b.organizationId) ?? core.organizations.get(b.organizationId)
    )?.name,
    founded: !opening.has(b.organizationId),
    kind: b.kindId,
    closedAt: b.closedAt ?? "",
    openingCash$: $(o.cash),
    annualPayroll$: $(o.annualPayroll),
    annualDemand$: $(o.annualDemand),
    annualOther$: $(o.annualOther),
    sales$: $(last.sales),
    wagesPaid$: $(last.wagesPaid),
    wagesRequested$: $(last.wagesRequested),
    operatingPaid$: $(last.operatingPaid),
    salesOverWages: last.wagesRequested
      ? +(last.sales / last.wagesRequested).toFixed(2)
      : null,
    cashByMonth$: history.map((h) => $(h.cash)).join(","),
  };
});
const outside = {};
let outsideNet = 0;
for (const [id, row] of core.cashJournal.externalFlowsByOwner) {
  outside[
    `${core.organizations.get(id)?.kind}:${core.organizations.get(id)?.name}`
  ] = {
    paidIntoTown$: $(row.outgoingMinor),
    paidOutOfTown$: $(row.incomingMinor),
  };
  outsideNet += row.netMinor;
}
const sales = rows.reduce((n, r) => n + r.sales$, 0),
  wages = rows.reduce((n, r) => n + r.wagesRequested$, 0);
const closed = rows.filter((r) => r.closedAt).length;
const labeled = [...core.gaps].filter((g) => /condition|national/i.test(g));
const plugs = [...byClass].filter(([key]) => key.startsWith("plug:"));
const owedByPlugs = plugs.reduce((n, [, t]) => n + t.owedMinor, 0);
const passed = {
  close: rows.length > 0 && closed / rows.length < 0.1,
  sales: sales > wages / 2,
  balances: openingCash - outsideNet === cashTotal(),
  outside: Object.keys(outside).length > 0,
  labeled: labeled.length > 0,
  matched: unmatched.size === 0 && owedByPlugs === 0,
};
console.log(
  JSON.stringify(
    {
      place: `${place.name} (${place.state})`,
      placeKey: place.key,
      span: [input.startedAt, core.date],
      seconds: (performance.now() - started) / 1000,
      closureRecords: [...core.finance.closures.values()].map((row) => ({
        organizationId: row.organizationId,
        date: row.date,
        sourceReceiptId: row.sourceReceiptId,
        affectedPersonIds: row.affectedPersonIds,
        affectedCountedPersonIds: row.affectedCountedPersonIds,
        endedJobIds: row.endedJobIds,
        endedCountedJobIds: row.endedCountedJobIds,
      })),
      seed,
      checks: {
        "1 under 10% close": `${closed} of ${rows.length} (${((100 * closed) / rows.length).toFixed(1)}%)`,
        "2 sales over half of wages": `sales $${sales.toLocaleString()} vs wages $${wages.toLocaleString()} (${(sales / wages).toFixed(2)}x)`,
        "3 every dollar balances": openingCash - outsideNet === cashTotal(),
        "4 outside money reported": outside,
        "5 national conditions labeled": labeled,
        "6 the outside is owed only for recorded exchanges": {
          owedByPlugs$: $(owedByPlugs),
          plugs: Object.fromEntries(
            plugs.map(([key, t]) => [
              key,
              { owed$: $(t.owedMinor), entries: t.entries },
            ]),
          ),
          unmatched: Object.fromEntries(
            [...unmatched].map(([key, t]) => [
              key,
              { owed$: $(t.owedMinor), entries: t.entries },
            ]),
          ),
          matched: Object.fromEntries(
            [...byClass]
              .filter(([key]) => !key.startsWith("plug:"))
              .map(([key, t]) => [
                key,
                { owed$: $(t.owedMinor), entries: t.entries },
              ]),
          ),
        },
      },
    },
    null,
    2,
  ),
);
console.table(
  rows.map((r) =>
    Object.fromEntries(Object.entries(r).filter(([k]) => k !== "cashByMonth$")),
  ),
);
for (const r of rows.filter((r) => r.closedAt))
  console.log(r.name, r.closedAt, "cash by month:", r.cashByMonth$);
const failed = Object.entries(passed).filter(([, ok]) => !ok);
console.log(
  failed.length
    ? `M0-08 FAIL: ${failed.map(([name]) => name).join(", ")}`
    : "M0-08 PASS",
);
if (failed.length) process.exitCode = 1;

const firm = value("--firm", "");
if (firm) {
  const id = [...orgs.values()].find((o) => o.name === firm)?.id;
  const h = monthly.get(id);
  console.log(`\n${firm}: monthly deltas ($)`);
  for (let i = 1; i < h.length; i++) {
    const d = (k) => $(h[i][k] - h[i - 1][k]);
    const cashDelta = d("cash");
    console.log(
      h[i].at,
      JSON.stringify({
        received: d("received"),
        sales: d("sales"),
        localSupplies: d("operatingPaid"),
        wages: d("wagesPaid"),
        cashChange: cashDelta,
        impliedOutsideCosts:
          d("received") - d("operatingPaid") - d("wagesPaid") - cashDelta,
        demandAnnual: $(h[i].demand),
        otherAnnual: $(h[i].other),
      }),
    );
  }
}
if (args.includes("--totals"))
  console.log(
    Object.fromEntries(
      [...core.finance.totalsByKind]
        .filter(([, t]) => t.paidMinor > 0)
        .map(([k, t]) => [k, $(t.paidMinor)]),
    ),
  );
if (traceFirm)
  console.log(Object.fromEntries([...traced].map(([k, v]) => [k, $(v)])));
{
  const byKind = {};
  for (const row of core.organizations.values())
    byKind[row.kind] = (byKind[row.kind] ?? 0) + $(row.liquidMinor);
  byKind.people = [...core.people.values()].reduce(
    (n, r) => n + $(r.liquidMinor),
    0,
  );
  const openingByKind = {};
  for (const row of input.organizations)
    openingByKind[row.kind] =
      (openingByKind[row.kind] ?? 0) + $(row.liquidMinor);
  openingByKind.people = input.people.reduce((n, r) => n + $(r.liquidMinor), 0);
  console.log(
    "cash by owner kind, opening -> closing ($)",
    JSON.stringify(openingByKind),
    JSON.stringify(byKind),
  );
}
