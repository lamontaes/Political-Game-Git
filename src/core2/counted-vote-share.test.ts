/**
 * Pool item elections-counted-vote-splits-by-share (CTO ruling, Nov 1): a
 * counted voter record stands for many different residents, so on a ballot
 * without party labels its unpledged weight divides among the candidates by
 * each one's logistic share of the appeal gaps at appealPerShare's slope,
 * never all to whoever is strictly first. On a ballot with party labels the
 * record keeps first place until a spread of leans within each record
 * replaces both (amended 22:10). A household that gave its word at a door
 * keeps its whole vote (near-binding, Oct 29), and a named voter (one person)
 * keeps first place. The expected shares here are worked from the formula
 * itself, never from the engine's own function, so a count that went back to
 * first place fails.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  countPlaces,
  countedAppeal,
  countedChoice,
  countedShareRule,
  countedShares,
  type CountedFieldEntry,
} from "./electorate";
import { electorateParameter } from "./electorate-inputs";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  isLocalFamily,
  type ContestRow,
} from "./modules/elections";
import {
  VOTING_MODULE_ID,
  countedBallotsOf,
  countedDivision,
  placesOf,
  resultOf,
  type BallotRow,
} from "./modules/voting";
import { coreAPI } from "./state";
import { setTraitProbe, type OutcomeProbeRow } from "./trait-probe";
import { setKeepEveryonesWhy } from "./why-kept";

/** The ruling's share, worked out here: exp(k a_i) / sum_j exp(k a_j), k = 4 / appealPerShare. */
function formulaShares(
  appeal: Readonly<Record<string, { readonly total: number }>>,
): Record<string, number> {
  const ids = Object.keys(appeal);
  if (ids.length === 1) {
    // A lone candidate: the whole record unless it is against them.
    return appeal[ids[0]!]!.total >= 0 ? { [ids[0]!]: 1 } : {};
  }
  const k = 4 / electorateParameter("appealPerShare");
  const sum = ids.reduce((n, id) => n + Math.exp(k * appeal[id]!.total), 0);
  return Object.fromEntries(
    ids.map((id) => [id, Math.exp(k * appeal[id]!.total) / sum]),
  );
}

/** Two nonpartisan candidates, the leader 0.1 appeal units ahead in public standing. */
const field: readonly CountedFieldEntry[] = [
  { id: "leader", standing: 0.1 },
  { id: "other", standing: 0 },
].map((c) => ({
  ...c,
  side: 0,
  isIncumbent: false,
  localStanding: 0,
  recognition: 0,
  platform: [],
}));
const away = { inTown: false, local: false, incumbentLean: 0 };

describe("a counted record splits its unpledged votes by a share of the appeal gap", () => {
  const perShare = electorateParameter("appealPerShare");
  const exact = 1 / (1 + Math.exp(-(4 / perShare) * 0.1));
  const appeal = countedAppeal(0, field, away);

  it("(a) a 0.1-unit lead gives the leader about one half plus 0.1/appealPerShare of the record, not all of it", () => {
    expect(appeal.leader!.total - appeal.other!.total).toBeCloseTo(0.1, 12);
    const shares = countedShares(appeal);
    expect(shares.leader).toBeCloseTo(exact, 12);
    expect(shares.leader! + shares.other!).toBeCloseTo(1, 12);
    // The slope at an even race is 1/appealPerShare: to first order a half
    // plus the gap over appealPerShare (the logistic's next term is the gap
    // cubed over 48 at k = 1).
    expect(Math.abs(shares.leader! - (0.5 + 0.1 / perShare))).toBeLessThan(
      1e-4,
    );
    expect(shares.leader).toBeLessThan(0.6);
    // The engine's division of a record standing for 10 voters, no door's word.
    const division = countedDivision(
      appeal,
      undefined,
      10,
      () => appeal,
      countedShareRule(field),
    );
    expect(division.votes.leader).toBeCloseTo(10 * exact, 9);
    expect(division.votes.other).toBeCloseTo(10 * (1 - exact), 9);
    // The place tally divides each sample voter's people the same way.
    const counted = countPlaces(
      [{ id: "v", rank: 0.5, readiness: 0, incumbentLean: 0, weight: 1 }],
      [
        {
          id: "p",
          name: "p",
          eligible: 1_000_000,
          rightShare: 0.5,
          votes2024: 0,
          source: "test",
          inTown: true,
          local: true,
        },
      ],
      field,
    );
    const leader = counted.votes.leader ?? 0,
      other = counted.votes.other ?? 0;
    expect(leader / (leader + other)).toBeCloseTo(exact, 4);
    process.stdout.write(
      `COUNTED SHARE (a): gap 0.1 at appealPerShare ${perShare}: formula ${exact.toFixed(6)}, countedShares ${shares.leader!.toFixed(6)}, record of 10 gives the leader ${division.votes.leader!.toFixed(4)}, place tally ${(leader / (leader + other)).toFixed(6)} of ${leader + other}\n`,
    );
  });

  it("(b) a household that gave its word at a door votes whole for its pledge; the rest of the record splits", () => {
    const pledges = { other: 1 };
    const pledged = countedAppeal(0, field, { ...away, pledges });
    // The record stands for 10: one household on its word for the trailing
    // candidate, the other 9 split as they would have without it.
    const shares = countedShareRule(field);
    const division = countedDivision(
      pledged,
      pledges,
      10,
      () => appeal,
      shares,
    );
    expect(division.pledged).toBe("other");
    expect(division.wholePledged).toBe(false);
    expect(division.votes.other).toBeCloseTo(1 + 9 * (1 - exact), 9);
    expect(division.votes.leader).toBeCloseTo(9 * exact, 9);
    // A record that is the one household: its whole vote on its word.
    const one = countedDivision(pledged, pledges, 1, () => appeal, shares);
    expect(one.wholePledged).toBe(true);
    expect(one.votes).toEqual({ other: 1 });
    // A word wholly undone (nothing of it holds) binds no one: that
    // household divides with the rest, by the formula's shares.
    const undone = { other: 0 };
    const lapsed = countedAppeal(0, field, { ...away, pledges: undone });
    for (const weight of [1, 10]) {
      const free = countedDivision(
        lapsed,
        undone,
        weight,
        () => appeal,
        shares,
      );
      expect(free.pledged).toBeNull();
      expect(free.wholePledged).toBe(false);
      expect(free.votes.leader).toBeCloseTo(weight * exact, 9);
      expect(free.votes.other).toBeCloseTo(weight * (1 - exact), 9);
    }
  });

  it("(c) a named voter with the same appeals still picks first place", () => {
    expect(countedChoice(appeal)).toBe("leader");
    // Alike in appeal, one person leaves the race blank; a record splits evenly.
    const even = { a: { total: 0.2 }, b: { total: 0.2 } };
    expect(countedChoice(even)).toBeNull();
    expect(countedShares(even)).toEqual({ a: 0.5, b: 0.5 });
  });

  it("(e) the audit's probe reads a counted record's share of the incumbent, and one person's first place", () => {
    // The leader is the incumbent, 0.1 ahead on standing; the probe's
    // incumbent lean is the trait term (zero here: with and without agree).
    const seat = field.map((f) => ({ ...f, isIncumbent: f.id === "leader" }));
    const rows: OutcomeProbeRow[] = [];
    setTraitProbe({ outcome: (row) => rows.push(row) });
    try {
      countedAppeal(0, seat, { ...away, divides: true });
      countedAppeal(0, seat, away);
    } finally {
      setTraitProbe(undefined);
    }
    const backs = rows.filter((r) => r.decisionId === "voting.back-incumbent");
    expect(backs).toHaveLength(2);
    expect(backs[0]!.value).toBeCloseTo(exact, 12);
    expect(backs[0]!.flat).toBeCloseTo(exact, 12);
    expect(backs[1]!.value).toBe(1);
    expect(backs[1]!.flat).toBe(1);
  });

  it("(f) on a ballot with party labels a counted record still goes whole to its first place (CTO, Nov 1, 22:10)", () => {
    // The same 0.1 lead, the candidates now carrying the two parties' labels
    // and the voter at the center of the lean order.
    const labelled = field.map((f, i) => ({ ...f, side: i ? -1 : 1 }));
    const party = countedAppeal(0, labelled, away);
    expect(party.leader!.total - party.other!.total).toBeCloseTo(0.1, 12);
    const rule = countedShareRule(labelled);
    expect(rule(party)).toEqual({ leader: 1 });
    expect(rule({ a: { total: 0.2 }, b: { total: 0.2 } })).toEqual({});
    const division = countedDivision(party, undefined, 10, () => party, rule);
    expect(division.votes).toEqual({ leader: 10 });
    // The place tally gives each sample voter's people whole to the first.
    const counted = countPlaces(
      [{ id: "v", rank: 0.5, readiness: 0, incumbentLean: 0, weight: 1 }],
      [
        {
          id: "p",
          name: "p",
          eligible: 1_000_000,
          rightShare: 0.5,
          votes2024: 0,
          source: "test",
          inTown: true,
          local: true,
        },
      ],
      labelled,
    );
    expect(counted.votes.leader ?? 0).toBeGreaterThan(0);
    expect(counted.votes.other ?? 0).toBe(0);
    // And the audit's probe reads that first place for the record's people.
    const seat = labelled.map((f) => ({
      ...f,
      isIncumbent: f.id === "other",
    }));
    const rows: OutcomeProbeRow[] = [];
    setTraitProbe({ outcome: (row) => rows.push(row) });
    try {
      countedAppeal(0, seat, { ...away, divides: true });
    } finally {
      setTraitProbe(undefined);
    }
    expect(rows.map((r) => [r.value, r.flat])).toEqual([[0, 0]]);
  });
});

// A place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_PLACE_KEY and
// GOLDEN_PATH_SEED pin one).
const seed =
  process.env.GOLDEN_PATH_SEED ??
  process.env.COUNTED_SHARE_SEED ??
  randomBytes(8).toString("hex");

interface KeptCounted {
  readonly field: readonly { readonly id: string; readonly side: number }[];
  readonly voterIds: readonly string[];
  readonly voted: readonly number[];
  readonly weight: readonly number[];
  readonly pledges: readonly (Readonly<Record<string, number>> | null)[];
  readonly pledgedChoice: readonly number[];
  readonly split: readonly (readonly number[])[];
}

it(`(d) a played local contested race's tally is the records' shares times their weights (first place with party labels), plus pledged and named votes (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const drawn = drawPlace(`${seed}:${draw}`, "counted-vote-share");
    const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
    const where = `${process.env.GOLDEN_PATH_PLACE_KEY ? key : `${drawn.name} (${key})`}, world seed ${drawn.seed} (draw ${seed}:${draw})`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    });
    const api = coreAPI(core);
    const contests = () =>
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
    const end = addDays(gameStartDate(), 730);
    const checked: string[] = [];
    // Each local election day in turn, until one held a contested race.
    for (;;) {
      const day = contests()
        .filter(
          (c) =>
            isLocalFamily(c.family) &&
            c.electionDate > core.date &&
            c.electionDate <= end,
        )
        .map((c) => c.electionDate)
        .sort()[0];
      if (!day) break;
      advanceCore(core, addDays(makeIsoDate(day), -1));
      // Everyone's reasons kept for the day, so the named ballots can be read.
      const was = setKeepEveryonesWhy(true);
      try {
        advanceCore(core, addDays(makeIsoDate(day), 1));
      } finally {
        setKeepEveryonesWhy(was);
      }
      for (const contest of contests().filter(
        (c) => c.electionDate === day && isLocalFamily(c.family),
      )) {
        const result = resultOf(api, contest.id);
        const kept = api
          .moduleState(VOTING_MODULE_ID)
          .table("countedBallots")
          .get(`counted:${contest.id}`) as unknown as KeptCounted | undefined;
        if (!result || !kept || kept.field.length < 2) continue;
        const ids = kept.field.map((f) => f.id);
        // A ballot with party labels keeps first place for a record's people
        // (CTO, Nov 1, 22:10); one without divides them by the formula.
        const labelled = kept.field.some((f) => f.side !== 0);
        const divide = (
          appeal: Readonly<Record<string, { readonly total: number }>>,
        ): Record<string, number> => {
          if (!labelled) return formulaShares(appeal);
          const first = countedChoice(appeal);
          return first ? { [first]: 1 } : {};
        };
        const ballots = countedBallotsOf(api, contest.id);
        // Records whose people divide strictly inside, not near all one way.
        let inside = 0;
        // Each record's voters, from the formula: a household that gave its
        // word whole, the rest by each candidate's share times their weight.
        const raw: Record<string, number> = {};
        const firstPlace: Record<string, number> = {};
        let cast = 0;
        for (const [i, b] of ballots.entries()) {
          const w = kept.weight[i]!;
          const expected: Record<string, number> = {};
          const add = (id: string, n: number) =>
            (expected[id] = (expected[id] ?? 0) + n);
          if (kept.pledges[i]) {
            const word = countedChoice(b.appeal);
            if (word) add(word, w);
          } else {
            const restWeight = kept.pledgedChoice[i]! >= 0 ? w - 1 : w;
            if (kept.pledgedChoice[i]! >= 0)
              add(ids[kept.pledgedChoice[i]!]!, 1);
            for (const [id, s] of Object.entries(divide(b.appeal)))
              add(id, s * restWeight);
          }
          for (const [j, id] of ids.entries())
            expect(
              kept.split[i]![j]!,
              `${where}: ${contest.id} record ${b.voterId} for ${id}`,
            ).toBeCloseTo(expected[id] ?? 0, 9);
          const most = Math.max(...ids.map((id) => expected[id] ?? 0));
          if (w > 0 && most / w > 0.05 && most / w < 0.95) inside += 1;
          for (const [id, n] of Object.entries(expected))
            raw[id] = (raw[id] ?? 0) + kept.voted[i]! * n;
          // What first place would have given, for the report.
          const top = countedChoice(b.appeal);
          if (top)
            firstPlace[top] = (firstPlace[top] ?? 0) + kept.voted[i]! * w;
          cast += kept.voted[i]! * w;
        }
        // The count takes out non-citizens and the barred by one scale, from
        // the record's own turnout.
        const scale = cast > 0 ? result.countedTurnout / cast : 0;
        for (const id of ids)
          expect(
            Math.abs((result.countedVotes[id] ?? 0) - (raw[id] ?? 0) * scale),
            `${where}: ${contest.id} counted votes for ${id}`,
          ).toBeLessThanOrEqual(1);
        // Named voters: one ballot each, first place of their own appeal.
        const named = api
          .moduleState(VOTING_MODULE_ID)
          .table("ballots")
          .query("byContest", [contest.id]) as unknown as BallotRow[];
        const namedVotes: Record<string, number> = {};
        let firstPlaceChecked = 0;
        for (const b of named) {
          if (b.choice) namedVotes[b.choice] = (namedVotes[b.choice] ?? 0) + 1;
          if (
            b.voted &&
            !ids.includes(b.voterId) &&
            Object.keys(b.appeal ?? {}).length === ids.length
          ) {
            expect(b.choice, `${where}: named ${b.voterId}`).toBe(
              countedChoice(b.appeal),
            );
            firstPlaceChecked += 1;
          }
        }
        // The rest of the race's electorate, from the place rows the count
        // kept, not the result's own sum of them.
        const placeVotes: Record<string, number> = {};
        for (const row of placesOf(api, contest.id))
          for (const [id, n] of Object.entries(row.votes))
            placeVotes[id] = (placeVotes[id] ?? 0) + n;
        for (const id of ids) {
          expect(result.namedVotes[id] ?? 0, `${where}: named ${id}`).toBe(
            namedVotes[id] ?? 0,
          );
          expect(result.totals[id], `${where}: total ${id}`).toBe(
            (namedVotes[id] ?? 0) +
              (result.countedVotes[id] ?? 0) +
              (placeVotes[id] ?? 0),
          );
        }
        // A contest counts as checked only where something was: a ballot
        // without party labels, counted records, one dividing strictly
        // inside, and a named first place.
        if (labelled || !ballots.length || !inside || !firstPlaceChecked)
          continue;
        const share = (votes: Record<string, number>) => {
          const all = ids.reduce((n, id) => n + (votes[id] ?? 0), 0);
          return ids
            .map(
              (id) => `${id} ${(all ? (votes[id] ?? 0) / all : 0).toFixed(3)}`,
            )
            .join(", ");
        };
        checked.push(
          `${contest.id} (${contest.title}, ${day}): ${ballots.length} counted records (${inside} dividing between 0.05 and 0.95); counted votes ${JSON.stringify(result.countedVotes)} = shares ${share(raw)} (first place would give ${share(firstPlace)}); named ${JSON.stringify(result.namedVotes)} (${firstPlaceChecked} named ballots at first place); places ${JSON.stringify(placeVotes)}; totals ${JSON.stringify(result.totals)}`,
        );
      }
      if (checked.length) break;
    }
    if (!checked.length) {
      tried.push(
        `${where}: no contested local race without party labels, with counted records dividing and a named voter, by ${end}`,
      );
      continue;
    }
    for (const line of checked)
      process.stdout.write(`COUNTED SHARE (d) ${where}: ${line}\n`);
    return;
  }
  throw new Error(
    `seed ${seed}: no drawn place held a contested local race: ${tried.join("; ")}`,
  );
}, 1_800_000);
