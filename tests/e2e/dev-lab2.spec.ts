import { expect, test, type Page } from "./fixtures";

async function savedRecords(page: Page) {
  return page.evaluate(async () => {
    return await new Promise<string>((resolve, reject) => {
      const open = indexedDB.open("political-life-worlds");
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("worlds", "readonly");
        const get = tx.objectStore("worlds").getAll();
        get.onsuccess = () => {
          resolve(JSON.stringify(get.result));
          db.close();
        };
        get.onerror = () => reject(get.error);
      };
    });
  });
}

test("review clone, mutations, navigation, reset and exit preserve the complete normal save", async ({
  page,
}) => {
  await page.goto("/review.html?seed=dev-lab-browser-control");
  await expect(page.getByTestId("review-hub")).toBeVisible();
  await page.evaluate(async () => {
    // Real BrowserSaveStore, real canonical saved world; no fake persistence.
    const { BrowserSaveStore } = await import(
      /* @vite-ignore */ String("/src/presentation/browser-world-repository.ts")
    );
    const { createDemoWorld } = await import(
      /* @vite-ignore */ String("/src/simulation/index.ts")
    );
    const world = createDemoWorld("dev-lab-normal-save-control");
    const store = new BrowserSaveStore();
    await store.save(
      { ...world, control: { kind: "person", personId: world.personOrder[0] } },
      store.newSaveId(world),
    );
    localStorage.setItem("dev-lab-normal-control", "do not change");
  });
  const before = await savedRecords(page);
  const localBefore = await page.evaluate(() =>
    JSON.stringify({ ...localStorage }),
  );
  await page
    .getByRole("button", { name: "Inspect saved worlds", exact: true })
    .click();
  await page.getByRole("button", { name: /^Clone .*save_/ }).click();
  await expect(page.getByTestId("review-seed")).toHaveText(
    "dev-lab-normal-save-control",
  );
  const people = page.locator(".person-row");
  await people.nth(1).click();
  await page
    .getByRole("button", { name: "Control selected person in review clone" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(
      "Review control switched. No office, travel, time or history granted.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Advance 7 days", exact: true })
    .click();
  await expect(page.getByText(/Advanced 7 days to/)).toBeVisible();
  await page.getByRole("button", { name: "Causal trace", exact: true }).click();
  await expect(page.getByTestId("trace-seed")).toHaveText(
    "dev-lab-normal-save-control",
  );
  await page
    .getByRole("button", { name: "Offices & context", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("This character holds no active legislative member seat.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rooms & environments", exact: true })
    .click();
  const rooms = page.getByLabel("Inspect room");
  const scene = await rooms.locator("option").nth(2).getAttribute("value");
  await rooms.selectOption(scene!);
  await expect(page.getByTestId("scene-gallery-card")).toHaveCount(1);
  await expect(page.getByTestId("scene-gallery-card")).toHaveAttribute(
    "data-scene-id",
    scene!,
  );
  await page
    .getByRole("button", { name: "Reset review clone", exact: true })
    .click();
  expect(await savedRecords(page)).toBe(before);
  await page
    .getByRole("button", { name: "Legislation workflow fixture", exact: true })
    .click();
  await expect(page.getByTestId("legislation-workspace")).toBeVisible();
  await expect(page.getByTestId("review-context")).toContainText(
    "Authored development fixture",
  );
  await expect(page.getByTestId("review-seed")).not.toHaveText(
    "dev-lab-normal-save-control",
  );
  await page.getByRole("button", { name: /^Save/ }).click();
  expect(await savedRecords(page)).toBe(before);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(
    localBefore,
  );
  await page.screenshot({
    path: test.info().outputPath("review-workflow.png"),
    fullPage: false,
  });
  await page
    .getByRole("link", { name: "Exit review and discard", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(await savedRecords(page)).toBe(before);
});

test("hub reuses proof surfaces, keeps candidate storage disposable and identifies exact build", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/review.html?seed=dev-lab-gallery-control");
  await page
    .getByText("Exact build / source identity", { exact: true })
    .click();
  await expect(page.getByTestId("review-build")).toContainText(
    test.info().config.metadata.expectedIdentity.head,
  );
  await page
    .getByRole("button", { name: "Character candidate proof", exact: true })
    .click();
  await expect(page.getByTestId("character-proof")).toBeVisible();
  await page.getByTestId("character-proof-save").click();
  await page.getByTestId("character-proof-reload").click();
  await expect(page.getByTestId("character-proof")).toHaveAttribute(
    "data-world-source",
    "restored-snapshot",
  );
  await page.getByRole("link", { name: "DEV fixtures", exact: true }).click();
  await expect(page.getByTestId("review-hub")).toBeVisible();
  await expect(page.getByTestId("character-proof")).toHaveAttribute(
    "data-proof-set",
    "dev",
  );
  await page
    .getByRole("button", { name: "Office workflow fixture", exact: true })
    .click();
  await expect(page.getByTestId("review-seed")).toHaveText(
    "dev-lab-gallery-control",
  );
  await page
    .getByRole("button", { name: "Floor workflow fixture", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("review-context")).toContainText("floor");
  await page
    .getByRole("button", { name: "Content browser", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Content browser/i }),
  ).toBeVisible();
  await page.setViewportSize({ width: 900, height: 720 });
  await page
    .getByRole("heading", { name: "Content browser", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("review-900.png"),
    fullPage: false,
  });
  expect(errors).toEqual([]);
});
