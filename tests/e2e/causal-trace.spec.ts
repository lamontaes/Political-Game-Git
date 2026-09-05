import { expect, test } from "@playwright/test";

/**
 * The inspector in a browser, and the promise that ordinary play cannot get
 * there.
 *
 * Two jobs. The first is that the diagnostic actually works through real
 * pointer and keyboard input rather than only through its unit tests: select a
 * record, see its recorded links, see where the chain stops, read an export.
 * The second is the boundary — the game's front door must not offer a way in.
 */

test.describe("Causal trace inspector", () => {
  test("opens on a traceable world and shows its identity", async ({
    page,
  }) => {
    await page.goto("/?view=causal-trace");

    await expect(page.getByTestId("causal-trace-view")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Causal trace inspector" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Development tool. This page reads canonical records and writes nothing.",
      ),
    ).toBeVisible();

    await expect(page.getByTestId("trace-seed")).toHaveText(
      "causal-trace-observer",
    );
    await expect(page.getByTestId("trace-content-id")).not.toBeEmpty();
    const recordCount = Number(
      (await page.getByTestId("trace-record-count").textContent()) ?? "0",
    );
    expect(recordCount).toBeGreaterThan(10);
  });

  test("shows an unlinked record as UNKNOWN rather than attaching a parent", async ({
    page,
  }) => {
    await page.goto("/?view=causal-trace");

    await page
      .getByLabel("Search id, key, entity or text")
      .fill("causal-trace:unlinked-interaction");
    const rows = page.getByTestId("trace-record-list").getByRole("button");
    await expect(rows).toHaveCount(1);
    await rows.first().click();

    await expect(page.getByTestId("trace-selected")).toContainText(
      "relationship-change",
    );
    await expect(
      page.getByText("UNLINKED — this record names no other record."),
    ).toBeVisible();
    await expect(page.getByTestId("trace-unknown-links")).toContainText(
      "eventId",
    );
    await expect(page.getByTestId("trace-boundaries")).toContainText(
      "no-recorded-link",
    );
  });

  test("walks a decision back through the records that produced it", async ({
    page,
  }) => {
    await page.goto("/?view=causal-trace");

    // The page opens on the most recent durable decision trace.
    await expect(page.getByTestId("trace-selected")).toContainText(
      "decision-trace",
    );
    const walk = page.getByTestId("trace-walk");
    await expect(walk).toContainText("perception");
    await expect(walk).toContainText("spoken-claim");
    await expect(walk).toContainText("canonical-event");

    // Nothing in the recorded history cites this decision, so downstream is a
    // genuine dead end rather than an empty screen — and the page says which.
    await page.getByLabel("Direction").selectOption("downstream");
    await expect(page.getByTestId("trace-boundaries")).toContainText(
      "No registered record cites this one",
    );
  });

  test("reports a different audience for a quiet exchange than for a normal one", async ({
    page,
  }) => {
    await page.goto("/?view=causal-trace");

    const recipients = page.getByTestId("observer-recipients-1");
    await expect(recipients).toBeVisible();
    const normalRecipients = await recipients.textContent();
    await expect(page.getByTestId("observer-absences-1")).toHaveText(
      "nobody the records can speak about",
    );

    await page.getByLabel("Audibility").selectOption("quiet");

    const quietRecipients = await page
      .getByTestId("observer-recipients-1")
      .textContent();
    expect(quietRecipients).not.toBe(normalRecipients);
    await expect(page.getByTestId("observer-absences-1")).toContainText(
      "declared-present-but-not-an-event-participant",
    );
  });

  test("exports a trace a bug report can carry on its own", async ({
    page,
  }) => {
    await page.goto("/?view=causal-trace");

    const exported = page.getByTestId("trace-export");
    await expect(exported).toContainText("# Causal trace");
    await expect(exported).toContainText("causal-trace-observer");
    await expect(exported).toContainText("History frontier");

    await page.getByLabel("Format").selectOption("json");
    await expect(exported).toContainText('"formatVersion"');
  });

  test("filters by record class", async ({ page }) => {
    await page.goto("/?view=causal-trace");

    await page.getByLabel("Record class").selectOption("spoken-claim");
    const rows = page.getByTestId("trace-record-list").getByRole("button");
    await expect(rows.first()).toContainText("spoken-claim");

    await page.getByLabel("Record class").selectOption("perception");
    await expect(
      page.getByTestId("trace-record-list").getByRole("button").first(),
    ).toContainText("perception");
  });
});

test.describe("The development route is not part of the game", () => {
  test("the game's front door offers no way to reach it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[href*="causal-trace"]')).toHaveCount(0);
    await expect(page.getByTestId("causal-trace-view")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(
      "Causal trace inspector",
    );
  });

  test("the existing developer view does not link to it either", async ({
    page,
  }) => {
    await page.goto("/?view=developer");
    await expect(page.locator('[href*="causal-trace"]')).toHaveCount(0);
  });

  test("an unrecognized view still opens the game rather than a diagnostic", async ({
    page,
  }) => {
    await page.goto("/?view=causal-trace-typo");
    await expect(page.getByTestId("causal-trace-view")).toHaveCount(0);
  });
});
