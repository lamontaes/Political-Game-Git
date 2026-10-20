import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreEventInput } from "../core2/types";

// A bill signed or vetoed is a public record (`executive-action`) that names
// the bill's sponsor; the sponsor has a signing or veto scene citing that
// record. Played for a year in places drawn from all 56 until one of each
// scene has happened (or the draws run out, which the output says).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a signed or vetoed bill is a scene for its sponsor, citing the record (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen: string[] = [];
  const scenes = new Set<string>();
  for (let draw = 0; draw < 8 && scenes.size < 2; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "bill-signed-scenes");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const events: CoreEventInput[] = [];
    // The people a record names are watched the day it is written.
    const emit = api.emit.bind(api);
    api.emit = (event) => {
      if (event.kind === "executive-action") {
        events.push(event);
        for (const id of event.personIds) director.watch(core, id);
      }
      return emit(event);
    };
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), 365));
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    for (const [personId, book] of director.ledger.people)
      for (const row of book.schedule)
        for (const binding of row.bindings) {
          if (binding.typeKey !== "bill-signed" && binding.typeKey !== "veto")
            continue;
          const moment = book.momentsById.get(row.momentId)!;
          const event = events.find((e) => e.id === moment.causeId);
          if (!event) continue;
          // The scene is the sponsor's, and the record says what was done.
          expect(event.facts?.sponsorId, `${where}: ${event.id}`).toBe(
            personId,
          );
          expect(
            binding.typeKey === "bill-signed" ? "signed" : "vetoed",
            `${where}: ${event.id}`,
          ).toBe(event.facts?.action);
          expect(
            binding.roles.find((r) => r.role === "sponsor")?.personIds,
          ).toContain(personId);
          scenes.add(`${binding.typeKey}:${moment.causeId}`);
        }
    seen.push(`${place.name}: ${events.length} records`);
  }
  console.log(
    `bill-signed-scenes: ${seen.join("; ")}; scenes ${[...scenes].join(", ")}`,
  );
  expect(
    scenes.size,
    `no scene from a record: ${seen.join("; ")}`,
  ).toBeGreaterThan(0);
}, 3_600_000);
