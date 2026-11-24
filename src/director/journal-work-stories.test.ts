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

// The journal tells a working life as small stories, not statements (owner,
// batch 3): "I found work again at Rose Manufacturing. I had gone a year
// without work. It paid about $18 an hour." Each follow-on sentence is read
// from the same past-work records the event reads (how long, the employer
// before, what each job paid), and is written only when those records give
// it. The year is played and the journal composed from the played world.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;

it(`a life's work is told as small stories from the past-work records (seed ${seed})`, () => {
  setBookkeeping(false);
  let stories = 0;
  const kinds = new Set<string>();
  try {
    for (let attempt = 0; attempt < ATTEMPTS && kinds.size < 3; attempt += 1) {
      const place = drawPlace(seed, `journal-work-stories:${attempt}`);
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
        // Never the bare statement the stories replace.
        expect(line.text, where).not.toMatch(
          /\bAfter [^.,]* out of work\b|\bAfter out of work\b|before [^.]* took me on/,
        );
        expect(line.text, where).not.toMatch(/\{|\}|undefined/);
        const work = line.sourceRecordIds.filter((rid) =>
          rid.startsWith("past-work:"),
        );
        if (!work.length) continue;
        const sentences = line.text.split(/(?<=[.!?])\s+/);
        if (
          /out of work|without work|paycheck|had worked|been there|\ban hour\b/.test(
            line.text,
          )
        ) {
          if (sentences.length > 1) {
            stories += 1;
            kinds.add(
              /found work again|took me on|went back to work/.test(line.text)
                ? "again"
                : /let me go|lost my job/.test(line.text)
                  ? "let-go"
                  : "work",
            );
          }
          process.stdout.write(
            `JOURNAL WORK ${where}: ${line.date} ${line.text} [${work.join(", ")}]\n`,
          );
        }
      }
    }
    expect(stories, `seed ${seed}`).toBeGreaterThan(0);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
