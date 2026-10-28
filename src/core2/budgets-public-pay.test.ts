import { OUTSIDE_MARKET_KIND } from "./opening-outside-market";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { TreasuryMonthRow } from "./budgets-treasury";
import { BUDGETS_MODULE_ID } from "./modules/budgets";
import { publicPayTreasuries } from "./public-work-pay";
import { coreAPI } from "./state";

// The opening's public employers draw their wages from their own
// government's treasury (owner, Oct 15): the wage leaves the treasury's
// account on the journal, and what the treasury couldn't cover is a record
// the month's close carries.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
/** The recorded repro of the empty case: Alega, American Samoa, whose opening holds no public employer. */
const EMPTY_SEED = "f3d402dc6d11da2e";
const DRAWS = 6;

interface Payroll {
  readonly where: string;
  readonly employers: number;
  /** Live work commitments on the employers' authorities at the opening. */
  readonly commitments: number;
  readonly paydays: number;
  readonly drawn: number;
  readonly short: number;
  readonly ledger: number;
}

/** One drawn world: the opening's public employers, and ninety days of what their treasuries paid. */
function play(drawSeed: string, label: string, playIt: boolean): Payroll {
  const place = drawPlace(drawSeed, label);
  const where = `${place.name} (${place.key}), seed ${drawSeed}, world ${place.seed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  const employers = [...core.organizations.values()].filter(
    // A government's own employers; the outside account's authority is paid by no treasury.
    (row) => row.publicPayAuthority && row.kind !== OUTSIDE_MARKET_KIND,
  );
  const empty = {
    where,
    employers: employers.length,
    commitments: 0,
    paydays: 0,
    drawn: 0,
    short: 0,
    ledger: 0,
  };
  if (!employers.length) return empty;
  const links = publicPayTreasuries(core);
  for (const employer of employers)
    expect(links.has(employer.publicPayAuthority!.id), employer.id).toBe(true);
  // What the treasuries paid out on each authority's own commitments.
  const commitments = new Map(
    employers.flatMap((employer) =>
      employer.publicPayAuthority!.workCommitmentIds.map(
        (id) => [id, employer.publicPayAuthority!.id] as const,
      ),
    ),
  );
  const live = [...commitments.keys()].filter(
    (id) => core.work.commitments.get(id)?.endsAt === undefined,
  ).length;
  // The world is eligible from its opening records (an employer with a live
  // worker), never from what play produced.
  if (!playIt || !live) return { ...empty, commitments: live };
  const fromTreasury = new Map<string, number>();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    if (entry.sourceRef.kind === "work-payroll") {
      const commitment = [...commitments.keys()].find((id) =>
        entry.sourceRef.id.includes(id),
      );
      const treasury = commitment
        ? links.get(commitments.get(commitment)!)?.treasuryId
        : undefined;
      for (const posting of entry.postings)
        if (
          treasury &&
          posting.accountId.includes(treasury) &&
          posting.deltaMinor < 0
        )
          fromTreasury.set(
            entry.sourceRef.id,
            (fromTreasury.get(entry.sourceRef.id) ?? 0) - posting.deltaMinor,
          );
    }
    return post(entry);
  };
  advanceCore(core, addDays(makeIsoDate(core.date), 90));
  const paidByLedger = [...commitments.keys()].reduce(
    (n, id) =>
      n + (core.work.payrollLedgerByCommitment.get(id)?.paidMinor ?? 0),
    0,
  );
  const drawn = [...fromTreasury.values()].reduce((a, b) => a + b, 0);
  // What a treasury couldn't cover on a payday, the authority paid and
  // recorded against that payday's due (src/core2/public-work-pay.ts).
  let short = 0;
  for (const employer of employers)
    for (const [due, row] of links.get(employer.publicPayAuthority!.id)!
      .shortfalls) {
      expect(
        [...commitments.keys()].some((id) => due.includes(id)),
        due,
      ).toBe(true);
      short += row.amountMinor;
    }
  // Whatever was paid came out of the treasury or is a recorded shortfall.
  expect(
    drawn + short,
    `${where}: treasury draws plus recorded shortfall`,
  ).toBe(paidByLedger);
  const months = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("treasuryMonths")
    .rows() as unknown as TreasuryMonthRow[];
  expect(months.length).toBeGreaterThan(0);
  for (const row of months)
    expect(Number.isFinite(row.publicPayShortfallMinor)).toBe(true);
  // The month's close carries what a treasury couldn't cover.
  if (short)
    expect(months.some((row) => row.publicPayShortfallMinor > 0)).toBe(true);
  return {
    where,
    employers: employers.length,
    commitments: live,
    paydays: fromTreasury.size,
    drawn,
    short,
    ledger: paidByLedger,
  };
}

// The opening's public employers draw their wages from their own
// government's treasury (owner, Oct 15): the wage leaves the treasury's
// account on the journal, and what the treasury couldn't cover is a record
// the month's close carries.
it(`an opening public employer's wages come out of its government's treasury, in a drawn place (seed ${seed})`, () => {
  const passedOver: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const result = play(`${seed}:${draw}`, "budgets-public-pay", true);
    if (!result.employers || !result.commitments) {
      passedOver.push(
        `${result.where}: ${result.employers} public employers, ${result.commitments} live workers at the opening`,
      );
      continue;
    }
    // Positive coverage: a worker was paid, and the whole sum is accounted for.
    expect(result.ledger, `${result.where}: payroll ledger`).toBeGreaterThan(0);
    expect(
      result.paydays + (result.short > 0 ? 1 : 0),
      `${result.where}: a payday from the treasury or a recorded shortfall`,
    ).toBeGreaterThan(0);
    console.log(
      `WIRED ${result.where}: ${result.employers} employers, ${result.paydays} payday entries, ${result.drawn} minor from the treasury, ${result.short} recorded short, ledger ${result.ledger}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a public employer with a live worker: ${passedOver.join("; ")}`,
  );
}, 1_800_000);

// The empty case is a negative input stated outright: a world with no public
// employer holds no authority to pay, and it is not the positive case above.
it("a world whose opening has no public employer holds no authority a treasury must fund (Alega, American Samoa)", () => {
  const result = play(EMPTY_SEED, "budgets-public-pay", false);
  expect(
    result.employers,
    `${result.where}: opening public employers (zero is the recorded case)`,
  ).toBe(0);
}, 900_000);
