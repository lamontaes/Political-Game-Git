import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import {
  CANDIDACY_MODULE_ID,
  type CandidacyDecision,
  type WeighedContest,
} from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { officialOf, raceLossesOf } from "./modules/officials";
import { coreAPI } from "./state";
import { partySide } from "./appointments";

// The standing pool in the world the owner plays: the bench world on a seed
// nobody chose, run from the opening through the 2026 general election and
// the day its winners take office. Statewide and federal races draw their
// candidates from everyone with standing in the state (not only the town's
// residents), every candidate's reasons are recorded, and no seat is vacated
// for a higher office before its holder's new term begins. Every check reads
// records only.
const seed = process.env.POOL_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const end = "2027-01-31";
const world = buildBenchWorld(seed, opening, { twoLevel: true });
const api = coreAPI(world.core);
const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
let date = opening;
while (date < end) {
  date = addDay(date);
  advanceCore(world.core, date);
}
const rows = <T>(module: string, name: string) =>
  api.moduleState(module).table(name).rows() as unknown as T[];
const contests = rows<ContestRow>(ELECTIONS_MODULE_ID, "contests");
const filings = rows<FilingRow>(ELECTIONS_MODULE_ID, "filings");
const decisions = rows<CandidacyDecision>(CANDIDACY_MODULE_ID, "decisions");
const town = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("town")
  .get("town") as unknown as { townPlaceId: string };
const wide = contests.filter(
  (c) =>
    c.electionDate === "2026-11-03" &&
    (c.family === "statewideExecutive" || c.family === "usHouse"),
);
const partisan = (c: ContestRow) => {
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const incumbent = c.incumbentTermId
    ? (terms.get(c.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  return partySide(incumbent?.party) !== 0;
};
const governor = (c: ContestRow) => /governor$/i.test(c.officeId);
const senate = (c: ContestRow) => /senat/i.test(c.officeId);

describe(`the standing pool in the played world: ${world.place.key} (seed ${seed})`, () => {
  it("draws two or more candidates to the governor, U.S. Senate and U.S. House races, from beyond the town", () => {
    const named = wide.filter(
      (c) => governor(c) || senate(c) || c.family === "usHouse",
    );
    expect(named.length).toBeGreaterThan(0);
    const people = new Map(
      [...api.state.people.values()].map((p) => [p.id, p]),
    );
    let beyondTown = 0;
    for (const contest of named.filter(partisan)) {
      const field = filings.filter(
        (f) => f.contestId === contest.id && f.status === "on-ballot",
      );
      expect(field.length, `${contest.title} ${contest.id}`).toBeGreaterThan(1);
      // A candidate from each major party's side.
      const sides = new Set(field.map((f) => partySide(f.party)));
      expect(sides.has(-1) && sides.has(1), contest.title).toBe(true);
      for (const f of field)
        if (people.get(f.personId)?.placeId !== town.townPlaceId)
          beyondTown += 1;
    }
    // Not every candidate lives in town: the pool reaches the state.
    expect(beyondTown).toBeGreaterThan(0);
  });

  it("records the reasons behind every statewide and federal candidacy", () => {
    expect(wide.length).toBeGreaterThan(0);
    for (const contest of wide) {
      const weighed = rows<WeighedContest>(CANDIDACY_MODULE_ID, "weighed").find(
        (w) => w.contestId === contest.id,
      );
      expect(weighed, contest.id).toBeDefined();
      expect(weighed!.poolSize, contest.id).toBeGreaterThan(0);
      for (const f of filings.filter(
        (row) => row.contestId === contest.id && row.status === "on-ballot",
      )) {
        const decision = decisions.find(
          (d) => d.contestId === contest.id && d.personId === f.personId,
        );
        // The opening ballot of a race whose filing closed before the
        // opening is history: its stand-in party candidates weighed nothing.
        if (
          !decision &&
          contest.filingDeadline < opening &&
          ["challenger", "nominee for an open seat"].includes(f.how ?? "")
        )
          continue;
        expect(decision, `${contest.title}: ${f.personId}`).toBeDefined();
        // Whoever filed chose to, except a filing that stood on the opening
        // record for a race whose filing closed before it.
        if (!decision!.run)
          expect(
            [
              "incumbent stands again",
              "challenger",
              "nominee for an open seat",
            ],
            `${contest.title}: ${f.personId}`,
          ).toContain(f.how);
        expect(Object.keys(decision!.reasons).length).toBeGreaterThan(5);
        expect(decision!.sourceIds).toContain(contest.id);
      }
    }
  });

  it("asks the strongest of a side with no candidate, and keeps who was asked", () => {
    const recruits = rows<{
      contestId: string;
      askedIds: string[];
      acceptedId: string | null;
      askedBy: string | null;
    }>(CANDIDACY_MODULE_ID, "recruits");
    for (const recruit of recruits) {
      expect(recruit.askedIds.length).toBeGreaterThan(0);
      if (recruit.acceptedId) {
        const decision = decisions.find(
          (d) =>
            d.contestId === recruit.contestId &&
            d.personId === recruit.acceptedId,
        )!;
        expect(decision.run).toBe(true);
        expect(decision.reasons["asked"]).toBeGreaterThan(0);
      }
    }
  });

  it("vacates no seat for a higher office before its holder's new term begins (C)", () => {
    const terms = rows<TermRow>(OFFICES_MODULE_ID, "terms");
    for (const left of terms.filter(
      (t) => t.endedBy === "took higher office",
    )) {
      const next = terms.find(
        (t) =>
          t.personId === left.personId &&
          t.seatId !== left.seatId &&
          t.reached.startsWith("elected") &&
          t.startDate <= left.endDate!,
      );
      expect(
        next,
        `${left.personId} left ${left.seatId} on ${left.endDate}`,
      ).toBeDefined();
    }
    // A candidate who lost keeps the seat they hold, and the loss is a record.
    for (const result of rows<{ contestId: string; winnerId: string | null }>(
      "core2-voting-v1",
      "results",
    )) {
      const seatId = contests.find((c) => c.id === result.contestId)?.seatId;
      for (const f of filings.filter(
        (row) =>
          row.contestId === result.contestId && row.status === "on-ballot",
      )) {
        const held = officialOf(api, f.personId);
        if (!held || f.personId === result.winnerId || held.seatId === seatId)
          continue;
        expect(
          raceLossesOf(api, f.personId).some(
            (row) => row.contestId === result.contestId,
          ),
          `${f.personId} lost ${result.contestId}`,
        ).toBe(true);
      }
    }
    const results = rows<{ contestId: string; winnerId: string | null }>(
      "core2-voting-v1",
      "results",
    );
    for (const result of results) {
      for (const f of filings.filter(
        (row) => row.contestId === result.contestId,
      )) {
        if (f.personId === result.winnerId) continue;
        const kept = terms.filter(
          (t) =>
            t.personId === f.personId &&
            t.endedBy === "took higher office" &&
            t.seatId !==
              contests.find((c) => c.id === result.contestId)?.seatId,
        );
        for (const t of kept)
          expect(
            terms.some(
              (u) =>
                u.personId === f.personId &&
                u.seatId !== t.seatId &&
                u.reached.startsWith("elected"),
            ),
            `${f.personId} lost ${result.contestId} but left ${t.seatId}`,
          ).toBe(true);
      }
    }
  });
});
