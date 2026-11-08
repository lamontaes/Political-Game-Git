import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";
const out = "/tmp/claude-0/pass2";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.setDefaultTimeout(60000);
const r = await startLife(p, { fresh: true });
console.log(JSON.stringify(r));
await p.locator('#rings [data-tab="politics"]').first().evaluate((e) => e.click());
await p.waitForTimeout(1500);
for (const name of ["Elections", "Parties", "Issues", "Bills"]) {
  await p.locator("#sheet-body button", { hasText: new RegExp(`^${name}$`) }).first().click().catch((e) => console.log("miss", name));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/real-pol-${name}.png` });
}
await b.close();
console.log("errors");
