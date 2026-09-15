import { writeFileSync } from "node:fs";
import { test, expect, type Page } from "./fixtures";
import { startLife, enterLife, saveLife } from "./support/creator";
test.use({ video: "on" });
async function wardrobe(page: Page) {
  await page.getByTestId("shell-nav-cluster").click();
  await page.getByTestId("nav-group-personal").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  await page
    .getByTestId("saved-appearance-controls")
    .locator("summary")
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("wardrobe-full-body")).toBeVisible();
}
async function parts(page: Page) {
  return page
    .getByTestId("wardrobe-full-body")
    .locator("img")
    .evaluateAll((es) =>
      es.map((e) => ({
        id: e.dataset.assetId,
        kind: e.dataset.kind,
        src: e.getAttribute("src"),
      })),
    );
}
test("normal candidate complete defaults, actual edits and separate saved lives", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const saved = [];
  for (const n of [1, 2]) {
    await page.goto(`/?seed=p29-outfit-${n}&art-preview=candidate`);
    await startLife(page, {
      place: "Lexington",
      state: "Kentucky",
      age: 34,
      route: "normal",
      givenName: `Outfit${n}`,
      familyName: "Review",
    });
    await enterLife(page);
    await wardrobe(page);
    await expect(page.getByTestId("wardrobe-full-body")).toHaveAttribute(
      "data-complete",
      "true",
    );
    // Default is already complete. Explicitly choose a body with banked bottom alternatives;
    // the legacy feminine family has only one bottom until V supplies its new templates.
    const body = page.getByRole("combobox", { name: "Body", exact: true });
    if (
      (await body.inputValue()) !==
      "wave-a-average-man-standing-neutral-front-a-v1-pv4"
    ) {
      await body.selectOption(
        "wave-a-average-man-standing-neutral-front-a-v1-pv4",
      );
      const confirm = page.getByRole("button", {
        name: "Apply this outfit",
        exact: true,
      });
      if (await confirm.count()) await confirm.click();
      await expect(body).toHaveValue(
        "wave-a-average-man-standing-neutral-front-a-v1-pv4",
      );
    }
    const before = await parts(page);
    for (const kind of ["top", "bottom"]) {
      const select = page.getByRole("combobox", { name: kind, exact: true });
      const current = await select.inputValue();
      const choices = await select.locator("option").evaluateAll((es) =>
        es
          .filter((e): e is HTMLOptionElement => e instanceof HTMLOptionElement)
          .filter((e) => e.value && !e.disabled)
          .map((e) => e.value),
      );
      const next = choices.find((v) => v !== current);
      expect(next).toBeTruthy();
      if (kind === "top") await select.selectOption(next!);
      else {
        await select.focus();
        await page.keyboard.press("Home");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
        if ((await select.inputValue()) === current)
          await select.selectOption(next!);
      }
    }
    const after = await parts(page);
    expect(after).not.toEqual(before);
    const identity = (xs: typeof after) =>
      xs.filter((x) =>
        ["body", "head", "hair-front", "hair-back"].includes(x.kind!),
      );
    expect(identity(after)).toEqual(identity(before));
    expect(
      await page
        .getByRole("combobox", { name: "Outfit view" })
        .locator('option[value="seated-guest-neutral"]')
        .count(),
    ).toBe(0);
    await saveLife(page);
    saved.push(after);
    await page.screenshot({ path: info.outputPath(`life${n}-swapped.png`) });
  }
  for (const n of [1, 2]) {
    await page.goto("/?art-preview=candidate");
    await page.getByTestId("open-saves").click();
    await page
      .getByTestId("save-entry")
      .filter({ hasText: `Outfit${n} Review` })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await enterLife(page);
    await wardrobe(page);
    expect(await parts(page)).toEqual(saved[n - 1]);
  }
  writeFileSync(
    info.outputPath("actual-parts.json"),
    JSON.stringify(saved, null, 2),
  );
});
