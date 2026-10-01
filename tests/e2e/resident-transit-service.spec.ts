import { expect, test } from "@playwright/test";
import { openPoliticsHub, openShellMenu, saveLife } from "./support/creator";
import { readSavedLegislativeWorld } from "./support/legislative-entry";

test("the actual player root admits a resident trip without office authority and keeps its completed receipt", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/e2e/fixtures/resident-transit-service.html");
  await page
    .getByRole("link", { name: "Open the saved resident in the game" })
    .click();
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
  const before = await readSavedLegislativeWorld(page);
  await openPoliticsHub(page, "nav-politics-transit");
  const panel = page.getByRole("region", { name: "Request a transit trip" });
  await expect(
    panel.getByText("Authored resident transit operator", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "File transit appropriation",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.getByTestId("politics-sub-tax")).toHaveCount(0);
  await panel.getByLabel("Start in how many minutes?").fill("30");
  await panel
    .getByRole("button", { name: /Request a \d+-minute trip/ })
    .click();
  await expect(panel.getByRole("status")).toContainText("is scheduled");
  await expect(
    panel.getByRole("region", { name: "Your transit records" }),
  ).toContainText("No completed service receipt yet.");
  await openShellMenu(page);
  await page.getByTestId("nav-calendar").click();
  await page
    .getByTestId(/^calendar-entry-/)
    .and(
      page.getByRole("button", {
        name: /Ride with Authored resident transit operator/,
      }),
    )
    .click();
  await page.getByRole("button", { name: /^Travel ·/ }).click();
  await openPoliticsHub(page, "nav-politics-transit");
  await expect(
    panel.getByRole("region", { name: "Your transit records" }),
  ).toContainText("Service receipt recorded.");
  await saveLife(page);
  const after = await readSavedLegislativeWorld(page);
  const receipts = after.history.events.filter(
    (event) => event.type === "service.delivery-recorded",
  );
  expect(receipts).toHaveLength(1);
  expect(after.control.kind).toBe("person");
  if (after.control.kind !== "person")
    throw new Error("The saved resident lost control.");
  expect(receipts[0]!.participants[0]!.personId).toBe(after.control.personId);
  expect(receipts[0]!.lawEffectStamps).toHaveLength(1);
  expect(after.history.resourceTransferOutcomes).toEqual(
    before.history.resourceTransferOutcomes,
  );
  await page.reload();
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await openPoliticsHub(page, "nav-politics-transit");
  await expect(
    panel.getByRole("region", { name: "Your transit records" }),
  ).toContainText("Service receipt recorded.");
  await expect(
    page.getByRole("button", {
      name: "File transit appropriation",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    (await readSavedLegislativeWorld(page)).history.events.filter(
      (event) => event.type === "service.delivery-recorded",
    ),
  ).toEqual(receipts);
  expect(errors).toEqual([]);
});
