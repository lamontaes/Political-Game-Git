/**
 * C1 profile: one developed history, measured rather than extrapolated.
 *
 * Builds a current opening, advances it in year-long steps and then in one
 * long skip, and times the four things that actually cost something: the
 * clock (due items and their handlers), the integrity pass, the projections
 * a surface reads, and serialization. Every number printed is measured on
 * this machine in this run; nothing here is scaled from a fresh life.
 *
 * With a per-key wrapper over the composed registry it also attributes the
 * clock's cost: time inside each keyed handler against time in the shared
 * resolve-and-write path outside them (GOVERNING's method, so the two lanes'
 * numbers are comparable per key rather than as totals).
 *
 *   node --import tsx scripts/dev-lab/profile-long-history.ts [years] [seed]
 */
import { performance } from "node:perf_hooks";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { crisisPersonDeathRecipientNotices } from "../../src/simulation/crisis";
import { projectCongress } from "../../src/simulation/living-world/congress";
import { serializeWorld } from "../../src/simulation/serialization";
import type { World } from "../../src/simulation/types";
import { advanceWorld, assertWorldIntegrity } from "../../src/simulation/world";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { projectWorldOrientation } from "../../src/presentation/living-world-orientation";
import { projectMacroConditions } from "../../src/presentation/macro-conditions";

const years = Number(process.argv[2] ?? 30);
const seed = process.argv[3] ?? "world47-profile";

function ms(started: number): number {
  return Math.round((performance.now() - started) * 10) / 10;
}

function sizes(world: World) {
  const history = world.history as unknown as Record<string, unknown>;
  const count = (key: string) =>
    Array.isArray(history[key]) ? (history[key] as unknown[]).length : 0;
  return {
    people: Object.keys(world.people).length,
    events: count("events"),
    crisisRecords: count("crisisRecords"),
    dueItems: count("futureDueItems"),
    nextSequence: (world.history as { nextSequence: number }).nextSequence,
  };
}

const base = createCampaignElectionTransitionRegistry();
const handlerMs = new Map<string, { ms: number; calls: number }>();
/** Times each keyed handler; everything else is the shared write path. */
const registry: typeof base = {
  ...base,
  get: (key) => {
    const handler = base.get(key);
    if (!handler) return handler;
    return (world, item) => {
      const startedAt = performance.now();
      const result = handler(world, item);
      const seen = handlerMs.get(key) ?? { ms: 0, calls: 0 };
      handlerMs.set(key, {
        ms: seen.ms + (performance.now() - startedAt),
        calls: seen.calls + 1,
      });
      return result;
    };
  },
};

function handlerSplit(totalMs: number) {
  const rows = [...handlerMs.entries()]
    .map(([key, value]) => ({
      key,
      seconds: Math.round(value.ms) / 1000,
      calls: value.calls,
    }))
    .sort((a, b) => b.seconds - a.seconds);
  const inside = rows.reduce((sum, row) => sum + row.seconds, 0);
  handlerMs.clear();
  return {
    insideHandlersSeconds: Math.round(inside * 10) / 10,
    outsideHandlersSeconds: Math.round((totalMs / 1000 - inside) * 10) / 10,
    topHandlers: rows.slice(0, 6),
  };
}

const openedAt = performance.now();
const game = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 30,
    depth: "summarize-earlier-life",
  }),
).game!;
const openingMs = ms(openedAt);

let world = game.world;
const steps: Record<string, unknown>[] = [];
for (let year = 1; year <= years; year += 1) {
  const startedAt = performance.now();
  world = advanceWorld(world, 365, registry);
  const advanceMs = ms(startedAt);
  const split = handlerSplit(advanceMs);
  if (year % 5 === 0 || year === 1 || year <= 3) {
    const integrityAt = performance.now();
    assertWorldIntegrity(world);
    const integrityMs = ms(integrityAt);
    const serializeAt = performance.now();
    const payload = serializeWorld(world);
    steps.push({
      year,
      advanceMs,
      ...split,
      integrityMs,
      serializeMs: ms(serializeAt),
      saveBytes: payload.length,
      ...sizes(world),
    });
  } else {
    steps.push({ year, advanceMs, ...split });
  }
}

// One long skip on top of the developed history, the case a player hits when
// they leave the game running forward.
const skipAt = performance.now();
world = advanceWorld(world, 365 * 3, registry);
const longSkipMs = ms(skipAt);

const projectionAt = performance.now();
const congress = projectCongress(world);
const congressMs = ms(projectionAt);
const orientationAt = performance.now();
projectWorldOrientation(world, game.playerPersonId);
const orientationMs = ms(orientationAt);
const macroAt = performance.now();
projectMacroConditions(
  world,
  world.people[game.playerPersonId]!.homeJurisdictionId,
);
const macroMs = ms(macroAt);
const noticesAt = performance.now();
const notices = crisisPersonDeathRecipientNotices(world);
const noticesMs = ms(noticesAt);

console.log(
  JSON.stringify(
    {
      seed,
      years,
      openingMs,
      longSkipDays: 365 * 3,
      longSkipMs,
      projections: {
        projectCongressMs: congressMs,
        congressSeats: congress ? congress.house.totals.seats : null,
        projectWorldOrientationMs: orientationMs,
        projectMacroConditionsMs: macroMs,
        deathNoticesMs: noticesMs,
        deathNotices: notices.length,
      },
      final: sizes(world),
      steps,
    },
    null,
    2,
  ),
);
