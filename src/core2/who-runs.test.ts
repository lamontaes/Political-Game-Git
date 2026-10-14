/**
 * M2-04 wired: who runs in the town's own races. Ahead of a local race's
 * filing deadline, each eligible resident decides through PEOPLE's candidacy
 * chooser from their own record; everyone who files does so from a recorded
 * decision with its reasons.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { DEFAULT_DATA } from "./data";
import { peopleData, peopleModules } from "../director/play-modules";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { coreAPI } from "./state";
import { lawChain } from "./modules/laws";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
} from "./modules/elections";
import {
  CANDIDACY_MODULE_ID,
  CANDIDACY_PARAMETERS,
  candidatesFor,
} from "./modules/candidacy";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`who-runs:${Date.now()}`).digest("hex");

const START = "2026-01-05";
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("who runs in the town's races", () => {
  it("residents decide from their own records, and each resident filing traces to a decision", () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `place:${attempt}`).key;
      // PEOPLE's engines, as a played world installs them.
      const core = createLifeCore(
        buildPopulation({
          seed: `${seed}:${attempt}`,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
        { data: peopleData(DEFAULT_DATA), modules: peopleModules() },
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      const api = coreAPI(core);
      expect(core.modules.has(CANDIDACY_MODULE_ID)).toBe(true);
      const where = `${core.placeMetadata.placeName}, ${lawChain(api).stateKey} (seed ${seed}:${attempt}, place ${key})`;
      const lead = CANDIDACY_PARAMETERS.candidacyDecisionLeadDays!.value;
      const contest = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      )
        .filter(
          (c) =>
            ["city", "county", "township"].includes(c.level) &&
            c.filingDeadline > core.date &&
            Date.parse(c.filingDeadline) - Date.parse(core.date) <
              (lead + 400) * 86_400_000,
        )
        .sort((a, b) => a.filingDeadline.localeCompare(b.filingDeadline))[0];
      if (!contest) continue;
      const decideOn = new Date(
        Math.max(
          Date.parse(contest.filingDeadline) - lead * 86_400_000,
          Date.parse(core.date),
        ) + 86_400_000,
      )
        .toISOString()
        .slice(0, 10);
      advanceCore(core, decideOn);
      const decisions = api
        .moduleState(CANDIDACY_MODULE_ID)
        .table("decisions")
        .rows() as unknown as {
        contestId: string;
        personId: string;
        run: boolean;
        reasons: Record<string, number>;
      }[];
      const here = decisions.filter((d) => d.contestId === contest.id);
      expect(here.length, `${where}: nobody decided`).toBeGreaterThan(0);
      for (const d of here)
        expect(Object.keys(d.reasons).length, where).toBeGreaterThan(0);
      const running = new Set(
        candidatesFor(api, contest.id).map((d) => d.personId),
      );
      for (const f of ballot(api, contest.id))
        if (core.people.has(f.personId) && f.personId !== core.playerId)
          expect(running.has(f.personId), `${where} ${f.personId}`).toBe(true);
      govReport(
        "who-runs",
        JSON.stringify({
          where,
          contest: contest.title,
          deadline: contest.filingDeadline,
          decided: here.length,
          running: running.size,
          onBallot: ballot(api, contest.id).length,
        }),
      );
      return;
    }
    throw new Error(`no local race within reach in six draws (seed ${seed})`);
  }, 900_000);
});
