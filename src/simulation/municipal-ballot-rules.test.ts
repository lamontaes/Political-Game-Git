import { describe, expect, it } from "vitest";

import {
  municipalBallotRuleCoverage,
  municipalBallotRuleNationalSpread,
  resolveMunicipalBallotRule,
  tabulateBallot,
  type BallotGroup,
} from "./municipal-ballot-rules";
import { municipalRulePackFor } from "./municipal-election-rule-packs";

const first = (id: string, count: number): BallotGroup => ({
  ranking: [id],
  count,
});

describe("which counting rule a town uses", () => {
  it("reads a state's single rule as unverified state law", () => {
    // Georgia's pack resolves majority-50-plus-1 with a 50 percent trigger.
    const georgia = resolveMunicipalBallotRule("GA", "1304000");
    expect(georgia).toMatchObject({
      rule: "majority-50-plus-1",
      majorityTriggerPercent: 50,
      basis: "state-law-unverified",
      triggerBasis: "state-law-unverified",
    });
    expect(georgia.source?.verification).toBe("secondary-synthesis-only");

    const ohio = resolveMunicipalBallotRule("oh", "3918000");
    expect(ohio).toMatchObject({
      stateUsps: "OH",
      rule: "pure-plurality",
      majorityTriggerPercent: null,
      triggerBasis: null,
    });
  });

  it("draws a town's rule from its state's options, stable per town", () => {
    const pack = municipalRulePackFor("FL")!;
    expect(pack.electoral.runoffRule.kind).toBe("locally-selectable");
    const options =
      pack.electoral.runoffRule.kind === "locally-selectable"
        ? pack.electoral.runoffRule.options
        : [];

    const drawn = Array.from({ length: 40 }, (_, index) =>
      resolveMunicipalBallotRule("FL", `12${String(index).padStart(5, "0")}`),
    );
    for (const town of drawn) {
      expect(town.basis).toBe("local-choice-drawn");
      expect(options).toContain(town.rule);
    }
    // Forty towns do not all land on one option: the choice really is local.
    expect(new Set(drawn.map((town) => town.rule)).size).toBeGreaterThan(1);
    expect(resolveMunicipalBallotRule("FL", "1245000")).toEqual(
      resolveMunicipalBallotRule("FL", "1245000"),
    );
  });

  it("fills a jurisdiction with no read rule from the national range, never a neighbour", () => {
    // Puerto Rico has no pack; Arkansas's compound rule is unrepresentable.
    for (const usps of ["PR", "AR"]) {
      const resolved = resolveMunicipalBallotRule(usps, "anywhere");
      expect(resolved.basis).toBe("national-range-drawn");
      expect(resolved.source).toBeNull();
      const spread = municipalBallotRuleNationalSpread();
      expect(spread.rules.map((entry) => entry.rule)).toContain(resolved.rule);
      // Stable per state, and the town does not move it.
      expect(resolveMunicipalBallotRule(usps, "elsewhere")).toEqual(resolved);
    }
  });

  it("records every state, D.C. and Puerto Rico, and which ones are filled in", () => {
    const coverage = municipalBallotRuleCoverage();
    expect(coverage).toHaveLength(52);
    const byUsps = new Map(coverage.map((row) => [row.stateUsps, row]));
    expect(byUsps.get("GA")?.basis).toBe("state-law-unverified");
    // Texas lets each town choose but names the rule it has until it does.
    expect(byUsps.get("TX")).toMatchObject({
      basis: "state-law-unverified",
      rule: "majority-50-plus-1",
    });
    expect(byUsps.get("FL")?.basis).toBe("local-choice-drawn");
    expect(byUsps.get("FL")?.options.length).toBeGreaterThan(1);
    expect(byUsps.get("PR")?.basis).toBe("national-range-drawn");
    expect(byUsps.get("AR")?.basis).toBe("national-range-drawn");
    const counts = new Map<string, number>();
    for (const row of coverage) {
      counts.set(row.basis, (counts.get(row.basis) ?? 0) + 1);
    }
    // Measured on main at b659bb3c: 41 jurisdictions read one rule and 4
    // more (AK, ID, NM, TX) name a default for towns that have not chosen; 5
    // leave it to each town with no default; Arkansas and Puerto Rico are
    // filled in.
    expect(Object.fromEntries(counts)).toEqual({
      "state-law-unverified": 45,
      "local-choice-drawn": 5,
      "national-range-drawn": 2,
    });
  });
});

describe("counting a race", () => {
  const candidates = ["ana", "ben", "cal"];

  it("gives a plurality race to the most votes, however small the share", () => {
    const outcome = tabulateBallot({
      rule: "pure-plurality",
      majorityTriggerPercent: null,
      candidateIds: candidates,
      ballots: [first("ana", 34), first("ben", 33), first("cal", 33)],
    });
    expect(outcome).toMatchObject({ kind: "decided", winnerId: "ana" });
  });

  it("sends a majority race below the threshold to a runoff between the top two", () => {
    const outcome = tabulateBallot({
      rule: "majority-50-plus-1",
      majorityTriggerPercent: 50,
      candidateIds: candidates,
      ballots: [first("ana", 45), first("ben", 35), first("cal", 20)],
    });
    expect(outcome).toMatchObject({
      kind: "runoff-required",
      finalistIds: ["ana", "ben"],
    });

    const outright = tabulateBallot({
      rule: "top-two-primary-runoff",
      majorityTriggerPercent: 50,
      candidateIds: candidates,
      ballots: [first("ana", 51), first("ben", 30), first("cal", 19)],
    });
    expect(outright).toMatchObject({ kind: "decided", winnerId: "ana" });

    // Exactly half is not more than half.
    const half = tabulateBallot({
      rule: "majority-50-plus-1",
      majorityTriggerPercent: 50,
      candidateIds: ["ana", "ben"],
      ballots: [first("ana", 50), first("ben", 50)],
    });
    expect(half.kind).toBe("tie");
  });

  it("sends two candidates level at the top below the threshold to the runoff together", () => {
    const outcome = tabulateBallot({
      rule: "top-two-primary-runoff",
      majorityTriggerPercent: 50,
      candidateIds: candidates,
      ballots: [first("ana", 40), first("ben", 40), first("cal", 20)],
    });
    expect(outcome).toMatchObject({
      kind: "runoff-required",
      finalistIds: ["ana", "ben"],
    });
    // Three level at the top cannot all take two runoff places.
    const three = tabulateBallot({
      rule: "majority-50-plus-1",
      majorityTriggerPercent: 50,
      candidateIds: candidates,
      ballots: [first("ana", 30), first("ben", 30), first("cal", 30)],
    });
    expect(three).toMatchObject({ kind: "tie", tiedIds: candidates });
  });

  it("honours a threshold other than half", () => {
    const outcome = tabulateBallot({
      rule: "majority-50-plus-1",
      majorityTriggerPercent: 40,
      candidateIds: candidates,
      ballots: [first("ana", 41), first("ben", 39), first("cal", 20)],
    });
    expect(outcome).toMatchObject({ kind: "decided", winnerId: "ana" });
  });

  it("reports a tie instead of choosing by identifier", () => {
    const outcome = tabulateBallot({
      rule: "pure-plurality",
      majorityTriggerPercent: null,
      candidateIds: ["zed", "amy"],
      ballots: [first("zed", 10), first("amy", 10)],
    });
    expect(outcome).toMatchObject({ kind: "tie", tiedIds: ["zed", "amy"] });

    const second = tabulateBallot({
      rule: "majority-50-plus-1",
      majorityTriggerPercent: 50,
      candidateIds: candidates,
      ballots: [first("ana", 40), first("ben", 30), first("cal", 30)],
    });
    expect(second).toMatchObject({ kind: "tie", tiedIds: ["ben", "cal"] });
  });

  it("runs ranked-choice rounds, transferring an eliminated candidate's ballots", () => {
    const outcome = tabulateBallot({
      rule: "ranked-choice-instant-runoff",
      majorityTriggerPercent: null,
      candidateIds: candidates,
      ballots: [
        { ranking: ["ana"], count: 40 },
        { ranking: ["ben"], count: 35 },
        { ranking: ["cal", "ben"], count: 20 },
        { ranking: ["cal"], count: 5 },
      ],
    });
    expect(outcome.kind).toBe("decided");
    if (outcome.kind !== "decided") return;
    // Round one: nobody over half; Cal is last and goes out. Twenty of Cal's
    // ballots move to Ben, five run out, and Ben leads 55 to 40.
    expect(outcome.winnerId).toBe("ben");
    expect(outcome.rounds).toHaveLength(2);
    expect(outcome.rounds[0]!.eliminated).toEqual(["cal"]);
    expect(outcome.rounds[1]!.exhausted).toBe(5);
    expect(outcome.rounds[1]!.tallies).toEqual([
      { candidateId: "ana", votes: 40 },
      { candidateId: "ben", votes: 55 },
    ]);
  });

  it("drops candidates tied for last together when that cannot change the result", () => {
    const outcome = tabulateBallot({
      rule: "ranked-choice-instant-runoff",
      majorityTriggerPercent: null,
      candidateIds: ["ana", "ben", "cal", "dee"],
      ballots: [
        { ranking: ["ana"], count: 45 },
        { ranking: ["ben"], count: 40 },
        { ranking: ["cal", "ben"], count: 7 },
        { ranking: ["dee", "ana"], count: 7 },
      ],
    });
    expect(outcome.kind).toBe("decided");
    expect(outcome.rounds[0]!.eliminated).toEqual(["cal", "dee"]);

    // A last-place tie that decides who survives stays a tie.
    const deciding = tabulateBallot({
      rule: "ranked-choice-instant-runoff",
      majorityTriggerPercent: null,
      candidateIds: ["ana", "ben", "cal"],
      ballots: [
        { ranking: ["ana"], count: 40 },
        { ranking: ["ben", "ana"], count: 30 },
        { ranking: ["cal", "ben"], count: 30 },
      ],
    });
    expect(deciding).toMatchObject({ kind: "tie", tiedIds: ["ben", "cal"] });
  });

  it("refuses a threshold race without a threshold", () => {
    expect(() =>
      tabulateBallot({
        rule: "majority-50-plus-1",
        majorityTriggerPercent: null,
        candidateIds: candidates,
        ballots: [first("ana", 45), first("ben", 55)],
      }),
    ).toThrow(/threshold/);
    // Even when the count would otherwise stop at a tie.
    expect(() =>
      tabulateBallot({
        rule: "majority-50-plus-1",
        majorityTriggerPercent: null,
        candidateIds: ["ana", "ben"],
        ballots: [first("ana", 1), first("ben", 1)],
      }),
    ).toThrow(/threshold/);
  });
});
