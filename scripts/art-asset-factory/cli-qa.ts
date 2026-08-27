import fs from "fs";
import path from "path";
import { format as formatWithPrettier } from "prettier";
import { generateContactSheetHtml, generateComparisonSheetHtml } from "./qa";

const REPO_ROOT = path.resolve(process.cwd());
const ART_DIR = path.join(REPO_ROOT, "art");
const QA_DIR = path.join(ART_DIR, "qa");
const MANIFEST_PATH = path.join(ART_DIR, "manifest", "asset_manifest.json");

// Basic CLI wrapper for tests and ad-hoc execution
// Usage: node tsx scripts/art-asset-factory/cli-qa.ts [contact|compare] [dir]

const cmd = process.argv[2] || "contact";

if (cmd === "contact") {
  const targetDir = process.argv[3] || ART_DIR;

  const images: string[] = [];
  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  }

  walk(targetDir);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as {
    assets: Array<{ final_path?: string; requires_transparency?: boolean }>;
  };
  const manifestRequirements = Object.fromEntries(
    manifest.assets
      .filter((asset) => asset.final_path)
      .map((asset) => [
        path
          .relative(ART_DIR, path.resolve(REPO_ROOT, asset.final_path!))
          .replace(/\\/g, "/"),
        asset.requires_transparency === true,
      ]),
  );

  const { html, report } = generateContactSheetHtml(
    images,
    "Contact Sheet",
    ART_DIR,
    manifestRequirements,
  );

  const htmlPath = path.join(QA_DIR, "contact_sheets", "index.html");
  const reportPath = path.join(QA_DIR, "qa_report.json");

  fs.mkdirSync(path.join(QA_DIR, "contact_sheets"), { recursive: true });

  fs.writeFileSync(
    htmlPath,
    await formatWithPrettier(html, { filepath: htmlPath, parser: "html" }),
    "utf-8",
  );
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  console.log(`Contact sheet generated at ${htmlPath}`);
  console.log(`QA Report generated at ${reportPath}`);
} else if (cmd === "compare") {
  const pairsJsonPath = process.argv[3];
  if (!pairsJsonPath || !fs.existsSync(pairsJsonPath)) {
    console.error(
      "Error: Please provide a valid JSON file path containing pairs. Usage: cli-qa.ts compare <pairs.json>",
    );
    process.exit(1);
  }

  const pairsInput = JSON.parse(fs.readFileSync(pairsJsonPath, "utf-8"));
  if (!Array.isArray(pairsInput)) {
    console.error(
      "Error: Input JSON must be an array of objects with {source, generated} paths.",
    );
    process.exit(1);
  }

  const pairs = pairsInput.map((p) => {
    if (!p.source || !p.generated) {
      console.error("Error: Pair object missing source or generated path:", p);
      process.exit(1);
    }
    return {
      source: path.resolve(p.source),
      generated: path.resolve(p.generated),
    };
  });

  const { html, report } = generateComparisonSheetHtml(pairs, ART_DIR);

  const htmlPath = path.join(QA_DIR, "comparison_reports", "index.html");
  const reportPath = path.join(QA_DIR, "comparison_reports", "qa_report.json");

  fs.mkdirSync(path.join(QA_DIR, "comparison_reports"), { recursive: true });

  fs.writeFileSync(
    htmlPath,
    await formatWithPrettier(html, { filepath: htmlPath, parser: "html" }),
    "utf-8",
  );
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

  console.log(`Comparison sheet generated at ${htmlPath}`);
  console.log(`Comparison Report generated at ${reportPath}`);
}
