/**
 * School links the web does not run as their own (web-reach-schools). A link
 * whose cause another link from the same study already carries would count
 * the cause twice, so it names what carries it and the web does not run it.
 * A link whose cause the core does not record stays unwired and says so; the
 * scan below fails the day a cause is recorded, so the link gets sized then.
 * The retargeted spending link is held to the study's numbers.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  engineMeasure,
  keptOutcome,
  linkCoverage,
  WEB_LINKS,
  WIRED_INTO,
} from "./outcome-web-model";
import { nationalMeanWeight, subjectWeight } from "./outcome-web-reach";

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const ENGINE_FILE = readFileSync("src/core2/school-outcomes.ts", "utf8");

/** Every non-test source file of the new core, by path. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "data" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("school links another link from the same study carries", () => {
  const CARRIED = [
    {
      key: "prek-to-graduation",
      by: "universal-prek-to-graduation",
      study: "Gray-Lobe",
      measure: "school.graduation-pct",
    },
    {
      key: "child-coverage-to-graduation",
      by: "uninsured-to-graduation",
      study: "Cohodes",
      measure: "school.graduation-pct",
    },
    {
      key: "family-income-to-scores",
      by: "poverty-to-math-proficiency",
      study: "Dahl and Lochner",
      measure: "school.math-proficient-pct",
    },
  ] as const;

  for (const { key, by, study, measure } of CARRIED)
    it(`${key} is carried by ${by}, which the school engine reads for ${measure}`, () => {
      const carried = link(key);
      const carrier = link(by);
      // The same study on both rows.
      expect(carried.source, key).toContain(study);
      expect(carrier.source, by).toContain(study);
      // The carrier runs on the engine's own measure, and the school engine
      // reads that measure's factor for every student, by income fifth.
      expect(carrier.to).toBe(measure);
      expect(linkCoverage(carrier).wired, by).toBe(true);
      expect((WIRED_INTO.get(measure) ?? []).map((row) => row.key)).toContain(
        by,
      );
      expect(ENGINE_FILE).toContain("webReach(api, placeId, measure, {");
      expect(ENGINE_FILE).toContain("incomeFifth: fifth");
      expect(ENGINE_FILE).toMatch(new RegExp(`${measure.replace(".", "\\.")}`));
      // So the web does not also run the carried link.
      expect(carried.carriedBy).toContain(by);
      const coverage = linkCoverage(carried);
      expect(coverage.wired).toBe(false);
      expect("carriedBy" in coverage && coverage.carriedBy).toBe(
        carried.carriedBy,
      );
      for (const links of WIRED_INTO.values())
        expect(links.map((row) => row.key)).not.toContain(key);
    });

  it("calls the school engine for each tested kind once a year", () => {
    const school = readFileSync("src/core2/modules/school.ts", "utf8");
    expect(school).toMatch(/decideSchoolOutcome\(\s*api,\s*"graduation"/);
    expect(school).toContain('decideSchoolOutcome(api, "math"');
    expect(school).toContain('decideSchoolOutcome(api, "reading"');
  });

  it("leaves reading uncovered by family income, as the link says", () => {
    const reading = (WIRED_INTO.get("school.reading-proficient-pct") ?? []).map(
      (row) => row.from,
    );
    expect(reading).not.toContain("household.poverty-pct");
    expect(reading).not.toContain("household.income");
    expect(link("family-income-to-scores").carriedBy).toContain(
      "Reading is not carried",
    );
  });
});

describe("school links the core cannot feed yet", () => {
  const UNWIRED = [
    ["class-size-to-scores", "school.class-size-k3"],
    ["school-move-to-scores", "housing.mid-year-school-move"],
    ["police-killing-to-graduation", "police.killing-nearby"],
    ["daca-to-graduation", "immigration.deferred-action"],
    ["homicide-nearby-to-scores", "crime.homicide-on-block"],
    ["lead-to-reading", "health.blood-lead"],
    ["heat-to-learning", "env.school-year-temperature"],
    ["carbon-monoxide-to-absence", "env.carbon-monoxide"],
  ] as const;

  it("names a cause no engine in the new core records or reads", () => {
    const files = sources("src/core2").map((path) => ({
      path,
      text: readFileSync(path, "utf8"),
    }));
    for (const [key, cause] of UNWIRED) {
      const row = link(key);
      expect(row.from, key).toBe(cause);
      expect(row.carriedBy, key).toBeUndefined();
      expect(linkCoverage(row).wired, key).toBe(false);
      expect(row.notes, key).toMatch(/^Left unwired: /);
      // If this fails, the cause is recorded now: size the link from its
      // study in the engine's units (see the link's notes) and wire it.
      const naming = files
        .filter((file) => file.text.includes(cause))
        .map((file) => file.path);
      expect(naming, `${key} reads ${cause}`).toEqual([]);
    }
  });
});

describe("school links left as they were", () => {
  it("keeps the about-zero links at zero, with their research range", () => {
    const internet = link("home-internet-to-scores");
    expect(internet.size).toBe(0);
    expect(internet.evidence).toBe("about-zero");
    const tuition = link("tuition-freeze-to-college-completion");
    expect(tuition.size).toBe(0);
    expect(tuition.evidence).toBe("about-zero");
    expect(linkCoverage(tuition).wired).toBe(true);
  });

  it("keeps the enforcement link running on the web's ledger, with no engine behind it", () => {
    const enforcement = link("enforcement-to-hispanic-enrollment");
    expect(linkCoverage(enforcement).wired).toBe(true);
    expect(keptOutcome(enforcement.to)).toBe(true);
    const files = sources("src/core2").filter((path) =>
      readFileSync(path, "utf8").includes("school.hispanic-enrollment"),
    );
    // Only the school engine's stopgap marker and nothing that decides it.
    expect(files).toEqual([]);
  });
});

describe("the schools budget line carries the spending study into graduation", () => {
  const spending = link("school-spending-to-attainment");

  it("reads a cause the core records and moves the engine's graduation share", () => {
    expect(spending.from).toBe("budget.schools-added-pct");
    expect(engineMeasure(spending.from)).toBeDefined();
    expect(spending.to).toBe("school.graduation-pct");
    expect(spending.shape.kind).toBe("linear");
    expect(linkCoverage(spending).wired).toBe(true);
    expect(
      (WIRED_INTO.get("school.graduation-pct") ?? []).map((row) => row.key),
    ).toContain(spending.key);
  });

  it("is the study's graduation estimate in the web's unit, with its spread", () => {
    // NBER w20847 Table 3 column 5: 0.9523 (se 0.2898) on log spending,
    // graduation rate 0.86 (Table 1); a proportional change per percent.
    const coefficient = 0.9523;
    const se = 0.2898;
    const rate = 0.86;
    expect(spending.size!).toBeCloseTo(coefficient / 100 / rate, 4);
    const [low, high] = spending.range!;
    expect(low).toBeCloseTo((coefficient - 1.96 * se) / 100 / rate, 4);
    expect(high).toBeCloseTo((coefficient + 1.96 * se) / 100 / rate, 4);
    expect(low <= spending.size! && spending.size! <= high).toBe(true);
  });

  it("builds over a cohort's twelve school years", () => {
    expect(spending.phaseInMonths).toBe(12 * 12);
    expect(spending.phaseInSource).toContain("previous 12 years");
  });

  it("lands harder on low-income students, as the study's two groups do", () => {
    const row = spending.varies!.find((v) => v.by === "incomeFifth")!;
    expect(row.tag).toBe("ESTIMATED");
    expect(nationalMeanWeight(spending.key)).toBeCloseTo(1, 9);
    const low = subjectWeight(spending.key, { incomeFifth: 0 });
    const high = subjectWeight(spending.key, { incomeFifth: 4 });
    // 11.6 points on 79% against 6.0 points on 92%.
    expect(low / high).toBeCloseTo(11.6 / 79 / (6.0 / 92), 2);
    expect(subjectWeight(spending.key, { incomeFifth: 1 })).toBeCloseTo(low, 9);
    expect(subjectWeight(spending.key, { incomeFifth: 2 })).toBeCloseTo(
      high,
      9,
    );
  });
});
