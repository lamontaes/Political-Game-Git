/**
 * The player's household money in a played year: it rises with pay and falls
 * through living costs, rent and other contracts, and the taxes withheld, each
 * entry a journal record by id. No new sink: this checks the ones built.
 * Played world, a place drawn from all 56 whose player's household has an
 * earner at the start (the one without is pool item
 * core-player-household-no-income); the place and seed are named in every
 * failure message. Set GOLDEN_PATH_SEED (and GOLDEN_PATH_PLACE_KEY) to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const named = process.env.GOLDEN_PATH_PLACE_KEY;

it("a played year moves the player's household money through pay, living costs, contracts and taxes", () => {
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < (named ? 1 : 8); attempt++) {
      // The golden-path runner names the place and seed; otherwise one is drawn.
      const draw = named
        ? { key: named, seed }
        : drawPlace(seed, `player-money-year:${attempt}`);
      const { core, playerId } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const where = `${draw.key} (${core.placeMetadata.placeName}), seed ${draw.seed}`;
      const me = core.people.get(playerId!)!;
      const members = [...core.households.get(me.householdId)!.memberIds];
      if (!named && !members.some((id) => core.people.get(id)?.jobId)) continue;
      const accounts = new Set(
        members
          .map((id) => core.cashJournal.residualAccountByOwner.get(id))
          .filter((id): id is string => id !== undefined),
      );
      // Recorded at the start: does any contract name the household as payer?
      const contracted = [...core.finance.contracts.values()].some((c) =>
        c.payerIds.some((id) => members.includes(id)),
      );
      const flows = new Map<
        string,
        { inMinor: number; outMinor: number; entries: string[] }
      >();
      const post = api.postJournal.bind(api);
      api.postJournal = (entry) => {
        for (const posting of entry.postings)
          if (accounts.has(posting.accountId)) {
            const kind = `${entry.sourceRef.kind} ${String(entry.sourceRef.id).split(/[:@]/)[0]}`;
            const row = flows.get(kind) ?? {
              inMinor: 0,
              outMinor: 0,
              entries: [],
            };
            if (posting.deltaMinor > 0) row.inMinor += posting.deltaMinor;
            else row.outMinor -= posting.deltaMinor;
            if (row.entries.length < 2) row.entries.push(entry.sourceRef.id);
            flows.set(kind, row);
          }
        return post(entry);
      };
      const liquid = () =>
        members.reduce(
          (n, id) => n + (core.people.get(id)?.liquidMinor ?? 0),
          0,
        );
      const months: number[] = [liquid()];
      for (let month = 0; month < 12; month++) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        months.push(liquid());
      }
      if (process.env.PLAYER_MONEY_PROOF)
        writeFileSync(
          process.env.PLAYER_MONEY_PROOF,
          JSON.stringify({
            where,
            household: members,
            liquidByMonthMinor: months,
            flows: Object.fromEntries(flows),
          }),
        );
      const total = (kind: string, side: "inMinor" | "outMinor") =>
        flows.get(kind)?.[side] ?? 0;
      // Pay comes in; living costs, housing and withholding go out. The
      // housing route is the one the household's records require: a household
      // that a contract names as payer (rent, a mortgage, bills) settles it; one
      // with no contract owns its home and pays its property tax. A household
      // with a contract cannot pass on its property tax alone, nor an owner on
      // someone else's contract.
      expect(
        total("work-payroll work-payroll", "inMinor"),
        where,
      ).toBeGreaterThan(0);
      expect(
        total("accounts.transfer living", "outMinor"),
        where,
      ).toBeGreaterThan(0);
      if (contracted)
        expect(
          total("finance.contract-settlement finance", "outMinor"),
          `${where}: the household's recorded contracts are settled`,
        ).toBeGreaterThan(0);
      else
        expect(
          total("accounts.transfer property-tax", "outMinor"),
          `${where}: an owner household with no contract pays property tax`,
        ).toBeGreaterThan(0);
      expect(
        total("budgets:withholding withholding", "outMinor"),
        where,
      ).toBeGreaterThan(0);
      // The balance rises and falls: some month up, some month down.
      const steps = months.slice(1).map((value, i) => value - months[i]!);
      expect(
        steps.some((step) => step > 0),
        where,
      ).toBe(true);
      expect(
        steps.some((step) => step < 0),
        where,
      ).toBe(true);
      // Every dollar balances.
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      return;
    }
    throw new Error(
      `no place with an earning household in 8 draws (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
