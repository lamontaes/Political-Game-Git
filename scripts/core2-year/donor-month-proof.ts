/**
 * A donor's month in a played world: every named donor's gifts to all the
 * campaigns in one calendar month against what that donor had to give from
 * (`giftBudget`), read off the cash journal by id. Also what each race's
 * campaigns raised, and the time the year took.
 * Run: node --import tsx scripts/core2-year/donor-month-proof.ts <seed> <placeKey> [days]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { setJournalTrace } from "../../src/core2/journal-state";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { campaignFor, giftBudget } from "../../src/core2/modules/campaigns";

setBookkeeping(false);
const seed = process.argv[2] ?? "survey-a";
const placeKey = process.argv[3];
const days = Number(process.argv[4] ?? 365);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core = world.core;
const api = coreAPI(core);
console.log(`${world.place.displayName}, seed ${seed}, ${days} days`);

type Month = { gifts: number; givenMinor: number; spareMinor: number };
const months = new Map<string, Month>();
const donors = new Set<string>();
const candidatesByDonor = new Map<string, Set<string>>();
const raceTotals = new Map<string, number>();
let gifts = 0;
setJournalTrace((entry) => {
  if (entry.sourceRef.kind === "campaigns:donation") {
    const parts = entry.sourceRef.id.split(":");
    const donorId = parts[parts.length - 3];
    const filingId = parts.slice(1, parts.length - 3).join(":");
    const donor = core.people.get(donorId!);
    const amount = entry.postings.find((row) => row.deltaMinor > 0)!.deltaMinor;
    if (donor && filingId && donorId) {
      const key = `${donorId}|${api.state.date.slice(0, 7)}`;
      let month = months.get(key);
      if (!month) {
        // The first gift of the month sees the whole month: nothing is given yet.
        const budget = giftBudget(api, donor);
        month = {
          gifts: 0,
          givenMinor: 0,
          spareMinor: budget.discretionaryMinor + budget.savingsMinor,
        };
        months.set(key, month);
      }
      month.gifts += 1;
      month.givenMinor += amount;
      gifts += 1;
      donors.add(donorId);
      const candidate = campaignFor(api, filingId).candidateId;
      const set = candidatesByDonor.get(donorId) ?? new Set<string>();
      set.add(candidate);
      candidatesByDonor.set(donorId, set);
      const contest = campaignFor(api, filingId).contestId;
      raceTotals.set(contest, (raceTotals.get(contest) ?? 0) + amount);
    }
  }
});

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const started = Date.now();
dev.advance(addDays(makeIsoDate(core.date), days));
const ms = Date.now() - started;

const over = [...months.values()].filter((m) => m.givenMinor > m.spareMinor);
const perDonor = [...candidatesByDonor.values()].map((s) => s.size);
const $ = (minor: number) => (minor / 100).toFixed(0);
console.log(
  `gifts ${gifts} from ${donors.size} donors; ${months.size} donor-months, ${over.length} gave more than that month's spare (discretionary plus savings beyond cushion at the first gift)`,
);
console.log(
  `candidates per donor ${(perDonor.reduce((n, v) => n + v, 0) / Math.max(1, perDonor.length)).toFixed(1)}; most a donor-month gave past its spare: $${$(Math.max(0, ...over.map((m) => m.givenMinor - m.spareMinor)))}`,
);
const total = [...raceTotals.values()].reduce((n, v) => n + v, 0);
console.log(
  `named donors gave $${$(total)} across ${raceTotals.size} races: ${[...raceTotals.entries()].map(([id, v]) => `${id} $${$(v)}`).join("; ")}`,
);
console.log(
  `journal entries ${core.cashJournal.nextSequence}; ${ms} ms for ${days} days`,
);
