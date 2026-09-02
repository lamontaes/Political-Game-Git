import { validateHUDCorpusIntegrity } from "../../src/hud_housing/hud-corpus.js";

function runValidation() {
  console.log("Validating official HUD Housing Cost Corpus integrity...");
  const result = validateHUDCorpusIntegrity();

  if (result.warnings.length > 0) {
    console.warn("Warnings:");
    for (const w of result.warnings) {
      console.warn(`  - ${w}`);
    }
  }

  if (!result.valid) {
    console.error("Validation FAILED with errors:");
    for (const e of result.errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  console.log("HUD Housing Cost Corpus validation PASSED cleanly.");
}

if (process.argv[1] && process.argv[1].endsWith("cli-validate.ts")) {
  runValidation();
}
