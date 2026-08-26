import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function acquireMaster(
  manifestPath: string,
  sheetNumber: number,
  outputDir: string,
) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest: unknown[] = JSON.parse(manifestRaw);

  const entry = manifest.find((e) => e.sheet_number === sheetNumber);
  if (!entry) throw new Error(`Sheet ${sheetNumber} not found.`);

  if (
    !entry.file_variants ||
    !entry.file_variants.master ||
    !entry.file_variants.master.url
  ) {
    throw new Error(`No master URL for sheet ${sheetNumber}`);
  }

  const url = entry.file_variants.master.url;
  const destPath = path.join(outputDir, `${entry.stable_id}_master.tif`);

  if (fs.existsSync(destPath)) {
    console.log(`Master ${destPath} already exists.`);
  } else {
    console.log(`Downloading master for ${entry.stable_id} from ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const buffer = await res.arrayBuffer();
      const buf = Buffer.from(buffer);
      fs.writeFileSync(destPath, buf);
      console.log(`Downloaded ${buf.length} bytes.`);
    } catch (e) {
      console.error(`Failed to download ${url}: ${e}`);
      return;
    }
  }

  // Calculate SHA-256
  const fileBuffer = fs.readFileSync(destPath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  entry.file_variants.master.hash = hash;
  entry.file_variants.master.local_path = destPath; // intentionally local path since we won't commit it
  entry.local_status = "transient_master_acquired";

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Updated manifest with hash: ${hash}`);
}
