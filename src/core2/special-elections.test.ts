/**
 * A vacancy filled by special election is a real race: when a holder leaves
 * a seat whose law calls a special election, a contest opens for it; on the
 * day, the voters decide, and the winner takes the seat at once for the rest
 * of the unexpired term.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import {
  OFFICES_MODULE_ID,
  openOffices,
  townSeats,
  vacateSeat,
  type TermRow,
  type VacancyRow,
} from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, resultOf } from "./modules/voting";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`special:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("special elections", () => {
  it("a vacancy's special election is a real race whose winner serves out the term", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `place:${attempt}`).key;
      const core = createLifeCore(
        buildPopulation({
          seed: `${seed}:${attempt}`,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      const api = coreAPI(core);
      // A seat whose law calls a special election (a U.S. House seat, a
      // state legislative seat in many states, some local offices).
      const target = townSeats(api).find(
        (s) =>
          s.holder &&
          s.holder.personId !== core.playerId &&
          s.office.elected &&
          /special/.test(s.office.vacancyRule.method),
      );
      if (!target) continue;
      const where = `seed ${seed}:${attempt}, ${state} place ${key}, ${target.office.title}`;
      const holder = target.holder!;
      const vacancy = vacateSeat(api, target.seat.id, "resignation")!;
      expect(vacancy.status, where).toBe("awaiting-election");
      const contest = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).find((c) => c.special?.vacancyId === vacancy.id);
      expect(contest, `${where}: no special contest`).toBeTruthy();
      advanceCore(
        core,
        new Date(Date.parse(`${contest!.electionDate}T00:00:00Z`) + 86_400_000)
          .toISOString()
          .slice(0, 10),
      );
      const result = resultOf(api, contest!.id);
      expect(result, where).toBeTruthy();
      const seated = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [
            target.seat.id,
            "serving",
          ]) as unknown as TermRow[]
      )[0];
      if (result!.winnerId) {
        expect(seated?.reached, where).toMatch(/special election/);
        expect(seated?.endDate ?? null, where).toBe(holder.endDate ?? null);
        const filled = api
          .moduleState(OFFICES_MODULE_ID)
          .table("vacancies")
          .get(vacancy.id) as unknown as VacancyRow;
        expect(filled.status, where).toBe("filled");
      }
      govReport(
        "special-elections",
        JSON.stringify({
          where,
          rule: target.office.vacancyRule.method,
          election: contest!.electionDate,
          totals: result!.totals,
          winner: result!.winnerId,
          until: seated?.endDate,
        }),
      );
      return;
    }
    throw new Error(
      `no seat with a special-election rule in twelve draws (seed ${seed})`,
    );
  }, 900_000);
});
