/**
 * The consumer-loan rate cap reaches the small-dollar lender, in a played
 * world: a place drawn from all 56 on a seed nobody chose, the bench world
 * with every module installed, built twice from the same seed. In one the
 * cap is enacted at every level (repealed where the state began with it); the
 * other is the control.
 *
 * Where the state's law lets payday lending operate, the town has a lender
 * record at the state's sourced rate with a volume drawn around the sourced
 * one, a household in a shortfall that the bank does not lend to borrows from
 * it by its record, the loan's rate is the cap's ceiling and its journalled
 * payment is the capped payment, against the uncapped loan in the control. The
 * outcome web's factor on high-cost lenders (the cap's research link) is read
 * once, where the lender quotes: the quote records it. Where the state ends
 * payday lending there is no lender, and the cap moves no dollar.
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
import { enactLaw, lawChain, lawInForce, webReach } from "./modules/laws";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.LENDERS_SEED ?? randomBytes(20).toString("hex");
const CAP = "us-policy-positions:business-commerce.cap-consumer-loan-rates";
const CEILING = lawParameters.parameters.consumerLoanRateCap.value;
/** Past the cap link's 12-month lag (links.json), to a few monthly closes after it. */
const DAYS = 430;
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

function loansOf(core: CoreState, kind: string) {
  return (
    coreAPI(core).moduleState("credit").table("loans").rows() as Row[]
  ).filter((l) => l.kind === kind);
}

function applicationsOf(core: CoreState, kind: string) {
  return (
    coreAPI(core).moduleState("credit").table("applications").rows() as Row[]
  ).filter((a) => a.kind === kind);
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

/** The cap enacted (or repealed) at every level, in force the day it is passed. */
function flip(core: CoreState, value: number, tag: string) {
  const api = coreAPI(core);
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: CAP,
      value,
      effectiveDate: core.date,
      measureId: `lenders-test:${tag}:${value}`,
      citation:
        "Small-dollar lenders test: the cap flipped in a generated year.",
    });
}

/** How often the test puts the cap back where the world was set if the state's legislature changed it in play. */
const HOLD_DAYS = 14;

/**
 * Runs the world forward, holding the cap at `hold` the way the twin is set:
 * a state's legislature passes or repeals it in play (Hawaii's passed it in
 * the first month of one drawn world), and a twin that does so is no twin.
 */
function runTo(core: CoreState, days: number, hold: number) {
  const api = coreAPI(core);
  const until = addDays(makeIsoDate(core.date), days);
  while (core.date < until) {
    advanceCore(
      core,
      [addDays(makeIsoDate(core.date), HOLD_DAYS), until].sort()[0]!,
    );
    if (lawInForce(api, CAP).value !== hold)
      flip(core, hold, `hold:${core.date}`);
  }
}

const paidTo = (entries: Entry[], loanId: string, lender: string) =>
  entries
    .filter((e) => e.ref.startsWith(`loan-payment:${loanId}:`))
    .map((e) => ({
      id: e.id,
      amountMinor: e.postings
        .filter((p) => p.accountId.includes(lender) && p.deltaMinor > 0)
        .reduce((n, p) => n + p.deltaMinor, 0),
    }));

describe("the consumer-loan cap reaches the small-dollar lender", () => {
  it(
    `binds the lender's quote where the state lets payday lending operate (seed ${seed})`,
    { timeout: 1_800_000 },
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
          const lawWorld = build(drawn);
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
          const control = build(drawn);
          const api = coreAPI(lawWorld);
          const inForce = lawInForce(api, CAP).value === 1;
          expect(inForce, `${where}: begins without the cap`).toBe(false);
          const lawJournal = watch(lawWorld);
          const controlJournal = watch(control);
          flip(lawWorld, 1, "enact");
          runTo(lawWorld, DAYS, 1);
          runTo(control, DAYS, 0);
          expect(lawInForce(api, CAP).value, where).toBe(1);
          // The lender's record, written on the first day: its rate is the state's sourced one.
          const rows = lendersOf(lawWorld).rows;
          expect(rows, where).toHaveLength(1);
          const lender = rows[0]!;
          expect(lender.organizationId, where).toBe(org.id);
          expect(lender.annualRate, where).toBe(terms.annualRate);
          expect(lender.rateTag, where).toBe(terms.tag);
          expect(lender.openingCapitalMinor, where).toBe(opening);
          expect(lender.annualVolumeMinor, where).toBeGreaterThan(0);

          const capped = loansOf(lawWorld, "small-dollar");
          const plain = loansOf(control, "small-dollar");
          if (!capped.length) {
            passed.push(`${where}: no household borrowed in a year`);
            continue;
          }
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
          // A loan the control's own state passed the cap for in play is capped; every other is at the lender's rate.
          for (const loan of plain) {
            expect(loan.lenderId, String(loan.id)).toBe(org.id);
            expect(loan.annualRate, String(loan.id)).toBe(
              loan.rateLawId === null
                ? terms.annualRate
                : Math.min(terms.annualRate, CEILING),
            );
          }
          const uncapped = plain.filter((l) => l.rateLawId === null);
          // The loan is lent from the lender's cash and paid back to it, on the journal.
          const first = capped[0]!;
          const lend = lawJournal.find((e) => e.ref === first.id);
          expect(lend, `${where}: the lend entry of ${first.id}`).toBeDefined();
          expect(
            lend!.postings.some(
              (p) => p.accountId.includes(org.id) && p.deltaMinor < 0,
            ),
            `${where}: ${lend!.id} leaves the lender`,
          ).toBe(true);
          // The cap's payment against the same loan's uncapped one in the control.
          const termMonths =
            CREDIT_PARAMETERS[
              smallDollar.products[terms.product].termMonthsParameter
            ]!.value;
          const twin = uncapped.find((l) => l.id === first.id);
          const payment = (rate: number, principal: number) =>
            amortizedPayment(principal, rate, termMonths, (k) =>
              k === "macroMonthsPerYear" ? 12 : CREDIT_PARAMETERS[k]!.value,
            );
          const cappedDue = payment(CEILING, Number(first.principalMinor));
          const uncappedDue = payment(
            terms.annualRate,
            Number(first.principalMinor),
          );
          expect(first.paymentMinor, `${where}: ${first.id}`).toBe(
            Math.round(cappedDue),
          );
          expect(Math.round(cappedDue), where).toBeLessThan(
            Math.round(uncappedDue),
          );
          const lawPays = paidTo(lawJournal, String(first.id), org.id);
          expect(
            lawPays.length,
            `${where}: payments of ${first.id}`,
          ).toBeGreaterThan(0);
          let twinNote = "the control's household did not borrow that day";
          if (twin) {
            expect(twin.paymentMinor, where).toBe(Math.round(uncappedDue));
            const twinPays = paidTo(controlJournal, String(first.id), org.id);
            expect(twinPays.length, where).toBeGreaterThan(0);
            expect(lawPays[0]!.amountMinor, `${where}: first payment`).not.toBe(
              twinPays[0]!.amountMinor,
            );
            twinNote = `control payment ${twinPays[0]!.id} ${twinPays[0]!.amountMinor}`;
          }
          // The web's factor is read where the lender quotes, and recorded on the quote.
          const quotes = applicationsOf(lawWorld, "small-dollar");
          const plainQuotes = applicationsOf(control, "small-dollar");
          expect(quotes.length, where).toBeGreaterThan(0);
          for (const quote of quotes) {
            expect(typeof quote.webFactor, String(quote.id)).toBe("number");
            expect(
              quote.webFactor as number,
              String(quote.id),
            ).toBeLessThanOrEqual(1);
          }
          for (const quote of plainQuotes)
            expect(
              quote.webFactor as number,
              String(quote.id),
            ).toBeLessThanOrEqual(1);
          const town = lawChain(api).townPlaceId;
          const reach = webReach(api, town, "finance.high-cost-loans");
          const reachControl = webReach(
            coreAPI(control),
            town,
            "finance.high-cost-loans",
          );
          expect(reach.factor, `${where}: the web's link ran`).toBeLessThan(1);
          expect(reach.factor, where).toBeLessThan(reachControl.factor);
          // The cap saved the borrower interest each month, on the law's own record.
          const saved = appliedOn(api, CAP).filter(
            (row) => row.amountMinor > 0,
          );
          expect(
            saved.length,
            `${where}: interest the cap held back`,
          ).toBeGreaterThan(0);
          process.stdout.write(
            `LENDERS ${where}: lender ${org.id} (${terms.product} at ${terms.annualRate}, ${terms.source}, volume ${lender.annualVolumeMinor}, cash ${lender.openingCapitalMinor}); household ${first.householdId}, loan ${first.id}: ${CEILING} under the cap against ${terms.annualRate} without, lend ${lend!.id}, payment ${lawPays[0]!.id} ${lawPays[0]!.amountMinor}, ${twinNote}; ${capped.length} capped loans against ${plain.length} in the control; web factor ${reach.factor.toFixed(3)} (${reach.recordId}) against ${reachControl.factor}; interest held back ${saved[0]!.id} ${saved[0]!.amountMinor}. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had a lender and a borrower: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );

  it(
    `has no lender where the state ends payday lending, and the cap moves no dollar (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        for (let i = 0; i < DRAWS; i += 1) {
          const drawn = drawPlace(seed, `law-wiring-lenders-ban:${i}`);
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
          flip(lawWorld, 0, "repeal");
          runTo(lawWorld, BAN_DAYS, 0);
          runTo(control, BAN_DAYS, 1);
          for (const core of [lawWorld, control]) {
            const { organizations, rows } = lendersOf(core);
            expect(organizations, `${where}: no lender`).toHaveLength(0);
            expect(rows, where).toHaveLength(0);
            expect(loansOf(core, "small-dollar"), where).toHaveLength(0);
            expect(applicationsOf(core, "small-dollar"), where).toHaveLength(0);
            // The bank's loans sit under the ceiling either way: the cap never held a rate down.
            for (const quote of applicationsOf(core, "personal"))
              expect(quote.annualRate, String(quote.id)).toBe(
                quote.marketAnnualRate,
              );
          }
          const held = appliedOn(coreAPI(control), CAP).filter(
            (row) => row.amountMinor !== 0 || row.what === "interest-capped",
          );
          expect(held, `${where}: no dollar held back by the cap`).toHaveLength(
            0,
          );
          process.stdout.write(
            `LENDERS BAN ${where}: no small-dollar lender in either world, ${applicationsOf(control, "personal").length} bank quotes at their market rate under the cap and ${applicationsOf(lawWorld, "personal").length} without it, no interest held back\n`,
          );
          return;
        }
        throw new Error(`No drawn place ended payday lending (seed ${seed})`);
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
