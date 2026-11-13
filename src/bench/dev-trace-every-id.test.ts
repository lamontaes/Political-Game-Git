/**
 * Dev mode's Trace answers for every record id the game itself shows. A drawn
 * place is played 45 days through dev mode's own advance; then every id the
 * Journal's lines and the News name as their sources (read through the view
 * functions the screens call), plus a law row in force, a bill, a vote, a
 * printed story, a counted household and person, a cash account and a
 * director moment, is traced. None may answer "not-a-record", and the picked
 * ids must be found in the engine that keeps them. The place, the seed and
 * the count by answer are printed, so a failure can be replayed with
 * DEV_TRACE_SEED (and DEV_TRACE_PLACE_KEY to replay a place another run named).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { residentsRuntime } from "../core2/modules/residents";
import { coreAPI } from "../core2/state";
import { keepsWhy } from "../core2/why-kept";
import { composeJournal } from "../director/journal";
import { heardItems, newsItems } from "./calendar";
import controls from "./data/controls.json" with { type: "json" };
import { DevMode } from "./dev-mode";
import { recordProof } from "./dev-proof";
import {
  COUNTED_ENGINE,
  ID_PARTS_ENGINE,
  MOMENT_ENGINE,
  type TraceNode,
} from "./dev-trace";
import { nationStories } from "./nation-news";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const seed = process.env.DEV_TRACE_SEED ?? randomBytes(8).toString("hex");
const DAYS = 45;

type Row = { id: string };

const drawn = drawPlace(seed, "dev-trace-every-id");
const placeKey = process.env.DEV_TRACE_PLACE_KEY ?? drawn.key;
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const { core, director, playerId } = world;
const where = `${world.place.displayName} (${placeKey}), seed ${seed}`;
const player = new BenchPlayer(core, director!);
// The director follows the player, as the bench does when play starts.
player.select(playerId!);
const dev = new DevMode(core, director, player, world.placeId);
const api = coreAPI(core);
const rows = (moduleId: string, table: string) =>
  core.modules.get(moduleId)?.state
    ? (api.moduleState(moduleId).table(table).rows() as unknown as Row[])
    : [];

describe(`dev trace, every id: ${where}`, () => {
  it("Trace answers for every record id the Journal and the News name, and for one of each kept kind", () => {
    dev.advance(addDays(makeIsoDate(core.date), DAYS));

    // Every id the screens name as a source, with the screen that named it.
    const named = new Map<string, string>();
    const name = (id: unknown, from: string) => {
      if (typeof id === "string" && id && !named.has(id)) named.set(id, from);
    };
    for (const chapter of composeJournal(core, director!, playerId!))
      for (const line of chapter.lines) {
        for (const id of line.sourceRecordIds) name(id, "journal source");
        for (const id of line.momentIds) name(id, "journal moment");
      }
    // The News as its route builds it: what the player heard, the town's public
    // record, then the nation's.
    const stories = [
      ...heardItems(core, playerId!),
      ...newsItems(core).filter((row) => row.visibility === "public"),
      ...nationStories(core, controls.news.nation, playerId),
    ] as (Row & { sourceRecordIds?: readonly string[] })[];
    for (const story of stories) {
      name(story.id, "news item");
      for (const id of story.sourceRecordIds ?? []) name(id, "news source");
    }
    const shown = named.size;

    // One of each kind the game keeps outside the log, picked from its own store.
    const picked = new Map<string, string>();
    const pick = (id: string | undefined, engine: string) => {
      if (!id) return;
      picked.set(id, engine);
      name(id, `picked ${engine}`);
    };
    const law = (
      rows(LAWS_MODULE_ID, "laws") as (Row & { effectiveDate?: string })[]
    ).find((row) => !row.effectiveDate || row.effectiveDate <= core.date);
    pick(law?.id, `${LAWS_MODULE_ID}.laws`);
    pick(
      rows(LEGISLATURE_MODULE_ID, "bills")[0]?.id,
      `${LEGISLATURE_MODULE_ID}.bills`,
    );
    pick(
      rows(LEGISLATURE_MODULE_ID, "votes")[0]?.id,
      `${LEGISLATURE_MODULE_ID}.votes`,
    );
    pick(
      rows("news", "stories").find((row) => row.id.startsWith("printed:"))?.id,
      "news.stories",
    );
    const store = residentsRuntime(core)?.store;
    const home = store ? [...store.liveHouseholds()][0] : undefined;
    pick(home?.id, COUNTED_ENGINE);
    pick(
      home && store ? store.memberIdsOf(home)[0] : undefined,
      COUNTED_ENGINE,
    );
    pick(
      [...core.cashJournal.accounts.keys()].find((id) =>
        id.startsWith("fund:"),
      ),
      "core.cashJournal.accounts",
    );
    pick(
      [
        ...(director!.ledger.people.get(playerId!)?.momentsById.keys() ?? []),
      ][0],
      MOMENT_ENGINE,
    );
    // A payment kept in detail, with the law rows its source line cites.
    const cited = [...core.cashJournal.detailedReceipts.values()].find((row) =>
      row.source.citation.startsWith("law:"),
    );
    pick(cited?.id, "core.cashJournal");

    const date = core.date;
    // The world's records before tracing: reading must leave every table as it was.
    const before = recordProof(core).digest;
    const byAnswer = new Map<string, number>();
    const byEngine = new Map<string, number>();
    const missing: string[] = [];
    const started = Date.now();
    const nodes = new Map<string, TraceNode>();
    for (const [id, from] of named) {
      const node = dev.trace(id);
      nodes.set(id, node);
      byAnswer.set(node.answer, (byAnswer.get(node.answer) ?? 0) + 1);
      const engine =
        node.engine.startsWith("core.") || node.engine.includes("-parts")
          ? node.engine
          : node.engine.replace(/\.[^.]+$/, ".*");
      byEngine.set(engine, (byEngine.get(engine) ?? 0) + 1);
      if (node.answer === "not-a-record") missing.push(`${from}: ${id}`);
    }
    const counts = (map: Map<string, number>) =>
      [...map]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => `${key} ${count}`)
        .join(", ");
    const composed = [...nodes.values()].filter(
      (node) => node.engine === ID_PARTS_ENGINE,
    ).length;
    console.log(
      `dev-trace-every-id: ${where}; ${DAYS} days to ${date}; ${named.size} ids (${shown} named by the Journal and the News, ${picked.size} picked); by answer: ${counts(byAnswer)}; by engine: ${counts(byEngine)}; ${composed} kept nowhere and answered by the records their ids name; ${Date.now() - started} ms`,
    );

    expect(shown, where).toBeGreaterThanOrEqual(15);
    expect(missing, where).toEqual([]);
    // Each picked id is found where the game keeps it, not only as an id made of other ids.
    for (const [id, engine] of picked)
      expect(nodes.get(id)!.engine, `${where}: ${id}`).toBe(engine);
    // The kinds the game always has are among them.
    for (const engine of [
      `${LAWS_MODULE_ID}.laws`,
      COUNTED_ENGINE,
      "core.cashJournal.accounts",
    ])
      expect([...picked.values()], where).toContain(engine);
    // A printed story opens the record it tells, and a tax payment the law that set its rate.
    const story = [...picked].find(([, engine]) => engine === "news.stories");
    if (story) {
      const told = nodes.get(story[0])!;
      expect(told.answer, `${where}: ${story[0]}`).toMatch(
        /^(decided|caused)$/,
      );
      expect(told.causes?.length ?? 0, `${where}: ${story[0]}`).toBeGreaterThan(
        0,
      );
    }
    if (cited) {
      const laws = (nodes.get(cited.id)!.causes ?? []).filter(
        (row) => row.engine === `${LAWS_MODULE_ID}.laws`,
      );
      expect(laws.length, `${where}: ${cited.id}`).toBeGreaterThan(0);
    }
    // An id nothing keeps, made of no kept id, still says so.
    expect(dev.trace("no-such-record:at-all").answer).toBe("not-a-record");
    // Tracing read only: no time spent and no record written, in any table.
    expect(core.date, where).toBe(date);
    expect(recordProof(core).digest, where).toBe(before);
  }, 600_000);

  // An edge the 45 days rarely hold (no election falls in them): a decision
  // row that keeps no reasons because its decider is nobody the player deals
  // with. The rows are put in the voting engine's own table for the check
  // and taken out again; everything else in this file is the played world's.
  it("says whose reasons were not kept and that Follow keeps the next ones", () => {
    const stranger = [...core.people.values()].find(
      (person) => person.alive && !keepsWhy(core, person.id),
    );
    const contest = rows("core2-elections-v1", "contests")[0];
    if (!stranger || !contest) {
      console.log(
        `dev-trace-every-id: ${where}: ${stranger ? "no contest on record" : "nobody outside the player's circle"}, so the circle check has no case here`,
      );
      return;
    }
    const ballots = api.moduleState("core2-voting-v1").table("ballots");
    const row = (id: string, contestId: string) => ({
      id,
      contestId,
      voterId: stranger.id,
      date: core.date,
      voted: true,
      choice: "write-in",
    });
    const bare = `ballot:none:${stranger.id}`;
    const named = `ballot:${contest.id}:${stranger.id}`;
    try {
      ballots.put(row(bare, "none"));
      ballots.put(row(named, contest.id));
      const alone = dev.trace(bare);
      expect(alone.answer, where).toBe("circle-only");
      expect(alone.decider, where).toEqual({
        personId: stranger.id,
        inCircle: false,
      });
      expect(alone.gap, where).toContain("Follow");
      // With a record behind it the answer is that record; the gap still says so.
      const withContest = dev.trace(named);
      expect(withContest.answer, where).toBe("caused");
      expect(withContest.causes!.map((cause) => cause.id)).toContain(
        contest.id,
      );
      expect(withContest.decider?.inCircle, where).toBe(false);
      dev.follow(stranger.id);
      expect(dev.trace(bare).decider?.inCircle, where).toBe(true);
      expect(dev.trace(bare).answer, where).toBe("no-cause-kept");
    } finally {
      dev.unfollow(stranger.id);
      ballots.remove(bare);
      ballots.remove(named);
    }
  });
});
