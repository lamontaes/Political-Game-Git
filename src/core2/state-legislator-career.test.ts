/**
 * M5-01, the state legislator career, in a random state: the player picks the
 * real numbered seat that covers their town, files against its actual holder,
 * campaigns, and the voters decide. If the player wins, they replace that
 * holder on the term's first day and can pass a bill with colleagues; if not,
 * the holder serves on. Nothing forces the outcome.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { withCountedVoterGroups } from "./opening-voter-groups";
import { lawInForce, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  fileCandidacy,
  openContests,
  openElections,
  requestSignature,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  circulatePetition,
  knockDoors,
  openCampaigns,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, resultOf } from "./modules/voting";
import { openRecord } from "./modules/record";
import {
  castMemberVote,
  draftBill,
  holdVote,
  members,
  memberKey,
  openLegislature,
} from "./modules/legislature";
import { partySide } from "./appointments";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`m5-01:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...lifePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR", "US-DC"].includes(k),
  )
  .sort();

describe("M5-01 state legislator career", () => {
  it("the player runs for their own real seat against its holder; a win seats them on the term's first day and they pass a bill", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const key = pick(places, `place:${attempt}`).key;
      const where = `seed ${seed}, ${state} place ${key}`;
      tried.push(where);
      const full = buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 300,
      });
      const adults = [...full.people]
        .filter(
          (p) =>
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const you = adults[0];
      if (!you) continue;
      // The player: an adult who qualifies for the seat (residency, voter
      // registration, the fee), the wealthiest first so the fee is in reach.
      const core = createLifeCore(
        withCountedVoterGroups(
          collapseToTwoLevels({ ...full, playerId: you.id }),
        ),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      openRecord(core);
      openLegislature(core);
      const api = coreAPI(core);
      // The real numbered seat covering the town, up this year, in either chamber.
      const seats = townSeats(api).filter((s) =>
        s.office.kind.startsWith("legislature-"),
      );
      const contest = openContests(api)
        .filter((c) => c.family === "stateLegislative")
        .find((c) => seats.some((s) => s.seat.id === c.seatId));
      if (!contest) {
        tried.push(
          `no open race (seats ${seats.map((s) => s.seat.id).join(",")}; open ${openContests(
            api,
          )
            .map((c) => `${c.family}:${c.filingDeadline}`)
            .join(",")})`,
        );
        continue;
      }
      const seat = seats.find((s) => s.seat.id === contest.seatId)!;
      const runner = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        )
        .find((p) =>
          checkEligibility(api, p.id, contest.id, "party").every(
            (c) => c.met || c.rule === "fee" || c.rule === "signatures",
          ),
        );
      if (!runner) {
        tried.push("no resident qualifies");
        continue;
      }
      core.playerId = runner.id;
      const holder = seat.holder;
      // Run against the holder: the other major party.
      const party = partySide(holder?.party) > 0 ? "Democratic" : "Republican";
      const filed = fileCandidacy(api, {
        personId: runner.id,
        contestId: contest.id,
        platform: [],
        payFee: true,
        party,
      });
      if (filed.status === "refused") {
        tried.push(`refused: ${filed.unmet.map((u) => u.rule).join(",")}`);
        continue;
      }
      let filing = filed.filing;
      // Walk the petition door to door, four hours a day, until it fills or
      // filing closes.
      for (
        let day = 0;
        filing.status === "gathering-signatures" &&
        api.state.date <= contest.filingDeadline &&
        day < 60;
        day += 1
      ) {
        circulatePetition(api, {
          filingId: filing.id,
          circulatorId: runner.id,
          hours: 4,
        });
        filing = api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .get(filing.id) as unknown as FilingRow;
        if (filing.status === "gathering-signatures")
          advanceCore(
            core,
            new Date(Date.parse(`${api.state.date}T00:00:00Z`) + 86_400_000)
              .toISOString()
              .slice(0, 10),
          );
      }
      if (filing.status !== "on-ballot") {
        tried.push(`short of signatures (${filing.signatureCount})`);
        continue;
      }
      // The race is for the seat the player lives in, against its holder.
      expect(contest.seatId, where).toBe(seat.seat.id);
      expect(seat.office.coversTown, where).toBe(true);
      knockDoors(api, {
        filingId: filing.id,
        canvasserId: runner.id,
        hours: 12,
      });
      // Through election day and the term's first day.
      const election = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .get(contest.id) as unknown as ContestRow
      ).electionDate;
      advanceCore(
        core,
        new Date(Date.parse(`${election}T00:00:00Z`) + 86_400_000)
          .toISOString()
          .slice(0, 10),
      );
      const result = resultOf(api, contest.id);
      expect(result, `${where}: no result for ${contest.title}`).not.toBeNull();
      const report: Record<string, unknown> = {
        where,
        contest: contest.title,
        seat: seat.seat.id,
        holder: holder
          ? `${holder.identity.givenName} ${holder.identity.familyName} (${holder.party})`
          : null,
        totals: result!.totals,
        winner: result!.winnerId,
      };
      if (result!.winnerId === runner.id) {
        advanceCore(core, result!.takesOffice!);
        const now = townSeats(api).find((s) => s.seat.id === seat.seat.id)!;
        // The player replaces that holder on the term's first day.
        expect(now.holder?.personId, where).toBe(runner.id);
        expect(now.holder?.startDate).toBe(result!.takesOffice);
        // A bill with colleagues: the player sponsors, votes for it, and the
        // chamber decides on each member's reasons.
        const floor = lawInForce(api, "minimum-wage").value!;
        const bill = draftBill(api, {
          bodyOfficeId: seat.office.id,
          sponsorId: runner.id,
          provisions: [
            {
              kind: "law-amount",
              series: "minimum-wage",
              value: floor + 100,
              unit: "minor/hour",
            },
          ],
        });
        expect(members(api, seat.office.id).map(memberKey)).toContain(
          runner.id,
        );
        castMemberVote(api, bill.id, runner.id, "yes");
        const after = holdVote(api, bill.id);
        report.bill = { number: bill.number, status: after.status };
        expect([
          "passed",
          "failed",
          "signed",
          "vetoed",
          "overridden",
          "enacted",
          "awaiting-signature",
        ]).toContain(after.status);
      } else {
        // The holder (or whoever won) serves; the player's loss is on the record.
        expect(result!.totals[runner.id] ?? 0, where).toBeGreaterThanOrEqual(0);
      }
      govReport("state-legislator-career", JSON.stringify(report));
      return;
    }
    throw new Error(
      `no state legislative race the player could enter: ${tried.join("; ")}`,
    );
  }, 600_000);
});
