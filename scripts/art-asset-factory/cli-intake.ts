import { runIntake } from "./habs-intake";
import path from "path";

async function main() {
  const locItemId = "tx0398";
  const outputDir = path.resolve("art/references/plans/texas_senate/manifest");

  try {
    await runIntake({ locItemId, outputDir });
  } catch (error) {
    console.error("Intake failed:", error);
    process.exit(1);
  }
}

main();
