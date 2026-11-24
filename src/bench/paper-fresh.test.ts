import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { freshSince } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { heardItems } from "./calendar";
import { buildBenchWorld } from "./world";

// The first paper prints only news fresh on its date, by the news engine's
// own window (newsMaxAgeDays); what the player heard before that stays in
// the archive (agreements/3-4.md; words-opening-paper-only-fresh-news).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the first paper prints only stories still news on its date, in three drawn places (seed ${seed})`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 3; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "paper-fresh");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const since = freshSince(coreAPI(core));
    const worded = heardItems(core, playerId!).filter(
      (row) => "headline" in row || "lede" in row,
    );
    // The paper, as the night's paper reads it: the fresh ones.
    const paper = worded.filter((row) => row.fresh);
    for (const row of paper)
      expect(
        row.date >= since && row.date <= core.date,
        `${where}: ${row.id} on ${row.date}`,
      ).toBe(true);
    // Every older story is kept for the archive, not lost.
    for (const row of worded.filter((item) => !item.fresh))
      expect(row.date < since, `${where}: ${row.id}`).toBe(true);
    // Kinds by the record each story reports (an archived story keeps its
    // record's kind).
    const kinds = new Set(
      paper.map((row) => String(row.facts?.recordKind ?? row.kind)),
    );
    const said = (row: (typeof worded)[number]) =>
      ("headline" in row && row.headline) || ("lede" in row && row.lede);
    console.log(
      `paper-fresh: ${where}, ${core.date}: ${paper.length} of ${worded.length} stories fresh (since ${since}), ${kinds.size} kinds (${[...kinds].join(", ")}); front "${paper[0] ? said(paper[0]) : "none"}"; foot "${paper.at(-1) ? said(paper.at(-1)!) : "none"}"; before, the foot was "${worded.at(-1) ? said(worded.at(-1)!) : "none"}" (${worded.at(-1)?.date ?? "none"})`,
    );
  }
}, 1_200_000);
