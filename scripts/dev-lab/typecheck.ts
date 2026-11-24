import ts from "typescript";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { runConfig } from "./run-config";

// Incremental data belongs to this invocation, even when dependencies are
// symlinked to a shared installation. Preserve the original project contracts.
const run = runConfig();
const directory = resolve(run.artifacts, "typecheck");
mkdirSync(directory, { recursive: true });
const configs = ["app", "node"].map((name) => {
  const path = resolve(directory, `tsconfig.${name}.json`);
  const original = resolve(`tsconfig.${name}.json`);
  const config = ts.readConfigFile(original, ts.sys.readFile);
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  const types = (config.config.compilerOptions.types as string[]).map(
    (type) => {
      const result = ts.resolveTypeReferenceDirective(
        type,
        original,
        {},
        ts.sys,
      ).resolvedTypeReferenceDirective;
      if (!result)
        throw new Error(`Cannot resolve original type library ${type}`);
      return result.resolvedFileName;
    },
  );
  writeFileSync(
    path,
    JSON.stringify({
      extends: resolve(`tsconfig.${name}.json`),
      compilerOptions: {
        types,
        tsBuildInfoFile: resolve(directory, `${name}.tsbuildinfo`),
      },
    }),
  );
  return path;
});
const result = spawnSync(
  process.execPath,
  [
    resolve("node_modules/typescript/bin/tsc"),
    "-b",
    ...configs,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
