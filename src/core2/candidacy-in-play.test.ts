import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import {
  CANDIDACY_MODULE_ID,
  type CandidacyDecision,
  type WeighedContest,
  weighingDate,
} from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import { campaignParameter, questionAxis } from "./campaign-views";
import {
  VOTING_MODULE_ID,
  type BallotRow,
  type ResultRow,
} from "./modules/voting";
import { VIEWS_MODULE_ID, type PersonView } from "./modules/views";
import { CAMPAIGNS_MODULE_ID, parsePlatform } from "./modules/campaigns";

// PW-3 in the world the owner plays: the bench world on a seed nobody chose,
// run for a year. Every named adult in town weighed each local contest whose
// filing opened, with reasons, and every runner filed (C); counted residents
// vote in every local race (D); no full person's ballot runs against a
// strongly held view without a recorded reason that outweighs it (E).
// Every check reads records only.
const seed = process.env.PW3_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";
const world = buildBenchWorld(seed, opening, { twoLevel: true });
const api = coreAPI(world.core);
const contests = () =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
const local = (c: ContestRow) =>
  c.family === "municipalOffice" || c.family === "countyOffice";
const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
const yearEnd = `${Number(opening.slice(0, 4)) + 1}${opening.slice(4)}`;
let date = opening;
const weighedRows = () =>
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .rows() as unknown as WeighedContest[];
while (date < yearEnd) {
  date = addDay(date);
  advanceCore(world.core, date);
}
const rows = <T>(module: string, name: string) =>
  api.moduleState(module).table(name).rows() as unknown as T[];

describe(`who runs in the played world: ${world.place.key} ${world.place.context.jurisdiction.name ?? ""} (seed ${seed})`, () => {
  it("weighs every contest whose weighing day came in the year, asking every named adult in town about local seats, with reasons", () => {
    const held = new Map(weighedRows().map((w) => [w.contestId, w]));
    const decisions = api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows() as unknown as CandidacyDecision[];
    for (const c of contests()) {
      if (c.filingDeadline <= opening || weighingDate(api, c) >= yearEnd)
        continue;
      const w = held.get(c.id);
      expect(w, c.id).toBeDefined();
      if (local(c)) expect(w!.askedIds.length, c.id).toBeGreaterThan(0);
      for (const personId of w!.askedIds) {
        const d = decisions.find(
          (row) => row.contestId === c.id && row.personId === personId,
        )!;
        expect(d).toBeDefined();
        expect(Object.keys(d.reasons).length).toBeGreaterThan(5);
        expect(d.run).toBe(w!.runIds.includes(personId));
      }
    }
  });

  it("files every runner with the place's filing office once filing opens", () => {
    const filedOn = new Map(weighedRows().map((w) => [w.contestId, w.filedOn]));
    const filings = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[];
    for (const d of api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows() as unknown as CandidacyDecision[]) {
      if (!d.run || !filedOn.get(d.contestId)) continue;
      expect(d.filing, d.id).toBeDefined();
      if (d.filing!.filingId)
        expect(
          filings.find((f) => f.id === d.filing!.filingId)?.filedWith,
        ).not.toBe("incumbent stands again");
      else expect(d.filing!.unmet.length).toBeGreaterThan(0);
    }
  });
});

describe(`votes in the played world: ${world.place.key} (seed ${seed})`, () => {
  it("counts counted residents in every local race, by voter group (D)", () => {
    const results = rows<ResultRow>(VOTING_MODULE_ID, "results");
    const ballots = rows<BallotRow>(VOTING_MODULE_ID, "ballots");
    for (const result of results) {
      const contest = contests().find((c) => c.id === result.contestId);
      if (!contest || !local(contest) || !result.countedEligible) continue;
      // A seat nobody filed for has no name on its ballot: everyone who
      // turned out left it blank, and no one wins it.
      if (!Object.keys(result.totals).length) {
        expect(result.winnerId, result.id).toBeNull();
        continue;
      }
      const namedBallots = ballots.filter(
        (b) => b.contestId === result.contestId && b.voted && b.choice,
      ).length;
      const total = Object.values(result.totals).reduce((a, b) => a + b, 0);
      expect(total, result.id).toBeGreaterThan(namedBallots);
      const counted = Object.values(result.countedVotes).reduce(
        (a, b) => a + b,
        0,
      );
      expect(counted, result.id).toBeGreaterThan(0);
    }
  });

  it("casts no ballot against a strongly held view without a reason that outweighs it (E)", () => {
    const threshold = campaignParameter("votingBallotAgainstViewMax");
    const filings = rows<FilingRow>(ELECTIONS_MODULE_ID, "filings");
    const campaigns = rows<{
      filingId: string;
      platform: { question: string; position: number }[];
    }>(CAMPAIGNS_MODULE_ID, "campaigns");
    const side = (party: string | null | undefined) =>
      !party
        ? 0
        : /democrat/i.test(party)
          ? -1
          : /republican/i.test(party)
            ? 1
            : 0;
    let checked = 0;
    for (const ballot of rows<BallotRow>(VOTING_MODULE_ID, "ballots")) {
      if (!ballot.voted || !ballot.choice) continue;
      const view = api
        .moduleState(VIEWS_MODULE_ID)
        .table("people")
        .get(ballot.voterId) as unknown as PersonView | undefined;
      if (!view) continue;
      // The position the ballot weighed, recorded when it was cast (views
      // change from events afterward).
      expect(ballot.lean, ballot.id).toBeDefined();
      const lean = ballot.lean!;
      if (Math.abs(lean) < threshold) continue;
      checked += 1;
      const filing = filings.find(
        (f) => f.contestId === ballot.contestId && f.personId === ballot.choice,
      );
      const platform =
        campaigns.find((c) => c.filingId === filing?.id)?.platform ??
        parsePlatform(filing?.platform ?? []);
      const againstParty = side(filing?.party) * lean <= -threshold;
      const againstPlatform = platform.some(
        (stance) =>
          lean * questionAxis(stance.question) * stance.position <= -threshold,
      );
      if (!againstParty && !againstPlatform) continue;
      // The view's own pull (party side and platform agreement) against
      // every other recorded reason: for each rival the view favors, the
      // other reasons for the chosen candidate must outweigh the gap.
      const chosen = ballot.appeal[ballot.choice]!;
      const viewPart = (a: (typeof ballot.appeal)[string]) =>
        a.party + (a.agreement ?? 0);
      const other = (a: (typeof ballot.appeal)[string]) =>
        a.total - viewPart(a);
      const rivals = Object.entries(ballot.appeal).filter(
        ([id]) => id !== ballot.choice,
      );
      if (!rivals.length)
        expect(other(chosen), ballot.id).toBeGreaterThanOrEqual(
          -viewPart(chosen),
        );
      for (const [, rival] of rivals)
        if (viewPart(rival) > viewPart(chosen))
          expect(other(chosen) - other(rival), ballot.id).toBeGreaterThan(
            viewPart(rival) - viewPart(chosen),
          );
    }
    console.log(`E: ${checked} ballots by people with strongly held views`);
  });
});
