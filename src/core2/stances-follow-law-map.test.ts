// @vitest-environment node
/**
 * A legislator's stance and a state's pull from its neighbors follow the
 * world's own law map (Pins family 18, owner: "Everything comes from the
 * simulation"): enact a question the world's states split on in three more
 * states through dev mode's own law call, one of them bordering the town's
 * state, and a sitting legislator's stance (another state's where its chamber is seated as rows, else the town's own) rises by the consensus term's
 * change, |axis| x 2 x 3 / answered, while the town's state's pull from its
 * neighbors rises by 2 / the neighbors answering. On main both read real
 * 2026 tables (the share of real states with the law, each neighbor's
 * researched starting answer) and never move. A random place and seed each
 * run, named in every message (GOLDEN_PATH_SEED replays one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { DevMode, lawSeriesCatalog } from "../bench/dev-mode";
import { findRecord } from "../bench/dev-trace";
import stateReach from "./data/places/state-reach.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { axisOf } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { lawConsensus } from "./law-consensus";
import { answerIn, lawChain, POLICY_QUESTIONS } from "./modules/laws";
import { allOfficials, officialStance } from "./modules/officials";
import { neighborPull } from "./modules/world-legislating";
import { placeStateKeys } from "./places";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const BORDERS = (
  stateReach as unknown as { states: Record<string, { borders: string[] }> }
).states;
const neighborsOf = (state: string) =>
  (BORDERS[state.replace(/^US-/, "")]?.borders ?? []).map((u) => `US-${u}`);

it(
  `stances and neighbors' pull follow the world's own laws, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    try {
      // A town whose state has a neighbor: a state with none (an island, a
      // territory) has no neighbors' pull to move; drawn again, named.
      const passed: string[] = [];
      let place = drawPlace(replay, "stances-follow-law-map:0");
      for (let at = 1; !neighborsOf(place.state).length; at += 1) {
        passed.push(`${place.name} (${place.state}: no bordering state)`);
        place = drawPlace(replay, `stances-follow-law-map:${at}`);
      }
      const where = `${place.name} (${place.key}), seed ${place.seed}, replay ${replay}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const town = lawChain(api).stateKey;
      const neighbors = neighborsOf(town);
      const catalog = new Set(lawSeriesCatalog(api));
      const no = (state: string, q: string) =>
        answerIn(api, state, q, true) === -1;
      // A question the world's states split on, with a neighbor and two
      // other states (neither the town's nor a neighbor) answering no, and an
      // outside legislator in a fourth state whose stance is not at the
      // scale's end, so the change shows whole. Questions with no such
      // legislator are passed over and named.
      const skipped: string[] = [];
      let found:
        | {
            q: string;
            enacted: string[];
            before: NonNullable<ReturnType<typeof lawConsensus>>;
            step: number;
            official: ReturnType<typeof allOfficials>[number];
          }
        | undefined;
      for (const q of Object.keys(POLICY_QUESTIONS)
        .filter((key) => axisOf[key] && catalog.has(key))
        .sort()) {
        const c = lawConsensus(api, q);
        if (!c || c.share <= 0 || c.share >= 1) continue;
        const others = placeStateKeys().filter(
          (st) => st !== town && !neighbors.includes(st) && no(st, q),
        );
        const neighbor = neighbors.find((st) => no(st, q));
        if (!neighbor || others.length < 2) continue;
        const enacted = [neighbor, others[0]!, others[1]!];
        const step =
          (Math.abs(axisOf[q]!.axis) * 2 * enacted.length) / c.counted;
        // Any sitting legislator outside the three enacting states reads the
        // consensus term. One from another state is preferred; where other
        // states' chambers are not seated as rows (they are seated from the
        // century as counts), the town's own state's legislators are.
        const sitting = allOfficials(api)
          .filter(
            (row) =>
              row.ended === null &&
              row.bodyKind === "legislature" &&
              !enacted.includes(row.stateKey),
          )
          .sort(
            (a, b) =>
              Number(a.stateKey === town) - Number(b.stateKey === town) ||
              a.id.localeCompare(b.id),
          );
        const official = sitting.find((row) => {
          const st = officialStance(api, row.id, q);
          return st !== null && st > -1 + 1e-9 && st + step < 1 - 1e-9;
        });
        if (!official) {
          skipped.push(
            `${q} (${sitting.length} sitting legislators, every one at the scale's end)`,
          );
          continue;
        }
        found = { q, enacted, before: c, step, official };
        break;
      }
      expect(
        found,
        `${where}: a split question with a sitting legislator off the scale's end; passed over: ${skipped.join("; ") || "none"}`,
      ).toBeTruthy();
      const { q, enacted, before, step, official } = found!;
      if (skipped.length)
        process.stdout.write(`${where}: passed over ${skipped.join("; ")}\n`);
      const stanceBefore = officialStance(api, official!.id, q)!;
      const pullBefore = neighborPull(api, q, 1, town);
      const answered = neighbors.filter(
        (s) => answerIn(api, s, q, true) !== null,
      ).length;

      // Dev mode's own law call, as its law panel makes it.
      const rows = enacted.map(
        (stateKey) =>
          dev.setLaw({ level: "state", series: q, value: 1, stateKey }).law,
      );

      const after = lawConsensus(api, q)!;
      const stanceAfter = officialStance(api, official!.id, q)!;
      const pullAfter = neighborPull(api, q, 1, town);
      const trace = findRecord(world.core, `consensus:${q}`);
      process.stdout.write(
        `STANCES-FOLLOW-LAWS ${where}${passed.length ? ` (passed over ${passed.join("; ")})` : ""}: ${q} enacted in ${enacted.join(", ")} (${rows.map((r) => r.id).join(", ")}); states yes ${before.yes}/${before.counted} -> ${after.yes}/${after.counted}; official ${official!.id} (${official!.stateKey}) ${stanceBefore.toFixed(4)} -> ${stanceAfter.toFixed(4)} (expected +${step.toFixed(4)}); ${town} neighbors' pull ${pullBefore.toFixed(4)} -> ${pullAfter.toFixed(4)} (expected +${(2 / answered).toFixed(4)})\n`,
      );
      expect(after.yes - before.yes, where).toBe(enacted.length);
      expect(after.counted, where).toBe(before.counted);
      expect(stanceAfter - stanceBefore, where).toBeCloseTo(step, 9);
      expect(pullAfter - pullBefore, where).toBeCloseTo(2 / answered, 9);
      // The trace holds the consensus with the law rows it counted.
      const row = trace?.record as
        { yes?: number; counted?: number; lawIds?: string[] } | undefined;
      expect(row?.yes, `${where}: consensus:${q} in the trace`).toBe(after.yes);
      for (const law of rows)
        expect(row?.lawIds, `${where}: ${law.id}`).toContain(law.id);
    } finally {
      setBookkeeping(true);
    }
  },
);
