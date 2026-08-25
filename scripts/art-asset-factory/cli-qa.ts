import fs from "fs";
import path from "path";
import { generateContactSheetHtml } from "./qa";

const REPO_ROOT = path.resolve(process.cwd());
const ART_DIR = path.join(REPO_ROOT, "art");
const QA_DIR = path.join(ART_DIR, "qa");

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

  const { html, report } = generateContactSheetHtml(
    images,
    "Contact Sheet",
    ART_DIR,
  );

  const htmlPath = path.join(QA_DIR, "contact_sheets", "index.html");
  const reportPath = path.join(QA_DIR, "qa_report.json");

  fs.mkdirSync(path.join(QA_DIR, "contact_sheets"), { recursive: true });

  fs.writeFileSync(htmlPath, html, "utf-8");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`Contact sheet generated at ${htmlPath}`);
  console.log(`QA Report generated at ${reportPath}`);
}
