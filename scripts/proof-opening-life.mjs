import {
  cp,
  mkdir,
  readFile,
  symlink,
  writeFile,
  access,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

// Review the proposed root integration in a disposable copy; never edit UI-CORE's source.
const source = resolve(import.meta.dirname, "..");
const output = process.argv[2];
if (!output || !resolve(output).startsWith("/private/tmp/"))
  throw new Error("Supply a new /private/tmp/ proof directory.");
const target = resolve(output);
await mkdir(target); // Existing directories are refused, not overwritten.
for (const name of ["src", "tests"])
  await cp(join(source, name), join(target, name), { recursive: true });
for (const name of ["index.html", "package.json", "playwright.config.ts"])
  await cp(join(source, name), join(target, name));
for (const name of ["node_modules", "art", "public", "data", "sources"]) {
  try {
    await access(join(source, name));
  } catch {
    continue;
  }
  await symlink(join(source, name), join(target, name));
}
const patch = join(
  source,
  "docs/plans/evidence/opening-life1/ui-core-integration.patch",
);
execFileSync("git", ["apply", patch], { cwd: target });
await writeFile(
  join(target, "vite.config.ts"),
  `import react from '@vitejs/plugin-react';\nimport { defineConfig } from 'vite';\nexport default defineConfig({plugins:[react()],build:{outDir:'dist/client'},server:{fs:{allow:${JSON.stringify([source, target])}}}});\n`,
);
await writeFile(
  join(target, "OPENING-LIFE-PROOF.json"),
  JSON.stringify(
    {
      source,
      target,
      patch,
      scope:
        "Proposed normal-player root integration; UI-CORE acceptance pending; no deployment.",
    },
    null,
    2,
  ),
);
console.log(target);
