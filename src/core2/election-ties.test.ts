/**
 * A tie decided by the legislature in joint session (the statewide offices
 * of 47 states): every member who votes is a person with their own recorded
 * views, filled in the moment they decide, never their party's side standing
 * in for them (SG-GOV-tie-named-member-lean).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { filingWindowOpens } from "./modules/candidacy";
import type { ModuleRow } from "./module-data";
import { officialOf } from "./modules/officials";
import { breakElectionTie, type TieRow } from "./election-ties";
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`election-ties:${Date.now()}`).digest("hex");
const rules = (
  tieRules as unknown as {
    states: Record<string, Record<string, { method: string }>>;
  }
).states;
const DRAWS = 12;

describe("a tie decided by the legislature", () => {
  it("is voted by members who are persons with recorded views", () => {
    // A drawn place in a state whose law has the legislature decide, opened as
    // the game opens a world (`buildBenchWorld`), with its next statewide
    // race's ballot made by the candidacy engine's own play: the world is
    // opened the day before that race's filing window and played two days,
    // so the filers are the people who chose to run. The draw walks on,
    // naming each place passed over, until a race has two on its ballot.
    setBookkeeping(false);
    const passed: string[] = [];
    for (let n = 0; n < DRAWS; n += 1) {
      const place = drawPlace(n === 0 ? seed : `${seed}:${n}`, "election-ties");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      if (
        rules[place.state]?.["statewideExecutiveTie"]?.method !==
        "legislature-decides"
      ) {
        passed.push(`${where}: its legislature does not decide a tie`);
        continue;
      }
      const opening = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const first = coreAPI(opening.core);
      const statewide = (
        first
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      )
        .filter((c) => c.family === "statewideExecutive")
        .map((c) => ({ id: c.id, opens: filingWindowOpens(first, c) }))
        .filter((c) => c.opens > opening.core.date)
        .sort((a, b) => a.opens.localeCompare(b.opens))[0];
      if (!statewide) {
        passed.push(`${where}: no statewide race ahead`);
        continue;
      }
      const { core } = buildBenchWorld(
        place.seed,
        addDays(makeIsoDate(statewide.opens), -1),
        { twoLevel: true, placeKey: place.key },
      );
      advanceCore(core, addDays(makeIsoDate(statewide.opens), 1));
      const api = coreAPI(core);
      const key = place.key;
      const state = place.state;
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
      if (!contest) {
        passed.push(
          `${where}: no statewide race with two on its ballot by ${core.date}`,
        );
        continue;
      }
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
      process.stdout.write(
        `election-ties ${state} ${key} seed ${seed.slice(0, 12)} ${contest.id}: ${members.length} members voted; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a statewide race on the ballot (seed ${seed}): ${passed.join("; ")}`,
    );
  }, 1_200_000);
});
