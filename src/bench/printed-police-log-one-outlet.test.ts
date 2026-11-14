/**
 * A town's police log runs in one outlet, its paper of record (coordinator
 * ruling, Nov 14): in played months of pinned drawn places with more than one
 * outlet, every printed month's log is in the town's paper of record, and in
 * another outlet only in a month the town's own record puts well over its
 * usual (the usual rests on enough months and chance rarely gives a month that
 * busy). A tiny town (seed s12, usual of one or two reports) and a town with a ratio of
 * two over a usual of two (seed s10) have no such month; Lucky LA (seed s23)
 * has two, and both run in a second outlet.
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
    if (seed === "s23") {
      const wide = [...printedBy].filter(
        ([source, by]) => wire.get(source)?.busier === "yes" && by.size > 1,
      );
      expect(
        wide.length,
        `${where}: no month well over usual ran in a second outlet`,
      ).toBeGreaterThan(0);
    }
  }, 900_000);
