/**
 * The simulated electorate: with the opening's inputs every county votes its
 * 2024 result, and a scandal, an incumbent, a campaign's spending, the
 * economy and a midterm move votes by research-sized amounts, most where the
 * voters are least partisan. Drawn on a random state of the 50 and D.C.
 * (the territories cast no presidential vote).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import {
  countBlocks,
  electorateParameter,
  houseBlock,
  stateBlocks,
  type CandidateInputs,
  type ElectorateResult,
  type RaceConditions,
} from "./electorate-blocks";
import { campaignParameter } from "./campaign-views";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`electorate:${Date.now()}`).digest("hex");
const states = (
  calibration as unknown as { presidentialByState: { stateUsps: string }[] }
).presidentialByState
  .map((s) => s.stateUsps)
  .sort();
const usps =
  states[
    parseInt(
      createHash("sha256").update(`${seed}:state`).digest("hex").slice(0, 8),
      16,
    ) % states.length
  ]!;

const conditions: RaceConditions = {
  cycle: "presidential",
  cycleShare: 1,
  federal: true,
  typicalSpendPerVote: 500,
  national: { unemploymentChange: 0, inflationChange: 0 },
  town: null,
  lawCostChange: 0,
  barredChange: 0,
};
const candidate = (
  side: number,
  more: Partial<CandidateInputs> = {},
): CandidateInputs => ({
  id: side > 0 ? "R" : "D",
  party: side > 0 ? "Republican" : "Democratic",
  side,
  incumbent: false,
  experienced: false,
  scandal: false,
  spentMinor: null,
  record: 0,
  presidentsParty: false,
  seatPartyHolder: false,
  ...more,
});
const right = (r: ElectorateResult) => r.votes.R! / (r.votes.R! + r.votes.D!);

describe("the simulated electorate", () => {
  it("with the opening's inputs, every county votes its 2024 result", () => {
    const blocks = stateBlocks(usps);
    expect(blocks.length, usps).toBeGreaterThan(0);
    const counted = countBlocks(
      blocks,
      [candidate(-1), candidate(1)],
      conditions,
    );
    for (const block of counted.blocks) {
      const fit = blocks.find((b) => b.id === block.id)!;
      const total = block.votes.R! + block.votes.D!;
      // Rounding to whole voters aside.
      expect(
        Math.abs(block.votes.R! / total - fit.target),
        `${seed} ${block.id}`,
      ).toBeLessThan(1 / total + 0.001);
      // Each group's votes are kept, and add up to the block's.
      const byGroup = Object.values(block.byGroup).reduce(
        (s, g) => s + g.cast,
        0,
      );
      expect(Math.abs(byGroup - block.cast)).toBeLessThanOrEqual(
        Object.keys(block.byGroup).length,
      );
    }
  });

  it("candidates and conditions move votes by research-sized amounts, and the same inputs give the same votes", () => {
    const blocks = stateBlocks(usps);
    const base = right(
      countBlocks(blocks, [candidate(-1), candidate(1)], conditions),
    );
    const moved = (r: Partial<CandidateInputs>, c = conditions) =>
      right(countBlocks(blocks, [candidate(-1), candidate(1, r)], c)) - base;
    // Each effect is sized in an evenly split electorate; a partisan state,
    // with fewer persuadable voters, moves less but never the other way.
    const within = (got: number, research: number) => {
      expect(Math.sign(got), `${seed} ${usps}`).toBe(Math.sign(research));
      expect(Math.abs(got)).toBeLessThanOrEqual(Math.abs(research) * 1.05);
      expect(Math.abs(got)).toBeGreaterThan(Math.abs(research) * 0.3);
    };
    within(moved({ incumbent: true }), campaignParameter("incumbencyShare"));
    within(moved({ scandal: true }), -electorateParameter("scandalShare"));
    within(
      moved({ experienced: true }),
      electorateParameter("experiencedCandidateShare"),
    );
    within(
      moved(
        { presidentsParty: true },
        {
          ...conditions,
          national: { unemploymentChange: 2, inflationChange: 0 },
        },
      ),
      -2 * electorateParameter("unemploymentShare"),
    );
    // Spending three times the typical race wins votes; spending nothing loses them.
    const raceVotes = blocks.reduce((s, b) => s + b.votes, 0);
    expect(
      moved({ spentMinor: 3 * conditions.typicalSpendPerVote * raceVotes }),
    ).toBeGreaterThan(0);
    expect(moved({ spentMinor: 0 })).toBeLessThan(0);
    // No dice: the same inputs, the same votes.
    expect(
      countBlocks(blocks, [candidate(-1), candidate(1)], conditions).votes,
    ).toEqual(
      countBlocks(blocks, [candidate(-1), candidate(1)], conditions).votes,
    );
  });

  it("a midterm draws fewer voters, and a costlier vote keeps the least reliable home most", () => {
    const blocks = stateBlocks(usps);
    const share = campaignParameter("midtermShareOfPresidential");
    const full = countBlocks(blocks, [candidate(-1), candidate(1)], conditions);
    const mid = countBlocks(blocks, [candidate(-1), candidate(1)], {
      ...conditions,
      cycle: "midterm",
      cycleShare: share,
    });
    expect(mid.cast / full.cast).toBeCloseTo(share, 2);
    const costly = countBlocks(blocks, [candidate(-1), candidate(1)], {
      ...conditions,
      lawCostChange: 0.03,
    });
    expect(costly.cast).toBeLessThan(full.cast);
    // The largest block, so every group holds whole voters.
    const largest = full.blocks.indexOf(
      [...full.blocks].sort((a, b) => b.cast - a.cast)[0]!,
    );
    const block = costly.blocks[largest]!,
      was = full.blocks[largest]!;
    const kept = (g: string) => block.byGroup[g]!.cast / was.byGroup[g]!.cast;
    expect(kept("independent")).toBeLessThan(kept("strong-republican"));
    expect(kept("independent")).toBeLessThan(kept("strong-democrat"));
  });

  it("a House district with the same holder standing again lands on its 2024 result", () => {
    const rows = (
      calibration as unknown as {
        house: {
          stateUsps: string;
          districtCode: string;
          democraticTwoPartyShare: number | null;
          certifiedWinnerParty: string | null;
          uncontested: boolean;
        }[];
      }
    ).house.filter(
      (h) =>
        h.stateUsps === usps &&
        !h.uncontested &&
        h.democraticTwoPartyShare !== null,
    );
    for (const row of rows) {
      const block = houseBlock(row.stateUsps, row.districtCode)!;
      const side = /^republican/i.test(row.certifiedWinnerParty ?? "") ? 1 : -1;
      const got = right(
        countBlocks(
          [block],
          [
            candidate(-1, { incumbent: side < 0 }),
            candidate(1, { incumbent: side > 0 }),
          ],
          conditions,
        ),
      );
      expect(
        Math.abs(got - (1 - row.democraticTwoPartyShare!)),
        `${seed} ${row.stateUsps}-${row.districtCode}`,
      ).toBeLessThan(0.005);
    }
  });
});
