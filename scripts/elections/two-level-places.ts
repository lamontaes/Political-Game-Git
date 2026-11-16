/**
 * Finds, for each seed named, the place src/core2/two-level-elections.test.ts
 * plays: the seed draws a state and then a place in it (the test's old
 * draw), and a place with no race of both parties on Nov 3, 2026 moves to
 * the next draw, up to eight. The test then names the seed, state and place
 * key and builds that place directly, with no draw at run time. Capped at
 * one hour; every place passed over is printed with why.
 *
 *   node --import tsx scripts/elections/two-level-places.ts <seed> [seed...]
 */
import { createHash } from "node:crypto";
import { buildPopulation } from "../../src/core2/population";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { collapseToTwoLevels } from "../../src/core2/residents";
import { openLaws } from "../../src/core2/modules/laws";
import { openOffices } from "../../src/core2/modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "../../src/core2/modules/elections";
import { openCampaigns } from "../../src/core2/modules/campaigns";
import { openParties } from "../../src/core2/modules/parties";
import { openVoting, resultOf } from "../../src/core2/modules/voting";
import { partySide } from "../../src/core2/appointments";
import {
  corePlaceStateIdentities,
  searchCorePlaces,
} from "../../src/core2/place-lookup";

const START = "2026-10-20";
const DRAWS = 8;
const CAP_MS = 60 * 60 * 1000;
const began = Date.now();

const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR", "US-DC"].includes(k),
  )
  .sort();

function pick<T>(seed: string, list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

/** The races of both parties decided on Nov 3, 2026 at one place. */
function partisanRaces(seed: string, key: string): number {
  const full = buildPopulation({
    seed,
    placeKey: key,
    startedAt: START,
    minimumPeople: 400,
  });
  const player = [...full.people]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const core = createLifeCore(
    collapseToTwoLevels({ ...full, playerId: player.id }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  const api = coreAPI(core);
  advanceCore(core, "2026-11-04");
  let partisan = 0;
  for (const contest of (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter((c) => c.electionDate === "2026-11-03")) {
    if (!resultOf(api, contest.id)) continue;
    const filings = ballot(api, contest.id);
    const sides = filings.map((f) => partySide(f.party ?? null));
    if (filings.length > 1 && sides.includes(1) && sides.includes(-1))
      partisan += 1;
  }
  return partisan;
}

for (const seed of process.argv.slice(2)) {
  let found = false;
  for (let draw = 0; draw < DRAWS && !found; draw += 1) {
    if (Date.now() - began > CAP_MS) {
      console.log(`stopped at the one-hour cap before ${seed} draw ${draw}`);
      process.exit(1);
    }
    const salt = (name: string) => (draw ? `${name}:${draw}` : name);
    const state = pick(seed, states, salt("state"));
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const place = pick(seed, places, salt("place"));
    const partisan = partisanRaces(seed, place.key);
    const line = `seed ${seed} draw ${draw}: ${place.displayName} ${state} ${place.key}`;
    if (partisan > 0) {
      console.log(`${line}: ${partisan} races of both parties (use)`);
      found = true;
    } else console.log(`${line}: no race of both parties (passed over)`);
  }
  if (!found) console.log(`seed ${seed}: no place in ${DRAWS} draws`);
}
