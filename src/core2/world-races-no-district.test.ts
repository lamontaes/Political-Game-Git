/**
 * A town that sits in no state legislative district still has its state's
 * legislative seats elected (gov-state-races-where-town-matches-no-district):
 * every seat the town does not cover is counted by the world races at the
 * coarser level, so an unmatched town's chambers turn over like any other.
 * A place drawn from the towns the district files do not place in any
 * district, any state; a seed nobody chose.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import { openLegislature } from "./modules/legislature";
import { openWorldRaces, racesOf } from "./modules/world-races";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";
import { placeDistrictJoin } from "../districts/place-membership";

const START = "2026-10-20";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("an unmatched town's state legislature is elected in the world races", () => {
  // Every locality the district files place in no district of either chamber,
  // in a state whose files place other towns: a territory with no district
  // files elects its legislature at large, so every town is covered there.
  const unmatched = corePlaceStateIdentities()
    .flatMap((state) => {
      const localities = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "locality",
        }),
      ];
      const unplaced = (place: (typeof localities)[number]) =>
        (["state-lower", "state-upper"] as const).every(
          (chamber) =>
            placeDistrictJoin(place.sourceGeoid ?? place.key, chamber, START)
              .kind === "unknown",
        );
      const missing = localities.filter(unplaced);
      if (missing.length === localities.length) return [];
      return missing.map((place) => ({
        state: state.jurisdictionKey,
        key: place.key,
      }));
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  expect(unmatched.length).toBeGreaterThan(0);
  const hash = createHash("sha256").update(`${seed}:unmatched`).digest("hex");
  const pick = unmatched[parseInt(hash.slice(0, 8), 16) % unmatched.length]!;
  const where = `${pick.state} place ${pick.key}, seed ${seed}`;
  const core = createLifeCore(
    buildPopulation({
      seed,
      placeKey: pick.key,
      startedAt: START,
      minimumPeople: 120,
    }),
  );
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openLegislature(core);
  openWorldRaces(core);
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const seats = offices.table("seats").rows() as unknown as {
    id: string;
    officeId: string;
    coversTown: boolean;
    electionYear?: number;
  }[];
  const legislative = new Set(
    (
      offices.table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    )
      .filter((o) => o.kind.startsWith("legislature-"))
      .map((o) => o.id),
  );
  const stateSeats = seats.filter((s) => legislative.has(s.officeId));
  // The town is in no district: no legislative seat covers it.
  expect(stateSeats.length, where).toBeGreaterThan(0);
  expect(stateSeats.filter((s) => s.coversTown).length, where).toBe(0);
  // Two Novembers, so an odd-year legislature is counted too.
  advanceCore(core, "2027-12-01");
  const races = racesOf(api).filter((r) => r.office.startsWith("legislature-"));
  const due = stateSeats.filter(
    (s) => s.electionYear === 2026 || s.electionYear === 2027,
  );
  expect(due.length, where).toBeGreaterThan(0);
  const raced = new Set(races.map((r) => r.seatId));
  for (const s of due)
    expect(raced.has(s.id), `${where}: ${s.id} had no race`).toBe(true);
  for (const r of races) {
    expect(r.reasons?.length, `${where}: ${r.id}`).toBe(2);
    expect(r.winnerParty, `${where}: ${r.id}`).toBeTruthy();
  }
}, 900_000);
