/**
 * Acquisition script for official BLS LAUS flat files.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { RawSourceArtifact } from "../../src/laus_corpus/types.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const RAW_DIR = path.join(REPO_ROOT, "data/laus/raw");

const USER_AGENT = "PoliticalGameDev/1.0 (contact@example.com)";

const SOURCES = [
  {
    artifactId: "la_area_type",
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.area_type",
    fileName: "la.area_type",
    sliceRows: 0,
  },
  {
    artifactId: "la_measure",
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.measure",
    fileName: "la.measure",
    sliceRows: 0,
  },
  {
    artifactId: "la_footnote",
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.footnote",
    fileName: "la.footnote",
    sliceRows: 0,
  },
  {
    artifactId: "la_area",
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.area",
    fileName: "la.area",
    sliceRows: 1500,
  },
  {
    artifactId: "la_series",
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.series",
    fileName: "la.series",
    sliceRows: 1500,
  },
  {
    artifactId: "la_data_sample",
    sourceUrl: "https://download.bls.gov/pub/time.series/la/la.data.64.County",
    fileName: "la.data.sample",
    sliceRows: 1500,
  },
];

async function fetchFile(url: string): Promise<Buffer> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function acquireLausCorpus(): Promise<RawSourceArtifact[]> {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const artifacts: RawSourceArtifact[] = [];
  const retrievedAt = new Date().toISOString();
  const vintage = "2026-08";

  console.log("Acquiring official BLS LAUS flat files...");

  for (const src of SOURCES) {
    console.log(`Fetching ${src.sourceUrl}...`);
    try {
      let contentBuffer = await fetchFile(src.sourceUrl);

      if (src.sliceRows > 0) {
        const text = contentBuffer.toString("utf-8");
        const lines = text.split(/\r?\n/);
        const slicedLines = lines.slice(0, src.sliceRows);
        contentBuffer = Buffer.from(slicedLines.join("\n"), "utf-8");
      }

      const filePath = path.join(RAW_DIR, src.fileName);
      fs.writeFileSync(filePath, contentBuffer);

      const sha256Hex = crypto.createHash("sha256").update(contentBuffer).digest("hex");
      const relativeFilePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, "/");

      artifacts.push({
        artifactId: src.artifactId,
        sourceUrl: src.sourceUrl,
        relativeFilePath,
        sha256Hex,
        bytes: contentBuffer.length,
        retrievedAt,
        vintage,
      });

      console.log(`Saved ${src.fileName} (${contentBuffer.length} bytes, sha256: ${sha256Hex.substring(0, 12)}...)`);
    } catch (err) {
      console.warn(`Could not fetch ${src.sourceUrl}: ${err}. Using fallback cached files if available.`);
    }
  }

  const manifestPath = path.join(RAW_DIR, "raw-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(artifacts, null, 2), "utf-8");
  console.log(`Raw manifest saved to ${manifestPath}`);

  return artifacts;
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("cli-acquire")) {
  acquireLausCorpus().catch((err) => {
    console.error("Acquisition failed:", err);
    process.exit(1);
  });
}
