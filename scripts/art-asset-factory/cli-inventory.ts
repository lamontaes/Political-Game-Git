import fs from "fs";
import path from "path";
import { generateInventory, detectDuplicateHashes } from "./inventory";

const REPO_ROOT = path.resolve(process.cwd());
const ART_DIR = path.join(REPO_ROOT, "art");

const items = generateInventory(ART_DIR);
const duplicates = detectDuplicateHashes(items);

const report = {
  totalItems: items.length,
  items,
  duplicates,
};

const reportPath = path.join(ART_DIR, "qa", "inventory_report.json");
const reportString = `${JSON.stringify(report, null, 2)}\n`;

let shouldWrite = true;
if (fs.existsSync(reportPath)) {
  const existing = fs.readFileSync(reportPath, "utf-8");
  if (existing === reportString) {
    shouldWrite = false;
  }
}

if (shouldWrite) {
  fs.writeFileSync(reportPath, reportString, "utf-8");
  console.log(
    `Inventory generated: ${items.length} items. Written to ${reportPath}`,
  );
} else {
  console.log(`Inventory is up to date: ${items.length} items.`);
}

if (duplicates.length > 0) {
  console.warn("WARNING: Duplicate hashes detected:");
  duplicates.forEach((d) => console.warn(` - ${d}`));
}
