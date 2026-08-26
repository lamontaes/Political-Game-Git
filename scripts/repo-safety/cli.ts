import { runInventory, printInventoryReport } from "./inventory";
import { checkRepositoryState } from "./guard";
import { generateReceipt, printReceipt } from "./receipt";
import { checkReproducibility } from "./reproducibility";

const command = process.argv[2];

if (!command) {
  console.error("Please provide a command: inventory, guard, receipt, repro");
  process.exit(1);
}

switch (command) {
  case "inventory": {
    const report = runInventory();
    printInventoryReport(report);
    if (report.hygieneAnomalies.length) {
      console.warn("\nWarning: Safety anomalies detected.");
    } else {
      console.log("\nRepo inventory clean.");
    }
    break;
  }
  case "guard": {
    const guardResult = checkRepositoryState();
    if (!guardResult.valid) {
      console.error("Repository tree guard failed:");
      guardResult.errors.forEach((e) => console.error(` - ${e}`));
      process.exit(1);
    } else {
      console.log("Repository tree passed safety checks.");
    }
    break;
  }
  case "receipt": {
    const receipt = generateReceipt("cli-run");
    printReceipt(receipt);
    break;
  }
  case "repro": {
    const reproResult = checkReproducibility();
    if (!reproResult.success) {
      console.error("Reproducibility check failed. Unexpected changes:");
      reproResult.unexpectedChanges.forEach((c) => console.error(` - ${c}`));
      process.exit(1);
    } else {
      console.log(
        "Reproducibility check passed. No unexpected changes from deterministic generators.",
      );
    }
    break;
  }
  default: {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}
