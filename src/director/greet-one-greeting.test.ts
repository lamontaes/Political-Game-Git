/**
 * A face-to-face talk opens with one greeting (Words lead, Nov 16). A composed
 * greeting is an opener ("Hello.", "Hi.", "Hey.") then a core ("Funny running
 * into you, David."); an opener that is itself a whole greeting ("Good to see
 * you.", "Hello there.", "Hi there.") made two greetings in a row. Pinned to
 * Sheridan WY (5669845), seed 7 (skill pinned-tests).
 */
import { describe, expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import bank from "../../data/english/parts/conversation.json" with { type: "json" };
import { openConversation } from "./conversation";

const WHOLE_GREETINGS = ["Good to see you.", "Hello there.", "Hi there."];

describe("a talk opens with one greeting", () => {
  it("no piece that is a whole greeting is an opener", () => {
    const parts = (
      bank as unknown as {
        parts: { text: string; uses: { move: string }[] }[];
      }
    ).parts;
    for (const text of WHOLE_GREETINGS)
      for (const part of parts.filter((row) => row.text === text))
        expect(
          part.uses.map((use) => use.move),
          text,
        ).not.toContain("greet-opener");
  });

  it("a split greeting's first turn is never a whole greeting, Sheridan WY, seed 7", () => {
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
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
          (row.householdId === me.householdId || row.jobId !== undefined),
      )
      .slice(0, 60);
    for (const row of others)
      api.meet(me.id, row.id, {
        placeId: me.placeId,
        sourceId: "fixture-meeting",
        cause: "met-in-group",
        hours: 1,
      });
    let split = 0;
    // A first meeting has no hello to say twice; the talks after a day and
    // after forty days are the ones that open with an opener then a core.
    for (const days of [1, 40]) {
      advanceCore(core, addDays(makeIsoDate(core.date), days));
      for (const row of others) {
        const talk = openConversation(core, playerId as PersonId, row.id, {
          director,
        });
        const greets = talk.lines.filter(
          (line) => line.kind === "greet" && line.speakerId === row.id,
        );
        if (greets.length < 2) continue;
        split += 1;
        expect(
          WHOLE_GREETINGS,
          `${row.id} after ${days} days: "${greets[0]!.text}" then "${greets[1]!.text}"`,
        ).not.toContain(greets[0]!.text);
      }
    }
    expect(split, "talks that open with an opener then a core").toBeGreaterThan(
      0,
    );
  }, 150_000);
});
