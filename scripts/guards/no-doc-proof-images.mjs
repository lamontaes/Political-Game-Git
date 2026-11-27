import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const maxDocsImageBytes = 64 * 1024;
const image =
  /\.(?:png|avif|bmp|gif|heic|heif|ico|jpe?g|jxl|svgz?|tiff?|webp)$/i;

export function largeDocsImages(base, head = "HEAD", cwd = process.cwd()) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    }).trimEnd();
  const paths = git(
    "diff",
    "--name-only",
    "-z",
    "--no-renames",
    "--diff-filter=AMT",
    base,
    head,
    "--",
    "docs",
  ).split("\0");
  return paths
    .filter((path) => image.test(path))
    .flatMap((path) => {
      const bytes = Number(git("cat-file", "-s", `${head}:${path}`));
      return bytes > maxDocsImageBytes ? [{ path, bytes }] : [];
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!process.argv[2]) throw new Error("Pass the guard base commit");
  const failures = largeDocsImages(process.argv[2], process.argv[3]);
  for (const { path, bytes } of failures)
    console.error(
      `${path} (${bytes} bytes). Attach proof to the pull request instead of committing it under docs/.`,
    );
  if (failures.length) process.exitCode = 1;
}
