/**
 * Where a person stands politically, as the player learns it (the person's
 * card says "You don't know where they stand yet." until a talk or a story
 * teaches it). In places drawn from all 56:
 *
 * - someone close to the player who follows politics and carries a talk on
 *   says where they stand; the knowledge key is written, citing the views
 *   engine's record, with the talk as its source, and the card goes from the
 *   unknown line to their view;
 * - someone the player has no tie to says nothing of the kind, and the key is
 *   not written (the slide gives a stranger no weight);
 * - the same person weighs more with a closer tie, a keener follower of
 *   politics and a more outgoing temperament, never by a flip.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { knownCard } from "../bench/card";
import controls from "../bench/data/controls.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storiesHeard } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };
import { openConversation, say } from "./conversation";
import { answerInTalk } from "./scene-talk";
import {
  viewKey,
  viewRecordId,
  viewTopicWeight,
  viewWillingness,
} from "./view-learned";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 4;
const TURNS = 3;
const AFTER_ADDRESS_DAYS = 28;
// Only some towns print letters the player's habits bring to them (about one
// in three of the draws), so the news test draws until one does.
const NEWS_DRAWS = 10;
const VIEW_MOVES = (rules.replyMoves as Record<string, unknown>)[
  "own-view"
] as Record<string, string>;

/** The card's political-view line as the screen shows it (play.mjs). */
const viewLine = (card: { view: string | null }) =>
  card.view
    ? ((controls.leanWords as Record<string, string>)[card.view] ?? card.view)
    : controls.who.viewUnknown;

it(`a close, outgoing person says where they stand and the card learns it; a stranger does not (seed ${seed})`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const notes: string[] = [];
  for (let draw = 0; draw < DRAWS && told.length < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "view-learned");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const api = coreAPI(core);
    // Past the weeks the President's opening address leads every talk, which
    // is news before anything else.
    advanceCore(core, addDays(makeIsoDate(core.date), AFTER_ADDRESS_DAYS));
    const ranked = [...core.people.values()]
      .filter((p) => p.alive && p.id !== me)
      .map((p) => ({
        person: p,
        weight: viewTopicWeight(viewWillingness(core, p.id as PersonId, me)),
      }))
      .filter((row) => row.weight > 0)
      .sort((a, b) => b.weight - a.weight);
    notes.push(`${where}: ${ranked.length} willing`);
    for (const { person, weight } of ranked) {
      const id = person.id as PersonId;
      const before = knownCard(core, me, id);
      if (!before.viewUnknown) continue;
      expect(viewLine(before), where).toBe(
        "You don't know where they stand yet.",
      );
      expect(api.knows(me, viewKey(id)), where).toBeUndefined();
      const talk = openConversation(core, me, id, { director });
      const answers: string[] = [];
      for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
        const said = talk.lines.find((row) => row.kind === "own-view");
        // Every answer the player can give to it is met by a line written for
        // that answer.
        if (said && !answers.length)
          for (const choice of talk.choices.filter(
            (row) => row.answers === said.subjectId,
          )) {
            const reply = answerInTalk(core, {
              replyMove: VIEW_MOVES[choice.move] ?? "answer",
              answered: `own-view:${choice.move}`,
              key: "own-view",
              speakerId: id,
              momentKey: `${me}:${id}:${choice.key}`,
            });
            expect(reply, `${where}: "${choice.text}"`).toBeTruthy();
            answers.push(`"${choice.text}" / "${reply!.text}"`);
          }
        say(core, talk, talk.choices[0]!.key);
      }
      const line = talk.lines.find((row) => row.kind === "own-view");
      if (!line) {
        notes.push(
          `${where}: ${person.givenName} (${weight.toFixed(2)}) led with ${talk.lines[1]?.kind ?? talk.lines[0]?.kind}`,
        );
        continue;
      }
      expect(
        answers.length,
        `${where}: replies offered; lines ${talk.lines.map((row) => `${row.kind}:${row.text}`).join(" / ")}; choices ${talk.choices.map((row) => `${row.answers}:${row.text}`).join(" / ")}`,
      ).toBeGreaterThan(0);
      notes.push(`  replies: ${answers.join(" | ")}`);
      const learned = api.knows(me, viewKey(id));
      expect(learned, where).toBeTruthy();
      expect(learned!.value, where).toBe(viewRecordId(id));
      expect(learned!.access).toBe("told");
      expect(learned!.sourceId, where).toMatch(/^conversation:/);
      expect(line.sourceRecordIds, where).toContain(viewRecordId(id));
      const after = knownCard(core, me, id);
      expect(after.viewUnknown, where).toBe(false);
      expect(after.view, where).toBeTruthy();
      told.push(
        `${where}: ${person.givenName} ${person.familyName} (${id}), weight ${weight.toFixed(2)}, said "${line.text}" -> card: "${viewLine(before)}" before, "${viewLine(after)}" after; key ${viewKey(id)} = ${learned!.value} from ${learned!.sourceId}`,
      );
      break;
    }
    // Someone with no tie to the player gives no weight, so the key stays unwritten.
    const stranger = [...core.people.values()].find(
      (p) =>
        p.alive &&
        p.id !== me &&
        viewTopicWeight(viewWillingness(core, p.id as PersonId, me)) === 0,
    );
    if (stranger) {
      const talk = openConversation(core, me, stranger.id as PersonId, {
        director,
      });
      for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[0]!.key);
      expect(
        talk.lines.some((row) => row.kind === "own-view"),
        where,
      ).toBe(false);
      expect(
        api.knows(me, viewKey(stranger.id as PersonId)),
        where,
      ).toBeUndefined();
    }
  }
  process.stdout.write(`${notes.join("\n")}\n${told.join("\n")}\n`);
  expect(told.length, notes.join("; ")).toBeGreaterThan(0);
}, 1_800_000);

it(`a letter to the editor the player reads teaches where its writer stands, and one they do not read teaches nothing (seed ${seed})`, () => {
  setBookkeeping(false);
  const notes: string[] = [];
  let proved = 0;
  for (let draw = 0; draw < NEWS_DRAWS && !proved; draw += 1) {
    const place = drawPlace(`${seed}:news:${draw}`, "view-learned-news");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = playerId as PersonId;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const letters = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        facts: Record<string, string>;
      }[]
    ).filter((row) => String(row.facts.sourceRecordId).startsWith("letter:"));
    const heard = new Set(storiesHeard(api, me).map((row) => row.id));
    notes.push(
      `${where}: ${letters.length} letters in the year, ${letters.filter((row) => heard.has(row.id)).length} read by the player`,
    );
    for (const letter of letters) {
      const writer = letter.facts.personId!;
      const key = api.knows(me, viewKey(writer));
      if (!heard.has(letter.id)) {
        // A letter nobody told the player of teaches them nothing, unless
        // another route did (a talk, an earlier letter by the same writer).
        if (key)
          expect(
            letters.some(
              (row) => row.facts.personId === writer && heard.has(row.id),
            ) || key.sourceId.startsWith("conversation:"),
            `${where}: ${writer} known without a letter read`,
          ).toBe(true);
        continue;
      }
      expect(key, `${where}: ${writer}`).toBeTruthy();
      expect(key!.access).toBe("told");
      expect(key!.value.split(" ")[0]).toBe(viewRecordId(writer));
      expect(letters.map((row) => row.id)).toContain(key!.sourceId);
      expect(heard.has(key!.sourceId)).toBe(true);
      proved += 1;
      const card = core.people.has(writer as PersonId)
        ? knownCard(core, me, writer)
        : undefined;
      if (proved <= 3)
        notes.push(
          `${where}: writer ${writer}, key ${viewKey(writer)} = "${key!.value}" from ${key!.sourceId}${card ? `; card says "${viewLine(card)}"` : ""}`,
        );
      if (card) expect(card.viewUnknown, where).toBe(false);
    }
  }
  process.stdout.write(`${notes.join("\n")}\n`);
  expect(proved, notes.join("; ")).toBeGreaterThan(0);
}, 3_000_000);
