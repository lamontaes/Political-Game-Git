/* global console, process, URL, document */
// The consumer loan cap proof, by clicking, on the bench (npm run bench) in a real browser: the world
// of Kingsbury, Nevada (place 3238000, the world seed below) opens as a new life; dev mode is turned on
// in Options; the Government tab introduces the cap as a bill at Nevada's state senate, passes it at a
// margin with the governor signing; the Calendar runs the world 800 days holding the law, so any bill
// that would repeal it is voted down by its members; and Watch lists the small-dollar loans, some of
// which read the cap's link at a factor below one. Every step is the game's own code behind a control.
// Takes about ten minutes. LOAN_CAP_SEED and LOAN_CAP_PLACE name another world to replay.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const SEED =
  process.env.LOAN_CAP_SEED ??
  "a424792cdf57ed11a138bc58855fe95695816b3c43636dd7d46b7a4e37002e77";
const PLACE = process.env.LOAN_CAP_PLACE ?? "3238000";
const CAP = "us-policy-positions:business-commerce.cap-consumer-loan-rates";
const LINK = "loan-rate-cap-to-high-cost-borrowing";
const BODY = process.env.LOAN_CAP_BODY ?? "office:US-NV:legislature-upper";

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/newlife?*", (route) => {
  const url = new URL(route.request().url());
  url.searchParams.set("seed", SEED);
  url.searchParams.set("placeKey", PLACE);
  route.continue({ url: url.toString() });
});
const RINGS = { Calendar: 2, Politics: 4 };
const dock = (name) => page.locator("#dock button").nth(RINGS[name]);
const closeSheet = () => page.locator("#sheet-close").click();

try {
  const { seed, placeName } = await startLife(page, { fresh: true });
  console.log(`LOAN CAP BROWSER: ${placeName}, seed ${seed}`);
  assert.equal(seed, SEED, "the world is the one named");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "On", exact: true }).last().click();
  await closeSheet();

  // Government: the cap as a bill at the state senate, every member voting yes, the governor signing.
  await dock("Politics").click();
  await page.locator('[data-testid="dev-introduce"]').waitFor();
  await page.locator('select[aria-label="Body"]').selectOption({ value: BODY });
  await page.locator('select[aria-label="Law"]').selectOption({ value: CAP });
  await page
    .locator('select[aria-label="Answer"]')
    .selectOption({ value: "1" });
  await page.locator('[data-testid="dev-introduce"]').click();
  await page.waitForFunction(() =>
    /drafted/.test(
      document.querySelector(".dev-bills .option-status")?.textContent ?? "",
    ),
  );
  await page
    .locator('select[aria-label="Executive"]')
    .selectOption({ value: "sign" });
  await page.locator('input[aria-label="Margin"]').fill("100");
  await page.locator('[data-testid="dev-pass"]').click();
  await page.waitForFunction(() =>
    /enacted|failed|vetoed|overridden|blocked/.test(
      document.querySelector(".dev-bills .option-status")?.textContent ?? "",
    ),
  );
  const passed = await page.locator(".dev-bills .option-status").textContent();
  console.log(`LOAN CAP BROWSER: ${passed}`);
  assert.match(passed, /enacted/, passed);
  await closeSheet();

  // Calendar: run 800 days holding the law (the members vote down any repeal).
  await dock("Calendar").click();
  await page.locator('[data-testid="dev-run"]').waitFor();
  await page.locator('input[aria-label="Days"]').fill("800");
  await page.locator('input[aria-label="Cap"]').fill("900");
  await page.locator('[data-testid="dev-hold-law"]').check();
  await page.locator('[data-testid="dev-run"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector(".dev-run .option-status")?.textContent?.length >
      0,
    null,
    { timeout: 1_800_000 },
  );
  const ran = await page.locator(".dev-run .option-status").textContent();
  console.log(`LOAN CAP BROWSER: ${ran}`);
  assert.match(ran, /Days passed/, ran);

  // Watch: the lender's loans, some of them reading the cap.
  await page.locator(".dev-loans table").waitFor();
  const rows = await page
    .locator(".dev-loans table tr")
    .evaluateAll((trs) =>
      trs
        .slice(1)
        .map((tr) =>
          [...tr.querySelectorAll("td")].map((td) => td.textContent),
        ),
    );
  const reads = rows.filter(
    (cells) => cells[4]?.includes(LINK) && Number(cells[3]) < 1,
  );
  console.log(
    `LOAN CAP BROWSER: ${rows.length} small-dollar loans, ${reads.length} read the cap (e.g. ${reads[0]?.join(" | ")})`,
  );
  assert.ok(reads.length > 0, "a lender read the cap past its lag");
  assert.deepEqual(errors, []);
  console.log("LOAN CAP BROWSER: ok");
} finally {
  await browser.close();
}
