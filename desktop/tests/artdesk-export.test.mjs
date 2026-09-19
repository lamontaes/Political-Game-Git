/* global Response, Buffer */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  chmodSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ArtDeskExports,
  exportKey,
} from "../private-controller/artdesk-export.mjs";

const subjectFor = (id, bytes) => ({
  candidateId: id,
  revision: 1,
  sha256: createHash("sha256").update(bytes).digest("hex"),
});
const responseFor = (subject, bytes) =>
  new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "X-Artbench-Candidate": subject.candidateId,
      "X-Artbench-Sha256": subject.sha256,
      "X-Artbench-Revision": String(subject.revision),
    },
  });

test("late original preparation cannot export the newly viewed revision; bytes are immutable and reused", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "bench-export-"));
  try {
    const a = Buffer.from("original source bytes");
    const b = Buffer.from("externally edited bytes");
    const first = subjectFor("original", a);
    const second = subjectFor("edited", b);
    let release;
    let reads = 0;
    const cache = new ArtDeskExports(root, async (url) => {
      reads += 1;
      if (url.searchParams.get("candidateId") === first.candidateId)
        await new Promise((resolve) => {
          release = resolve;
        });
      return url.searchParams.get("candidateId") === first.candidateId
        ? responseFor(first, a)
        : responseFor(second, b);
    });
    const pending = cache.prepare(first, "http://127.0.0.1:5000", "test-token");
    const edited = await cache.prepare(
      second,
      "http://127.0.0.1:5000",
      "test-token",
    );
    release();
    const original = await pending;
    assert.deepEqual(readFileSync(edited.file), b);
    assert.deepEqual(readFileSync(original.file), a);
    assert.equal(cache.resolve(second).file, edited.file);
    await cache.prepare(second, "http://127.0.0.1:5000", "test-token");
    assert.equal(reads, 2);
    chmodSync(edited.file, 0o600);
    writeFileSync(edited.file, "changed");
    assert.throws(() => cache.resolve(second), /changed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("arbitrary paths, wrong identities and altered bytes cannot prepare a native drag", async () => {
  assert.throws(() =>
    exportKey({
      candidateId: "../../secret",
      revision: 1,
      sha256: "a".repeat(64),
    }),
  );
  const root = mkdtempSync(path.join(tmpdir(), "bench-export-"));
  try {
    const bytes = Buffer.from("recorded");
    const subject = subjectFor("candidate", bytes);
    const wrong = new ArtDeskExports(root, async () =>
      responseFor({ ...subject, revision: 2 }, bytes),
    );
    await assert.rejects(
      wrong.prepare(subject, "http://127.0.0.1:5000", "token"),
      /exact revision/,
    );
    const changed = new ArtDeskExports(root, async () =>
      responseFor(subject, Buffer.from("wrong")),
    );
    await assert.rejects(
      changed.prepare(subject, "http://127.0.0.1:5000", "token"),
      /hash mismatch/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
