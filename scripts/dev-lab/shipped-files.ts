import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { normalizePath, type Plugin, type ResolvedConfig } from "vite";

/** Observe the final client bundle without changing its inputs or output. */
export function shippedFiles(): Plugin {
  let config: ResolvedConfig;
  let report: object | undefined;
  const inlineCandidates = new Map<string, [string, string]>();
  return {
    name: "our-civic-duty-shipped-files",
    apply: "build",
    config(userConfig) {
      const existing = userConfig.build?.assetsInlineLimit;
      return {
        build: {
          assetsInlineLimit(file: string, content: Buffer) {
            const plainSvg = file.endsWith(".svg")
              ? content
                  .toString()
                  .trim()
                  .replaceAll(/>\s+</g, "><")
                  .replaceAll('"', "'")
                  .replaceAll("%", "%25")
                  .replaceAll("#", "%23")
                  .replaceAll("<", "%3c")
                  .replaceAll(">", "%3e")
                  .replaceAll(/\s+/g, "%20")
              : "";
            inlineCandidates.set(file, [
              "base64," + content.toString("base64"),
              plainSvg && "data:image/svg+xml," + plainSvg,
            ]);
            return typeof existing === "function"
              ? existing(file, content)
              : typeof existing === "number"
                ? content.length < existing &&
                  !content
                    .subarray(0, 34)
                    .toString()
                    .startsWith("version https://git-lfs.github.com")
                : undefined;
          },
        },
      };
    },
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        const sourceName = (id: string) => {
          if (id.startsWith("\0")) return id;
          const path = id.split("?")[0]!;
          return normalizePath(
            isAbsolute(path) ? relative(config.root, path) : path,
          );
        };
        const files = new Set<string>();
        const outputs = Object.values(bundle)
          .map((item) => {
            const inputs =
              item.type === "chunk"
                ? Object.keys(item.modules)
                : item.originalFileNames;
            const sources = [...new Set(inputs.map(sourceName))].sort();
            for (const source of sources) files.add(source);
            return {
              file:
                item.fileName === "src/bench/play.html"
                  ? "index.html"
                  : item.fileName,
              type: item.type,
              sources,
            };
          })
          .sort((a, b) => a.file.localeCompare(b.file));
        const strings = Object.values(bundle).flatMap((item) =>
          item.type === "chunk"
            ? [item.code]
            : typeof item.source === "string"
              ? [item.source]
              : [],
        );
        const inlineAssets = [...inlineCandidates]
          .filter(([, signatures]) =>
            signatures.some(
              (signature) =>
                signature &&
                strings.some((output) => output.includes(signature)),
            ),
          )
          .map(([file]) => sourceName(file))
          .sort();
        inlineCandidates.clear();
        for (const file of inlineAssets) files.add(file);
        const publicAssets: string[] = [];
        if (
          config.build.copyPublicDir &&
          config.publicDir &&
          existsSync(config.publicDir)
        ) {
          for (const file of readdirSync(config.publicDir, {
            recursive: true,
            withFileTypes: true,
          })) {
            if (file.isDirectory()) continue;
            const absolute = resolve(file.parentPath, file.name);
            const source = sourceName(absolute);
            files.add(source);
            const output = normalizePath(relative(config.publicDir, absolute));
            publicAssets.push(output);
          }
        }
        // Vite's HTML entry can be absent from chunk.modules after HTML emission.
        for (const item of Object.values(bundle))
          if (item.type === "chunk" && item.isEntry && item.facadeModuleId)
            files.add(sourceName(item.facadeModuleId));
        report = {
          files: [...files].sort(),
          outputs,
          inlineAssets,
          publicAssets: publicAssets.sort(),
        };
      },
    },
    closeBundle: {
      order: "post",
      handler() {
        if (!report || !config.build.write) return;
        const out = resolve(config.root, config.build.outDir);
        const manifestDir = basename(out) === "client" ? dirname(out) : out;
        writeFileSync(
          resolve(manifestDir, "shipped-files.json"),
          JSON.stringify(report, null, 2) + "\n",
        );
      },
    },
  };
}
