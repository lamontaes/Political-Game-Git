import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { wordConversationMove } from "../english/conversation-words";
import { subjectsBetween } from "./conversation";

// Asked after a relative, the player can tell what happened to them, from
// the record of it (the owner, Nov 1: every life is simulated, and under Q7
// what happened to someone is the news): a relative's illness, a move, a new
// job or a new baby is the answer's stage, and the news line cites the
// record. Played in a drawn place, with the player's household watched as
// play watches it, until something recorded happens to a relative someone
// else knows.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const NEWS = new Set(["ill", "moved", "job", "baby"]);

it(`a relative's recorded news is the player's answer when someone asks after them (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "family-news");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId! as PersonId;
    director!.watch(core, me);
    const player = core.people.get(me)!;
    for (const id of core.households.get(player.householdId)?.memberIds ?? [])
      if (id !== me && core.people.get(id)?.alive)
        director!.watch(core, id as PersonId);
    for (let day = 30; day <= 360; day += 30) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      for (const otherId of [...player.knownIds].sort()) {
        if (!core.people.get(otherId)?.alive) continue;
        const row = subjectsBetween(
          core,
          me,
          otherId as PersonId,
          director,
        ).find(
          (subject) =>
            subject.kind === "family" && NEWS.has(subject.stage ?? ""),
        );
        if (!row) continue;
        const relative = core.people.get(row.aboutId as PersonId)!;
        // The player's answer, worded at the news's stage from the bank.
        const said = wordConversationMove({
          seed: core.seed,
          subject: "family",
          part: "answers",
          speakerId: me,
          traits: player.traits,
          facts: row.facts,
          momentKey: `${me}:${otherId}:${core.date}:family-news`,
          about: { gender: relative.looks?.gender },
          relationText: row.facts.relation!.text,
          stage: row.stage!,
          keys: [row.stage!],
        });
        expect(said, `${where}: ${row.id} at ${row.stage}`).not.toBeNull();
        // The news cites the record it tells.
        const cites = Object.entries(row.facts)
          .filter(([key]) => key !== "relation" && key !== "name")
          .flatMap(([, fact]) => fact.sourceRecordIds);
        for (const id of cites)
          expect(said!.sourceRecordIds, `${where}: "${said!.text}"`).toContain(
            id,
          );
        if (row.stage === "moved" && row.facts.place)
          expect(said!.text, where).toMatch(/moved|living/);
        process.stdout.write(
          `FAMILY NEWS ${where}, day ${day}: asked after ${relative.id} by ${otherId}; stage ${row.stage}; the player can say "${said!.text}", citing ${said!.sourceRecordIds.join(", ")}\n`,
        );
        return;
      }
    }
    tried.push(`${where}: no relative's news in a year`);
  }
  throw new Error(`no drawn place had a relative's news: ${tried.join("; ")}`);
}, 3_600_000);
