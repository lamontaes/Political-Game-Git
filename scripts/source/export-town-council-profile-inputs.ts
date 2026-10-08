import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { allGovernmentUnits } from "../../src/simulation/government-units";
import { municipalGovernmentForUnit } from "../../src/simulation/rule-capability-resolver";
import { primaryReading } from "../../src/simulation/municipal-government";
import type { TownCouncilProfileReading } from "../../src/simulation/town-council-profile-inputs";

const output = resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
  "src/simulation/town-council-profile-inputs.generated.ts",
);

/** Project existing admitted identity links and readings without changing them. */
export function townCouncilProfileInputs(): Readonly<
  Record<string, TownCouncilProfileReading>
> {
  const inputs: Record<string, TownCouncilProfileReading> = {};
  for (const unit of allGovernmentUnits()) {
    const government = municipalGovernmentForUnit(unit);
    if (!government) continue;
    const reading = primaryReading(government);
    inputs[unit.id] = {
      bodyName: reading.bodyName,
      bodySize: reading.bodySize,
      form: reading.form,
      evidence: reading.evidence,
    };
  }
  return inputs;
}

export async function renderTownCouncilProfileInputs(): Promise<string> {
  return format(
    "/** Generated from the existing municipal readings by scripts/source/export-town-council-profile-inputs.ts. */\n" +
      `export const TOWN_COUNCIL_PROFILE_INPUTS = ${JSON.stringify(townCouncilProfileInputs(), null, 2)} as const;\n`,
    { ...(await resolveConfig(output)), filepath: output },
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const rendered = await renderTownCouncilProfileInputs();
  if (process.argv.includes("--check")) {
    if (readFileSync(output, "utf8") !== rendered)
      throw new Error(
        "Town council profile inputs differ from municipal readings.",
      );
  } else {
    writeFileSync(output, rendered);
  }
}
