import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as https from "node:https";
import type { IncomingMessage } from "node:http";
import type { AcsPumsManifest } from "./compiler";

export async function acquireAcsStateArchive(
  stateAbbr: string,
  vintageYear: number,
  outputDir: string,
): Promise<AcsPumsManifest> {
  const stateLower = stateAbbr.toLowerCase();

  if (vintageYear !== 2024) {
    throw new Error(
      "Only 2024 ACS 1-Year PUMS is authorized for Stage A compiler.",
    );
  }

  const baseUrl = `https://www2.census.gov/programs-surveys/acs/data/pums/${vintageYear}/1-Year`;
  const housingUrl = `${baseUrl}/csv_h${stateLower}.zip`;
  const personUrl = `${baseUrl}/csv_p${stateLower}.zip`;

  const housingZipPath = path.join(outputDir, `csv_h${stateLower}.zip`);
  const personZipPath = path.join(outputDir, `csv_p${stateLower}.zip`);

  const downloadFile = (url: string, dest: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res: IncomingMessage) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
            return;
          }

          const file = fs.createWriteStream(dest);
          const hash = crypto.createHash("sha256");

          res.on("data", (chunk: Buffer) => {
            hash.update(chunk);
            file.write(chunk);
          });

          res.on("end", () => {
            file.end();
            resolve(hash.digest("hex"));
          });
        })
        .on("error", reject);
    });
  };

  const [housingHash, personHash] = await Promise.all([
    downloadFile(housingUrl, housingZipPath),
    downloadFile(personUrl, personZipPath),
  ]);

  const retrievedAt = new Date().toISOString();
  const housingSize = fs.statSync(housingZipPath).size;
  const personSize = fs.statSync(personZipPath).size;

  return {
    state: stateLower,
    vintageYear,
    product: "1-Year",
    housingUrl,
    personUrl,
    retrievedAt,
    housingHash,
    personHash,
    housingByteSize: housingSize,
    personByteSize: personSize,
    rawHousingCount: 0,
    rawPersonCount: 0,
    retainedOrdinaryHouseholdCount: 0,
    compiledDonorCount: 0,
  };
}
