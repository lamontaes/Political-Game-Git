import { expect, test, type Locator, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

async function openConversation(page: Page) {
  await page.getByTestId("scene-person").click();
  const menu = page.getByTestId("person-action-menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /Inspect/ })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /Talk/ })).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: /Pin person/ }),
  ).toBeVisible();
  await menu.getByRole("menuitem", { name: /Talk/ }).click();
  const strip = page.getByTestId("conversation-strip");
  await expect(strip).toBeVisible();
  return strip;
}

async function expectConversationContentFits(strip: Locator) {
  const metrics = await strip.evaluate((element) => ({
    clientHeight: element.clientHeight,
    overflowY: window.getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  expect(["auto", "scroll"]).not.toContain(metrics.overflowY);

  const stripBox = await strip.boundingBox();
  expect(stripBox).not.toBeNull();
  const required = strip.locator(
    ".conversation-beat, .conversation-intents button, .conversation-transcript-controls",
  );
  for (let index = 0; index < (await required.count()); index += 1) {
    const item = required.nth(index);
    await expect(item).toBeVisible();
    const itemBox = await item.boundingBox();
    expect(itemBox).not.toBeNull();
    expect(itemBox?.y ?? 0).toBeGreaterThanOrEqual(stripBox?.y ?? 0);
    expect((itemBox?.y ?? 0) + (itemBox?.height ?? 0)).toBeLessThanOrEqual(
      (stripBox?.y ?? 0) + (stripBox?.height ?? 0) + 1,
    );
  }
}

test("anchors contextual character labels and suppresses them when identity is already clear", async ({
  page,
}) => {
  const npcB = page.getByTestId("scene-person-b");
  const label = page.getByTestId("scene-person-b-nameplate");
  const shell = page.getByTestId("navigation-cluster");

  await expect(label).toBeHidden();
  await npcB.hover();
  await expect(label).toBeVisible();
  const npcBox = await npcB.boundingBox();
  const labelBox = await label.boundingBox();
  const shellBox = await shell.boundingBox();
  expect(npcBox).not.toBeNull();
  expect(labelBox).not.toBeNull();
  expect(shellBox).not.toBeNull();
  expect(
    Math.abs(
      (labelBox?.x ?? 0) +
        (labelBox?.width ?? 0) / 2 -
        ((npcBox?.x ?? 0) + (npcBox?.width ?? 0) / 2),
    ),
  ).toBeLessThan(2);
  expect(
    (labelBox?.y ?? Infinity) + (labelBox?.height ?? 0),
  ).toBeLessThanOrEqual((npcBox?.y ?? 0) + 8);
  expect((labelBox?.y ?? 0) + (labelBox?.height ?? 0)).toBeLessThan(
    shellBox?.y ?? 0,
  );

  await npcB.click();
  await expect(page.getByTestId("person-action-menu")).toBeVisible();
  await expect(label).toBeHidden();
  await page.getByRole("menuitem", { name: /Inspect/ }).click();
  await expect(page.getByTestId("quick-dossier")).toContainText("Your read");
  await expect(label).toBeHidden();
});

test("pins, explicitly resizes, unpins, and re-pins each person without disturbing current context", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const briefing = page.locator('[data-pin-id="briefing"]');
  const collinsPin = page.locator('[data-pin-id="person"]');
  const reedPin = page.locator('[data-pin-id="person-b"]');

  await expect(briefing).toBeVisible();
  await expect(collinsPin).toHaveCount(1);
  await expect(reedPin).toHaveCount(0);
  const initialHistory = await office.getAttribute("data-history-sequence");

  await page.getByTestId("scene-person-b").click();
  await page.getByRole("menuitem", { name: /Pin person/ }).click();
  await expect(reedPin).toHaveCount(1);
  await expect(reedPin).toHaveAttribute("data-size", "normal");
  await expect(briefing).toBeVisible();
  await expect(collinsPin).toHaveCount(1);

  await page.getByTestId("scene-person-b").click();
  await page.getByRole("menuitem", { name: /Pin person/ }).click();
  await expect(reedPin).toHaveCount(1);

  await reedPin.focus();
  await page.keyboard.press("Enter");
  let controls = page.getByTestId("pin-controls-person-b");
  await expect(controls).toBeVisible();
  await expect(
    controls.getByRole("menuitem", { name: "Compact" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    controls.getByRole("menuitem", { name: "Expanded" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(reedPin).toHaveAttribute("data-size", "expanded");
  await page.keyboard.press("Tab");
  const unpin = controls.getByRole("menuitem", { name: "Unpin Julian Reed" });
  await expect(unpin).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(reedPin).toHaveCount(0);
  await expect(briefing).toBeVisible();
  await expect(collinsPin).toHaveCount(1);

  await page.getByTestId("scene-person-b").click();
  await page.getByRole("menuitem", { name: /Pin person/ }).click();
  await expect(reedPin).toHaveCount(1);
  await expect(reedPin).toHaveAttribute("data-size", "normal");
  await expect(briefing).toBeVisible();
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );

  await collinsPin.click();
  controls = page.getByTestId("pin-controls-person");
  await expect(controls).toBeVisible();
  await expect(
    controls.getByRole("menuitem", { name: "Unpin Andre Collins" }),
  ).toBeVisible();
  await controls.getByRole("menuitem", { name: "Unpin Andre Collins" }).click();
  await expect(collinsPin).toHaveCount(0);
  await expect(reedPin).toHaveCount(1);
  await expect(briefing).toBeVisible();

  await page.getByTestId("scene-person").click();
  await page.getByRole("menuitem", { name: /Pin person/ }).click();
  await expect(collinsPin).toHaveCount(1);
  await expect(collinsPin).toHaveAttribute("data-size", "normal");
  await expect(reedPin).toHaveCount(1);
  await expect(briefing).toBeVisible();
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
});

test("dismisses only temporary navigation, pin, and person menus on scene click-away", async ({
  page,
}) => {
  const scene = page.getByTestId("political-office-scene");

  await page.getByTestId("navigation-cluster").click();
  await expect(page.getByTestId("navigation-flyout")).toBeVisible();
  await scene.click({ position: { x: 600, y: 100 } });
  await expect(page.getByTestId("navigation-flyout")).toHaveCount(0);

  await page.locator('[data-pin-id="person"]').click();
  await expect(page.getByTestId("pin-controls-person")).toBeVisible();
  await scene.click({ position: { x: 600, y: 100 } });
  await expect(page.getByTestId("pin-controls-person")).toHaveCount(0);

  await page.getByTestId("scene-person").click();
  await expect(page.getByTestId("person-action-menu")).toBeVisible();
  await scene.click({ position: { x: 600, y: 100 } });
  await expect(page.getByTestId("person-action-menu")).toHaveCount(0);
});

test("runs the occupied-office conversation through addressee, audibility, and canonical consequence", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const scene = page.getByTestId("political-office-scene");
  const npcA = page.getByTestId("scene-person");
  const npcB = page.getByTestId("scene-person-b");
  await expect(npcA).toBeVisible();
  await expect(npcB).toBeVisible();
  const npcABox = await npcA.boundingBox();
  const npcBBox = await npcB.boundingBox();
  expect(npcABox).not.toBeNull();
  expect(npcBBox).not.toBeNull();
  expect((npcBBox?.x ?? 0) + (npcBBox?.width ?? 0) < (npcABox?.x ?? 0)).toBe(
    true,
  );

  const initialHistorySequence = Number(
    await office.getAttribute("data-history-sequence"),
  );
  const strip = await openConversation(page);
  await expect(strip).toContainText("You — Cameron Foster");
  await expect(strip).toContainText(
    "Three Lexington tenants asked this office for emergency-rent help",
  );
  await expect(strip).toContainText("required proof-of-income form");
  await expect(strip).toContainText(
    "Reed is checking the third. Decide whether Collins should back a document checklist before future referrals",
  );
  await expect(strip).toContainText(
    "If Reed finds the third county referral also lacked the proof-of-income form",
  );
  await expect(strip).not.toContainText("referral gap");
  await npcA.hover();
  await expect(page.getByTestId("scene-person-nameplate")).toBeHidden();
  await npcB.hover();
  await expect(page.getByTestId("scene-person-b-nameplate")).toBeHidden();
  await expect(scene).toBeVisible();
  await expect(page.getByTestId("navigation-cluster")).toBeVisible();
  await expect(page.locator('[data-pin-id="briefing"]')).toBeVisible();

  const officeBox = await office.boundingBox();
  const stripBox = await strip.boundingBox();
  expect(officeBox).not.toBeNull();
  expect(stripBox).not.toBeNull();
  expect(stripBox?.height ?? Infinity).toBeLessThan(
    (officeBox?.height ?? 0) * 0.42,
  );
  expect(stripBox?.width ?? Infinity).toBeLessThan(
    (officeBox?.width ?? 0) * 0.68,
  );
  expect(stripBox?.y ?? 0).toBeGreaterThan(
    (npcABox?.y ?? 0) + (npcABox?.height ?? 0) * 0.25,
  );
  expect(stripBox?.y ?? 0).toBeGreaterThan(
    (npcBBox?.y ?? 0) + (npcBBox?.height ?? 0) * 0.25,
  );
  await expectConversationContentFits(strip);

  const collins = strip.getByRole("button", { name: "Collins", exact: true });
  const reed = strip.getByRole("button", { name: "Reed", exact: true });
  const everyone = strip.getByRole("button", {
    name: "Everyone",
    exact: true,
  });
  await expect(collins).toHaveAttribute("aria-pressed", "true");
  await expect(npcA).toHaveAttribute("data-addressed", "true");
  await expect(npcB).toHaveAttribute("data-addressed", "false");

  await reed.click();
  await expect(reed).toHaveAttribute("aria-pressed", "true");
  await expect(npcA).toHaveAttribute("data-addressed", "false");
  await expect(npcB).toHaveAttribute("data-addressed", "true");
  await expect(strip).toContainText(
    "check whether the third referral arrived without that form too",
  );
  await expect(
    strip.getByRole("button", { name: "Ask Reed to check the third referral" }),
  ).toBeVisible();

  await everyone.click();
  await expect(everyone).toHaveAttribute("aria-pressed", "true");
  await expect(npcA).toHaveAttribute("data-addressed", "true");
  await expect(npcB).toHaveAttribute("data-addressed", "true");

  await collins.click();
  const hearing = page.getByTestId("conversation-hearing-context");
  await expect(hearing).toContainText("Reed is nearby");
  await strip.getByRole("button", { name: "Quiet", exact: true }).click();
  await expect(hearing).toContainText(
    "do not expect Reed to catch the details",
  );
  const privateButton = strip.getByRole("button", {
    name: "Private",
    exact: true,
  });
  await expect(privateButton).toBeDisabled();
  await expect(hearing).toContainText("Private isn't possible");
  await strip.getByRole("button", { name: "Normal", exact: true }).click();
  await expect(hearing).toContainText("Reed is nearby");

  await strip
    .getByRole("button", {
      name: "Ask Collins to back the referral checklist",
    })
    .click();
  await expect(strip).toContainText(
    "Have Reed check whether the third county referral lacked the proof-of-income form",
  );
  await expect(office).toHaveAttribute("data-conversation-event-count", "1");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "1");
  expect(
    Number(await office.getAttribute("data-history-sequence")),
  ).toBeGreaterThan(initialHistorySequence);
  expect(
    Number(await office.getAttribute("data-conversation-knowledge-count")),
  ).toBeGreaterThan(0);
  await expect(office).toHaveAttribute("data-simulation-date", "2026-01-05");
  await expect(office).toHaveAttribute("data-action-sequence", "0");

  await reed.click();
  await expect(strip).toContainText("Collins needs the third referral checked");
  await expect(strip).not.toContainText(
    "The first two county referrals arrived without the proof-of-income form",
  );
  await everyone.click();
  await expect(strip).toContainText(
    "staff should check required documents before future county referrals",
  );
  await collins.click();
  await expect(strip).toContainText("I need the third county referral checked");
  await expectConversationContentFits(strip);

  await page.locator('[data-pin-id="person"]').click();
  await page
    .getByTestId("pin-controls-person")
    .getByRole("menuitem", { name: "Standard" })
    .click();
  await expect(page.locator('[data-pin-id="person"]')).toHaveAttribute(
    "data-size",
    "normal",
  );
  await page.getByTestId("navigation-cluster").click();
  await expect(page.getByTestId("navigation-flyout")).toBeVisible();

  const body = page.locator("body");
  for (const forbidden of [
    /relationship points?/i,
    /persuasion percentage/i,
    /success probability/i,
    /will remember this/i,
    /source snapshot/i,
    /\+\d+ minutes?/i,
  ]) {
    await expect(body).not.toContainText(forbidden);
  }
  await expect(page.locator('[class*="hearing-cone"]')).toHaveCount(0);
  await expect(page.locator('[class*="target-ring"]')).toHaveCount(0);
});

test("presents Listen as a non-spoken action and only continues when the bounded state warrants it", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const strip = await openConversation(page);
  const listen = () =>
    strip.getByRole("button", { name: "Listen", exact: true });

  await expect(strip).not.toContainText("Say nothing");
  await listen().click();
  await expect(strip).toContainText("Reed is checking that missing fact");
  await expect(office).toHaveAttribute("data-conversation-event-count", "1");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "1");

  await listen().click();
  await expect(strip).toContainText("I can make that call");
  await expect(strip).toContainText(
    "county received the third referral without the proof-of-income form",
  );
  await expect(office).toHaveAttribute("data-conversation-event-count", "2");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "2");
  await expect(listen()).toBeVisible();

  await listen().click();
  await expect(strip).toContainText(
    "The room settles. No one adds anything yet.",
  );
  await expect(office).toHaveAttribute("data-conversation-event-count", "3");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "2");
  await expect(listen()).toHaveCount(0);

  await strip.getByRole("button", { name: "View history" }).click();
  await expect(strip).toHaveAttribute("data-conversation-mode", "history");
  let transcript = page.getByTestId("conversation-transcript");
  await expect(transcript).toContainText("(You listen.)");
  await expect(transcript).toContainText(
    "The room settles. No one adds anything yet.",
  );
  await expect(transcript).not.toContainText("You · Say nothing");
  await expect(transcript).not.toContainText("You · Listen");
  await strip.getByRole("button", { name: "Previous" }).click();
  transcript = page.getByTestId("conversation-transcript");
  await expect(transcript).toContainText("I can make that call");
  await expect(transcript.locator("strong")).toHaveCount(1);
  await expectConversationContentFits(strip);
  await strip.getByRole("button", { name: "Back to conversation" }).click();
  await expect(strip).toHaveAttribute("data-conversation-mode", "open");
  await expect(listen()).toHaveCount(0);

  await strip.getByRole("button", { name: "Reed", exact: true }).click();
  await strip
    .getByRole("button", { name: "Ask Reed to check the third referral" })
    .click();
  await expect(listen()).toBeVisible();
  await listen().click();
  await expect(strip).toContainText("Once Reed reports on the third referral");
  await expect(office).toHaveAttribute("data-simulation-date", "2026-01-05");
  await expect(office).toHaveAttribute("data-action-sequence", "0");
});

test("gates a pending Collins response by Quiet versus Normal hearing", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const strip = await openConversation(page);
  const listen = () =>
    strip.getByRole("button", { name: "Listen", exact: true });

  await expect(
    strip.getByRole("button", {
      name: "Limit the checklist to proof-of-income forms",
    }),
  ).toBeVisible();
  await strip.getByRole("button", { name: "Reed", exact: true }).click();
  await strip.getByRole("button", { name: "Quiet", exact: true }).click();
  await expect(page.getByTestId("conversation-hearing-context")).toContainText(
    "do not expect Collins to catch the details",
  );
  await strip
    .getByRole("button", { name: "Ask Reed to check the third referral" })
    .click();
  await expect(strip).toContainText("I’ll call the neighborhood office");
  await expect(strip).not.toContainText(
    "Once Reed reports on the third referral",
  );
  await expect(listen()).toHaveCount(0);
  await expect(office).toHaveAttribute("data-conversation-event-count", "1");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "1");

  await strip.getByRole("button", { name: "Normal", exact: true }).click();
  await expect(page.getByTestId("conversation-hearing-context")).toContainText(
    "Collins is nearby",
  );
  await expect(listen()).toBeVisible();
  await listen().click();
  await expect(strip).toContainText("Once Reed reports on the third referral");
  await expect(office).toHaveAttribute("data-conversation-event-count", "2");
  await expect(office).toHaveAttribute("data-conversation-claim-count", "2");
  await expectConversationContentFits(strip);
});

test("keeps transcript, collapse, and close controls time-neutral", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  let strip = await openConversation(page);
  const initialHistory = await office.getAttribute("data-history-sequence");

  await strip.getByRole("button", { name: "View history" }).click();
  await expect(strip).toHaveAttribute("data-conversation-mode", "history");
  await expect(page.getByTestId("conversation-transcript")).toContainText(
    "No substantive turns yet",
  );
  await expect(
    strip.getByRole("button", { name: "Back to conversation" }),
  ).toBeVisible();
  await expectConversationContentFits(strip);
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("conversation-transcript")).toHaveCount(0);
  await expect(strip).toBeVisible();
  await expect(strip).toHaveAttribute("data-conversation-mode", "open");
  await expectConversationContentFits(strip);
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );

  await strip.getByRole("button", { name: "Collapse conversation" }).click();
  strip = page.getByTestId("conversation-strip");
  await expect(strip).toHaveAttribute("data-conversation-mode", "collapsed");
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
  await strip.getByRole("button", { name: "Resume" }).click();
  await expect(strip).toHaveAttribute("data-conversation-mode", "open");
  await strip.getByRole("button", { name: "Close conversation" }).click();
  await expect(strip).toHaveCount(0);
  await expect(office).toHaveAttribute(
    "data-history-sequence",
    initialHistory!,
  );
  await expect(office).toHaveAttribute("data-simulation-date", "2026-01-05");
  await expect(office).toHaveAttribute("data-action-sequence", "0");
});

test("supports a complete keyboard and focus path into conversation", async ({
  page,
}) => {
  const npcA = page.getByTestId("scene-person");
  await npcA.focus();
  await page.keyboard.press("Enter");
  const inspect = page.getByRole("menuitem", { name: /Inspect/ });
  await expect(inspect).toBeFocused();
  await page.keyboard.press("Tab");
  const talk = page.getByRole("menuitem", { name: /Talk/ });
  await expect(talk).toBeFocused();
  await page.keyboard.press("Enter");

  const firstIntent = page.getByRole("button", {
    name: /Ask Collins to back the referral checklist/,
  });
  await expect(firstIntent).toBeFocused();
  const quiet = page.getByTestId("conversation-strip").getByRole("button", {
    name: "Quiet",
    exact: true,
  });
  await quiet.focus();
  await page.keyboard.press("Space");
  await expect(quiet).toHaveAttribute("aria-pressed", "true");
  await firstIntent.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("conversation-strip")).toContainText(
    "Have Reed check whether the third county referral",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("conversation-strip")).toHaveCount(0);
});

test("reproduces the same deterministic conversation result after reload", async ({
  page,
}) => {
  async function playOnce() {
    const strip = await openConversation(page);
    await strip.getByRole("button", { name: "Quiet", exact: true }).click();
    await strip
      .getByRole("button", {
        name: "Ask Collins to back the referral checklist",
      })
      .click();
    return {
      dialogue: await strip
        .locator(".conversation-beat blockquote")
        .innerText(),
      history: await page
        .getByTestId("player-office")
        .getAttribute("data-history-sequence"),
      events: await page
        .getByTestId("player-office")
        .getAttribute("data-conversation-event-count"),
      claims: await page
        .getByTestId("player-office")
        .getAttribute("data-conversation-claim-count"),
      knowledge: await page
        .getByTestId("player-office")
        .getAttribute("data-conversation-knowledge-count"),
    };
  }

  const first = await playOnce();
  await page.reload();
  const second = await playOnce();
  expect(second).toEqual(first);
});
