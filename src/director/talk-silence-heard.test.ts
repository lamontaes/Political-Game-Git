/**
 * What the player hears after staying silent is kept as heard today, like what
 * follows a spoken line (`say`), and is picked with what was already heard
 * today held back. `sayNothing` skipped both (the acting CTO's read of the
 * frozen Train 892427ec, fault 4), so a later talk the same day could say it
 * again. Pinned to Sheridan WY (5669845), seed "7", as play opens it: the talk
 * route opens a talk, keeps what was said (`noteHeard`), and the player says
 * nothing (skill pinned-tests).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { noteHeard, openConversation, sayNothing } from "./conversation";

it("keeps what the other person says after the player's silence as heard today", () => {
  const { core, playerId } = buildBenchWorld("7", gameStartDate(), {
    twoLevel: true,
    placeKey: "5669845",
  });
  const heard = () =>
    new Set(
      [...(core.knowledgeByPerson.get(playerId as PersonId) ?? [])]
        .filter(([key]) => key.startsWith("talk:heard:"))
        .map(([key]) => key.slice("talk:heard:".length)),
    );
  let proved = 0;
  const missing: string[] = [];
  for (const id of core.people.keys()) {
    if (id === playerId || proved >= 6) continue;
    const talk = openConversation(core, playerId as PersonId, id as PersonId);
    if (!talk.lines.length || talk.look) continue;
    noteHeard(core, talk);
    const said = talk.lines.length;
    sayNothing(core, talk);
    const parts = talk.lines
      .slice(said)
      .flatMap((line) => line.wording?.parts ?? []);
    if (!parts.length) continue;
    proved += 1;
    const kept = heard();
    for (const part of parts)
      if (!kept.has(part)) missing.push(`${id}: ${part}`);
  }
  expect(proved, "talks with a line after silence").toBeGreaterThan(0);
  expect(missing, "lines said after silence but not kept as heard").toEqual([]);
}, 120_000);
