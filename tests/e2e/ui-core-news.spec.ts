import { saveLife } from "./support/creator";
import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";
import {
  reachMemberOffice,
  readSavedLegislativeWorld as savedWorld,
  expectRecordedMember,
} from "./support/legislative-entry";
import type { Page } from "@playwright/test";

async function save(page: Page) {
  await saveLife(page);
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
}

test("normal completed legislative action publishes News with person Back and unchanged read/save history", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-connect2-news");
  await startLife(page, { age: 38, route: "normal" });
  await enterLife(page);
  await goTo(page, "nav-news");
  await expect(page.getByTestId("public-information-empty")).toBeVisible();
  await page
    .getByRole("button", { name: "Close public information" })
    .press("Escape");
  await expect(page.getByTestId("shell-nav-cluster")).toBeFocused();
  await reachMemberOffice(page);
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await save(page);
  const published = await savedWorld(page);
  const { measure } = expectRecordedMember(published);
  const introduction = published.history.legislativeActions!.find(
    (action) => action.measureId === measure.id && action.kind === "introduced",
  );
  expect(introduction).toBeDefined();
  const publications = published.history.publications!.filter(
    (record) => record.sourceEventId === introduction!.eventId,
  );
  expect(publications).toHaveLength(1);
  await goTo(page, "nav-news");
  const article = page.locator(
    `.public-information-article[data-source-event-id="${introduction!.eventId}"]`,
  );
  const sourceEventId = await article.getAttribute("data-source-event-id");
  const source = published.history.events.find(
    (event: { id: string }) => event.id === sourceEventId,
  );
  expect(source!.visibility).toBe("public");
  expect(sourceEventId).toBe(introduction!.eventId);
  const person = article.locator(".public-information-people button").first();
  const personId = await person.getAttribute("data-person-id");
  const name = await person.innerText();
  await person.click();
  await expect(page.getByTestId("person-workspace")).toContainText(name);
  await expect(
    page.getByTestId("person-workspace").locator("[data-person-id]").first(),
  ).toHaveAttribute("data-person-id", personId!);
  await page.getByTestId("person-workspace-back").press("Enter");
  await expect(person).toBeFocused();
  await article
    .getByRole("button", { name: /^Explain/ })
    .first()
    .press("Enter");
  await expect(page.getByTestId("public-information-help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("public-information-help")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath(`normal-news-${page.viewportSize()!.width}.png`),
  });
  await save(page);
  expect(await savedWorld(page)).toEqual(published);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await expect(article).toHaveAttribute("data-source-event-id", sourceEventId!);
  await expect(person).toHaveAttribute("data-person-id", personId!);
  await save(page);
  expect(await savedWorld(page)).toEqual(published);
});

test("legislative staff can preview but cannot file or publish a member bill", async ({
  page,
}) => {
  await page.goto("/?seed=ui-connect2-news");
  await startLife(page, { age: 38, route: "custom", office: true });
  await enterLife(page);
  await save(page);
  const before = await savedWorld(page);
  await goTo(page, "elsewhere-work");
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await expect(page.getByTestId("drafting-filing-refusal")).toContainText(
    "member seat",
  );
  await expect(page.getByTestId("file-the-draft")).toBeDisabled();
  await expect(page.getByTestId("drafting-compare")).toBeVisible();
  await save(page);
  expect(await savedWorld(page)).toEqual(before);
  await goTo(page, "nav-news");
  await expect(page.getByTestId("public-information-empty")).toBeVisible();
});

test("opening the normal press request form creates no request or consent", async ({
  page,
}) => {
  await page.goto("/?seed=ui-news-producers-read");
  await startLife(page, { age: 34, route: "normal" });
  await enterLife(page);
  await save(page);
  const before = await savedWorld(page);
  await goTo(page, "nav-news");
  const form = page.getByTestId("press-request-form");
  await form.locator("summary").press("Enter");
  await expect(form).toHaveAttribute("open", "");
  await expect(
    form.getByRole("button", { name: "Send request" }),
  ).toBeDisabled();
  await expect(
    form
      .getByRole("combobox", { name: "Reporter", exact: true })
      .locator("option"),
  ).toHaveCount(1);
  await form
    .getByLabel("Your pitch")
    .fill("A question about a published story.");
  await expect(
    form.getByRole("button", { name: "Send request" }),
  ).toBeDisabled();
  await form.locator("summary").click();
  await save(page);
  expect(await savedWorld(page)).toEqual(before);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await save(page);
  expect(await savedWorld(page)).toEqual(before);
});
