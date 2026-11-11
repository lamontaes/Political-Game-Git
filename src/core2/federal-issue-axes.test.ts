import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import federal from "../../data/research/campaigns/federal-issue-axes-2026.json" with { type: "json" };
import state from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import powers from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { standsAt } from "../director/opening-story";
import { axisOf } from "./campaign-data";
import { officialsIn } from "./modules/officials";
import { ownStance } from "./officials-roster";
import { coreAPI } from "./state";

// Questions only federal law answers hold a direction measured from roll
// calls by party (gov-federal-questions-have-a-measured-left-right-direction),
// so the President, Congress and the voters take sides on them.
interface Row {
  readonly axis: number;
  readonly yesShare: number;
  readonly tag: string;
  readonly spread?: number;
  readonly source: string;
}
const rows = (federal as unknown as { axes: Record<string, Row> }).axes;
const levels = (
  powers as unknown as { questions: Record<string, { levels: string[] }> }
).questions;

describe("the federal questions' directions", () => {
  it("are one row per federal-only question, each sourced with a date", () => {
    expect(Object.keys(rows).length).toBeGreaterThanOrEqual(15);
    for (const [question, row] of Object.entries(rows)) {
      expect(levels[question]?.levels, question).toEqual(["federal"]);
      expect(Object.hasOwn(state.axes, question), question).toBe(false);
      expect(Math.abs(row.axis), question).toBeLessThanOrEqual(1);
      expect(row.axis, question).not.toBe(0);
      expect(row.yesShare, question).toBeGreaterThanOrEqual(0);
      expect(row.yesShare, question).toBeLessThanOrEqual(1);
      expect(["SOURCED", "ESTIMATED"], question).toContain(row.tag);
      if (row.tag === "ESTIMATED")
        expect(row.spread, question).toBeGreaterThan(0);
      // A dated source: a roll call's or a poll's day, and the page fetched.
      expect(row.source, question).toMatch(/\b(19|20)\d\d\b/);
      expect(row.source, question).toMatch(/https:\/\/\S+/);
      // The one map every stance reads.
      expect(axisOf[question], question).toEqual({
        ...axisOf[question],
        axis: row.axis,
      });
    }
  });
});

describe("the President's views on federal questions, in drawn places", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const federalQuestions = Object.keys(rows);
  const draws = Number(process.env.FEDERAL_VIEWS_DRAWS ?? 3);

  it("hold a side on most federal questions and take stands the address can speak", () => {
    const seen: string[] = [];
    const byParty = new Map<string, Map<string, number>>();
    for (let at = 0; at < draws; at += 1) {
      const place = drawPlace(seed, `federal-views:${at}`);
      const here = `${place.name} (${place.key}), seed ${seed}, draw ${at}`;
      const world = buildBenchWorld(place.seed, "2025-01-20", {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const president = officialsIn(api, "US:president")[0];
      expect(president, here).toBeTruthy();
      const stances = new Map(
        federalQuestions.map((question) => [
          question,
          ownStance(president!.ideal, president!.signature, question),
        ]),
      );
      const held = [...stances.values()].filter((value) => value !== 0);
      expect(held.length, here).toBeGreaterThanOrEqual(15);
      const stands = standsAt(api, president!, "federal", "US");
      expect(stands.length, here).toBeGreaterThanOrEqual(6);
      // The address names at least three national points, at least two of
      // them questions only federal law answers, each one of his stands.
      const points = [
        ...new Set(
          world.director.ledger.opening!.address.sentences.flatMap((row) =>
            row.sourceRecordIds
              .filter((id) => id.startsWith("question:"))
              .map((id) => id.slice("question:".length)),
          ),
        ),
      ];
      expect(
        points.length,
        `${here}: ${points.join(", ")}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        points.filter((question) => question in rows).length,
        `${here}: ${points.join(", ")}`,
      ).toBeGreaterThanOrEqual(2);
      for (const question of points)
        expect(
          stands.some((row) => row.question === question),
          `${here}: ${question}`,
        ).toBe(true);
      // A Republican President stands with most of his party on a question
      // the roll call split by party, and a Democratic one with most of hers.
      const side = president!.party === "Republican" ? 1 : -1;
      for (const [question, row] of Object.entries(rows))
        if (Math.abs(row.axis) >= 0.8 && row.tag === "SOURCED")
          expect(
            Math.sign(stances.get(question)!),
            `${here}: ${question}`,
          ).toBe(Math.sign(row.axis) * side);
      byParty.set(president!.party ?? "none", stances);
      // Members of Congress of the two parties read the same rule: their
      // party's median members are on opposite sides of at least five.
      const median = (party: string) => {
        const members = officialsIn(api, "US:us-house")
          .filter((row) => row.party === party)
          .sort((x, y) => x.ideal - y.ideal);
        return members[Math.floor(members.length / 2)];
      };
      const [r, d] = [median("Republican"), median("Democratic")];
      expect(r && d, here).toBeTruthy();
      const apart = federalQuestions.filter(
        (question) =>
          Math.sign(ownStance(r!.ideal, r!.signature, question)) ===
          -Math.sign(ownStance(d!.ideal, d!.signature, question)),
      );
      expect(apart.length, here).toBeGreaterThanOrEqual(5);
      seen.push(
        `${here}: ${president!.party} President, ${stands.length} stands; the parties' median House members apart on ${apart.length}; first points ${points.slice(0, 3).join(", ")}`,
      );
    }
    console.log(seen.join("\n"));
    // Presidents of the two parties, where the draws seated both, are on
    // opposite sides of at least five federal questions.
    const [a, b] = [byParty.get("Republican"), byParty.get("Democratic")];
    if (a && b)
      expect(
        federalQuestions.filter(
          (question) =>
            Math.sign(a.get(question)!) === -Math.sign(b.get(question)!),
        ).length,
        seen.join("; "),
      ).toBeGreaterThanOrEqual(5);
  }, 900_000);
});
