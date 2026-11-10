/**
 * Four replies are four different answers (owner, Oct 14, afternoon: "Four
 * dynamic choices, always... A reply's second move follows from its first.";
 * Oct 15: "The four replies each move the talk somewhere."; Oct 27: "four
 * replies are four different answers, never one reworded."). Every set of
 * replies a spot offers holds four replies of four different meaning groups
 * (`data/reply-meanings.json`), "Say nothing" and the lie aside, unless the
 * spot is in the registered gap list (`data/reply-gaps.json`), which this
 * test prints.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { placeLocalities } from "../core2/places";
import type { CoreState, PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import situationFile from "./data/situation-types.json" with { type: "json" };
import gapsFile from "./data/reply-gaps.json" with { type: "json" };
import {
  adults,
  askedId,
  core as sceneCore,
  director as sceneDirector,
  facts,
  talkTypes,
} from "../../tests/support/scene-talk-fixture";
import { openConversation, say, type Conversation } from "./conversation";
import type { Director } from "./ledger";
import { everydayMeaning, sceneMeaning } from "./reply-meanings";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
} from "./scene-talk";

const GAPS = gapsFile as unknown as { scenes: string[]; everyday: string[] };
const FOUR = 4;

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

interface Offered {
  /** What the gap list names: a scene's purpose, an everyday subject's kind. */
  readonly gap: string;
  readonly spot: string;
  readonly where: string;
  readonly replies: readonly { move: string; group: string; text: string }[];
}

/** What is wrong with an offered set; empty when it is four replies of four groups. */
function problem(set: Offered): string {
  const groups = set.replies.map((row) => row.group);
  const distinct = new Set(groups);
  if (set.replies.length === FOUR && distinct.size === FOUR) return "";
  return `${set.replies.length} replies in ${distinct.size} groups (${set.replies
    .map((row) => `${row.move}=${row.group}`)
    .join(", ")})`;
}

function scenesOffered(): { sets: Offered[]; talks: number; skipped: number } {
  const sets: Offered[] = [];
  const unpurposed = (
    situationFile as unknown as { types: PurposeType[] }
  ).types.filter((row) => !row.purpose);
  let talks = 0;
  let skipped = 0;
  for (const type of [...talkTypes(), ...unpurposed]) {
    const result = composeSceneTalk(
      sceneCore,
      sceneDirector,
      { askerId: adults[1]!.id, askedId },
      type,
      facts,
      {},
      {},
    );
    if (result.kind !== "composed") {
      skipped += 1;
      continue;
    }
    talks += 1;
    const { talk } = result;
    const walk = (node: TreeNode, path: string) => {
      const asker = [...node.lines].reverse().find((l) => l.role === "asker");
      const replies = node.replies
        .map((row) => row.line)
        .filter((line) => line.move !== "lie" && !line.tag)
        .map((line) => ({
          move: line.move,
          group: sceneMeaning(line.move),
          text: line.text,
        }));
      if (replies.length)
        sets.push({
          gap: talk.purpose,
          spot: `${talk.purpose} after ${asker?.move ?? "state"}`,
          where: `${talk.purpose}/${type.key} ${path}`,
          replies,
        });
      for (const row of node.replies)
        if (row.next) walk(row.next, `${path}.${row.line.move}`);
      for (const branch of node.branches ?? []) walk(branch.node, `${path}.b`);
    };
    walk(talk.tree, "root");
  }
  return { sets, talks, skipped };
}

/** Plays a talk a few turns, taking a different reply each turn, and records every set of replies. */
function playTalk(
  core: CoreState,
  me: PersonId,
  otherId: PersonId,
  director: Director,
  turns: number,
  nudge: number,
  where: string,
  out: Offered[],
): Conversation {
  const talk = openConversation(core, me, otherId, { director });
  for (let turn = 0; turn < turns && talk.choices.length; turn += 1) {
    const last = talk.lines.at(-1)!;
    out.push({
      gap: last.kind,
      spot: `${last.kind}${last.act === "ask" || /\?\s*$/.test(last.text) ? " (a question)" : ""}`,
      where: `${where} ${otherId}: "${last.text}"`,
      replies: talk.choices.map((choice) => ({
        move: choice.move,
        group: everydayMeaning(last.kind, choice.move),
        text: choice.text,
      })),
    });
    say(core, talk, talk.choices[(nudge + turn) % talk.choices.length]!.key);
  }
  return talk;
}

const unregistered = (
  sets: readonly Offered[],
  registered: readonly string[],
) => sets.filter((set) => problem(set) && !registered.includes(set.gap));

describe("four replies are four different answers", () => {
  it("every node of every scene with a purpose offers four replies of four groups, or its spot is in the gap list", () => {
    const { sets, talks, skipped } = scenesOffered();
    expect(talks, "scenes composed").toBeGreaterThan(100);
    const bad = unregistered(sets, GAPS.scenes);
    const spotsOf = (name: string) =>
      sets.some((set) => set.gap === name && problem(set));
    const spots = new Map<string, string>();
    for (const set of sets)
      if (problem(set) && !spots.has(set.spot))
        spots.set(set.spot, problem(set));
    process.stdout.write(
      `FOUR REPLIES scenes: ${talks} scenes composed (${skipped} skipped), ${sets.length} reply sets, ` +
        `${sets.filter((set) => !problem(set)).length} are four of four, ${spots.size} spots short (registered gaps: ${GAPS.scenes.length}).\n`,
    );
    for (const [spot, why] of spots)
      process.stdout.write(`  GAP ${spot}: ${why}\n`);
    expect(
      [...new Set(bad.map((set) => `${set.spot}: ${problem(set)}`))],
      "sets that are not four replies of four groups, with the spot unregistered",
    ).toEqual([]);
    // The list names real purposes (a typo would hide a gap), and says which
    // of them offered a full set this time (a gap closed: remove it).
    const purposes = new Set(sets.map((set) => set.gap));
    expect(GAPS.scenes.filter((name) => !purposes.has(name))).toEqual([]);
    process.stdout.write(
      `  registered purposes now complete: ${GAPS.scenes.filter((name) => !spotsOf(name)).join(", ") || "none"}\n`,
    );
  }, 900_000);

  it(
    "every set of replies in everyday talk offers four replies of four groups, or its kind is in the gap list",
    { timeout: 1_800_000 },
    () => {
      const PLACES = 6;
      const DAYS = 20;
      const EVERY = 4;
      const TURNS = 4;
      const sets: Offered[] = [];
      let talks = 0;
      for (let draw = 0; draw < PLACES; draw += 1) {
        setBookkeeping(false);
        const place = drawPlace(`${seed}:${draw}`, "four-replies");
        const where = `${place.name} (${place.key}), seed ${seed}:${draw}, world seed ${place.seed}`;
        process.stdout.write(`FOUR REPLIES everyday ${where}\n`);
        const { core, director, playerId } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const me = playerId as PersonId;
        const start = makeIsoDate(core.date);
        for (let day = 0; day <= DAYS; day += 1) {
          if (day) advanceCore(core, addDays(start, day));
          if (day % EVERY) continue;
          const home = [...core.people.values()]
            .filter(
              (row) =>
                row.alive &&
                row.id !== me &&
                row.householdId === core.people.get(me)!.householdId,
            )
            .map((row) => row.id as PersonId);
          const known = [...core.relationships.values()]
            .filter(
              (tie) =>
                tie.actorId === me && core.people.get(tie.otherId)?.alive,
            )
            .map((tie) => tie.otherId as PersonId);
          // Strangers too: the player meets people by clicking them. The
          // town's residents, a few more each visit.
          const mine = core.people.get(me)!.placeId;
          const strangers = [...core.people.values()]
            .filter(
              (row) =>
                row.alive &&
                row.id !== me &&
                row.tier !== "husk" &&
                row.placeId === mine &&
                !String(row.id).startsWith("official:") &&
                !home.includes(row.id as PersonId),
            )
            .map((row) => row.id as PersonId)
            .sort();
          const skip = (day / EVERY) * 6;
          const others = [
            ...new Set([...home, ...known].sort()),
            ...strangers.slice(skip, skip + 6),
          ];
          others.forEach((otherId, at) => {
            playTalk(
              core,
              me,
              otherId,
              director,
              TURNS,
              at + day,
              `${where} ${core.date}`,
              sets,
            );
            talks += 1;
          });
        }
      }
      expect(talks, "talks played").toBeGreaterThanOrEqual(200);
      const spots = new Map<string, string>();
      for (const set of sets)
        if (problem(set) && !spots.has(set.spot))
          spots.set(set.spot, `${problem(set)} e.g. ${set.where}`);
      process.stdout.write(
        `FOUR REPLIES everyday: ${talks} talks, ${sets.length} reply sets, ${sets.filter((set) => !problem(set)).length} are four of four, ${spots.size} kinds short (registered gaps: ${GAPS.everyday.length}).\n`,
      );
      const kinds = new Map<string, number>();
      for (const set of sets)
        kinds.set(set.spot, (kinds.get(set.spot) ?? 0) + 1);
      process.stdout.write(
        `  kinds offered: ${[...kinds].map(([kind, n]) => `${kind} x${n}`).join(", ")}\n`,
      );
      for (const [spot, why] of spots)
        process.stdout.write(`  GAP ${spot}: ${why}\n`);
      expect(
        [
          ...new Set(
            unregistered(sets, GAPS.everyday).map(
              (set) => `${set.spot}: ${problem(set)} e.g. ${set.where}`,
            ),
          ),
        ],
        "sets that are not four replies of four groups, with the kind unregistered",
      ).toEqual([]);
    },
  );

  // The named repro (labeled): Grandville, Michigan, world seed
  // c163aaf0-16e5-460f-872e-56f2b65d2412, built the way /api/newlife builds a
  // world from that seed (twoLevel, the start date, the place key the new-life
  // screen passes). Seen on main on Nov 10 (docs/seen/pr-8137-back-to-the-counts):
  // someone asks "Where are you from?" and the four replies were one answer
  // said four ways.
  // While home-new is a registered gap (its new replies are written on the
  // Story session's branch), the repro is expected to fail; `fails` turns red
  // the day it passes, which is the day to drop this switch.
  (GAPS.everyday.includes("home-new") ? it.fails : it)(
    "REPRO Grandville, Michigan (world seed c163aaf0-16e5-460f-872e-56f2b65d2412): when someone asks where the player is from, the four replies are four different answers",
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      const grandville = [...placeLocalities("US-MI")].find(
        (row) => row.displayName === "Grandville, Michigan",
      );
      expect(
        grandville,
        "Grandville, Michigan is a recorded place",
      ).toBeTruthy();
      const { core, director, playerId } = buildBenchWorld(
        "c163aaf0-16e5-460f-872e-56f2b65d2412",
        gameStartDate(),
        { twoLevel: true, placeKey: grandville!.key },
      );
      const me = playerId as PersonId;
      const people = [...core.people.values()]
        .filter((row) => row.alive && row.id !== me && row.tier !== "husk")
        .map((row) => row.id as PersonId)
        .sort(
          (a, b) =>
            Number(a.startsWith("official:")) -
              Number(b.startsWith("official:")) || a.localeCompare(b),
        );
      let asked = 0;
      for (const otherId of people) {
        const sets: Offered[] = [];
        const talk = playTalk(
          core,
          me,
          otherId,
          director,
          1,
          0,
          "Grandville",
          sets,
        );
        const first = sets[0];
        if (
          !first ||
          !first.spot.startsWith("home-new (a question)") ||
          talk.lines.length === 0
        )
          continue;
        asked += 1;
        const set = sets[0]!;
        process.stdout.write(
          `REPRO ${set.where}: ${set.replies.map((row) => `"${row.text}" (${row.group})`).join(" | ")}\n`,
        );
        expect(
          problem(set),
          `${set.where} offered ${set.replies.map((row) => `"${row.text}" (${row.group})`).join(", ")}`,
        ).toBe("");
        if (asked >= 5) break;
      }
      expect(
        asked,
        "talks in which someone asks where the player is from",
      ).toBeGreaterThanOrEqual(1);
    },
  );
});
