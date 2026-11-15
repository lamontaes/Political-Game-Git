/**
 * A town's police log runs in one outlet, its paper of record: in played
 * months of pinned drawn places with more than one outlet, every printed
 * month's log is in the town's paper of record. A tiny town (seed s12, usual
 * of one or two reports) and a town with a ratio of two over a usual of two
 * (seed s10) have no month the town's own record puts well over its usual (the
 * usual rests on enough months and chance rarely gives a month that busy).
 *
 * Premise changed Nov 15 (the Account lead's yes). The old premise
 * (coordinator ruling, Nov 14) was that a month well over usual also runs in
 * a second outlet, and Lucky LA (seed s23) and Fries VA (seed s19) had to show
 * one. The lead's 07:23Z call replaces it: the town's outlet of record holds
 * the town as its full beat, and any other outlet carries a town's story only
 * when it clears that outlet's own bar for its own audience
 * (press-market-stations-seek-village-candidates). So at Fries a month well
 * over usual runs in the outlet of record, and the market stations do not
 * carry it. Lucky LA no longer has such a month in its 300 days on the train
 * before this change (the Sept and Oct 2025 logs stand at 7 and 4 times usual
 * and are not called well over); that is pool item
 * tests-police-log-lucky-no-month-well-over, so s23 keeps only the checks
 * every place has.
 * Places and seeds are named.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { recordOutletOf } from "../core2/modules/press";
import { buildBenchWorld } from "./world";

// Days played at each pinned place: enough closed months for the case, no more.
const DAYS: Record<string, number> = {
  pl1: 160,
  pl5: 160,
  s10: 160,
  s12: 300,
  s23: 300,
  s19: 250,
};
for (const seed of Object.keys(DAYS))
  it(`the town's log runs in its paper of record (seed ${seed})`, () => {
    const place = drawPlace(seed, "police-log");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const api = coreAPI(core);
    const wire = new Map<string, Record<string, string>>();
    const recordAt = new Map<string, { first: string; ids: Set<string> }>();
    const end = addDays(makeIsoDate(core.date), DAYS[seed]!);
    while (core.date < end) {
      advanceCore(core, [addDays(makeIsoDate(core.date), 7), end].sort()[0]!);
      for (const row of api
        .moduleState("core2-press-v1")
        .table("wire")
        .rows() as unknown as {
        id: string;
        kind: string;
        facts: Record<string, string>;
      }[])
        if (row.kind === "crime.month") {
          wire.set(row.id, row.facts);
          const seen = recordAt.get(row.id) ?? {
            first: core.date,
            ids: new Set<string>(),
          };
          // The outlet of record in the two weeks the month's log is fresh
          // (its reporters can change over the run, and a handoff month may
          // run in both).
          if (core.date <= addDays(makeIsoDate(seen.first), 14))
            seen.ids.add(recordOutletOf(api) ?? "");
          recordAt.set(row.id, seen);
        }
    }
    const outlets = api
      .moduleState("core2-press-v1")
      .table("outlets")
      .rows() as unknown as { id: string; organizationId: string }[];
    expect(
      outlets.filter(
        (o) => o.id.includes("television") || o.id.includes("newspaper"),
      ).length,
      `${where}: needs more than one outlet`,
    ).toBeGreaterThan(1);
    const recordsOf = (source: string) =>
      new Set(
        outlets
          .filter((o) => recordAt.get(source)?.ids.has(o.id))
          .map((o) => o.organizationId),
      );
    const printedBy = new Map<string, Set<string>>();
    for (const story of api
      .moduleState("news")
      .table("stories")
      .rows() as unknown as {
      kind: string;
      outletId: string;
      facts: Record<string, unknown>;
    }[]) {
      if (story.kind !== "press.printed") continue;
      const source = String(story.facts.sourceRecordId);
      if (!source.startsWith("police-log:")) continue;
      const outlet = story.outletId;
      printedBy.set(source, (printedBy.get(source) ?? new Set()).add(outlet));
      const worded = wordPrintedStory(core, story as never);
      appendFileSync(
        path.join(tmpdir(), "printed-police-log-one-outlet-proof.txt"),
        `${where}: TEXT ${source} in ${outlet} vsUsual ${wire.get(source)?.vsUsual ?? "none"}: ${worded?.headline} | ${(worded?.paragraphs ?? [worded?.lede ?? ""]).join(" ")}\n`,
      );
    }
    if (seed !== "s12")
      expect(printedBy.size, `${where}: no log printed`).toBeGreaterThan(0);
    if (seed === "s12")
      // A tiny town: ratios as large as nine over a usual of one or two
      // reports, and no month the town's record calls well over.
      expect(
        [...wire.values()].filter((f) => f.busier === "yes").length,
        `${where}: a tiny town's chance month was called busy`,
      ).toBe(0);
    for (const [source, by] of printedBy) {
      const record = recordsOf(source);
      expect(
        [...record].some((id) => by.has(id)),
        `${where}: ${source} not in the paper of record`,
      ).toBe(true);
      // A month the record does not call well over runs once, in the
      // outlet that was the record when it ran.
      if (wire.get(source)?.busier !== "yes")
        expect(
          [...by],
          `${where}: ${source} (not well over) ran in more than the one outlet of record`,
        ).toHaveLength(1);
      appendFileSync(
        path.join(tmpdir(), "printed-police-log-one-outlet-proof.txt"),
        `${where}: ${source} vsUsual ${wire.get(source)?.vsUsual ?? "none"} in ${[...by].join(", ")} (record ${[...record].join(", ")})\n`,
      );
    }
    if (seed === "s19") {
      const busy = [...printedBy].filter(
        ([source]) => wire.get(source)?.busier === "yes",
      );
      expect(
        busy.length,
        `${where}: no month well over usual was printed`,
      ).toBeGreaterThan(0);
      for (const [source, by] of busy)
        expect(
          [...by],
          `${where}: ${source} (well over usual) ran beyond the outlet of record`,
        ).toEqual([...recordsOf(source)].filter((id) => by.has(id)));
    }
  }, 170_000);
