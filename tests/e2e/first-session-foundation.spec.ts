import { expect, test, type Page } from "@playwright/test";

type StartOptions = {
  readonly givenName: string;
  readonly familyName: string;
  readonly age: number;
  readonly birthplace?: string;
  readonly hometown?: string;
  readonly residence?: string;
  readonly depth?: "play" | "build";
  readonly historyDate?: string;
  readonly historySummary?: string;
  readonly policy?: "skip" | "support";
};

async function clearSaves(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    window.localStorage.clear();
    const databases = await window.indexedDB.databases?.();
    for (const database of databases ?? []) {
      if (!database.name) continue;
      await new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(database.name!);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      });
    }
  });
  await page.reload();
}

async function startLife(page: Page, options: StartOptions) {
  await page.getByRole("button", { name: "New Game" }).click();
  await page.getByLabel("First name").fill(options.givenName);
  await page.getByLabel("Last name").fill(options.familyName);
  await page.getByLabel("Starting age in years").fill(String(options.age));
  await page.getByRole("button", { name: "Continue" }).click();

  await page
    .getByLabel("Birthplace")
    .selectOption(options.birthplace ?? "lexington-kentucky");
  await page
    .getByLabel("Hometown")
    .selectOption(options.hometown ?? "lexington-kentucky");
  await page
    .getByLabel("Current residence")
    .selectOption(options.residence ?? "lexington-kentucky");
  await page.getByRole("button", { name: "Continue" }).click();

  if (options.age >= 18) {
    await page.getByRole("radio", { name: /Own household/i }).check();
  }
  await page.getByRole("button", { name: "Continue" }).click();

  if (options.depth === "build") {
    await page.getByRole("radio", { name: /Build My History/i }).check();
    await page
      .getByLabel("History date 1")
      .fill(options.historyDate ?? "2020-06-15");
    await page
      .getByLabel("History description 1")
      .fill(
        options.historySummary ??
          `${options.givenName} made an important earlier choice.`,
      );
  }
  await page.getByRole("button", { name: "Continue" }).click();

  if (options.policy === "support") {
    await page
      .getByRole("checkbox", { name: /Answer direct policy questions/i })
      .check();
    await page
      .getByLabel(
        "Should the law strengthen protections for collective bargaining?",
      )
      .selectOption("support");
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Begin Life" }).click();
  await expect(page.getByTestId("life-home")).toBeVisible();
}

async function returnToTitle(page: Page) {
  await page.getByRole("button", { name: "Open pause menu" }).click();
  await page.getByRole("button", { name: "Return to Title" }).click();
  await expect(page.getByTestId("life-title-screen")).toBeVisible();
}

test.describe("First-Session Foundation", () => {
  test.beforeEach(async ({ page }) => {
    await clearSaves(page);
  });

  test("default route opens the title screen and no-save controls are honest", async ({
    page,
  }) => {
    await expect(page.getByTestId("life-title-screen")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Political Game" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New Game" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Load Game" })).toBeEnabled();
  });

  test("child start keeps place roles distinct and a played choice changes later availability", async ({
    page,
  }) => {
    await startLife(page, {
      givenName: "Jamie",
      familyName: "Patel",
      age: 8,
      birthplace: "los-angeles-california",
      hometown: "chicago-illinois",
      residence: "lexington-kentucky",
    });

    await expect(page.getByTestId("life-home")).toHaveAttribute(
      "data-life-stage",
      "Childhood",
    );
    await expect(page.getByText("Los Angeles, California")).toBeVisible();
    await expect(page.getByText("Chicago, Illinois")).toBeVisible();
    await expect(page.getByText("Lexington, Kentucky").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Explore public life/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Explore work opportunities/i }),
    ).toHaveCount(0);

    await page
      .getByRole("button", {
        name: /Choose something to make or practice/i,
      })
      .click();
    await expect(
      page.getByText(/Jamie Patel began a personal project/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Keep going with your project/i }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("life-title-screen")).toBeVisible();
    await expect(
      page.getByText(/Continue as Jamie Patel, age 8/i),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("button", { name: /Keep going with your project/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Jamie Patel began a personal project/i),
    ).toBeVisible();
  });

  test("teenage start opens ordinary life in another real residence", async ({
    page,
  }) => {
    await startLife(page, {
      givenName: "Avery",
      familyName: "Brooks",
      age: 16,
      birthplace: "lexington-kentucky",
      hometown: "los-angeles-california",
      residence: "chicago-illinois",
      depth: "build",
      historyDate: "2024-09-10",
      historySummary: "Avery left a team after deciding it was not a good fit.",
    });

    await expect(page.getByTestId("life-home")).toHaveAttribute(
      "data-life-stage",
      "Teenage years",
    );
    await expect(page.getByText("Chicago, Illinois").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Find a way to help locally/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Explore public life/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Avery left a team after deciding/i),
    ).toBeVisible();
    await expect(page.getByText("Work not established")).toBeVisible();
    await expect(page.getByText("Education not established")).toBeVisible();
  });

  test("adult can skip party identity and record only a direct private view", async ({
    page,
  }) => {
    await startLife(page, {
      givenName: "Morgan",
      familyName: "Vance",
      age: 32,
      birthplace: "chicago-illinois",
      hometown: "lexington-kentucky",
      residence: "los-angeles-california",
      policy: "support",
    });

    await expect(page.getByTestId("life-home")).toHaveAttribute(
      "data-life-stage",
      "Adulthood",
    );
    await expect(page.getByText("1 private view recorded")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Explore work opportunities/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Explore public life/i }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /Democratic|Republican/,
    );
    await expect(page.locator("body")).not.toContainText(/City Council/);
    await expect(page.getByText("University of Kentucky Alum")).toHaveCount(0);
  });

  test("multiple saves load independently and confirmed deletion persists", async ({
    page,
  }) => {
    await startLife(page, {
      givenName: "First",
      familyName: "Life",
      age: 8,
    });
    await returnToTitle(page);
    await startLife(page, {
      givenName: "Second",
      familyName: "Life",
      age: 40,
      residence: "chicago-illinois",
    });
    await returnToTitle(page);

    await page.getByRole("button", { name: "Load Game" }).click();
    await expect(page.getByText("First Life")).toBeVisible();
    await expect(page.getByText("Second Life")).toBeVisible();
    await page
      .getByRole("button", { name: "Delete save for First Life" })
      .click();
    await expect(page.getByTestId("delete-save-confirmation")).toBeVisible();
    await page.getByRole("button", { name: "Keep Save" }).click();
    await expect(page.getByText("First Life")).toBeVisible();

    await page
      .getByRole("button", { name: "Delete save for First Life" })
      .click();
    await page
      .getByTestId("delete-save-confirmation")
      .getByRole("button", { name: "Delete Save", exact: true })
      .click();
    await expect(page.getByText("First Life")).toHaveCount(0);
    await expect(page.getByText("Second Life")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Load Game" }).click();
    await expect(page.getByText("First Life")).toHaveCount(0);
    await expect(page.getByText("Second Life")).toBeVisible();
  });

  test("pause and Escape work, and office/developer regression routes remain reachable", async ({
    page,
  }) => {
    await startLife(page, {
      givenName: "Pause",
      familyName: "Proof",
      age: 25,
    });
    await page.getByRole("button", { name: "Open pause menu" }).click();
    await expect(page.getByTestId("pause-menu")).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("pause-menu")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("pause-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("pause-menu")).toHaveCount(0);

    await page.goto("/?view=office");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await page.goto("/?view=developer");
    await expect(page.getByTestId("developer-viewer")).toBeVisible();
  });
});
