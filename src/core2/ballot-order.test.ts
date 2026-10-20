/**
 * The order of names on the ballot follows the law of the place, in a random
 * place: every one of the 56 places has its rule with a citation; a rotated
 * ballot puts each candidate first on one form; a drawn order is the same
 * draw every time it is read; and a primary between two candidates nothing
 * else separates is split by the forms voters hold, not handed whole to one.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import ballotOrder from "../../data/research/elections/ballot-order-2026.json" with { type: "json" };
import {
  ballotForms,
  ballotOrderRule,
  type BallotCandidate,
} from "./ballot-order";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ballot,
  fileCandidacy,
  openContests,
  openElections,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import {
  PARTIES_MODULE_ID,
  openParties,
  partiesHere,
  type TieRow,
} from "./modules/parties";
import { countedField, holdPrimary, openVoting } from "./modules/voting";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`ballot-order:${Date.now()}`).digest("hex");
const first = drawPlace(seed, "ballot-order");
const drawn = first;
const where = `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${seed}`;
const KINDS = [
  "alphabetical",
  "randomized-alphabet",
  "rotation",
  "lot",
  "party",
  "endorsed-first-then-alphabetical",
  "incumbent-first",
  "filing-order",
  "official-discretion",
];

const places = (
  ballotOrder as unknown as {
    places: Record<
      string,
      {
        primary: { kind: string; within?: string };
        general: { kind: string; within?: string };
        citation: string;
      }
    >;
  }
).places;

describe(`ballot order by the law of the place (${where})`, () => {
  it("every one of the 56 places has its rule for primaries and general elections, with a citation", () => {
    expect(Object.keys(places)).toHaveLength(56);
    for (const [key, row] of Object.entries(places)) {
      for (const stage of [row.primary, row.general]) {
        expect(KINDS, key).toContain(stage.kind);
        if (stage.within) expect(KINDS, key).toContain(stage.within);
      }
      expect(row.citation.length, key).toBeGreaterThan(0);
    }
  });

  it("orders the drawn place's ballot as its law says, the same draw every time", () => {
    const names = ["Ortiz", "Baker", "Nguyen", "Adams"];
    const candidates: BallotCandidate[] = names.map((surname, i) => ({
      id: `person_${createHash("sha256").update(`${seed}:${i}`).digest("hex").slice(0, 16)}`,
      surname,
      party: i % 2 ? "Party B" : "Party A",
      isIncumbent: i === 2,
      filedOn: `2026-0${i + 1}-01`,
      filingId: `filing:${i}`,
    }));
    for (const stage of ["primary", "general"] as const) {
      const rule = ballotOrderRule(drawn.state, stage)!;
      const input = {
        stateKey: drawn.state,
        stage,
        contestId: `contest:test:${seed.slice(0, 8)}`,
        year: "2026",
        candidates,
        partyShare: (party: string) => (party === "Party B" ? 0.6 : 0.4),
      };
      const forms = ballotForms(input)!;
      // The same draw every time it is read.
      expect(ballotForms(input), `${where} ${stage}`).toEqual(forms);
      for (const form of forms)
        expect([...form].sort(), `${where} ${stage}`).toEqual(
          candidates.map((c) => c.id).sort(),
        );
      const rotates = rule.kind === "rotation" || rule.within === "rotation";
      if (rotates) {
        // Each candidate is first on exactly one form.
        expect(forms, `${where} ${stage}`).toHaveLength(candidates.length);
        expect(new Set(forms.map((f) => f[0])).size).toBe(candidates.length);
      } else expect(forms, `${where} ${stage}`).toHaveLength(1);
      const surname = (id: string) =>
        candidates.find((c) => c.id === id)!.surname;
      // (The party endorsement is not a record yet, so that order reads alphabetically.)
      if (
        rule.kind === "alphabetical" ||
        rule.kind === "endorsed-first-then-alphabetical"
      )
        expect(forms[0]!.map(surname)).toEqual([...names].sort());
      if (rule.kind === "party")
        expect(
          candidates.find((c) => c.id === forms[0]![0])!.party,
          `${where} ${stage}`,
        ).toBe("Party B");
      if (rule.kind === "incumbent-first")
        expect(forms[0]![0]).toBe(candidates[2]!.id);
    }
  });

  it("a primary between two candidates nothing else separates counts the party's voters across the race", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const drawn = attempt
        ? drawPlace(`${seed}:${attempt}`, "ballot-order")
        : first;
      const where = `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${seed}`;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: drawn.key,
          startedAt: "2026-01-05",
          minimumPeople: 300,
        }),
      );
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      openVoting(core);
      const api = coreAPI(core);
      const party = partiesHere(api)
        .filter((p) => p.side !== 0)
        .sort((a, b) => b.share - a.share)[0];
      if (!party || party.nominationMethod !== "party-primary") {
        tried.push(`${where}: no partisan party that nominates by primary`);
        continue;
      }
      const members = (
        api
          .moduleState(PARTIES_MODULE_ID)
          .table("ties")
          .rows() as unknown as TieRow[]
      )
        .filter((t) => t.partyId === party.id)
        .map((t) => t.personId)
        .filter(
          (id) =>
            2026 - Number(core.people.get(id)!.birthDate.slice(0, 4)) >= 35,
        )
        .sort();
      for (const contest of openContests(api).filter(
        (c) => c.primaryDate && c.primaryDate > "2026-01-05",
      )) {
        const filed = members
          .slice(0, 2)
          .map((id) =>
            fileCandidacy(api, {
              personId: id,
              contestId: contest.id,
              platform: [],
              party: party.name,
            }),
          )
          .filter(
            (r) => r.status !== "refused" && r.filing.status === "on-ballot",
          );
        if (filed.length < 2) continue;
        const field = ballot(api, contest.id).filter(
          (f) => f.party === party.name,
        );
        // "Nothing else separates them": what the voters see of the two
        // candidates (public standing, how well known they are, incumbency,
        // scandal) differs by less than a ballot position is worth. Where it
        // differs by more, the better-placed candidate rightly takes every
        // vote that is not decided by position, and the other can end with
        // none; that is not what this test is about.
        const entries = countedField(api, contest, field);
        const edge =
          Math.max(0, ...entries.flatMap((e) => e.ballotCues ?? [])) -
          Math.min(0, ...entries.flatMap((e) => e.ballotCues ?? []));
        const [a, b] = entries;
        const gap =
          Math.abs((a!.standing ?? 0) - (b!.standing ?? 0)) +
          Math.abs((a!.localStanding ?? 0) - (b!.localStanding ?? 0)) +
          Math.abs((a!.scandal ?? 0) - (b!.scandal ?? 0)) +
          2 * Math.abs((a!.recognition ?? 0) - (b!.recognition ?? 0)) +
          (a!.isIncumbent === b!.isIncumbent ? 0 : 1);
        if (gap >= edge) {
          tried.push(
            `${where} ${contest.id}: the candidates differ by ${gap.toFixed(3)}, a ballot position is worth ${edge.toFixed(3)}`,
          );
          continue;
        }
        const rule = ballotOrderRule(drawn.state, "primary")!;
        const { votes, namedVotes } = holdPrimary(api, contest.id);
        const total = Object.values(votes).reduce((a, b) => a + b, 0);
        expect(total, where).toBeGreaterThan(namedVotes);
        // A rotated ballot puts each candidate first on their share of the
        // forms, so each takes votes from those who know neither.
        if (rule.kind === "rotation" || rule.within === "rotation")
          for (const f of field)
            expect(
              votes[f.personId] ?? 0,
              `${where} ${contest.id}`,
            ).toBeGreaterThan(0);
        return;
      }
      tried.push(`${where}: no primary with two candidates to hold`);
    }
    throw new Error(
      `no drawn place held a two-candidate primary (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
