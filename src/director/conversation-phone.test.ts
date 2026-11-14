/**
 * A call is greeted and ended as a call (round 12, by-phone lines). Pinned to
 * three named places and fixed seeds (skill pinned-tests): the other person
 * answers, the player says who it is in their own words, the greeting never
 * says a thing that needs the two in one room ("Good to see you"), and the
 * goodbye never invites a stop-in. A visit, with the same people, never says
 * what only a call says.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import { openConversation } from "./conversation";

/** Words that need the two people in one room. */
const IN_ROOM =
  /good to see you|good seeing you|nice seeing you|always good to see|run(ning)? into|there you are|look who it is|thought that was you|stop(ped)? (in|by)|come (by|see|back)|see you around|just who i wanted to see/i;
/** Words only a call says. */
const ON_THE_LINE =
  /^(hello\?|yes, hello\?)$|it's (me|[A-Z][a-z]+)\.$|thanks for (calling|the call)|glad you called|call (me )?anytime|hear your voice|let you go/i;

const SEEDS = [
  ["phone-pin-a", "b550a10bcd3bf708"],
  ["phone-pin-b", "18661a5958abacd3"],
  ["phone-pin-c", "5c1b2e77d3a94f10"],
] as const;

describe("a call is greeted and ended as a call", () => {
  it.each(SEEDS)(
    "%s: no in-room words on a call, none of the line's on a visit",
    (_name, seed) => {
      setBookkeeping(false);
      const place = drawPlace(seed, "phone:0");
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      director.watch(core, playerId);
      core.focusPersonIds.add(playerId);
      const me = core.people.get(playerId as PersonId)!;
      const api = coreAPI(core);
      const others = [...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.tier !== "husk" &&
            row.id !== me.id &&
            row.householdId !== me.householdId &&
            row.jobId !== undefined,
        )
        .slice(0, 6);
      for (const row of others)
        api.meet(me.id, row.id, {
          placeId: me.placeId,
          sourceId: "fixture-meeting",
          cause: "met-in-group",
          hours: 1,
        });
      let answered = 0;
      let named = 0;
      for (const [at, row] of others.entries()) {
        const call = openConversation(core, playerId as PersonId, row.id, {
          director,
          byPhone: true,
        });
        for (const line of call.lines.filter(
          (item) => item.kind === "greet" || item.kind === "farewell",
        ))
          expect(line.text, `${place.name} call ${at}`).not.toMatch(IN_ROOM);
        const greet = call.lines.filter((item) => item.kind === "greet");
        if (greet.length) {
          // The other person answers, then the player says who it is, then the other goes on.
          answered += 1;
          expect(greet.map((item) => item.speakerId === playerId)).toEqual([
            false,
            true,
            false,
          ]);
          if (/it's [A-Z]/.test(greet[1]!.text)) named += 1;
        }
      }
      expect(answered, `${place.name}: calls answered`).toBeGreaterThan(0);
      expect(
        named,
        `${place.name}: the player names themselves to a stranger`,
      ).toBe(answered);
      for (const [at, row] of others.entries()) {
        const visit = openConversation(core, playerId as PersonId, row.id, {
          director,
        });
        for (const line of visit.lines)
          expect(line.text, `${place.name} visit ${at}`).not.toMatch(
            ON_THE_LINE,
          );
      }
    },
    120_000,
  );
});
