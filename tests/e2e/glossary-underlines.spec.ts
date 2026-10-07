import { expect, test, type Page } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

/*
 * UI 2 orders, September 29, 2026: a civic word in any sentence has a quiet
 * underline, resting on it shows the plain definition, and "Got it" removes
 * the underline everywhere while the Guide keeps the entry.
 */

async function markedWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const registry = (
      CSS as unknown as { highlights?: Map<string, Set<Range>> }
    ).highlights;
    const marks = registry?.get("pg-guide-term");
    return marks ? Array.from(marks, (range) => range.toString()) : [];
  });
}

async function pointAt(page: Page, words: string, within: string) {
  return page.evaluate(
    ([wanted, testId]) => {
      const scope = document.querySelector(`[data-testid="${testId}"]`);
      const registry = (
        CSS as unknown as { highlights?: Map<string, Set<Range>> }
      ).highlights;
      for (const range of registry?.get("pg-guide-term") ?? []) {
        if (range.toString() !== wanted) continue;
        if (!scope?.contains(range.startContainer)) continue;
        const rect = range.getClientRects()[0];
        if (rect)
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
      }
      return null;
    },
    [words, within] as const,
  );
}

test("a civic word is underlined, explains itself on hover, and Got it clears it", async ({
  page,
}, info) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await startLife(page, { place: "Peoria", state: "Illinois", age: 34 });
  await enterLife(page);

  await goTo(page, "nav-guide");
  await page.getByTestId("guide-result-veto").click();
  const explanation = page.getByTestId("guide-entry-explanation");
  await expect(explanation).toContainText("override the veto");

  // The phrase in the sentence is marked, and the text itself is unchanged.
  await expect.poll(() => markedWords(page)).toContain("override the veto");
  await explanation.scrollIntoViewIfNeeded();
  const point = await pointAt(
    page,
    "override the veto",
    "guide-entry-explanation",
  );
  expect(point).not.toBeNull();

  await page.mouse.move(point!.x, point!.y);
  const card = page.getByTestId("guide-term-card-veto-override");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Veto override");
  await expect(card).toContainText(
    "A vote by the legislature that makes a vetoed bill law anyway.",
  );
  // The card is a definition, never a citation.
  await expect(card).not.toContainText(/https?:|\.gov|source/i);
  await page.screenshot({ path: info.outputPath("glossary-hovered.png") });

  // Moving away closes it; nothing was learned by reading.
  await page.mouse.move(8, 8);
  await expect(card).toBeHidden();
  await page.mouse.move(point!.x, point!.y);
  await expect(card).toBeVisible();

  await card.getByTestId("guide-term-learned-veto-override").click();
  await expect(card).toBeHidden();
  await expect.poll(() => markedWords(page)).not.toContain("override the veto");
  await expect(explanation).toContainText("override the veto");
  await page.mouse.move(8, 8);
  await page.screenshot({ path: info.outputPath("glossary-learned.png") });

  // The Guide still lists the learned term.
  await expect(page.getByTestId("guide-result-veto-override")).toBeVisible();
});
