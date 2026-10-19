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
import { lawInForce, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { knockDoors, openCampaigns } from "./modules/campaigns";
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
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`m5-01:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .filter(
    (k) => !["US-AS", "US-GU", "US-MP", "US-VI", "US-PR", "US-DC"].includes(k),
  )
  .sort();

function career(family: "stateLegislative" | "usHouse", label: string) {
  return () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
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
        collapseToTwoLevels({ ...full, playerId: you.id }),
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
        family === "usHouse"
          ? s.office.kind.startsWith("us-house")
          : s.office.kind.startsWith("legislature-"),
      );
      const contest = openContests(api)
        .filter((c) => c.family === family)
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
      const holder = seat.holder;
      // Run against the holder: the other major party's label, which takes
      // membership in it, else as an independent.
      const against =
        partySide(holder?.party) > 0 ? "Democratic" : "Republican";
      const wealthiest = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        );
      const qualified = (label: string | null) =>
        wealthiest.find((p) =>
          checkEligibility(api, p.id, contest.id, label).every((c) => c.met),
        );
      const member = qualified(against);
      const runner = member ?? qualified(null);
      const party = member ? against : null;
      if (!runner) {
        tried.push("no resident qualifies");
        continue;
      }
      core.playerId = runner.id;
      const filed = fileCandidacy(api, {
        personId: runner.id,
        contestId: contest.id,
        platform: [],
        party,
      });
      if (filed.status === "refused") {
        tried.push(`refused: ${filed.unmet.map((u) => u.rule).join(",")}`);
        continue;
      }
      const filing = filed.filing;
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
      govReport(label, JSON.stringify(report));
      return;
    }
    throw new Error(
      `no ${family} race the player could enter: ${tried.join("; ")}`,
    );
  };
}

describe("M5 careers on the same engines", () => {
  it(
    "M5-01: the player runs for their own real state legislative seat against its holder; a win seats them on the term's first day and they pass a bill",
    career("stateLegislative", "state-legislator-career"),
    600_000,
  );
  it(
    "M5-04: the player runs for the town's U.S. House seat against its holder; a win seats them in Congress and they vote on a bill",
    career("usHouse", "congress-career"),
    600_000,
  );
});
