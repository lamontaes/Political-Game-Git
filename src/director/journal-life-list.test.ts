/**
 * The Journal's life-story entries (the journal on the life list, docs/design/journal-on-the-life-list.md):
 * in a drawn place played 200 days, with the player and two members of their household watched, every
 * Journal entry about a life story (a job found, lost or left, a move, a birth, a partner, a death in
 * the family, school, an office, an illness, a home) is collected with its kind, the records it cites,
 * its date and its sentence. Replay with JL_SEED and JL_PLACE_KEY; JL_OUT names a file the collected
 * entries are written to (the before and after of the change).
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

const seed = process.env.JL_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(seed, "journal-life-list");
const placeKey = process.env.JL_PLACE_KEY ?? drawn.key;

/** The cause kinds of a life story: the journal's rows about what happened in a person's own life. */
const LIFE_STORY = [
  "person.birth",
  "event:person-birth",
  "event:school.finished",
  "job-",
  "family:child",
  "moved",
  "event:person.moved-away",
  "event:life.death",
  "event:housing.eviction",
  "event:housing.purchase",
  "event:organization.founded",
  "event:health.serious-illness",
  "event:candidate-filed",
  "event:election-result",
  "event:took-office",
  "household:",
];

export interface StoryEntry {
  person: string;
  kinds: string[];
  recordIds: string[];
  date: string;
  text: string;
}

export function lifeStoryEntries(
  core: Parameters<typeof composeJournal>[0],
  director: Parameters<typeof composeJournal>[1],
  ids: readonly PersonId[],
): StoryEntry[] {
  const out: StoryEntry[] = [];
  for (const id of ids)
    for (const chapter of composeJournal(core, director, id))
      for (const line of chapter.lines) {
        const kinds = (line.kinds ?? []).filter((kind) =>
          LIFE_STORY.some((prefix) => kind.startsWith(prefix)),
        );
        if (!kinds.length) continue;
        out.push({
          person: id,
          kinds,
          recordIds: [...line.sourceRecordIds],
          date: line.date,
          text: line.text,
        });
      }
  return out;
}

it("collects the Journal's life-story entries in a drawn place played 200 days", () => {
  setBookkeeping(false);
  try {
    const where = `${drawn.name} (${placeKey}), seed ${seed}`;
    const { core, director, playerId } = buildBenchWorld(
      drawn.seed,
      gameStartDate(),
      {
        twoLevel: true,
        placeKey,
        playerBirthDate: `${Number(gameStartDate().slice(0, 4)) - 35}-06-15`,
      },
    );
    const player = core.people.get(playerId!)!;
    const members = [
      ...(core.households.get(player.householdId)?.memberIds ?? []),
    ]
      .filter((id) => id !== playerId && core.people.get(id)?.alive)
      .slice(0, 2);
    const ids = [playerId as PersonId, ...members];
    for (const id of ids) {
      core.focusPersonIds.add(id);
      director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 200));
    const entries = lifeStoryEntries(core, director, ids);
    process.stdout.write(
      `JOURNAL LIFE LIST ${where}: ${entries.length} entries\n`,
    );
    expect(entries.length, where).toBeGreaterThan(0);
    for (const entry of entries)
      expect(entry.recordIds.length, `${where}: ${entry.text}`).toBeGreaterThan(
        0,
      );
    if (process.env.JL_OUT) {
      mkdirSync(dirname(process.env.JL_OUT), { recursive: true });
      writeFileSync(process.env.JL_OUT, JSON.stringify(entries, null, 1));
    }
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
