import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * The review packet, opened by a real browser.
 *
 * The claim being checked is the one the generator actually makes: every review
 * item is in the document before any script runs, and the enhancements on top
 * of it work. The old packet (commit `9d57f8d`) shipped zero rendered items and
 * built about fifteen hundred of them in client script; it printed with 95
 * trailing blank pages.
 *
 * What this cannot check, and does not pretend to: the page count. Nothing in
 * this repository rasterizes HTML into paged output, so "no blank page N" is
 * not assertable here and stays an owner check on a real print. See
 * `docs/systems/prose-corpus.md`.
 */

const PACKET = resolve("docs/prose-inventory/review-packet.html");
const URL = `file://${PACKET}`;

test.describe("prose review packet", () => {
  test.skip(
    !existsSync(PACKET),
    "Run `npm run corpus:prose` to generate the packet first.",
  );

  test("every item is in the document with JavaScript disabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(URL);

    const items = await page.locator("article.item").count();
    expect(items).toBeGreaterThan(1000);

    // Reading does not depend on script: the prose and its semantic ID are
    // both present and visible.
    const first = page.locator("article.item").first();
    await expect(first.locator("p.prose")).toBeVisible();
    await expect(first.locator("code.sid")).toContainText("prose:");

    // Nothing is left hidden waiting for script to reveal it.
    expect(await page.locator("article.item:not([hidden])").count()).toBe(
      items,
    );
    await context.close();
  });

  test("filters narrow the list and say how many are shown", async ({
    page,
  }) => {
    await page.goto(URL);
    const total = await page.locator("article.item").count();

    await page.fill("#q", "cubby");
    await expect(page.locator("#shown")).not.toHaveText(`${total} shown`);
    const filtered = await page.locator("article.item:not([hidden])").count();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(total);

    await page.fill("#q", "");
    await expect(page.locator("#shown")).toHaveText(`${total} shown`);

    await page.selectOption("#reach", "WITHHELD_BY_GROUNDING");
    // Read the whole filtered set in one evaluation. Asking the browser for
    // one attribute at a time across a hundred nodes races the re-render and
    // proves nothing extra.
    const shownReach = await page.evaluate(() =>
      Array.from(document.querySelectorAll("article.item:not([hidden])")).map(
        (item) => item.getAttribute("data-reach"),
      ),
    );
    expect(shownReach.length).toBeGreaterThan(0);
    expect(shownReach.length).toBeLessThan(total);
    expect(new Set(shownReach)).toStrictEqual(
      new Set(["WITHHELD_BY_GROUNDING"]),
    );
  });

  test("an owner mark keys to the semantic id and survives a reload", async ({
    page,
  }) => {
    await page.goto(URL);
    const first = page.locator("article.item").first();
    const id = await first.getAttribute("id");
    expect(id).toMatch(/^prose:/);

    const box = first.locator('input[data-mark="rewrite"]');
    await box.check();
    await expect(box).toBeChecked();

    await page.reload();
    await expect(
      page
        .locator("article.item")
        .first()
        .locator('input[data-mark="rewrite"]'),
    ).toBeChecked();

    // The stored key is the semantic ID, not an ordinal position.
    const stored = await page.evaluate(() =>
      localStorage.getItem("ocd-prose-marks-v1"),
    );
    expect(stored).toContain(id ?? "");
    expect(stored).not.toMatch(/"[SC]-\d{4}"/);
  });

  test("the document ends on content, not on an empty tail", async ({
    page,
  }) => {
    await page.goto(URL);
    const tail = await page.evaluate(() => {
      const items = document.querySelectorAll("article.item");
      const last = items[items.length - 1];
      if (!last) return null;
      const box = last.getBoundingClientRect();
      const bottom = box.bottom + window.scrollY;
      return {
        documentHeight: document.documentElement.scrollHeight,
        lastItemBottom: bottom,
      };
    });
    expect(tail).not.toBeNull();
    // Whatever follows the last item is the closing padding, not pages of it.
    expect(tail!.documentHeight - tail!.lastItemBottom).toBeLessThan(400);
  });
});
