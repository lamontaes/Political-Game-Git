/**
 * Answers that count (path 7, "a reporter's story quoting you or saying you
 * declined"; scene-reporter-calls-on-a-vote's story half). In a played world
 * the player files, runs to election day and is asked for comment by a
 * reporter (the press-interview scene). Answering on the record keeps their
 * words; refusing keeps that they declined. The paper's story of the record
 * the reporter asked about then quotes them or says they declined, citing
 * the reply's record. Drawn places, a fresh seed, place and seed printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { wordPrintedStory } from "../bench/archive-words";
import { fileForOffice } from "../bench/government";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { playerContests } from "../core2/modules/elections";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { commentOn } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 8;
const STEP = 7;
const PAPER_DAYS = 10;

/** The path that answers with `move`, then takes the first reply until the talk ends. */
function pathOf(tree: TreeNode, move: string): number[] | null {
  const first = tree.replies.findIndex((row) => row.line.move === move);
  if (first < 0) return null;
  const path = [first];
  let node = tree.replies[first]!.next;
  for (let depth = 0; node && !node.end && depth < 6; depth += 1) {
    if (!node.replies.length) return null;
    path.push(0);
    node = node.replies[0]!.next;
  }
  return path;
}

it(`what the player tells a reporter, or that they declined, is in the paper's story (seed ${seed})`, () => {
  const shown: string[] = [];
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS && shown.length < 2; attempt += 1) {
    const move = shown.length === 0 ? "answer" : "refuse";
    const place = drawPlace(`${seed}:${attempt}`, "comment-printed");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core);
    const me = playerId! as PersonId;
    director.watch(core, me);
    const born = core.people.get(me)!.birthDate;
    const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
    const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
    if (eighteen > core.date) advanceCore(core, eighteen);
    const race = [...playerContests(api)]
      .sort((a, b) => a.electionDate.localeCompare(b.electionDate))
      .find((contest) =>
        ["petitioning", "on-ballot"].includes(
          (
            fileForOffice(core, me, contest.id) as {
              filing?: { status?: string };
            }
          ).filing?.status ?? "",
        ),
      );
    if (!race) {
      tried.push(`${where}: no race to enter`);
      continue;
    }
    gatherSignatures(core, `filing:${race.id}:${me}`);
    const through = makeIsoDate(race.electionDate);
    let done = false;
    for (
      let day = addDays(makeIsoDate(core.date), STEP);
      day <= through && !done;
      day = addDays(day, STEP)
    ) {
      advanceCore(core, day);
      for (const entry of director.ledger.people.get(me)?.schedule ?? []) {
        if (
          entry.replies?.length ||
          !entry.bindings.some((row) => row.typeKey === "press-interview")
        )
          continue;
        const scene = purposeScene(core, director, me, entry, {
          typeKey: "press-interview",
        });
        if (scene?.kind !== "composed") continue;
        const path = pathOf(scene.scene.talk.tree, move);
        if (!path) continue;
        const replyId = replyInScene(core, director, me, entry, path, {
          typeKey: "press-interview",
        });
        const comment = commentOn(api, scene.scene.cause.id);
        if (!comment) continue;
        const here = `${where}: ${scene.scene.cause.id}`;
        expect(comment.replyId, here).toBe(replyId);
        // The paper's story of that record, read within days.
        advanceCore(core, addDays(makeIsoDate(core.date), PAPER_DAYS));
        const story = (
          api
            .moduleState(NEWS_MODULE_ID)
            .table("stories")
            .rows() as unknown as {
            id: string;
            kind: string;
            date: string;
            facts: Record<string, string>;
          }[]
        ).find(
          (row) =>
            row.kind === "press.printed" &&
            row.facts.sourceRecordId === scene.scene.cause.id &&
            row.date >= comment.date,
        );
        if (!story) {
          tried.push(`${here}: not printed after the comment`);
          done = true;
          break;
        }
        const words = wordPrintedStory(core, story);
        const body = (words?.paragraphs ?? [words?.lede ?? ""]).join(" ");
        const name = `${core.people.get(me)!.givenName} ${core.people.get(me)!.familyName}`;
        if (comment.quote) expect(body, here).toContain(comment.quote);
        else
          expect(body, here).toMatch(
            new RegExp(`${name} (declined|would not) comment`),
          );
        expect(words!.sourceRecordIds, here).toContain(replyId);
        shown.push(`${here} (${move}): ${story.id}: ${body}`);
        done = true;
        break;
      }
    }
    if (!done)
      tried.push(`${where}: no press-interview scene before ${through}`);
  }
  process.stdout.write(
    `COMMENTS PRINTED\n${shown.join("\n")}\nTRIED ${tried.join("; ")}\n`,
  );
  expect(shown.length, `seed ${seed}: ${tried.join("; ")}`).toBe(2);
}, 3_600_000);
