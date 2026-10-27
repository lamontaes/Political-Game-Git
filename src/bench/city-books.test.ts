import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { budgetView } from "./budget";
import { buildBenchWorld } from "./world";

// Budgets shows what each treasury actually took in, paid out and holds, read
// from the cash journal: after a played quarter in a drawn place, the town's
// three figures are the journal's sums for its accounts, and what it holds is
// what it took in less what it paid out.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the town's books on Budgets are its treasury journal's sums after a played quarter", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "city-books");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 91));
    const town = budgetView(core, playerId!).governments.find(
      (gov) => gov.level === "city",
    );
    if (!town?.books) {
      tried.push(`${where}: no town treasury with journal entries`);
      continue;
    }
    const journal = core.cashJournal;
    const totals = journal.totalsByOwner.get(town.organizationId)!;
    expect(town.books.takenInMinor, where).toBe(totals.grossCreditMinor);
    expect(town.books.paidOutMinor, where).toBe(totals.grossDebitMinor);
    const accounts = coreAPI(core).accounts();
    let held = 0;
    for (const id of journal.accountsByOwner.get(town.organizationId) ?? [])
      held += accounts.balance(id);
    expect(town.books.cashMinor, where).toBe(held);
    // The journal balances: the treasury holds what it took in less what it paid out.
    expect(town.books.cashMinor, where).toBe(
      town.books.takenInMinor - town.books.paidOutMinor,
    );
    expect(town.books.since, where).toBe(gameStartDate());
    console.log(
      `${where}: ${town.name} took in ${town.books.takenInMinor}, paid out ${town.books.paidOutMinor}, holds ${town.books.cashMinor} (cents) over ${town.books.entries} journal entries`,
    );
    return;
  }
  throw new Error(`no drawn town had treasury books: ${tried.join("; ")}`);
}, 1_200_000);
