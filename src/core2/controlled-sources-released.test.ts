/**
 * A controlled person's payroll and cash-act sources are released once the next
 * one posts (pool item core-long-run-controlled-sources-required-forever). In a
 * drawn place (replay with CONTROLLED_SOURCES_SEED) a working adult of the town
 * is played on the player clock for 120 days, and the cash journal's
 * required-by-source table is read at day 60 and at day 120: it must stop
 * growing, so there is at most one required receipt per commitment rather than
 * one per payday. The place and seed are in every message; the test draws more
 * places, up to a bound, until it finds a worker. It then plays the town on to
 * the first of the month past the journal's detail days and checks, per source
 * id, that every receipt released under the clock folded into its owner's yearly
 * total, while the latest receipt of each commitment is still required and kept.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { parameter } from "./parameters";
import { advancePlayerV1, resumePlayerV1, retirePlayerV1 } from "./player-v1";
import type { CoreState, PersonId } from "./types";

const base =
  process.env.CONTROLLED_SOURCES_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const HALF = 60;

/**
 * The kinds of source this change governs: the work engine's payroll and
 * cash-act sources (the kinds its own rows carry). Other engines' sources (a
 * household's lease, say) are released by their own engines.
 */
const workKinds = (core: CoreState) =>
  new Set<string>([
    core.data.cashActSourceKind,
    ...[...core.work.payrollCashSources.values()].map((r) => r.kind),
    ...[...core.work.cashSources.values()].map((r) => r.kind),
  ]);

/** How many work sources the cash journal still requires. */
const requiredCount = (core: CoreState) => {
  const kinds = workKinds(core);
  let n = 0;
  for (const [kind, byId] of core.cashJournal.requiredBySource)
    if (kinds.has(kind)) n += byId.size;
  return n;
};

/** Every source the journal requires: source id to its kind and receipt id. */
const requiredSources = (core: CoreState) => {
  const out = new Map<string, { kind: string; receiptId: string }>();
  for (const [kind, byId] of core.cashJournal.requiredBySource)
    for (const [id, receiptId] of byId) out.set(id, { kind, receiptId });
  return out;
};

/** The player's clock, lived to `days` after the start, answering what it asks. */
function liveTo(core: CoreState, personId: PersonId, days: number) {
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: {
      date: addDays(makeIsoDate(gameStartDate()), days),
      minuteOfDay: 0,
    },
  });
  while (packet.kind !== "complete") {
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, {
            kind: "choice",
            pauseId: packet.pauseId,
            offerId: packet.offers[0]!.offerId,
          });
  }
}

it(`a controlled worker's required sources stop growing with each payday (seed ${base})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const seed = createHash("sha256")
      .update(`${base}:${attempt}`)
      .digest("hex");
    const place = drawPlace(seed, "controlled-sources");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const was = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const town = core.people.get(world.playerId as PersonId)!.placeId;
      // A working adult of the town: a full person with a work commitment today.
      const worker = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.tier !== "husk" &&
            p.placeId === town &&
            (core.work.commitmentsByPerson.get(p.id)?.size ?? 0) > 0,
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!worker) {
        tried.push(`${where}: no worker`);
        continue;
      }
      const personId = worker.id as PersonId;
      const commitments = core.work.commitmentsByPerson.get(personId)!.size;
      // A played person is a followed one: its receipts are itemized for the window.
      core.focusPersonIds.add(personId);
      liveTo(core, personId, HALF);
      const half = requiredCount(core);
      const atHalf = requiredSources(core);
      liveTo(core, personId, 2 * HALF);
      const full = requiredCount(core);
      const atFull = requiredSources(core);
      // Two months of paydays (about four biweekly) would add at least that many
      // rows if each stayed required; a released source adds none.
      expect(
        full - half,
        `${where}: ${personId} (${commitments} commitments): required sources at day ${HALF} ${half}, at day ${2 * HALF} ${full}`,
      ).toBeLessThanOrEqual(commitments);
      console.log(
        `controlled-sources: ${where}; ${personId}, ${commitments} commitments, required sources ${half} at day ${HALF} and ${full} at day ${2 * HALF}`,
      );

      // Per source id: what was required at day 60 and is not at day 120 was
      // released under the clock; its receipt must fold on the first of the
      // month past the detail days, unless a household or a kept record holds it.
      const kinds = workKinds(core);
      const released = [...atHalf].filter(
        ([id, r]) => !atFull.has(id) && kinds.has(r.kind),
      );
      expect(
        released.length,
        `${where}: sources released between days`,
      ).toBeGreaterThan(0);
      const journal = core.cashJournal;
      const releasedReceipts = released.map(([id, r]) => ({
        id,
        receiptId: r.receiptId,
        receipt: journal.detailedReceipts.get(r.receiptId),
      }));
      const keptAtRelease = releasedReceipts.filter((r) =>
        journal.detailedReceipts.has(r.receiptId),
      );
      expect(
        keptAtRelease.length,
        `${where}: released receipts still itemized at day ${2 * HALF}`,
      ).toBeGreaterThan(0);
      const home = new Set<string>([
        core.playerId!,
        ...(core.households.get(core.people.get(core.playerId!)!.householdId)
          ?.memberIds ?? []),
      ]);
      expect(
        home.has(personId),
        `${where}: ${personId} is the player's household`,
      ).toBe(false);
      const stillKept = keptAtRelease;
      const detailDays = parameter(
        "cashJournalDetailDays",
        core.data.parameters,
      );
      // The first 1st past the detail days of the oldest released receipt that
      // is itemized now: the monthly fold takes it then (decision-detail.ts).
      const oldest = keptAtRelease.map((r) => r.receipt!.date).sort()[0]!;
      const next = new Date(`${addDays(oldest, detailDays)}T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1, 1);
      const foldDay = makeIsoDate(next.toISOString().slice(0, 10));
      const latestIds = [...atFull.keys()];
      // At day 120, still under the clock: per commitment (a group receipt
      // stands for the person's whole payday) exactly the latest payroll source
      // is required and its receipt is itemized; the ones before it are not.
      const payrollKey = (row: {
        group?: unknown;
        result: unknown;
      }): string => {
        const result = row.result as { commitmentId?: string };
        return row.group ? "group" : `${result.commitmentId}`;
      };
      const mine = [...core.work.payrollCashSources.values()].filter(
        (row) => (row.result as { personId?: string }).personId === personId,
      );
      const byCommitment = new Map<string, string[]>();
      for (const row of mine)
        byCommitment.set(payrollKey(row), [
          ...(byCommitment.get(payrollKey(row)) ?? []),
          row.id,
        ]);
      const requiredPayroll = [...atFull.keys()].filter((id) =>
        id.startsWith("work-payroll:"),
      );
      for (const [commitment, ids] of byCommitment) {
        const latest = [...ids].sort().at(-1)!;
        const asked = ids.filter((id) => atFull.has(id));
        expect(
          asked,
          `${where}: payroll sources of ${commitment} required at day ${2 * HALF}: ${ids.join(", ")}`,
        ).toEqual([latest]);
        expect(
          journal.detailedReceipts.has(atFull.get(latest)!.receiptId),
          `${where}: latest source ${latest} receipt is not itemized`,
        ).toBe(true);
      }
      expect(
        requiredPayroll.length,
        `${where}: required payroll sources ${requiredPayroll.join(", ")} against ${byCommitment.size} commitments`,
      ).toBeLessThanOrEqual(byCommitment.size);
      retirePlayerV1(core);
      advanceCore(core, addDays(foldDay, -1));
      const keptBefore = keptAtRelease.filter((r) =>
        journal.detailedReceipts.has(r.receiptId),
      );
      advanceCore(core, foldDay);
      // Receipts dated before the window the fold applies on its day.
      const windowStart = addDays(foldDay, -detailDays);
      const keptAfter = keptAtRelease.filter(
        (r) =>
          r.receipt!.date < windowStart &&
          journal.detailedReceipts.has(r.receiptId),
      );
      console.log(
        `controlled-sources fold: ${where}; ${personId}, ${released.length} released source ids (${released.map(([id]) => id).join(", ")}), ${stillKept.length} receipts kept at release, ${keptBefore.length} kept on ${addDays(foldDay, -1)}, ${keptAfter.length} kept on ${foldDay}; ${latestIds.length} sources required at day ${2 * HALF}, payroll among them ${requiredPayroll.join(", ")}, ${byCommitment.size} commitments with a payroll row`,
      );
      expect(
        keptBefore.length,
        `${where}: released receipts must still be itemized the day before the fold ${foldDay}`,
      ).toBeGreaterThan(0);
      expect(
        keptAfter.map((r) => `${r.id}->${r.receiptId}`),
        `${where}: released source ids whose receipts did not fold on ${foldDay}`,
      ).toEqual([]);
      return;
    } finally {
      setBookkeeping(was);
    }
  }
  throw new Error(
    `no drawn place had a controlled worker: ${tried.join("; ")} (seed ${base})`,
  );
}, 3_600_000);
