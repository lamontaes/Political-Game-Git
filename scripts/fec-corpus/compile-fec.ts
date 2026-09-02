import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as https from "node:https";
import { execSync } from "node:child_process";
import {
  parseCandidateLine,
  parseCommitteeLine,
  parseLinkageLine,
} from "../../src/fec_corpus/fec-parser.js";
import type {
  FecCandidateRecord,
  FecCommitteeRecord,
  FecCorpusDataset,
  FecCorpusManifest,
  FecLinkageRecord,
  FecSourceArtifactManifest,
} from "../../src/fec_corpus/types.js";

const CYCLE = 2024;
const FEC_BULK_BASE_URL = `https://www.fec.gov/files/bulk-downloads/${CYCLE}/`;

const SOURCE_FILES = [
  { name: "cn24.zip", textName: "cn.txt", key: "candidates" },
  { name: "cm24.zip", textName: "cm.txt", key: "committees" },
  { name: "ccl24.zip", textName: "ccl.txt", key: "linkages" },
];

const DATA_DIR = path.resolve(process.cwd(), "data/fec");
const CACHE_DIR = path.join(DATA_DIR, "cache");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function sha256File(filepath: string): string {
  const buffer = fs.readFileSync(filepath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(
      url,
      { headers: { "User-Agent": "Political-Game-FEC-Compiler/1.0" } },
      (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          if (response.headers.location) {
            downloadFile(response.headers.location, destPath)
              .then(resolve)
              .catch(reject);
            return;
          }
        }
        if (response.statusCode !== 200) {
          reject(
            new Error(`Failed to download ${url}: HTTP ${response.statusCode}`),
          );
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => resolve());
        });
      },
    );
    request.on("error", (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

async function fetchAndExtractSource(
  zipName: string,
  textName: string,
  url: string,
): Promise<{ textPath: string; sha256Hex: string }> {
  const zipPath = path.join(CACHE_DIR, zipName);
  const textPath = path.join(CACHE_DIR, textName);

  if (!fs.existsSync(zipPath)) {
    console.log(`Downloading ${url}...`);
    await downloadFile(url, zipPath);
  }

  const sha256Hex = sha256File(zipPath);

  if (!fs.existsSync(textPath)) {
    console.log(`Extracting ${zipName}...`);
    execSync(`unzip -o "${zipPath}" -d "${CACHE_DIR}"`);
  }

  return { textPath, sha256Hex };
}

async function main() {
  ensureDirs();
  const isBounded = !process.argv.includes("--full");
  console.log(
    `Starting FEC ${CYCLE} Bulk Data compilation (${isBounded ? "Bounded Sample" : "Full Corpus"})...`,
  );

  const artifacts: FecSourceArtifactManifest[] = [];
  const candidates: FecCandidateRecord[] = [];
  const committees: FecCommitteeRecord[] = [];
  const linkages: FecLinkageRecord[] = [];

  for (const source of SOURCE_FILES) {
    const url = `${FEC_BULK_BASE_URL}${source.name}`;
    const { textPath, sha256Hex } = await fetchAndExtractSource(
      source.name,
      source.textName,
      url,
    );

    const content = fs.readFileSync(textPath, "latin1");
    const lines = content.split("\n");

    let count = 0;
    if (source.key === "candidates") {
      for (const line of lines) {
        if (!line.trim()) continue;
        const rec = parseCandidateLine(line);
        if (rec) {
          candidates.push(rec);
          count++;
        }
      }
    } else if (source.key === "committees") {
      for (const line of lines) {
        if (!line.trim()) continue;
        const rec = parseCommitteeLine(line);
        if (rec) {
          committees.push(rec);
          count++;
        }
      }
    } else if (source.key === "linkages") {
      for (const line of lines) {
        if (!line.trim()) continue;
        const rec = parseLinkageLine(line);
        if (rec) {
          linkages.push(rec);
          count++;
        }
      }
    }

    artifacts.push({
      artifactName: source.name,
      sourceUrl: url,
      retrievalTimestamp: new Date().toISOString().split("T")[0],
      sha256Hex,
      recordCount: count,
    });
  }

  let finalCandidates = candidates;
  let finalCommittees = committees;
  let finalLinkages = linkages;

  if (isBounded) {
    // Ensure representation of House (H), Senate (S), and Presidential (P) candidates, plus duplicate names
    const houseCands = candidates.filter((c) => c.office === "H").slice(0, 100);
    const senateCands = candidates.filter((c) => c.office === "S").slice(0, 30);
    const presCands = candidates.filter((c) => c.office === "P").slice(0, 20);

    const candMap = new Map<string, FecCandidateRecord>();
    for (const c of [...houseCands, ...senateCands, ...presCands]) {
      candMap.set(c.candidateId, c);
    }

    const candSet = new Set<string>(candMap.keys());
    const commSet = new Set<string>();

    for (const c of candMap.values()) {
      if (c.principalCampaignCommitteeId) {
        commSet.add(c.principalCampaignCommitteeId);
      }
    }

    // Select linkages associated with sampled candidates
    const sampledLinkages = linkages.filter(
      (l) => candSet.has(l.candidateId) || commSet.has(l.committeeId),
    );
    for (const l of sampledLinkages) {
      candSet.add(l.candidateId);
      commSet.add(l.committeeId);
    }

    // Select committees associated with sampled linkages/candidates plus first 50 committees
    const sampledCommittees = committees.filter((c) =>
      commSet.has(c.committeeId),
    );
    const extraCommittees = committees.slice(0, 50);
    const committeeMap = new Map<string, FecCommitteeRecord>();
    for (const c of [...sampledCommittees, ...extraCommittees]) {
      committeeMap.set(c.committeeId, c);
    }

    finalCandidates = candidates.filter((c) => candSet.has(c.candidateId));
    finalCommittees = Array.from(committeeMap.values());
    finalLinkages = sampledLinkages;
  }

  const manifest: FecCorpusManifest = {
    schemaVersion: "1.0.0",
    cycle: CYCLE,
    compiledAt: new Date().toISOString().split("T")[0],
    sourceArtifacts: artifacts,
    totalCandidates: finalCandidates.length,
    totalCommittees: finalCommittees.length,
    totalLinkages: finalLinkages.length,
  };

  const dataset: FecCorpusDataset = {
    manifest,
    candidates: finalCandidates,
    committees: finalCommittees,
    linkages: finalLinkages,
  };

  const compiledPath = path.join(DATA_DIR, `compiled-fec-${CYCLE}.json`);
  console.log(
    `Writing compiled dataset (${finalCandidates.length} candidates, ${finalCommittees.length} committees, ${finalLinkages.length} linkages) to ${compiledPath}...`,
  );
  fs.writeFileSync(compiledPath, JSON.stringify(dataset, null, 2));

  console.log(`Compilation complete!`);
}

main().catch((err) => {
  console.error("Compilation error:", err);
  process.exit(1);
});
