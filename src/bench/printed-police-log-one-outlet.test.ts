/**
 * A town's police log runs in one outlet, its paper of record: in played
 * months of drawn places with more than one outlet, every printed month's log
 * is in the town's paper of record, a month the record does not call well
 * over runs once, and a month it does call well over runs in the paper of
 * record and nowhere beyond it (the town's outlet of record holds the town as
 * its full beat; any other outlet carries a town's story only when it clears
 * that outlet's own bar for its own audience, press-market-stations-seek-
 * village-candidates).
 *
 * Premise changed (CTO, Nov 19, "approved as proposed"): the two outcomes the
 * test used to claim of pinned worlds, that a tiny town (s12) has no month the
 * record calls busier and that Fries (s19) has one printed, were what chance
 * gave those worlds. The history from 1925 gives the places other months, so
 * the rule is read as relationships at every place: the months called busier
 * have a lower chance on the wire than every month not called busier (among
 * those whose usual rests on enough months), and a busier month that was
 * printed ran in the paper of record. A place with no busier month printed is
 * named in the output, and across all the places at least one must turn up.
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
let busyChecked = 0;
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
    // How the record calls a month against its town's usual is one rule at
    // every place: among months whose usual rests on enough months (the wire
    // carries `usual` only then), the ones called busier have a lower chance
    // than every one not called busier.
    const judged = [...wire.values()].filter((f) => f.usual && f.chance);
    const busier = judged
      .filter((f) => f.busier === "yes")
      .map((f) => +f.chance!);
    const calm = judged
      .filter((f) => f.busier !== "yes")
      .map((f) => +f.chance!);
    if (busier.length && calm.length)
      expect(
        Math.max(...busier),
        `${where}: a month called busier has a lower chance than every month not called busier`,
      ).toBeLessThan(Math.min(...calm));
    process.stdout.write(
      `police-log ${where}: ${wire.size} months, ${busier.length} called busier, ${calm.length} not\n`,
    );
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
    // A busier month that was printed ran in the paper of record and nowhere
    // beyond it. A place with none is named, not failed.
    const busyPrinted = [...printedBy].filter(
      ([source]) => wire.get(source)?.busier === "yes",
    );
    for (const [source, by] of busyPrinted)
      expect(
        [...by],
        `${where}: ${source} (well over usual) ran beyond the outlet of record`,
      ).toEqual([...recordsOf(source)].filter((id) => by.has(id)));
    busyChecked += busyPrinted.length;
    if (!busyPrinted.length)
      process.stdout.write(
        `police-log ${where}: no busier month was printed here\n`,
      );
  }, 170_000);

// Across every place above, at least one busier month turned up printed and
// was checked: the test never passes on nothing.
it("a busier month was printed and checked at some place", () => {
  expect(busyChecked).toBeGreaterThan(0);
});
