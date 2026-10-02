import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import { enterLife, goTo, openNewsContext } from "./support/creator";

test("Around shows the saved principal's reopening without a whole-school absence count", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  const file = testInfo.outputPath("school-cohort-world.json");
  const fixture = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "tests/fixtures/school-cohort-news-save.ts", file],
      { encoding: "utf8" },
    ),
  ) as {
    seed: string;
    place: string;
    eventId: string;
    principalId: string;
    principalName: string;
    schoolId: string;
    schoolName: string;
    studentIds: string[];
    summary: string;
  };
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
  const event = page.locator(`[data-event-id="${fixture.eventId}"]`);
  await expect(event).toBeVisible();
  await expect(event).toContainText(
    `${fixture.principalName}, the principal, reopened ${fixture.schoolName}.`,
  );
  await expect(event).toContainText(fixture.summary);
  await expect(event).not.toContainText(
    /\b\d+ of \d+\b|\b0 (?:students|staff)\b|no(?:body| one| students| staff).*sick|everyone.*healthy/i,
  );
  await testInfo.attach("sampled-school-cohort", {
    body: JSON.stringify(fixture),
    contentType: "application/json",
  });
  await event.screenshot({
    path: testInfo.outputPath("school-cohort-news.png"),
  });
});
