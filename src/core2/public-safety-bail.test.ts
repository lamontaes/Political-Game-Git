/**
 * Counted defendants who post bail move money as a full person does (pool
 * item gov-counted-bail-moves-the-cash; one model, two tiers). Where cash
 * bail is in force, each month's batch case takes the bail of every counted
 * group's share that can post from the group's fund into the prosecuting
 * county's court escrow, and the escrow hands it back to the funds in the
 * month the justice engine decides the case. A place is drawn from all 56 for one played year of
 * the bench world; a place with cash bail ended is passed over and named. Set
 * COUNTED_BAIL_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedCases, escrowOf, type CountedCaseRow } from "./modules/justice";
import { coreAPI } from "./state";

const ATTEMPTS = 4;

it("a counted group's posted bail leaves its fund for the court escrow and comes back when the batch case closes, each a journal entry", () => {
  const base = process.env.COUNTED_BAIL_SEED ?? randomBytes(8).toString("hex");
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const seed = `${base}:${attempt}`;
    const place = drawPlace(seed, "counted-bail");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    // Each bail move's journal entry, as the journal writer posts it.
    const entries = new Map<
      string,
      {
        journalId: string;
        date: string;
        postings: readonly { accountId: string; deltaMinor: number }[];
      }
    >();
    setJournalTrace((input) => {
      if (input.sourceRef.id.startsWith("public-safety:bail"))
        entries.set(input.sourceRef.id, {
          journalId: input.id,
          date: input.date,
          postings: input.postings,
        });
    });
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      // The counted cases the justice engine filed from public safety's arrests.
      const cases = [
        ...countedCases(api, "charged"),
        ...countedCases(api, "decided"),
      ];
      const adult = cases.filter((c) => c.court === "adult");
      if (adult.length && adult.every((c) => c.bailLawId)) {
        passed.push(`${where}: cash bail ended by ${adult[0]!.bailLawId}`);
        continue;
      }
      const posted = adult.filter((c) => c.bailHeld);
      expect(
        posted.length,
        `${where}: no adult batch case posted bail of ${adult.length}`,
      ).toBeGreaterThan(0);
      const closed = posted.filter((c) => c.status === "decided");
      expect(
        closed.length,
        `${where}: a case with bail closed`,
      ).toBeGreaterThan(0);
      for (const c of closed) {
        const held = Object.values(c.bailHeld!).reduce((n, m) => n + m, 0);
        const escrow = escrowOf(api, c.bailTreasuryId!);
        const out = entries.get(`public-safety:bail:${c.id}`);
        const back = entries.get(`public-safety:bail-return:${c.id}`);
        expect(
          out,
          `${where}: no journal entry for ${c.id}'s bail`,
        ).toBeDefined();
        expect(
          back,
          `${where}: no journal entry for ${c.id}'s return`,
        ).toBeDefined();
        // Into the escrow from the groups' funds, and the same back out.
        const into = out!.postings.find((p) => p.accountId === escrow);
        const from = back!.postings.find((p) => p.accountId === escrow);
        expect(into?.deltaMinor, `${where}: ${out!.journalId}`).toBe(held);
        expect(from?.deltaMinor, `${where}: ${back!.journalId}`).toBe(-held);
        for (const [group, minor] of Object.entries(c.bailHeld!)) {
          const paid = out!.postings.find(
            (p) => p.deltaMinor === -minor && p.accountId.startsWith("fund:"),
          );
          expect(paid, `${where}: group ${group} paid ${minor}`).toBeDefined();
          expect(
            back!.postings.find((p) => p.accountId === paid!.accountId)
              ?.deltaMinor,
            `${where}: ${paid!.accountId} repaid`,
          ).toBe(minor);
        }
        // Returned in the month the case came due, not before.
        expect(back!.date.slice(0, 7) >= c.dueMonth, `${where}: ${c.id}`).toBe(
          true,
        );
      }
      // The case that held the most, and the year's total held.
      const sum = (c: CountedCaseRow) =>
        Object.values(c.bailHeld!).reduce((n, m) => n + m, 0);
      const first = [...closed].sort((x, y) => sum(y) - sum(x))[0]!;
      const total = posted.reduce((n, c) => n + sum(c), 0);
      // A batch case stands for the expected arrests of one month, offense
      // and age band, so its count is a fraction of a person in a small town.
      const defendants = posted.reduce((n, c) => n + c.count, 0);
      const out = entries.get(`public-safety:bail:${first.id}`)!;
      const back = entries.get(`public-safety:bail-return:${first.id}`)!;
      const groups = Object.keys(first.bailHeld!).length;
      const held = sum(first);
      console.log(
        `COUNTED-BAIL ${where}: ${posted.length} of ${adult.length} adult batch cases posted bail, ${total} cents in all, in cases standing for ${defendants.toFixed(2)} expected defendants (most of whom cannot post); the largest, ${first.id}, took ${held} cents from ${groups} groups' funds into ${escrowOf(api, first.bailTreasuryId!)} as ${out.journalId} on ${out.date}, returned as ${back.journalId} on ${back.date} (due ${first.dueMonth}); passed over: ${passed.join("; ") || "none"}`,
      );
      return;
    } finally {
      setJournalTrace(null);
      setBookkeeping(was);
    }
  }
  throw new Error(`No drawn place held counted bail: ${passed.join("; ")}`);
}, 3_600_000);
