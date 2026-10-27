/* global Buffer, URL, structuredClone */
/**
 * The update feed check (scripts/check-release-feed.mjs) on the feeds of the
 * two newest published releases. Each release's files.json holds the real
 * size and sha512 of every file its feeds name, hashed from the published
 * asset; the sha256 beside each is GitHub's own digest of that asset, which
 * the same hashing reproduced, so the facts are the published bytes.
 */

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  checkReleaseFolder,
  feedProblems,
  parseFeed,
} from "../scripts/check-release-feed.mjs";

const FIXTURES = new URL("./fixtures/release-feeds/", import.meta.url);

async function releases() {
  const out = [];
  for (const tag of await readdir(FIXTURES)) {
    const dir = new URL(`${tag}/`, FIXTURES);
    const files = JSON.parse(await readFile(new URL("files.json", dir)));
    const facts = new Map(files.map((f) => [f.name, f]));
    const feeds = [];
    for (const name of (await readdir(dir)).filter((n) => n.endsWith(".yml")))
      feeds.push({
        name,
        feed: parseFeed(await readFile(new URL(name, dir), "utf8")),
      });
    out.push({
      version: tag.slice(1),
      feeds,
      factsOf: (u) => facts.get(u) ?? null,
    });
  }
  return out;
}

test("the feeds of the two newest releases name their version and files", async () => {
  const all = await releases();
  assert.equal(all.length, 2);
  let feeds = 0;
  for (const { version, feeds: list, factsOf } of all)
    for (const { name, feed } of list) {
      assert.deepEqual(
        feedProblems(feed, version, factsOf),
        [],
        `${version} ${name}`,
      );
      feeds += 1;
    }
  // v0.22.0 carries both feeds; v0.21.6 published without its Windows build.
  assert.equal(feeds, 3);
});

test("a feed whose size, sha512, version or file is wrong is refused", async () => {
  const [{ version, feeds, factsOf }] = await releases();
  const { feed } = feeds[0];
  const file = feed.files[0];
  const wrong = (change) => {
    const copy = structuredClone(feed);
    change(copy, copy.files[0]);
    return feedProblems(copy, version, factsOf);
  };
  assert.match(
    wrong((_, f) => (f.size = String(Number(file.size) + 1))).join(),
    /size/,
  );
  assert.match(
    wrong((c, f) => {
      f.sha512 = c.sha512 = createHash("sha512")
        .update("other")
        .digest("base64");
    }).join(),
    /sha512/,
  );
  assert.match(wrong((c) => (c.version = "0.0.1")).join(), /version 0\.0\.1/);
  assert.match(
    wrong((c, f) => (f.url = c.path = "OurCivicDuty-missing.zip")).join(),
    /not in the release/,
  );
  assert.match(
    wrong((c, f) => (f.url = c.path = `${file.url}.blockmap`)).join(),
    /not a zip or exe/,
  );
});

test("a release folder is checked against the files in it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "release-feed-"));
  const bytes = Buffer.from("installer");
  const sha512 = createHash("sha512").update(bytes).digest("base64");
  writeFileSync(join(dir, "Game-1.2.3-mac-arm64.zip"), bytes);
  const feed = (version, size, url = "Game-1.2.3-mac-arm64.zip") =>
    [
      `version: ${version}`,
      "files:",
      `  - url: ${url}`,
      `    sha512: ${sha512}`,
      `    size: ${size}`,
      `path: ${url}`,
      `sha512: ${sha512}`,
      "releaseDate: '2026-10-22T00:00:00.000Z'",
      "",
    ].join("\n");
  writeFileSync(join(dir, "latest-mac.yml"), feed("1.2.3", bytes.length));
  assert.deepEqual(await checkReleaseFolder(dir, "1.2.3"), []);
  writeFileSync(join(dir, "latest-mac.yml"), feed("1.2.3", bytes.length + 1));
  assert.match(
    (await checkReleaseFolder(dir, "1.2.3")).join(),
    /latest-mac\.yml gives .* size/,
  );
  // A URL into a folder the release does not have names nothing published,
  // even with a file of that name, size and hash at the release's root.
  for (const url of [
    "sub/Game-1.2.3-mac-arm64.zip",
    "../Game-1.2.3-mac-arm64.zip",
  ]) {
    writeFileSync(
      join(dir, "latest-mac.yml"),
      feed("1.2.3", bytes.length, url),
    );
    assert.match(
      (await checkReleaseFolder(dir, "1.2.3")).join(),
      /not a file in the release/,
      url,
    );
  }
  assert.match(
    (
      await checkReleaseFolder(
        mkdtempSync(join(tmpdir(), "release-feed-")),
        "1.2.3",
      )
    ).join(),
    /no latest\*\.yml feed/,
  );
});
