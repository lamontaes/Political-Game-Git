/**
 * The consumer-loan rate cap reaches the small-dollar lender, in a played
 * world: a place drawn from all 56 on a seed nobody chose, the bench world
 * with every module installed, built three times from the same seed. In one
 * the state's cap is enacted at every level, in one the federal cap question
 * is enacted at the federal level alone, and the third is the control.
 *
 * Where the state's law lets payday lending operate, the town has a lender
 * record at the state's sourced rate with a volume drawn around the sourced
 * one. A household in a shortfall that the bank does not lend to borrows
 * from it by its record. Under the state cap its loan is written at the
 * cap's ceiling, and the loan's payment, its payment row and the journal
 * entry that pays it agree; the same household's loan in the control is
 * written at the lender's own rate, and its payment is worked from the
 * control's own principal. Past the research links' twelve-month lag, the
 * outcome web's factor on high-cost lenders is read where the lender quotes
 * and sizes the loan: a loan in the capped world records a factor below one,
 * the web month it stands on and the cap's link, and is lent below what the
 * household asked; in the federal world a loan records the federal cap's
 * link the same way, against its twin in the control.
 *
 * Where the state began with the cap, repealing it moves no dollar through
 * the bank: the bank's quotes stay at the market rate, which sits under the
 * ceiling, and no applied row carries an amount.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import smallDollar from "./data/credit/small-dollar.json";
import lawParameters from "./data/laws/reach-group-a-parameters.json";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import {
  amortizedPayment,
  CREDIT_PARAMETERS,
  smallDollarTerms,
} from "./modules/credit";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID } from "./outcome-web-model";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.LENDERS_SEED ?? randomBytes(20).toString("hex");
const CAP = "us-policy-positions:business-commerce.cap-consumer-loan-rates";
const FEDERAL_CAP =
  "us-federal-positions:monetary-financial.cap-consumer-loan-interest";
const STATE_LINK = "loan-rate-cap-to-high-cost-borrowing";
const FEDERAL_LINK = "federal-loan-cap-to-high-cost-loans";
const CEILING = lawParameters.parameters.consumerLoanRateCap.value;
/**
 * Past the links' 12-month lag (links.json): the cap enacted on the opening
 * day first moves the web's month row about thirteen months on, and the
 * lender's monthly quotes read it from the month after. This runs about six
 * months of quotes past that.
 */
const DAYS = 590;
const BAN_DAYS = 120;
const DRAWS = 40;

interface Entry {
  id: string;
  ref: string;
  postings: readonly { accountId: string; deltaMinor: number }[];
}
type Row = Record<string, unknown>;

function build(drawn: ReturnType<typeof drawPlace>, worldSeed = drawn.seed) {
  return buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core;
}

/** The town's lender organizations and its record, as the credit engine wrote them. */
function lendersOf(core: CoreState) {
  return {
    organizations: [...core.organizations.values()].filter(
      (o) => o.kind === smallDollar.lenderKind,
    ),
    rows: coreAPI(core).moduleState("credit").table("lenders").rows() as Row[],
  };
}

function applicationsOf(core: CoreState, kind: string) {
  return (
    coreAPI(core).moduleState("credit").table("applications").rows() as Row[]
  ).filter((a) => a.kind === kind);
}

/**
 * What a played world's records say of the lender, kept after the world is
 * let go (three worlds of a year and a half do not fit in one test worker
 * together): its small-dollar loans and their payment rows, the journal
 * entries that lent and repaid them, the web's month rows for the town, the
 * cap's applied rows, the cap in force at the end and the cap rows a body in
 * play (not the test) wrote.
 */
interface Played {
  loans: Row[];
  payments: Map<string, Row[]>;
  journal: Entry[];
  months: Map<string, { id: string; effects: Record<string, number> }>;
  held: ReturnType<typeof appliedOn>;
  cap: number | null;
  lenders: Row[];
  inPlay: InPlayRow[];
  /** The real households each borrowing household stands for (a counted household's weight, else 1): the journal moves a loan's amounts times it. */
  weights: Map<string, number>;
}

interface InPlayRow {
  id: string;
  series: string;
  level: string;
  value: number;
  effectiveDate: string;
}

/**
 * The cap rows a legislature, Congress, the county or the council passed in
 * play since the opening: the outcome web reads a cap as in force where any
 * level's row says yes (lawValue, src/core2/modules/outcome-web.ts), so a row
 * the test's hold put back days later can still stand in a month's cause.
 */
function inPlayRows(core: CoreState, since: string): InPlayRow[] {
  const api = coreAPI(core);
  return [CAP, FEDERAL_CAP].flatMap((series) =>
    (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .query("bySeriesOnly", [series]) as unknown as {
        id: string;
        level: string;
        value: unknown;
        effectiveDate: string;
      }[]
    )
      .filter(
        (row) =>
          row.effectiveDate >= since && !row.id.includes(":lenders-test:"),
      )
      .map((row) => ({
        id: row.id,
        series,
        level: row.level,
        value: Number(row.value),
        effectiveDate: row.effectiveDate,
      })),
  );
}

function played(core: CoreState, journal: Entry[], since: string): Played {
  const api = coreAPI(core);
  const credit = api.moduleState("credit");
  const loans = (credit.table("loans").rows() as Row[])
    .filter((l) => l.kind === "small-dollar")
    .map((l) => ({ ...l }));
  const ids = new Set(loans.map((l) => String(l.id)));
  const payments = new Map<string, Row[]>();
  for (const row of credit.table("payments").rows() as Row[])
    if (ids.has(String(row.loanId)))
      payments.set(String(row.loanId), [
        ...(payments.get(String(row.loanId)) ?? []),
        { ...row },
      ]);
  for (const rows of payments.values())
    rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const town = lawChain(api).townPlaceId;
  const months = new Map(
    (
      api
        .moduleState(OUTCOME_WEB_MODULE_ID)
        .table("months")
        .query("byPlace", [town]) as unknown as {
        id: string;
        effects: Record<string, number>;
      }[]
    ).map((row): [string, { id: string; effects: Record<string, number> }] => [
      row.id,
      { id: row.id, effects: { ...row.effects } },
    ]),
  );
  return {
    loans,
    payments,
    journal,
    months,
    held: appliedOn(api, CAP).map((row) => ({ ...row })),
    cap: lawInForce(api, CAP).value ?? null,
    lenders: (credit.table("lenders").rows() as Row[]).map((r) => ({ ...r })),
    inPlay: inPlayRows(core, since),
    weights: new Map(
      loans.map((loan): [string, number] => {
        const rt = residentsRuntime(core);
        const at = rt?.store.householdOf.get(String(loan.householdId));
        return [
          String(loan.householdId),
          rt && at !== undefined
            ? rt.store.weightOf(rt.store.households[at]!)
            : 1,
        ];
      }),
    ),
  };
}

/** Every small-dollar lend and payment entry as it posts to the journal. */
function watch(core: CoreState): Entry[] {
  const api = coreAPI(core);
  const out: Entry[] = [];
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const ref = entry.sourceRef.id;
    if (
      ref.startsWith("loan:small-dollar:") ||
      ref.startsWith("loan-payment:loan:small-dollar:")
    )
      out.push({ id: entry.id, ref, postings: entry.postings });
    return post(entry);
  };
  return out;
}

/** A question's law enacted (or repealed) in force the day it is passed: the state cap at every level, the federal question at the federal level. */
function flip(core: CoreState, series: string, value: number, tag: string) {
  const api = coreAPI(core);
  for (const level of lawChain(api).levels) {
    if (series === FEDERAL_CAP && level.level !== "federal") continue;
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series,
      value,
      effectiveDate: core.date,
      measureId: `lenders-test:${tag}:${value}`,
      citation:
        "Small-dollar lenders test: the cap flipped in a generated year.",
    });
  }
}

/** How often the test puts a cap back where the world was set if a legislature or Congress changed it in play. */
const HOLD_DAYS = 14;

/**
 * Runs the world forward, holding each cap where the twin sets it: a state's
 * legislature passes or repeals it in play (one drawn world's passed it in
 * its first month), and a twin that does so is no twin. A cap held off is put
 * back when any level's row says yes, as the outcome web reads it, not only
 * the governing one; a cap held on when the governing row says no.
 */
function runTo(core: CoreState, days: number, hold: Record<string, number>) {
  const api = coreAPI(core);
  const until = addDays(makeIsoDate(core.date), days);
  while (core.date < until) {
    advanceCore(
      core,
      [addDays(makeIsoDate(core.date), HOLD_DAYS), until].sort()[0]!,
    );
    for (const [series, value] of Object.entries(hold)) {
      const law = lawInForce(api, series);
      const off =
        value === 0
          ? law.levels.some((level) => Number(level.row?.value ?? 0) === 1)
          : (law.value ?? 0) !== 1;
      if (off) flip(core, series, value, `hold:${core.date}`);
    }
  }
}

const paidTo = (entries: Entry[], loanId: string, lender: string) =>
  entries
    .filter((e) => e.ref.startsWith(`loan-payment:${loanId}:`))
    .map((e) => ({
      id: e.id,
      ref: e.ref,
      amountMinor: e.postings
        .filter((p) => p.accountId.includes(lender) && p.deltaMinor > 0)
        .reduce((n, p) => n + p.deltaMinor, 0),
    }));

describe("the consumer-loan cap reaches the small-dollar lender", () => {
  it(
    `binds the lender's quote where the state lets payday lending operate (seed ${seed})`,
    { timeout: 3_600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let i = 0; i < DRAWS; i += 1) {
          const drawn = drawPlace(seed, `law-wiring-lenders:${i}`);
          const terms = smallDollarTerms(drawn.state);
          if (!terms) {
            passed.push(`${drawn.name}, ${drawn.state}: state ends them`);
            continue;
          }
          let lawWorld: CoreState | null = build(drawn);
          const { organizations } = lendersOf(lawWorld);
          if (!organizations.length) {
            passed.push(`${drawn.name}, ${drawn.state}: too small a town`);
            continue;
          }
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed})`;
          // The lender is one organization record of its own kind, with cash from the sourced volume.
          expect(organizations, where).toHaveLength(1);
          const org = organizations[0]!;
          expect(org.liquidMinor, where).toBeGreaterThan(0);
          expect(org.source.tag, where).toBe("ESTIMATED");
          const opening = org.liquidMinor;
          const other = lendersOf(
            build(
              drawn,
              createHash("sha256")
                .update(drawn.seed + ":b")
                .digest("hex"),
            ),
          ).organizations[0];
          // Two worlds in one place never open on the same volume, within the sourced spread.
          if (other) {
            expect(other.liquidMinor, where).not.toBe(opening);
            const ratio = other.liquidMinor / opening;
            expect(ratio, where).toBeGreaterThan(0.5);
            expect(ratio, where).toBeLessThan(2);
          }
          const begins = lawInForce(coreAPI(lawWorld), CAP).value;
          expect(begins, `${where}: begins without the cap`).toBe(0);
          // Each world is played and read in turn, then let go.
          const play = (
            core: CoreState,
            enact: Record<string, number>,
            hold: Record<string, number>,
          ) => {
            const journal = watch(core);
            const since = core.date;
            for (const [series, value] of Object.entries(enact))
              flip(core, series, value, "enact");
            runTo(core, DAYS, hold);
            return played(core, journal, since);
          };
          const law = play(
            lawWorld,
            { [CAP]: 1 },
            { [CAP]: 1, [FEDERAL_CAP]: 0 },
          );
          lawWorld = null;
          const control = play(
            build(drawn),
            {},
            { [CAP]: 0, [FEDERAL_CAP]: 0 },
          );
          const federal = play(
            build(drawn),
            { [FEDERAL_CAP]: 1 },
            { [CAP]: 0, [FEDERAL_CAP]: 1 },
          );
          expect(law.cap, where).toBe(1);
          // The lender's record, written on the first day: its rate is the state's sourced one.
          expect(law.lenders, where).toHaveLength(1);
          const lender = law.lenders[0]!;
          expect(lender.organizationId, where).toBe(org.id);
          expect(lender.annualRate, where).toBe(terms.annualRate);
          expect(lender.rateTag, where).toBe(terms.tag);
          expect(lender.openingCapitalMinor, where).toBe(opening);
          expect(lender.annualVolumeMinor, where).toBeGreaterThan(0);

          const capped = law.loans;
          const plain = control.loans;
          const federalLoans = federal.loans;
          for (const loan of capped) {
            expect(loan.lenderId, `${where}: ${loan.id}`).toBe(org.id);
            expect(loan.marketAnnualRate, String(loan.id)).toBe(
              terms.annualRate,
            );
            expect(loan.annualRate, String(loan.id)).toBe(
              Math.min(terms.annualRate, CEILING),
            );
            expect(String(loan.rateLawId), String(loan.id)).toContain(CAP);
          }
          // The control and the federal world hold the state cap off: a loan written in the days before the hold put back a cap the state passed in play is capped; every other is at the lender's rate.
          for (const loan of [...plain, ...federalLoans]) {
            expect(loan.lenderId, String(loan.id)).toBe(org.id);
            expect(loan.annualRate, String(loan.id)).toBe(
              loan.rateLawId === null
                ? terms.annualRate
                : Math.min(terms.annualRate, CEILING),
            );
          }
          // The control's loans read the web's factor of one, except a month
          // whose cause a body in play passed (yes on the link's own law)
          // before the hold put it back: the test never moves the control's web.
          const SERIES_OF: Record<string, string> = {
            [STATE_LINK]: CAP,
            [FEDERAL_LINK]: FEDERAL_CAP,
          };
          for (const loan of plain) {
            if (loan.webFactor === 1) continue;
            const links = (loan.webLinks as string[]) ?? [];
            expect(
              links.length,
              `${where}: control ${loan.id}`,
            ).toBeGreaterThan(0);
            for (const link of links)
              expect(
                control.inPlay
                  .filter(
                    (row) => row.series === SERIES_OF[link] && row.value === 1,
                  )
                  .map((row) => row.id),
                `${where}: control ${loan.id} read ${link} at ${loan.webFactor} from ${loan.webRecordId} with no cap passed in play`,
              ).not.toHaveLength(0);
          }
          // The rate chain: a capped loan whose household borrowed the same day in the control, at the lender's rate.
          const twins = new Map(
            plain
              .filter((l) => l.rateLawId === null)
              .map((l): [string, Row] => [String(l.id), l]),
          );
          const first = capped.find((l) => twins.has(String(l.id)));
          if (!first) {
            passed.push(
              `${where}: ${capped.length} capped loans, none with a same-day loan in the control`,
            );
            continue;
          }
          const twin = twins.get(String(first.id))!;
          const termMonths =
            CREDIT_PARAMETERS[
              smallDollar.products[terms.product].termMonthsParameter
            ]!.value;
          const payment = (rate: number, principal: number) =>
            Math.round(
              amortizedPayment(principal, rate, termMonths, (k) =>
                k === "macroMonthsPerYear" ? 12 : CREDIT_PARAMETERS[k]!.value,
              ),
            );
          expect(first.paymentMinor, `${where}: ${first.id}`).toBe(
            payment(CEILING, Number(first.principalMinor)),
          );
          // The control's payment is worked from the control's own principal.
          expect(twin.paymentMinor, `${where}: control ${twin.id}`).toBe(
            payment(terms.annualRate, Number(twin.principalMinor)),
          );
          // Each loan is lent from the lender's cash and paid back to it, on the journal.
          // A counted household's loan row is one household's; the journal moves it times the households it stands for.
          const chain = (world: Played, loan: Row, label: string) => {
            const times = world.weights.get(String(loan.householdId)) ?? 1;
            const lend = world.journal.find((e) => e.ref === loan.id);
            expect(lend, `${where}: the lend entry of ${label}`).toBeDefined();
            expect(
              -lend!.postings
                .filter((p) => p.accountId.includes(org.id) && p.deltaMinor < 0)
                .reduce((n, p) => n + p.deltaMinor, 0),
              `${where}: ${lend!.id} leaves the lender (${loan.principalMinor} times ${times})`,
            ).toBe(Math.round(Number(loan.principalMinor) * times));
            const rowsPaid = world.payments.get(String(loan.id)) ?? [];
            expect(
              rowsPaid.length,
              `${where}: payment rows of ${label}`,
            ).toBeGreaterThan(0);
            const due = rowsPaid[0]!;
            // The first bill is the loan's own payment.
            expect(due.dueMinor, `${where}: ${due.id}`).toBe(loan.paymentMinor);
            const paid = paidTo(world.journal, String(loan.id), org.id).find(
              (e) => e.ref === `loan-payment:${loan.id}:${due.date}`,
            );
            // The journal pays what the payment row says was paid, times the households; a borrower whose cash covered the bill paid it all and is not late.
            expect(
              paid?.amountMinor ?? 0,
              `${where}: ${due.id} (${due.paidMinor} times ${times})`,
            ).toBe(Math.round(Number(due.paidMinor) * times));
            if (Number(due.cashBeforeMinor) >= Number(due.dueMinor)) {
              expect(due.paidMinor, `${where}: ${due.id}`).toBe(due.dueMinor);
              expect(due.standing, `${where}: ${due.id}`).not.toBe("late");
            }
            return { lend: lend!, due, paid, times };
          };
          const lawChainIds = chain(law, first, "capped");
          const twinChainIds = chain(control, twin, "control");
          // Lent the same principal, the capped bill is the smaller one.
          if (first.principalMinor === twin.principalMinor)
            expect(
              Number(lawChainIds.due.dueMinor),
              `${where}: ${lawChainIds.due.id} against ${twinChainIds.due.id}`,
            ).toBeLessThan(Number(twinChainIds.due.dueMinor));

          // The web's factor, as the engine read it where the lender quoted and recorded it on the loan.
          const lent = (world: Played, loan: Row, link: string) => {
            const factor = Number(loan.webFactor);
            expect(factor, `${where}: ${loan.id}`).toBeLessThan(1);
            expect(loan.webLinks as string[], String(loan.id)).toContain(link);
            const month = world.months.get(String(loan.webRecordId));
            expect(month, `${where}: ${loan.webRecordId}`).toBeDefined();
            expect(month!.effects[link], String(loan.webRecordId)).toBeLessThan(
              0,
            );
            // The factor sized the loan: lent below the ask, no more than the ask times the factor.
            expect(Number(loan.principalMinor), String(loan.id)).toBeLessThan(
              Number(loan.askedMinor),
            );
            expect(
              Number(loan.principalMinor),
              String(loan.id),
            ).toBeLessThanOrEqual(Number(loan.askedMinor) * factor + 1);
          };
          const read = capped.find((l) => Number(l.webFactor) < 1);
          // The federal loan's twin is a control loan the web left at one.
          const federalRead = federalLoans.find(
            (l) =>
              Number(l.webFactor) < 1 &&
              twins.get(String(l.id))?.webFactor === 1 &&
              (l.webLinks as string[]).includes(FEDERAL_LINK),
          );
          if (!read || !federalRead) {
            passed.push(
              `${where}: no loan past the web's lag (capped ${capped.filter((l) => Number(l.webFactor) < 1).length}, federal with a control twin ${federalRead ? 1 : 0}, federal ${federalLoans.filter((l) => Number(l.webFactor) < 1).length})`,
            );
            continue;
          }
          lent(law, read, STATE_LINK);
          lent(federal, federalRead, FEDERAL_LINK);
          // The federal world is the control until its link moves: the twin was lent more, at the factor of one.
          const federalTwin = twins.get(String(federalRead.id))!;
          expect(federalTwin.webFactor, String(federalTwin.id)).toBe(1);
          expect(
            Number(federalRead.principalMinor),
            `${where}: ${federalRead.id} against the control's`,
          ).toBeLessThan(Number(federalTwin.principalMinor));
          const federalLend = federal.journal.find(
            (e) => e.ref === federalRead.id,
          );
          const federalTwinLend = control.journal.find(
            (e) => e.ref === federalTwin.id,
          );
          expect(federalLend, String(federalRead.id)).toBeDefined();
          expect(federalTwinLend, String(federalTwin.id)).toBeDefined();
          // The cap held interest back on the law's own record, labeled as such.
          const held = law.held.filter(
            (row) => row.what === "interest-capped" && row.amountMinor > 0,
          );
          expect(
            held.length,
            `${where}: interest the cap held back`,
          ).toBeGreaterThan(0);
          const saved =
            held.find((row) => row.targetId === first.householdId) ?? held[0]!;
          process.stdout.write(
            `LENDERS ${where}: lender ${org.id} (${terms.product} at ${terms.annualRate}, ${terms.source}, volume ${lender.annualVolumeMinor}, cash ${lender.openingCapitalMinor}); ` +
              `rate: household ${first.householdId} (standing for ${lawChainIds.times}), loan ${first.id} principal ${first.principalMinor} at ${first.annualRate} (${first.rateLawId}) lent by ${lawChainIds.lend.id}, bill ${lawChainIds.due.id} due ${lawChainIds.due.dueMinor} paid ${lawChainIds.due.paidMinor} by ${lawChainIds.paid?.id ?? "nothing"}; ` +
              `control ${twin.id} principal ${twin.principalMinor} at ${twin.annualRate} lent by ${twinChainIds.lend.id}, bill ${twinChainIds.due.id} due ${twinChainIds.due.dueMinor} paid ${twinChainIds.due.paidMinor} by ${twinChainIds.paid?.id ?? "nothing"}; ` +
              `web (state cap): loan ${read.id} asked ${read.askedMinor}, lent ${read.principalMinor} at factor ${Number(read.webFactor).toFixed(3)} from ${read.webRecordId} (${(read.webLinks as string[]).join(", ")}); ` +
              `web (federal cap): loan ${federalRead.id} asked ${federalRead.askedMinor}, lent ${federalRead.principalMinor} at factor ${Number(federalRead.webFactor).toFixed(3)} from ${federalRead.webRecordId} (${(federalRead.webLinks as string[]).join(", ")}) by ${federalLend!.id}, against control ${federalTwin.id} asked ${federalTwin.askedMinor}, lent ${federalTwin.principalMinor} at factor 1 by ${federalTwinLend!.id}; ` +
              `${capped.length} capped loans, ${plain.length} in the control, ${federalLoans.length} in the federal world; interest held back ${saved.id} ${saved.amountMinor} (${saved.lawId}); caps passed in play: ${[...law.inPlay, ...control.inPlay, ...federal.inPlay].map((row) => `${row.id} (${row.value})`).join(", ") || "none"}. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had a lender, a capped loan with a control twin and loans past the web's lag: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );

  it(
    `moves no dollar through the bank where the state began with the cap and repeals it (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        for (let i = 0; i < DRAWS; i += 1) {
          const drawn = drawPlace(seed, `law-wiring-lenders-ban:${i}`);
          // Where the state began with the cap there is no lender, in either
          // world: a lender opens only from the starting answer, never from
          // the law in force (SG-WORLD-small-dollar-one-lender), so the claim
          // here is the bank's alone.
          if (smallDollarTerms(drawn.state)) continue;
          const lawWorld = build(drawn);
          const control = build(drawn);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed})`;
          const api = coreAPI(lawWorld);
          // The place began with the cap: the twin that removes it is the one that moves.
          expect(
            lawInForce(api, CAP).value,
            `${where}: begins with the cap`,
          ).toBe(1);
          flip(lawWorld, CAP, 0, "repeal");
          runTo(lawWorld, BAN_DAYS, { [CAP]: 0 });
          runTo(control, BAN_DAYS, { [CAP]: 1 });
          // The bank's loans sit under the ceiling either way: the cap never held a rate down.
          for (const core of [lawWorld, control])
            for (const quote of applicationsOf(core, "personal"))
              expect(quote.annualRate, String(quote.id)).toBe(
                quote.marketAnnualRate,
              );
          const held = appliedOn(coreAPI(control), CAP).filter(
            (row) => row.amountMinor !== 0 || row.what === "interest-capped",
          );
          expect(held, `${where}: no dollar held back by the cap`).toHaveLength(
            0,
          );
          process.stdout.write(
            `LENDERS BAN ${where}: ${applicationsOf(control, "personal").length} bank quotes at their market rate under the cap and ${applicationsOf(lawWorld, "personal").length} without it, no interest held back\n`,
          );
          return;
        }
        throw new Error(`No drawn place began with the cap (seed ${seed})`);
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
