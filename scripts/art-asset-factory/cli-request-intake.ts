/**
 * Usage:
 *   cli-request-intake.ts file <record.json>   file one record into the queue
 *   cli-request-intake.ts list                 show the open queue
 *   cli-request-intake.ts check                validate every record, as a gate
 *   cli-request-intake.ts promote <requestId>  carry one record into the bench
 *
 * HOW A REQUEST ACTUALLY REACHES HIM. A request reaches the Art Desk by being
 * committed to `art/requests/asset-requests.json` and pushed: the Desk
 * workspace tracks the published head and re-pulls. No Drive, no inbox, no
 * connector. `01_INBOX` carries finished artwork BACK; a request has no image,
 * so a request placed there is rejected as "missing or not an image".
 * Requests out through the repository, candidates back through the exchange.
 *
 * Filing a record is therefore not sending it. `file` puts a gap in the queue;
 * `promote` is what puts it in front of him, and until this command existed
 * nothing did — every record filed since the intake was built has sat in
 * `art/requests/incoming/` where the Desk never looks.
 *
 * WHAT PROMOTE WILL NOT DO. It carries what the record and its promotion file
 * hold and stops. It emits nothing for a field neither of them carries — no
 * geometry floor, no container, no style authority and above all no inventory
 * check, which records which paths and Drive locations were actually searched.
 * A plausible inventory check is a search nobody ran, written into the one file
 * the Desk trusts, and he would then be deciding against a fabricated
 * provenance. So an incomplete promotion writes nothing at all and exits
 * non-zero naming every field a human must supply.
 *
 * `file` takes the record as JSON on disk rather than as a wall of flags, so a
 * thread can write it with the tools it already has and so the thing that was
 * filed is exactly the thing that was reviewed. It exits non-zero on an invalid
 * record and writes nothing, because a queue nobody trusts is worse than no
 * queue.
 */

import fs from "fs";
import path from "path";

import {
  ART_REQUEST_INTAKE_DIRECTORY,
  IntakePromotionError,
  openIntakeRecords,
  promoteToAssetRequest,
  summarizeArtRequestIntake,
  unfilledPromotionFields,
  validateArtRequestIntake,
  type ArtRequestIntakeRecord,
  type PromotionInputs,
} from "../../src/authoring/art-request-intake";
import {
  validateAssetRequests,
  type AssetRequest,
  type AssetRequestDocument,
} from "../../src/authoring/asset-request";
import {
  IntakeFileExistsError,
  loadIntakeRecords,
  writeIntakeRecord,
} from "./request-intake-store";
import { writeFormatted } from "./write-formatted";

/** The registry the Art Desk reads. Committing to it is how a request is sent. */
const ASSET_REQUESTS_PATH = "art/requests/asset-requests.json";

/**
 * Where a promotion's bench-supplied half lives.
 *
 * A separate directory, not a sibling file in the queue: `incoming/` is loaded
 * whole as intake records, so a second JSON shape sitting in it is read as a
 * malformed record and fails the gate for everybody.
 */
const PROMOTION_INPUTS_DIRECTORY = "art/requests/promotions";

function promotionInputsPath(requestId: string): string {
  return `${PROMOTION_INPUTS_DIRECTORY}/${requestId}.json`;
}

const repositoryRoot = process.cwd();
const [command, argument] = process.argv.slice(2);

function report(records: readonly ArtRequestIntakeRecord[]): boolean {
  const validation = validateArtRequestIntake(records);
  for (const finding of validation.findings) {
    const mark = finding.severity === "error" ? "ERROR" : "warn ";
    console.error(`${mark} ${finding.requestId}: ${finding.message}`);
  }
  return validation.valid;
}

function loadAll(): readonly ArtRequestIntakeRecord[] {
  const loaded = loadIntakeRecords(repositoryRoot);
  for (const bad of loaded.unreadable) {
    console.error(`ERROR ${bad.filePath}: ${bad.reason}`);
  }
  if (loaded.unreadable.length > 0) process.exit(1);
  return loaded.records.map((entry) => entry.record);
}

if (command === "file") {
  if (!argument) {
    console.error("Usage: cli-request-intake.ts file <record.json>");
    process.exit(2);
  }
  const record = JSON.parse(
    fs.readFileSync(path.resolve(argument), "utf8"),
  ) as ArtRequestIntakeRecord;
  const existing = loadAll();
  if (!report([...existing, record])) {
    console.error("Nothing was filed.");
    process.exit(1);
  }
  try {
    const written = await writeIntakeRecord(repositoryRoot, record);
    console.log(
      `Filed ${record.requestId} at ${path.relative(repositoryRoot, written)}`,
    );
  } catch (cause) {
    if (cause instanceof IntakeFileExistsError) {
      console.error(cause.message);
      process.exit(1);
    }
    throw cause;
  }
} else if (command === "list") {
  const records = loadAll();
  const open = openIntakeRecords(records);
  for (const record of open) {
    const where =
      record.jurisdiction.scope === "specific"
        ? `${record.jurisdiction.displayName}${
            record.jurisdiction.stateCode
              ? `, ${record.jurisdiction.stateCode}`
              : ""
          }`
        : "any jurisdiction";
    console.log(
      `${record.priority} ${record.requestId} — ${record.title} [${where}] (${record.requestedBy}, ${record.origin})`,
    );
  }
  const summary = summarizeArtRequestIntake(records);
  console.log(
    `\n${summary.open} open of ${summary.total} in ${ART_REQUEST_INTAKE_DIRECTORY}; P0 ${summary.byPriority.P0}, P1 ${summary.byPriority.P1}, P2 ${summary.byPriority.P2}.`,
  );
} else if (command === "check") {
  const records = loadAll();
  if (!report(records)) process.exit(1);
  console.log(`${records.length} intake record(s) valid.`);
} else if (command === "promote") {
  if (!argument) {
    console.error("Usage: cli-request-intake.ts promote <requestId>");
    process.exit(2);
  }
  const records = loadAll();
  const record = records.find((entry) => entry.requestId === argument);
  if (!record) {
    console.error(
      `No intake record '${argument}' in ${ART_REQUEST_INTAKE_DIRECTORY}.`,
    );
    process.exit(2);
  }
  if (!report([record])) {
    console.error("The record itself is invalid. Nothing was promoted.");
    process.exit(1);
  }

  const inputsFile = path.join(repositoryRoot, promotionInputsPath(argument));
  const inputs: Partial<PromotionInputs> = fs.existsSync(inputsFile)
    ? (JSON.parse(
        fs.readFileSync(inputsFile, "utf8"),
      ) as Partial<PromotionInputs>)
    : {};

  const unfilled = unfilledPromotionFields(record, inputs);
  if (unfilled.length > 0) {
    console.error(
      `Cannot promote '${argument}': ${unfilled.length} field(s) only a human can answer. Nothing was written.`,
    );
    for (const field of unfilled) console.error(`  - ${field}`);
    console.error(
      `\nAnswer them in ${promotionInputsPath(argument)} and run this again. None of them is defaulted, because a default here becomes a fact the Art Desk shows him as checked.`,
    );
    process.exit(1);
  }

  const complete: PromotionInputs = {
    repositoryPathsSearched: inputs.repositoryPathsSearched ?? [],
    driveLocationsSearched: inputs.driveLocationsSearched ?? [],
    found: inputs.found!,
    shortfall: inputs.shortfall!,
    generationRecipe: inputs.generationRecipe!,
    acceptanceCriteria: inputs.acceptanceCriteria!,
    target: {
      ...inputs.target!,
      targetClass: inputs.target!.targetClass ?? record.targetClass!,
    },
    ...(inputs.generationHold ? { generationHold: inputs.generationHold } : {}),
  };

  let promoted: AssetRequest;
  try {
    promoted = promoteToAssetRequest(record, complete);
  } catch (cause) {
    if (cause instanceof IntakePromotionError) {
      console.error(cause.message);
      console.error("Nothing was written.");
      process.exit(1);
    }
    throw cause;
  }

  const registryPath = path.join(repositoryRoot, ASSET_REQUESTS_PATH);
  const document = JSON.parse(
    fs.readFileSync(registryPath, "utf8"),
  ) as AssetRequestDocument;
  const requests = [...document.requests];
  const existingIndex = requests.findIndex(
    (entry) => entry.requestId === promoted.requestId,
  );
  const entry: AssetRequest =
    existingIndex >= 0
      ? {
          ...promoted,
          requestVersion: requests[existingIndex].requestVersion + 1,
        }
      : promoted;
  if (existingIndex >= 0) requests[existingIndex] = entry;
  else requests.push(entry);

  const validation = validateAssetRequests(requests);
  for (const finding of validation.findings) {
    const mark = finding.severity === "error" ? "ERROR" : "warn ";
    console.error(`${mark} ${finding.requestId}: ${finding.message}`);
  }
  if (!validation.valid) {
    console.error(
      `The promoted entry does not satisfy the bench registry. Nothing was written.`,
    );
    process.exit(1);
  }

  await writeFormatted(
    registryPath,
    JSON.stringify({ ...document, requests }, null, 2),
  );
  console.log(
    `${existingIndex >= 0 ? "Re-promoted" : "Promoted"} ${entry.requestId} into ${ASSET_REQUESTS_PATH} as requestVersion ${entry.requestVersion}, status ${entry.status}.`,
  );
  const notCarried = [
    record.missing ? "missing" : "",
    record.environmentClass ? "environmentClass" : "",
    record.notes?.length ? "notes" : "",
  ].filter(Boolean);
  if (notCarried.length > 0) {
    console.log(
      `Not carried into the registry, which has no counterpart for them: ${notCarried.join(", ")}. They stay in ${ART_REQUEST_INTAKE_DIRECTORY}/${argument}.json.`,
    );
  }
  if (!record.promotedToRequestId) {
    const recordPath = path.join(
      repositoryRoot,
      `${ART_REQUEST_INTAKE_DIRECTORY}/${argument}.json`,
    );
    await writeFormatted(
      recordPath,
      `${JSON.stringify({ ...record, promotedToRequestId: entry.requestId }, null, 2)}\n`,
    );
    console.log(
      `Closed the intake record: it now names the bench request it became, so the open queue stops offering it again.`,
    );
  }
  console.log(
    `Commit and push ${ASSET_REQUESTS_PATH} — that, and only that, is what puts it on his Art Desk.`,
  );
} else {
  console.error(
    "Usage: cli-request-intake.ts <file <record.json> | list | check | promote <requestId>>",
  );
  process.exit(2);
}
