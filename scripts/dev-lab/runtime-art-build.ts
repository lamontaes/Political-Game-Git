import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { Plugin } from "vite";
/** Private builds import only the finite public fallback; the snapshot supplies
 * candidate pixels/catalogs at startup. No private import glob runs in this mode. */
export function runtimeArtBuild(): Plugin {
  const id = "\0ocd-runtime-art-fallback";
  return {
    name: "ocd-runtime-art-build",
    enforce: "pre",
    resolveId(source) {
      if (
        process.env.VITE_RUNTIME_CONTENT === "1" &&
        /(?:^|\/)bundled-art$/.test(source)
      )
        return id;
    },
    load(source) {
      if (source !== id) return;
      const root = process.cwd();
      const tracked = new Set(
        execFileSync("git", ["ls-files", "art"], {
          cwd: root,
          encoding: "utf8",
        })
          .trim()
          .split("\n"),
      );
      const files = new Set<string>();
      const scan = (v: unknown): void => {
        if (
          typeof v === "string" &&
          tracked.has(v) &&
          /\.(?:png|jpe?g|webp|svg)$/.test(v) &&
          existsSync(resolve(root, v))
        )
          files.add(v);
        else if (Array.isArray(v)) v.forEach(scan);
        else if (v && typeof v === "object") Object.values(v).forEach(scan);
      };
      for (const file of tracked)
        if (file.startsWith("art/manifest/") && file.endsWith(".json"))
          scan(JSON.parse(readFileSync(resolve(root, file), "utf8")));
      const paths = [...files].sort();
      return (
        paths
          .map(
            (file, i) =>
              `import u${i} from ${JSON.stringify(resolve(root, file) + "?url")};`,
          )
          .join("\n") +
        "\nexport const rasterUrls={" +
        paths
          .map((file, i) => `${JSON.stringify("../../" + file)}:u${i}`)
          .join(",") +
        "};\nexport const candidateManifests={}; export const componentUrls={}; export const preparedSources={}; export const poseUrls={}; export const posePacks={}; export const galleryCandidateUrls={}; export const galleryEnvironmentUrls={};"
      );
    },
  };
}
