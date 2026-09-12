import {
  reachMemberOffice,
  readSavedLegislativeWorld,
  expectRecordedMember,
} from "./support/legislative-entry";
import { expect, test } from "./fixtures";
import { enterLife, fillCreator, goTo, startLife } from "./support/creator";

test("normal Day exposes the frozen study/work adapter and scheduled sessions reach Calendar", async ({
  page,
}) => {
  await page.goto("/?seed=ui-core-life-adapter");
  await startLife(page, {
    age: 35,
    route: "custom",
    household: "shares-a-home",
  });
  await enterLife(page);
  /*
   * UI9-01: the day no longer mounts a second copy of the study-and-work
   * stack; it links into the one workspace that owns it. Following that link
   * is the player's route, so it is this test's route.
   */
  await goTo(page, "elsewhere-day");
  await page.getByTestId("day-open-work").click();
  // The panel's own region, inside the workspace section that frames it —
  // both carry the same label, so the inner one is named explicitly.
  const paths = page
    .getByTestId("personal-work-section")
    .getByRole("region", { name: "Education and work" });
  await expect(paths).toBeVisible();
  const enroll = paths.getByRole("button", { name: /^Enroll in/ }).first();
  const studyTitle = (await enroll.innerText()).replace(/^Enroll in /, "");
  await enroll.click();
  await paths
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await expect(paths.locator(":scope > [role=status]")).toHaveText(
    "You already have a commitment at that time.",
  );
  // The blocking commitment is carried out on the day, then back to work —
  // two destinations now instead of one page holding both.
  await goTo(page, "elsewhere-day");
  await page
    .getByTestId("day-overlay")
    .getByTestId("venue-activities")
    .getByRole("button", { name: "Carry out activity", exact: true })
    .first()
    .click();
  await page.getByTestId("day-open-work").click();
  await paths
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await expect(paths.locator(":scope > [role=status]")).toHaveText(
    "The session is on your calendar.",
  );
  await goTo(page, "nav-calendar");
  await expect(
    page.locator('[data-testid^="calendar-entry-"]'),
  ).not.toHaveCount(0);
  await page
    .locator(".pg-calendar-entry")
    .filter({ hasText: studyTitle })
    .locator('[data-testid^="calendar-pin-"]')
    .click();
  await expect(page.locator('[data-testid^="pin-commitment:"]')).toBeVisible();
});

test("Custom judicial workplace uses the normal World, Work and save route", async ({
  page,
}) => {
  await page.goto("/?seed=ui-core-judicial-adapter");
  await fillCreator(page, { age: 35, route: "custom" });
  await page.getByTestId("creator-summary-background").click();
  await page.getByTestId("judicial-office-start").click();
  await page.getByTestId("creator-continue-background").click();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await page
    .getByRole("button", { name: "Check office correspondence", exact: true })
    .click();
  await expect(
    page.locator(".judicial-office-choices button").first(),
  ).toBeEnabled();
  await page.locator(".judicial-office-choices button").first().press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Prepare the follow-up note",
      exact: true,
    }),
  ).toBeVisible();
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(
    page.getByRole("button", {
      name: "Prepare the follow-up note",
      exact: true,
    }),
  ).toBeVisible();
});

test("mixed person, session and measure pins preserve identity and clear workspace controls", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/?seed=ui-core-mixed-adapters");
  await startLife(page, {
    age: 35,
    route: "custom",
    office: true,
    household: "shares-a-home",
  });
  await enterLife(page);
  // Pinning is on the person in the room now, in their own action menu.
  await page.locator('[data-testid^="scene-person-"]').first().click();
  await page.getByTestId("action-pin").click();
  await page.keyboard.press("Escape");
  // UI9-01: study and work live in Work; the day links into it. This life
  // holds an office, so Work frames them as the office rather than as the
  // personal work section — the panels are the same either way.
  await goTo(page, "elsewhere-work");
  const paths = page
    .getByTestId("office-section")
    .getByRole("region", { name: "Education and work" });
  const enroll = paths.getByRole("button", { name: /^Enroll in/ }).first();
  const studyTitle = (await enroll.innerText()).replace(/^Enroll in /, "");
  await enroll.click();
  await paths
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await expect(paths.locator(":scope > [role=status]")).toHaveText(
    "You already have a commitment at that time.",
  );
  await goTo(page, "elsewhere-day");
  await page
    .getByTestId("day-overlay")
    .getByTestId("venue-activities")
    .getByRole("button", { name: "Carry out activity", exact: true })
    .first()
    .click();
  await page.getByTestId("day-open-work").click();
  await paths
    .getByRole("button", { name: "Schedule next session", exact: true })
    .click();
  await expect(paths.locator(":scope > [role=status]")).toHaveText(
    "The session is on your calendar.",
  );
  await goTo(page, "nav-calendar");
  await page
    .locator(".pg-calendar-entry")
    .filter({ hasText: studyTitle })
    .locator('[data-testid^="calendar-pin-"]')
    .click();
  await goTo(page, "elsewhere-work");
  await page.getByTestId("open-legislation").click();
  await page.getByTestId("pin-measure").click();
  const pins = page.locator('[data-testid^="pin-"][data-size]');
  const ids = await pins.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-testid")!.slice(4)),
  );
  expect(ids.map((id) => id.split(":")[0]).sort()).toEqual([
    "commitment",
    "measure",
    "person",
  ]);
  const last = ids[2]!;
  await page.getByTestId(`pin-manage-${last}`).click();
  await page.getByTestId(`pin-up-${last}`).press("Enter");
  await page.keyboard.press("Escape");
  for (const id of ids) {
    await page.getByTestId(`pin-manage-${id}`).click();
    await page.getByTestId(`pin-size-expanded-${id}`).press("Enter");
    await expect(page.getByTestId(`pin-menu-${id}`)).toHaveCount(0);
  }
  const order = await pins.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-testid")),
  );
  await goTo(page, "nav-journal-entry");
  for (const width of [1920, 1440, 1200, 1060, 960]) {
    await page.setViewportSize({ width, height: 900 });
    const close = page.getByTestId("journal-close");
    await expect(close).toBeVisible();
    const box = (await close.boundingBox())!;
    expect(
      await page.evaluate(
        ({ x, y }) =>
          document
            .elementFromPoint(x, y)
            ?.closest('[data-testid="journal-close"]') !== null,
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`mixed-pins-${width}.png`),
    });
  }
  await page.getByTestId("journal-close").press("Enter");
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(pins).toHaveCount(3);
  expect(
    await pins.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-testid")),
    ),
  ).toEqual(order);
  for (const id of ids)
    await expect(page.getByTestId(`pin-${id}`)).toHaveAttribute(
      "data-size",
      "expanded",
    );
});

test("normal activity completion replaces household presence without a second clock", async ({
  page,
}, testInfo) => {
  await page.goto("/?seed=env-normal-action");
  await startLife(page, {
    age: 34,
    route: "custom",
    household: "shares-a-home",
  });
  await enterLife(page);
  await goTo(page, "elsewhere-day");
  await page
    .getByTestId("venue-activities")
    .getByRole("button", { name: "Carry out activity", exact: true })
    .first()
    .press("Enter");
  await expect(page.getByTestId("day-opening")).toHaveCount(0);
  await expect(page.getByTestId("day-overlay")).toContainText(
    "You have finished",
  );
  await page.getByTestId("day-overlay-close").click();
  await expect(page.getByTestId("activity-aftermath")).toBeVisible();
  await expect(page.getByTestId("story-people")).toHaveCount(0);
  await expect(page.getByTestId("story-options")).toHaveCount(0);
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-scene-id",
    "civic-community-meeting-room",
  );
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-has-plate",
    "true",
  );
  for (const width of [1440, 960]) {
    await page.setViewportSize({ width, height: 900 });
    const receipt = await page.getByTestId("activity-aftermath").boundingBox();
    const identity = await page.getByTestId("shell-nav-cluster").boundingBox();
    expect(receipt).not.toBeNull();
    expect(identity).not.toBeNull();
    expect(
      receipt!.x >= identity!.x + identity!.width ||
        receipt!.y + receipt!.height <= identity!.y,
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`venue-aftermath-${width}.png`),
    });
  }
  /*
   * UI9-03 makes this test's own claim visible: only the people in the room
   * stand in the room, so at the meeting room nobody does. Household presence
   * is not merely "replaced" in the prose — there is no one here.
   */
  await expect(page.locator('[data-testid^="scene-person-"]')).toHaveCount(0);

  // The household is still reachable, from where contact browsing lives, and
  // talking to somebody who is not here is still refused.
  await goTo(page, "elsewhere-people");
  await page
    .getByTestId("people-list")
    .locator('[data-testid^="people-person-"]')
    .first()
    .click();
  await expect(page.getByTestId("dossier-talk")).toBeDisabled();
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await expect(page.getByTestId("activity-aftermath")).toBeVisible();
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-scene-id",
    "civic-community-meeting-room",
  );
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-has-plate",
    "true",
  );
});

test("frozen docket uses the normal Work shell and keeps its selected document on reload", async ({
  page,
}, testInfo) => {
  await page.goto("/?seed=ui-core-docket-adapter");
  await startLife(page, { age: 35, route: "normal" });
  await enterLife(page);
  await reachMemberOffice(page);
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  const lineage = await page.getByTestId("docket-lineage").innerText();
  const pinButton = page.getByTestId("pin-docket-measure");
  const measureId = await pinButton.getAttribute("data-measure-id");
  await pinButton.click();
  await expect(page.getByTestId(`pin-measure:${measureId}`)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("normal-work-docket.png"),
  });
  await goTo(page, "keep-world");
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  const filed = await readSavedLegislativeWorld(page);
  expectRecordedMember(filed);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-work");
  await expect(page.getByTestId("docket-lineage")).toHaveText(lineage);
  await expect(page.getByTestId(`pin-measure:${measureId}`)).toBeVisible();
  await expect(page.getByTestId("pin-docket-measure")).toHaveAttribute(
    "data-measure-id",
    measureId!,
  );
  expect(await readSavedLegislativeWorld(page)).toEqual(filed);
});
