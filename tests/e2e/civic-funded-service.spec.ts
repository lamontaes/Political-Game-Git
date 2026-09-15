import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openShellMenu, saveLife } from "./support/creator";
import { shotPath } from "./support/shot-path";

/**
 * Supplied-office boundary, labeled: one fictional Alaska House seat, advanced
 * to the 2027 regular session on the canonical tax-aware clock before play.
 * This proves governing, not ordinary candidacy. From the first screen on,
 * every step is an ordinary control in the composed game: shop work pays the
 * member, both bills pass through their disclosed recorded sittings, the tax
 * takes effect and is collected, and that collected cash pays for delivered
 * service. No cash, ballot, law or result is injected.
 */
test.setTimeout(900_000);
// A missing control fails in a minute, not at the whole journey's timeout.
test.use({ actionTimeout: 60_000 });

/** Destinations live inside navigation groups; open the group when needed. */
async function goTo(
  page: Page,
  id: string,
  group: "personal" | "politics",
): Promise<void> {
  await openShellMenu(page);
  if (!(await page.getByTestId(id).isVisible()))
    await page.getByTestId(`nav-group-${group}`).click();
  await page.getByTestId(id).click();
}

async function seedSuppliedAlaskaSeat(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { suppliedLegislativeSeat } = await load(
      "/tests/fixtures/supplied-legislative-seat.ts",
    );
    const { BrowserSaveStore } = await load(
      "/src/presentation/browser-world-repository.ts",
    );
    const { advanceWorld } = await load("/src/simulation/world.ts");
    const { daysBetween, makeIsoDate } = await load("/src/simulation/dates.ts");
    const { createTaxTransitionHandlerRegistry } = await load(
      "/src/simulation/tax-policy.ts",
    );
    const life = suppliedLegislativeSeat("US-AK", "house");
    const world = advanceWorld(
      life.world,
      daysBetween(life.world.currentDate, makeIsoDate("2027-02-01")),
      createTaxTransitionHandlerRegistry(),
    );
    const store = new BrowserSaveStore();
    const outcome = await store.save(world, store.newSaveId(world));
    if (outcome.status !== "saved")
      throw new Error("Supplied seat save failed.");
  });
}

async function openSavedLife(page: Page) {
  await page.goto("/");
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .first()
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByTestId("shell-nav-cluster")).toBeVisible();
}

const transit = (page: Page) =>
  page.getByRole("region", { name: "Transit service", exact: true });

async function continueOnTransit(page: Page, label: "day" | "week") {
  await transit(page)
    .getByRole("button", { name: `Continue one ${label}`, exact: true })
    .click();
}

/** Presses the next supported step, own chamber or recorded other-chamber
 * wait, until the procedure offers none. Amendments are never offered here. */
async function driveProcedure(page: Page, scope: Locator) {
  const next = scope
    .locator(
      '[data-testid^="legislation-step-"]:not([data-testid="legislation-step-offer-amendment"]):enabled',
    )
    .first();
  // A step can succeed without moving the bill (a hearing keeps it in
  // committee), so progress is the where line, the latest action and the
  // enabled steps together. A refusal fails at once with its own words.
  const state = async () => {
    const latest = scope.getByTestId("legislation-latest");
    return [
      await scope.getByTestId("legislation-where").innerText(),
      (await latest.count()) ? await latest.innerText() : "",
      await scope
        .locator('[data-testid^="legislation-step-"]:enabled')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-testid")).join(","),
        ),
    ].join("|");
  };
  for (let guard = 0; guard < 40 && (await next.count()) > 0; guard++) {
    const before = await state();
    await next.click();
    const refusal = scope.getByTestId("legislation-error");
    if (await refusal.count())
      throw new Error(`Procedure refused: ${await refusal.innerText()}`);
    await expect.poll(state, { timeout: 60_000 }).not.toBe(before);
  }
  await expect(scope.getByTestId("legislation-options")).toHaveCount(0);
}

test("an Alaska member funds added transit service from a collected tax and sees what it delivered after reopening", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seedSuppliedAlaskaSeat(page);
  await openSavedLife(page);

  // Personal: ordinary shop work is the member's only recorded money.
  await goTo(page, "nav-jobs", "personal");
  const careers = page.getByRole("region", { name: "Career opportunities" });
  await careers.getByRole("combobox").selectOption({ label: "Shop assistant" });
  await careers.getByRole("button", { name: "Seek an offer" }).click();
  await careers.getByRole("button", { name: "Accept offer" }).click();
  await expect(careers).toContainText("Accepted. Begin work on or after");
  // The panel's own wait can stop at a commitment; the ordinary Day control
  // moves the shared clock to the start date, then the accepted work begins.
  const perform = careers.getByRole("button", { name: "Perform work" });
  for (let day = 0; day < 4 && !(await perform.count()); day++) {
    await page
      .getByRole("group", { name: "Move time" })
      .getByRole("button", { name: "Day", exact: true })
      .click();
    await goTo(page, "nav-jobs", "personal");
    await careers.getByRole("button", { name: "Begin accepted work" }).click();
  }
  await perform.click();

  // Politics → Transit: file the appropriation by pointer.
  await goTo(page, "nav-politics-transit", "politics");
  await transit(page).getByLabel("Total amount provided (USD)").fill("200.00");
  await transit(page)
    .getByRole("radio", { name: "Additional weekday service", exact: true })
    .click();
  await transit(page)
    .getByRole("button", { name: "File transit appropriation", exact: true })
    .click();
  await expect(transit(page)).toContainText("was filed");
  await expect(transit(page)).toContainText("has not become law");

  // Its record opens in the Docket, where the disclosed appropriation sitting
  // is chosen with an explicit ballot and the procedure is followed.
  await transit(page)
    .getByRole("button", { name: "Open legislative record", exact: true })
    .click();
  const docketSitting = page.getByTestId("docket-recorded-sitting");
  await expect(docketSitting).toContainText(
    "Recorded fictional Alaska sitting",
  );
  await expect(page.getByTestId("docket-use-recorded-sitting")).toBeDisabled();
  await page.getByTestId("docket-recorded-player-ballot-yea").click();
  await page.getByTestId("docket-use-recorded-sitting").click();
  await driveProcedure(
    page,
    page.getByTestId("docket-institutional-procedure"),
  );

  // Politics → Taxes: file the tax and follow it in place, by keyboard.
  await goTo(page, "nav-politics-tax", "politics");
  const tax = page.getByTestId("tax-work");
  await tax.getByText("Prepare an authored tax proposal").click();
  await tax
    .getByLabel("Tax base description")
    .fill("fictional convenience purchases");
  await tax.getByLabel("Tax rate percent").fill("5");
  await tax.getByLabel("Tax allowance USD").fill("1");
  await tax.getByLabel("Tax settlement lag days").fill("2");
  await tax
    .getByLabel("Tax public purpose")
    .fill("added community transit service");
  await tax
    .getByLabel("Tax model assumptions")
    .fill("Fictional rate and base chosen for this life.");
  await tax.getByRole("button", { name: "File tax proposal" }).focus();
  await page.keyboard.press("Enter");
  const proposal = page.getByTestId("tax-proposal");
  await expect(page.getByTestId("tax-recorded-sitting")).toContainText(
    "Recorded fictional Alaska revenue sitting",
  );
  await page.getByTestId("tax-recorded-player-ballot-yea").focus();
  await page.keyboard.press("Space");
  await page.getByTestId("tax-use-recorded-sitting").focus();
  await page.keyboard.press("Enter");
  await driveProcedure(page, proposal);
  await expect(proposal).toContainText("Enacted policy; effective");
  await page.screenshot({
    path: shotPath("civic-tax-enacted.png"),
    fullPage: true,
  });

  // Time passes on the ordinary clock. Once the appropriation is operative but
  // before any tax is collected, Transit says a request would be refused.
  await goTo(page, "nav-politics-transit", "politics");
  for (
    let week = 0;
    week < 20 &&
    !(await transit(page).getByText("Operative appropriation").count());
    week++
  )
    await continueOnTransit(page, "week");
  await expect(transit(page).getByRole("note")).toContainText(
    "Public cash comes only from taxes that have actually been collected",
  );
  await page.screenshot({
    path: shotPath("civic-transit-unfunded.png"),
    fullPage: true,
  });
  await transit(page)
    .getByRole("button", { name: "Open taxes and public receipts" })
    .click();
  for (
    let day = 0;
    day < 60 &&
    !(await proposal.getByText("Effective for new occurrences today.").count());
    day++
  ) {
    await goTo(page, "nav-politics-transit", "politics");
    await continueOnTransit(page, "day");
    await goTo(page, "nav-politics-tax", "politics");
  }

  // Two declared occurrences; each is assessed and later collected once.
  const occurrence = proposal.getByLabel(
    "Occurrence base USD for fictional convenience purchases",
  );
  for (let declared = 0; declared < 2; declared++) {
    await occurrence.fill("2021.00");
    await proposal
      .getByRole("button", { name: "Declare personal occurrence" })
      .click();
    await expect(page.getByTestId("tax-work")).toContainText(
      "Assessment recorded",
    );
  }
  await goTo(page, "nav-politics-transit", "politics");
  for (let day = 0; day < 3; day++) await continueOnTransit(page, "day");
  await goTo(page, "nav-politics-tax", "politics");
  await expect(
    proposal.getByText("collected: 101.00 USD transferred"),
  ).toHaveCount(2);
  await expect(page.getByTestId("tax-public-cash")).toContainText("202.00 USD");

  // Transit: request, let both periods come due, then read what changed.
  await goTo(page, "nav-politics-transit", "politics");
  await expect(transit(page).getByRole("note")).toHaveCount(0);
  await transit(page)
    .getByRole("button", { name: "Request two service periods" })
    .click();
  await expect(
    transit(page).getByRole("button", { name: "Request two service periods" }),
  ).toHaveCount(0);
  for (let week = 0; week < 5; week++) await continueOnTransit(page, "week");
  const outcome = page.getByTestId("transit-outcome");
  await expect(outcome).toContainText(
    "2 vehicle-service hours of added weekday contract service delivered, paid with $200.00 from the public account.",
  );
  await expect(outcome).toContainText("Public account cash now: $2.00.");
  await expect(outcome).toContainText("Not modeled: ridership, travel times");
  await expect(transit(page).getByText("Delivered and paid.")).toHaveCount(2);
  await expect(
    transit(page).getByText("Delivered: 1 vehicle-service hour."),
  ).toHaveCount(2);
  await transit(page)
    .getByRole("button", { name: "Publish dated service report" })
    .first()
    .click();
  await expect(
    transit(page).getByText("Published in Civic Ledger."),
  ).toHaveCount(1);
  await page.screenshot({
    path: shotPath("civic-transit-delivered.png"),
    fullPage: true,
  });

  // Save, reload and reopen: the same delivered record, nothing paid twice.
  await saveLife(page);
  await page.reload();
  await openSavedLife(page);
  await goTo(page, "nav-politics-transit", "politics");
  await expect(page.getByTestId("transit-outcome")).toContainText(
    "paid with $200.00 from the public account.",
  );
  await continueOnTransit(page, "week");
  await expect(page.getByTestId("transit-outcome")).toContainText(
    "Public account cash now: $2.00.",
  );
  await page.screenshot({
    path: shotPath("civic-transit-reopened.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
