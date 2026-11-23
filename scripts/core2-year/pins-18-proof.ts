/**
 * Pins family 18 in played worlds: legislators' stances, a state's pull
 * from its neighbors, people's life stakes and the public's opinion all come
 * from the world, not from real 2026 tables. Three drawn places, one played
 * year each: every law a government of the world enacted on a policy
 * question in the year, by law row id; the world's consensus on each before
 * and after; one outside official's stance on the first before and after;
 * the town's state's neighbors' pull; the stake references and the opinion
 * of a few questions by month; and, across the worlds, the same question's
 * opinion share next to the poll's party split (never its share).
 * Run: node --import tsx scripts/core2-year/pins-18-proof.ts [seed] [worlds]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { findRecord } from "../../src/bench/dev-trace";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { axisOf } from "../../src/core2/campaign-data";
import { leanStrength } from "../../src/core2/campaign-views";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { lawConsensus } from "../../src/core2/law-consensus";
import {
  lawChain,
  LAWS_MODULE_ID,
  type LawRowInput,
} from "../../src/core2/modules/laws";
import {
  allOfficials,
  officialStance,
} from "../../src/core2/modules/officials";
import {
  STAKE_REFERENCES_ID,
  VIEWS_MODULE_ID,
  worldOpinion,
} from "../../src/core2/modules/views";
import { neighborPull } from "../../src/core2/modules/world-legislating";
import { coreAPI } from "../../src/core2/state";
import support from "../../data/research/campaigns/policy-support-2026.json" with { type: "json" };
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const worlds = Number(process.argv[3] ?? 3);
const out = (line: string) => process.stdout.write(`${line}\n`);
// Questions both parties back, and one that splits them: whatever their
// opinion is in a world comes from its own people.
const WATCHED = [
  "us-policy-positions:labor-workforce.paid-family-leave",
  "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
  "us-policy-positions:civil-family-community.restrict-abortion",
];
const polls = (
  support as unknown as {
    questions: Record<
      string,
      { democrats: number | null; republicans: number | null }
    >;
  }
).questions;
const shares = new Map<string, string[]>();

out(`Pins 18 proof, base seed ${seed}, ${worlds} worlds, one played year each`);
for (let w = 0; w < worlds; w += 1) {
  const place = drawPlace(seed, `pins-18-proof:${w}`);
  const started = Date.now();
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  });
  const core = world.core;
  const api = coreAPI(core);
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  const town = lawChain(api).stateKey;
  const start = core.date;
  out(
    `\n== ${place.name} (${place.key}, ${town}), world seed ${place.seed}, from ${start}`,
  );
  const policy = Object.keys(axisOf);
  const consensusBefore = new Map(policy.map((q) => [q, lawConsensus(api, q)]));
  // Every legislator outside the town's state, for the stance read.
  const outside = allOfficials(api)
    .filter(
      (row) =>
        row.ended === null &&
        row.bodyKind === "legislature" &&
        row.stateKey !== town,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const stancesBefore = new Map(
    outside.map((row) => [
      row.id,
      new Map(policy.map((q) => [q, officialStance(api, row.id, q)])),
    ]),
  );
  const pullBefore = new Map(
    policy.map((q) => [q, neighborPull(api, q, 1, town)]),
  );
  const monthly: string[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const next = addDays(makeIsoDate(`${start.slice(0, 7)}-01`), 31 * m);
    dev.advance(`${next.slice(0, 7)}-02`);
    const refs = api
      .moduleState(VIEWS_MODULE_ID)
      .table("stakeReferences")
      .get(STAKE_REFERENCES_ID) as unknown as
      | {
          month: string;
          people: number;
          facts: Record<string, { reference: number }>;
        }
      | undefined;
    const opinions = WATCHED.map((q) => {
      const o = worldOpinion(api, q);
      return o
        ? `${q.split(".").at(-1)} ${o.share.toFixed(3)} (mean ${o.mean.toFixed(3)})`
        : `${q} none`;
    });
    monthly.push(
      `  ${refs?.month ?? "-"}: references over ${refs?.people ?? 0} people: ${Object.entries(
        refs?.facts ?? {},
      )
        .map(([f, r]) => `${f} ${r.reference}`)
        .join(", ")}; opinion yes ${opinions.join("; ")}`,
    );
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  // Every policy law a government of the world enacted in the year.
  const enacted = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  )
    .filter(
      (row) =>
        row.terms?.enactedBy !== undefined &&
        row.retrieved >= start &&
        (row.level === "state" || row.level === "federal") &&
        lawConsensus(api, row.series) !== null,
    )
    .sort((a, b) => a.retrieved.localeCompare(b.retrieved));
  out(
    `played to ${core.date} in ${seconds} s; ${enacted.length} policy laws enacted by the world's governments:`,
  );
  for (const row of enacted)
    out(
      `  ${row.retrieved} ${row.id} (${row.jurisdiction} ${row.value === 1 ? "yes" : "no"}, ${String(row.terms?.decision ?? row.terms?.enactedByBill ?? "")})`,
    );
  const questions = [...new Set(enacted.map((row) => row.series))];
  out(`consensus before -> after, by question enacted on:`);
  for (const q of questions) {
    const b = consensusBefore.get(q),
      a = lawConsensus(api, q);
    const trace = findRecord(core, `consensus:${q}`)?.record as
      { lawIds?: string[] } | undefined;
    out(
      `  ${q}: ${b ? `${b.yes}/${b.counted} = ${b.share.toFixed(4)}` : "-"} -> ${a ? `${a.yes}/${a.counted} = ${a.share.toFixed(4)}` : "-"} (${a?.from}); trace consensus:${q} counts ${trace?.lawIds?.length ?? 0} law rows; neighbors' pull on ${town} ${pullBefore.get(q)!.toFixed(3)} -> ${neighborPull(api, q, 1, town).toFixed(3)}`,
    );
  }
  // One outside official, in a state other than the one that enacted it.
  const first = enacted.find((row) => row.jurisdiction !== "US");
  if (first) {
    const official = outside.find(
      (row) =>
        row.stateKey !== first.jurisdiction &&
        officialStance(api, row.id, first.series) !== null,
    );
    if (official)
      out(
        `official ${official.id} (${official.stateKey}) on ${first.series}: ${stancesBefore.get(official.id)!.get(first.series)!.toFixed(4)} -> ${officialStance(api, official.id, first.series)!.toFixed(4)}`,
      );
  }
  out(`by month:`);
  for (const line of monthly) out(line);
  for (const q of WATCHED) {
    const o = worldOpinion(api, q);
    const list = shares.get(q) ?? [];
    list.push(`${place.name}: ${o ? o.share.toFixed(3) : "-"}`);
    shares.set(q, list);
  }
}
out(
  `\n== the same questions across the worlds (opinion yes share, end of year)`,
);
for (const q of WATCHED) {
  const poll = polls[q];
  out(
    `${q} (lean strength ${leanStrength(q).toFixed(2)}; poll party split D ${poll?.democrats} R ${poll?.republicans}, its share not carried): ${shares.get(q)!.join("; ")}`,
  );
}
