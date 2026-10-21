/**
 * The federal treasury pays its share of Medicaid expansion each time it
 * falls due: a played year in Guymon, Oklahoma (where the shortfall was
 * found) and in places drawn from all 56 whose law in force expands
 * Medicaid. Each names its place and seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import { federalDebtOf } from "./budgets-treasury";
import { rowsOf } from "./law-reach/group-b-store";
import { coreAPI } from "./state";

const PLACES = 8;
const WANTED = 3;

it(
  "pays the federal share of every covered adult's care each time it falls due",
  () => {
    const tried: string[] = [];
    let witnessed = 0;
    for (let n = 0; n < PLACES && witnessed < WANTED; n++) {
      const draw = n
        ? drawPlace(randomBytes(32).toString("hex"), `federal-medicaid:${n}`)
        : {
            name: "Guymon, Oklahoma",
            key: "4031750",
            seed: "f28d686032d0850a26acef3082270a78f69609b37910a396c2c07c5e2dd13196",
          };
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      const federal = governments(api).find((g) => g.level === "federal")!;
      const accounts = api.accounts();
      const treasury = accounts.main(federal.organizationId);
      const lent = () =>
        federalDebtOf(api).reduce((sum, row) => sum + row.borrowedMinor, 0);
      const lentBefore = lent();
      const balances: number[] = [];
      for (let month = 0; month < 12; month++) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        balances.push(accounts.balance(treasury));
      }
      // Every federal coverage obligation that came due was paid when it did.
      const shares = rowsOf<{
        id: string;
        governmentId: string;
        obligationId: string;
      }>(api, "taken").filter(
        (row) =>
          row.id.startsWith("coverage|") && row.governmentId === federal.id,
      );
      let due = 0;
      let paid = 0;
      for (const row of shares) {
        const obligation = accounts.obligation(row.obligationId)!;
        const cameDue =
          obligation.firstDueAt < core.date &&
          (!obligation.endedAt || obligation.endedAt > obligation.firstDueAt);
        if (!cameDue) continue;
        due += 1;
        expect(
          obligation.paidMinor,
          `${label}: ${row.obligationId} paid ${obligation.paidMinor}`,
        ).toBeGreaterThan(0);
        expect(
          obligation.lastReceipt?.paidMinor,
          `${label}: ${row.obligationId} last payment`,
        ).toBe(obligation.amountMinor);
        paid += obligation.paidMinor;
      }
      tried.push(
        `${label}: ${shares.length} federal coverage shares, ${due} came due, paid ${paid}; treasury low ${Math.min(...balances)}`,
      );
      if (!due) continue;
      witnessed += 1;
      process.stdout.write(
        `federal Medicaid share: ${label}; ${due} came due, paid ${paid}, e.g. ${shares[0]!.obligationId}; treasury balance by month ${balances.join(", ")}; borrowed in the year ${lent() - lentBefore}\n`,
      );
    }
    process.stdout.write(`federal medicaid draws: ${tried.join("; ")}\n`);
    expect(
      witnessed,
      `fewer than ${WANTED} places paid a federal Medicaid share: ${tried.join("; ")}`,
    ).toBe(WANTED);
    // A drawn town's played year took 36 to 184 seconds on a 4-core
    // container; up to PLACES of them.
  },
  PLACES * 300_000,
);
