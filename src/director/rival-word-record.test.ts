/**
 * Word of a rival's message is placed by what its record holds (owner, Nov 15,
 * the Salado play: "played six times in ten weeks with the same lines"). A
 * candidate files at each of three named places and plays week by week to
 * election day. Every rival-word scene that stops the day is composed and its
 * whole tree read:
 *   - it is staged once for a message (the record's own message id), never
 *     again for the same one, and never after the contest's election day;
 *   - its opener says how the word reached the teller (a mailer, an ad, a
 *     night of doors, a campaign message), by the message's own kind;
 *   - "Did it change how you see ..." is answered from the teller's own
 *     stance cause for that message (none, a little or a lot);
 *   - no line of it is one the bank deleted.
 * With PLAYED_FILE set, every line shown is written to that file.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  CANVASS_MESSAGE_KIND,
  rivalWordMoved,
} from "../core2/modules/campaigns";
import {
  openContests,
  playerMayFileFor,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

/**
 * One named place on a fixed seed: Hopkinton RI, a race a candidate gets onto
 * the ballot for. Its season plays word of a rival by a night of doors and by
 * a campaign message, to tellers moved none and a lot, so every
 * line of the bank's rival-word scene plays here. The time (about 130 seconds,
 * limit near twice) is the game's own played days: the candidate files in the
 * spring, and the scenes are the ones the world's own campaigns stage from
 * late April to the first week of October, a week at a time, because a teller
 * is moved by messages that reach them over weeks and the director stages
 * one only on the day it is told; a shorter run (a later start, or stopping
 * after the first scenes) shows no teller moved a lot and none of the later
 * messages, and staging them by writing facts would prove only the bank. Earlier pins (Millston WI rwprobe:0, Grafton VT
 * rwprobe:5, Bicknell UT rwprobe:6) played the same scene, but after the Train
 * changed which rival-word rows the director stages as scenes, none of them
 * drew a teller moved "a little" (a scan of twelve drawn places on the Train
 * of Nov 15 stages none either), so the moved-a-little answer and its press
 * are deleted until a place plays one. Hopkinton plays the rest and replaces
 * Bicknell and the other two (nothing in the test was loosened). The play is the same every run.
 */
const PLACES = [{ key: "4435200", seed: "rwscan:8" }].map((row) => {
  const place = drawPlace(row.seed, "campaign-season");
  if (place.key !== row.key)
    throw new Error(`${row.seed} no longer draws ${row.key}: ${place.key}`);
  return place;
});

const DELETED = [
  "What did it say, exactly?",
  "Did it change your mind?",
  "I'm not going to chase every flyer.",
  "It made their case on",
  "Mostly their side of it.",
  "People read these things, though.",
  "Folks around here will ask you about it.",
  "got to me about",
  "reached me this week",
  " is for it.",
  "I'd like to hear your side of",
];

const OPENER_BY_HOW: Record<string, RegExp> = {
  [CANVASS_MESSAGE_KIND]: /knocked|came by the house/i,
  "campaign-message": /talking about|heard from/i,
};

const MOVED_ANSWER: Partial<Record<"none" | "little" | "lot", string>> = {
  none: "No. I think what I thought before.",
  lot: "Some. I'm still making up my mind about",
} as const;

/** Every line under a node, with the reply that led to it. */
function lines(node: TreeNode | null, path: string[], out: string[]): void {
  if (!node) return;
  for (const line of node.lines)
    out.push(`${path.join(" > ")} => ${line.text}`);
  // What is said as the talk closes on this path.
  if (node.end?.close)
    out.push(`${path.join(" > ")} => ${node.end.close.text}`);
  for (const reply of node.replies) {
    const next = [...path, `"${reply.line.text}"`];
    out.push(`${path.join(" > ")} ? ${reply.line.text}`);
    lines(reply.next, next, out);
  }
}

it("news of a rival is staged once a message, says how it came, answers from the record and stops after the vote", () => {
  const file = process.env.PLAYED_FILE;
  if (file)
    writeFileSync(
      file,
      `# News from the race, played (head ${process.env.PLAYED_SHA ?? "unknown"})\n\n`,
    );
  const how = new Set<string>();
  const moved = new Set<string>();
  const messages = new Set<string>();
  let scenes = 0;
  for (const place of PLACES) {
    const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const me = world.playerId! as PersonId;
    applyChosenPerson(core, me, {
      givenName: "Pat",
      familyName: core.people.get(me)!.familyName,
      gender: "female",
      birthYear: 1985,
      birthMonth: 6,
      birthDay: 1,
    });
    const player = core.people.get(me)!;
    for (const id of [
      me,
      ...(core.households.get(player.householdId)?.memberIds ?? []),
    ])
      if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
    const api = coreAPI(core);
    const enter = (): ContestRow | undefined =>
      [...openContests(api)]
        .filter(
          (c) =>
            c.electionDate >= addDays(makeIsoDate(core.date), 60) &&
            playerMayFileFor(api, c.id),
        )
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        )
        .find((c) =>
          ["petitioning", "on-ballot"].includes(
            (fileForOffice(core, me, c.id) as { filing?: { status?: string } })
              .filing?.status ?? "",
          ),
        );
    let filed = enter();
    for (let week = 0; week < 104 && !filed; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      filed = enter();
    }
    expect(filed, `${where}: a race the player could enter`).toBeTruthy();
    const filingId = `filing:${filed!.id}:${me}`;
    const petition = gatherSignatures(core, filingId);
    expect(
      !petition || (petition.check && petition.check.valid >= petition.needed),
      `${where}: the petition came up short`,
    ).toBe(true);
    const seen = new Set<string>();
    const told = new Set<string>();
    if (file) appendFileSync(file, `## ${where}\n\n`);
    while (core.date < filed!.electionDate) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), 7), filed!.electionDate].sort()[0]!,
      );
      const book = director.ledger.people.get(me)!;
      for (const entry of book.schedule) {
        if (seen.has(entry.momentId)) continue;
        seen.add(entry.momentId);
        const moment = book.momentsById.get(entry.momentId);
        if (!moment) continue;
        for (const binding of entry.bindings) {
          if (binding.typeKey !== "rival-word") continue;
          const cause = core.durableLog.get(moment.causeId as never)!;
          const said = cause.facts as Readonly<Record<string, string>>;
          // Staged once a message (the word was passed to this candidate once).
          const message = `${said.messageId}:${said.invitedId}`;
          expect(told.has(message), `${where}: ${message} staged twice`).toBe(
            false,
          );
          told.add(message);
          messages.add(message);
          // Never after the vote.
          expect(
            moment.date <= filed!.electionDate,
            `${where}: ${moment.id} on ${moment.date}, after ${filed!.electionDate}`,
          ).toBe(true);
          // A scene that does not stop the day is told later as a journal
          // line; it is composed here all the same, since the same record
          // and the same words make it (the file says which ones stopped).
          const result = purposeScene(core, director, me, entry, {
            typeKey: "rival-word",
          });
          expect(
            result?.kind,
            `${where}: ${entry.momentId} ${result?.kind === "skipped" ? result.reason : ""}`,
          ).toBe("composed");
          if (result?.kind !== "composed") continue;
          scenes += 1;
          const { talk } = result.scene;
          const opener = talk.state.text;
          expect(said.how, `${where}: the record says how`).toBeTruthy();
          expect(
            OPENER_BY_HOW[said.how!]?.test(opener),
            `${where}: "${opener}" for a ${said.how}`,
          ).toBe(true);
          how.add(said.how!);
          const all: string[] = [];
          lines(talk.tree, [], all);
          for (const text of all)
            for (const gone of DELETED)
              expect(
                text.includes(gone) || opener.includes(gone),
                `${where}: ${text} is a deleted line`,
              ).toBe(false);
          // A press fits what the player said: "whether you chase it or not"
          // only after "Let them talk", and the door answer only after the
          // door deflect. A rival's side is said with what the question
          // proposes, never a bare "for it".
          for (const text of all) {
            if (text.includes("whether you chase it or not"))
              expect(
                text.includes('"Let them talk.'),
                `${where}: ${text}`,
              ).toBe(true);
            if (text.includes("Then start knocking"))
              expect(
                text.includes('"They can knock on every door'),
                `${where}: ${text}`,
              ).toBe(true);
            if (/ => .* is (for|against) /.test(text))
              expect(text, `${where}: the rival's side`).toMatch(
                / is (for|against) \S+.*\.$/,
              );
          }
          // A question the player is offered is one the record answers.
          for (const reply of talk.tree.replies)
            if (
              /^(What are they saying|Did it change how)/.test(reply.line.text)
            )
              expect(
                reply.next?.lines.length,
                `${where}: "${reply.line.text}" has no answer`,
              ).toBeGreaterThan(0);
          // "Did it change how you see": the answer is the teller's own.
          const change = rivalWordMoved(
            api,
            said.tellerId!,
            said.messageId!,
            cause.topic!,
          );
          const asked = talk.tree.replies.find((reply) =>
            reply.line.text.startsWith("Did it change how you see"),
          );
          if (asked?.next?.lines.length) {
            const answer = asked.next.lines[0]!.text;
            expect(
              answer.startsWith(MOVED_ANSWER[change] ?? "no such answer"),
              `${where}: ${change} moved, answered "${answer}"`,
            ).toBe(true);
            moved.add(change);
          }
          if (file) {
            const out = [
              `### ${moment.date}, ${place.name}${entry.interrupt ? "" : " (told later, not stopping the day)"}: word came by ${said.how === CANVASS_MESSAGE_KIND ? "a night of doors" : "a campaign message"}; the teller was moved ${change}`,
              `They say: ${opener}`,
              "You say:",
            ];
            for (const reply of talk.tree.replies) {
              out.push(`- ${reply.line.text}`);
              const below: string[] = [];
              lines(reply.next, [], below);
              for (const text of below)
                out.push(
                  `    - ${text.replace(/^ ?(=>|\?) /, (m) => (m.includes("?") ? "You say: " : "They say: "))}`,
                );
            }
            appendFileSync(file, out.join("\n") + "\n\n");
          }
        }
      }
    }
  }
  console.log(
    `rival-word: ${scenes} scenes that stopped the day over ${messages.size} messages; how seen ${[...how].join(", ")}; moved seen ${[...moved].join(", ")}`,
  );
  expect(scenes).toBeGreaterThan(0);
}, 260_000);
