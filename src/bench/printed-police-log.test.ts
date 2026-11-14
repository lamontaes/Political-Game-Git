/**
 * The police log's space slides with how far the month stands from the town's
 * own usual (Words lead, Nov 14). In a played eleven months of four pinned
 * drawn places, every month's wire item after the town's second closed month
 * carries the month over its usual, and the paper prints a log only while its
 * month has space: a month at or under the floor of usual is never printed,
 * and a month over usual that is printed carries its body. Places and seeds
 * are named.
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
import { pressParameter } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];
const NUMBER = `${WORDS.join("|")}|\\d+`;
const figure = (text: string) =>
  WORDS.includes(text) ? WORDS.indexOf(text) : Number(text);

for (const seed of ["pl1", "pl5", "pl6", "pl4"])
  it(`the police log slides with the town's usual (seed ${seed})`, () => {
    const place = drawPlace(seed, "police-log");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const api = coreAPI(core);
    const wire = new Map<string, Record<string, string>>();
    const end = addDays(makeIsoDate(core.date), 330);
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
        if (row.kind === "crime.month") wire.set(row.id, row.facts);
    }
    expect(
      wire.size,
      `${where}: no police log reached the wire`,
    ).toBeGreaterThan(3);
    const compared = [...wire.values()].filter((facts) => facts.vsUsual);
    expect(compared.length, `${where}: no month was compared`).toBeGreaterThan(
      0,
    );
    const floor = pressParameter("briefUsualFloor");
    const printed = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        kind: string;
        facts: Record<string, unknown>;
      }[]
    ).filter(
      (story) =>
        story.kind === "press.printed" &&
        String(story.facts.sourceRecordId).startsWith("police-log:"),
    );
    for (const story of printed) {
      const facts = wire.get(String(story.facts.sourceRecordId))!;
      if (facts.vsUsual)
        expect(
          Number(facts.vsUsual),
          `${where}: ${story.id} printed with no space`,
        ).toBeGreaterThan(floor);
      const worded = wordPrintedStory(core, story)!;
      const text = (worded.paragraphs ?? [worded.lede ?? ""]).join(" ");
      // Every printed log has its text, not a headline alone.
      expect(worded.lede, `${where}: ${story.id} has no text`).toBeTruthy();
      // The figures in one log add up: the extra over the usual is the
      // month's count, and no kind is said to have "cases".
      const more = new RegExp(`(${NUMBER}) more than`).exec(text);
      const usual = new RegExp(`about (${NUMBER})`).exec(text);
      const total = new RegExp(`(${NUMBER}) (?:police )?reports`).exec(text);
      if (more && usual && total)
        expect(
          figure(more[1]!) + figure(usual[1]!),
          `${where}: ${story.id}: ${text}`,
        ).toBe(figure(total[1]!));
      expect(text, where).not.toMatch(/vandalism cases/);
      appendFileSync(
        path.join(tmpdir(), "printed-police-log-proof.txt"),
        `${where}: ${story.facts.sourceRecordId} vsUsual ${facts.vsUsual ?? "none"}: ${worded.headline} | ${text}\n`,
      );
    }
    // Every month the wire carried, printed or not, against the town's usual.
    const printedIds = new Set(
      printed.map((story) => String(story.facts.sourceRecordId)),
    );
    for (const [id, facts] of [...wire.entries()].sort())
      appendFileSync(
        path.join(tmpdir(), "printed-police-log-proof.txt"),
        `${where}: MONTH ${id} vsUsual ${facts.vsUsual ?? "none"} usual ${facts.usual ?? "none"} ${printedIds.has(id) ? "PRINTED" : "not printed"}\n`,
      );
    appendFileSync(
      path.join(tmpdir(), "printed-police-log-proof.txt"),
      `${where}: ${wire.size} months on the wire, ${compared.length} compared, ${printed.length} printed; vsUsual ${compared.map((f) => f.vsUsual).join(" ")}\n`,
    );
  }, 900_000);
