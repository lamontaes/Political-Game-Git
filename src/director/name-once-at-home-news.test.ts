import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { noteHeard, openConversation, say } from "./conversation";

// A name is said once in a talk (rule 105), including the answer a person
// gives back after the player's reply to news they read: Onton (place key
// 2158116, world seed "c2"), 40 days, the housemates' talks each evening.
it("a housemate says the player's name once in a talk about the news (Onton, seed c2)", () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld("c2", "2025-01-20", {
    twoLevel: true,
    placeKey: "2158116",
  });
  const me = playerId as PersonId;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const twice: string[] = [];
  let talks = 0;
  for (let day = 0; day < 40; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const home = [
      ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ??
        []),
    ].filter((id) => id !== me && core.people.get(id)?.alive) as PersonId[];
    for (const other of home) {
      const talk = openConversation(core, me, other, {
        director,
        presentIds: home,
        minuteOfDay: 20 * 60,
      });
      if (!talk.lines.length) continue;
      noteHeard(core, talk);
      for (let turn = 0; turn < 8 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[turn % talk.choices.length]!.key);
      talks += 1;
      const name = new RegExp(`\\b${core.people.get(me)!.givenName}\\b`, "i");
      const said = talk.lines.filter(
        (line) => line.speakerId === other && name.test(line.text),
      );
      if (said.length > 1)
        twice.push(said.map((line) => line.text).join(" | "));
    }
  }
  expect(talks).toBeGreaterThan(10);
  expect(twice).toEqual([]);
}, 120_000);
