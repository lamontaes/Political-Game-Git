import { fileURLToPath } from "node:url";
/** One-way export of the accepted Census observations. No identity inference. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "../..");
export function renderMunicipalCapacity(): string {
  const financeBytes = readFileSync(
    resolve(root, "data/source/government-finances/corpus.json"),
  );
  const employmentBytes = readFileSync(
    resolve(root, "data/source/public-employment/corpus.json"),
  );
  const finance: unknown = JSON.parse(financeBytes.toString());
  const employment: unknown = JSON.parse(employmentBytes.toString());
  if (!Array.isArray(finance) || !Array.isArray(employment))
    throw new Error("Expected accepted corpus arrays.");
  const sources = Object.fromEntries(
    ["government-finances", "public-employment"].flatMap((domain) => {
      const lock = JSON.parse(
        readFileSync(
          resolve(root, `data/source/${domain}/artifact-lock.json`),
          "utf8",
        ),
      ) as { artifacts: { artifactId: string; retrieval: { url: string } }[] };
      return lock.artifacts.map((artifact) => [
        artifact.artifactId,
        artifact.retrieval.url,
      ]);
    }),
  );
  const output = {
    sources,
    provenance: {
      financeSha256: createHash("sha256").update(financeBytes).digest("hex"),
      employmentSha256: createHash("sha256")
        .update(employmentBytes)
        .digest("hex"),
      meaning:
        "Dated publisher observations; no current balance, legal authority, or FTE inference.",
    },
    finance,
    employment,
  };
  return `${JSON.stringify(output)}\n`;
}
function main(): void {
  const output = renderMunicipalCapacity();
  const target = resolve(
    root,
    "src/simulation/municipal-capacity.generated.json",
  );
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== output)
      throw new Error(
        "Municipal capacity projection differs from its accepted source bytes and hashes.",
      );
    process.stdout.write("Municipal capacity regenerates byte-identically.\n");
  } else writeFileSync(target, output);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
