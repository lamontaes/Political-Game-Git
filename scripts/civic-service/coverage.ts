import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import {
  nationwideFundedServiceCoverage,
  renderFundedServiceCoverage,
} from "../../src/presentation/funded-service-capability";

/** Writes or checks the generated funded civic service coverage document. */
export const COVERAGE_PATH = "docs/systems/civic-service-coverage.md";

export async function renderCoverageDocument(): Promise<string> {
  return format(
    renderFundedServiceCoverage(nationwideFundedServiceCoverage()),
    {
      parser: "markdown",
    },
  );
}

async function main() {
  const text = await renderCoverageDocument();
  if (process.argv.includes("--check")) {
    const current = readFileSync(COVERAGE_PATH, "utf8");
    if (current !== text) {
      console.error(
        `${COVERAGE_PATH} is stale; run node --import tsx scripts/civic-service/coverage.ts`,
      );
      process.exit(1);
    }
    console.log(`${COVERAGE_PATH} is current.`);
    return;
  }
  writeFileSync(COVERAGE_PATH, text);
  console.log(`Wrote ${COVERAGE_PATH}.`);
}

if (process.argv[1]?.endsWith("coverage.ts")) void main();
