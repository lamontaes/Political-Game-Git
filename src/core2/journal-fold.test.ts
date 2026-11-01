/**
 * Pool item core-long-run-cash-receipts-year. The cash journal's itemized
 * receipts fold past their readers' windows, in a played world: the bench
 * world in a place drawn from all 56 (set JOURNAL_FOLD_SEED to reproduce the
 * draw), with one followed resident outside the player's household under the
 * player clock for its first five weeks (so the sources it was paid by stay
 * required, as the player's do in real play), then played on to the 1st of
 * March of the next year, when the monthly fold (decision-detail.ts) folds
 * what is older than cashJournalDetailDays.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { findRecord } from "../bench/dev-trace";
import { whyPanels } from "../bench/dev-why";
import { setBookkeeping } from "./bookkeeping";
import { foldOldCashJournalDetail } from "./decision-detail";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { parameter } from "./parameters";
import { worldRecords } from "./snapshot";
import type { CashJournalReceipt } from "./journal-state";
import type { CoreState } from "./types";

const base = process.env.JOURNAL_FOLD_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(
  createHash("sha256").update(base).digest("hex"),
  "journal-fold",
);
const where = `${place.name} (${place.key}), seed ${place.seed}, base ${base}`;
const JOURNAL_ID = /^journal:\d{4}-\d{2}-\d{2}:\d+$/;

/** Every journal id a kept record names, anywhere the world keeps records but the journal itself. */
function namedJournalIds(core: CoreState): Set<string> {
  const out = new Set<string>();
  const seen = new Set<object>();
  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      for (const part of value.split(" "))
        if (JOURNAL_ID.test(part)) out.add(part);
      return;
    }
    if (!value || typeof value !== "object" || seen.has(value)) return;
    if (ArrayBuffer.isView(value)) return;
    seen.add(value);
    if (value instanceof Map)
      for (const [key, item] of value) {
        walk(key);
        walk(item);
      }
    else if (value instanceof Set || Array.isArray(value))
      for (const item of value) walk(item);
    else for (const item of Object.values(value)) walk(item);
  };
  const world = worldRecords(core);
  for (const [field, value] of Object.entries(world.core))
    if (field !== "cashJournal") walk(value);
  for (const [moduleId, store] of world.modules)
    for (const name of Object.keys(
      core.modules.get(moduleId)?.state?.tables ?? {},
    ))
      walk(store.table(name).rows());
  walk(world.parts);
  return out;
}

const followedOwners = (receipt: CashJournalReceipt) =>
  receipt.retention.focusOwnerIds;

it(`the cash journal folds itemized receipts past their readers' windows and keeps what is still read (${where})`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const journal = core.cashJournal;
  const player = core.playerId!;
  const household = () =>
    new Set([
      player,
      ...(core.households.get(core.people.get(player)!.householdId)
        ?.memberIds ?? []),
    ]);
  let home = household();

  // A working resident of the town outside the household, followed and
  // under the player clock until a source it is paid by stays required (the
  // player's own do in real play). A resident paid only in an employer's
  // group payroll is not, so the next one takes the clock.
  const requiredOf = (personId: string) =>
    [...journal.requiredBySource.values()]
      .flatMap((ids) => [...ids.values()])
      .filter((id) =>
        journal.detailedReceipts
          .get(id)
          ?.retention.focusOwnerIds.includes(personId),
      ).length;
  const candidates = world.residents
    .filter((r) => r.jobId && !home.has(r.id) && core.people.get(r.id)?.alive)
    .sort(
      (a, b) =>
        Number(core.focusPersonIds.has(b.id)) -
          Number(core.focusPersonIds.has(a.id)) || a.id.localeCompare(b.id),
    )
    .slice(0, 6);
  expect(candidates.length, where).toBeGreaterThan(0);
  const clock = new BenchPlayer(core, world.director);
  let circle = candidates[0]!;
  for (const candidate of candidates) {
    circle = candidate;
    core.focusPersonIds.add(circle.id);
    clock.select(circle.id);
    for (let week = 0; week < 6 && !requiredOf(circle.id); week++) {
      if (clock.pollingPlace) clock.leavePolls();
      let result = clock.advance("week");
      for (let guard = 0; result.packet.kind !== "complete"; guard++) {
        expect(guard, where).toBeLessThan(10_000);
        if (clock.pollingPlace) clock.leavePolls();
        result = {
          ...result,
          ...(result.packet.kind === "choice"
            ? clock.resume({
                kind: "choice",
                pauseId: result.packet.pauseId,
                offerId: result.packet.offers[0]!.offerId,
              })
            : clock.resume({ kind: "stop", pauseId: result.packet.pauseId })),
        };
      }
    }
    if (requiredOf(circle.id)) break;
  }
  clock.release();
  const controlledUntil = core.date;
  expect(requiredOf(circle.id), `${where} ${circle.id}`).toBeGreaterThan(0);

  // The checked fold is the first on a 1st after everything paid under the
  // clock is older than the window; play runs to the day before it.
  const detailDays = parameter("cashJournalDetailDays", core.data.parameters);
  const next = new Date(
    `${addDays(makeIsoDate(controlledUntil), detailDays)}T00:00:00Z`,
  );
  next.setUTCMonth(next.getUTCMonth() + 1, 1);
  const foldDay = makeIsoDate(next.toISOString().slice(0, 10));
  advanceCore(core, addDays(foldDay, -1));
  const before = addDays(foldDay, -detailDays);
  const startYear = Number(gameStartDate().slice(0, 4));
  const priorYear = `${Number(foldDay.slice(0, 4)) - 1}-01-01`;
  const householdSince = priorYear < before ? priorYear : before;
  home = household();
  const named = namedJournalIds(core);
  const namedKept = [...named].filter((id) => journal.detailedReceipts.has(id));
  const old = [...journal.detailedReceipts.values()].filter(
    (r) => r.date < before,
  );
  const required = old.filter((r) => r.retention.requiredBySource);
  const ofHousehold = old.filter(
    (r) =>
      !r.retention.requiredBySource &&
      r.date >= householdSince &&
      followedOwners(r).some((id) => home.has(id)),
  );
  const toFold = old.filter(
    (r) =>
      !r.retention.requiredBySource &&
      !r.retention.observer &&
      !named.has(r.id) &&
      !ofHousehold.includes(r),
  );
  const foldedBefore = structuredClone(journal.foldedByOwner);
  const expected = new Map<
    string,
    { in: number; out: number; count: number }
  >();
  for (const receipt of toFold)
    for (const ownerId of followedOwners(receipt)) {
      const key = `${ownerId}|${receipt.date.slice(0, 4)} ${receipt.sourceRef.kind}`;
      const row = expected.get(key) ?? { in: 0, out: 0, count: 0 };
      const change = receipt.owners.get(ownerId)!;
      const delta = change.afterMinor - change.beforeMinor;
      if (delta >= 0) row.in += delta;
      else row.out -= delta;
      row.count += 1;
      expected.set(key, row);
    }
  console.log(
    `${where}: on ${core.date}, ${journal.detailedReceipts.size} receipts kept, ${old.length} dated before ${before}: ${toFold.length} to fold, ${required.length} still required (the resident controlled to ${controlledUntil}), ${ofHousehold.length} the player's household's from ${householdSince}, ${named.size} journal ids named by kept records (${namedKept.length} resolve)`,
  );
  expect(toFold.length, where).toBeGreaterThan(0);
  expect(required.length, where).toBeGreaterThan(0);
  expect(ofHousehold.length, where).toBeGreaterThan(0);

  // The 1st: the day's fold runs in play.
  advanceCore(core, foldDay);
  // An old circle receipt is gone, from the journal and from every index.
  const indexed = new Set<string>();
  for (const [ownerId, ids] of journal.detailedByOwner) {
    expect(ids.size, `${where} ${ownerId}`).toBeGreaterThan(0);
    for (const id of ids) {
      expect(journal.detailedReceipts.has(id), `${where} ${id}`).toBe(true);
      indexed.add(id);
    }
  }
  for (const receipt of toFold) {
    expect(
      journal.detailedReceipts.has(receipt.id),
      `${where} ${receipt.id}`,
    ).toBe(false);
    expect(indexed.has(receipt.id), `${where} ${receipt.id}`).toBe(false);
  }
  // Each folded receipt is in its owner's total for its kind and year.
  for (const [key, row] of expected) {
    const [ownerId, totalKey] = key.split("|") as [string, string];
    const prior = foldedBefore.get(ownerId)?.get(totalKey);
    const now = journal.foldedByOwner.get(ownerId)?.get(totalKey);
    expect(now, `${where} ${key}`).toBeDefined();
    expect(now!.inMinor - (prior?.inMinor ?? 0), `${where} ${key}`).toBe(
      row.in,
    );
    expect(now!.outMinor - (prior?.outMinor ?? 0), `${where} ${key}`).toBe(
      row.out,
    );
    expect(now!.count - (prior?.count ?? 0), `${where} ${key}`).toBe(row.count);
  }
  // What a source still requires (an open obligation), the household's
  // prior-year receipts and every receipt a kept record names stay, indexed.
  for (const receipt of [...required, ...ofHousehold]) {
    expect(
      journal.detailedReceipts.has(receipt.id),
      `${where} ${receipt.id}`,
    ).toBe(true);
    for (const ownerId of followedOwners(receipt))
      expect(
        journal.detailedByOwner.get(ownerId)?.has(receipt.id),
        `${where} ${ownerId} ${receipt.id}`,
      ).toBe(true);
  }
  for (const id of namedKept)
    expect(journal.detailedReceipts.has(id), `${where} ${id}`).toBe(true);

  // Folding again the same day changes nothing, and no total moves.
  const state = () =>
    JSON.stringify(
      {
        ids: [...journal.detailedReceipts.keys()],
        byOwner: journal.detailedByOwner,
        folded: journal.foldedByOwner,
        totals: journal.totals,
        totalsByOwner: journal.totalsByOwner,
        required: journal.requiredBySource,
      },
      (_key, value: unknown) =>
        value instanceof Map || value instanceof Set
          ? [...value]
          : typeof value === "bigint"
            ? `${value}n`
            : value,
    );
  const once = state();
  expect(foldOldCashJournalDetail(core), where).toBe(0);
  expect(state(), where).toBe(once);

  // Dev mode reads the folded year: the resident's ledger lists its totals.
  const [ledger] = whyPanels(core, circle.id, findRecord(core, circle.id));
  expect(
    ledger!.rows.some((row) => row.label.includes(`${startYear} total:`)),
    `${where} ${circle.id}`,
  ).toBe(journal.foldedByOwner.has(circle.id));
  console.log(
    `${where}: on ${core.date}, ${journal.detailedReceipts.size} receipts kept, ${[...journal.foldedByOwner.values()].reduce((n, rows) => n + rows.size, 0)} yearly totals for ${journal.foldedByOwner.size} people`,
  );
}, 1_800_000);
