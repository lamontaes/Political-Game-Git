import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { PersonId } from "../core2/types";
import { purposeScene } from "../director/purpose-scene";
import { openWaitingSceneWith } from "./waiting-scene";
import { buildBenchWorld } from "./world";

// A scene that waits for the player and another person to be in one place
// (an apology, a date, advice, a visit to someone ill) plays when the player
// walks up to that person or arrives where they are: the bench's talk route
// and visit ask `openWaitingSceneWith`, which opens it from the director's
// waiting list (director-a-waiting-scene-is-never-played, fix 3). Played as
// the bench plays: the player's clock runs in 10-day steps in a drawn place,
// every stop resumed, until such a scene waits.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const STEP = 10;
const STEPS = 9;
const ATTEMPTS = 4;

it(`a scene waiting for two people to meet opens when they meet (seed ${seed})`, () => {
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
    for (let step = 1; step <= STEPS; step += 1) {
      let packet: ReturnType<typeof advancePlayerV1> | undefined =
        advancePlayerV1(core, {
          controlledPersonId: me,
          through: {
            date: addDays(makeIsoDate(gameStartDate()), STEP * step),
            minuteOfDay: P.zero,
          },
        });
      while (packet && packet.kind !== "complete")
        packet =
          packet.kind === "stop"
            ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
            : resumePlayerV1(core, {
                kind: "choice",
                pauseId: packet.pauseId,
                offerId: packet.offers[P.zero]!.offerId,
              });
      const date = makeIsoDate(core.date);
      const row = director
        .waitingScenes(me, date)
        .find((item) => item.nextTogether && item.openUntil >= date);
      if (!row) continue;
      const at = { date, minuteOfDay: P.zero };
      const otherId = row.withIds[P.zero]!;
      const label = `${where}: ${row.momentId} (${row.typeKey}) with ${otherId}`;
      // Someone else met opens nothing; the person it waits for opens it.
      const stranger = [...core.people.keys()].find(
        (id) => id !== me && !row.withIds.includes(id as PersonId),
      )!;
      expect(openWaitingSceneWith(director, me, at, [stranger]), label).toBe(
        undefined,
      );
      expect(openWaitingSceneWith(director, me, at, [otherId]), label).toBe(
        row.momentId,
      );
      // Opened once: it leaves the list, and meeting again opens nothing.
      expect(
        director
          .waitingScenes(me, date)
          .some((item) => item.momentId === row.momentId),
        label,
      ).toBe(false);
      expect(openWaitingSceneWith(director, me, at, [otherId]), label).toBe(
        undefined,
      );
      // It plays: a purpose scene composes its talk; another is a story the
      // page opens on its narration (a visit to someone ill).
      const book = director.ledger.people.get(me)!;
      const entry = book.schedule.find(
        (item) => item.momentId === row.momentId,
      )!;
      expect(entry.stop?.recordId, label).toBe(row.momentId);
      const result = purposeScene(core, director, me, entry, {
        includeHeld: true,
      });
      expect(result?.kind ?? "story", label).not.toBe("skipped");
      process.stdout.write(
        `TOGETHER ${label}, day ${STEP * step}: ${result?.kind ?? "story"}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    passed.push(
      `${where}: no scene waiting for a meeting in ${STEP * STEPS} days`,
    );
  }
  throw new Error(
    `no scene waiting for a meeting in any draw: ${passed.join("; ")}`,
  );
}, 2_400_000);
