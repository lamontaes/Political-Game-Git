import { describe, expect, it } from "vitest";

import { advanceWorld, lifePlaceSearch } from "../simulation";
import type { World } from "../simulation";
import { makeIsoDate } from "../simulation/dates";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import {
  measureCosponsors,
  seatedCongressChamber,
} from "../simulation/governing/congress-chambers";
import {
  measureActions,
  measureEnactment,
  measurePosition,
  measureVotes,
} from "../simulation/legislation";
import {
  LEGISLATIVE_RULE_PACKS,
  rulePackById,
} from "../simulation/legislature-rule-packs";
import { assertRulePackIntegrity } from "../simulation/legislature-rules";
import { congressSittingOn, projectBillPaper } from "./bill-paper";
import { lifeActivityHandlers } from "./life-time-handlers";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * Congress makes law in an ordinary life, with nobody in it played.
 *
 * Hermann, Missouri, a small town, is the life; Congress is the same
 * everywhere, so the place only has to be an ordinary start. Two hundred days
 * is long enough for bills filed on the first of the month to reach the
 * President and for the Senate to have filibustered some.
 */

function placeKey(name: string, state: string): string {
  const found = lifePlaceSearch(name, 20).find(
    (place) => place.displayName === `${name}, ${state}`,
  );
  if (!found) throw new Error(`No place ${name}, ${state}`);
  return found.key;
}

function play(world: World, days: number): World {
  const handlers = lifeActivityHandlers();
  let next = world;
  for (let day = 0; day < days; day++) next = advanceWorld(next, 1, handlers);
  return next;
}

describe("the Congress rule pack", () => {
  it("is a complete pack, resolvable by id, and not listed as a state legislature", () => {
    expect(() => assertRulePackIntegrity(US_CONGRESS_RULE_PACK)).not.toThrow();
    expect(rulePackById(US_CONGRESS_PACK_ID)).toBe(US_CONGRESS_RULE_PACK);
    expect(LEGISLATIVE_RULE_PACKS).not.toContain(US_CONGRESS_RULE_PACK);
  });

  it("states the Constitution's own rules", () => {
    const pack = US_CONGRESS_RULE_PACK;
    expect(pack.executive.override).toMatchObject({
      kind: "each-chamber",
      threshold: { numerator: 2, denominatorParts: 3 },
    });
    expect(pack.origination.subjectRestrictions).toEqual([
      expect.objectContaining({
        subjectClass: "revenue",
        chamberKeys: ["house"],
      }),
    ]);
    const senate = pack.chambers.find((c) => c.chamberKey === "senate")!;
    expect(senate.floorStages.map((stage) => stage.stageKey)).toEqual([
      "cloture",
      "passage",
    ]);
  });
});

describe("Congress makes law in an ordinary life", () => {
  const { world } = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: placeKey("Hermann", "Missouri"),
      seed: "congress-hermann",
    }),
  ).game!;
  const later = play(world, 200);
  const bills = (later.history.legislativeMeasures ?? []).filter(
    (measure) => measure.rulePackId === US_CONGRESS_PACK_ID,
  );
  const partyOf = new Map<string, string | null>();
  for (const chamberKey of ["house", "senate"])
    for (const member of seatedCongressChamber(later, chamberKey)!.body.members)
      partyOf.set(member.personId!, member.partyKey ?? null);

  it("files a bill in each House every month, each carried by a seated member", () => {
    expect(bills.length).toBeGreaterThanOrEqual(12);
    for (const bill of bills) {
      expect(partyOf.has(bill.sponsorPersonId!)).toBe(true);
      // Tax bills start in the House, as Article I, section 7 requires.
      if (bill.subjectClass === "revenue")
        expect(bill.originChamberKey).toBe("house");
    }
    expect(
      bills.filter((bill) => bill.originChamberKey === "senate").length,
    ).toBeGreaterThan(0);
  });

  it("enacts a bill that both Houses passed and the President signed, in force that day", () => {
    const enacted = bills.filter(
      (bill) => measurePosition(later, bill.id).phase === "enacted",
    );
    expect(enacted.length).toBeGreaterThan(0);
    for (const bill of enacted) {
      const kinds = measureActions(later, bill.id).map((action) => action.kind);
      expect(kinds).toContain("signed");
      const floor = measureVotes(later, bill.id).filter(
        (vote) => vote.purpose === "floor-stage",
      );
      expect(
        floor
          .filter((vote) => vote.forum.kind === "chamber")
          .map((vote) => vote.outcome),
      ).not.toContain("failed");
      const enactment = measureEnactment(later, bill.id)!;
      expect(enactment.effectiveAt).toBe(enactment.resolvedAt);
    }
  });

  it("lets the Senate filibuster a bill only one party is behind", () => {
    const filibustered = bills.filter((bill) =>
      measureVotes(later, bill.id).some(
        (vote) => vote.floorStageKey === "cloture" && vote.outcome === "failed",
      ),
    );
    expect(filibustered.length).toBeGreaterThan(0);
    for (const bill of filibustered) {
      const backers = [
        bill.sponsorPersonId!,
        ...measureCosponsors(later, bill.id),
      ];
      expect(new Set(backers.map((id) => partyOf.get(id))).size).toBe(1);
      const cloture = measureVotes(later, bill.id).find(
        (vote) => vote.floorStageKey === "cloture",
      )!;
      // Three-fifths of the senators sworn, whoever voted.
      expect(cloture.requiredVotes).toBe(
        Math.ceil((cloture.denominatorValue * 3) / 5),
      );
      expect(cloture.tally.yea).toBeLessThan(cloture.requiredVotes);
    }
  });

  it("records every member's ballot with the member's own reason", () => {
    const votes = bills.flatMap((bill) => measureVotes(later, bill.id));
    expect(votes.length).toBeGreaterThan(0);
    for (const vote of votes) {
      expect(vote.provenance.method).toBe("member-decisions");
      for (const ballot of vote.dispositions)
        expect(ballot.reason ?? "").toMatch(/^member:/);
    }
  });

  it("prints an enacted bill the way Congress prints one, with what each House and the President did", () => {
    const enacted = bills.find(
      (bill) => measurePosition(later, bill.id).phase === "enacted",
    )!;
    const paper = projectBillPaper(later, enacted.id)!;
    expect(paper.congressLine).toBe("119th CONGRESS");
    expect(paper.designation).toBe(enacted.designation);
    expect(paper.kindLabel).toBe("AN ACT");
    expect(paper.stamp).toMatch(/^LAW · IN EFFECT [A-Z]+ \d{1,2}, 2026$/);
    expect(paper.sections[0]!.text).toContain(enacted.shortTitle);
    // The operative text is not modeled, and the paper says so.
    expect(paper.sections.some((section) => section.missing)).toBe(true);
    expect(paper.record.some((line) => /^Passed the House/.test(line))).toBe(
      true,
    );
    expect(paper.record.some((line) => /^Passed the Senate/.test(line))).toBe(
      true,
    );
    expect(paper.record).toContainEqual(
      expect.stringMatching(/^Approved by the President /),
    );
    expect(paper.record.at(-1)).toMatch(/^Became law /);
  });
});

describe("the Congress sitting on a date", () => {
  it("counts Congresses from 1789 and starts each on January 3 of an odd year", () => {
    expect(congressSittingOn(makeIsoDate("2025-01-03"))).toEqual({
      congress: 119,
      session: 1,
    });
    expect(congressSittingOn(makeIsoDate("2026-03-31"))).toEqual({
      congress: 119,
      session: 2,
    });
    expect(congressSittingOn(makeIsoDate("2027-01-02"))).toEqual({
      congress: 119,
      session: 2,
    });
    expect(congressSittingOn(makeIsoDate("1789-03-04"))).toEqual({
      congress: 1,
      session: 1,
    });
  });
});
