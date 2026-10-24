/**
 * Checks the deep-past, partnership, school-peer and opening-profile rows of
 * src/core2/data/parameters.json against the research files they come from,
 * and that each per-place research file covers the same 56 places and the
 * nation. Exits 1 on a mismatch. The year proof (deep-past-year.ts) runs the
 * same check before its year and reads the bands from here.
 * Run: node --import tsx scripts/research/deep-past-check.ts
 */
import partnerGapJson from "../../data/research/core/cps-asec-2023-partner-age-gap.json" with { type: "json" };
import gradeByAgeJson from "../../data/research/core/cps-2024-grade-by-age.json" with { type: "json" };
import classSizeJson from "../../data/research/core/nces-ntps-2021-class-size.json" with { type: "json" };
import attainmentJson from "../../data/research/core/acs-2023-b15001-attainment-by-state.json" with { type: "json" };
import bornInStateJson from "../../data/research/core/acs-2023-b05002-born-in-state.json" with { type: "json" };
import faithJson from "../../data/research/core/pew-rls-2023-24-faith-by-state.json" with { type: "json" };
import jointUseJson from "../../data/research/core/shpps-2012-joint-use.json" with { type: "json" };
import parametersJson from "../../src/core2/data/parameters.json" with { type: "json" };
import partnershipJson from "../../src/core2/data/opening-partnership.json" with { type: "json" };
import deepPastJson from "../../src/core2/data/deep-past.json" with { type: "json" };

type Shares = Record<string, number>;
interface Row {
  value: number;
  tag: string;
  estimatedFrom?: string;
  stopgapId?: string;
  spread?: { low?: number; high?: number };
}
interface Tail {
  thousands: number;
  meanGapYears: number;
  widthMatchingMean: number;
}
interface GapBand {
  low: number | null;
  high: number | null;
  thousands: number;
}

export const partnerGap = partnerGapJson as unknown as {
  couples: Record<
    string,
    {
      bands: GapBand[];
      weightedThousands: number;
      openRowTails?: Record<
        "olderManOrHusband" | "olderWomanOrWife" | "pooled",
        Tail
      >;
    }
  >;
};
export const gradeByAge = gradeByAgeJson as unknown as {
  grades: string[];
  ages: Record<string, Record<string, number>>;
};
export const classSize = classSizeJson as unknown as {
  cells: { level: string; classType: string; students: number }[];
};
export const attainment = attainmentJson as unknown as {
  ageBands: string[];
  places: Record<
    string,
    { tag: string; studyGroupShares: Record<string, Shares> }
  >;
};
export const bornInState = bornInStateJson as unknown as {
  places: Record<string, { tag: string; bornWhereTheyLiveShare: number }>;
};
export const faith = faithJson as unknown as {
  places: Record<string, { tag: string; studyGroupShares: Shares }>;
};
export const jointUse = jointUseJson as unknown as {
  overall: { share: number; low: number; high: number };
};
const parameters = parametersJson as unknown as Record<string, Row>;
export const row = (key: string): Row => {
  const found = parameters[key];
  if (!found) throw new Error(`No parameter row ${key}`);
  return found;
};

const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

/** The grade most children of this age are enrolled in (the modal grade). */
export function modalGrade(age: number): string {
  const counts = gradeByAge.ages[String(age)]!;
  return gradeByAge.grades.reduce((best, grade) =>
    (counts[grade] ?? 0) > (counts[best] ?? 0) ? grade : best,
  );
}

/** The youngest age whose modal grade is this one. */
export function modalAge(grade: string): number {
  const ages = Object.keys(gradeByAge.ages)
    .map(Number)
    .sort((a, b) => a - b);
  const age = ages.find((a) => modalGrade(a) === grade);
  if (age === undefined) throw new Error(`No age has modal grade ${grade}`);
  return age;
}

/** Mean grade (kindergarten 0) of the children of this age enrolled in kindergarten through grade 12. */
function meanGrade(age: number): number {
  const counts = gradeByAge.ages[String(age)]!;
  const ladder = gradeByAge.grades.filter((grade) => grade !== "nursery");
  let weight = 0;
  let sum = 0;
  ladder.forEach((grade, step) => {
    weight += counts[grade] ?? 0;
    sum += step * (counts[grade] ?? 0);
  });
  return sum / weight;
}

/** Years to reach a grade from kindergarten at the mean pace from age 6 to that grade's modal age. */
export function yearsAtMeanPace(grade: string): number {
  const steps = gradeByAge.grades.filter((g) => g !== "nursery").indexOf(grade);
  const base = modalAge("01");
  const age = modalAge(grade);
  const pace = (meanGrade(age) - meanGrade(base)) / (age - base);
  return steps / pace;
}

export function checkDeepPastResearch(): string[] {
  const failures: string[] = [];
  const expect = (ok: boolean, message: string) => {
    if (!ok) failures.push(message);
  };

  // Partner age gap: the microdata reproduces Table FG3 and gives the width.
  const married = partnerGap.couples["married-os"]!;
  const fg3 = (
    partnershipJson as unknown as { spouseAgeGap: { rows: GapBand[] } }
  ).spouseAgeGap.rows;
  for (const band of fg3) {
    const counted = married.bands.find(
      (row) => row.low === band.low && row.high === band.high,
    );
    expect(
      !!counted && Math.abs(counted.thousands - band.thousands) <= 5,
      `CPS microdata band ${band.low}..${band.high} (${counted?.thousands}) does not match Table FG3 (${band.thousands}).`,
    );
  }
  const tails = married.openRowTails!;
  for (const tail of Object.values(tails))
    expect(
      Math.abs(tail.widthMatchingMean - (2 * (tail.meanGapYears - 20) + 1)) <
        0.02,
      "An open-row width does not follow from its mean gap.",
    );
  const gap = row("spouseAgeGapOpenRowYears");
  expect(
    gap.value === Math.round(tails.pooled.widthMatchingMean),
    `spouseAgeGapOpenRowYears ${gap.value} is not the pooled open-row width ${tails.pooled.widthMatchingMean}.`,
  );
  expect(
    gap.spread?.low === Math.round(tails.olderManOrHusband.widthMatchingMean) &&
      gap.spread?.high === Math.round(tails.olderWomanOrWife.widthMatchingMean),
    "spouseAgeGapOpenRowYears spread is not the two open rows' widths.",
  );

  // School offsets: ESTIMATED, converted from the modal ages of the CPS October
  // table. Modal age is a cross-sectional enrollment count, so the table does
  // not time any child's entry into a grade; the value is the difference of
  // two modal ages and the spread's high end uses the mean pace of enrolled
  // children, which counts children held back.
  const stages = (
    deepPastJson as unknown as {
      schools: {
        stages: { startOffsetParameter: string; entryGrade: string }[];
      };
    }
  ).schools.stages;
  for (const stage of stages) {
    if (stage.startOffsetParameter === "zero") {
      expect(stage.entryGrade === "KG", "The first stage is not kindergarten.");
      continue;
    }
    const name = stage.startOffsetParameter;
    const offset = row(name);
    const years = modalAge(stage.entryGrade) - modalAge("KG");
    const upper = round(yearsAtMeanPace(stage.entryGrade), 2);
    expect(
      offset.tag === "ESTIMATED",
      `${name} is tagged ${offset.tag}, not ESTIMATED: it is the difference of two modal ages, and a cross-sectional enrollment table does not time individual grade entries.`,
    );
    expect(
      !!offset.estimatedFrom?.trim() && !!offset.stopgapId,
      `${name} is ESTIMATED and needs estimatedFrom (the modal-age difference and the mean-pace upper bound, with their limits) and its stopgapId.`,
    );
    expect(
      offset.value === years,
      `${name} ${offset.value} is not the modal-age difference ${years} (modal age of ${stage.entryGrade} minus modal age of KG).`,
    );
    expect(
      offset.spread?.low === years && offset.spread?.high === upper,
      `${name} spread is not ${years} (modal-age difference) to ${upper} (mean-pace upper bound).`,
    );
  }

  // Peer group: inside the class sizes, spread is their range.
  const sizes = classSize.cells.map((cell) => cell.students);
  const peers = row("openingPeerGroupSize");
  expect(
    peers.spread?.low === Math.min(...sizes) &&
      peers.spread?.high === Math.max(...sizes),
    "openingPeerGroupSize spread is not the class-size range.",
  );
  expect(
    peers.value >= Math.min(...sizes) && peers.value <= Math.max(...sizes),
    "openingPeerGroupSize is outside the class sizes.",
  );

  // Per-place files: the same places everywhere, shares that add up.
  const keys = (places: object) => Object.keys(places).sort().join(",");
  const placeKeys = keys(attainment.places);
  expect(
    Object.keys(attainment.places).length === 57,
    "The attainment file does not hold the 56 places and the nation.",
  );
  for (const [name, places] of [
    ["born-in-state", bornInState.places],
    ["faith", faith.places],
  ] as const)
    expect(keys(places) === placeKeys, `The ${name} file covers other places.`);
  const sumsToOne = (shares: Shares) =>
    Math.abs(Object.values(shares).reduce((a, b) => a + b, 0) - 1) < 0.002;
  for (const [key, place] of Object.entries(attainment.places))
    for (const band of attainment.ageBands)
      expect(
        sumsToOne(place.studyGroupShares[band]!),
        `Attainment shares for ${key} ${band} do not add to 1.`,
      );
  for (const [key, place] of Object.entries(faith.places))
    expect(
      sumsToOne(place.studyGroupShares),
      `Faith shares for ${key} do not add to 1.`,
    );
  for (const [key, place] of Object.entries(bornInState.places))
    expect(
      place.bornWhereTheyLiveShare > 0 && place.bornWhereTheyLiveShare < 1,
      `Born-in-place share for ${key} is not a share.`,
    );
  expect(
    jointUse.overall.low <= jointUse.overall.share &&
      jointUse.overall.share <= jointUse.overall.high,
    "The joint-use share is outside its interval.",
  );
  return failures;
}

if (process.argv[1]?.endsWith("deep-past-check.ts")) {
  const failures = checkDeepPastResearch();
  for (const failure of failures) console.error(failure);
  if (failures.length) process.exit(1);
  const pooled = partnerGap.couples["married-os"]!.openRowTails!.pooled;
  console.log(
    `spouseAgeGapOpenRowYears ${row("spouseAgeGapOpenRowYears").value}: pooled open-row mean gap ${pooled.meanGapYears} years.`,
  );
  console.log(
    `school offsets (ESTIMATED, converted from modal ages): grade 6 is modal at ${modalAge("06")}, grade 9 at ${modalAge("09")}, kindergarten at ${modalAge("KG")}; mean-pace upper bounds are ${round(yearsAtMeanPace("06"), 2)} and ${round(yearsAtMeanPace("09"), 2)} years.`,
  );
  console.log(
    `openingPeerGroupSize ${row("openingPeerGroupSize").value}: class sizes ${Math.min(...classSize.cells.map((c) => c.students))} to ${Math.max(...classSize.cells.map((c) => c.students))}.`,
  );
  console.log("Deep-past research rows match their files.");
}
