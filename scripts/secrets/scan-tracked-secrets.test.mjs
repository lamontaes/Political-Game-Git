import assert from "node:assert/strict";
import { test } from "node:test";

import { scanTrackedEntries } from "./scan-tracked-secrets.mjs";

test("scanner flags key-like values without echoing credential text", () => {
  const fakeCredential = ["gh", "p_", "A".repeat(32)].join("");
  const findings = scanTrackedEntries([
    { path: "src/credential.ts", content: `token = \"${fakeCredential}\"` },
  ]);

  assert.deepEqual(findings, [
    { path: "src/credential.ts", reason: "key-like material is present" },
  ]);
  assert.equal(JSON.stringify(findings).includes(fakeCredential), false);
});

test("scanner flags an unknown API key even in a preserved source artifact", () => {
  const fakeKey = `apiKey: "${"B".repeat(32)}"`;
  assert.deepEqual(
    scanTrackedEntries([
      {
        path: "data/source/constitutional-process/raw/us-proposal-denominator.html",
        content: fakeKey,
      },
    ]),
    [
      {
        path: "data/source/constitutional-process/raw/us-proposal-denominator.html",
        reason: "key-like material is present",
      },
    ],
  );
});

test("scanner flags tracked environment and signing files by path", () => {
  assert.deepEqual(
    scanTrackedEntries([
      { path: ".env.production", content: "placeholder" },
      { path: "certs/signing.p12", content: Buffer.from([0, 1, 2]) },
    ]),
    [
      { path: ".env.production", reason: "environment file is tracked" },
      {
        path: "certs/signing.p12",
        reason: "signing key or certificate file is tracked",
      },
    ],
  );
});

test("scanner catches private-key blocks and ignores ordinary public source", () => {
  const pemMarker = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
  assert.equal(
    scanTrackedEntries([
      { path: "docs/notes.txt", content: pemMarker },
      { path: "src/normal.ts", content: "const keyName = 'OCD_UPDATE_FEED';" },
    ]).length,
    1,
  );
});
