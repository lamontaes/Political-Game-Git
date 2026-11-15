/**
 * The police log's space slides with how far the month stands from the town's
 * own usual (Words lead, Nov 14). In a played eleven months (330 days) of two
 * pinned drawn places, every month's wire item after the town's second closed
 * month carries the month over its usual, and the paper prints a log only
 * while its month has space: a month at or under the floor of usual is never
 * printed, and a month over usual that is printed carries its body. A third
 * place checks what a town with no earlier reports prints. Places and seeds
 * are named.
 *
 * Why 330 played days: a log says "usual" only once the usual rests on six
 * closed months (`briefUsualMinMonths`), and a month at or under the floor
 * comes only some months in; at 230 days few months carry a usual and
 * Wendell has no month under the floor (measured Nov 15). Each case is about one to two minutes; the time is the played days.
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

/**
 * The town a seed draws, by its record id, so a change to the draw fails here
 * and not in a lookalike town. The fourth case once drew Surrency, Georgia
 * (seed pl4), on the premise that it reported crime in more than one closed
 * month; after the cabinet change folded (#9385) it reports in one month of
 * its first eleven, so its premise is gone and that case is kept below as a
 * check of what a town with no earlier reports prints. The comparison case now
 * runs at Hesperia, Michigan (seed pl8), which reports in ten of its first
 * eleven months, so the comparison does not hang on one report.
 */
const TOWNS: Readonly<Record<string, string>> = {
  pl8: "2637860",
  pl4: "1374852",
};

/** The town's first 330 played days: the crime months that reached the wire. */
function playedWire(seed: string) {
  const place = drawPlace(seed, "police-log");
  if (TOWNS[seed]) expect(place.key).toBe(TOWNS[seed]);
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
  return { core, api, wire, where };
}

it("a town with no earlier reports compares no month and says nothing of the usual (Surrency, seed pl4)", () => {
  const { core, api, wire, where } = playedWire("pl4");
  expect(wire.size, `${where}: a month reached the wire`).toBeGreaterThan(0);
  // The town's earlier closed months hold no reports, so there is no usual.
  for (const [id, facts] of wire)
    expect(facts.vsUsual, `${where}: ${id} has no usual to compare`).toBe(
      undefined,
    );
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
    const worded = wordPrintedStory(core, story)!;
    expect(
      (worded.paragraphs ?? [worded.lede ?? ""]).join(" "),
      `${where}: ${story.id} says nothing of the usual`,
    ).not.toMatch(/usual|more than|fewer than/);
  }
}, 900_000);

for (const seed of ["pl1", "pl8"])
  it(`the police log slides with the town's usual (seed ${seed})`, () => {
    const { core, api, wire, where } = playedWire(seed);
    expect(
      wire.size,
      `${where}: no police log reached the wire`,
    ).toBeGreaterThan(0);
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
      expect(text, where).not.toMatch(/vandalism cases|busier/);
      // A month is compared with the town's usual only once the usual rests
      // on enough closed months, and only where the month stands off it by
      // more than the town's own months do from their mean.
      if (/usual/.test(text)) {
        expect(
          Number(facts.monthsOfRecord),
          `${where}: ${story.id}: said "usual" on a short record: ${text}`,
        ).toBeGreaterThanOrEqual(pressParameter("briefUsualMinMonths"));
        if (more)
          expect(
            figure(more[1]!),
            `${where}: ${story.id}: compared inside the town's own spread: ${text}`,
          ).toBeGreaterThanOrEqual(Number(facts.spread));
      }
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
