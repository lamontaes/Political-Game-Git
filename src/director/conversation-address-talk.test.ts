/**
 * The talk after the President's address (owner, Nov 1: "There's only one
 * dialogue for after the president... that's not how I approve this"). In
 * three played openings in places drawn from all 56, the player talks with
 * everyone they live with on the opening evening:
 *
 * - what each housemate made of the address is said in their own voice, by
 *   their stance on the President and their traits, so the first lines
 *   differ across the three openings;
 * - no line about the President says "they" for a President whose record
 *   gives a gender ("Why would it say they? Why not she?");
 * - every answer the player can give is met by a line written for that
 *   answer, never a "Suit yourself" to a disagreement;
 * - a second talk with the same person does not open the address again.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { officialsIn } from "../core2/modules/officials";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };
import { openConversation, say } from "./conversation";
import { answerInTalk } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const OPENINGS = 3;
const ATTEMPTS = 8;
const TURNS = 6;
const ABOUT_ADDRESS = /^address/;
const VIEW_MOVES = (rules.replyMoves as Record<string, unknown>)[
  "address-view"
] as Record<string, string>;

it(`the talk after the address varies by speaker, names no President "they", and answers each reply (seed ${seed})`, () => {
  setBookkeeping(false);
  const openers: string[] = [];
  const tried: string[] = [];
  for (let draw = 0; draw < ATTEMPTS && openers.length < OPENINGS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "address-talk");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const president = officialsIn(coreAPI(core), "US:president")[0];
    const gender = president
      ? core.people.get(president.id)?.looks?.gender
      : undefined;
    const housemates = [...core.people.values()].filter(
      (row) =>
        row.alive &&
        row.id !== me &&
        row.householdId === core.people.get(me)!.householdId,
    );
    let heard: string | null = null;
    for (const other of housemates) {
      const otherId = other.id as PersonId;
      const talk = openConversation(core, me, otherId, { director });
      for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
        const view = talk.lines.find(
          (line) => line.kind === "address-view" && line.speakerId === otherId,
        );
        if (view && !heard) {
          heard = view.text;
          // Each answer the player may give here is met by a line written for
          // that answer, from the one scene bank.
          for (const choice of talk.choices.filter(
            (row) => row.answers === view.subjectId,
          )) {
            const reply = answerInTalk(core, {
              replyMove: VIEW_MOVES[choice.move] ?? "answer",
              answered: `address-view:${choice.move}`,
              key: "address-view",
              speakerId: otherId,
              momentKey: `${me}:${otherId}:${choice.key}`,
            });
            process.stdout.write(
              `${where} ${other.givenName}: "${view.text}" / you: "${choice.text}" / ${other.givenName}: "${reply?.text ?? "(nothing)"}"\n`,
            );
            expect(reply, `${where}: "${choice.text}"`).toBeTruthy();
            expect(reply!.text, where).not.toMatch(/Suit yourself/);
          }
        }
        // The replies offered about the address name no President "they"
        // either.
        if (gender === "female" || gender === "male")
          for (const choice of talk.choices.filter((row) =>
            /(^|>)address/.test(row.answers),
          ))
            expect(choice.text, `${where}: offered`).not.toMatch(
              /\b(they|them|their)\b/i,
            );
        say(core, talk, talk.choices[0]!.key);
      }
      // Nothing about the President says "they" for a President whose
      // record gives a gender.
      if (gender === "female" || gender === "male")
        for (const line of talk.lines.filter((row) =>
          ABOUT_ADDRESS.test(row.kind),
        ))
          expect(line.text, `${where}: ${line.kind}`).not.toMatch(
            /\b(they|them|their)\b/i,
          );
      // A second talk with the same person does not open the address again.
      if (talk.lines.some((line) => line.kind === "address-view")) {
        const again = openConversation(core, me, otherId, { director });
        expect(
          again.lines.filter((line) => ABOUT_ADDRESS.test(line.kind)),
          `${where}: ${other.givenName} again: ${again.lines.map((line) => line.text).join(" / ")}`,
        ).toEqual([]);
      }
      if (heard) break;
    }
    if (!heard) {
      tried.push(`${where}: no housemate took a side on the address`);
      continue;
    }
    openers.push(heard);
  }
  process.stdout.write(`ADDRESS OPENERS ${seed}: ${openers.join(" | ")}\n`);
  expect(openers.length, tried.join("; ")).toBe(OPENINGS);
  // The first lines after the address differ across the three openings.
  expect(new Set(openers).size, openers.join(" | ")).toBeGreaterThan(1);
}, 1_800_000);
