/**
 * A tie decided by the legislature in joint session (the statewide offices
 * of 47 states): every member who votes is a person with their own recorded
 * views, filled in the moment they decide, never their party's side standing
 * in for them (SG-GOV-tie-named-member-lean).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import {
  OFFICES_MODULE_ID,
  openOffices,
  type TermRow,
} from "./modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import type { ModuleRow } from "./module-data";
import { officialOf, openOfficials } from "./modules/officials";
import { breakElectionTie, type TieRow } from "./election-ties";
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-10-20";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`election-ties:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const rules = (
  tieRules as unknown as {
    states: Record<string, Record<string, { method: string }>>;
  }
).states;
// The 56 places, drawn until the state's law has its legislature decide.
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) =>
      rules[k]?.["statewideExecutiveTie"]?.method === "legislature-decides",
  )
  .sort();

describe("a tie decided by the legislature", () => {
  it("is voted by members who are persons with recorded views", () => {
    // Draw a state whose law has the legislature decide and which has a
    // statewide race on the ballot at the start; the draw walks on until one does.
    for (let n = 0; n < 30; n += 1) {
      const state = pick(states, `state:${n}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `place:${n}`).key;
      const full = buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 200,
      });
      const player = [...full.people]
        .filter(
          (p) =>
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0]!;
      const core = createLifeCore(
        collapseToTwoLevels({ ...full, playerId: player.id }),
      );
      openLaws(core);
      openOffices(core, seed);
      openOfficials(core);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      const api = coreAPI(core);
      const contest = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).find(
        (c) =>
          c.family === "statewideExecutive" &&
          c.electionDate > api.state.date &&
          ballot(api, c.id).length >= 2,
      );
      if (!contest) continue;
      const tied = ballot(api, contest.id)
        .slice(0, 2)
        .map((f) => f.personId);
      // A legislator seated since the opening (a race's winner, an appointee)
      // is a term with no person yet: three of them are read for the first
      // time by the tie.
      const termTable = api.moduleState(OFFICES_MODULE_ID).table("terms");
      const unread = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .rows() as unknown as { id: string; kind: string }[]
      )
        .filter((o) => o.kind.startsWith("legislature-"))
        .flatMap((o) =>
          (
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("seats")
              .query("byOffice", [o.id]) as unknown as { id: string }[]
          ).flatMap(
            (s) =>
              termTable.query("bySeatStatus", [
                s.id,
                "serving",
              ]) as unknown as TermRow[],
          ),
        )
        .slice(0, 3);
      for (const term of unread)
        termTable.put({ ...term, personId: null } as unknown as ModuleRow);
      expect(unread.length, `${state} ${key}`).toBe(3);
      breakElectionTie(api, contest, tied, () => undefined);
      const row = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("ties")
        .get(`tie:${contest.id}`) as unknown as TieRow;
      expect(row.method, state).toBe("legislature-decides");
      const members = Object.keys(row.votes ?? {});
      expect(members.length, `${state} ${key}: members voted`).toBeGreaterThan(
        1,
      );
      const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
      // The three read for the first time still voted, as persons.
      for (const term of unread)
        expect(row.votes?.[term.id], term.id).toBeDefined();
      for (const termId of members.filter(
        (id) => !unread.some((u) => u.id === id),
      )) {
        const term = terms.get(termId) as unknown as TermRow;
        // Seated as a person with a record of views, not left as a party side.
        expect(term.personId, termId).toBeTruthy();
        expect(api.state.people.has(term.personId!), termId).toBe(true);
        expect(officialOf(api, term.personId!), termId).toBeDefined();
      }
      expect(api.state.stopgapHits.has("SG-GOV-tie-named-member-lean")).toBe(
        false,
      );
      console.info(
        `election-ties ${state} ${key} seed ${seed.slice(0, 12)} ${contest.id}: ${members.length} members voted`,
      );
      return;
    }
    throw new Error("no drawn state had a statewide race on the ballot");
  }, 600_000);
});
