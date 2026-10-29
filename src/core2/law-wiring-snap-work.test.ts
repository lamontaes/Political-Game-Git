/**
 * SNAP receipt that a law moves reaches what a household eats, in a played
 * world: a place drawn from all 56 on a seed nobody chose, the bench world
 * with every module installed, built twice from the same seed. In one, the
 * state puts the work requirement for assistance in force; the other is the
 * control. The benefit engine stops a head the requirement reaches after
 * their months (runFoodAid), and the household's monthly purchases (settle in
 * cost-of-living.ts) buy its everyday plan from what its members hold, so a
 * household that lost its benefit buys less of its plan, or, where it still
 * pays the same share, its members hold less money. The research link
 * from SNAP receipt into food insecurity is carried by these two engines, and
 * the web does not run it (snap-to-food-insecurity, links.json carriedBy).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { rowsOf } from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import type { LawRowInput } from "./laws-starting";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.SNAP_WORK_SEED || randomBytes(20).toString("hex");
const ASSIST_WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";
const FOOD_AID = "snap-baseline";
const LINK = "snap-to-food-insecurity";
/** The time limit is three months of benefit; five months of reviews and purchases show who it stopped. */
const DAYS = 150;
const TRIES = 10;

interface Taken {
  readonly id: string;
  readonly key: string;
  readonly recipientId: string;
  readonly stoppedOn?: string;
}

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);

/** Puts the requirement out of force at every level that says yes, or in force at the state. */
function setRequirement(api: CoreAPI, value: 0 | 1, tag: string): void {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  if (value === 0) {
    for (const { level, jurisdiction } of lawChain(api).levels) {
      const latest = (
        laws.query("bySeries", [
          jurisdiction,
          ASSIST_WORK,
        ]) as unknown as LawRowInput[]
      )
        .filter((r) => r.effectiveDate <= api.state.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      if (latest?.value !== 1) continue;
      enactLaw(api, {
        jurisdiction,
        level,
        series: ASSIST_WORK,
        value: 0,
        effectiveDate: tomorrow(api),
        measureId: `snap-work-${tag}`,
        citation: "SNAP work test: the requirement off",
      });
    }
    return;
  }
  const state = lawChain(api).levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: state.jurisdiction,
    level: "state",
    series: ASSIST_WORK,
    value: 1,
    effectiveDate: tomorrow(api),
    measureId: `snap-work-${tag}`,
    citation: "SNAP work test: the requirement on",
  });
}

function play(drawn: ReturnType<typeof drawPlace>, requirement: boolean) {
  const core = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core as CoreState;
  const api = coreAPI(core);
  if (!lawInForce(api, "snap-maximum").value) return null;
  // The starting answer is repealed in both worlds, so the requirement is a change from no law.
  setRequirement(api, 0, "open");
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  if (requirement) setRequirement(api, 1, "on");
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  return core;
}

describe("SNAP receipt a law moves reaches what a household buys", () => {
  it(
    `a household whose head the work requirement stopped buys less of its plan or holds less money (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-snap-work:${attempt}`);
          const lawWorld = play(drawn, true);
          if (!lawWorld) {
            passed.push(`${drawn.name}, ${drawn.state}: no SNAP in force`);
            continue;
          }
          const stopped = rowsOf<Taken>(coreAPI(lawWorld), "taken").filter(
            (r) => r.key === `limit|${FOOD_AID}`,
          );
          // The named heads' households: the counted ones buy as groups.
          const homes = new Map<string, Taken>();
          for (const row of stopped) {
            const home = lawWorld.people.get(row.recipientId)?.householdId;
            if (home) homes.set(home, row);
          }
          if (!homes.size) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${stopped.length} heads stopped, none named`,
            );
            continue;
          }
          const control = play(drawn, false)!;
          // A stopped head's household, on the same purchase day in both
          // worlds: without the benefit it pays less toward the same plan, or,
          // where it pays the same share, its members hold less money than in
          // the control world, the benefit it no longer receives.
          const holdings = (core: CoreState, home: string) =>
            (lawWorld.households.get(home)?.memberIds ?? []).reduce(
              (sum, id) => sum + (core.people.get(id)?.liquidMinor ?? 0),
              0,
            );
          const reached = [...homes].flatMap(([home, row]) => {
            const withLaw = lawWorld.finance.livingPlans.get(home);
            const without = control.finance.livingPlans.get(home);
            if (!withLaw?.lastAt || withLaw.lastAt !== without?.lastAt)
              return [];
            const share = withLaw.lastPaidMinor / withLaw.lastRequestedMinor;
            const base = without.lastPaidMinor / without.lastRequestedMinor;
            if (share < base) return [{ home, row, how: "bought less" }];
            const held = holdings(lawWorld, home);
            const heldBase = holdings(control, home);
            return share === base && held < heldBase
              ? [
                  {
                    home,
                    row,
                    how: `paid the same share, its members holding ${held} against ${heldBase}`,
                  },
                ]
              : [];
          });
          if (!reached.length) {
            passed.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${homes.size} named households lost SNAP, none bought less or held less`,
            );
            continue;
          }
          // The web leaves the carried link alone.
          const months = coreAPI(lawWorld)
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("months")
            .rows() as unknown as WebMonth[];
          expect(
            months.some((m) => m.effects[LINK] !== undefined),
            "the web ran the carried SNAP receipt link",
          ).toBe(false);
          const { home, row, how } = reached[0]!;
          const withLaw = lawWorld.finance.livingPlans.get(home)!;
          const without = control.finance.livingPlans.get(home)!;
          process.stdout.write(
            `SNAP-WORK (SNAP_WORK_SEED=${seed}) ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): ${stopped.length} heads stopped (${row.id}, ${row.recipientId} on ${row.stoppedOn ?? "?"}), ${homes.size} named households, ${reached.length} reached; ${home} on ${withLaw.lastAt} ${how}: paid ${withLaw.lastPaidMinor} of ${withLaw.lastRequestedMinor} against ${without.lastPaidMinor} of ${without.lastRequestedMinor} in the control world. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place showed a household that lost SNAP buying less or holding less: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
