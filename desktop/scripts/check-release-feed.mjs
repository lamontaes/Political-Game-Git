/* global console, process */
/**
 * The update feeds a release carries (latest-mac.yml, latest.yml) are what
 * the installed app's Check for updates reads. Each must name the release's
 * own version and files that sit beside it in the release, at their real
 * size and sha512; a feed that names another version, a missing file or a
 * file with other bytes would offer the player an update that cannot install.
 *
 *   node scripts/check-release-feed.mjs <folder> <version>
 *
 * checks every latest*.yml in the folder and exits 1, listing each problem,
 * if any is wrong or none is there.
 */

import { createHash } from "node:crypto";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The installers a feed may offer: the Mac zip and the Windows setup. */
const INSTALLER = /\.(zip|exe)$/;

const unquote = (value) => value.trim().replace(/^'(.*)'$/, "$1");

/**
 * Read electron-builder's feed: top-level `key: value` lines and a `files:`
 * list of `- url:`, `sha512:`, `size:` entries.
 */
export function parseFeed(text) {
  const feed = { files: [] };
  let inFiles = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const entry = line.match(/^\s+-\s+(\w+):\s*(.*)$/);
    const field = line.match(/^\s+(\w+):\s*(.*)$/);
    const top = line.match(/^(\w+):\s*(.*)$/);
    if (top) {
      inFiles = top[1] === "files";
      if (!inFiles) feed[top[1]] = unquote(top[2]);
    } else if (inFiles && entry) {
      feed.files.push({ [entry[1]]: unquote(entry[2]) });
    } else if (inFiles && field && feed.files.length) {
      feed.files.at(-1)[field[1]] = unquote(field[2]);
    }
  }
  return feed;
}

/**
 * What is wrong with one feed for a release of `version`, given each file's
 * real size and sha512 by name (`factsOf` returns null for a file that is not
 * in the release). Empty when the feed is right.
 */
export function feedProblems(feed, version, factsOf) {
  const problems = [];
  if (feed.version !== version)
    problems.push(`names version ${feed.version}, not ${version}`);
  if (!feed.files.length) problems.push("names no file");
  for (const file of feed.files) {
    if (!INSTALLER.test(file.url ?? ""))
      problems.push(`offers ${file.url}, which is not a zip or exe`);
    // A release's files sit side by side: the updater fetches the URL as a
    // name beside the feed, so a path into a folder names nothing published.
    if (!isAssetName(file.url)) {
      problems.push(`names ${file.url}, which is not a file in the release`);
      continue;
    }
    const facts = factsOf(file.url);
    if (!facts) {
      problems.push(`names ${file.url}, which is not in the release`);
      continue;
    }
    if (Number(file.size) !== facts.size)
      problems.push(
        `gives ${file.url} size ${file.size}; the file is ${facts.size}`,
      );
    if (file.sha512 !== facts.sha512)
      problems.push(`gives ${file.url} a sha512 the file does not have`);
  }
  // The older fields the updater also reads name the first file again.
  const first = feed.files[0];
  if (first && (feed.path !== first.url || feed.sha512 !== first.sha512))
    problems.push(`path and sha512 do not repeat ${first.url}`);
  return problems;
}

/** A file name as a release publishes it: no folder, nothing above it. */
function isAssetName(url) {
  return (
    typeof url === "string" &&
    url.length > 0 &&
    url === basename(url) &&
    !url.includes("\\") &&
    url !== "." &&
    url !== ".."
  );
}

async function sha512Of(path) {
  const hash = createHash("sha512");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("base64");
}

/** Check every feed in a release folder; each problem is prefixed by its feed. */
export async function checkReleaseFolder(folder, version) {
  const feeds = readdirSync(folder).filter((name) =>
    /^latest.*\.yml$/.test(name),
  );
  if (!feeds.length) return [`${folder} holds no latest*.yml feed`];
  const problems = [];
  for (const name of feeds) {
    const feed = parseFeed(await readFile(join(folder, name), "utf8"));
    const facts = new Map();
    for (const file of feed.files) {
      if (!isAssetName(file.url)) continue;
      const path = join(folder, file.url);
      if (existsSync(path))
        facts.set(file.url, {
          size: statSync(path).size,
          sha512: await sha512Of(path),
        });
    }
    for (const problem of feedProblems(
      feed,
      version,
      (url) => facts.get(url) ?? null,
    ))
      problems.push(`${name} ${problem}`);
  }
  return problems;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const [folder, version] = process.argv.slice(2);
  if (!folder || !version) {
    console.error("usage: check-release-feed.mjs <folder> <version>");
    process.exit(2);
  }
  const problems = await checkReleaseFolder(folder, version);
  for (const problem of problems) console.error(problem);
  if (problems.length) process.exit(1);
  console.log(`Every update feed in ${folder} names ${version} and its files.`);
}
