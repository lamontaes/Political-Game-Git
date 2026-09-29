import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../../src/simulation";
import {
  chronicle,
  neverChecks,
  runWorldReport,
  unwrittenArrays,
  WorldRecordReader,
  worldReportMarkdown,
} from "./run";

/**
 * A hand-built record: an opening event, then two bills the watched world
 * enacted, one of which a public program record names. Only the fields the
 * report reads are present.
 */
function recordedWorld(): World {
  const jurisdictions = {
    place: {
      id: "place",
      slug: "us-place-1",
      name: "Springfield, Ohio",
      kind: "census-place",
      parentName: "Ohio",
    },
    ohio: {
      id: "ohio",
      slug: "us-state-oh",
      name: "Ohio",
      kind: "state-placeholder",
      parentName: null,
    },
  };
  const event = (
    sequence: number,
    type: string,
    occurredAt: string,
    summary: string,
  ) => ({
    id: `event_${sequence}`,
    sequence,
    type,
    occurredAt,
    jurisdictionId: "place",
    involvedEntityIds: [],
    participants: [],
    visibility: "public",
    tags: [],
    summary,
  });
  const measure = (sequence: number, designation: string, title: string) => ({
    id: `legislative-measure_${sequence}`,
    sequence,
    jurisdictionId: "ohio",
    designation,
    shortTitle: title,
    summary: `${title}? This bill says yes.`,
    subjectClass: "general-policy",
    sponsorPersonId: null,
    introducedAt: "2026-02-01",
  });
  const enactment = (sequence: number, measureSequence: number) => ({
    id: `legislative-enactment_${sequence}`,
    sequence,
    measureId: `legislative-measure_${measureSequence}`,
    resolvedAt: "2026-03-01",
    outcome: "enacted",
    effectiveAt: "2026-07-01",
  });
  return {
    currentDate: "2026-12-31",
    jurisdictions,
    people: {
      anchor: {
        id: "anchor",
        homeJurisdictionId: "place",
        birthDate: "1990-01-01",
      },
    },
    history: {
      events: [
        event(1, "world.created", "2026-01-05", "The world was made."),
        event(2, "game.observer-opened", "2026-01-05", "Nobody is played."),
        event(
          9,
          "civic.local-matter-adopted",
          "2026-04-02",
          "Springfield adopted its proposal about park hours.",
        ),
      ],
      legislativeMeasures: [
        measure(0, "HB 1", "Opened before anyone watched"),
        measure(3, "HB 2", "Fund the library"),
        measure(4, "HB 3", "Start a lunch program"),
      ],
      legislativeEnactments: [enactment(5, 3), enactment(6, 4)],
      publicProgramRecords: [
        {
          id: "public-program_7",
          sequence: 7,
          sourceMeasureId: "legislative-measure_4",
        },
      ],
      taxPolicies: [],
    },
  } as unknown as World;
}

describe("the world report", () => {
  it("reads only what the watched world recorded, and says what each law changed", () => {
    const reader = new WorldRecordReader(recordedWorld(), "anchor" as EntityId);
    const lines = chronicle(reader, []);
    const laws = lines.filter((line) => line.section === "laws");
    // The bill filed before the world was handed to nobody is not news.
    expect(laws.map((line) => line.text).join("\n")).not.toContain("HB 1");
    const library = laws.find((line) =>
      line.text.startsWith("Ohio: HB 2 — Fund the library became law"),
    );
    expect(library?.text).toContain("nothing outside its own passage");
    const lunch = laws.find((line) =>
      line.text.startsWith("Ohio: HB 3 — Start a lunch program became law"),
    );
    expect(lunch?.text).toContain("1 publicProgramRecords record");
    expect(lunch?.sources).toEqual([
      "legislative-enactment_6",
      "public-program_7",
    ]);
    expect(lines.find((line) => line.section === "local")?.sources).toEqual([
      "event_9",
    ]);

    const checks = neverChecks(reader, lines, []);
    expect(checks.find((row) => row.key === "law-consequence")?.didHappen).toBe(
      true,
    );
    const tax = checks.find((row) => row.key === "state-tax")!;
    expect(tax.didHappen).toBe(false);
    expect(tax.evidence).toContain("2 state bills became law");
    expect(unwrittenArrays(reader)).toEqual(["taxPolicies"]);
  });

  it(
    "runs a watched world with the Day button and writes a traceable chronicle",
    { timeout: 300_000 },
    () => {
      const options = {
        years: 1,
        days: 3,
        seed: "report-test",
        placeKey: "3918000",
      };
      const run = runWorldReport(options);
      expect(run.stopped).toBeNull();
      expect(run.daysPressed).toBe(3);
      expect(run.world.control.kind).toBe("observer");
      const markdown = worldReportMarkdown(run);
      expect(markdown).toMatch(
        /^# Columbus, Ohio, with nobody played: \d+ things a living world should show never happened\n/,
      );
      expect(markdown).toContain("from January 5, 2026 to January 8, 2026");
      expect(markdown).toContain("## What never happened");
      expect(markdown).toContain("## Month by month");
      // Every chronicle line names the records it came from.
      for (const line of markdown.split("\n"))
        if (/^- [A-Z][a-z]+ \d{1,2}: /.test(line))
          expect(line).toMatch(/<!-- \S+/);
      // The report ends with the place's vital statistics, start and end,
      // each read from the world; nothing unrecorded reads as zero.
      const vitals = markdown.slice(markdown.indexOf("## Vital statistics"));
      expect(markdown.indexOf("## Vital statistics")).toBeGreaterThan(
        markdown.indexOf("## How this was made"),
      );
      expect(run.vitalsAtStart?.date).toBe("2026-01-05");
      const people = vitals.match(
        /^\| People living in the place \| the place \| ([\d,]+) \| ([\d,]+) \|$/m,
      );
      expect(people).not.toBeNull();
      expect(Number(people![1]!.replace(/,/g, ""))).toBeGreaterThan(0);
      expect(vitals).toMatch(
        /^\| Median household income \| the place \| not recorded: /m,
      );
      expect(vitals).toMatch(/^\| Governor's party \| the state \| .+\(/m);
      expect(vitals).toMatch(/^\| Births, first year and last year \|/m);
      // The same seed tells the same story.
      expect(worldReportMarkdown(runWorldReport(options))).toBe(markdown);
    },
  );
});
