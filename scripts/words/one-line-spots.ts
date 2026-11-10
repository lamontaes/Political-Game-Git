/**
 * Lists the spots that hold a single line, ordered by how often a player's
 * scenes reach them in three drawn places (words machine, part 6). It lists;
 * it changes no bank.
 *
 *   node --import tsx scripts/words/one-line-spots.ts [--seeds a,b,c] [--days 365] [--out docs/words/one-line-spots.md]
 *
 * Seeds not given are drawn from the clock and printed at the top, so the
 * three places are drawn, never chosen. Each place runs in its own process
 * (a bench world is large). A count is the number of times the line is
 * worded in the scenes the director staged for the player's household in
 * the year: the narration, the opening, and every line of each scene's
 * reply tree (a line offered counts, a branch not taken included), plus the
 * talks the scenes hand off to. Development tooling; shipped play never
 * imports it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spotsOf } from "../../src/english/line-rules";
import type { TreeNode } from "../../src/director/scene-talk";
import { readBankPieces } from "./run-rules";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const days = Number(option("days", "365"));
const out = option("out", "docs/words/one-line-spots.md");
const workerSeed = option("worker", "");
const workerOut = option("worker-out", "");

interface PlaceCounts {
  seed: string;
  place: string;
  scenes: number;
  counts: Record<string, number>;
}

async function worker(seed: string): Promise<PlaceCounts> {
  const [{ buildBenchWorld }, { setBookkeeping }, player, conv, scene] =
    await Promise.all([
      import("../../src/bench/world"),
      import("../../src/core2/bookkeeping"),
      import("../../src/core2/player-v1"),
      import("../../src/director/conversation"),
      import("../../src/director/scene"),
    ]);
  const { purposeScene } = await import("../../src/director/purpose-scene");
  const { addDays, makeIsoDate } = await import("../../src/core2/kernel/dates");
  const { drawPlace } = await import("../core2-year/place");
  const { OPENING_DATE } = await import("../dialogue-batch/play-lives");
  const place = drawPlace(seed, "one-line-spots");
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, OPENING_DATE, {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const household = core.households.get(core.people.get(playerId)!.householdId);
  for (const id of household?.memberIds ?? [playerId])
    if (core.people.get(id)?.alive) director.watch(core, id);
  const book = () => director.ledger.people.get(playerId);
  const counts: Record<string, number> = {};
  const hit = (keys: readonly (string | undefined)[]) => {
    for (const key of keys) if (key) counts[key] = (counts[key] ?? 0) + 1;
  };
  let seen = book()?.schedule.length ?? 0;
  let scenes = 0;
  for (let day = 0; day < days; day += 1) {
    let packet = player.advancePlayerV1(core, {
      controlledPersonId: playerId,
      through: { date: addDays(makeIsoDate(core.date), 1), minuteOfDay: 1439 },
    });
    while (packet.kind !== "complete")
      packet = player.resumePlayerV1(core, {
        kind: packet.kind === "choice" ? "own-choice" : "stop",
        pauseId: packet.pauseId,
      });
    const schedule = book()?.schedule ?? [];
    const fresh = schedule.slice(seen);
    seen = schedule.length;
    for (const entry of fresh.filter((e) => e.outcome !== "journal-line")) {
      scenes += 1;
      const composed = scene.composeScene(core, director, playerId, entry);
      for (const line of composed?.narration ?? []) hit(line.parts ?? []);
      hit(composed?.arrival?.parts ?? []);
      const purpose = purposeScene(core, director, playerId, entry);
      if (purpose?.kind === "composed") {
        const talk = purpose.scene.talk;
        for (const l of talk.narration) hit(l.parts ?? []);
        hit(talk.open?.parts ?? []);
        hit(talk.state.parts ?? []);
        const walk = (node: TreeNode): void => {
          for (const l of node.lines) hit(l.parts ?? []);
          if (node.end?.close) hit(node.end.close.parts ?? []);
          for (const reply of node.replies) {
            hit(reply.line.parts ?? []);
            if (reply.next) walk(reply.next);
          }
        };
        walk(talk.tree);
      }
      if (composed?.talkToId) {
        const talk = conv.openConversation(core, playerId, composed.talkToId, {
          presentIds: composed.presentIds,
          director,
          occasionId: entry.momentId,
        });
        for (let turn = 0; talk && turn < 8 && talk.choices.length; turn += 1) {
          hit(talk.lines.at(-1)?.wording?.parts ?? []);
          hit(talk.choices[0]!.tail?.parts ?? []);
          conv.say(core, talk, talk.choices[0]!.key);
        }
      }
    }
  }
  return { seed, place: `${place.name} (${place.key})`, scenes, counts };
}

if (workerSeed) {
  worker(workerSeed).then((result) => {
    writeFileSync(workerOut, JSON.stringify(result));
  });
} else {
  const seeds = option("seeds", "")
    ? option("seeds", "").split(",")
    : [0, 1, 2].map(
        (n) =>
          `ols-${Date.now().toString(36)}-${n}-${Math.random().toString(36).slice(2, 6)}`,
      );
  const results: PlaceCounts[] = seeds.map((seed, n) => {
    const file = `${process.env.TMPDIR ?? "/tmp"}/one-line-spots-${n}.json`;
    process.stderr.write(`running ${seed}\n`);
    execFileSync(
      process.execPath,
      [
        "--max-old-space-size=6144",
        "--import",
        "tsx",
        process.argv[1]!,
        "--worker",
        seed,
        "--worker-out",
        file,
        "--days",
        String(days),
      ],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    return JSON.parse(readFileSync(file, "utf8")) as PlaceCounts;
  });
  const pieces = readBankPieces();
  const spotPieces = new Map<string, string[]>();
  for (const piece of pieces)
    for (const spot of spotsOf(piece)) {
      const list = spotPieces.get(spot) ?? [];
      list.push(piece.key);
      spotPieces.set(spot, list);
    }
  const byKey = new Map(pieces.map((p) => [p.key, p]));
  const rows = [...spotPieces]
    .filter(([, keys]) => keys.length === 1)
    .map(([spot, keys]) => {
      const piece = byKey.get(keys[0]!)!;
      const per = results.map((r) => r.counts[piece.key] ?? 0);
      return {
        spot,
        bank: piece.bank,
        key: piece.key,
        text: piece.text,
        per,
        total: per.reduce((a, b) => a + b, 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
  const played = rows.filter((r) => r.total > 0);
  const md = [
    "# One-line spots, by how often scenes play them",
    "",
    "Generated by `scripts/words/one-line-spots.ts`; it lists, it changes no bank.",
    "",
    `Days played per place: ${days}. Places and seeds (drawn, never chosen):`,
    ...results.map(
      (r, n) =>
        `- Place ${n + 1}: ${r.place}, seed \`${r.seed}\`, ${r.scenes} scenes`,
    ),
    "",
    `${rows.length} spots hold one line; ${played.length} of them played in these runs. ` +
      "A count is the times the line was worded in the household's staged scenes " +
      "(narration, opening, each reply tree line offered, and the talk each scene hands off to).",
    "",
    "| # | Plays | Per place | Bank | Key | Line |",
    "|---|---|---|---|---|---|",
    ...played.map(
      (r, n) =>
        `| ${n + 1} | ${r.total} | ${r.per.join(" / ")} | ${r.bank} | \`${r.key}\` | ${r.text.replace(/\|/g, "\\|")} |`,
    ),
    "",
    `${rows.length - played.length} one-line spots never played in these runs (not listed).`,
    "",
  ].join("\n");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, md);
  process.stdout.write(md.split("\n").slice(0, 8).join("\n") + "\n");
}
