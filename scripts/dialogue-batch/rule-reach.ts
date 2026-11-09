/**
 * How many lines each writing rule moves on the grade map: the lines holding
 * a feature the rule names, and the lines whose weight changes when the rule
 * is taken out. For the PR body and the words work's report.
 *
 *   node --import tsx scripts/dialogue-batch/rule-reach.ts
 *
 * A development tool. It never words anything.
 */
import { readFileSync } from "node:fs";
import type { CalibrationTable } from "../../src/english/calibration";
import type { PartGradeLedger } from "../../src/english/english-grades";
import { buildGradeMap, pieceFeatures } from "../../src/english/grade-map";
import {
  ledgerGrades,
  mapParameters,
  readMapPieces,
  readRules,
  spanGrades,
} from "./grade-map";

const table = JSON.parse(
  readFileSync("data/english/calibration.json", "utf8"),
) as CalibrationTable;
const ledger = JSON.parse(
  readFileSync("data/english/part-grades.json", "utf8"),
) as PartGradeLedger;
const pieces = readMapPieces(table.sceneClasses ?? {});
const grades = [...ledgerGrades(ledger, pieces), ...spanGrades(pieces)];
const rules = readRules();
const parameters = mapParameters(table);
const classes = table.registerClasses ?? {};
const full = buildGradeMap(pieces, grades, rules, classes, parameters);
const features = new Map(
  [...pieces].map(([key, piece]) => [key, new Set(pieceFeatures(piece))]),
);
console.log(
  "| Rule | Lines holding its features | Lines whose weight it moves |",
);
console.log("| --- | ---: | ---: |");
for (const rule of rules) {
  const holding = [...features.values()].filter((set) =>
    Object.keys(rule.features).some((feature) => set.has(feature)),
  ).length;
  const without = buildGradeMap(
    pieces,
    grades,
    rules.filter((other) => other.id !== rule.id),
    classes,
    parameters,
  );
  let moved = 0;
  for (const key of pieces.keys())
    if ((full.factors[key] ?? 1) !== (without.factors[key] ?? 1)) moved += 1;
  console.log(`| ${rule.id} | ${holding} | ${moved} |`);
}
