/**
 * The player hears their own interview the day it runs, whether or not they
 * follow the outlet that printed it. Before the fix, interviews from outlets
 * the player did not follow were printed but never reached the player, so
 * News never showed them (Account lead check, Nov 14).
 *
 * Re-pinned Nov 15 (lead's yes, 09:02Z). The old pin was Cannonville, Utah,
 * where the first two stations to call (Sept 29 and 30, 2025) were ones the
 * player did not follow. That premise no longer holds: a market's stations
 * now weigh a village's race against their own audience
 * (press-market-stations-seek-village-candidates), so at Cannonville only the
 * town's outlet of record calls, and the player follows it. The new pin is
 * chosen from the record, not by running until it passes: at Abita Springs,
 * Louisiana, the town's paper of record invites the player (Mar 9, 2026) and
 * the player does not follow it. The assertions are unchanged.
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
import { takeCampaignDayChoice } from "../core2/campaign-day";
import { advanceCore } from "../core2/life";
import { storiesHeard } from "../core2/modules/news";
import { followersOf, interviewsFor } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";
import { composeScene } from "./scene";

/** Pinned: Abita Springs, Louisiana (the seed the alderman invitation test pins). */
const place = {
  name: "Abita Springs, Louisiana",
  key: "2200240",
  seed: "7e3b9d1f5a2c48e6b0d4f8a2c6e19b3d5f70a4c8e2b6d09f3a7c51e4b8d2f60a",
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
    const council = "contest:seat:gus2025:105787:council:0:2026-04-07";
    let filed = false;
    for (let week = 0; week < 60 && !filed; week += 1) {
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
    while (!published && today() < "2026-04-07") {
      advanceCore(core, addDays(today(), 1));
      // An outlet's invitation is answered from the Campaign tab's interview
      // choice (the invitation scene went with the unwritten kinds, Nov 17).
      const filingId = `filing:${council}:${me}`;
      for (const row of interviewsFor(api, me, filingId))
        if (row.status === "invited" && !seen.has(row.id)) {
          seen.add(row.id);
          takeCampaignDayChoice(api, filingId, "interview", {
            interviewId: row.id,
          });
        }
      for (const entry of director.ledger.people.get(me)!.schedule) {
        if (seen.has(entry.momentId)) continue;
        const types = entry.bindings.map((row) => row.typeKey);
        if (types.includes("interview-sitting")) {
          seen.add(entry.momentId);
          const scene = composeScene(core, director, me, entry);
          const talk = openConversation(core, me, scene!.talkToId!, {
            director,
            occasionId: entry.momentId,
          });
          // The player answers each question with a stand (the plain
          // answer), as the route above says; "nothing to add" is not an
          // answer, and an interview with none prints no story.
          for (let at = 0; talk.choices.length && at < 8; at += 1)
            say(
              core,
              talk,
              (talk.choices.find((c) => c.move === "plain") ?? talk.choices[0]!)
                .key,
            );
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
