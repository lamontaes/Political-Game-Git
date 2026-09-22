import { expect, test } from "./fixtures";

// Run against an isolated event-log replay, never the owner's live store.
test("returned meeting-room revision stays with the art team across filtering and reload", async ({
  page,
}, info) => {
  test.skip(
    process.env.PG_OWNER_QUEUE_REPLAY !== "1",
    "Requires the isolated owner-record replay.",
  );
  await page.goto("/art-desk.html");
  await page.getByTestId("art-desk-tab-in-progress").click();
  await page
    .getByTestId("art-desk-asset-type")
    .selectOption("environment-plate");
  const card = page.getByTestId(
    "art-desk-row-playtest65-public-meeting-room-clean",
  );
  await expect(card).toBeVisible();
  await expect(card).toContainText("With the art team");
  await card.click();
  const detail = page.getByTestId("art-desk-detail");
  await expect(detail).toContainText("Revision 2 · With the art team");
  await expect(
    page.getByTestId(
      "art-desk-candidate-cand-36fd6ef0-c3a7-49b0-aa30-0621ac498d47",
    ),
  ).toContainText("With the art team");
  await page.screenshot({
    path: info.outputPath("meeting-team-background-1440.png"),
  });
  await page.getByTestId("art-desk-tab-needs-review").focus();
  await page.keyboard.press("Enter");
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(card).toHaveCount(0);
  await page.getByTestId("art-desk-tab-in-progress").click();
  await expect(card).toContainText("With the art team");
  await page.setViewportSize({ width: 1024, height: 768 });
  await card.click();
  await expect(detail).toContainText("Revision 2 · With the art team");
  await page.screenshot({
    path: info.outputPath("meeting-team-background-1024.png"),
  });
});
