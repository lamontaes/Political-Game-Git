/**
 * A primary's count does not close the race for its winner
 * (play-campaign-shows-last-years-finished-race): after the party primary is
 * counted, the nominee's race is still live for the general, with the day's
 * campaign choices, and the candidate it knocked out is not. Places are drawn
 * from all 56 until one has a party primary with two filers from one party;
 * the ones passed over are named.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import {
  openParties,
  partiesHere,
  type TieRow,
  PARTIES_MODULE_ID,
} from "./modules/parties";
import { holdPrimary, openVoting, resultOf } from "./modules/voting";
import { campaignDayChoices, raceLive } from "./campaign-day";
import { drawPlace } from "../../scripts/core2-year/place";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`race-live-primary:${Date.now()}`).digest("hex");
const PLACES = 12;

it("after a primary is counted its nominee's race stays live for the general and the loser's does not", () => {
  const passed: string[] = [];
  for (let n = 0; n < PLACES; n++) {
    const place = drawPlace(runSeed, `race-live-primary:${n}`);
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    process.stdout.write(`race-live-primary: ${where}\n`);
    const core = createLifeCore(
      buildPopulation({
        seed: place.seed,
        placeKey: place.key,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openOffices(core, place.seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const parties = partiesHere(api).filter((p) => p.side !== 0);
    if (!parties.length) {
      passed.push(`${where}: no parties`);
      continue;
    }
    const ties = api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .rows() as unknown as TieRow[];
    let found = false;
    for (const party of parties) {
      const members = ties
        .filter((t) => t.partyId === party.id)
        .map((t) => core.people.get(t.personId)!)
        .filter(
          (p) =>
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
        )
        .sort((a, b) => b.liquidMinor - a.liquidMinor);
      for (const contest of openContests(api).filter(
        (c) => c.primaryDate && c.primaryDate > START,
      )) {
        const filed: FilingRow[] = [];
        for (const m of members.slice(0, 2)) {
          const r = fileCandidacy(api, {
            personId: m.id,
            contestId: contest.id,
            platform: [`${PLATFORM_QUESTIONS[0]}=${party.side > 0 ? 1 : -1}`],
            party: party.name,
          });
          if (r.status === "refused") break;
          if (["petitioning", "on-ballot"].includes(r.filing.status ?? ""))
            filed.push(r.filing);
        }
        if (filed.length < 2) continue;
        holdPrimary(api, contest.id);
        const table = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
        const after = filed.map((f) => table.get(f.id) as unknown as FilingRow);
        const winner = after.find((f) => f.status !== "withdrawn");
        const loser = after.find((f) => f.status === "withdrawn");
        const note = `${where}; contest ${contest.id}`;
        expect(winner, `a nominee is left: ${note}`).toBeTruthy();
        expect(loser, `a loser is out: ${note}`).toBeTruthy();
        expect(
          resultOf(api, contest.id),
          `the primary is not the contest's count: ${note}`,
        ).toBeNull();
        expect(raceLive(api, winner!), `nominee live: ${note}`).toBe(true);
        expect(raceLive(api, loser!), `loser not live: ${note}`).toBe(false);
        core.playerId = winner!.personId;
        expect(
          campaignDayChoices(api, winner!.id).length,
          `nominee keeps the day's choices: ${note}`,
        ).toBeGreaterThan(0);
        found = true;
        break;
      }
      if (found) break;
    }
    if (found) return;
    passed.push(`${where}: no primary with two filers of one party`);
  }
  throw new Error(`no primary in ${PLACES} places: ${passed.join(" | ")}`);
}, 600_000);
