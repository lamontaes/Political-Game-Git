import { expect, test, type Page } from "@playwright/test";

const FLOOR = "/?view=floor";

/**
 * One continuous run through the bargaining slice, in the room.
 *
 * The path is the one a player takes: walk into the members' room, find out
 * what each colleague wants, read the bill, counter, put the amendment to the
 * chamber, call the vote, and go back and talk to the person whose vote you
 * were arguing about. Nothing here reaches into the simulation; every
 * assertion is something visible on the page.
 */

const FORBIDDEN = [
  /decision trace/i,
  /optionKey/,
  /finalRank/,
  /\bscore\b/i,
  /\d+%\s*(chance|likely|support)/i,
  /votes? bought/i,
  /whip count/i,
  /support meter/i,
  /support-if/,
  /policy-bargaining/,
  /personal-inducement/,
  /targeted-benefit-request/,
];

async function expectNoDeveloperLeak(page: Page) {
  const body = page.locator("body");
  for (const pattern of FORBIDDEN) {
    await expect(body).not.toContainText(pattern);
  }
}

async function talkTo(page: Page, name: string) {
  await page
    .getByRole("button", { name: new RegExp(name) })
    .first()
    .click();
  await page.getByRole("menuitem", { name: /Talk/ }).click();
  await expect(page.getByTestId("conversation-strip")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto(FLOOR);
  await expect(page.getByTestId("measure-floor-view")).toBeVisible();
});

test("the room, the bill, the bargain, and the vote", async ({ page }) => {
  const view = page.getByTestId("measure-floor-view");
  const scene = page.getByTestId("political-office-scene");
  await expect(scene).toBeVisible();

  // Two colleagues, each named and reachable, in one room.
  await expect(page.getByTestId("scene-person")).toBeVisible();
  await expect(page.getByTestId("scene-person-b")).toBeVisible();
  await expect(page.getByTestId("scene-person-nameplate")).toContainText(
    "Member, House of Representatives",
  );
  await expect(page.getByTestId("room-note")).toContainText("can hear");

  // The bill is a thing on the desk, not a menu item.
  const entry = page.getByTestId("working-document-entry");
  await expect(entry).toContainText("HB 214");
  await entry.click();
  const paper = page.getByTestId("measure-paper");
  await expect(paper).toContainText("AS IT NOW READS · NOT ENACTED");
  await expect(paper).toContainText("Section 3. Pilot support limit");
  await expect(paper).toContainText("No provider is named in this section");
  await expect(
    page.getByTestId("measure-section-local-project-match"),
  ).toHaveCount(0);
  await expect(view).toHaveAttribute("data-provision-count", "3");

  // Reading the fiscal note is something you do, not something you are told.
  await page.getByTestId("open-fiscal-note").click();
  await expect(page.getByTestId("fiscal-note-unread")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("two-year exposure");
  await page.getByTestId("read-fiscal-note").click();
  await expect(page.getByTestId("fiscal-note-body")).toContainText(
    "$8,000,000",
  );
  await page.getByTestId("close-panel").click();

  // Previewing the proposed section changes nothing about the bill.
  const beforePreview = await view.getAttribute("data-history-sequence");
  await page.getByTestId("open-proposal").click();
  const proposal = page.getByTestId("proposal-panel");
  await expect(proposal).toContainText("Preview only");
  await expect(proposal).toContainText("Ashland–Boyd County Transit Authority");
  await expect(proposal).toContainText("Stated ground");
  await expect(view).toHaveAttribute("data-history-sequence", beforePreview!);
  await expect(view).toHaveAttribute("data-provision-count", "3");
  await page.getByTestId("close-panel").click();
  await page.getByRole("button", { name: "Back to the room" }).click();

  // Two colleagues, two different problems with the same bill.
  await talkTo(page, "Alexander Thompson");
  const strip = page.getByTestId("conversation-strip");
  await expect(strip).toContainText("HB 214");
  await expect(strip).toContainText("Ashland");
  await expect(strip.getByRole("button", { name: "Private" })).toBeDisabled();
  await strip.getByRole("button", { name: /what they actually want/ }).click();
  const advocateLine = await strip.locator("blockquote").innerText();

  await strip.getByRole("button", { name: "Noel", exact: true }).click();
  await strip.getByRole("button", { name: /what they actually want/ }).click();
  const guardianLine = await strip.locator("blockquote").innerText();
  expect(guardianLine).not.toBe(advocateLine);
  expect(guardianLine).toMatch(/\$|cost|offset|commits/i);

  // Counter, and hear a condition attached out loud.
  await strip.getByRole("button", { name: "Thompson", exact: true }).click();
  await strip.getByRole("button", { name: /Counter at \$600,000/ }).click();
  await expect(strip).toContainText("Ashland–Boyd County Transit Authority");
  await expect(view).toHaveAttribute("data-commitment-count", "1");
  // Talking has still not changed a word of the bill.
  await expect(view).toHaveAttribute("data-provision-count", "3");
  await strip.getByRole("button", { name: "Close conversation" }).click();

  // The consequential choice: put it to the chamber.
  await page.getByTestId("working-document-entry").click();
  await page.getByTestId("open-proposal").click();
  await page.getByTestId("variant-capped").click();
  await page.getByTestId("offer-amendment").click();
  await expect(page.getByTestId("measure-message")).toContainText("adopted");
  await expect(view).toHaveAttribute("data-provision-count", "4");
  await expect(view).toHaveAttribute("data-amendment-count", "1");
  const section4 = page.getByTestId("measure-section-local-project-match");
  await expect(section4).toContainText("$600,000");
  await expect(section4).toHaveAttribute("data-beneficiary", "particularized");
  await expect(section4).toContainText("Stated ground");
  // A named section is not labelled corrupt anywhere on the page.
  await expect(page.locator("body")).not.toContainText(
    /corrupt|bribe|kickback|pork/i,
  );

  // The vote, and what each modelled member says they did and why.
  await page.getByTestId("call-the-vote").click();
  const result = page.getByTestId("floor-result");
  await expect(result).toContainText("voted");
  const accounts = page.getByTestId("member-accounts");
  await expect(accounts).toContainText("Alexander Thompson voted yea");
  await expect(accounts).toContainText("said this much on the record");
  await expect(accounts).toContainText("Jasmine Noel voted");

  // The record carries what was said, what was asked, and where it stands.
  await page.getByTestId("open-record").click();
  const record = page.getByTestId("record-panel");
  await expect(record).toContainText("Adopted.");
  await expect(page.getByTestId("record-commitment")).toContainText(
    "voted yea on the bill's passage, which is what was said",
  );
  await expect(record).toContainText("Condition:");
  await page.getByTestId("close-panel").click();
  await page.getByRole("button", { name: "Back to the room" }).click();

  // And the conversation afterwards knows what happened.
  await talkTo(page, "Alexander Thompson");
  await page
    .getByTestId("conversation-strip")
    .getByRole("button", { name: /Hold Thompson to what they said/ })
    .click();
  await expect(page.getByTestId("conversation-strip")).toContainText(
    /I said this to you|still counts/,
  );
  await expectNoDeveloperLeak(page);
});

test("refusing costs something, and the record says what", async ({ page }) => {
  const view = page.getByTestId("measure-floor-view");
  await talkTo(page, "Alexander Thompson");
  const strip = page.getByTestId("conversation-strip");
  await strip.getByRole("button", { name: /bill stays as it is/ }).click();
  await expect(view).toHaveAttribute("data-negotiation-count", "1");
  await strip.getByRole("button", { name: "Close conversation" }).click();

  await page.getByTestId("working-document-entry").click();
  await page.getByTestId("call-the-vote").click();
  const accounts = page.getByTestId("member-accounts");
  await expect(accounts).toContainText("Alexander Thompson voted nay");
  await expect(accounts).toContainText(
    /Nothing in the bill as it now reads is written for/,
  );
  await expect(page.getByTestId("floor-result")).toContainText("voted");

  // "I'm a no unless you write it in" is a commitment that binds while the
  // condition is unmet, and the record says so rather than calling it broken.
  await page.getByTestId("open-record").click();
  const commitment = page.getByTestId("record-commitment");
  await expect(commitment).toContainText("voted nay on the bill's passage");
  await expect(commitment).toContainText("which is what was said");
  await expect(commitment).toContainText("Condition: Section 4 is written in");
  await expectNoDeveloperLeak(page);
});

test("a private word is private, and an offer of money is refused", async ({
  page,
}) => {
  const view = page.getByTestId("measure-floor-view");
  await page.getByTestId("toggle-room-privacy").click();
  await expect(view).toHaveAttribute("data-room", "advocate-only");
  await expect(page.getByTestId("room-note")).toContainText("alone");

  await talkTo(page, "Alexander Thompson");
  const strip = page.getByTestId("conversation-strip");
  await strip.getByRole("button", { name: "Private" }).click();
  await expect(page.getByTestId("conversation-hearing-context")).toContainText(
    "only",
  );

  await strip
    .getByRole("button", { name: /Offer Thompson something for themselves/ })
    .click();
  await expect(strip).toContainText(/misspoke|in my pocket|That's the job/);
  await expect(view).toHaveAttribute("data-negotiation-count", "1");
  // It bought nothing: no commitment came of it.
  await expect(view).toHaveAttribute("data-commitment-count", "0");
  // And it is gone from the menu, because it is not a repeatable tactic.
  await expect(
    strip.getByRole("button", { name: /something for themselves/ }),
  ).toHaveCount(0);

  // Ordinary bargaining is still on the table, on worse terms.
  await expect(
    strip.getByRole("button", { name: /Offer to write Section 4/ }),
  ).toBeVisible();
  await expectNoDeveloperLeak(page);
});

test("replays identically from the same seed", async ({ page }) => {
  const run = async () => {
    await page.goto(FLOOR);
    await talkTo(page, "Alexander Thompson");
    const strip = page.getByTestId("conversation-strip");
    await strip
      .getByRole("button", { name: /what they actually want/ })
      .click();
    await strip.getByRole("button", { name: /Counter at \$600,000/ }).click();
    return strip.innerText();
  };
  const first = await run();
  const second = await run();
  expect(second).toBe(first);
});
