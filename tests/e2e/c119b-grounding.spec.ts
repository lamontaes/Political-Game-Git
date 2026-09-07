import { expect, test } from "@playwright/test";
import { enterLife, startLife } from "./support/creator";

test("childhood choices commit through pointer and keyboard activation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await startLife(page, { age: 7, childhood: true });
  await enterLife(page);
  for (const activation of ["pointer", "Enter", "Space"] as const) {
    const prose = page.getByTestId("story-prose");
    const before = await prose.innerText();
    const option = page
      .getByTestId("story-options")
      .getByRole("button")
      .first();
    await expect(option).toBeEnabled();
    if (activation === "pointer") await option.click();
    else {
      await option.focus();
      await expect(option).toBeFocused();
      await option.press(activation);
    }
    await expect(prose).not.toHaveText(before);
    await expect(page.getByTestId("story-options")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
