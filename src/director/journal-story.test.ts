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

  /**
   * Whether the Journal of the player drawn from this seed names every job
   * before the start only by its own employer; a reason it holds no such case
   * otherwise (no job held today, every job with an employer, no line told).
   */
  const ownEmployersOnly = (drawSeed: string): string | null => {
    const place = drawPlace(drawSeed, "journal-story");
    const where = `seed ${drawSeed}, ${place.name} (${place.key})`;
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
    const spells = preStartHistory(core, {
      kind: "person.work-spell",
      personId: id,
    }).sort((a, b) =>
      String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
    );
    // A job held today is what such a spell must not borrow.
    if (!core.people.get(id)?.jobId) return `${where}: no job held today`;
    if (!spells.some((row) => !row.facts.organizationId))
      return `${where}: every job had an employer`;
    director.watch(core, id);
    const lines = composeJournal(core, director, id).flatMap(
      (chapter) => chapter.lines,
    );
    let checked = 0;
    for (const line of lines) {
      const told = spells.filter((row) =>
        line.sourceRecordIds.includes(row.id),
      );
      if (!told.length) continue;
      checked += 1;
      // Its own employer, and the next one's only where it tells the move
      // to another job.
      const allowed = new Set(
        told.flatMap((row) => {
          const next = line.momentIds.includes(`${row.id}:job-ended:moved-on`)
            ? spells[spells.indexOf(row) + 1]
            : undefined;
          return [
            row.facts.organizationId,
            row.facts.jobId,
            next?.facts.organizationId,
            next?.facts.jobId,
          ]
            .filter(Boolean)
            .map(String);
        }),
      );
      for (const cited of line.sourceRecordIds)
        if (core.organizations.has(cited) || core.jobs.has(cited))
          expect(
            allowed.has(cited),
            `${where}: "${line.text}" cites ${cited}`,
          ).toBe(true);
    }
    if (!checked) return `${where}: no line told a job before the start`;
    process.stdout.write(
      `journal-story: ${where}; ${checked} lines of jobs before the start checked\n`,
    );
    return null;
  };

  it("names a job before the start only by its own employer, and none where none is on record", () => {
    // Draw places (bounded) until the player worked somewhere before moving
    // to town (a spell of the run with no employer on record) and holds a job
    // today.
    const passed: string[] = [];
    for (let draw = 0; draw < 12; draw += 1) {
      const skipped = ownEmployersOnly(`${seed}:elsewhere:${draw}`);
      if (!skipped) {
        process.stdout.write(
          `journal-story: passed over ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      passed.push(skipped);
    }
    throw new Error(
      `No drawn place had a job before a move (seed ${seed}): ${passed.join("; ")}`,
    );
  }, 1_500_000);

  // Named regression: Haugan, Montana, where the player's first job, in
  // another place before the move, was told as "I started working for Haugan
  // Police Department", the employer of the job held today.
  it("names no employer for the Haugan, Montana player's first job before the move", () => {
    expect(ownEmployersOnly("final-a:elsewhere:1")).toBeNull();
  }, 300_000);
});
