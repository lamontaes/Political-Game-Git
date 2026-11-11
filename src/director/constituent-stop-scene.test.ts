import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  LEGISLATURE_MODULE_ID,
  votesOn,
  type BillRow,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { measureFacts } from "./purpose-scene";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalkLine,
  type TreeNode,
} from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";

/**
 * The street stop after a vote (the type `constituent-stop`): a resident who
 * read about a measure stops an official (the words lead's play walk, Nov 11,
 * 2026: "I read about Ordinance 2025-1." then "I keep reading about Ordinance
 * 2025-1. I want to know what it means for us.", and the first reply "I voted
 * the way I thought was right" from a commissioner who never voted). In ten
 * places drawn from all 56 (replay with STREET_STOP_SEED), each played until
 * its own local body has voted a bill, the scene is composed by the scene
 * engine from the bill's own records for a member who voted yes, one who
 * voted no where there is one, and the player, who has no row on that vote:
 *  - the resident's opening and statement hold no clause twice and no
 *    measure number, and the greeting does not name the measure;
 *  - no reply says the one asked voted, or how, unless their row says so;
 *  - every follow-up names something of the reply it answers or the measure.
 */
const base = process.env.STREET_STOP_SEED || randomBytes(8).toString("hex");
const PLACES = 10;
const STEP_DAYS = 15;
const MOST_DAYS = 90;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "constituent-stop",
) as unknown as PurposeType;
/** A reply that says the one asked voted, and which way. */
const SAYS_YES = /\b(I voted for|I was a yes|I backed)\b/i;
const SAYS_NO = /\b(I voted against|I was a no|I couldn't back)\b/i;

const linesOf = (node: TreeNode | null): SceneTalkLine[] =>
  node
    ? [
        ...node.lines,
        ...node.replies.flatMap((reply) => [
          reply.line,
          ...linesOf(reply.next),
        ]),
        ...(node.branches ?? []).flatMap((branch) => linesOf(branch.node)),
      ]
    : [];
const pairsOf = (node: TreeNode | null): [SceneTalkLine, SceneTalkLine][] =>
  node
    ? node.replies.flatMap((reply) => [
        ...(reply.next?.lines[0]
          ? [
              [reply.line, reply.next.lines[0]] as [
                SceneTalkLine,
                SceneTalkLine,
              ],
            ]
          : []),
        ...pairsOf(reply.next),
      ])
    : [];
const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z' ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );

it(`a street stop after a vote says the measure once, by what it does, and offers only true replies, in ten drawn places (seed ${base})`, () => {
  const was = setBookkeeping(false);
  const passed: string[] = [];
  let composed = 0;
  try {
    for (let at = 0; at < PLACES; at += 1) {
      const seed = createHash("sha256").update(`${base}:${at}`).digest("hex");
      const place = drawPlace(seed, "constituent-stop");
      const where = `${place.name} (${place.key}), seed ${base}:${at}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      // Played until the place's own body has voted a bill with full people.
      let bill: BillRow | undefined;
      for (let days = 0; days <= MOST_DAYS && !bill; days += STEP_DAYS) {
        if (days) advanceCore(core, addDays(makeIsoDate(core.date), STEP_DAYS));
        bill = (
          api
            .moduleState(LEGISLATURE_MODULE_ID)
            .table("bills")
            .rows() as unknown as BillRow[]
        ).find((row) =>
          votesOn(api, row.id).some((vote) =>
            core.people.has(vote.memberId as PersonId),
          ),
        );
      }
      if (!bill) {
        passed.push(`${where}: no local bill voted by ${core.date}`);
        continue;
      }
      const votes = votesOn(api, bill.id).filter((vote) =>
        core.people.has(vote.memberId as PersonId),
      );
      const yes = votes.find((vote) => vote.vote === "yes")?.memberId;
      const no = votes.find((vote) => vote.vote === "no")?.memberId;
      const askedIds = [yes, no, world.playerId].filter(
        (id): id is string => !!id,
      ) as PersonId[];
      const resident = [...core.people.keys()].find(
        (id) => !askedIds.includes(id) && id !== world.playerId,
      )!;
      for (const askedId of askedIds) {
        const asked = core.people.get(askedId)!;
        const residentRow = core.people.get(resident)!;
        const facts = {
          name: {
            text: `${residentRow.givenName} ${residentRow.familyName}`,
            sourceRecordIds: [resident],
          },
          first: { text: asked.givenName, sourceRecordIds: [askedId] },
          place: { text: place.name, sourceRecordIds: [asked.placeId] },
          ...measureFacts(core, bill, askedId, bill.id, bill.id),
        };
        const result = composeSceneTalk(
          core,
          undefined,
          { askerId: resident, askedId, causeId: bill.id },
          TYPE,
          facts,
        );
        const who = `${where}, ${bill.id}, asked ${askedId}`;
        expect(result.kind, `${who}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result.kind !== "composed") continue;
        composed += 1;
        const talk = result.talk;
        const title = facts.bill?.text ?? "";
        // The resident's opening and statement: no number, the measure once,
        // the greeting without it.
        const box = [...talk.intro, talk.state].filter(
          (line) => line.role === "asker",
        );
        const said = box.map((line) => line.text).join(" ");
        if (bill.number)
          expect(said, `${who}: "${said}"`).not.toContain(bill.number);
        if (title)
          expect(
            said.split(title).length - 1,
            `${who}: "${said}"`,
          ).toBeLessThanOrEqual(1);
        for (const line of box.filter((row) => row.step === "open"))
          expect(line.text, who).not.toContain(title || "\u0000");
        // Replies true to the roll call.
        const row = votes.find((vote) => vote.memberId === askedId);
        for (const line of linesOf(talk.tree).filter(
          (item) => item.role === "asked",
        )) {
          if (row?.vote !== "yes")
            expect(line.text, `${who} (no yes row)`).not.toMatch(SAYS_YES);
          if (row?.vote !== "no")
            expect(line.text, `${who} (no no row)`).not.toMatch(SAYS_NO);
        }
        // Each follow-up names something of the reply it answers, or the measure.
        for (const [reply, follow] of pairsOf(talk.tree)) {
          if (follow.role !== "asker" || follow.step !== "follow") continue;
          const shared = [...words(follow.text)].filter(
            (word) =>
              words(reply.text).has(word) ||
              words(title).has(word) ||
              words(asked.givenName).has(word),
          );
          expect(
            shared.length,
            `${who}: "${reply.text}" -> "${follow.text}"`,
          ).toBeGreaterThan(0);
        }
      }
    }
  } finally {
    setBookkeeping(was);
  }
  console.log(
    `constituent-stop: seed ${base}; ${composed} scenes composed; passed over: ${passed.join("; ") || "none"}`,
  );
  expect(
    composed,
    `seed ${base}; passed over: ${passed.join("; ")}`,
  ).toBeGreaterThan(PLACES);
}, 3_600_000);
