import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(120000);
const base = "http://localhost:3000";
let at = -1, seed = "", names = [];
for (let a = 1; a <= 10 && at < 0; a++) {
  const ready = page.waitForResponse((r) => r.url().endsWith("/api/title"));
  await page.goto(`${base}/play`); await ready;
  await page.locator("#new-life").click();
  const built = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/newlife", { timeout: 600000 });
  await page.locator("#new-advanced").click();
  await page.locator("#front-advanced:not([hidden])").waitFor();
  await page.locator("#advanced-build").click();
  seed = new URL((await built).url()).searchParams.get("seed");
  await page.locator("#front-pick:not([hidden])").waitFor();
  names = await page.locator("#pick-list button").allInnerTexts();
  at = names.findIndex((t) => /mayor/i.test(t));
}
await page.locator("#pick-list button").nth(at).click();
await page.locator("#pick-play").click();
await page.waitForFunction(() => document.getElementById("card-name").textContent.trim());
console.log("Seed", seed, "Place", (await page.locator("#card-place").innerText()).trim());
const offered = new Map(); const kinds = new Map();
for (let day = 0; day < 400; day++) {
  const r = await page.request.post(`${base}/api/advance?mode=day`, { timeout: 600000 });
  const moved = await r.json();
  let packet = moved.packet;
  kinds.set(packet?.kind, (kinds.get(packet?.kind) ?? 0) + 1);
  for (let g = 0; packet?.kind === "stop" && g < 12; g++) {
    packet = (await (await page.request.post(`${base}/api/resume?${new URLSearchParams({ kind: "stop", pauseId: packet.pauseId })}`)).json()).packet;
    kinds.set(packet?.kind, (kinds.get(packet?.kind) ?? 0) + 1);
  }
  for (const o of packet?.offers ?? []) offered.set(o.actionId, (offered.get(o.actionId) ?? 0) + 1);
  if (packet?.kind === "choice" && day < 3) console.log("choice packet keys", Object.keys(packet).join(","), "offers", (packet.offers ?? []).map((o) => o.actionId).join(","));
}
console.log("packet kinds", JSON.stringify([...kinds]));
console.log("offered actions over 400 days", JSON.stringify([...offered]));
await browser.close();
