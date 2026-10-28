/**
 * Every story the press prints in play reaches News in the English engine's
 * words (words-live-news-worded): a headline or a first sentence composed
 * from the record it was printed from, citing that record, never a record
 * kind or a field. Two played worlds (buildBenchWorld, every module): a place
 * drawn from all 56 run for a year, and a place drawn from Ohio's run into
 * January 2026, when the state's scheduled minimum wage takes effect. Seed
 * from GOLDEN_PATH_SEED (random when unset), printed with the place.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { EntityId } from "../core2/kernel/brands";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lawInForce } from "../core2/modules/laws";
import { storiesHeard } from "../core2/modules/news";
import { placeLocalities } from "../core2/places";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { wordPrintedStory } from "./archive-words";
import { heardItems } from "./calendar";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

/** Words a player must never read in a story: a record id, a key, a raw slot. */
const DEVELOPER = /[{}_]|\b[a-z]+:[a-z]|\b(?:press|printed|record)\.[a-z]/;

describe("printed stories in News", () => {
  it("words every story the press prints in a year, and a resident hears them worded", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "printed-words");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    console.log(`printed-words: ${where}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const printed = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        kind: string;
        date: string;
        topic?: string;
        facts: Record<string, unknown>;
      }[]
    ).filter((story) => story.kind === "press.printed");
    expect(printed.length, where).toBeGreaterThan(0);
    const unworded: string[] = [];
    const withBody: string[] = [];
    for (const story of printed) {
      const worded = wordPrintedStory(core, story);
      if (!worded) {
        unworded.push(String(story.facts.sourceRecordId));
        continue;
      }
      // Cited by the story it words and the record that story was printed from.
      expect(worded.sourceRecordIds, where).toContain(story.id);
      expect(worded.sourceRecordIds, where).toContain(
        String(story.facts.sourceRecordId),
      );
      for (const text of [worded.headline, worded.lede])
        if (text)
          expect(text, `${story.id} in ${where}`).not.toMatch(DEVELOPER);
      // A story with a body prints the lede first, then sentences that each
      // say something new.
      if (worded.paragraphs) {
        withBody.push(worded.paragraphs.join(" "));
        expect(worded.paragraphs[0], `${story.id} in ${where}`).toBe(
          worded.lede,
        );
        expect(new Set(worded.paragraphs).size).toBe(worded.paragraphs.length);
        for (const text of worded.paragraphs)
          expect(text, `${story.id} in ${where}`).not.toMatch(DEVELOPER);
      }
    }
    // News prints stories, not only briefs: some of the year's stories carry a body.
    console.log(
      `printed-words bodies: ${withBody.length} of ${printed.length}; e.g. ${withBody.slice(0, 3).join(" || ")}`,
    );
    expect(
      withBody.length,
      `${where}: no printed story has a body`,
    ).toBeGreaterThan(0);
    // Which records went unworded, so a new kind of story is named at once.
    if (unworded.length)
      console.log(
        `printed-words unworded: ${[...new Set(unworded)].join(", ")}`,
      );
    expect(unworded, where).toEqual([]);
    // What News lists for the resident who heard the most printed stories.
    const heard = new Map<string, number>();
    for (const person of core.people.values())
      if (person.alive)
        heard.set(
          person.id,
          storiesHeard(api, person.id as PersonId).filter(
            (story) => story.kind === "press.printed",
          ).length,
        );
    const [reader] = [...heard].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0]!;
    const rows = heardItems(core, reader).filter(
      (row) => row.kind === "press.printed",
    );
    console.log(
      `printed-words: ${printed.length} printed stories worded; ${reader} heard ${heard.get(reader)}, News lists ${rows.length}, first: ${rows[0] && "headline" in rows[0] ? rows[0].headline : ""}`,
    );
    expect(rows.length, where).toBeGreaterThan(0);
    for (const row of rows)
      expect(
        ("headline" in row && row.headline) || ("lede" in row && row.lede),
        `${row.id} in ${where}`,
      ).toBeTruthy();
  }, 900_000);

  it("words Ohio's minimum wage change from the law in force before and after", () => {
    setBookkeeping(false);
    const hash = createHash("sha256").update(`${seed}:ohio`).digest("hex");
    const localities = [...placeLocalities("US-OH")].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    const town =
      localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
    const where = `${town.displayName} (${town.key}), seed ${seed}`;
    console.log(`printed-words ohio: ${where}`);
    const world = buildBenchWorld(hash, gameStartDate(), {
      twoLevel: true,
      placeKey: town.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    advanceCore(core, makeIsoDate("2026-01-02"));
    const changes = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "law-took-effect" &&
        (row as { facts?: Record<string, string> }).facts?.series ===
          "minimum-wage" &&
        (row as { facts?: Record<string, string> }).facts?.jurisdiction ===
          "US-OH",
    ) as unknown as {
      id: string;
      date: string;
      facts: Record<string, string>;
    }[];
    // The state's scheduled wage for 2026 takes effect in every Ohio world.
    expect(changes.length, where).toBeGreaterThan(0);
    const dollars = (minor: number) => `$${(minor / 100).toFixed(2)}`;
    for (const change of changes) {
      // The story as an outlet would print it: the press keeps the source
      // record's facts and its id.
      const story = {
        id: `printed:test:${change.id}`,
        kind: "press.printed",
        date: change.date,
        topic: "minimum-wage",
        facts: { ...change.facts, sourceRecordId: change.id },
      };
      const worded = wordPrintedStory(core, story);
      const before = lawInForce(
        api,
        "minimum-wage",
        addDays(makeIsoDate(change.date), -1),
      ).value as number;
      const after = lawInForce(api, "minimum-wage", change.date)
        .value as number;
      console.log(
        `printed-words ohio: ${change.id} (${dollars(before)} to ${dollars(after)}): ${worded?.headline} / ${worded?.lede}`,
      );
      expect(worded?.sourceRecordIds, where).toContain(change.id as EntityId);
      const text = `${worded?.headline ?? ""} ${worded?.lede ?? ""}`;
      expect(text, where).toContain(dollars(after));
      expect(text, where).toMatch(/minimum wage/);
      if (before !== after)
        expect(worded?.lede ?? "", where).toContain(dollars(before));
    }
  }, 900_000);
});
