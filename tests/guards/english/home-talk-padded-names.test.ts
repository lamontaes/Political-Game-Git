import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { gameStartDate } from "../../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { advanceCore } from "../../../src/core2/life";
import type { PersonId } from "../../../src/core2/types";
import {
  meetOverTalk,
  noteHeard,
  openConversation,
  say,
} from "../../../src/director/conversation";
import { drawPlace } from "../../../scripts/core2-year/place";

/**
 * The padded names are out of the home talks (owner, Nov 14, 2026, 06:38Z: "The
 * padded names come out"; Words lead's rule 105: a speaker uses the listener's
 * name in at most one line of a talk, where it does work). Two checks. The bank
 * holds `{you}` only in a thanks, sorry or please line and in the first-meeting
 * lines of the here-back move. And in a played world in a drawn place, no answer
 * a housemate gives back ends in the player's name, and a line that carries a
 * record slot cites the record the slot reads.
 */
const ROOT = path.resolve(__dirname, "../../..");
const parts = (
  JSON.parse(
    readFileSync(
      path.join(ROOT, "data/english/parts/conversation.json"),
      "utf8",
    ),
  ) as { parts: { key: string; text: string }[] }
).parts;
const NAME_MAY_STAY = /\b(thank|thanks|sorry|apolog\w*|please|dear)\b/i;
/** The slots a rewritten answer reads from its subject's record, by the fact that sets each. */
const RECORD_SLOTS: Readonly<Record<string, string>> = {
  said: "said",
  employer: "employer",
  office: "office",
  hours: "hours",
  school: "school",
  rent_again: "rent-again",
  illness: "illness",
  decider: "decider",
  name: "name",
};

describe("the padded names are out of the home talks", () => {
  it("holds {you} only in a thanks, sorry or please line and a first meeting", () => {
    const padded = parts
      .filter((part) => part.text.includes("{you}"))
      .filter((part) => !NAME_MAY_STAY.test(part.text))
      .filter((part) => !part.key.startsWith("conversation.here-back-core."))
      // The agreeing answers to the President's address are rewritten in #9783.
      .filter(
        (part) => !part.key.startsWith("conversation.address-point-back-"),
      );
    expect(padded.map((part) => part.key)).toEqual([]);
  });

  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "home-talk-padded-names",
    "home-talk-padded-names",
  );
  it(`says no answer ending in the player's name in ${place.key} (seed ${place.seed}), and cites the record a slot reads`, () => {
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const playerId = core.playerId as PersonId;
    const first = core.people.get(playerId)!.givenName;
    const house = core.households.get(core.people.get(playerId)!.householdId)!;
    for (const id of house.memberIds) director.watch(core, id as PersonId);
    const byKey = new Map(parts.map((part) => [part.key, part.text]));
    const endsInName = new RegExp(
      `,\\s(?:${first}|Dad|Mom|Mother|Father|Grandpa|Grandma|Grandfather|Grandmother)[.!?]$`,
    );
    let said = 0;
    let slotted = 0;
    let cited = 0;
    const named: string[] = [];
    const uncited: string[] = [];
    for (let day = 0; day < 40; day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const id of house.memberIds) {
        if (id === playerId || !core.people.get(id as PersonId)?.alive)
          continue;
        const talk = openConversation(core, playerId, id as PersonId, {
          director,
          presentIds: [playerId, id as PersonId],
          minuteOfDay: 19 * 60,
        });
        if (!talk.lines.length) continue;
        meetOverTalk(core, talk);
        noteHeard(core, talk);
        const choices = talk.choices.filter((row) => !row.lie);
        const choice = choices[said % Math.max(choices.length, 1)];
        if (!choice) continue;
        const from = talk.lines.length;
        const after = say(core, talk, choice.key);
        for (const line of after.lines.slice(from)) {
          if (line.speakerId === playerId) continue;
          said += 1;
          const keys = line.wording?.parts ?? [];
          if (
            endsInName.test(line.text) &&
            !keys.some(
              (key) =>
                NAME_MAY_STAY.test(byKey.get(key) ?? "") ||
                key.startsWith("conversation.here-back-core."),
            )
          )
            named.push(`${line.text} <${keys.join("+")}>`);
          for (const key of keys)
            for (const [slot, fact] of Object.entries(RECORD_SLOTS)) {
              if (!(byKey.get(key) ?? "").includes(`{${slot}}`)) continue;
              const read = after.last?.facts[fact]?.sourceRecordIds;
              if (!read) continue;
              slotted += 1;
              if (line.sourceRecordIds.some((rid) => read.includes(rid)))
                cited += 1;
              else uncited.push(`${line.text} <${key}>`);
            }
        }
      }
    }
    console.log(
      `home-talk-padded-names: ${place.key} seed ${place.seed}: ${said} answers said, ${slotted} with a record slot, ${cited} citing it`,
    );
    expect(said).toBeGreaterThan(0);
    expect(named).toEqual([]);
    expect(uncited).toEqual([]);
  }, 900_000);
});
