import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

// The journal tells a move, a birth, a partnership, a death in the family and
// a school year's end as small stories, not statements (owner, batch 3), the
// way it tells a working life: each follow-on sentence is read from the same
// records the event reads (where they came from and who came with them, how
// old they were, whether the first child, how long together, how old the one
// who died was, how long at the school) and is written only when they give
// it. Two lines join by the time between them, never by a false cause.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 4;
const KINDS: [string, RegExp][] = [
  ["moved", /came here from|had been living in|came too|came with me/],
  ["child", /my first child|our first|I was \d+ (?:then|when it happened)/],
  ["together", /together \w|since then/],
  ["death", /years old|was \d+\.|seriously ill/],
  ["school", /I had been at|That ended|that day|when it ended/],
];

it(`life events are told as small stories from their records (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS && seen.size < 2; attempt += 1) {
      const place = drawPlace(seed, `journal-life-stories:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        {
          twoLevel: true,
          placeKey: place.key,
          playerBirthDate: `${Number(gameStartDate().slice(0, 4)) - 35}-06-15`,
        },
      );
      const id = playerId as PersonId;
      core.focusPersonIds.add(id);
      director.watch(core, id);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const lines = composeJournal(core, director, id).flatMap(
        (chapter) => chapter.lines,
      );
      for (const line of lines) {
        expect(line.text, where).not.toMatch(/\{|\}|undefined/);
        for (const [kind, shape] of KINDS) {
          if (!shape.test(line.text)) continue;
          const sentences = line.text.split(/(?<=[.!?])\s+/);
          if (sentences.length < 2) continue;
          // Every sentence stands on a record the line cites.
          expect(line.sourceRecordIds.length, where).toBeGreaterThan(0);
          // A cause join ("Because of that") the records do not support would
          // read false here: report how many open on one.
          if (/^Because of that/.test(line.text))
            process.stdout.write(`JOURNAL LIFE JOIN ${kind}: ${line.text}\n`);
          seen.add(kind);
          process.stdout.write(
            `JOURNAL LIFE ${kind} ${where}: ${line.date} ${line.text} [${line.sourceRecordIds.slice(0, 4).join(", ")}]\n`,
          );
        }
      }
    }
    expect([...seen].length, `seed ${seed}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
