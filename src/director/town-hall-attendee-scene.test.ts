import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { holdTownHall } from "../core2/modules/meetings";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// A player in the crowd at another official's town hall gets a scene
// (owner, Nov 9: a purpose for every scene kind that lacks one; the Director
// helper's finding in #8109 that only the host's town-hall-question played).
// Someone the player knows who was in the room too asks them something: to
// stand up and ask about the question the room took, whether the host's
// answer meant anything, whether they will speak, whether to come again. The
// facts are the meetings engine's own town-hall row.
//
// HAND-STAGED: a seated official holds the town hall through the meetings
// engine's `holdTownHall` on a day the test picks (the engine's weekly
// weighing is rare in a played year); who comes is the engine's. The
// attendee's moment, the neighbor cast and the scene are the director's.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 8;
const TRIES = 20;
const SLOP = /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next
      ? [[...prefix, index], ...paths(reply.next, [...prefix, index])]
      : [[...prefix, index]],
  );

it(`a neighbor at another official's town hall asks the player something, from the hall's record (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `town-hall-attendee:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
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
      core.focusPersonIds.add(id);
      director.watch(core, id);
      const book = director.ledger.people.get(id)!;
      const api = coreAPI(core);
      const hosts = townSeats(api)
        .map((row) => row.holder?.personId as PersonId | undefined)
        .filter(
          (host): host is PersonId =>
            !!host && host !== id && !!core.people.get(host)?.alive,
        );
      if (!hosts.length) {
        tried.push(`${where}: no seated official`);
        continue;
      }
      let hall;
      for (let day = 0; day < TRIES && !hall; day += 1) {
        for (const hostId of hosts) {
          const row = holdTownHall(api, { hostId });
          const player = core.people.get(id)!;
          if (
            row.attendeeIds.includes(id) &&
            row.attendeeIds.some(
              (other) => other !== id && player.knownIds.has(other),
            )
          ) {
            hall = row;
            break;
          }
        }
        if (!hall) advanceCore(core, addDays(makeIsoDate(core.date), 1));
      }
      if (!hall) {
        tried.push(`${where}: the player and an acquaintance never both came`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const entry = book.schedule.find(
        (row) =>
          row.bindings.some((b) => b.typeKey === "town-hall-attendee") &&
          book.momentsById.get(row.momentId)?.causeId.includes(hall.id),
      );
      if (!entry) {
        tried.push(`${where}: no attendee scene scheduled for ${hall.id}`);
        continue;
      }
      const moment = book.momentsById.get(entry.momentId)!;
      const record = core.durableLog.get(moment.causeId)!;
      const result = purposeScene(core, director, id, entry, {
        typeKey: "town-hall-attendee",
      });
      expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") return;
      const { scene } = result;
      expect(scene.purpose, where).toBe("town-hall-neighbor");
      expect(scene.askedId, where).toBe(id);
      // The neighbor was in the room and the player knows them.
      expect(hall.attendeeIds, where).toContain(scene.askerId);
      expect(core.people.get(id)!.knownIds.has(scene.askerId), where).toBe(
        true,
      );
      expect(scene.askerId, where).not.toBe(hall.hostId);
      const host = scene.facts.find((row) => row.key === "host");
      expect(host?.recordIds, where).toContain(hall.id);
      const issue = scene.facts.find((row) => row.key === "issue");
      if (hall.questions.length)
        expect(issue?.recordIds, where).toContain(hall.id);
      const narration = scene.talk.narration.map((row) => row.text).join(" ");
      expect(narration, where).toContain(host!.text);
      for (const row of scene.talk.lines) {
        expect(row.text, where).not.toMatch(SLOP);
        expect(row.text, where).not.toMatch(/\ball right\b|this town/i);
      }
      expect(scene.talk.gaps, where).toEqual([]);
      expect(scene.talk.depth, where).toBeGreaterThan(1);
      const yes = paths(scene.talk.tree).find((full) => {
        let node: TreeNode | null = scene.talk.tree;
        for (const index of full) node = node?.replies[index]?.next ?? null;
        return node?.end?.ending?.keeps === "promise";
      });
      expect(yes, `${where}: no path keeps a promise`).toBeTruthy();
      const replyId = replyInScene(core, director, id, entry, yes!, {
        typeKey: "town-hall-attendee",
      });
      const reply = core.durableLog.get(replyId!);
      expect(reply?.facts?.typeKey, where).toBe("town-hall-attendee");
      expect(reply?.facts?.causeId, where).toBe(record.id);
      expect(reply?.facts?.keeps, where).toBe("promise");
      expect(reply?.personIds, where).toContain(scene.askerId);
      process.stdout.write(
        `TOWN HALL ATTENDEE ${where}: ${record.id}, ${scene.askerId} asks ${id}; facts ${scene.facts.map((f) => f.key).join(",")}; reply ${replyId} ending ${reply?.facts?.ending}\n  ${narration} | ${scene.talk.state.text}\n`,
      );
      return;
    }
    throw new Error(
      `no attendee scene played: ${tried.join("; ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
