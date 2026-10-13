/**
 * Exports each policy position's bearing on the 14 values from the old
 * engine's authored policy packs into src/core2/data/views/policy-values.json,
 * so the new core reads them as data. Rerun after a pack changes.
 */
import { writeFileSync } from "node:fs";
import { US_POLICY_POSITIONS_PACK } from "../../src/simulation/policy-pack-us-policy-positions";

const pack = US_POLICY_POSITIONS_PACK as unknown as {
  principles: { key: string; name: string; description: string }[];
  propositions: {
    key: string;
    name: string;
    issue: string;
    principles: { principle: string; bearing: string; weight: number }[];
  }[];
};
const out = {
  version: "policy-values-v1",
  source:
    "Authored policy positions and their bearing on the 14 values, from src/simulation/policy-pack-us-policy-positions.ts (scripts/people/export-policy-principles.ts).",
  values: pack.principles.map((row) => ({ key: row.key, name: row.name })),
  policies: Object.fromEntries(
    pack.propositions.map((row) => [
      row.key,
      {
        issue: row.issue,
        bearings: Object.fromEntries(
          row.principles.map((p) => [
            p.principle,
            p.bearing === "against" ? -p.weight : p.weight,
          ]),
        ),
      },
    ]),
  ),
};
writeFileSync(
  "src/core2/data/views/policy-values.json",
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(
  out.values.length,
  "values",
  Object.keys(out.policies).length,
  "policies",
);
