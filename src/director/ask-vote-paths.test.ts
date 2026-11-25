/**
 * A colleague's ask for a vote, rewritten from the records (Story lead, Nov
 * 17; pool item words-ask-vote-rewritten-with-inserts). In a played town the
 * evening before a floor vote, a sponsor whose bill is short asks the player
 * (a `vote-ahead` record), and the scene plays its plain arc. The player's
 * agree is said only from a stand the views engine holds on the bill's
 * question (`stand`, vote-ask-facts.ts), so a yes always says why; and on
 * every path of the tree a thank, from the one asking or as the close, comes
 * only after the player said yes, and a close that takes a no, presses or
 * warns never comes right after a yes. Played in places drawn from all 56 on
 * a seed nobody chose (GOLDEN_PATH_SEED pins one), the player seated on the
 * town's largest body of three or more full-person members.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { billOf, memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene } from "./purpose-scene";
import type { SceneTalkLine, TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on an ask of the player. */
const DRAWS = 6;
/** Days played in each place at most, one at a time so the evening before a vote is caught. */
const MOST_DAYS = 240;
/** The player's replies that say yes: a thank answers only these. */
const YES = new Set(["agree", "relent", "accept", "lie"]);
/** The closes that take a no, press for an answer or warn: never right after a yes. */
const NOT_AFTER_YES = new Set(["accept", "press", "warn"]);

const uses = new Map(
  (
    sceneBank as unknown as {
      parts: {
        key: string;
        uses: {
          purpose?: string;
          step?: string;
          move?: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts.map((part) => [part.key, part.uses]),
);

/** Every path through the tree: the lines said in order, with the close. */
function paths(
  node: TreeNode,
  before: SceneTalkLine[] = [],
): SceneTalkLine[][] {
  const here = [...before, ...node.lines];
  const out: SceneTalkLine[][] = [];
  if (node.end) out.push(node.end.close ? [...here, node.end.close] : here);
  for (const branch of node.branches ?? [])
    out.push(...paths(branch.node, here));
  for (const reply of node.replies)
    if (reply.next) out.push(...paths(reply.next, [...here, reply.line]));
    else out.push([...here, reply.line]);
  return out;
}

it(`the player's yes on a colleague's ask says why, and a thank never follows a no (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ask-vote-paths");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const full = (officeId: string) =>
      members(api, officeId)
        .map(memberKey)
        .filter((id) => core.people.get(id)?.alive)
        .sort();
    const body = [
      ...new Map(
        townSeats(api)
          .filter(
            (row) =>
              ["city", "county", "township"].includes(row.office.level) &&
              full(row.office.id).length > 2,
          )
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ].sort((a, b) => full(b.id).length - full(a.id).length)[0];
    if (!body) {
      tried.push(`${where}: no town body with three full-person members`);
      continue;
    }
    const seated = full(body.id);
    const me = seated[0]! as PersonId;
    core.playerId = me;
    for (const id of seated) {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    }
    const asks: CoreEventInput[] = [];
    api.subscribeEvents("ask-vote-paths-test", ["vote-ahead"], (_, e) => {
      if (e.facts?.askedId === me) asks.push(e);
    });
    let played = false;
    for (let day = 1; day <= MOST_DAYS && !played; day += 1) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      for (const ask of asks) {
        if (
          played ||
          String(ask.facts?.floorDate) <= core.date ||
          billOf(api, String(ask.facts?.billId))?.status !== "drafted"
        )
          continue;
        const entry = director.ledger.people
          .get(me)
          ?.schedule.find(
            (row) =>
              row.momentId.includes(ask.id) &&
              row.bindings.some((b) => b.typeKey === "vote-asked"),
          );
        if (!entry) continue;
        const result = purposeScene(core, director, me, entry, {
          typeKey: "vote-asked",
          variant: "plain",
        });
        expect(result?.kind, `${where}: ${ask.id}`).toBe("composed");
        if (result?.kind !== "composed") continue;
        played = true;
        const { scene } = result;
        const facts = new Set(scene.facts.map((f) => f.key));
        // The player's agree is a base line only where the views engine holds
        // the player's stand for what the bill does.
        const all = paths(scene.talk.tree);
        for (const path of all)
          for (const line of path) {
            if (line.speakerId !== me || line.move !== "agree") continue;
            const base = line.parts.some((key) =>
              (uses.get(key) ?? []).some(
                (u) =>
                  u.purpose === "ask-vote" &&
                  u.step === "reply" &&
                  u.move === "agree" &&
                  u.requiresFacts?.includes("stand"),
              ),
            );
            expect(
              base,
              `${where}: ${line.text} <${line.parts.join(" + ")}> is an agree with no stand behind it`,
            ).toBe(true);
            expect(facts.has("stand"), `${where}: ${line.text}`).toBe(true);
          }
        // A thank only after a yes; a close that takes a no, presses or warns
        // never right after one.
        for (const path of all) {
          const said = path
            .map(
              (l) =>
                `${l.speakerId === me ? "you" : "they"} ${l.move}: ${l.text}`,
            )
            .join(" / ");
          let yes = false;
          let last: SceneTalkLine | undefined;
          for (const line of path) {
            const close = line.step === "close";
            if (line.speakerId !== me && line.move === "thank")
              expect(
                yes,
                `${where}: a thank with no yes before it: ${said}`,
              ).toBe(true);
            if (close && NOT_AFTER_YES.has(line.move) && last?.speakerId === me)
              expect(
                YES.has(last.move),
                `${where}: ${line.move} close right after a yes: ${said}`,
              ).toBe(false);
            if (line.speakerId === me) yes = YES.has(line.move);
            last = line;
          }
        }
        process.stdout.write(
          `ASK VOTE PATHS ${where}: ${ask.id}; stand ${facts.has("stand")}, stand-against ${facts.has("stand-against")}; ${all.length} paths\n`,
        );
      }
    }
    if (played) return;
    tried.push(`${where}: no ask of the player staged in ${MOST_DAYS} days`);
  }
  throw new Error(
    `No ask of the player in ${DRAWS} places:\n${tried.join("\n")}`,
  );
}, 600_000);
