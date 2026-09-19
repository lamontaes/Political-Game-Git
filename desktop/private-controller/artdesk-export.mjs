/* global fetch, URL, Buffer */
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export function exportKey(value) {
  if (
    !value ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.candidateId) ||
    !/^[a-f0-9]{64}$/.test(value.sha256) ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1
  )
    throw new Error("A recorded candidate, revision and hash are required.");
  return `${value.candidateId}:${value.revision}:${value.sha256}`;
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Immutable full-resolution bytes. Renderer callers never supply paths. */
export class ArtDeskExports {
  constructor(root, fetchBytes = fetch) {
    this.root = root;
    this.fetchBytes = fetchBytes;
    this.prepared = new Map();
  }

  async prepare(subject, benchUrl, token) {
    const key = exportKey(subject);
    if (this.prepared.has(key)) return this.resolve(subject);
    const url = new URL("/__dev/artbench/original", benchUrl);
    url.searchParams.set("candidateId", subject.candidateId);
    url.searchParams.set("sha256", subject.sha256);
    url.searchParams.set("revision", String(subject.revision));
    const response = await this.fetchBytes(url, {
      headers: { "X-OCD-Art-Desk-Token": token },
      redirect: "error",
    });
    if (
      !response.ok ||
      response.headers.get("X-Artbench-Candidate") !== subject.candidateId ||
      response.headers.get("X-Artbench-Sha256") !== subject.sha256 ||
      response.headers.get("X-Artbench-Revision") !== String(subject.revision)
    )
      throw new Error("The bench did not return this exact revision.");
    const mime = response.headers.get("Content-Type");
    const ext =
      mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : null;
    if (!ext) throw new Error("Only stored raster revisions can be exported.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (digest(bytes) !== subject.sha256)
      throw new Error("Export hash mismatch.");
    mkdirSync(this.root, { recursive: true, mode: 0o700 });
    const file = path.join(this.root, `${subject.sha256}.${ext}`);
    if (!existsSync(file))
      writeFileSync(file, bytes, { flag: "wx", mode: 0o400 });
    this.prepared.set(key, {
      file,
      sha256: subject.sha256,
      byteLength: bytes.length,
    });
    return this.resolve(subject);
  }

  resolve(subject) {
    const item = this.prepared.get(exportKey(subject));
    if (!item)
      throw new Error(
        "This revision is still preparing. Try again when ready.",
      );
    if (
      !lstatSync(item.file).isFile() ||
      lstatSync(item.file).isSymbolicLink() ||
      digest(readFileSync(item.file)) !== item.sha256
    )
      throw new Error("Cached export changed; drag refused.");
    return item;
  }
}
