// @vitest-environment node
/**
 * Governor running mates (gov-governor-running-mates): where the law elects
 * the lieutenant governor on one ticket with the governor, each governor
 * candidate in the town's own state runs with a running mate, named when the
 * state's law joins the ticket (data/research/offices/state-offices.json,
 * ticketJoins), and the office's count is the governor's, so the ticket wins
 * or loses together. One drawn place in a state of each stage, named with
 * its seed; a player running for governor picks a running mate or takes the
 * world's pick (owner, Nov 14).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import {
  governorTicketStage,
  openOffices,
  type GovernorTicketStage,
} from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  announce,
  ballot,
  filledByTickets,
  openElections,
  runningMateOf,
  ticketOfficeContest,
  ticketStageOf,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  chooseRunningMate,
  fileStandingCandidates,
  formTickets,
  holdElection,
  holdPrimary,
  openVoting,
  resultOf,
  runningMateChoice,
} from "./modules/voting";
import { openOfficials } from "./modules/officials";
import type { ModuleRow } from "./module-data";
import type { CoreAPI } from "./types";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import stateOffices from "../../data/research/offices/state-offices.json" with { type: "json" };

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`running-mates:${Date.now()}`).digest("hex");
process.stdout.write(`running-mates: seed ${seed}\n`);
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const STAGES: readonly GovernorTicketStage[] = [
  "at-filing",
  "after-primary",
  "separate-primary",
];

function world(state: string) {
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const key = pick(places, `place:${state}`).key;
  const full = buildPopulation({
    seed,
    placeKey: key,
    startedAt: START,
    minimumPeople: 120,
  });
  const player = [...full.people]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
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
  return { api: coreAPI(core), key, playerId: player.id };
}

function governorContest(api: CoreAPI): ContestRow | null {
  return (
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter((c) => !c.special && /:governor$/.test(c.officeId))
      .sort((a, b) => a.electionDate.localeCompare(b.electionDate))[0] ?? null
  );
}

describe("governor running mates", () => {
  it("every place the law elects on the governor's ticket says when its ticket forms", () => {
    const counts: Record<string, number> = {};
    for (const [stateKey, place] of Object.entries(
      (
        stateOffices as unknown as {
          places: Record<
            string,
            {
              executives?: {
                key: string;
                electedWithGovernorOnTicket?: boolean;
                ticketJoins?: { stage: string };
              }[];
            }
          >;
        }
      ).places,
    ))
      for (const e of place.executives ?? [])
        if (e.electedWithGovernorOnTicket) {
          expect(e.ticketJoins?.stage, `${stateKey} ${e.key}`).toBeDefined();
          expect(governorTicketStage(stateKey, e.key)).toBe(
            e.ticketJoins!.stage,
          );
          counts[e.ticketJoins!.stage] =
            (counts[e.ticketJoins!.stage] ?? 0) + 1;
        }
    // Ballotpedia's 2026 count (7 before the primary, 8 after it, 6 in a
    // separate primary) plus the states and territories not electing in 2026.
    expect(counts).toEqual({
      "at-filing": 15,
      "after-primary": 10,
      "separate-primary": 6,
    });
  });

  for (const stage of STAGES)
    it(
      `a governor's ticket files, counts and wins together (${stage})`,
      { timeout: 120_000 },
      () => {
        const state = pick(
          states.filter(
            (s) => governorTicketStage(s, "lieutenant-governor") === stage,
          ),
          `state:${stage}`,
        );
        const { api, key, playerId } = world(state);
        const where = `${stage}: ${state} ${key}, seed ${seed}`;
        const governor = governorContest(api);
        expect(governor, where).not.toBeNull();
        const ticket = ticketOfficeContest(api, governor!);
        expect(ticket, where).not.toBeNull();
        expect(ticketStageOf(api, ticket!)).toBe(stage);
        expect(filledByTickets(api, ticket!)).toBe(
          stage !== "separate-primary",
        );
        const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
        // The player files for governor under a major party (a fixture: the
        // clerk's own rules are the filing engine's tests).
        const party = ballot(api, governor!.id)[0]?.party ?? "Democratic";
        const own: FilingRow = {
          id: `filing:${governor!.id}:${playerId}`,
          contestId: governor!.id,
          personId: playerId,
          filedOn: api.state.date,
          filedWith: "the state's filing officer",
          platform: [],
          party,
          status: "on-ballot",
        };
        filings.put(own as unknown as ModuleRow);
        announce(api, own, governor!);
        fileStandingCandidates(api, governor!.id);
        fileStandingCandidates(api, ticket!.id);
        const mates = () =>
          ballot(api, governor!.id).map(
            (f) => [f, runningMateOf(api, f, ticket!)] as const,
          );
        // The player names their own running mate: never named for them at
        // filing (where the office wins a primary of its own, the party's one
        // nominee joins the party's one governor candidate).
        if (stage !== "separate-primary")
          expect(runningMateOf(api, own, ticket!), where).toBeNull();
        const choice = runningMateChoice(api, own.id)!;
        expect(choice.ticketContestId).toBe(ticket!.id);
        if (stage === "at-filing") {
          // Each other candidate filed with a running mate of their party.
          for (const [f, mate] of mates())
            if (f.personId !== playerId) {
              expect(mate, `${where}: ${f.id}`).not.toBeNull();
              expect(mate!.party).toBe(f.party ?? null);
            }
          expect(choice.choices.length, where).toBeGreaterThanOrEqual(1);
          expect(choice.choices.length).toBeLessThanOrEqual(4);
          const picked = choice.choices.at(-1)!;
          const named = chooseRunningMate(api, own.id, picked.id);
          expect(named.personId).toBe(picked.id);
          expect(api.state.people.has(picked.id), where).toBe(true);
        } else {
          // Not the candidate's to name yet: after the primary, or the
          // office's own primary nominee joins.
          expect(choice.choices, where).toEqual([]);
          expect(() => chooseRunningMate(api, own.id, null)).toThrow();
        }
        // Nobody filed for the office alone where the tickets fill it.
        if (stage !== "separate-primary")
          for (const f of ballot(api, ticket!.id))
            expect(f.ticketWith, `${where}: ${f.id}`).toBeTruthy();
        if (governor!.primaryDate) {
          holdPrimary(api, governor!.id);
          holdPrimary(api, ticket!.id);
        }
        formTickets(api, governor!, "election");
        // Every governor candidate on the ballot runs with exactly one running mate.
        for (const [f, mate] of mates()) {
          expect(mate, `${where}: ${f.id}`).not.toBeNull();
          expect(
            ballot(api, ticket!.id).filter((m) => m.ticketWith === f.id).length,
          ).toBe(1);
        }
        expect(ballot(api, ticket!.id).length).toBe(
          ballot(api, governor!.id).length,
        );
        const counted = holdElection(api, governor!.id);
        const decided = resultOf(api, ticket!.id);
        expect(decided, where).not.toBeNull();
        const mateOf = new Map(
          mates().map(([f, mate]) => [f.personId, mate!.personId]),
        );
        // One vote counts both: each ticket's votes, and the winner's running mate seated.
        for (const [governorId, mateId] of mateOf)
          expect(decided!.totals[mateId], `${where}: ${mateId}`).toBe(
            counted.totals[governorId],
          );
        expect(decided!.winnerCandidateId ?? null).toBe(
          counted.winnerCandidateId
            ? mateOf.get(counted.winnerCandidateId)
            : null,
        );
      },
    );
});
