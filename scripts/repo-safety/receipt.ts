import { getCurrentBranch, getHeadSha, getFileHash } from "./utils";
import { checkReproducibility, type CommandResult } from "./reproducibility";
import { SAFETY_CONFIG } from "./config";
import fs from "fs";

export interface ReceiptPayload {
  taskId: string;
  branch: string;
  startingHeadSha: string;
  endingHeadSha: string;
  diffBasis: string;
  commandResults: CommandResult[];
  unresolvedAssumptions: string[];
  artifactHashes: Record<string, string>; // Maps file path to its hash explicitly
  unexpectedChanges: string[];
  warnings: string[];
}

export interface Receipt {
  metadata: {
    timestamp: string;
  };
  payload: ReceiptPayload;
}

function getExpectedArtifacts(): string[] {
  // Try to find files in allowed generated paths to record their hashes
  const artifacts: string[] = [];
  for (const dir of SAFETY_CONFIG.ALLOWED_GENERATED_PATHS) {
    if (fs.existsSync(dir)) {
      const walk = (d: string) => {
        const files = fs.readdirSync(d);
        for (const file of files) {
          const p = `${d}/${file}`;
          if (fs.statSync(p).isDirectory()) {
            walk(p);
          } else {
            artifacts.push(p);
          }
        }
      };
      walk(dir);
    }
  }
  return artifacts.sort(); // Deterministic ordering
}

export function generateReceipt(taskId: string = "manual-run"): Receipt {
  const branch = getCurrentBranch();
  const startingHeadSha = getHeadSha();

  const repro = checkReproducibility();

  const endingHeadSha = getHeadSha();

  const warnings: string[] = [];
  if (!repro.success)
    warnings.push(
      "Reproducibility check failed with unexpected changes or command failure.",
    );

  // Record hashes of relevant artifacts
  const artifactHashes: Record<string, string> = {};
  const artifacts = getExpectedArtifacts();
  for (const artifact of artifacts) {
    const hash = getFileHash(artifact);
    if (hash) {
      artifactHashes[artifact] = hash;
    }
  }

  // Returning keys in deterministic order via a fresh object
  const payload: ReceiptPayload = {
    taskId,
    branch,
    startingHeadSha,
    endingHeadSha,
    diffBasis: repro.diffBasis,
    commandResults: repro.commandResults,
    unresolvedAssumptions: [],
    artifactHashes,
    unexpectedChanges: repro.unexpectedChanges,
    warnings,
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
