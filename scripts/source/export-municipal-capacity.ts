/** One-way export of the accepted Census observations. No identity inference. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "../..");
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
writeFileSync(
  resolve(root, "src/simulation/municipal-capacity.generated.json"),
  `${JSON.stringify(output)}\n`,
);
process.stdout.write(
  `Exported ${finance.length} finance and ${employment.length} employment records.\n`,
);
