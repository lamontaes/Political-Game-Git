import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

/** Scan every emitted/copied byte, including maps and public assets. */
export function scanPublicBuild(
  directory: string,
  privateValues: readonly string[],
) {
  const failures: string[] = [];
  let files = 0;
  function visit(path: string) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      failures.push(`${path}: symlink in distributable`);
      return;
    }
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) visit(join(path, name));
      return;
    }
    files++;
    const bytes = readFileSync(path);
    for (const value of privateValues.filter(Boolean)) {
      if (
        [value, encodeURI(value), value.replaceAll("/", "\\/")].some((needle) =>
          bytes.includes(needle),
        )
      )
        failures.push(`${path}: local provenance`);
    }
    const text = bytes.toString("utf8");
    if (
      /"(?:pid|runId|workspace|sourceDigest)"\s*:/.test(text) ||
      text.includes("/__dev/identity") ||
      path.endsWith("/build-identity.json")
    )
      failures.push(`${path}: development identity`);
  }
  visit(directory);
  if (failures.length)
    throw new Error(
      `Distributable privacy check failed:\n${failures.join("\n")}`,
    );
  return { files };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const result = scanPublicBuild(resolve(process.argv[2] ?? "dist/client"), [
    process.cwd(),
    homedir(),
    process.env.PG_RUN_ID ?? "",
  ]);
  process.stdout.write(`Public build privacy: ${result.files} files checked\n`);
}
