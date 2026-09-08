import { expect, test, type Download, type Page } from "@playwright/test";

const BROWSER_URL = "/?view=content";

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function resultCount(page: Page): Promise<number> {
  return Number(
    await page.getByTestId("content-browser-result-count").innerText(),
  );
}

test.describe("Content browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BROWSER_URL);
  });

  test("lists every registered bank with its own items", async ({ page }) => {
    await expect(page.getByTestId("content-browser")).toBeVisible();

    const banks = Number.parseInt(
      await page.getByTestId("content-browser-bank-count").innerText(),
      10,
    );
    const items = Number.parseInt(
      await page.getByTestId("content-browser-item-count").innerText(),
      10,
    );
    // No fixed counts: the browser has to work for whatever is registered.
    expect(banks).toBeGreaterThan(0);
    expect(items).toBeGreaterThan(banks);
    expect(await resultCount(page)).toBe(items);

    await expect(page.getByTestId("content-browser-digest")).toContainText(
      /digest [0-9a-f]{16}/,
    );
  });

  test("narrows by authority, life stage and free text, and clears again", async ({
    page,
  }) => {
    const everything = await resultCount(page);

    await page
      .getByTestId("content-browser-filter-authority")
      .selectOption("sourced");
    const sourced = await resultCount(page);
    expect(sourced).toBeGreaterThan(0);
    expect(sourced).toBeLessThan(everything);
    for (const badge of await page
      .getByTestId("content-browser-result")
      .all()) {
      await expect(badge).toContainText("sourced");
    }

    await page.getByTestId("content-browser-filter-authority").selectOption("");
    expect(await resultCount(page)).toBe(everything);

    await page.getByTestId("content-browser-filter-life-stage").selectOption({
      index: 1,
    });
    const banded = await resultCount(page);
    expect(banded).toBeGreaterThan(0);
    expect(banded).toBeLessThan(everything);

    await page
      .getByTestId("content-browser-filter-life-stage")
      .selectOption("");
    await page
      .getByTestId("content-browser-search")
      .fill("no such content anywhere");
    await expect(page.getByTestId("content-browser-empty")).toBeVisible();
    expect(await resultCount(page)).toBe(0);
  });

  test("answers where an item came from and what it requires", async ({
    page,
  }) => {
    await page
      .getByTestId("content-browser-filter-authority")
      .selectOption("sourced");
    await page.getByTestId("content-browser-result").first().click();

    const detail = page.getByTestId("content-browser-detail");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(
      "src/simulation/legislature-rule-packs.ts",
    );
    await expect(detail).toContainText("Citation");
    await expect(detail).toContainText("Retrieved");
    await expect(detail).toContainText("Verification");
    await expect(detail).toContainText("Speaker and role requirements");
    await expect(detail).toContainText("Required canonical facts");
    await expect(detail).toContainText("Follow-up hooks");
  });

  test("says what a bank does not declare instead of filling it in", async ({
    page,
  }) => {
    await page
      .getByTestId("content-browser-filter-undeclared")
      .selectOption("options");
    expect(await resultCount(page)).toBeGreaterThan(0);
    await page.getByTestId("content-browser-result").first().click();
    await expect(
      page.getByTestId("content-browser-undeclared").first(),
    ).toContainText("Not declared by the source bank");
  });

  test("exports a Markdown review and a machine-readable JSON in one action", async ({
    page,
  }) => {
    // One action, two files: collect every download the click produces rather
    // than waiting twice for the same first event.
    const downloads: Download[] = [];
    page.on("download", (download) => downloads.push(download));
    await page.getByTestId("content-browser-export").click();
    await expect.poll(() => downloads.length).toBe(2);

    const names = downloads
      .map((download) => download.suggestedFilename())
      .sort();
    expect(names).toStrictEqual(["content-index.json", "content-index.md"]);

    const byName = new Map(
      await Promise.all(
        downloads.map(
          async (download) =>
            [
              download.suggestedFilename(),
              await readDownload(download),
            ] as const,
        ),
      ),
    );

    const markdown = byName.get("content-index.md") ?? "";
    expect(markdown).toContain("# Content index");
    expect(markdown).toContain("Not declared by the source bank");

    const parsed = JSON.parse(byName.get("content-index.json") ?? "{}") as {
      format: string;
      contentDigest: string;
      items: readonly unknown[];
    };
    expect(parsed.format).toBe("political-game-content-index");
    expect(parsed.items.length).toBeGreaterThan(0);
    await expect(page.getByTestId("content-browser-digest")).toContainText(
      parsed.contentDigest,
    );
    await expect(
      page.getByTestId("content-browser-export-status"),
    ).toContainText(parsed.contentDigest);
  });
});

test.describe("Ordinary play", () => {
  test("never reaches the content browser", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("content-browser")).toHaveCount(0);
    await expect(page.locator('a[href*="view=content"]')).toHaveCount(0);

    // An unrecognized view is the game, not a development surface.
    await page.goto("/?view=not-a-route");
    await expect(page.getByTestId("content-browser")).toHaveCount(0);
  });
});
