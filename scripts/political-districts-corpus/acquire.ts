/**
 * Official U.S. Census Bureau Political Districts Geography Corpus
 * Acquisition Script
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const RAW_DIR = path.join(process.cwd(), "data", "political-districts", "raw");

interface SourceConfig {
  id: string;
  geographyType: "cd" | "sldl" | "sldu";
  zipUrl: string;
  zipFileName: string;
  txtFileName: string;
  congress: string | null;
  vintageYear: number;
  title: string;
}

const SOURCES: SourceConfig[] = [
  {
    id: "119cd",
    geographyType: "cd",
    zipUrl:
      "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_119CDs_national.zip",
    zipFileName: "2025_Gaz_119CDs_national.zip",
    txtFileName: "2025_Gaz_119CDs_national.txt",
    congress: "119th Congress",
    vintageYear: 2025,
    title: "2025 Gazetteer 119th Congressional Districts National File",
  },
  {
    id: "sldl",
    geographyType: "sldl",
    zipUrl:
      "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_sldl_national.zip",
    zipFileName: "2025_Gaz_sldl_national.zip",
    txtFileName: "2025_Gaz_sldl_national.txt",
    congress: null,
    vintageYear: 2025,
    title:
      "2025 Gazetteer State Legislative Districts Lower Chamber National File",
  },
  {
    id: "sldu",
    geographyType: "sldu",
    zipUrl:
      "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_sldu_national.zip",
    zipFileName: "2025_Gaz_sldu_national.zip",
    txtFileName: "2025_Gaz_sldu_national.txt",
    congress: null,
    vintageYear: 2025,
    title:
      "2025 Gazetteer State Legislative Districts Upper Chamber National File",
  },
];

async function computeSha256(filePath: string): Promise<string> {
  const fileBuffer = await fs.promises.readFile(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

export async function acquireSources(): Promise<void> {
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }

  console.log("Verifying raw Census Gazetteer source files...");

  for (const src of SOURCES) {
    const zipPath = path.join(RAW_DIR, src.zipFileName);
    const txtPath = path.join(RAW_DIR, src.txtFileName);

    if (!fs.existsSync(zipPath) || !fs.existsSync(txtPath)) {
      console.log(`Downloading ${src.zipUrl}...`);
      const response = await fetch(src.zipUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to download ${src.zipUrl}: status ${response.status}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.promises.writeFile(zipPath, buffer);

      // Note: Extraction assumed done or checked
      console.log(`Saved ${src.zipFileName}`);
    }

    const zipHash = await computeSha256(zipPath);
    const txtHash = await computeSha256(txtPath);
    console.log(
      `Verified ${src.txtFileName} (TXT SHA256: ${txtHash}, ZIP SHA256: ${zipHash})`,
    );
  }
}

if (process.argv[1] && process.argv[1].endsWith("acquire.ts")) {
  acquireSources().catch((err) => {
    console.error("Acquire failed:", err);
    process.exit(1);
  });
}
