import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const hashes = JSON.parse(readFileSync(root + "image-sha256.json", "utf8"));
const receipts = JSON.parse(readFileSync(root + "fit-receipt.json", "utf8"));
const source = JSON.parse(readFileSync(root + "provenance.json", "utf8"));
assert.equal(
  source.expectedIdentity.head,
  "58468eccd118734fa52ad99f84aea6f32aecf7e9",
);
assert.equal(source.served.head, source.expectedIdentity.head);
assert.equal(source.served.sourceDigest, source.expectedIdentity.sourceDigest);
assert.equal(receipts.length, 4);
for (const direction of ["a", "b"]) {
  for (const state of ["rest", "open"]) {
    const receipt = receipts.find(
      (row) => row.direction === direction && row.state === state,
    );
    assert.ok(receipt);
    assert.equal(receipt.menuChevronCount, 0);
    assert.equal(receipt.cardDocked, true);
    assert.equal(receipt.timeControlsOutsideCard, true);
    assert.deepEqual(receipt.clipped, []);
    assert.deepEqual(receipt.overflow, []);
    const png = readFileSync(root + `${direction}-${state}-1920.png`);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(
      createHash("sha256").update(png).digest("hex"),
      hashes[`${direction}-${state}-1920.png`],
    );
    assert.equal(png.readUInt32BE(16), 1920);
    assert.equal(png.readUInt32BE(20), 1080);
    assert.equal(receipt.viewport.width, 1920);
    assert.equal(receipt.viewport.height, 1080);
  }
}
console.log(
  "PASS: four native-1920 artifacts, recorded fit and served source binding. Historical evidence only; no fresh browser claim.",
);
