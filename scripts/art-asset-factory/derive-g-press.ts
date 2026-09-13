import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as PImage from "pureimage";
import { deriveRuntimeTiers } from "./tier-derive";
import { hashArtFile } from "./content-hash";

// Existing AX-92B1 intake is authoritative. Only deterministic derivative work.
const source =
  "art/references/candidates/recent-drive-sweep/source-images/IMG_5202.JPG";
const expected =
  "e16e1b0b0c5cd93a6254ac1b1145f5439351a4e6b8530d739844bd62e973d065";
if (hashArtFile(source) !== expected)
  throw new Error("Press source hash changed");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "g-press-"));
try {
  const normalized = path.join(temporary, "master.png");
  const pixels = await PImage.decodeJPEGFromStream(fs.createReadStream(source));
  await PImage.encodePNGToStream(pixels, fs.createWriteStream(normalized));
  const result = await deriveRuntimeTiers({
    assetId: "env_press_briefing_room_candidate_v1",
    masterPath: normalized,
    outputDirectory: path.resolve("art/families/press-briefing-room"),
    nativeDetailWidth: null,
    requestedWidths: [1376, 2752],
    repositoryRoot: process.cwd(),
  });
  if (hashArtFile(source) !== expected)
    throw new Error("Press source was modified");
  console.log(
    JSON.stringify(
      {
        source,
        sourceHash: expected,
        normalizedHash: result.masterHashBefore,
        tiers: result.derived,
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(temporary, { recursive: true });
}
