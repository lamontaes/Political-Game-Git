import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface LockfileVersionMetadata {
  readonly topLevelVersion: string;
  readonly rootPackageVersion: string;
}

function objectRecord(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${where}: must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

export function parseLockfileVersionMetadata(
  text: string,
  where = "package-lock.json",
): LockfileVersionMetadata {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${where}: not valid JSON (${(error as Error).message}).`);
  }

  const lockfile = objectRecord(parsed, where);
  if (typeof lockfile.version !== "string") {
    throw new Error(`${where}: top-level 'version' must be a string.`);
  }
  const packages = objectRecord(lockfile.packages, `${where}: 'packages'`);
  const rootPackage = objectRecord(packages[""], `${where}: packages[""]`);
  if (typeof rootPackage.version !== "string") {
    throw new Error(`${where}: packages[""].version must be a string.`);
  }

  return {
    topLevelVersion: lockfile.version,
    rootPackageVersion: rootPackage.version,
  };
}

export function readLockfileVersionMetadata(
  root: string,
): LockfileVersionMetadata {
  return parseLockfileVersionMetadata(
    readFileSync(join(root, "package-lock.json"), "utf8"),
  );
}

export function assertVersionMetadataAgreement(
  packageVersion: string,
  lockfile: LockfileVersionMetadata,
): void {
  if (
    lockfile.topLevelVersion !== packageVersion ||
    lockfile.rootPackageVersion !== packageVersion
  ) {
    throw new Error(
      `Release version drift: package.json.version is ${packageVersion}, ` +
        `package-lock.json.version is ${lockfile.topLevelVersion}, and ` +
        `package-lock.json packages[""].version is ${lockfile.rootPackageVersion}. ` +
        `All three locations must agree.`,
    );
  }
}

export function bumpLockfileVersion(
  text: string,
  from: string,
  to: string,
): string {
  const metadata = parseLockfileVersionMetadata(text);
  assertVersionMetadataAgreement(from, metadata);

  const parsed = objectRecord(JSON.parse(text), "package-lock.json");
  const packages = objectRecord(
    parsed.packages,
    "package-lock.json: 'packages'",
  );
  const rootPackage = objectRecord(
    packages[""],
    'package-lock.json: packages[""]',
  );
  parsed.version = to;
  rootPackage.version = to;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}
