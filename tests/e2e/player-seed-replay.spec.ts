import { expect, test, type Page } from "@playwright/test";
import {
  ageOnDate,
  createDemoWorld,
  createGeneratedWorld,
  personName,
} from "../../src/simulation";

test.describe("Player Flow: Seed Parameterization & Deterministic Replay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?view=office-fixture");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test("1. default route without seed uses accepted Run A fixture (Andre Collins)", async ({
    page,
  }) => {
    await page.goto("/?view=office-fixture");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await expect(page.getByTestId("player-office")).toHaveAttribute(
      "data-simulation-date",
      "2026-01-05",
    );

    // Primary scene person is Andre Collins
    const scenePerson = page.getByTestId("scene-person");
    await expect(scenePerson).toBeVisible();
    await expect(scenePerson).toHaveAttribute(
      "aria-label",
      "Andre Collins, Senior legislative aide",
    );

    // Hover reveals nameplate
    await scenePerson.hover();
    const primaryNameplate = page.getByTestId("scene-person-nameplate");
    await expect(primaryNameplate).toBeVisible();
    await expect(primaryNameplate.locator("strong")).toHaveText(
      "Andre Collins",
    );

    // Guest person is Julian Reed
    const guestPerson = page.getByTestId("scene-person-b");
    await expect(guestPerson).toBeVisible();
    await expect(guestPerson).toHaveAttribute(
      "aria-label",
      "Julian Reed, Neighborhood liaison",
    );

    // Inspect Andre Collins and check dossier name and age
    await scenePerson.click();
    await page.getByRole("menuitem", { name: "Inspect" }).click();
    const dossier = page.getByTestId("quick-dossier");
    await expect(dossier).toBeVisible();
    await expect(dossier.getByRole("heading", { level: 2 })).toHaveText(
      "Andre Collins",
    );
  });

  test("2. Seed A produces deterministic generated people in the player office", async ({
    page,
  }) => {
    await page.goto("/?view=office-fixture&seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await expect(page.getByTestId("player-office")).toHaveAttribute(
      "data-simulation-seed",
      "player-seed-alpha",
    );

    const scenePerson = page.getByTestId("scene-person");
    await expect(scenePerson).toBeVisible();
    const ariaLabelA = await scenePerson.getAttribute("aria-label");
    expect(ariaLabelA).toBeTruthy();
    expect(ariaLabelA).not.toContain("Andre Collins");

    // Hover reveals generated nameplate
    await scenePerson.hover();
    const primaryNameplate = page.getByTestId("scene-person-nameplate");
    await expect(primaryNameplate).toBeVisible();
    const primaryNameA = await primaryNameplate.locator("strong").textContent();
    expect(primaryNameA).toBeTruthy();
    expect(primaryNameA).not.toBe("Andre Collins");

    // Guest scene person is also generated from seed
    const guestPerson = page.getByTestId("scene-person-b");
    await expect(guestPerson).toBeVisible();
    await guestPerson.hover();
    const guestNameplate = page.getByTestId("scene-person-b-nameplate");
    await expect(guestNameplate).toBeVisible();
    const guestNameA = await guestNameplate.locator("strong").textContent();
    expect(guestNameA).toBeTruthy();
    expect(guestNameA).not.toBe("Julian Reed");

    // Inspect person and verify dossier contains valid derived age
    await scenePerson.click();
    await page.getByRole("menuitem", { name: "Inspect" }).click();
    const dossier = page.getByTestId("quick-dossier");
    await expect(dossier).toBeVisible();
    await expect(dossier.getByRole("heading", { level: 2 })).toHaveText(
      primaryNameA!,
    );
  });

  test("3. Seed B produces distinct generated people compared to Seed A", async ({
    page,
  }) => {
    // Load Seed A first
    await page.goto("/?view=office-fixture&seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    const scenePersonA = page.getByTestId("scene-person");
    await scenePersonA.hover();
    const primaryNameA = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    // Load Seed B
    await page.goto("/?view=office-fixture&seed=player-seed-beta");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await expect(page.getByTestId("player-office")).toHaveAttribute(
      "data-simulation-seed",
      "player-seed-beta",
    );

    const scenePersonB = page.getByTestId("scene-person");
    await scenePersonB.hover();
    const primaryNameB = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    expect(primaryNameB).toBeTruthy();
    expect(primaryNameB).not.toBe(primaryNameA);
  });

  test("4. Replaying Seed A deterministically returns exact same people", async ({
    page,
  }) => {
    // Record Seed A people
    await page.goto("/?view=office-fixture&seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    const scenePersonA = page.getByTestId("scene-person");
    await scenePersonA.hover();
    const primaryNameA1 = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    const guestPersonA = page.getByTestId("scene-person-b");
    await guestPersonA.hover();
    const guestNameA1 = await page
      .getByTestId("scene-person-b-nameplate")
      .locator("strong")
      .textContent();

    // Navigate to Seed B
    await page.goto("/?view=office-fixture&seed=player-seed-beta");
    await expect(page.getByTestId("player-office")).toBeVisible();

    // Replay Seed A
    await page.goto("/?view=office-fixture&seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await page.getByTestId("scene-person").hover();
    const primaryNameA2 = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    await page.getByTestId("scene-person-b").hover();
    const guestNameA2 = await page
      .getByTestId("scene-person-b-nameplate")
      .locator("strong")
      .textContent();

    expect(primaryNameA2).toBe(primaryNameA1);
    expect(guestNameA2).toBe(guestNameA1);
  });
});

// Assert against the generated constructor, independently of the player fixture
// router. In particular the legacy-named seed must not supply its own oracle.
async function captureRoleFlow(page: Page, seed?: string) {
  page.setDefaultTimeout(10_000);
  const expected =
    seed === undefined
      ? createDemoWorld("stage-6-5-run-a")
      : createGeneratedWorld(seed);
  const lead = expected.people[expected.personOrder[0]!]!;
  const player = expected.people[expected.personOrder[1]!]!;
  const verifier = expected.people[expected.personOrder[2]!]!;
  if (seed !== undefined) {
    expect(lead.generatorVersion).toBe("person-v5");
    expect(lead.corpusVersion).toBe("names-v1");
  }
  await page.goto(
    seed === undefined
      ? "/?view=office-fixture"
      : `/?view=office-fixture&seed=${encodeURIComponent(seed)}`,
  );
  const office = page.getByTestId("player-office");
  await expect(office).toBeVisible();
  const identities = [];
  for (const [testId, person, title] of [
    ["scene-person", lead, "Senior legislative aide"],
    ["scene-person-b", verifier, "Neighborhood liaison"],
  ] as const) {
    const scenePerson = page.getByTestId(testId);
    await expect(scenePerson).toHaveAttribute("data-person-id", person.id);
    await expect(scenePerson).toHaveAttribute(
      "aria-label",
      `${personName(person)}, ${title}`,
    );
    await scenePerson.click();
    await page.getByRole("menuitem", { name: "Inspect" }).click();
    const dossier = page.getByTestId("quick-dossier");
    await expect(dossier.locator(".dossier-identity-line")).toContainText(
      String(ageOnDate(person.birthDate, expected.currentDate)),
    );
    identities.push({
      id: await scenePerson.getAttribute("data-person-id"),
      dossier: await dossier.innerText(),
    });
    await page.getByRole("button", { name: "Close dossier" }).click();
  }

  const prose: string[] = [];
  async function capture(testId: string) {
    const surface = page.getByTestId(testId);
    await expect(surface).toBeVisible();
    const text = await surface.innerText();
    if (seed !== undefined) {
      expect(text).not.toMatch(/\b(?:Collins|Reed|Cameron|Foster)\b/);
    }
    prose.push(text);
  }
  await page.getByTestId("scene-person").click();
  await page
    .getByRole("menuitem", {
      name: "Talk Start an in-room conversation",
      exact: true,
    })
    .click();
  const strip = page.getByTestId("conversation-strip");
  await expect(strip).toContainText(`You — ${personName(player)}`);
  await expect(strip).toContainText(
    `${verifier.familyName} is checking the third`,
  );
  await expect(strip).toContainText(`${lead.familyName} says`);
  await capture("conversation-strip");
  // Exercise both pending speakers and their stored transcript through real UI.
  await strip.getByRole("button", { name: "Listen", exact: true }).click();
  await capture("conversation-strip");
  await strip.getByRole("button", { name: "Listen", exact: true }).click();
  await expect(strip).toContainText(`${verifier.familyName} says`);
  await capture("conversation-strip");
  const ask = strip.getByRole("button", {
    name: `Ask ${lead.familyName} to back the referral checklist`,
  });
  await ask.focus();
  await page.keyboard.press("Enter");
  await capture("conversation-strip");
  await strip.getByRole("button", { name: "View history" }).click();
  await capture("conversation-strip");
  await strip.getByRole("button", { name: "Close conversation" }).click();

  await page.getByTestId("working-document-entry").click();
  await expect(page.getByTestId("working-annotation")).toContainText(
    `${lead.familyName} · staff projection attached`,
  );
  await expect(page.getByTestId("working-annotation")).toContainText(
    `${player.givenName}'s known record`,
  );
  await capture("working-document-workspace");
  await page
    .getByRole("button", { name: "Read staff note", exact: true })
    .click();
  await expect(page.getByTestId("staff-analysis-panel")).toContainText(
    `${lead.familyName}’s working analysis`,
  );
  await expect(page.getByTestId("staff-analysis-panel")).toContainText(
    `${personName(lead)} · staff analysis`,
  );
  await capture("staff-analysis-panel");
  await page.getByRole("button", { name: "Back to document" }).click();
  await page.getByTestId("working-document-amount").click();
  const discuss = page.getByRole("menuitem", {
    name: `Ask ${lead.familyName} about this`,
  });
  await discuss.focus();
  await page.keyboard.press("Enter");
  await expect(strip).toContainText(`${lead.familyName} says`);
  await capture("conversation-strip");
  await strip
    .getByRole("button", {
      name: `Ask ${lead.familyName} about the $8,000,000 provision`,
    })
    .click();
  await expect(strip).toContainText("forecast comparison");
  await capture("conversation-strip");
  await strip.getByRole("button", { name: "Close conversation" }).click();
  await page
    .getByTestId("working-document-workspace")
    .getByRole("button", { name: "Return to office" })
    .click();

  await page.getByTestId("navigation-cluster").click();
  await page.getByRole("menuitem", { name: "Work / Pending" }).click();
  const work = page.getByTestId("work-pending-workspace");
  await expect(work).toContainText(
    `${lead.familyName}'s transit analysis summary`,
  );
  await expect(work).toContainText(
    `Waiting for ${verifier.familyName}'s verification`,
  );
  await capture("work-pending-workspace");
  const delegate = work.getByRole("button", {
    name: `Delegate to ${lead.familyName}`,
  });
  await delegate.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("work-feedback")).toContainText(
    `${lead.familyName} now owns the meeting brief`,
  );
  await capture("work-pending-workspace");
  await work.getByRole("button", { name: "Return to office" }).click();
  await page.getByTestId("navigation-cluster").click();
  await page.getByRole("menuitem", { name: "Calendar" }).click();
  const calendar = page.getByTestId("calendar-workspace");
  await calendar
    .getByRole("button", { name: /Constituent intake briefing/ })
    .click();
  await expect(page.getByTestId("calendar-event-detail")).toContainText(
    `with ${verifier.familyName}`,
  );
  await capture("calendar-event-detail");
  return { identities, prose };
}

test("normal player route preserves default prose and exactly replays generated role text A → B → A", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await captureRoleFlow(page);
  const alpha = await captureRoleFlow(page, "player-seed-alpha");
  const beta = await captureRoleFlow(page, "player-seed-beta");
  expect(beta.identities).not.toEqual(alpha.identities);
  expect(beta.prose).not.toEqual(alpha.prose);
  expect(await captureRoleFlow(page, "player-seed-alpha")).toEqual(alpha);
});

test("explicit legacy-named seed matches person-v5/names-v1 on player and developer routes", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await captureRoleFlow(page, "stage-6-5-run-a");
  const generated = createGeneratedWorld("stage-6-5-run-a");
  await page.goto("/?view=developer&seed=stage-6-5-run-a");
  await expect(page.locator(".active-seed code")).toHaveText("stage-6-5-run-a");
  await expect(page.locator(".person-row strong").first()).toHaveText(
    personName(generated.people[generated.personOrder[0]!]!),
  );
});
