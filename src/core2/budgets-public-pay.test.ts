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
const place = drawPlace(seed, "budgets-public-pay");

it(`an opening public employer's wages come out of its government's treasury in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  const employers = [...core.organizations.values()].filter(
    (row) => row.publicPayAuthority,
  );
  if (!employers.length) {
    console.log(`WIRED ${place.name} ${seed}: no opening public employer`);
    return;
  }
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
  // A public worker may draw no pay in the window (the worker's own choice);
  // whatever was paid came out of the treasury.
  expect(drawn).toBe(paidByLedger);
  const months = api
    .moduleState(BUDGETS_MODULE_ID)
    .table("treasuryMonths")
    .rows() as unknown as TreasuryMonthRow[];
  expect(months.length).toBeGreaterThan(0);
  for (const row of months)
    expect(Number.isFinite(row.publicPayShortfallMinor)).toBe(true);
  console.log(
    `WIRED ${place.name} ${seed}: ${links.size} authority, ${fromTreasury.size} payday entries, ${drawn} minor from the treasury`,
  );
}, 900_000);
