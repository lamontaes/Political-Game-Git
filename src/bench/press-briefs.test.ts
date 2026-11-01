/**
 * The town paper's side column (owner, Oct 29: side stories for realism, "a
 * line or two", not clickable; OWNER-DECISIONS Oct 29 17:40 UTC). In a played
 * year of a place drawn from all 56, the local paper prints the town's own
 * records as briefs: the month's police log, the school year's results, new
 * businesses, homes, births. Each is worded as a brief (a headline and one
 * line, never a body) and cites the record it was printed from; the
 * whole-town ones (the police log, the school results) are printed whenever
 * the town recorded them, and a week with none prints none.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import briefs from "../core2/data/press/briefs.json" with { type: "json" };
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("the paper prints the town's records as briefs, each worded and cited", () => {
  const place = drawPlace(seed, "press-briefs");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const kinds = new Set(briefs.kinds);
  const townWide = new Set(briefs.townWide);
  // Every brief item the wire carried in the year, read weekly (the wire
  // forgets what has aged out).
  const onWire = new Map<string, string>();
  const end = addDays(makeIsoDate(core.date), 365);
  while (core.date < end) {
    advanceCore(core, [addDays(makeIsoDate(core.date), 7), end].sort()[0]!);
    for (const row of api
      .moduleState("core2-press-v1")
      .table("wire")
      .rows() as unknown as { id: string; kind: string }[])
      if (kinds.has(row.kind)) onWire.set(row.id, row.kind);
  }
  const printed = (
    api.moduleState("news").table("stories").rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, unknown>;
    }[]
  ).filter(
    (story) =>
      story.kind === "press.printed" &&
      onWire.has(String(story.facts.sourceRecordId)),
  );
  const byKind = new Map<string, number>();
  const examples: string[] = [];
  for (const story of printed) {
    const source = String(story.facts.sourceRecordId);
    const worded = wordPrintedStory(core, story);
    expect(worded, `${where}: ${story.id} is worded`).not.toBeNull();
    // A brief: a headline and one line, never a body.
    expect(worded!.brief, `${where}: ${story.id}`).toBe(true);
    expect(worded!.paragraphs, `${where}: ${story.id}`).toBeUndefined();
    expect(worded!.sourceRecordIds, where).toContain(story.id);
    expect(worded!.sourceRecordIds, where).toContain(source);
    const kind = onWire.get(source)!;
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
    // One example of each kind, as the paper printed it.
    if (byKind.get(kind) === 1)
      examples.push(`${source}: "${worded!.headline}" / "${worded!.lede}"`);
  }
  // The whole town's records reach the column whenever the town kept them.
  for (const [id, kind] of onWire)
    if (townWide.has(kind))
      expect(
        printed.some((story) => story.facts.sourceRecordId === id),
        `${where}: ${id} was on the wire and never printed`,
      ).toBe(true);
  // The proof, by place, seed and record id (the runner keeps no console).
  appendFileSync(
    path.join(tmpdir(), "press-briefs-proof.txt"),
    `press-briefs: ${where}: ${printed.length} briefs (${[...byKind].map(([kind, n]) => `${kind} ${n}`).join(", ")}); e.g. ${examples.join(" || ")}\n`,
  );
  expect(printed.length, `${where}: no brief printed`).toBeGreaterThan(0);
}, 1_200_000);
