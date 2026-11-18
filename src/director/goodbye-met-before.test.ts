import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { ENCOUNTERS } from "../core2/encounters";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import conversationBank from "../../data/english/parts/conversation.json" with { type: "json" };
import { openConversation, say } from "./conversation";

// Someone the player met on an earlier day says a goodbye that speaks to
// someone known ("Always good to see you"). Before the fix the first reply
// stamped today as the last contact, so the goodbye read the contact as
// today's and never said the player's name (item
// words-goodbyes-never-say-the-name-of-someone-met-before). Pinned place and
// seed: Kingston (place key 3238100), world seed "c1" (Account lead, Nov 15).
const PLACE_KEY = "3238100";
const SEED = "c1";
/** The pieces of the goodbye core that need someone the player has met before. */
const KNOWN_GOODBYES = new Set(
  conversationBank.parts
    .filter(
      (part) =>
        part.key.startsWith("conversation.farewell-core.") &&
        part.uses.some((use) =>
          (use as { requiresFacts?: string[] }).requiresFacts?.includes(
            "met-before",
          ),
        ),
    )
    .map((part) => part.key),
);

it("someone met on an earlier day says a goodbye for someone known (Kingston, seed c1)", () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(SEED, "2025-01-20", {
    twoLevel: true,
    placeKey: PLACE_KEY,
  });
  const me = playerId as PersonId;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const mine = core.people.get(me)!.householdId;
  const others = [...core.people.values()]
    .filter(
      (row) => row.alive && row.tier !== "husk" && row.householdId !== mine,
    )
    .slice(0, 40);
  // The earlier meeting, through the game's own call (the meeting at a visit).
  for (const other of others)
    coreAPI(core).meet(me, other.id as PersonId, {
      placeId: other.householdId,
      sourceId: `goodbye-met-before:${other.id}`,
      cause: ENCOUNTERS.causes.metOnVisit,
      hours: 2,
    });
  advanceCore(core, addDays(makeIsoDate(core.date), 4));
  const said: string[] = [];
  for (const other of others) {
    const talk = openConversation(core, me, other.id as PersonId, {
      director,
      minuteOfDay: 11 * 60,
    });
    for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
      say(core, talk, talk.choices[turn % talk.choices.length]!.key);
    for (const line of talk.lines)
      if (line.kind === "farewell")
        for (const part of (line as { wording?: { parts?: string[] } }).wording
          ?.parts ?? [])
          if (KNOWN_GOODBYES.has(part)) said.push(line.text);
  }
  expect(said.length, "goodbyes for someone known, said").toBeGreaterThan(0);
}, 120_000);
