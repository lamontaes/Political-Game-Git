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
import { CRIME_MODULE_ID } from "../core2/modules/crime";
import { lawChain } from "../core2/modules/laws";
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
 * month; after the cabinet change folded (#9385) it reported in one month of
 * its first eleven and was kept as the check of what a town with no earlier
 * reports prints. After renters-buy folded (#9117) Surrency keeps more renting
 * households, whose property-crime exposure moves a theft report from
 * December into November, so its November log has July behind it and a usual
 * to compare: that premise is gone too. The check then ran at St. Marys, Iowa
 * (seed pl42), which reported crime in one month (October 2025) of its first
 * eleven (Nov 15); by train head 6e0572b6 (Nov 19) it reports in July,
 * October and December, so October has July behind it. The check now reads
 * the months whose earlier months hold no reports, by the crime engine's own
 * month rows, which every town has in its first reported month; St. Marys's
 * is July 2025. The comparison case runs at Hesperia, Michigan
 * (seed pl8), which reports in ten of its first eleven months, so the
 * comparison does not hang on one report.
 */
const TOWNS: Readonly<Record<string, string>> = {
  pl8: "2637860",
  pl42: "1970095",
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

it("a month with no earlier reports compares nothing and says nothing of the usual (St. Marys, seed pl42)", () => {
  const { core, api, wire, where } = playedWire("pl42");
  expect(wire.size, `${where}: a month reached the wire`).toBeGreaterThan(0);
  // What the crime engine recorded the town's people reporting, month by month.
  const town = lawChain(api).townPlaceId;
  const reported = new Map(
    (
      api
        .moduleState(CRIME_MODULE_ID)
        .table("months")
        .query("byPlace", [town]) as unknown as {
        month: string;
        types?: Record<string, { reported?: number }>;
      }[]
    ).map((row) => [
      row.month,
      Object.values(row.types ?? {}).reduce(
        (sum, type) => sum + (type.reported ?? 0),
        0,
      ),
    ]),
  );
  // A month whose earlier closed months hold no reports has no usual to
  // compare: the town's first reported month always is one.
  const fresh = new Set(
    [...wire.keys()].filter((id) => {
      const month = id.slice("police-log:".length);
      return [...reported].every(([m, n]) => m >= month || n === 0);
    }),
  );
  process.stdout.write(
    `${where}: months with no earlier reports ${[...fresh].join(", ")}; reported ${[
      ...reported,
    ]
      .sort()
      .map(([m, n]) => `${m}:${n}`)
      .join(" ")}\n`,
  );
  expect(
    fresh.size,
    `${where}: a month with no earlier reports`,
  ).toBeGreaterThan(0);
  for (const id of fresh)
    expect(
      wire.get(id)!.vsUsual,
      `${where}: ${id} has no usual to compare`,
    ).toBe(undefined);
  const printed = (
    api.moduleState("news").table("stories").rows() as unknown as {
      id: string;
      kind: string;
      facts: Record<string, unknown>;
    }[]
  ).filter(
    (story) =>
      story.kind === "press.printed" &&
      fresh.has(String(story.facts.sourceRecordId)),
  );
  for (const story of printed) {
    const worded = wordPrintedStory(core, story)!;
    expect(
      (worded.paragraphs ?? [worded.lede ?? ""]).join(" "),
      `${where}: ${story.id} says nothing of the usual`,
    ).not.toMatch(/usual|more than|fewer than/);
  }
  // Limit near twice the slowest run (train-gate): 61.0 s alone, 49.9 s
  // beside the file's other cases (Nov 16).
}, 120_000);

// Limits near twice the slowest of three runs (train-gate). Wendell (pl1):
// 100.1 s alone, 95.3 s beside the file's other cases, 94.8 s on CI (#9544).
// Hesperia (pl8): 68.2 s alone, 69.2 s beside, 67.8 s on CI.
const SLIDE_LIMIT_MS: Readonly<Record<string, number>> = {
  pl1: 200_000,
  pl8: 140_000,
};
for (const seed of ["pl1", "pl8"])
  it(
    `the police log slides with the town's usual (seed ${seed})`,
    () => {
      const { core, api, wire, where } = playedWire(seed);
      expect(
        wire.size,
        `${where}: no police log reached the wire`,
      ).toBeGreaterThan(0);
      const compared = [...wire.values()].filter((facts) => facts.vsUsual);
      expect(
        compared.length,
        `${where}: no month was compared`,
      ).toBeGreaterThan(0);
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
    },
    SLIDE_LIMIT_MS[seed],
  );
