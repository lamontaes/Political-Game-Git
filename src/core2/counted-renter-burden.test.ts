/**
 * Pool item world-counted-renter-income-puerto-rico-third: on day one the
 * counted renter households' median rent as a share of their income sits
 * within 10 points of the ACS median for the place (its state's where the
 * place's own estimate is too thin). Their income is what the records pay
 * them: recorded wages, retirement awards and the workers the opening named
 * as working outside the town's roles, each a whole worker at the place's
 * median earnings. Puerto Rico's place 7237336, whose renters once had a
 * third of their ACS income, is pinned.
 */
import { expect, it } from "vitest";
import burden from "../../data/research/housing/rent-burden-acs-2024.json" with { type: "json" };
import placeBurden from "../../data/research/housing/rent-burden-places-acs-2024-5yr.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { householdIncome, residentsRuntime } from "./modules/residents";
import type { CoreState } from "./types";

const PUERTO_RICO = {
  key: "7237336",
  state: "US-PR",
  name: "Puerto Rico place 7237336",
  seed: "63ef211a72f7f8d3519652d91152eaf5cda51a871ae2bed4e9221c537c7bd2f8",
};
const POINTS = 10;

/**
 * The sourced median rent as a percent of income: the place's own ACS
 * figure, else its state's, else (the island areas) the nation's. A place
 * the Census top-codes has a median of 50 percent or more.
 */
function sourced(
  key: string,
  state: string,
): { pct: number; atLeast: boolean; basis: string } {
  const own = (
    placeBurden.byPlace as Record<string, [number, number | string]>
  )[key];
  if (own)
    return { pct: own[0], atLeast: own[1] === "50+", basis: "the place's" };
  const usps = state.replace(/^US-/, "");
  const row = (
    burden.byState as Record<string, { medianRentShareOfIncomePct: number }>
  )[usps];
  return row
    ? {
        pct: row.medianRentShareOfIncomePct,
        atLeast: false,
        basis: `${usps}'s`,
      }
    : {
        pct: burden.national.medianRentShareOfIncomePct,
        atLeast: false,
        basis: "the nation's",
      };
}

/** Each counted renter household's rent a year over its income a year, on day one. */
function renterBurdens(core: CoreState): number[] {
  const rt = residentsRuntime(core)!;
  const out: number[] = [];
  for (const h of rt.store.liveHouseholds()) {
    const rent = rt.flows.get(`rent:${h.id}`);
    if (!rent || rent.endedAt) continue;
    const perYear =
      rent.cadence.kind === "months"
        ? 12 / rent.cadence.every
        : 365 / rent.cadence.every;
    const income = householdIncome(rt, h);
    out.push(
      income > 0
        ? (rent.amountMinor * perYear) / income
        : Number.POSITIVE_INFINITY,
    );
  }
  return out.sort((a, b) => a - b);
}

const built = (seed: string, key: string) =>
  renterBurdens(
    buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: key })
      .core as CoreState,
  );

function check(
  where: string,
  state: string,
  key: string,
  burdens: readonly number[],
): void {
  const median = burdens[Math.floor(burdens.length / 2)]! * 100;
  const target = sourced(key, state);
  process.stdout.write(
    `RENTER BURDEN ${where}: ${burdens.length} counted renter households, median ${median.toFixed(1)} percent against ${target.basis} ACS ${target.atLeast ? "50 or more" : target.pct} percent\n`,
  );
  expect(burdens.length, where).toBeGreaterThan(0);
  if (target.atLeast)
    expect(median, where).toBeGreaterThanOrEqual(target.pct - POINTS);
  else expect(Math.abs(median - target.pct), where).toBeLessThanOrEqual(POINTS);
}

it("Puerto Rico place 7237336: counted renters' median rent burden is within 10 points of the place's ACS median", () => {
  check(
    `${PUERTO_RICO.name} (${PUERTO_RICO.key}), seed ${PUERTO_RICO.seed}`,
    PUERTO_RICO.state,
    PUERTO_RICO.key,
    built(PUERTO_RICO.seed, PUERTO_RICO.key),
  );
  // About 60 seconds to build on a 4-core container.
}, 300_000);
