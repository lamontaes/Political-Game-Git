/**
 * Playable scene samples for the owner's Scenes page (owner, Nov 13, 2026:
 * "they essentially let me click through the conversation and choose my own
 * dialogue and see the replies, and then I could go back to the beginning";
 * CTO, Nov 16: one JSON file per scene, with the opening, every wording, the
 * replies the player can pick at each turn, and what each pick leads to).
 *
 * A sample is a view of a scene the director staged in a played world, worded
 * by the one English engine (purposeScene): nothing here is written by hand
 * and nothing is kept the game does not already keep. Development tooling for
 * the Story thread; shipped play never imports it.
 *
 *   node --import tsx scripts/words/scene-samples.ts --seed <word> [--days 240]
 *     [--as resident|legislator|mayor|governor] [--out docs/scenes/samples]
 *
 * The place is drawn from all 56 by the seed. Each staged scene with a purpose
 * is written to `<out>/<typeKey>.json` (the newest sample of a type replaces
 * the older one, so the page is kept current), and `<out>/INDEX.json` lists
 * every sample with its place, seed, day and endings. A wording the engine
 * tied with the one said is listed beside it as the bank words it (slots in
 * braces), so the owner can grade the wordings as before.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BenchPlayer } from "../../src/bench/player";
import {
  leaveHoldsToCharacter,
  ordersDecide,
  ordersView,
} from "../../src/bench/office";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { memberKey } from "../../src/core2/modules/legislature";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { SceneTalkLine, TreeNode } from "../../src/director/scene-talk";
import { lineByKey } from "../../src/english/line-register";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const days = Number(option("days", "240"));
const persona = option("as", "resident");
const out = option("out", "docs/scenes/samples");

const SCHEMA = "scene-sample/1";

interface SampleLine {
  readonly n: number;
  readonly speaker: string;
  readonly role: SceneTalkLine["role"] | "player";
  readonly text: string;
  readonly move: string;
  readonly pieces: readonly string[];
  /** The other wordings that fit this spot as closely, as the bank words them. */
  readonly wordings: readonly { key: string; text: string }[];
  readonly asks: boolean;
  /** For a reply drawn from the player's own life, what it draws on. */
  readonly tag?: string;
}
interface SampleNode {
  readonly lines: readonly SampleLine[];
  readonly replies: readonly {
    readonly line: SampleLine;
    readonly leadsTo: SampleNode | null;
  }[];
  /** After a lie: both outcomes, "if they know" and "if not". */
  readonly branches?: readonly {
    label: string;
    knows: boolean;
    node: SampleNode;
  }[];
  readonly end?: {
    readonly outcome: string;
    readonly ending?: { id: string; label: string; keeps: string };
    readonly close?: SampleLine;
  };
}

const titleOf = (key: string) =>
  key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

function sampleLine(line: SceneTalkLine, player: boolean): SampleLine {
  const wordings = (line.placed?.ties ?? [])
    .filter((key) => !line.parts.includes(key))
    .flatMap((key) => {
      const piece = lineByKey(key);
      return piece ? [{ key, text: piece.text }] : [];
    });
  return {
    n: line.n,
    speaker: player ? "You" : line.speaker,
    role: player ? "player" : line.role,
    text: line.text,
    move: line.move,
    pieces: line.parts,
    wordings,
    asks: line.asks,
    ...(line.tag ? { tag: line.tag } : {}),
  };
}

function sampleNode(node: TreeNode): SampleNode {
  return {
    lines: node.lines.map((line) => sampleLine(line, false)),
    replies: node.replies.map((reply) => ({
      line: sampleLine(reply.line, true),
      leadsTo: reply.next ? sampleNode(reply.next) : null,
    })),
    ...(node.branches?.length
      ? {
          branches: node.branches.map((branch) => ({
            label: branch.label,
            knows: branch.knows,
            node: sampleNode(branch.node),
          })),
        }
      : {}),
    ...(node.end
      ? {
          end: {
            outcome: node.end.outcome,
            ...(node.end.ending
              ? {
                  ending: {
                    id: node.end.ending.id,
                    label: node.end.ending.label,
                    keeps: node.end.ending.keeps,
                  },
                }
              : {}),
            ...(node.end.close
              ? { close: sampleLine(node.end.close, false) }
              : {}),
          },
        }
      : {}),
  };
}

const head = execSync("git rev-parse HEAD").toString().trim();
const place = drawPlace(seed, "scene-samples");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const seats = townSeats(coreAPI(core)).filter((row) => row.holder?.personId);
const seatKind =
  persona === "governor"
    ? "governor"
    : persona === "legislator"
      ? "legislature-lower"
      : persona === "mayor"
        ? "mayor"
        : null;
const chosen = seatKind
  ? seats.find((row) => row.office.kind === seatKind)
  : undefined;
if (seatKind && !chosen?.holder)
  throw new Error(`no ${persona} seat held at ${place.name}`);
const player = new BenchPlayer(core, director);
player.select(chosen?.holder ? memberKey(chosen.holder) : world.playerId!);
const pid = player.personId!;
for (const seat of seats)
  if (
    seat.holder?.personId &&
    !director.ledger.people.has(seat.holder.personId)
  )
    director.watch(core, seat.holder.personId);
if (!director.ledger.people.has(pid)) director.watch(core, pid);
const standing = chosen
  ? `${chosen.office.kind} at ${place.name}`
  : `a resident of ${place.name}, not in office`;

mkdirSync(out, { recursive: true });
const indexFile = path.join(out, "INDEX.json");
const index: Record<string, unknown> = existsSync(indexFile)
  ? (
      JSON.parse(readFileSync(indexFile, "utf8")) as {
        samples: Record<string, unknown>;
      }
    ).samples
  : {};

const book = () => director.ledger.people.get(pid);
let seen = book()?.schedule.length ?? 0;
let written = 0;
const started = Date.parse(core.date);
for (
  let g = 0;
  g < days * 6 && Date.parse(core.date) < started + days * 86400000;
  g += 1
) {
  const packet = player.packet;
  if (player.pollingPlace) player.leavePolls();
  else if (packet?.kind === "stop") {
    for (const item of ordersView(core))
      ordersDecide(core, item.entryId, "decline");
    leaveHoldsToCharacter(core);
    player.resume({ kind: "stop", pauseId: packet.pauseId });
  } else if (packet?.kind === "choice")
    player.resume({ kind: "own-choice", pauseId: packet.pauseId });
  else player.advance("day");

  const schedule = book()?.schedule ?? [];
  const fresh = schedule.slice(seen);
  seen = schedule.length;
  for (const entry of fresh) {
    if (entry.outcome === "journal-line") continue;
    const moment = book()!.momentsById.get(entry.momentId);
    if (!moment) continue;
    for (const binding of entry.bindings) {
      const result = purposeScene(core, director, pid, entry, {
        typeKey: binding.typeKey,
      });
      if (result?.kind !== "composed") continue;
      const talk = result.scene.talk;
      const sample = {
        schema: SCHEMA,
        head,
        scene: {
          typeKey: talk.typeKey,
          purpose: talk.purpose,
          ...(talk.family ? { family: talk.family } : {}),
          title: titleOf(talk.typeKey),
        },
        world: {
          place: place.name,
          placeKey: place.key,
          seed,
          date: core.date,
        },
        player: { name: nameOf(core, pid), standing },
        cause: { id: moment.causeId, label: moment.label },
        cast: [
          { role: "asker", id: talk.askerId, name: nameOf(core, talk.askerId) },
          { role: "asked", id: talk.askedId, name: nameOf(core, talk.askedId) },
        ],
        opening: [
          ...talk.narration.map((line) => sampleLine(line, false)),
          ...(talk.open ? [sampleLine(talk.open, false)] : []),
          ...talk.intro.map((line) => sampleLine(line, true)),
        ],
        ask: sampleLine(talk.state, false),
        tree: sampleNode(talk.tree),
        endings: talk.endingCounts,
        depth: talk.depth,
        gaps: talk.gaps,
      };
      const file = `${talk.typeKey}.json`;
      writeFileSync(
        path.join(out, file),
        `${JSON.stringify(sample, null, 2)}\n`,
      );
      index[talk.typeKey] = {
        file,
        title: sample.scene.title,
        purpose: talk.purpose,
        place: place.name,
        seed,
        date: core.date,
        standing,
        depth: talk.depth,
        endings: talk.endingCounts,
        head,
      };
      written += 1;
    }
  }
}
writeFileSync(
  indexFile,
  `${JSON.stringify(
    {
      schema: "scene-samples-index/1",
      about:
        "One playable sample per scene type, written by scripts/words/scene-samples.ts from a played world. The CTO publishes these on the owner's click-through Scenes page.",
      samples: Object.fromEntries(
        Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
      ),
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${written} scene samples written to ${out} from ${days} days at ${place.name} (seed ${seed}, ${standing}); ${Object.keys(index).length} scene types in the index`,
);
