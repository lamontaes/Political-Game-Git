import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lawChain } from "../core2/modules/laws";
import { wireItem } from "../core2/press-topics";
import type { CoreEventInput } from "../core2/types";
import { coreAPI } from "../core2/state";

// A recall's result and a vote to override a veto are public records the
// press reads as stories with a real topic, and a person they name has a
// recall or veto scene citing the record. Played for a year in places drawn
// from all 56, until one of each kind has happened.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`the press and the director read recall results and veto overrides (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen: string[] = [];
  let stories = 0;
  let scenes = 0;
  for (let draw = 0; draw < 12 && !(stories && scenes); draw++) {
    const place = drawPlace(`${seed}:${draw}`, "recall-override-scenes");
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
      if (event.kind === "recall-outcome" || event.kind === "veto-override") {
        events.push(event);
        for (const id of event.personIds) director.watch(core, id);
      }
      return emit(event);
    };
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), 365));
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const chain = lawChain(api);
    for (const event of events) {
      // What the town's press prints from the record.
      const item = wireItem(api, event, {
        placeId: chain.townPlaceId,
        stateKey: chain.stateKey,
      });
      expect(item, `${where}: ${event.id} is on the wire`).not.toBeNull();
      expect(item!.topic, `${where}: ${event.id}`).not.toBe(event.kind);
      stories += 1;
    }
    for (const [personId, book] of director.ledger.people)
      for (const row of book.schedule) {
        for (const binding of row.bindings) {
          if (binding.typeKey !== "veto" && binding.typeKey !== "recall")
            continue;
          const moment = book.momentsById.get(row.momentId)!;
          if (!events.some((e) => e.id === moment.causeId)) continue;
          expect(
            binding.roles.find(
              (r) => r.role === "sponsor" || r.role === "petitioners",
            )?.personIds,
            `${where}: ${personId} ${moment.causeId}`,
          ).toContain(personId);
          scenes += 1;
        }
      }
    seen.push(`${place.name}: ${events.length} records`);
  }
  console.log(`recall-override-scenes: ${seen.join("; ")}`);
  expect(stories, seen.join("; ")).toBeGreaterThan(0);
  expect(scenes, `no scene from a record: ${seen.join("; ")}`).toBeGreaterThan(
    0,
  );
}, 3_600_000);
