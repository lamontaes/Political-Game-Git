import { expect, test, type Page } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

test.describe.configure({ timeout: 120_000 });

async function freshBrowser(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

async function beginOrdinaryLife(page: Page): Promise<void> {
  await startLife(page, { age: 34, household: "shares-a-home" });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
}

async function selectConnection(
  page: Page,
  candidateIds: readonly string[],
): Promise<{ firstId: string; secondId: string }> {
  expect(candidateIds.length).toBeGreaterThanOrEqual(1);

  for (const firstId of candidateIds) {
    const node = page.getByTestId(`people-web-node-${firstId}`);
    await node.locator("circle").click();
    await expect(page.getByTestId("full-dossier")).toHaveAttribute(
      "data-person-id",
      firstId,
    );

    const connections = page
      .getByTestId("person-card-connections")
      .getByRole("button");
    const connectionCount = await connections.count();
    for (
      let connectionIndex = 0;
      connectionIndex < connectionCount;
      connectionIndex += 1
    ) {
      const connection = connections.nth(connectionIndex);
      const secondId = (
        (await connection.getAttribute("data-testid")) ?? ""
      ).replace("person-card-connection-", "");
      if (!secondId || secondId === firstId) continue;

      /*
       * Use the keyboard route for the second selection. The first selection
       * above is a real pointer click on the rendered SVG node.
       */
      await connection.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("full-dossier")).toHaveAttribute(
        "data-person-id",
        secondId,
      );
      return { firstId, secondId };
    }
  }

  throw new Error("The generated People network had no connected person.");
}

async function provePeopleWebRoute(
  page: Page,
  screenshotPrefix: string,
): Promise<void> {
  await freshBrowser(page);
  await beginOrdinaryLife(page);
  await goTo(page, "elsewhere-people");

  await expect(page.getByTestId("people-relationship-web")).toBeVisible();
  await expect(page.getByTestId("people-search")).toBeVisible();
  await page.getByTestId("people-web-expand").click();
  const candidateIds = await page
    .locator('[data-testid^="people-person-"]')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        (node.getAttribute("data-testid") ?? "").replace("people-person-", ""),
      ),
    );
  const firstName = await page
    .locator('[data-testid^="people-person-"] strong')
    .first()
    .textContent();
  expect(firstName).not.toBeNull();
  await page.getByTestId("people-search").fill(firstName!);
  await page.screenshot({
    path: `/tmp/${screenshotPrefix}-web-before-selection.png`,
    fullPage: true,
  });

  const { secondId } = await selectConnection(page, candidateIds);
  await page.getByTestId("dossier-pin").click();
  await page.getByTestId("people-overlay-close").click();

  const pin = page.getByTestId(`pin-person:${secondId}`);
  await expect(pin).toBeVisible();
  /*
   * The selected connected person may be a non-present acquaintance. The
   * card must preserve that unavailable state rather than pretending a pin is
   * presence; the live conversation route below uses the existing starter for
   * somebody actually available in this generated room.
   */
  await pin.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("full-dossier")).toHaveAttribute(
    "data-person-id",
    secondId,
  );
  await expect(page.getByTestId("dossier-pin")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const talk = page.getByTestId("dossier-talk");
  if (await talk.isEnabled()) {
    await talk.focus();
    await page.keyboard.press("Enter");
  } else {
    await expect(page.getByTestId("dossier-talk-unavailable")).toBeVisible();
    await page.getByTestId("person-workspace-back").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await goTo(page, "elsewhere-people");
    const starter = page
      .locator('[data-testid^="conversation-start-"]')
      .first();
    await expect(starter).toBeVisible();
    await starter.focus();
    await page.keyboard.press("Enter");
  }
  const conversation = page.getByRole("region", {
    name: /^Conversation with /,
  });
  await expect(conversation).toBeVisible();
  await page.screenshot({
    path: `/tmp/${screenshotPrefix}-web-after-talk.png`,
    fullPage: true,
  });

  await conversation.getByTestId("talk-back").focus();
  await page.keyboard.press("Enter");
  await expect(conversation).toHaveCount(0);
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

for (const size of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "narrow", width: 1024, height: 768 },
]) {
  test(`real People web route works at ${size.label} width`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await provePeopleWebRoute(page, `people-web-${size.label}`);

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
