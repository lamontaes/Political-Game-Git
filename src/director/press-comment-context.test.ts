import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { castMemberVote } from "../core2/modules/legislature";
import { electorateSides } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { purposeScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";

// A reporter's call is about something, and every line after the opening has
// to stand on what was said. The scene carries `story`, the bill the record
// names (else its topic), cited to the records it came from; the opening of
// each arc names it, and no reaction leans on a "paragraph" or a "claim" that
// nothing introduced. Played in a drawn place: a member brings a question,
// votes, and the reporter's call about the vote composes; each of the four
// arcs is then said from the same facts.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 12;
const VOTE_DAYS = 120;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "press-interview",
) as unknown as PurposeType;
const FACETS = [
  "personality-v1:facet-friendly",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-hostile",
  "personality-v1:facet-persistent",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-sensitive",
];

it(`a reporter's call names its story, and every line stands on it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "press-comment-context");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const member = [...core.people.values()]
      .filter((p) => p.alive && p.id.startsWith("person_"))
      .sort((a, b) => a.id.localeCompare(b.id))
      .find((p) => seatView(core, p.id).bodies.length > 0);
    if (!member) {
      tried.push(`${where}: no resident member of a body`);
      continue;
    }
    const me = member.id as PersonId;
    core.playerId = me;
    director.watch(core, me);
    const seat = seatView(core, me);
    const body = seat.bodies[0]!;
    let bill = { id: "", status: "blocked" };
    for (const question of [...seat.questions].slice(0, 4)) {
      if (bill.status !== "blocked") break;
      bill = seatAct(core, me, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
      if (bill.status !== "blocked") {
        const sides = electorateSides(api, question);
        castMemberVote(api, bill.id, me, sides.yes >= sides.no ? "no" : "yes");
      }
    }
    const voteId = `bill-vote:${bill.id}:${body.officeId}`;
    for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (!core.durableLog.has(voteId)) {
      tried.push(`${where}: ${bill.id} not voted within ${VOTE_DAYS} days`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = director.ledger.people
      .get(me)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(voteId) &&
          row.bindings.some((b) => b.typeKey === "press-interview"),
      );
    if (!entry) {
      tried.push(`${where}: ${voteId} staged no reporter's call`);
      continue;
    }
    const result = purposeScene(core, director, me, entry, {
      typeKey: "press-interview",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    const story = scene.facts.find((row) => row.key === "story");
    expect(story, `${where}: the call names no story`).toBeTruthy();
    expect(story!.recordIds.length, where).toBeGreaterThan(0);
    expect(story!.text, where).not.toMatch(/\{|\}|undefined/);

    const facts = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    const all: string[] = [];
    for (const variant of ["", "friendly", "hostile", "scandal", "national"]) {
      const purpose = variant ? `press-comment.${variant}` : "press-comment";
      for (const level of [2, -2]) {
        const said = composeSceneTalk(
          core,
          director,
          { askerId: scene.askerId, askedId: scene.askedId },
          { ...TYPE, purpose, family: "press-comment" } as PurposeType,
          facts,
          {
            askerTraits: Object.fromEntries(
              FACETS.map((id, k) => [id, k % 2 ? -level : level]),
            ),
          },
        );
        if (said.kind !== "composed") continue;
        const lines: string[] = [];
        const walk = (node: typeof said.talk.tree): void => {
          for (const reply of node.replies) {
            lines.push(reply.line.text);
            if (reply.next) {
              lines.push(...reply.next.lines.map((row) => row.text));
              walk(reply.next);
            }
          }
        };
        lines.unshift(...said.talk.lines.map((row) => row.text));
        walk(said.talk.tree);
        for (const text of lines) {
          expect(text, `${where}: ${purpose}`).not.toMatch(
            /\d{4}-\d{2}-\d{2}|\{|\}|undefined/,
          );
          expect(text, `${where}: ${purpose}`).not.toMatch(
            /the paragraph|your neighbors|big claim\. I'll check it with/,
          );
        }
        // The arc's opening names the story it is about.
        if (variant === "national")
          expect(
            said.talk.lines.map((row) => row.text).join(" "),
            `${where}: the national arc's opening names the story`,
          ).toContain(story!.text);
        all.push(
          `[${purpose}, traits ${level}]\n${lines.map((t) => `  ${t}`).join("\n")}`,
        );
      }
    }
    process.stdout.write(
      `PRESS CONTEXT ${where}: story "${story!.text}" cited to ${story!.recordIds.join(", ")}; vote ${voteId}\n${all.join("\n")}\n`,
    );
    return;
  }
  throw new Error(`no reporter's call composed: ${tried.join("; ")}`);
}, 1_800_000);
