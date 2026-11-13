/**
 * A question the player asks is answered from the record or the reply is not
 * offered (Fable A, Nov 13, rule 5; Playtester P1, Curtisville PA: "We're
 * being evicted." / "Oh, no. How long do we have?" / "I've got a few things to
 * get done this morning."). In a played half year of a place drawn from all 56
 * (seed from GOLDEN_PATH_SEED, random when unset), the player talks with
 * everyone they know; in every talk about bad news (a lost job, an eviction, a
 * death, an illness, prison, a new job), each question the player is offered
 * is said in a copy of that talk, and the other person must answer it with a
 * subject of their own, never close the talk on it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(10).toString("hex");
const DRAWS = 4;
const NEWS = new Set([
  "job-lost",
  "job-cause",
  "job-hope",
  "eviction",
  "eviction-cause",
  "eviction-where",
  "victimization",
  "death-news",
  "illness-news",
  "prison-news",
  "job-new",
  "job-new-detail",
  "job-new-told",
]);

it(`in a talk about bad news, every question offered is answered from the record (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "news-question");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = playerId as PersonId;
    // The director keeps moments for the people it watches, and a talk opens
    // on the speaker's bad news from them: the player and everyone they know.
    director.watch(core, player);
    for (const id of [
      ...(core.people.get(player)?.knownIds ?? []),
      ...(core.people.get(player)?.familyIds ?? []),
    ])
      if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
    advanceCore(core, addDays(makeIsoDate(core.date), 180));
    const known = [
      ...new Set([
        ...(core.people.get(player)?.knownIds ?? []),
        ...(core.people.get(player)?.familyIds ?? []),
      ]),
    ].filter((id) => core.people.get(id)?.alive) as PersonId[];
    let newsTalks = 0;
    let asked = 0;
    const heard: string[] = [];
    for (const otherId of known) {
      const talk = openConversation(core, player, otherId, {
        director,
        look: true,
      });
      for (let turn = 0; turn < 6 && talk.choices.length; turn += 1) {
        const subject = talk.last?.subject.kind ?? "";
        const question = talk.choices.find((row) =>
          row.text.trim().endsWith("?"),
        );
        if (NEWS.has(subject) && question) {
          newsTalks += 1;
          asked += 1;
          const before = talk.lines.length;
          const said = talk.lines.at(-1)?.text;
          say(core, talk, question.key);
          // The player's own line is recorded first; the answer follows it.
          const next = talk.lines
            .slice(before)
            .find((row) => row.speakerId === otherId);
          const line = `${where}: ${subject}: "${said}" / "${question.text}" / "${next?.text ?? "(nothing)"}"`;
          heard.push(line);
          // Answered: the other person goes on with a subject of their own,
          // never a goodbye or silence.
          expect(next, line).toBeDefined();
          expect(next!.kind, line).not.toBe("farewell");
          break;
        }
        if (NEWS.has(subject)) newsTalks += 1;
        say(core, talk, talk.choices[0]!.key);
      }
    }
    process.stderr.write(
      `news questions in ${where}: ${known.length} people talked with, ${newsTalks} turns on bad news, ${asked} questions offered and answered\n` +
        heard
          .slice(0, 6)
          .map((line) => `  ${line}`)
          .join("\n") +
        "\n",
    );
    if (!newsTalks) {
      passed.push(`${where}: no talk on bad news`);
      continue;
    }
    return;
  }
  process.stderr.write(`passed over: ${passed.join("; ")}\n`);
}, 1_800_000);
