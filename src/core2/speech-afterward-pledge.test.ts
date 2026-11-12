/**
 * A listener's "You've got my vote" to the candidate who came over after a
 * speech is their word to that candidate (pool item
 * words-speech-afterward-reply-moves-vote): the campaigns engine keeps it as
 * the pledge a yes at the door is, citing the scene.reply record, and the
 * voting engine's ballot reads pledges (`pledgesOf`). Played in the bench
 * world in places drawn from all 56 on a seed nobody chose, for up to two
 * years, watching the player's household and each candidate's family and ties
 * in town; the first campaign speech heard in person whose candidate is
 * running in a race still ahead is replied to with an accepting move.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { purposeScene, replyInScene } from "../director/purpose-scene";
import { speechAct, speechOccasion } from "../director/scheduling";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { pledgesOf } from "./modules/campaigns";
import { ACCEPTING_MOVES } from "./modules/press";
import { coreAPI } from "./state";
import type { CoreState, PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const MONTHS = 24;
const IN_PERSON = new Set(["town-hall", "speech"]);
const TIES = 25;

function closeTies(core: Readonly<CoreState>, candidateId: string): PersonId[] {
  const candidate = core.people.get(candidateId as PersonId);
  if (!candidate) return [];
  const ids = new Set<PersonId>(candidate.familyIds);
  for (const rel of core.relationshipsByPerson.get(candidate.id) ?? []) {
    const row = core.relationships.get(rel);
    if (row) ids.add(row.actorId === candidate.id ? row.otherId : row.actorId);
  }
  return [...ids]
    .filter((id) => {
      const person = core.people.get(id);
      return person?.alive && person.placeId === candidate.placeId;
    })
    .slice(0, TIES);
}

it(`an accepting reply to a candidate after a speech is the listener's word, citing the scene.reply (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const place = drawPlace(seed, `speech-afterward-pledge:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}, run seed ${seed}`;
      const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const player = core.people.get(core.playerId!)!;
      for (const id of [
        player.id,
        ...(core.households.get(player.householdId)?.memberIds ?? []),
      ])
        if (core.people.get(id)?.alive) director.watch(core, id);
      api.subscribeEvents(
        "speech-pledge-test",
        ["candidate-filed"],
        (_a, e) => {
          for (const candidateId of e.personIds)
            for (const id of closeTies(core, candidateId))
              director.watch(core, id);
        },
      );
      const seen = new Set<string>();
      for (let month = 0; month < MONTHS; month += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        for (const book of director.ledger.people.values())
          for (const entry of book.schedule) {
            const key = `${book.personId}|${entry.momentId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const moment = book.momentsById.get(entry.momentId);
            if (moment?.label !== "cause:event:speech.heard") continue;
            const speaker = core.durableLog.get(moment.causeId)?.facts?.[
              "views:speaker"
            ];
            if (
              speechOccasion(core, moment.causeId) !== "campaign" ||
              typeof speaker !== "string" ||
              speaker === book.personId ||
              !IN_PERSON.has(speechAct(moment.causeId) ?? "") ||
              !entry.bindings.some((row) => row.typeKey === "speech-afterward")
            )
              continue;
            const voter = book.personId as PersonId;
            const result = purposeScene(core, director, voter, entry, {
              typeKey: "speech-afterward",
            });
            if (result?.kind !== "composed") continue;
            const yes = result.scene.talk.tree.replies.findIndex((reply) =>
              ACCEPTING_MOVES.has(reply.line.move),
            );
            if (yes < 0) continue;
            const before = pledgesOf(api, voter).length;
            const replyId = replyInScene(core, director, voter, entry, [yes], {
              typeKey: "speech-afterward",
            });
            expect(
              replyId,
              `${where}: ${voter} ${entry.momentId}`,
            ).toBeTruthy();
            const pledge = pledgesOf(api, voter).find(
              (row) => row.causeId === replyId,
            );
            if (!pledge) {
              // The candidate is not running in a race still ahead (the speech
              // was an incumbent's or the race is over): no word is given.
              expect(pledgesOf(api, voter).length, where).toBe(before);
              tried.push(`${where}: ${speaker} had no race ahead`);
              continue;
            }
            expect(pledge.candidateId, where).toBe(speaker);
            expect(pledge.canvasserId, where).toBe(speaker);
            console.log(
              `${where}: ${voter} told ${speaker} yes after the speech (${replyId}); pledge ${pledge.id}, firmness ${pledge.firmness}`,
            );
            return;
          }
      }
      tried.push(
        `${where}: no campaign speech to reply to in ${MONTHS} months`,
      );
    }
    expect.fail(`seed ${seed}: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
