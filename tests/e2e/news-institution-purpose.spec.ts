import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";
import { enterLife, goTo, openNewsContext } from "./support/creator";

test("Around names a saved institution's purpose without public-institution filler", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  // Controlled saved profiles, sampled from the same all-56 place universe as
  // the native tests. This is the ordinary Continue -> News -> Around route.
  const file = testInfo.outputPath("institution-world.json");
  const fixture = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "tests/fixtures/news-institution-purpose-save.ts",
        file,
      ],
      { encoding: "utf8" },
    ),
  ) as { seed: string; place: string; schoolId: string; omittedId: string };
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
  const standing = page.getByTestId("world39-standing");
  const school = standing.locator(`[data-record-id="${fixture.schoolId}"]`);
  await expect(school).toContainText(
    `Purpose fixture academy is a place for private schooling in ${fixture.place}.`,
  );
  await expect(
    standing.locator(`[data-record-id="${fixture.omittedId}"]`),
  ).toHaveCount(0);
  await expect(standing).not.toContainText("is a public institution");
  await testInfo.attach("sampled-place", {
    body: JSON.stringify(fixture),
    contentType: "application/json",
  });
  await standing.screenshot({
    path: testInfo.outputPath("institution-purpose.png"),
  });
});
