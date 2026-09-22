import { expect, test, type Page } from "@playwright/test";
import { enterLife, fillCreator, goTo, openShellMenu } from "./support/creator";

/**
 * Not "does it work" but "can a player find it".
 *
 * Four things are built and reachable on main and were written down as never
 * started: party evolution, choosing who you continue as, the Guide, and the
 * news front page. The question is how a player arrives at each one from a
 * cold start — what they must already know, how many presses it takes, and
 * whether anything in the game ever says the thing exists.
 *
 * Every route here is walked through the menu a player sees. Nothing is
 * reached by URL or by a test helper that knows more than a player does.
 */
async function text(page: Page, testid: string, len = 400) {
  const el = page.getByTestId(testid);
  if (!(await el.count())) return null;
  return (await el.first().innerText())
    .slice(0, len)
    .replace(/\s+/g, " ")
    .trim();
}

/** Everything the menu offers, in the order a player sees it. */
async function menuOffers(page: Page) {
  await openShellMenu(page);
  await page.waitForTimeout(400);
  const buttons = page.locator(
    '[data-testid^="nav-"]:visible, [data-testid^="elsewhere-"]:visible',
  );
  const out: string[] = [];
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index);
    const testid = await button.getAttribute("data-testid");
    const label = (await button.innerText()).replace(/\s+/g, " ").trim();
    out.push(`${testid} :: ${label}`);
  }
  return out;
}

/**
 * The tripwire. This one runs everywhere, because the thing it holds is a
 * regression a reader of the code cannot see: the hint is composed, and the
 * part that made it wrong is the part that disappears.
 */
test("the Politics entry says what is behind it", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 60_000 });
  await fillCreator(page, {
    age: 34,
    state: "Maine",
    place: "Augusta",
    route: "normal",
  });
  await page.getByTestId("begin").click();
  await enterLife(page);
  await openShellMenu(page);

  const politics = page.getByTestId("nav-politics");
  await expect(politics).toBeVisible();
  const entry = (await politics.innerText()).replace(/\s+/g, " ").trim();
  console.log(`[politics] the entry reads: "${entry}"`);

  // Politics is the only route to parties, government, campaigns, local
  // records, candidacy and the budget. It used to describe itself with the
  // leftovers of a hint composed from the office, the campaign and jobs, so on
  // an ordinary first day it read "Politics Jobs and study" -- one press from
  // the real "Jobs and study" entry. Whatever the wording becomes, it may not
  // become that again.
  expect(entry.toLowerCase()).not.toBe("politics jobs and study");
  expect(entry.toLowerCase()).toMatch(/govern|part(y|ies)|budget|office/);
});

test.describe("the exploratory walk", () => {
  test.skip(
    process.env.GITHUB_ACTIONS === "true",
    "manual playtest measurement; run locally against a chosen build",
  );

  test("how a player arrives at four built things", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/");
    await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 60_000 });

    // --- What the title screen offers before a life exists.
    const titleButtons = page.locator("main button:visible");
    const titleOffers: string[] = [];
    for (let index = 0; index < (await titleButtons.count()); index += 1) {
      titleOffers.push(
        (await titleButtons.nth(index).innerText()).replace(/\s+/g, " ").trim(),
      );
    }
    console.log(`[disc] title screen offers: ${JSON.stringify(titleOffers)}`);

    await fillCreator(page, {
      age: 34,
      state: "Maine",
      place: "Augusta",
      route: "normal",
    });
    await page.getByTestId("begin").click();
    await enterLife(page);
    console.log(`[disc] life begins: ${await text(page, "story-who", 60)}`);

    // --- Step 1 for everything: the menu itself.
    const offers = await menuOffers(page);
    console.log(`[disc] the menu offers ${offers.length} destinations:`);
    for (const offer of offers) console.log(`[disc]   ${offer}`);

    // --- 1. The Guide.
    console.log("\n[disc] === the Guide ===");
    await goTo(page, "nav-guide");
    await page.waitForTimeout(700);
    const guideTerms = page.locator('[data-testid^="guide-term"]');
    console.log(`[disc] guide entries on screen: ${await guideTerms.count()}`);
    const guideBody = await page.locator("main").innerText();
    console.log(
      `[disc] guide opens with: "${guideBody.slice(0, 400).replace(/\s+/g, " ").trim()}"`,
    );
    // Does the Guide itself name the other three?
    for (const [what, needle] of [
      ["party evolution", /part(y|ies)/i],
      ["continuing as someone", /continue as|successor|when you die|heir/i],
      ["the news", /news/i],
    ] as const) {
      console.log(`[disc] Guide mentions ${what}: ${needle.test(guideBody)}`);
    }

    // --- 2. The news front page.
    console.log("\n[disc] === the news ===");
    await goTo(page, "nav-news");
    await page.waitForTimeout(900);
    const newsBody = await page.locator("main").innerText();
    console.log(
      `[disc] news opens with: "${newsBody.slice(0, 500).replace(/\s+/g, " ").trim()}"`,
    );

    // --- 3. Party evolution.
    console.log("\n[disc] === parties ===");
    await goTo(page, "nav-parties");
    await page.waitForTimeout(900);
    const partiesBody = await page.locator("main").innerText();
    console.log(
      `[disc] parties opens with: "${partiesBody.slice(0, 700).replace(/\s+/g, " ").trim()}"`,
    );
    for (const [what, needle] of [
      ["a founding", /found|new party|formed/i],
      ["a split", /split|broke away|breakaway/i],
      ["a merger", /merge|merged|joined with/i],
      ["platform drift", /platform|position|stance/i],
    ] as const) {
      console.log(
        `[disc] parties screen shows ${what}: ${needle.test(partiesBody)}`,
      );
    }

    // --- 4. Continuing as somebody when you die.
    console.log("\n[disc] === continuing as somebody ===");
    // Nothing should need a death to MENTION it. Check the places a player
    // would look for it while alive.
    for (const [where, testid] of [
      ["Who you are", "nav-personal"],
      ["Journal", "nav-journal-entry"],
      ["People", "elsewhere-people"],
    ] as const) {
      await goTo(page, testid);
      await page.waitForTimeout(800);
      const body = await page.locator("main").innerText();
      const mentions =
        /continue as|successor|when you die|carry on as|after you die/i.test(
          body,
        );
      console.log(
        `[disc] ${where} mentions continuing as somebody: ${mentions}`,
      );
    }

    expect(offers.length).toBeGreaterThan(0);
  });
});
