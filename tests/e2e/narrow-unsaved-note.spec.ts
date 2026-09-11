import { expect, test } from "@playwright/test";

import { enterLife } from "./support/creator";

/**
 * The status notes must not sit on the primary action at phone width.
 *
 * The HUD is a fixed panel pinned under the top-left corner, and so is the
 * moment panel's heading. At 390px "This life has not been saved yet." landed
 * squarely across "Continue your life" and left the button reading "…ife".
 *
 * Both halves are checked, because either alone would let the defect back:
 * the label has to be READABLE, which is geometry, and the button has to be
 * PRESSABLE, which is hit testing. No force-click anywhere — a forced press
 * would sail straight through the overlay and report success while a real
 * finger hit the note.
 */

const PHONE = { width: 390, height: 844 };

test.describe("status notes at phone width", () => {
  test.use({ viewport: PHONE });

  test("leave the primary action readable and pressable", async ({ page }) => {
    await enterLife(page);

    const note = page.getByTestId("unsaved-note");
    const primary = page.getByRole("button", { name: /continue your life/i });
    await expect(primary).toBeVisible();

    // 1. Geometry: the note does not cover the primary action.
    if (await note.count()) {
      const noteBox = await note.boundingBox();
      const primaryBox = await primary.boundingBox();
      expect(noteBox).not.toBeNull();
      expect(primaryBox).not.toBeNull();
      const overlaps = !(
        noteBox!.x + noteBox!.width < primaryBox!.x ||
        noteBox!.x > primaryBox!.x + primaryBox!.width ||
        noteBox!.y + noteBox!.height < primaryBox!.y ||
        noteBox!.y > primaryBox!.y + primaryBox!.height
      );
      expect(overlaps).toBe(false);
    }

    // 2. Hit testing: what is actually under the button's own centre is the
    //    button. Playwright's ordinary click enforces this; a forced one would
    //    not, which is why this is a plain click.
    await primary.click();

    // 3. And the same control is reachable without a pointer at all.
    await page.reload({ waitUntil: "domcontentloaded" });
    await enterLife(page);
    const again = page.getByRole("button", { name: /continue your life/i });
    await again.focus();
    await expect(again).toBeFocused();
    await page.keyboard.press("Enter");
  });

  test("never swallow a press meant for the room behind them", async ({
    page,
  }) => {
    await enterLife(page);
    const note = page.getByTestId("unsaved-note");
    if ((await note.count()) === 0) test.skip();
    const box = await note.boundingBox();
    expect(box).not.toBeNull();
    /*
     * The container was the hit target, not the sentence inside it, so the
     * check asks the document what is under the note's own centre rather than
     * asking the note about itself.
     */
    const underneath = await page.evaluate(
      ([x, y]) => {
        const element = document.elementFromPoint(x, y);
        return element ? element.className : null;
      },
      [box!.x + box!.width / 2, box!.y + box!.height / 2] as const,
    );
    expect(String(underneath ?? "")).not.toContain("life-hud");
  });
});
