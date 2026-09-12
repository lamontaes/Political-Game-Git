import { saveLife } from "./support/creator";
import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";
import { readSavedLegislativeWorld as savedWorld } from "./support/legislative-entry";

test("ordinary News press route establishes a reporter, records the NPC decision, publishes, and reloads", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.goto("/?seed=press-reach13-ordinary");
  await startLife(page, {
    age: 34,
    route: "custom",
    office: true,
    household: "shares-a-home",
  });
  await enterLife(page);
  await goTo(page, "nav-news");

  const workspace = page.getByTestId("normal-press-workspace");
  await expect(workspace).toBeVisible();
  const form = page.getByTestId("press-request-form");
  await form.locator("summary").click();
  await expect(form).toHaveAttribute("open", "");

  const establish = page.getByTestId("press-establish-reporter");
  await expect(establish).toBeVisible();
  await establish.click();
  await expect(establish).toHaveCount(0);

  const development = form.getByTestId("press-basis-select");
  await expect
    .poll(async () => development.locator("option").count())
    .toBeGreaterThan(1);
  const meeting = development
    .locator("option")
    .filter({ hasText: /public meeting|agenda/i })
    .first();
  if ((await meeting.count()) > 0) {
    await development.selectOption({ label: (await meeting.textContent())! });
  } else {
    await development.selectOption({ index: 1 });
  }
  const reporter = form.getByTestId("press-reporter-select");
  await expect
    .poll(async () => reporter.locator("option").count())
    .toBeGreaterThan(1);
  await reporter.selectOption({ index: 1 });
  await form
    .getByLabel("Your pitch")
    .fill("Ask about this already recorded public development.");
  await form
    .getByLabel("Proposed question")
    .fill("What public record exists from this development?");
  await form.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByText("Request recorded. Awaiting the reporter’s response."),
  ).toBeVisible();

  const request = page.getByTestId("press-saved-request");
  await request.getByTestId("press-ask-reporter").click();
  await expect(request.getByTestId("press-ask-reporter")).toHaveCount(0);
  await expect(request).toContainText(/accepted/i);

  await request.getByText("Arrange the accepted exchange").click();
  await request.getByLabel("Minutes from now").fill("0");
  await request.getByLabel("Exchange minutes").fill("20");
  await request.getByLabel("Planned meeting place").fill("Office press room");
  await request.getByTestId("press-arrange-exchange").click();

  const panel = page.getByTestId("press-interview-panel");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: "Condensed" }).press("Enter");
  await expect(page.getByTestId("condensed-explanation")).toBeVisible();
  await panel
    .getByLabel("Follow-up being answered")
    .fill("What remains on the public record?");
  await panel
    .getByLabel("Consequential wording")
    .fill(
      "The recorded public development is already part of this civic life.",
    );
  await panel.getByRole("button", { name: "Review exact wording" }).click();
  await expect(page.getByTestId("press-exact-wording")).toHaveText(
    "The recorded public development is already part of this civic life.",
  );
  await panel
    .getByRole("button", { name: "Confirm this exact wording" })
    .press("Enter");
  await panel
    .getByRole("button", { name: "Complete arranged exchange" })
    .click();
  await panel.getByRole("button", { name: "Record published report" }).click();

  const article = page.locator(".public-information-article").first();
  await expect(article).toBeVisible();
  await expect(article).toContainText(
    "The recorded public development is already part of this civic life.",
  );
  await page.screenshot({
    path: info.outputPath("press-reach13-ordinary-published.png"),
  });

  await saveLife(page);
  const published = await savedWorld(page);
  expect(published.history.publications?.length ?? 0).toBeGreaterThan(0);
  const publicationId = published.history.publications!.at(-1)!.id;

  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await expect(
    page.locator(".public-information-article").first(),
  ).toBeVisible();
  await saveLife(page);
  const reloaded = await savedWorld(page);
  expect(reloaded.history.publications!.at(-1)!.id).toBe(publicationId);
});
