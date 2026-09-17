/**
 * C1 profile: one developed history, measured rather than extrapolated.
 *
 * Builds a current opening, advances it in year-long steps and then in one
 * long skip, and times the four things that actually cost something: the
 * clock (due items and their handlers), the integrity pass, the projections
 * a surface reads, and serialization. Every number printed is measured on
 * this machine in this run; nothing here is scaled from a fresh life.
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

const registry = createCampaignElectionTransitionRegistry();

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
  if (year % 5 === 0 || year === 1) {
    const integrityAt = performance.now();
    assertWorldIntegrity(world);
    const integrityMs = ms(integrityAt);
    const serializeAt = performance.now();
    const payload = serializeWorld(world);
    steps.push({
      year,
      advanceMs,
      integrityMs,
      serializeMs: ms(serializeAt),
      saveBytes: payload.length,
      ...sizes(world),
    });
  } else {
    steps.push({ year, advanceMs });
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
