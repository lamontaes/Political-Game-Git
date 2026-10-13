/**
 * Fetches FEMA's disaster declarations (since 2000) and Public Assistance
 * funded-project summaries (disasters declared since 2020) from OpenFEMA into
 * raw files under the given folder, for build-disasters.ts to compact.
 * Usage: npx tsx src/core2/tooling/fetch-disasters.ts <out-dir>
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
if (!out) throw new Error("Usage: fetch-disasters.ts <out-dir>");

async function all(url: string, entity: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let skip = 0; ; skip += 10000) {
    const page = (await (
      await fetch(`${url}&$top=10000&$skip=${skip}`)
    ).json()) as Record<string, unknown[]>;
    const batch = page[entity] ?? [];
    rows.push(...batch);
    if (batch.length < 10000) return rows;
  }
}

const base = "https://www.fema.gov/api/open";
const declarations = await all(
  `${base}/v2/DisasterDeclarationsSummaries?$filter=declarationDate%20ge%20'2000-01-01'&$select=disasterNumber,declarationDate,incidentType,declarationType,fipsStateCode,fipsCountyCode,incidentBeginDate,incidentEndDate,declarationTitle,state`,
  "DisasterDeclarationsSummaries",
);
writeFileSync(join(out, "declarations.json"), JSON.stringify(declarations));
const assistance = await all(
  `${base}/v1/PublicAssistanceFundedProjectsSummaries?$filter=declarationDate%20ge%20'2020-01-01'&$select=disasterNumber,declarationDate,state,county,applicantName,educationApplicant,federalObligatedAmount`,
  "PublicAssistanceFundedProjectsSummaries",
);
writeFileSync(join(out, "assistance.json"), JSON.stringify(assistance));
console.log(declarations.length, assistance.length);
