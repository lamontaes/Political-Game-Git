/**
 * The player hears their own interview the day it runs, whether or not they
 * follow the outlet that printed it. Cannonville, Utah: the first two
 * stations to call (Sept 29 and 30, 2025) are ones the player does not
 * follow; before the fix those interviews were printed but never reached
 * the player, so News never showed them (Account lead check, Nov 14).
 *
 * The route is the ordinary one: the player is the resident the bench's
 * creator picks for a birthday, files for the town council the bench's way
 * (`fileForOffice`, the counter's own call), plays day by day to the first
 * invitation, says yes in its scene and answers each question at the sitting.
 */
import { describe, expect, it } from "vitest";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storiesHeard } from "../core2/modules/news";
import { followersOf, interviewsFor } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";

/** Pinned: Cannonville, Utah (pin-b:0 of the debate draw). */
const place = {
  name: "Cannonville, Utah",
  key: "4910330",
  seed: "3a5884384393f00611b28a5ce609187c999d9b0f21d97ef4a4e9e0a15f724a08",
};

describe("an interview the player sits for", () => {
  it(`reaches the player the day it runs, from an outlet they do not follow (pinned: ${place.name})`, () => {
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      playerBirthDate: "1978-06-01",
      playerGender: "female",
    });
    const { core, director } = world;
    const me = world.playerId as PersonId;
    core.playerId = me;
    for (const id of [
      me,
      ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ??
        []),
    ])
      if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
    const api = coreAPI(core);
    const today = () => makeIsoDate(core.date);
    const council = "contest:seat:gus2025:135819:council:0:2025-11-04";
    let filed = false;
    for (let week = 0; week < 40 && !filed; week += 1) {
      try {
        const result = fileForOffice(core, me, council) as {
          filing?: { status?: string };
        };
        filed = ["petitioning", "on-ballot"].includes(
          result.filing?.status ?? "",
        );
      } catch {
        // Filing is not open yet.
      }
      if (!filed) advanceCore(core, addDays(today(), 7));
    }
    expect(filed, `${place.name}: the player filed`).toBe(true);

    const seen = new Set<string>();
    let published: string | null = null;
    while (!published && today() < "2025-11-04") {
      advanceCore(core, addDays(today(), 1));
      for (const entry of director.ledger.people.get(me)!.schedule) {
        if (seen.has(entry.momentId)) continue;
        const types = entry.bindings.map((row) => row.typeKey);
        if (types.includes("interview-invite")) {
          seen.add(entry.momentId);
          const result = purposeScene(core, director, me, entry, {
            typeKey: "interview-invite",
          });
          if (result?.kind !== "composed") continue;
          const agree = result.scene.talk.tree.replies.findIndex(
            (reply) => reply.line.move === "agree",
          );
          expect(replyInScene(core, director, me, entry, [agree])).toBeTruthy();
        } else if (types.includes("interview-sitting")) {
          seen.add(entry.momentId);
          const scene = composeScene(core, director, me, entry);
          const talk = openConversation(core, me, scene!.talkToId!, {
            director,
            occasionId: entry.momentId,
          });
          for (let at = 0; talk.choices.length && at < 8; at += 1)
            say(core, talk, talk.choices[0]!.key);
          published = talk.sitting?.published ?? null;
          break;
        }
      }
    }
    expect(published, `${place.name}: an interview was sat for`).toBeTruthy();
    const row = interviewsFor(api, me).find((r) => r.id === published)!;
    expect(row.status).toBe("published");
    expect(row.storyId, `${place.name}: the outlet printed it`).toBeTruthy();
    // The case the fix is for: the player does not follow this outlet.
    expect(followersOf(api, row.outletId)).not.toContain(me);
    const heard = storiesHeard(api, me).find((s) => s.id === row.storyId);
    expect(heard?.date, `${place.name}: the player heard it`).toBe(today());
  }, 240_000);
});
