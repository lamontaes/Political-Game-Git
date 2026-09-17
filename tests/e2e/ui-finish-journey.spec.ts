import { expect, test, type Page } from "./fixtures";
import { chooseOption, optionValues } from "./support/controls";

import {
  fillCreator,
  goTo,
  openCreator,
  openShellMenu,
  saveLife,
  startLife,
  chooseStartAge,
} from "./support/creator";

/*
 * UI FINISH check groups, on a real non-Kentucky life (Alamo, Nevada), with a
 * full-window screenshot at each step. Every control is used the way a player
 * uses it — pointer or keyboard — not only asserted to be mounted.
 */

test.describe.configure({ timeout: 180_000 });

const VIEWPORT = { width: 1280, height: 860 };
const NEVADA = { state: "Nevada", place: "Alamo", age: 34 } as const;

async function freshBrowser(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/?art-preview=candidate");
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

function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}

/** The date the corner control announces; browsing must not move it. */
async function shellDate(page: Page): Promise<string> {
  const label =
    (await page.getByTestId("shell-nav-cluster").getAttribute("aria-label")) ??
    (await page.getByTestId("shell-nav-cluster").innerText());
  const match = /([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(label);
  expect(match, `no date in "${label}"`).not.toBeNull();
  return match![1]!;
}

test("group 1: Nevada creator, room, People, Calendar, Politics and back", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await freshBrowser(page);
  await openCreator(page);
  await page.getByTestId("start-normal").click();

  // Character: the age comes from a birth year, and only possible years are
  // offered, so an impossible age cannot be entered at all.
  const next = page.getByTestId("creator-continue-character");
  await expect(next).toBeDisabled();
  const years = await optionValues(page.getByTestId("start-birth-year"));
  expect(years[0]).toBe("2021");
  expect(Number(years[years.length - 1])).toBeGreaterThanOrEqual(1955);

  // Gender comes first; the name draw then uses it (CRUNCH46 R7).
  await expect(page.getByTestId("creator-randomize-name")).toBeDisabled();
  await page.getByTestId("gender-female").click();
  // A visible name draw, then keyboard activation of the same control.
  await page.getByTestId("creator-randomize-name").click();
  const first = page.getByLabel("First name", { exact: true });
  await expect(first).not.toHaveValue("");
  const drawn = await first.inputValue();
  await page.getByTestId("creator-randomize-name").focus();
  await page.keyboard.press("Enter");
  await expect(first).not.toHaveValue(drawn);

  // Month names; the day list follows the month.
  const month = page.getByTestId("start-birth-month");
  const day = page.getByTestId("start-birth-day");
  await expect(day).toBeDisabled();
  await chooseOption(month, { label: "February" });
  expect((await optionValues(day)).filter(Boolean)).toHaveLength(29);
  await chooseOption(month, { label: "July" });
  expect((await optionValues(day)).filter(Boolean)).toHaveLength(31);
  await chooseOption(day, "4");
  await chooseStartAge(page, NEVADA.age);
  await expect(next).toBeEnabled();
  await shot(page, "01-character");
  await next.click();

  // Place: an honest count and real paging, then a search.
  await page.getByTestId("state-search").fill(NEVADA.state);
  await page.getByTestId("state-NV").click();
  const status = page.getByTestId("place-page-status");
  await expect(status).toContainText(/places in this state/);
  const firstPageTown = await page
    .getByTestId("place-choices")
    .getByRole("button")
    .first()
    .innerText();
  const more = page.getByTestId("place-page-next");
  if (await more.count()) {
    await more.click();
    await expect(status).toContainText(/^Showing 25–/);
    await expect(
      page.getByTestId("place-choices").getByRole("button").first(),
    ).not.toHaveText(firstPageTown);
    await page.getByTestId("place-page-previous").focus();
    await page.keyboard.press("Enter");
    await expect(status).toContainText(/^Showing 1–/);
  }
  await shot(page, "02-towns");
  await page.getByTestId("place-search").fill(NEVADA.place);
  await page
    .getByTestId("place-choices")
    .getByRole("button")
    .filter({ hasText: /^Alamo, Nevada/ })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();

  await expect(page.getByTestId("whoareyou-play")).toHaveText(
    "Discover through play",
  );
  await expect(page.getByTestId("whoareyou-answer")).toHaveText(
    "Answer a few questions",
  );
  await expect(page.getByTestId("whoareyou-deep")).toContainText(
    "Answer more questions",
  );
  await page.getByTestId("whoareyou-play").click();
  await expect(page.getByTestId("begin")).toBeEnabled();
  await shot(page, "03-appearance");
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await shot(page, "04-room");
  const openingDate = await shellDate(page);

  // People: the face, by its name label and by the keyboard ring.
  await goTo(page, "elsewhere-people");
  const web = page.getByTestId("people-relationship-web");
  await expect(web).toBeVisible();
  await expect(page.getByTestId("people-web-connection")).toHaveText(
    "Choose a face to see how you know them.",
  );
  const other = web
    .locator('[data-testid^="people-web-node-"][data-focus="false"]')
    .first();
  const otherId = ((await other.getAttribute("data-testid")) ?? "").replace(
    "people-web-node-",
    "",
  );
  expect(otherId).not.toBe("");
  await other.locator(".pg-relationship-web-label-hit").click();
  await expect(page.getByTestId("quick-dossier")).toHaveAttribute(
    "data-person-id",
    otherId,
  );
  await expect(
    web.locator(`[data-testid="people-web-node-${otherId}"]`),
  ).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("people-web-connection")).toHaveText(
    /^(How you know .+ — .+\.|No record connects you directly to .+\.)$/,
  );
  await shot(page, "05-people-selected");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("quick-dossier")).toHaveCount(0);
  await expect(web).toBeVisible();
  const ring = web
    .locator(`[data-testid="people-web-node-${otherId}"] circle`)
    .first();
  await ring.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("quick-dossier")).toHaveAttribute(
    "data-person-id",
    otherId,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("quick-dossier")).toHaveCount(0);

  // Calendar.
  await goTo(page, "nav-calendar");
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  await shot(page, "06-calendar");

  // Politics: office statuses, then one execute control per intent.
  await openShellMenu(page);
  await page.getByRole("menuitem", { name: /^Politics/ }).click();
  const offices = page.getByTestId("campaign-office-browser");
  await expect(offices).toBeVisible();
  for (const statusLine of await offices
    .locator("[data-testid^='campaign-office-status-']")
    .allInnerTexts()) {
    expect(statusLine).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
    const sentences = statusLine.split(/(?<=\.)\s+/).filter(Boolean);
    expect(new Set(sentences).size).toBe(sentences.length);
  }
  await expect(page.getByTestId("file-candidacy")).toBeDisabled();
  await shot(page, "07-offices");
  const eligible = offices.locator('label[data-eligible="true"] input');
  if ((await eligible.count()) > 0) {
    await eligible.first().check();
    await expect(page.getByTestId("file-candidacy")).toBeEnabled();
    await page.getByTestId("file-candidacy").click();
    const now = page.getByRole("group", { name: "Do this now" });
    await expect(now).toBeVisible();
    await expect(page.getByTestId("campaign-strategy-commit")).toHaveCount(0);
    await now.getByTestId("campaign-outreach").click();
    await expect(page.getByTestId("campaign-strategy-report")).toBeVisible();
    await shot(page, "08-campaign");
  } else {
    test.info().annotations.push({
      type: "limitation",
      description: "No office in this save is eligible to file for.",
    });
  }

  // Back to the room; browsing did not change the day.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await shot(page, "09-return");
  if ((await eligible.count()) === 0) {
    expect(await shellDate(page)).toBe(openingDate);
  }
  expect(errors).toEqual([]);
});

test("group 2a: short questions run to the life in Nevada", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await freshBrowser(page);
  await startLife(page, { ...NEVADA, calibration: "short" });
  let asked = 0;
  for (; asked < 80; asked += 1) {
    if ((await page.getByTestId("questionnaire-screen").count()) === 0) break;
    if (asked === 0) await shot(page, "10-short-question");
    const options = page
      .getByTestId("questionnaire-options")
      .getByRole("button");
    if (asked % 2 === 0) {
      await options.first().click();
    } else {
      await options.last().focus();
      await page.keyboard.press("Enter");
    }
  }
  expect(asked).toBeGreaterThan(0);
  // Answering returns to the appearance step; Begin enters the life.
  await expect(page.getByTestId("begin")).toBeEnabled();
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await shot(page, "11-after-short");
  expect(errors).toEqual([]);
});

test("group 2b: deep questions accept an answer and move on", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await freshBrowser(page);
  await fillCreator(page, { ...NEVADA, calibration: "deep" });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
  const prompt = page.getByTestId("questionnaire-prompt");
  const before = await prompt.innerText();
  await shot(page, "12-deep-question");
  await page
    .getByTestId("questionnaire-options")
    .getByRole("button")
    .first()
    .click();
  await expect
    .poll(async () =>
      (await page.getByTestId("questionnaire-screen").count()) === 0
        ? "left"
        : await prompt.innerText(),
    )
    .not.toBe(before);
  expect(errors).toEqual([]);
});

test("group 2c: browsing is free, save and reopen keep the day, the clock moves", async ({
  page,
}) => {
  const errors = watchPageErrors(page);
  await freshBrowser(page);
  await startLife(page, { ...NEVADA, calibration: "skipped" });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  const day = await shellDate(page);

  await goTo(page, "elsewhere-people");
  const node = page
    .getByTestId("people-relationship-web")
    .locator('[data-testid^="people-web-node-"][data-focus="false"]')
    .first();
  await node.locator("circle").click();
  await expect(page.getByTestId("quick-dossier")).toBeVisible();
  await page.keyboard.press("Escape");
  await goTo(page, "nav-calendar");
  await page.keyboard.press("Escape");
  expect(await shellDate(page)).toBe(day);

  await saveLife(page);
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  expect(await shellDate(page)).toBe(day);
  await shot(page, "13-reopened");

  await page.getByTestId("shell-pass-day").click();
  await expect.poll(() => shellDate(page)).not.toBe(day);
  await shot(page, "14-next-day");
  expect(errors).toEqual([]);
});
