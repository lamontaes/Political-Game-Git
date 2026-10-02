import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import { enterLife, goTo, openNewsContext } from "./support/creator";

test("Around names the saved program decision without exposing its internal key", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  const file = testInfo.outputPath("program-decision-world.json");
  const fixture = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "tests/fixtures/program-decision-news-save.ts", file],
      { encoding: "utf8" },
    ),
  ) as {
    seed: string;
    place: string;
    eventId: string;
    summary: string;
    serviceLabel: string;
    programKey: string;
  };
  // Canonical saved fixture through the existing store, then ordinary Continue.
  await page.evaluate(
    async (serialized) => {
      const serializerPath = "/src/simulation/serialization.ts";
      const storePath = "/src/presentation/browser-world-repository.ts";
      const { deserializeWorld } = await import(
        /* @vite-ignore */ serializerPath
      );
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      const world = deserializeWorld(serialized);
      const store = new BrowserSaveStore();
      const saved = await store.save(world, store.newSaveId(world));
      if (saved.status !== "saved")
        throw new Error(`Save refused: ${saved.status}`);
    },
    readFileSync(file, "utf8"),
  );
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "nav-news");
  await openNewsContext(page, "around");
  const reader = page.getByTestId("world39-news");
  const event = reader.locator(`[data-event-id="${fixture.eventId}"]`);
  await expect(event).toHaveCount(1);
  await expect(event).toContainText(fixture.summary);
  await expect(event).toContainText(fixture.serviceLabel);
  await expect(event).not.toContainText(fixture.programKey);
  await expect(event).not.toContainText(/\b[\w-]+:us-[a-z]{2}\b/i);
  await testInfo.attach("sampled-program-decision", {
    body: JSON.stringify(fixture),
    contentType: "application/json",
  });
  await reader.screenshot({
    path: testInfo.outputPath("program-decision-news.png"),
  });
});
