import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import type { Director } from "./ledger";
import { purposeScene, replyInScene, typeForCause } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";
import type { Moment } from "./types";

// The last day of the player's school year (situation type `last-day`, its
// school cause `circumstance:school-last-day`, key `school-goodbye`): a
// classmate from the same school that year says goodbye and asks what comes
// next, in a classmate's words, never the lines of someone leaving a job.
// The new adult the game opens with is played to the school year's end as
// the bench plays it; the scene composes from its cause, every line carries
// the school key, the four root replies are four moves, opposite speakers
// say it differently, and the reply is written back as a record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 4;
const DAYS = 200;
const LABEL = "circumstance:school-last-day";
const TYPE_KEY = "last-day";
const KEY = "school-goodbye";
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "last-day",
) as unknown as PurposeType;
const PROFILE = [
  "personality-v1:facet-friendly",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-hostile",
  "personality-v1:facet-persistent",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-sensitive",
];

/** Plays the player to the end of the school year; the last-day moment goes to `found`. */
function lastDay(
  core: CoreState,
  director: Director,
  personId: PersonId,
): { entry: ScheduleEntry; moment: Moment } | null {
  core.focusPersonIds.add(personId);
  director.watch(core, personId);
  const book = director.ledger.people.get(personId)!;
  let found: { entry: ScheduleEntry; moment: Moment } | null = null;
  // The scene is read from the director's schedule as the day it plays
  // closes: a scene from circumstance is staged whether or not it stops the
  // clock.
  const open = () => {
    if (found) return;
    for (const entry of book.schedule) {
      const moment = book.momentsById.get(entry.momentId);
      if (
        moment?.label === LABEL &&
        entry.bindings.some((row) => row.typeKey === TYPE_KEY)
      ) {
        found = { entry, moment };
        return;
      }
    }
  };
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: {
      date: addDays(makeIsoDate(core.date), DAYS),
      minuteOfDay: P.zero,
    },
  });
  while (packet.kind !== "complete" && !found) {
    if (packet.kind === "stop") {
      open();
      if (found) break;
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    } else
      // As the bench plays a day: the character makes its own pick (on a
      // school day, school), so the classmates are theirs.
      packet = resumePlayerV1(core, {
        kind: "own-choice",
        pauseId: packet.pauseId,
      });
  }
  open();
  return found;
}

it(`a classmate says goodbye on the last school day in a classmate's words (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(seed, `school-goodbye:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const personId = core.playerId as PersonId;
    const hit = lastDay(core, director, personId);
    if (!hit) {
      tried.push(`${where}: no last school day in ${DAYS} days`);
      continue;
    }
    const { entry, moment } = hit;
    const result = purposeScene(core, director, personId, entry, {
      typeKey: "last-day",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { scene } = result;
    expect(scene.askerId, where).not.toBe(personId);
    expect(
      scene.talk.lines.every((row) => row.key === KEY),
      `${where}: every line carries ${KEY}`,
    ).toBe(true);
    const root = scene.talk.tree.replies.map((reply) => reply.line);
    expect(new Set(root.map((row) => row.move)).size, where).toBe(root.length);
    expect(new Set(root.map((row) => row.text)).size, where).toBe(root.length);

    const facts = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    const typed = typeForCause(TYPE, moment.label);
    const text = (level: number) => {
      const out = composeSceneTalk(
        core,
        director,
        { askerId: scene.askerId, askedId: scene.askedId },
        typed,
        facts,
        {
          askerTraits: Object.fromEntries(
            PROFILE.map((id, k) => [id, k % 2 ? -level : level]),
          ),
        },
      );
      return out.kind === "composed"
        ? out.talk.lines.map((row) => row.text).join("|")
        : out.reason;
    };
    expect(text(2), where).toBe(text(2));
    expect(text(2), where).not.toBe(text(-2));

    const reply = replyInScene(core, director, personId, entry, [P.zero]);
    expect(reply, `${where}: the reply is written back`).toBeTruthy();
    if (process.env.SCENE_LOG)
      writeFileSync(
        process.env.SCENE_LOG,
        `SCHOOL GOODBYE ${where}: ${moment.date}, cause ${moment.causeId}, classmate ${scene.askerId}, reply ${reply}\n${scene.talk.lines.map((row) => `  ${row.speaker}: ${row.text}`).join("\n")}\n  replies: ${root.map((row) => row.text).join(" | ")}\n  hostile: ${text(2)}\n  gentle: ${text(-2)}\n`,
      );
    return;
  }
  throw new Error(
    `no drawn place reached the player's last school day: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
