/// <reference types="node" />
import { existsSync } from "node:fs";

/** Public CI may omit private art, but that must never count as private proof. */
export function privateModularInputs(
  suite: string,
  paths: readonly string[],
  libraryReady = true,
): boolean {
  const missing = paths.filter((path) => !existsSync(path));
  if (!libraryReady) missing.push("compatible installed candidate library");
  if (!missing.length) return true;
  const report = { suite, privateCoverage: "NOT_TESTED", missing };
  if (process.env.MODULAR_REQUIRE_PRIVATE === "1")
    throw new Error(
      `Required private modular inputs missing: ${JSON.stringify(report)}`,
    );
  console.info(JSON.stringify(report));
  return false;
}
