/**
 * Authoritative Source Data Acquisition Tool for National Names V2
 *
 * Downloads raw 2020 Census and SSA research archives from official federal endpoints
 * and verifies cryptographic SHA-256 hashes.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

export interface SourceDownloadSpec {
  readonly id: string;
  readonly url: string;
  readonly filename: string;
  readonly expectedSha256?: string;
  readonly viaPlaywright?: boolean;
}

export const CENSUS_FIRST_NAMES_URL =
  "https://www2.census.gov/topics/genealogy/2020surnames/Names2020_FirstNames_Sex.xlsx";
export const CENSUS_SURNAMES_URL =
  "https://www2.census.gov/topics/genealogy/2020surnames/Names2020_LastNames_RaceHispanic.xlsx";
export const SSA_NATIONAL_URL = "https://www.ssa.gov/oact/babynames/names.zip";
export const SSA_STATE_URL =
  "https://www.ssa.gov/oact/babynames/state/namesbystate.zip";
export const SSA_TERRITORY_URL =
  "https://www.ssa.gov/oact/babynames/territory/namesbyterritory.zip";

export const SOURCE_SPECS: SourceDownloadSpec[] = [
  {
    id: "census_2020_first_names",
    url: CENSUS_FIRST_NAMES_URL,
    filename: "Names2020_FirstNames_Sex.xlsx",
    expectedSha256:
      "b763374b9b0ea4a9496f8563721312e8572e5a45136d34244db9ffba666c3326",
    viaPlaywright: false,
  },
  {
    id: "census_2020_surnames",
    url: CENSUS_SURNAMES_URL,
    filename: "Names2020_LastNames_RaceHispanic.xlsx",
    expectedSha256:
      "2e773c7edd934bb340b09be46e5d991b74a65cd63f547c94f80b6e233db462b3",
    viaPlaywright: false,
  },
  {
    id: "ssa_national_1880_2025",
    url: SSA_NATIONAL_URL,
    filename: "names.zip",
    expectedSha256:
      "cd78e975ed7bb358e018dd62fbe14ced89295e9581c49172ca4eedcb011b3724",
    viaPlaywright: true,
  },
  {
    id: "ssa_state",
    url: SSA_STATE_URL,
    filename: "namesbystate.zip",
    expectedSha256:
      "e8aaf58e3838ec2a2aa880635014744ba20f74941a2688ac36723acaf604d66a",
    viaPlaywright: true,
  },
  {
    id: "ssa_territory",
    url: SSA_TERRITORY_URL,
    filename: "namesbyterritory.zip",
    expectedSha256:
      "0a387cfd536287d3332a7680da98286db2fab6ea67244470eae18f03086f72a9",
    viaPlaywright: true,
  },
];

export async function acquireSources(
  targetDir: string,
  force = false,
): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true });

  let playwrightBrowser: Awaited<ReturnType<typeof chromium.launch>> | null =
    null;
  let playwrightPage: Awaited<
    ReturnType<typeof playwrightBrowser.newPage>
  > | null = null;

  try {
    for (const spec of SOURCE_SPECS) {
      const destPath = path.join(targetDir, spec.filename);

      if (fs.existsSync(destPath) && !force) {
        const existingBuf = fs.readFileSync(destPath);
        const hash = crypto
          .createHash("sha256")
          .update(existingBuf)
          .digest("hex");
        if (spec.expectedSha256 && hash === spec.expectedSha256) {
          console.log(
            `[OK] Already cached: ${spec.filename} (sha256: ${hash})`,
          );
          continue;
        }
      }

      console.log(`[Downloading] ${spec.filename} from ${spec.url}...`);

      let buffer: Buffer;

      if (spec.viaPlaywright) {
        if (!playwrightBrowser) {
          playwrightBrowser = await chromium.launch({ headless: true });
          playwrightPage = await playwrightBrowser.newPage();
          await playwrightPage.goto(
            "https://www.ssa.gov/oact/babynames/limits.html",
            {
              waitUntil: "domcontentloaded",
            },
          );
        }
        const response = await playwrightPage!.request.get(spec.url);
        if (!response.ok()) {
          throw new Error(
            `Failed to download ${spec.url}: HTTP ${response.status()} ${response.statusText()}`,
          );
        }
        buffer = await response.body();
      } else {
        const response = await fetch(spec.url);
        if (!response.ok) {
          throw new Error(
            `Failed to download ${spec.url}: HTTP ${response.status} ${response.statusText}`,
          );
        }
        buffer = Buffer.from(await response.arrayBuffer());
      }

      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

      if (spec.expectedSha256 && sha256 !== spec.expectedSha256) {
        console.warn(
          `[Warning] SHA-256 mismatch for ${spec.filename}: expected ${spec.expectedSha256}, got ${sha256}`,
        );
      }

      fs.writeFileSync(destPath, buffer);
      console.log(
        `[Saved] ${spec.filename} (${buffer.length} bytes, sha256: ${sha256})`,
      );
    }
  } finally {
    if (playwrightBrowser) {
      await playwrightBrowser.close();
    }
  }
}

async function main() {
  const defaultDir = path.resolve(process.cwd(), ".cache/names-raw");
  const targetDir = process.argv.includes("--target")
    ? process.argv[process.argv.indexOf("--target") + 1]
    : defaultDir;
  const force = process.argv.includes("--force");

  console.log(
    `Acquiring National Names V2 authoritative sources into: ${targetDir}`,
  );
  await acquireSources(targetDir, force);
  console.log("Acquisition complete.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Acquisition failed:", err);
    process.exit(1);
  });
}
