/**
 * A long career is told where it ends, not at its first job (CTO, Nov 24, C10: "At
 * the age of 18, she came to Benton Supply Company after time at Daniels Family
 * Clinic, Monserrate Register, Snyder Care Home, Boyd's Kitchen..." read as five
 * jobs at 18). More than two jobs fold into one line; that line must stand at the day
 * the last job began, so the story places it at the age the person really reached it.
 * Synthetic lines, no pinned place: the fold is the one function the card's story and
 * every card read.
 */
import { expect, it } from "vitest";
import { foldLines, type HistoryLine } from "../../../src/bench/card";

const spell = (year: number, employer: string): HistoryLine => ({
  date: `${year}-03-01`,
  key: "work.spell",
  slots: { employer },
  recordId: `job-${year}`,
});

it("tells five jobs as one line standing at the last job's day", () => {
  const lines: HistoryLine[] = [
    {
      date: "1990-09-01",
      key: "school.started",
      slots: { school: "High" },
      recordId: "school-1990",
    },
    spell(2000, "Daniels Family Clinic"),
    spell(2003, "Monserrate Register"),
    spell(2007, "Snyder Care Home"),
    spell(2011, "Boyd's Kitchen"),
    spell(2016, "Benton Supply Company"),
    {
      date: "2020-06-01",
      key: "moved.in",
      slots: { place: "Elsewhere" },
      recordId: "move-2020",
    },
  ];
  const folded = foldLines(lines);
  const career = folded.filter((line) => line.key === "work.history");
  expect(career).toHaveLength(1);
  expect(career[0]!.date, "the career stands at the last job's day").toBe(
    "2016-03-01",
  );
  expect(career[0]!.slots.employer).toBe("Benton Supply Company");
  expect(career[0]!.slots.employers).toContain("Daniels Family Clinic");
  expect(career[0]!.recordId).toBe("job-2016");
  // Every job's record is still named, and no earlier job stands as its own line.
  expect([career[0]!.recordId, ...(career[0]!.later ?? [])].sort()).toEqual(
    ["job-2000", "job-2003", "job-2007", "job-2011", "job-2016"].sort(),
  );
  expect(folded.filter((line) => line.key === "work.spell")).toEqual([]);
  // In date order: school, then the career at 2016, then the move.
  expect(folded.map((line) => line.date)).toEqual(
    [...folded.map((line) => line.date)].sort(),
  );
});

it("leaves two jobs as they are", () => {
  const folded = foldLines([spell(2000, "A"), spell(2004, "B")]);
  expect(folded.map((line) => line.key)).toEqual(["work.spell", "work.spell"]);
});
