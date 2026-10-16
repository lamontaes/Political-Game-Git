/**
 * A state's tie rule that depends on the race's size reads the statute's own
 * line from the state's row (SG-GOV-tie-race-size): at or below the line the
 * small-race method settles the tie, above it the state's usual method. The
 * states with such a rule come from the data, not from this file; the place
 * is drawn from the first of them and printed with the seed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import { openOfficials } from "./modules/officials";
import { breakElectionTie, ruleField, type TieRow } from "./election-ties";
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { searchCorePlaces } from "./place-lookup";

interface SizeRule {
  readonly method: string;
  readonly smallRace?: {
    readonly method: string;
    readonly atOrBelowVotes: number;
  };
}
const rules = (
  tieRules as unknown as { states: Record<string, Record<string, SizeRule>> }
).states;

const START = "2026-10-20";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`tie-race-size:${Date.now()}`).digest("hex");
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

const sizeStates = Object.entries(rules)
  .filter(([, fields]) =>
    Object.values(fields).some((rule) => rule.smallRace !== undefined),
  )
  .map(([state]) => state)
  .sort();

describe("a tie rule that depends on the size of the race", () => {
  it("names the statute's own line in every state's row", () => {
    expect(sizeStates.length).toBeGreaterThan(0);
    for (const state of sizeStates)
      for (const [field, rule] of Object.entries(rules[state]!))
        if (rule.smallRace)
          expect(
            Number.isFinite(rule.smallRace.atOrBelowVotes) &&
              rule.smallRace.atOrBelowVotes > 0,
            `${state} ${field}`,
          ).toBe(true);
  });

  it("settles a tie by the small-race method at or below the line and by the usual method above it", () => {
    for (let n = 0; n < 30; n += 1) {
      const state = pick(sizeStates, `state:${n}`);
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
          c.electionDate > api.state.date &&
          ballot(api, c.id).length >= 1 &&
          rules[state]?.[ruleField(c)]?.smallRace !== undefined,
      );
      if (!contest) continue;
      const rule = rules[state]![ruleField(contest)]!;
      const line = rule.smallRace!.atOrBelowVotes;
      // At the start most races have one filer; the tie needs two names, so
      // the player stands in as the other (only the rule is under test).
      const tied = [ballot(api, contest.id)[0]!.personId, player.id];
      const methodAt = (votes: number) => {
        breakElectionTie(api, contest, tied, () => undefined, votes);
        return (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("ties")
            .get(`tie:${contest.id}`) as unknown as TieRow
        ).method;
      };
      const where = `${state} ${key} seed ${seed.slice(0, 12)} ${contest.id}`;
      expect(methodAt(line), `${where}: at the line`).toBe(
        rule.smallRace!.method,
      );
      expect(methodAt(line + 1), `${where}: one vote over`).toBe(rule.method);
      console.info(`tie-race-size ${where}: line ${line}`);
      return;
    }
    throw new Error(`no drawn place had a contest under a size rule; ${seed}`);
  }, 600_000);
});
