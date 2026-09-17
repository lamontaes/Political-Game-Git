import { expect, type Locator } from "@playwright/test";

/*
 * The game's own select (src/player/controls/GameSelect.tsx) replaces native
 * `<select>` in play. These helpers choose and read a value the way a player
 * does — open the list, pick the option — and still work on a native select
 * where a developer surface keeps one.
 */

type Choice =
  | string
  | { readonly label: string }
  | { readonly value: string }
  | { readonly index: number };

async function isNative(control: Locator): Promise<boolean> {
  return (await control.evaluate((element) => element.tagName)) === "SELECT";
}

function attr(value: string): string {
  return JSON.stringify(value);
}

/** Opens the control's list and picks one option, by value or label. */
export async function chooseOption(
  control: Locator,
  choice: Choice,
): Promise<void> {
  if (await isNative(control)) {
    await control.selectOption(choice);
    return;
  }
  await expect(control).toBeEnabled();
  if ((await control.getAttribute("aria-expanded")) !== "true") {
    await control.click();
  }
  const listId = await control.getAttribute("aria-controls");
  const list = control.page().locator(`[id=${attr(listId ?? "")}]`);
  await expect(list).toBeVisible();
  const option =
    typeof choice === "string"
      ? list.locator(`[role="option"][data-value=${attr(choice)}]`)
      : "value" in choice
        ? list.locator(`[role="option"][data-value=${attr(choice.value)}]`)
        : "index" in choice
          ? list.locator('[role="option"]').nth(choice.index)
          : list.getByRole("option", { name: choice.label, exact: true });
  await option.click();
  await expect(list).toHaveCount(0);
  if (typeof choice === "string") {
    await expect(control).toHaveAttribute("data-value", choice);
  } else if ("value" in choice) {
    await expect(control).toHaveAttribute("data-value", choice.value);
  }
}

/** The chosen value, from either kind of select. */
export async function chosenValue(control: Locator): Promise<string> {
  if (await isNative(control)) return control.inputValue();
  return (await control.getAttribute("data-value")) ?? "";
}

/** Asserts the chosen value, from either kind of select. */
export async function expectChosen(
  control: Locator,
  value: string | RegExp,
): Promise<void> {
  if (await isNative(control)) {
    await expect(control).toHaveValue(value);
    return;
  }
  await expect(control).toHaveAttribute("data-value", value);
}

/** The options a select offers, in order, as value and visible label. */
export async function optionEntries(
  control: Locator,
): Promise<{ value: string; label: string }[]> {
  if (await isNative(control)) {
    return control.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option.textContent ?? "").trim(),
      })),
    );
  }
  await control.click();
  const listId = await control.getAttribute("aria-controls");
  const list = control.page().locator(`[id=${attr(listId ?? "")}]`);
  await expect(list).toBeVisible();
  const entries = await list.locator('[role="option"]').evaluateAll((options) =>
    options.map((option) => ({
      value: option.getAttribute("data-value") ?? "",
      label: (option.textContent ?? "").trim(),
    })),
  );
  await control.press("Escape");
  await expect(list).toHaveCount(0);
  return entries;
}

/** The option values a select offers, in order. */
export async function optionValues(control: Locator): Promise<string[]> {
  return (await optionEntries(control)).map((entry) => entry.value);
}
