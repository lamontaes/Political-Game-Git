import { expect, test, type Page } from "@playwright/test";

async function proof(page: Page) {
  return JSON.parse(
    (await page.getByTestId("press-reading-proof").textContent())!,
  ) as {
    publication: { id: string; sourceEventId: string; outletName: string };
    mediaKnowledge: {
      eventId: string;
      source: { kind: string; reference: string };
    }[];
    moment: unknown;
    transferCount: number;
  };
}

test("headline reads exactly its actual generated publication and survives Keep/reload", async ({
  page,
}) => {
  await page.goto(
    `/tests/e2e/support/press-reading.html?case=headline-${crypto.randomUUID()}`,
  );
  await expect(page.getByTestId("press-reading-proof")).toBeVisible();
  const before = await proof(page);
  expect(before.publication.id).toBeTruthy();
  const article = page.locator(`[data-story-id="${before.publication.id}"]`);
  await article.getByRole("button").first().click();
  await expect(page.getByTestId("news-article")).toBeVisible();
  const read = await proof(page);
  const exact = read.mediaKnowledge.filter(
    (row) => row.source.reference === before.publication.id,
  );
  expect(exact).toHaveLength(1);
  expect(exact[0]!.eventId).toBe(before.publication.sourceEventId);
  expect(read.mediaKnowledge.length - before.mediaKnowledge.length).toBe(1);
  expect(read.moment).toEqual(before.moment);
  expect(read.transferCount).toBe(before.transferCount);
  await page.getByRole("button", { name: "← Front page" }).click();
  await article.getByRole("button").first().click();
  expect((await proof(page)).mediaKnowledge).toEqual(read.mediaKnowledge);
  await page.getByRole("button", { name: "Keep generated test world" }).click();
  await expect(page.getByTestId("press-reading-saved")).toHaveText("saved");
  await page.reload();
  await expect(page.getByTestId("press-reading-proof")).toBeVisible();
  expect((await proof(page)).mediaKnowledge).toEqual(read.mediaKnowledge);
  await page
    .locator(`[data-story-id="${before.publication.id}"]`)
    .getByRole("button")
    .first()
    .click();
  expect((await proof(page)).mediaKnowledge).toEqual(read.mediaKnowledge);
});

test("informational preview and browse never acquire the displayed story", async ({
  page,
}) => {
  await page.goto(
    `/tests/e2e/support/press-reading.html?informational=true&case=preview-${crypto.randomUUID()}`,
  );
  await expect(page.getByTestId("press-reading-proof")).toBeVisible();
  const before = await proof(page);
  await page.getByTestId("news-section-directory").click();
  await page.getByTestId("news-section-read").click();
  await page
    .locator(`[data-story-id="${before.publication.id}"]`)
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByTestId("news-article")).toBeVisible();
  expect(await proof(page)).toEqual(before);
});
