import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { PersonId } from "../core2/types";
import { SITUATION_LIBRARY } from "../director/scheduling";
import { openWaitingSceneWith } from "./waiting-scene";
import { buildBenchWorld } from "./world";

// A scene that waits for the player and another person to be in one place
// (an apology, a date, advice, a visit to someone ill) plays when the player
// walks up to that person or arrives where they are: the bench's talk route
// and visit ask `openWaitingSceneWith` (director-a-waiting-scene-is-never-
// played, fix 3). Played as the bench plays, the player's clock in 10-day
// steps in a drawn place, every stop resumed. Each meeting-type moment the
// director staged from the world's own records is checked on the road it
// took: one that waits opens with its own person and no one else; one that
// interrupts opened on its own stop. Such moments are rare in play
// (director-meeting-scenes-are-almost-never-cast-for-the-player), so a draw
// with none is named and passed over.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const STEP = 10;
const STEPS = 9;
const ATTEMPTS = 4;
const MEETING = new Set(
  SITUATION_LIBRARY.types
    .filter((type) => type.timing === "next-together")
    .map((type) => type.key),
);

it(`a meeting-type scene opens on its road, a waiting one when the two meet (seed ${seed})`, () => {
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "waiting-together");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const me = world.playerId as PersonId;
    core.focusPersonIds.add(me);
    director.watch(core, me);
    const book = director.ledger.people.get(me)!;
    const stopped = new Set<string>();
    const checked: string[] = [];
    for (let step = 1; step <= STEPS; step += 1) {
      let packet: ReturnType<typeof advancePlayerV1> | undefined =
        advancePlayerV1(core, {
          controlledPersonId: me,
          through: {
            date: addDays(makeIsoDate(gameStartDate()), STEP * step),
            minuteOfDay: P.zero,
          },
        });
      while (packet && packet.kind !== "complete") {
        if (packet.kind === "stop")
          for (const stop of packet.stop.modules)
            if (stop.moduleId === director.module.id)
              stopped.add(stop.recordId);
        packet =
          packet.kind === "stop"
            ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
            : resumePlayerV1(core, {
                kind: "choice",
                pauseId: packet.pauseId,
                offerId: packet.offers[P.zero]!.offerId,
              });
      }
      const date = makeIsoDate(core.date);
      const at = { date, minuteOfDay: P.zero };
      // A waiting one: someone else met opens nothing, its person opens it,
      // and it is opened once.
      for (const row of director
        .waitingScenes(me, date)
        .filter((item) => item.nextTogether && item.openUntil >= date)) {
        const label = `${where}: ${row.momentId} (${row.typeKey}), waiting`;
        const stranger = [...core.people.keys()].find(
          (id) => id !== me && !row.withIds.includes(id as PersonId),
        )!;
        expect(openWaitingSceneWith(director, me, at, [stranger]), label).toBe(
          undefined,
        );
        expect(
          openWaitingSceneWith(director, me, at, [row.withIds[P.zero]!]),
          label,
        ).toBe(row.momentId);
        expect(
          openWaitingSceneWith(director, me, at, [row.withIds[P.zero]!]),
          label,
        ).toBe(undefined);
        checked.push(`${row.typeKey} waited and opened on meeting`);
      }
    }
    // An interrupting one opened on its own stop.
    for (const entry of book.schedule.filter(
      (item) =>
        item.outcome === "scene-now" &&
        item.bindings.some((row) => MEETING.has(row.typeKey)),
    )) {
      expect(
        stopped.has(entry.momentId),
        `${where}: ${entry.momentId}, interrupting`,
      ).toBe(true);
      checked.push(
        `${entry.bindings.map((row) => row.typeKey).join("+")} interrupted`,
      );
    }
    if (checked.length) {
      process.stdout.write(
        `TOGETHER ${where}: ${checked.join("; ")}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    passed.push(`${where}: no meeting-type scene in ${STEP * STEPS} days`);
  }
  throw new Error(`no meeting-type scene in any draw: ${passed.join("; ")}`);
}, 2_400_000);
