/**
 * A listener's "You've got my vote" to the candidate who came over after a
 * speech is their word to that candidate (pool item
 * words-speech-afterward-reply-moves-vote): the campaigns engine keeps it as
 * the pledge a yes at the door is, citing the scene.reply record, and the
 * voting engine's ballot reads pledges (`pledgesOf`). Played in the bench
 * world, watching the player's household and each candidate's family and ties
 * in town; the first campaign speech heard in person whose candidate is
 * running in a race still ahead is replied to with an accepting move.
 *
 * Pinned (pool item speech-afterward-pledge-test-red-choose-variant): three
 * places, each the place its run seed drew, played from the game's start to
 * the month its speech comes. A world opened later has none of these speeches
 * (no campaign under way; pool item
 * opening-world-holds-causes-lived-before-its-start), so each plays from Jan
 * 20, 2025. Each case's time is the game's own played days, not the test's:
 * Gilliam MO plays 20 months (speech on Sep 7, 2026; about 82 s), Barton MD 21
 * (Oct 6, 2026; about 150 s) and Wilton IA 20 (its first yes now follows the
 * May 15, 2026 speech, about 16 months and 182 s, since the opening's years in
 * place left one 2025 mayor filer out; #10057), and each limit sits near
 * twice its measured time. GOLDEN_PATH_SEED adds a run in
 * places drawn from all 56 on that seed, for up to two years.
 */
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

const drawnSeed = process.env.GOLDEN_PATH_SEED;
const MONTHS = 24;
interface Place {
  readonly name: string;
  readonly key: string;
  readonly seed: string;
}
/** Each place its run seed drew, and the month (from Jan 20, 2025) its speech comes. */
const PINNED: readonly {
  readonly runSeed: string;
  readonly place: Place;
  readonly months: number;
  readonly limit: number;
}[] = [
  {
    runSeed: "1a6d44d1147f10e5",
    place: {
      name: "Gilliam, Missouri",
      key: "2927028",
      seed: "53a4a04aa5cce8c364ead5828f0c15569e8e360f4edf96fbb8e4ee784c7d2076",
    },
    months: 20,
    limit: 180_000,
  },
  {
    runSeed: "5c1e0f2a9b7d4e36",
    place: {
      name: "Barton, Maryland",
      key: "2404625",
      seed: "d51d0bbe823b805cbf9f7a242f759cbe55ad83a9e06aa6edd1c0f11298e70b92",
    },
    months: 21,
    limit: 300_000,
  },
  {
    runSeed: "e2a4c07d81f3b965",
    place: {
      name: "Wilton, Iowa",
      key: "1986070",
      seed: "42517cd6481f3187fab6ac8877e4e969fbab9e6d60417dee2382d376fe2d73a1",
    },
    months: 20,
    limit: 400_000,
  },
];
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

/** Plays one place for up to `months`; true once a yes after a speech is that listener's pledge. */
function pledgeAfterSpeech(
  place: Place,
  months: number,
  runSeed: string,
  tried: string[],
): boolean {
  const where = `${place.name} (${place.key}), seed ${place.seed}, run seed ${runSeed}`;
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
  api.subscribeEvents("speech-pledge-test", ["candidate-filed"], (_a, e) => {
    for (const candidateId of e.personIds)
      for (const id of closeTies(core, candidateId)) director.watch(core, id);
  });
  const seen = new Set<string>();
  for (let month = 0; month < months; month += 1) {
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
          !IN_PERSON.has(speechAct(core, moment.causeId) ?? "") ||
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
        expect(replyId, `${where}: ${voter} ${entry.momentId}`).toBeTruthy();
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
        return true;
      }
  }
  tried.push(`${where}: no campaign speech to reply to in ${months} months`);
  return false;
}

for (const pin of PINNED)
  it(
    `an accepting reply to a candidate after a speech is the listener's word, citing the scene.reply: ${pin.place.name}, run seed ${pin.runSeed}`,
    () => {
      setBookkeeping(false);
      const tried: string[] = [];
      try {
        expect(
          pledgeAfterSpeech(pin.place, pin.months, pin.runSeed, tried),
          tried.join("; "),
        ).toBe(true);
      } finally {
        setBookkeeping(true);
      }
    },
    pin.limit,
  );

if (drawnSeed)
  it(`an accepting reply to a candidate after a speech is the listener's word, citing the scene.reply (drawn, seed ${drawnSeed})`, () => {
    setBookkeeping(false);
    const tried: string[] = [];
    try {
      for (let attempt = 0; attempt < 4; attempt += 1)
        if (
          pledgeAfterSpeech(
            drawPlace(drawnSeed, `speech-afterward-pledge:${attempt}`),
            MONTHS,
            drawnSeed,
            tried,
          )
        )
          return;
      expect.fail(`seed ${drawnSeed}: ${tried.join("; ")}`);
    } finally {
      setBookkeeping(true);
    }
  }, 3_600_000);
