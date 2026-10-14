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
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`special:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("special elections", () => {
  it("a vacancy's special election is a real race whose winner serves out the term", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
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

  it("a seat beyond the town gets its special too, voted by its own district", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const state = pick(states, `elsewhere-state:${attempt}`);
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `elsewhere-place:${attempt}`).key;
      const core = createLifeCore(
        buildPopulation({
          seed: `${seed}:elsewhere:${attempt}`,
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
      const offices = api.moduleState(OFFICES_MODULE_ID);
      // A legislative seat elsewhere in the state whose law calls a special.
      const target = (
        offices.table("seats").rows() as unknown as {
          id: string;
          officeId: string;
          coversTown: boolean;
        }[]
      )
        .filter((seat) => !seat.coversTown)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((seat) => ({
          seat,
          office: offices.table("offices").get(seat.officeId) as unknown as {
            elected: boolean;
            kind: string;
            vacancyRule: { method: string };
          },
          holder: offices
            .table("terms")
            .query("bySeatStatus", [seat.id, "serving"])[0] as unknown as
            TermRow | undefined,
        }))
        .find(
          (s) =>
            s.holder &&
            s.office.elected &&
            /^legislature-|^us-house/.test(s.office.kind) &&
            /special/.test(s.office.vacancyRule.method),
        );
      if (!target) continue;
      const where = `seed ${seed}:elsewhere:${attempt}, ${state} place ${key}, ${target.seat.id}`;
      const vacancy = vacateSeat(api, target.seat.id, "resignation")!;
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
      // The town's people don't vote for a seat that isn't theirs.
      expect(result!.namedEligible, where).toBe(0);
      expect(result!.countedEligible, where).toBe(0);
      if (result!.winnerId) {
        const seated = offices
          .table("terms")
          .query("bySeatStatus", [target.seat.id, "serving"])[0] as unknown as
          TermRow | undefined;
        expect(seated?.reached, where).toMatch(/special election/);
      }
      govReport(
        "special-elections",
        JSON.stringify({
          where,
          election: contest!.electionDate,
          totals: result!.totals,
          winner: result!.winnerId,
        }),
      );
      return;
    }
    throw new Error(
      `no seat beyond the town with a special-election rule in twelve draws (seed ${seed})`,
    );
  }, 900_000);
});
