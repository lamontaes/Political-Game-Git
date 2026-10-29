import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { IsoDate, PersonId } from "../core2/types";
import { openConversation, say, subjectsBetween } from "./conversation";
import { OPENING_ADDRESS_EVENT } from "./opening-story";

// Talk at home on the first evening (play-stop-01-talk-says-nothing-a).
// Between relatives a talk leaves out work, school and home (owner, batch
// 11), so on the first evening a household member had nothing on record to
// raise and Talk ended at once. The household watches the President's address
// with the player on the news at home; the address is the day's subject, the
// player has four replies, and each reply moves the talk on to the other
// person's own take with four new replies. Places are drawn in turn until the
// player lives with someone.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 6;

it(`a household member opens from the day, and each reply moves the talk on (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "household-talk");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = core.people.get(playerId!)!;
    const household = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.householdId === player.householdId &&
          row.id !== player.id,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!household.length) {
      tried.push(`${place.name} (the player lives alone)`);
      continue;
    }
    const address = `${OPENING_ADDRESS_EVENT}:${core.date}`;
    household.forEach((member, index) => {
      const here = `${where}: ${member.id}`;
      // They watched it with the player.
      expect(
        core.knowledgeByPerson
          .get(member.id)
          ?.has(`event:${address}:experienced`),
        here,
      ).toBe(true);
      const talk = openConversation(core, player.id, member.id as PersonId, {
        director,
      });
      // The opener is theirs, about the day's address, and asks the player.
      const [opener] = talk.lines;
      expect(opener?.speakerId, here).toBe(member.id);
      expect(opener?.kind, here).toBe("address");
      expect(opener?.act, here).toBe("ask");
      // Four replies, each a different move.
      expect(talk.choices.length, here).toBe(4);
      expect(new Set(talk.choices.map((row) => row.move)).size, here).toBe(4);
      // Each reply moves the talk: they answer with their own take, and four
      // new replies follow. Members take the replies in turn.
      const pick = talk.choices[index % talk.choices.length]!;
      const said = talk.lines.length;
      const next = say(core, talk, pick.key);
      const answer = next.lines[said + 1];
      expect(answer?.speakerId, `${here}: ${pick.text}`).toBe(member.id);
      expect(answer?.kind, `${here}: ${pick.text}`).toBe("address-view");
      expect(next.choices.length, `${here}: ${pick.text}`).toBe(4);
      expect(
        new Set(next.choices.map((row) => row.move)).size,
        `${here}: ${pick.text}`,
      ).toBe(4);
      console.log(
        `HOUSEHOLD TALK ${here}: "${opener!.text}" / you: "${pick.text}" / "${answer!.text}" / ${next.choices.map((row) => `"${row.text}"`).join(" ")}`,
      );
    });
    // A month on, the address is no longer the day's news: nobody opens on
    // it, however late they heard of it (golden-address-talk-fades).
    const startedOn = core.date;
    (core as { date: IsoDate }).date = addDays(makeIsoDate(core.date), 30);
    for (const member of household)
      expect(
        subjectsBetween(core, member.id as PersonId, player.id, director).some(
          (row) => row.kind === "address",
        ),
        `${where}: ${member.id} a month after ${startedOn}`,
      ).toBe(false);
    return;
  }
  throw new Error(
    `the player lived alone in ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
