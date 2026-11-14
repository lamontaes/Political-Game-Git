import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { IsoDate, PersonId } from "../core2/types";
import {
  noteHeard,
  openConversation,
  say,
  subjectsBetween,
  takesStands,
} from "./conversation";
import { OPENING_ADDRESS_EVENT } from "./opening-story";
import { expectUpToFourDifferent } from "./reply-set-check";

// Talk at home on the first evening (play-stop-01-talk-says-nothing-a).
// Between relatives a talk leaves out work, school and home (owner, batch
// 11), so on the first evening a household member had nothing on record to
// raise and Talk ended at once. The household watches the President's address
// with the player on the news at home; the address is the day's subject, the
// player has four replies, and each reply moves the talk on to the point of
// the address the other person raises, with four new replies. Places are drawn in turn until the
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
    let opened = 0;
    let onAddress = 0;
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
      // The opener is theirs: their own point of the address they watched
      // together, never "Did you see the speech?" (owner, Nov 12: "settle in
      // to listen to the president's address"; what a household did together
      // each of them knows).
      const [opener] = talk.lines;
      // Someone who takes no stand (under the youngest age the rules name,
      // or under the voting age without following politics closely; lead,
      // Nov 12) has no point of their own to open on, and nobody asks
      // whether the player saw what they watched together: they raise
      // nothing about the address, and with nothing else on record today the
      // talk does not open (owner, Oct 24).
      if (!takesStands(core, member.id as PersonId)) {
        expect(
          talk.lines.filter(
            (line) => line.kind === "address" || line.kind === "address-point",
          ),
          here,
        ).toEqual([]);
        if (!talk.lines.length) expect(talk.choices, here).toEqual([]);
        return;
      }
      opened += 1;
      // One person in the house raises the address in a day; every other
      // housemate who speaks opens on something of their own, and says
      // nothing when they have nothing (lead, Nov 14, rule 61).
      if (opener?.kind !== "address-point") {
        if (opener) {
          expect(opener.speakerId, here).toBe(member.id);
          expect(opener.kind, here).not.toBe("address");
        }
        return;
      }
      onAddress += 1;
      expect(opener.speakerId, here).toBe(member.id);
      // Up to four replies, each a different move (owner, Nov 10).
      expectUpToFourDifferent(talk.choices, here);
      // Each reply is answered: they take it up in their own words.
      // Members take the replies in turn.
      const pick = talk.choices[index % talk.choices.length]!;
      const said = talk.lines.length;
      const next = say(core, talk, pick.key);
      const answer = next.lines[said + 1];
      // Every reply is answered, agree and disagree included, with what
      // comes next for the side they took (round 9: an answer fits the
      // side), so no talk ends on the player's line.
      expect(answer?.speakerId, `${here}: ${pick.text}`).toBe(member.id);
      expect(answer?.kind, `${here}: ${pick.text}`).toBe("address-point-back");
      noteHeard(core, next);
      console.log(
        `HOUSEHOLD TALK ${here}: "${opener!.text}" / you: "${pick.text}" / "${answer!.text}" / ${next.choices.map((row) => `"${row.text}"`).join(" ")}`,
      );
    });
    // The address is raised once in the house, and is not lost: a household
    // where it was raised by none is passed over, and named.
    expect(
      onAddress,
      `${where}: housemates who opened on the address`,
    ).toBeLessThanOrEqual(1);
    if (opened && !onAddress) {
      tried.push(`${place.name} (no housemate had a point of the address)`);
      continue;
    }
    // A household where nobody takes a stand is passed over, and named.
    if (!opened) {
      tried.push(`${place.name} (nobody at home takes a stand)`);
      continue;
    }
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
    `no one at home opened on the address in ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
