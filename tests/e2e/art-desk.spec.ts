import { expect, test } from "./fixtures";

test("private Art Desk reviews the durable queue without writing saves", async ({
  page,
}) => {
  await page.goto("/art-desk.html");
  await expect(page.getByTestId("art-desk")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Art Desk" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Needs your review", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("art-desk-pack")).toContainText("access/input");
  await expect(
    page.getByTestId("art-desk-row-env-neighborhood-doorstep-generic"),
  ).toBeVisible();
  await page
    .getByTestId("art-desk-row-env-neighborhood-doorstep-generic")
    .click();
  await expect(page.getByTestId("art-desk-detail")).toContainText("stoop");
  await expect(page.getByTestId("art-desk-preview")).toBeVisible();
  await expect(
    page
      .getByTestId("art-desk-candidate-preview")
      .or(page.getByTestId("art-desk-candidate-preview-missing")),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page
    .getByRole("button", { name: "Covered / history", exact: true })
    .click();
  await expect(
    page.getByTestId("art-desk-row-env-campaign-storefront"),
  ).toBeVisible();
  await expect(
    page.getByTestId("art-desk-row-env-campaign-storefront"),
  ).toContainText("do not generate");
  const before = await page.evaluate(() => indexedDB.databases());
  await page.setViewportSize({ width: 1200, height: 720 });
  await expect(page.getByTestId("art-desk")).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByTestId("art-desk")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  const after = await page.evaluate(() => indexedDB.databases());
  expect(after).toEqual(before);
});

test("Art Desk bridge refuses traversal and production-style hosts", async ({
  request,
  baseURL,
}) => {
  const traversal = await request.get(
    "/__dev/art-desk/file?path=art/requests/../../package.json",
  );
  expect(traversal.status()).toBe(403);
  const forged = await request.put(
    "/__dev/art-desk/file?path=art/requests/asset-reviews.json",
    {
      headers: {
        Origin: "https://example.invalid",
        "Content-Type": "application/json",
      },
      data: "{}",
    },
  );
  expect(forged.status()).toBe(403);
  const candidate = await request.get(
    "/__dev/art-desk/file?path=art/generated/candidates/art-desk/env-neighborhood-doorstep-generic/b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266.jpg",
  );
  expect([200, 404]).toContain(candidate.status());
  expect(candidate.status()).not.toBe(403);
  expect(baseURL).toMatch(/127\.0\.0\.1|localhost|\[::1\]/);
});
