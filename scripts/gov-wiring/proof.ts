/* global process, console */
// One year of the played world (bench build, two-level, every module, bookkeeping
// off) in a place drawn from all 56, then reads the records that show the
// votes-and-views chain working, by record id. One run, one number.
// Usage: node --import tsx scripts/gov-wiring/proof.ts [--seed S] [--days 365]
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const value = (name: string, fallback: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1]! : fallback;
const seed = value("--seed", randomBytes(20).toString("hex"));
const days = Number(value("--days", "365"));
const out = value("--out", "");

setBookkeeping(false);
// --place-key and --place-seed rerun a world someone else drew (the audit's).
const drawn = drawPlace(seed, "gov-wiring");
const place = {
  key: value("--place-key", drawn.key),
  seed: value("--place-seed", drawn.seed),
};
const built = performance.now();
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const start = core.date;
console.error(
  JSON.stringify({
    place: place.key,
    seed,
    placeSeed: place.seed,
    start,
    buildSeconds: (performance.now() - built) / 1000,
  }),
);
type Row = Record<string, unknown> & { id: string };
const rows = (module: string, name: string): Row[] =>
  core.modules.has(module)
    ? (api.moduleState(module).table(name).rows() as unknown as Row[])
    : [];

// Interest-group membership, watched day by day (switches show on the day).
const GROUPS = "core2-interest-groups-v1";
const membersBefore = new Map<string, Set<string>>();
const switches: {
  personId: string;
  from: string;
  to: string | null;
  date: string;
}[] = [];
const snapshot = () => {
  const now = new Map<string, Set<string>>();
  for (const g of rows(GROUPS, "groups"))
    now.set(g.id, new Set((g.memberPersonIds as string[] | undefined) ?? []));
  return now;
};
let previous = snapshot();
const ran = performance.now();
let day = start;
for (let i = 0; i < days; i++) {
  const next = addDays(makeIsoDate(day), 1);
  advanceCore(core, next);
  const now = snapshot();
  for (const [groupId, before] of previous) {
    const after = now.get(groupId) ?? new Set();
    for (const personId of before)
      if (!after.has(personId)) {
        const base = groupId.replace(/:(for|against)$/, "");
        const other = groupId.endsWith(":for")
          ? `${base}:against`
          : `${base}:for`;
        switches.push({
          personId,
          from: groupId,
          to: now.get(other)?.has(personId) ? other : null,
          date: next,
        });
      }
  }
  previous = now;
  day = next;
  if (next.endsWith("-01"))
    console.error(`${next} ${((performance.now() - ran) / 1000).toFixed(0)} s`);
}
const runSeconds = (performance.now() - ran) / 1000;
void membersBefore;

// 1. Votes that went the other way because of what members heard.
const LEG = "core2-legislature-v1";
const legId =
  [...core.modules.keys()].find((id) => id.includes("legislature")) ?? LEG;
const votes = rows(legId, "votes").filter(
  (v) =>
    (v.position as { openingViews?: number } | undefined)?.openingViews !==
    undefined,
);
const moved = votes.map((v) => {
  const p = v.position as {
    total: number;
    views: number;
    openingViews: number;
  };
  const opening = p.total - p.views + p.openingViews;
  return {
    v,
    p,
    opening,
    flipped: Math.sign(opening) !== Math.sign(p.total) && p.total !== 0,
  };
});
const stancesFor = (personId: string) =>
  rows("views", "stances").filter((s) => s.personId === personId);
const flips = moved
  .filter((m) => m.flipped && core.people.has(String(m.v.memberId)))
  .map((m) => {
    const memberId = String(m.v.memberId);
    const stances = stancesFor(memberId).map((s) => ({
      id: s.id,
      desiredChange: s.desiredChange,
      strength: s.strength,
      causes: (s.causes as { eventId: string; date: string; change: number }[])
        .filter(
          (c) =>
            c.date <=
            String(
              (m.v.id as string).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "9999",
            ),
        )
        .sort((a, b) => b.change - a.change)
        .slice(0, 5),
      causeCount: (s.causes as unknown[]).length,
    }));
    return {
      voteId: m.v.id,
      vote: m.v.vote,
      memberId,
      views: m.p.views,
      openingViews: m.p.openingViews,
      total: m.p.total,
      totalAtOpeningViews: m.opening,
      stances,
    };
  });
const viewMoves = moved.filter(
  (m) => Math.abs(m.p.views - m.p.openingViews) > 1e-9,
);

// 2. Cases made by kind of event, and stance changes they caused.
const allStances = rows("views", "stances");
const causeKinds = new Map<string, number>();
for (const s of allStances)
  for (const c of s.causes as { eventId: string }[]) {
    const kind = c.eventId.startsWith("speech:hearing:")
      ? "hearing"
      : c.eventId.startsWith("speech:remark:")
        ? "public comment"
        : c.eventId.startsWith("case:lobby:")
          ? "lobbying visit"
          : c.eventId.startsWith("case-made:case:")
            ? "constituent case"
            : c.eventId.startsWith("speech:") && c.eventId.includes(":retold:")
              ? "retold"
              : c.eventId.startsWith("speech:")
                ? "campaign or other speech"
                : `other: ${c.eventId.split(":")[0]}`;
    causeKinds.set(kind, (causeKinds.get(kind) ?? 0) + 1);
  }

// 3. Interest groups: nobody on both sides.
const groups = rows(GROUPS, "groups").filter(
  (g) => (g.memberPersonIds as string[] | undefined)?.length,
);
const both: string[] = [];
for (const g of groups.filter((g) => g.id.endsWith(":for"))) {
  const other = groups.find((x) => x.id === g.id.replace(/:for$/, ":against"));
  if (!other) continue;
  const theirs = new Set(other.memberPersonIds as string[]);
  for (const id of g.memberPersonIds as string[])
    if (theirs.has(id)) both.push(`${id} in ${g.id}`);
}

// 4. Unemployment claims and the law they read.
const claims = [...core.modules.keys()].flatMap((m) =>
  ["claims"].flatMap((t) => {
    try {
      return (api.moduleState(m).table(t).rows() as unknown as Row[]).map(
        (r) => ({ module: m, ...r }),
      );
    } catch {
      return [];
    }
  }),
);

// 5. Outcome-web landing rows left.
const landings = [...core.modules.keys()]
  .filter((m) => m.includes("outcome-web"))
  .flatMap((m) => {
    try {
      return api.moduleState(m).table("landings").rows();
    } catch {
      return [];
    }
  });

const result = {
  head: process.env.HEAD_SHA ?? null,
  place: place.key,
  seed,
  placeSeed: place.seed,
  span: { from: start, to: day, days },
  runSeconds,
  votes: votes.length,
  votesWhoseViewsMoved: viewMoves.length,
  votesFlippedByWhatTheyHeard: flips.length,
  closestMoved: viewMoves
    .map((m) => ({
      voteId: m.v.id,
      vote: m.v.vote,
      shift: m.p.views - m.p.openingViews,
      total: m.p.total,
      opening: m.opening,
      stances: stancesFor(String(m.v.memberId)).map((s) => ({
        id: s.id,
        desiredChange: s.desiredChange,
        strength: s.strength,
        causes: (s.causes as { eventId: string; change: number }[])
          .slice(0, 4)
          .map((c) => `${c.eventId} ${c.change.toFixed(4)}`),
        byKind: Object.entries(
          (s.causes as { eventId: string; change: number }[]).reduce<
            Record<string, number>
          >((sum, c) => {
            const kind = c.eventId.includes(":retold:")
              ? "retold"
              : c.eventId.split(":").slice(0, 2).join(":");
            sum[kind] = (sum[kind] ?? 0) + c.change;
            return sum;
          }, {}),
        ).map(([kind, total]) => `${kind} ${total.toFixed(3)}`),
      })),
    }))
    .sort((a, b) => Math.abs(a.total) - Math.abs(b.total))
    .slice(0, 10),
  flips: flips.slice(0, 5),
  stanceChangesByCause: Object.fromEntries(causeKinds),
  groups: groups.map((g) => ({
    id: g.id,
    members: (g.memberPersonIds as string[]).length,
  })),
  groupSwitches: switches.slice(0, 20),
  groupSwitchCount: switches.length,
  inBothSides: both,
  claims: claims.slice(0, 3),
  claimCount: claims.length,
  landingsLeft: landings.length,
};
const text = JSON.stringify(result, null, 2);
if (out) writeFileSync(out, text);
console.log(text);
