/**
 * The Journal tells a life, not a ledger (words composer, unit 6; owner, Nov
 * 12: "the journal is just a declaration of, I did this, I worked here, I did
 * this, I worked here, this person was born, I went to school here"). For a
 * player of 36 in the labeled case (Wofford Heights, California, seed
 * a9c85de3-e7fa-4418-8499-569a5c5e6e10) and two places drawn from all 56,
 * played 60 days: the past is told in at most as many paragraphs as the
 * outline has; no paragraph opens on how much time passed after one that did;
 * no fact is told twice; no feeling is named; no entry is a bare declaration;
 * a relative's full relation-and-name is said once; and the same records
 * compose the same Journal twice. Replay one place with JC_SEED.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { IsoDate, PersonId } from "../core2/types";
import { COMPOSED_CHECKS } from "../english/composed-checks";
import { composedLine, type ComposedSample } from "../english/composed-text";
import outline from "./data/journal-outline.json";
import { composeJournal } from "./journal";

const LABELED = {
  seed: "a9c85de3-e7fa-4418-8499-569a5c5e6e10",
  placeKey: "0686174",
  name: "Wofford Heights, California",
};
const AGE = 36;
const DAYS = 60;
const CHECKS = [
  "journal-fact-told-once",
  "journal-entry-not-bare",
  "journal-names-no-feeling",
  "journal-no-time-opener-chain",
];

/** A place drawn from all 56 by a seed; the same seed builds the world, so it replays. */
const drawn = (seed: string) => {
  const row = drawPlace(seed, "journal-composer");
  return { seed, key: row.key, name: row.name };
};
const draws = process.env.JC_SEED
  ? [drawn(process.env.JC_SEED)]
  : [
      { seed: LABELED.seed, key: LABELED.placeKey, name: LABELED.name },
      drawn(randomBytes(8).toString("hex")),
      drawn(randomBytes(8).toString("hex")),
    ];

it.each(draws)(
  "tells a 36-year-old's life once, in a few paragraphs, the same each time ($name, seed $seed)",
  ({ seed, key, name }) => {
    const where = `${name} (key ${key}), seed ${seed}`;
    const [year, month] = gameStartDate().split("-").map(Number);
    const born = `${year! - AGE}-${String(month === 1 ? 6 : 1).padStart(2, "0")}-15`;
    const { core, director, playerId } = buildBenchWorld(
      seed,
      gameStartDate(),
      { twoLevel: true, placeKey: key, playerBirthDate: born as IsoDate },
    );
    const id = playerId as PersonId;
    director.watch(core, id);
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    const journal = composeJournal(core, director, id);
    const lines = journal.flatMap((chapter) => chapter.lines);
    expect(lines.length, `${where}: the Journal tells nothing`).toBeGreaterThan(
      0,
    );
    // The past is the first chapter, one paragraph per outline row at most.
    const past = journal[0]!.lines.filter((line) => line.date < core.startedAt);
    expect(
      past.length,
      `${where}: ${past.map((l) => l.text).join(" | ")}`,
    ).toBeLessThanOrEqual(outline.paragraphs.length);
    // The composed checks read the page as the screen shows it.
    const sample: ComposedSample = {
      place: name,
      seed,
      playerId: id,
      householdIds: [
        ...(core.households.get(core.people.get(id)!.householdId)?.memberIds ??
          []),
      ],
      people: [...core.people.values()].map((person) => ({
        id: person.id,
        full: `${person.givenName} ${person.familyName}`,
        given: person.givenName,
      })),
      stateNames: [],
      townName: name.split(",")[0]!,
      texts: [
        {
          id: "journal:page:0",
          kind: "journal:page",
          date: core.date,
          minuteOfDay: 0,
          presentIds: [id],
          screens: [
            {
              lines: lines.map((line) => composedLine(line.text)),
              offered: [],
            },
          ],
        },
      ],
    };
    for (const check of CHECKS)
      expect(
        COMPOSED_CHECKS[check]!(sample.texts[0]!, sample).map(
          (row) => `${row.why}: ${row.quote}`,
        ),
        `${where}: ${check}`,
      ).toEqual([]);
    // Every entry stands on records.
    for (const line of lines)
      expect(
        line.sourceRecordIds.length,
        `${where}: ${line.text}`,
      ).toBeGreaterThan(0);
    // The same records compose the same Journal.
    expect(
      composeJournal(core, director, id).flatMap((chapter) =>
        chapter.lines.map((line) => line.text),
      ),
      where,
    ).toEqual(lines.map((line) => line.text));
    process.stdout.write(
      `journal-composer: ${where}\n${journal.map((chapter) => `## ${chapter.title}\n${chapter.lines.map((line) => `- ${line.text}`).join("\n")}`).join("\n")}\n`,
    );
  },
  600_000,
);
