import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { preStartHistory } from "../core2/pre-start";
import {
  JOURNAL_BANK,
  journalDataFromBank,
} from "../english/mined/journal-bank";
import { composeJournal } from "./journal";
import type { PersonId } from "../core2/types";

// The Journal is a story from birth (owner, Oct 27: "this journal needs to be
// written like a story, not individual sections, but written like a story
// from birth"): its first moment is the player's own birth, told from the
// run's birth record, then the years in the order they happened. The bank
// does not yet word the birth row (pool item words-journal-line-own-birth),
// so the reader is checked with the bank's own "I was born in {place}."
// mapped to it, as the Words session will map it. A place drawn from all 56.
const seed = process.env.JOURNAL_STORY_SEED ?? randomBytes(8).toString("hex");

describe("the journal as a story from birth", () => {
  it("opens on the player's birth, from the run's record, and keeps the years in order", () => {
    const place = drawPlace(seed, "journal-story");
    const where = `seed ${seed}, ${place.name} (${place.key})`;
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
    const [birth] = preStartHistory(core, {
      kind: "person.birth",
      personId: id,
    });
    expect(birth?.id, `${where}: the player's birth record`).toBe(
      `person-history:${id}:birth`,
    );
    const words = journalDataFromBank({
      parts: JOURNAL_BANK.parts.map((part) =>
        part.key === "journal.look-back-line-died.i-was-born-in-place"
          ? {
              ...part,
              uses: [
                ...(part.uses ?? []),
                {
                  ...part.uses![0]!,
                  journal: [{ kindPrefix: "person.birth", field: "line" }],
                },
              ],
            }
          : part,
      ),
    });
    director.watch(core, id);
    const lines = composeJournal(core, director, id, { words }).flatMap(
      (chapter) => chapter.lines,
    );
    expect(lines.length, where).toBeGreaterThan(0);
    // The first thing told is the birth, citing its record.
    expect(
      lines[0]!.sourceRecordIds,
      `${where}: "${lines[0]!.text}"`,
    ).toContain(birth!.id);
    expect(lines[0]!.text, where).toMatch(/born in/);
    // Then the years in the order they happened.
    const dates = lines.map((line) => line.date);
    expect(dates, where).toEqual([...dates].sort());
    // With the bank as it stands, the birth is not yet worded and is left out.
    const today = composeJournal(core, director, id).flatMap((c) => c.lines);
    expect(
      today.some(
        (line) =>
          line.sourceRecordIds.includes(birth!.id) && /born in/.test(line.text),
      ),
      where,
    ).toBe(false);
  }, 300_000);
});
