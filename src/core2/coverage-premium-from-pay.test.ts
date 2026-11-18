import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { outsideAccountOf } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { employerPlansToday } from "./modules/coverage";
import { coreAPI } from "./state";

// A policyholder's premium is taken from each paycheck, full and counted
// alike, so a worker who keeps the job keeps the plan: no plan lapses on the
// 1st because the household's cash ran short that day
// (premiums-from-pay). Pinned: West Union, Ohio, where whole counted groups
// lapsed at once when the premium was charged from pooled cash on the 1st.
const PLACE = { key: "3984294", name: "West Union, Ohio" };
const SEED = "cov-3984294";
const FIRSTS = ["2025-02-01", "2025-03-01", "2025-04-01"] as const;

interface Entry {
  readonly journalId: string;
  readonly toOutsideMinor: number;
  readonly balanced: boolean;
}

it(`premiums come out of pay and no employed policyholder's plan lapses on the 1st (${PLACE.name} [${PLACE.key}], seed ${SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const outside = api.accounts().main(outsideAccountOf(api)!);
  // Every premium entry: a full worker's by its paycheck (premium:<receipt>),
  // a counted wage flow's by the flow's payment (<payment>:health.premium).
  const full: Entry[] = [];
  const counted: Entry[] = [];
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const result = post(entry);
    const sourceId = String(entry.sourceRef.id);
    const into = sourceId.startsWith("premium:")
      ? full
      : sourceId.endsWith(":health.premium")
        ? counted
        : undefined;
    into?.push({
      journalId: entry.id,
      toOutsideMinor: entry.postings
        .filter((line) => line.accountId === outside)
        .reduce((n, line) => n + line.deltaMinor, 0),
      balanced: entry.postings.reduce((n, l) => n + l.deltaMinor, 0) === 0,
    });
    return result;
  };
  const lines: string[] = [];
  for (const day of FIRSTS) {
    full.length = 0;
    counted.length = 0;
    advanceCore(core, makeIsoDate(day));
    const plans = employerPlansToday(api)!;
    lines.push(
      `${day}: ${plans.held.toFixed(0)} of ${plans.slots} plans held, ${plans.lapsed.toFixed(0)} lapsed; ${full.length} full and ${counted.length} counted premium entries`,
    );
    const where = `${PLACE.name}, ${lines.join("\n")}`;
    // The month's paydays took premiums on both tiers, each by a balanced
    // entry whose money reached the insurers' outside account.
    expect(full.length, where).toBeGreaterThan(0);
    expect(counted.length, where).toBeGreaterThan(0);
    for (const entry of [...full, ...counted]) {
      expect(entry.balanced, `${where}: ${entry.journalId}`).toBe(true);
      expect(
        entry.toOutsideMinor,
        `${where}: ${entry.journalId}`,
      ).toBeGreaterThan(0);
    }
    // No plan was skipped at the review for a premium the pay did not cover.
    expect(plans.lapsed, where).toBe(0);
  }
  process.stderr.write(`${lines.join("\n")}\n`);
}, 120_000);
