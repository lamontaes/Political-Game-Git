import {
  getCurrentBranch,
  getHeadSha,
  getStagedFiles,
  getUnstagedFiles,
  getUntrackedFiles,
} from "./utils";
import { runInventory } from "./inventory";
import { checkReproducibility } from "./reproducibility";

export interface ReceiptPayload {
  taskId: string;
  branch: string;
  startingHeadSha: string;
  endingHeadSha: string;
  diffBasis: string;
  commandsExecuted: string[];
  testResults: string;
  unresolvedAssumptions: string[];
  artifactHashes: Record<string, string[]>; // From duplicates/inventory
  unexpectedChanges: string[]; // From repro
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  warnings: string[];
  isClean: boolean;
}

export interface Receipt {
  metadata: {
    timestamp: string;
  };
  payload: ReceiptPayload;
}

export function generateReceipt(taskId: string = "manual-run"): Receipt {
  const branch = getCurrentBranch();
  const startingHeadSha = getHeadSha(); // Record start

  const repro = checkReproducibility();
  const inventory = runInventory();

  const endingHeadSha = getHeadSha(); // Record end

  const stagedFiles = getStagedFiles();
  const unstagedFiles = getUnstagedFiles();
  const untrackedFiles = getUntrackedFiles();

  const warnings: string[] = [];
  if (inventory.hygieneAnomalies.length > 0)
    warnings.push("Hygiene anomalies detected.");
  if (Object.keys(inventory.duplicateHashes).length > 0)
    warnings.push("Duplicate files detected.");
  if (!repro.success)
    warnings.push("Reproducibility check failed with unexpected changes.");

  const isClean =
    stagedFiles.length === 0 &&
    unstagedFiles.length === 0 &&
    untrackedFiles.length === 0 &&
    warnings.length === 0;

  // Returning keys in deterministic order via a fresh object
  const payload: ReceiptPayload = {
    taskId,
    branch,
    startingHeadSha,
    endingHeadSha,
    diffBasis: repro.diffBasis,
    commandsExecuted: repro.commandsExecuted,
    testResults: repro.success ? "success" : "failed",
    unresolvedAssumptions: [], // Placeholder for pipeline
    artifactHashes: inventory.duplicateHashes,
    unexpectedChanges: repro.unexpectedChanges,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    warnings,
    isClean,
  };

  return {
    metadata: {
      timestamp: new Date().toISOString(),
    },
    payload,
  };
}

export function printReceipt(receipt: Receipt) {
  console.log(JSON.stringify(receipt, null, 2));
}
