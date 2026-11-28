import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { treasuryMonthsOf } from "../../../src/core2/budgets-treasury";
import { gameStartDate } from "../../../src/core2/game-start";
import type { CashJournalInput } from "../../../src/core2/journal";
import { setJournalTrace } from "../../../src/core2/journal-state";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import { governments, openBudgets } from "../../../src/core2/modules/budgets";
import { coreAPI } from "../../../src/core2/state";

it("opens balanced treasury stocks once and spends them in an ordinary played year", () => {
  const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const draw = drawPlace(replay, "opening-treasuries-year");
  const where = `${draw.name} [${draw.key}], replay ${replay}`;
  console.log(JSON.stringify({ phase: "drawn", replay, draw }));
  const deposits: CashJournalInput[] = [];
  const previousBookkeeping = setBookkeeping(false);
  setJournalTrace((input) => {
    if (input.sourceRef.id.startsWith("opening-treasury:"))
      deposits.push(structuredClone(input));
  });
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    setJournalTrace(null);
    const api = coreAPI(core);
    const govs = governments(api);
    for (const gov of govs) {
      expect(gov.openingCash, `${where}: ${gov.id}`).toBeDefined();
      const entries = deposits.filter(
        (p) => p.sourceRef.id === `opening-treasury:${gov.id}`,
      );
      if (gov.openingCash!.minor === 0) {
        expect(entries, where).toHaveLength(0);
        continue;
      }
      expect(entries, where).toHaveLength(1);
      expect(
        entries[0]!.postings.reduce((sum, p) => sum + p.deltaMinor, 0),
        where,
      ).toBe(0);
      expect(
        entries[0]!.postings.find(
          (p) => p.accountId === api.accounts().main(gov.organizationId),
        )?.deltaMinor,
        where,
      ).toBe(gov.openingCash!.minor);
    }
    // Retention only: no law, vote, revenue, benefit or payment is supplied.
    core.observer = true;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const evidence = govs.map((gov) => {
      const firstClose = treasuryMonthsOf(api, gov.id)[0];
      expect(
        firstClose?.paymentIds.length,
        `${where}: ${gov.id} first close`,
      ).toBeGreaterThan(0);
      const receipts = [...core.cashJournal.detailedReceipts.values()].filter(
        (r) => {
          const payer = r.owners.get(gov.organizationId);
          return payer && payer.afterMinor < payer.beforeMinor;
        },
      );
      const named = receipts.flatMap((r) =>
        [...r.owners.values()]
          .filter(
            (o) => core.people.has(o.ownerId) && o.afterMinor > o.beforeMinor,
          )
          .map((o) => ({
            journal: r.id,
            source: r.sourceRef,
            person: o.ownerId,
            name: `${core.people.get(o.ownerId)!.givenName} ${core.people.get(o.ownerId)!.familyName}`,
            minor: o.afterMinor - o.beforeMinor,
          })),
      );
      const used = receipts.find(
        (r) =>
          r.owners.get(gov.organizationId)!.afterMinor < gov.openingCash!.minor,
      );
      return {
        government: gov.id,
        opening: gov.openingCash,
        firstClose,
        namedPayments: named.length,
        payee: named[0],
        reserveUse: used
          ? {
              journal: used.id,
              source: used.sourceRef,
              cash: used.owners.get(gov.organizationId),
            }
          : null,
      };
    });
    expect(
      evidence.reduce((sum, row) => sum + row.namedPayments, 0),
      where,
    ).toBeGreaterThan(0);
    expect(
      evidence.some((row) => row.reserveUse !== null),
      where,
    ).toBe(true);
    console.log(
      JSON.stringify({
        phase: "year",
        where,
        worldSeed: core.seed,
        through: core.date,
        deposits,
        evidence,
      }),
    );
    // The existing calendar rejects a second opening; it must not deposit again first.
    const balances = govs.map(
      (g) => core.organizations.get(g.organizationId)!.liquidMinor,
    );
    const sequence = core.cashJournal.nextSequence;
    expect(() => openBudgets(core)).toThrow(
      "Duplicate institutional calendar key.",
    );
    expect(
      govs.map((g) => core.organizations.get(g.organizationId)!.liquidMinor),
      where,
    ).toEqual(balances);
    expect(core.cashJournal.nextSequence, where).toBe(sequence);
  } finally {
    setJournalTrace(null);
    setBookkeeping(previousBookkeeping);
  }
}, 1_200_000);
