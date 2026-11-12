// @vitest-environment node
// Politics, Issues filters (level, in force, subject): each choice lists exactly the laws the
// law rows name. The counts below are read straight off the rows the Government screen hands
// the Issues list, in two drawn places.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import controls from "./data/controls.json";
import { governmentView } from "./government";
import { ALL, filterLaws, levelChoices } from "./ui/issue-filter.mjs";
import { buildBenchWorld } from "./world";

const seeds = [
  process.env.GOLDEN_PATH_SEED ?? "issue-filter-a",
  `${process.env.GOLDEN_PATH_SEED ?? "issue-filter-a"}-b`,
];
const issueGroupOf = controls.politics.issueGroupOf as Record<string, string>;
// The subject of a law as the Issues screen reads it (a policy question's own domain, or the table's).
const subjectOf = (series: string) =>
  series.includes(":")
    ? series.split(":")[1]!.split(".")[0]!
    : (issueGroupOf[series] ?? "fiscal");

for (const seed of seeds) {
  const place = drawPlace(
    createHash("sha256").update(seed).digest("hex"),
    "issue-filter",
  );
  const where = `${place.name} (${place.key}), seed ${seed}`;
  describe(`Issues filters, ${where}`, () => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const laws = governmentView(core, core.playerId!).law;
    const none = { level: ALL, force: ALL, subject: ALL };

    it("shows every law with no filter", () => {
      expect(laws.length, where).toBeGreaterThan(0);
      expect(filterLaws(laws, none, subjectOf).length, where).toBe(laws.length);
    });

    it("level: exactly the laws with a row or a coming phase at that level", () => {
      const levels = levelChoices(laws);
      expect(levels.length, where).toBeGreaterThan(0);
      for (const level of levels) {
        const expected = laws.filter(
          (law) =>
            law.levels.some((l) => l.level === level && l.row && !l.setAside) ||
            law.pending.some((p) => p.level === level),
        );
        const shown = filterLaws(laws, { ...none, level }, subjectOf);
        process.stdout.write(`LEVEL ${where}: ${level} ${shown.length}\n`);
        expect(
          shown.map((l) => l.series),
          `${where} ${level}`,
        ).toEqual(expected.map((l) => l.series));
        expect(shown.length, `${where} ${level}`).toBeGreaterThan(0);
      }
    });

    it("in force: the laws with a row in force, and the rest apart from them", () => {
      const inForce = laws.filter((law) =>
        law.levels.some((l) => l.row && !l.setAside),
      );
      const shownIn = filterLaws(laws, { ...none, force: "in" }, subjectOf);
      const shownNot = filterLaws(laws, { ...none, force: "not" }, subjectOf);
      process.stdout.write(
        `FORCE ${where}: in ${shownIn.length}, not yet ${shownNot.length}, of ${laws.length}\n`,
      );
      expect(
        shownIn.map((l) => l.series),
        where,
      ).toEqual(inForce.map((l) => l.series));
      expect(shownIn.length + shownNot.length, where).toBe(laws.length);
    });

    it("every law's subject has a worded name, and no subject holds one law only because the screen lacks a word", () => {
      const named = new Set(
        Object.keys(
          (controls as unknown as { politics: { issueGroups: object } })
            .politics.issueGroups,
        ),
      );
      const subjects = new Map<string, number>();
      for (const law of laws)
        subjects.set(
          subjectOf(law.series),
          (subjects.get(subjectOf(law.series)) ?? 0) + 1,
        );
      const raw = [...subjects.keys()].filter((key) => !named.has(key));
      expect(raw, `${where}: subjects with no worded name`).toEqual([]);
    });

    it("subject: exactly the laws of that subject, and the subjects cover every law", () => {
      const subjects = [...new Set(laws.map((l) => subjectOf(l.series)))];
      let total = 0;
      for (const subject of subjects) {
        const shown = filterLaws(laws, { ...none, subject }, subjectOf);
        total += shown.length;
        process.stdout.write(`SUBJECT ${where}: ${subject} ${shown.length}\n`);
        expect(
          shown.map((l) => l.series),
          `${where} ${subject}`,
        ).toEqual(
          laws
            .filter((l) => subjectOf(l.series) === subject)
            .map((l) => l.series),
        );
      }
      expect(total, where).toBe(laws.length);
    });

    it("choices combine: level and in force narrow together", () => {
      const level = levelChoices(laws)[0]!;
      const both = filterLaws(laws, { ...none, level, force: "in" }, subjectOf);
      const byLevel = filterLaws(laws, { ...none, level }, subjectOf);
      expect(both.length, where).toBeLessThanOrEqual(byLevel.length);
      for (const law of both)
        expect(
          law.levels.some((l) => l.row && !l.setAside),
          `${where} ${law.series}`,
        ).toBe(true);
    });
  }, 300_000);
}
