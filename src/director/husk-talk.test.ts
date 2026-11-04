import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { personOrFillIn } from "../core2/state";
import type { PersonId } from "../core2/types";
import { openConversation } from "./conversation";
import rules from "./data/conversation-rules.json";

/**
 * A relative who lives elsewhere has something to talk about once their life
 * is on record (words-talk-husk-acquaintances-empty; owner, Nov 1: every life
 * is simulated). After a played year, the player opens a talk with each
 * relative they know who lives elsewhere; a relative with recorded news says
 * something, cites a record, and offers a choice. One with nothing on record
 * still says nothing (owner, Oct 24: hello and goodbye with nothing between
 * is not a talk). Drawn places, a fresh seed, place and seed printed.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const DAYS = 365;
const WEEK = 7;

it(`a relative elsewhere with news on record has a talk (seed ${seed})`, () => {
  const notes: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "husk-talk");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = playerId as PersonId;
    const elsewhere = [...core.people.get(player)!.knownIds].filter(
      (id) => core.husks.has(id) || core.people.get(id)?.tier === "husk",
    );
    if (!elsewhere.length) {
      notes.push(`${where}: no relative elsewhere`);
      continue;
    }
    // Week by week: a relative whose news is a week old is talked with then.
    const happening = (kind: string) =>
      rules.happenings.prefixes.some((prefix) =>
        `feeling:event:${kind}`.startsWith(prefix),
      );
    const end = addDays(makeIsoDate(core.date), DAYS);
    const silent: string[] = [];
    while (core.date < end) {
      const since = core.date;
      advanceCore(core, addDays(makeIsoDate(core.date), WEEK));
      for (const otherId of elsewhere) {
        const news = [...(core.logByPerson.get(otherId) ?? [])]
          .map((id) => core.durableLog.get(id as never))
          .find((row) => !!row && row.date > since && happening(row.kind));
        if (!news) continue;
        // Met, they are filled in as the records say (state.ts personOrFillIn).
        if (!personOrFillIn(core, otherId)) continue;
        const talk = openConversation(core, player, otherId, { director });
        // Not every happening has words yet (a notice before an eviction);
        // those that do open a talk that cites them.
        if (
          !talk.lines.some((line) => line.sourceRecordIds.includes(news.id))
        ) {
          silent.push(`${news.kind}`);
          continue;
        }
        for (const line of talk.lines)
          expect(
            line.sourceRecordIds.length,
            `${where}: "${line.text}"`,
          ).toBeGreaterThan(0);
        expect(talk.choices.length, `${where}: ${otherId}`).toBeGreaterThan(0);
        process.stdout.write(
          `HUSK TALK ${where}: ${otherId} (${news.id}): ${talk.lines.map((line) => `"${line.text}"`).join(" / ")}; silent before: ${silent.join(", ") || "none"}\n`,
        );
        return;
      }
    }
    notes.push(
      `${where}: ${elsewhere.length} relatives elsewhere, none with a talk after ${DAYS} days (news with no words: ${silent.join(", ") || "none"})`,
    );
  }
  throw new Error(`No relative elsewhere had a talk: ${notes.join("; ")}`);
}, 3_600_000);
