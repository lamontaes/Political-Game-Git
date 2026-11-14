import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A scene the director stages for the player and marks as waiting is played
// (director-a-waiting-scene-is-never-played): the clock stops for one a
// morning, the highest-ranked first, and one past its open days closes as a
// journal line with its reason. Played as the bench plays: the player's own
// clock runs 60 days in a drawn place, every stop resumed.
// Pinned to two named draws (pinned-tests): each holds waiting scenes in 60 days.
const PINNED = ["w7-wait-a", "w7-wait-b"] as const;
const DAYS = 60;

for (const seed of PINNED)
  it(`every waiting scene of the player opens or closes with its reason (seed ${seed})`, () => {
    const passed: string[] = [];
    const place = drawPlace(seed, "waiting-scenes");
    const where = `${place.name} (${place.key}), seed ${seed}`;
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
    const opened = new Set<string>();
    const end = addDays(makeIsoDate(core.date), DAYS);
    let packet: ReturnType<typeof advancePlayerV1> | undefined =
      advancePlayerV1(core, {
        controlledPersonId: me,
        through: { date: end, minuteOfDay: P.zero },
      });
    while (packet && packet.kind !== "complete") {
      if (packet.kind === "stop") {
        for (const stop of packet.stop.modules)
          if (stop.moduleId === director.module.id) opened.add(stop.recordId);
        packet = resumePlayerV1(core, {
          kind: "stop",
          pauseId: packet.pauseId,
        });
      } else
        packet = resumePlayerV1(core, {
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: packet.offers[P.zero]!.offerId,
        });
    }
    const staged = book.schedule.filter(
      (row) => row.outcome === "scene-waiting" || row.closed,
    );
    expect(
      staged.length,
      `${where}: no waiting scene in ${DAYS} days`,
    ).toBeGreaterThan(0);
    const waitingNow = director.waitingScenes(me, makeIsoDate(core.date));
    for (const row of staged) {
      const at = `${where}: ${row.momentId} (${row.bindings[0]?.typeKey})`;
      if (row.closed) {
        expect(row.outcome, at).toBe("journal-line");
        continue;
      }
      // Opened on a stop, or still within its open days and not yet due
      // (one that waits for the two people to meet), never left behind.
      const still = waitingNow.find((w) => w.momentId === row.momentId);
      expect(opened.has(row.momentId) || !!still, at).toBe(true);
      if (still) expect(still.openUntil >= core.date, at).toBe(true);
    }
    // A waiting scene that opened plays: the director composes it, or it is
    // a scene with no purpose talk, told by its narration.
    const played = staged.filter((row) => opened.has(row.momentId));
    expect(played.length, `${where}: no waiting scene opened`).toBeGreaterThan(
      0,
    );
    for (const row of played) {
      const result = purposeScene(core, director, me, row);
      expect(
        result?.kind ?? "no-purpose",
        `${where}: ${row.momentId} (${row.bindings[0]?.typeKey}) ${result?.kind === "skipped" ? result.reason : ""}`,
      ).not.toBe("skipped");
    }
    process.stdout.write(
      `WAITING ${where}: ${staged.length} waiting, ${played.length} opened (${played.map((row) => row.bindings[0]?.typeKey).join(", ")}), ${staged.filter((row) => row.closed).length} closed; passed over: ${passed.join("; ") || "none"}\n`,
    );
  }, 600_000);
