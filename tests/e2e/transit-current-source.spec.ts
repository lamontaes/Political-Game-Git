import { expect, test } from "@playwright/test";
import { shotPath } from "./support/shot-path";

/** Component entry only; primary PlayerGame mount remains A-owned.
 * Explicit supplied-seat boundary. Transit and recorded legislative controls
 * produce the appropriation; no tax law or public cash is supplied. This proves
 * the unfunded ordinary route, not ordinary election or paid tax production. */
test("current-source transit component enacts two choices and preserves unpaid cancellation/publication across reopen", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const lives = await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/supplied-legislative-seat.ts";
    const repositoryPath = "/src/presentation/browser-world-repository.ts";
    const { suppliedLegislativeSeat } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { BrowserSaveStore } = await import(
      /* @vite-ignore */ repositoryPath
    );
    const store = new BrowserSaveStore({
      databaseName: "a39-transit-component-proof",
    });
    const result = [];
    for (const chamber of ["house", "senate"]) {
      const life = suppliedLegislativeSeat("US-AK", chamber);
      const saveId = store.newSaveId(life.world);
      const outcome = await store.save(life.world, saveId);
      if (outcome.status !== "saved")
        throw new Error("Supplied seat save failed.");
      result.push({ worldId: life.world.id, personId: life.personId, saveId });
    }
    return result;
  });
  expect(lives[0]!.worldId).not.toBe(lives[1]!.worldId);
  expect(lives[0]!.personId).not.toBe(lives[1]!.personId);
  async function openSavedLife(index: number) {
    await page.goto(
      `/tests/e2e/fixtures/transit-component.html?saveId=${lives[index]!.saveId}`,
    );
    await expect(page.getByTestId("transit-entry")).toHaveAttribute(
      "data-world-id",
      lives[index]!.worldId,
    );
    await expect(page.getByTestId("transit-entry")).toHaveAttribute(
      "data-person-id",
      lives[index]!.personId,
    );
  }
  async function openTransit() {
    const back = page.getByRole("button", {
      name: "Return to transit",
      exact: true,
    });
    if (await back.count()) await back.click();
  }
  async function saveLife() {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  }
  for (const [index, window] of ["weekday", "weekend"].entries()) {
    await page.goto("/");
    await openSavedLife(index);
    await openTransit();
    const workspace = page.getByRole("region", {
      name: "Transit service",
      exact: true,
    });
    await expect(workspace).toContainText(
      "No transit service appropriation has been filed",
    );
    await expect(
      workspace.getByLabel("Total amount provided (USD)"),
    ).toHaveValue("");
    const choices = workspace.getByRole("group", {
      name: "Service period",
      exact: true,
    });
    for (const choice of await choices.getByRole("radio").all())
      await expect(choice).not.toBeChecked();
    await workspace
      .getByLabel("Total amount provided (USD)")
      .fill(index ? "600.25" : "400.10");
    const period = choices.getByRole("radio", {
      name: index ? "Additional weekend service" : "Additional weekday service",
      exact: true,
    });
    if (index) {
      await period.focus();
      await page.keyboard.press("Space");
    } else await period.click();
    await expect(period).toBeChecked();
    const file = workspace.getByRole("button", {
      name: "File transit appropriation",
      exact: true,
    });
    if (index) {
      await file.focus();
      await page.keyboard.press("Enter");
    } else await file.click();
    await expect(workspace).toContainText("was filed");
    await expect(
      workspace.getByRole("button", {
        name: "Open legislative record",
        exact: true,
      }),
    ).toHaveCount(1);
    await page.screenshot({
      path: shotPath(`a39-t-${window}-filed.png`),
      fullPage: true,
    });
    await saveLife();
    await page.reload();
    await openSavedLife(index);
    await openTransit();
    await expect(
      page.getByRole("button", {
        name: "Open legislative record",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("region", { name: "Transit service", exact: true }),
    ).toContainText("has not become law");
    const openRecord = page.getByRole("button", {
      name: "Open legislative record",
      exact: true,
    });
    if (index) {
      await openRecord.focus();
      await page.keyboard.press("Enter");
    } else await openRecord.click();
    const ballot = page.getByTestId("docket-recorded-player-ballot-yea");
    if (index) {
      await ballot.focus();
      await page.keyboard.press("Space");
    } else await ballot.click();
    const admit = page.getByTestId("docket-use-recorded-sitting");
    if (index) await admit.click();
    else {
      await admit.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByTestId("legislation-authored")).toContainText(
      "Recorded fictional Alaska sitting",
    );
    for (const other of [false, true]) {
      for (const action of [
        "request-referral",
        "request-committee-hearing",
        "move-committee-report",
        "request-calendar-placement",
        "move-floor-vote",
      ] as const) {
        await page.getByTestId(`legislation-step-${action}`).click();
        await expect(page.getByTestId("legislation-error")).toHaveCount(0);
      }
      if (!other)
        await page
          .getByTestId("legislation-step-transmit-to-second-chamber")
          .click();
    }
    for (const action of [
      "request-enrollment",
      "present-to-executive",
      "await-executive-decision",
      "move-veto-override",
      "record-enactment",
    ] as const)
      await page.getByTestId(`legislation-step-${action}`).click();
    await expect(page.getByTestId("legislation-workspace")).toHaveAttribute(
      "data-finished",
      "true",
    );
    await openTransit();
    const transit = page.getByRole("region", {
      name: "Transit service",
      exact: true,
    });
    await expect(transit).toContainText("takes effect on");
    const continueDay = transit.getByRole("button", {
      name: "Continue one day",
      exact: true,
    });
    for (let day = 0; day < 90; day++) {
      // A running time command marks the control busy; one press per day.
      await expect(continueDay).toBeEnabled();
      if (index) {
        await continueDay.focus();
        await page.keyboard.press("Enter");
      } else await continueDay.click();
    }
    const request = transit.getByRole("button", {
      name: "Request two service periods",
      exact: true,
    });
    const cash = page.getByTestId("transit-cash-snapshot");
    await expect(cash).toHaveAttribute("data-state", "account-missing");
    await expect(cash).toContainText(
      index
        ? "First period: $300.12. Second period: $300.13."
        : "First period: $200.05. Second period: $200.05.",
    );
    await expect(cash).toContainText("reserves no money");
    await expect(request).toBeVisible();
    if (index) {
      await request.focus();
      await page.keyboard.press("Enter");
    } else await request.click();
    for (let day = 0; day < 14; day++) await continueDay.click();
    await expect(transit).toContainText("blocked");
    const cancel = transit.getByRole("button", {
      name: "Cancel undelivered periods",
      exact: true,
    });
    if (index) {
      await cancel.focus();
      await page.keyboard.press("Enter");
    } else await cancel.click();
    await expect(transit).toContainText("cancelled");
    const publish = transit
      .getByRole("button", {
        name: "Publish dated service report",
        exact: true,
      })
      .first();
    if (index) await publish.click();
    else {
      await publish.focus();
      await page.keyboard.press("Enter");
    }
    await expect(
      transit.getByText("Published in Civic Ledger.", { exact: true }),
    ).toHaveCount(1);
    await page.screenshot({
      path: shotPath(`a39-t-${window}-unfunded-cancelled.png`),
      fullPage: true,
    });
    await saveLife();
    await page.reload();
    await openSavedLife(index);
    await openTransit();
    await expect(transit).toContainText("blocked");
    await expect(transit).toContainText("cancelled");
    await expect(
      transit.getByText("Published in Civic Ledger.", { exact: true }),
    ).toHaveCount(1);
    const canonical = await page.evaluate(async (saveId) => {
      const repositoryPath = "/src/presentation/browser-world-repository.ts";
      const servicePath = "/src/presentation/transit-work.ts";
      const { BrowserSaveStore } = await import(
        /* @vite-ignore */ repositoryPath
      );
      const { projectTransitWork } = await import(
        /* @vite-ignore */ servicePath
      );
      const world = await new BrowserSaveStore({
        databaseName: "a39-transit-component-proof",
      }).load(saveId);
      if (!world || world.control.kind !== "person")
        throw new Error("Missing saved life.");
      const view = projectTransitWork(world, world.control.personId);
      const funding = view.bills[0].funding;
      if (funding.kind !== "available")
        throw new Error("The saved appropriation lost its operative mandate.");
      return {
        worldId: world.id,
        personId: world.control.personId,
        bills: view.bills.length,
        amountMinorUnits: funding.mandate.amount.minorUnits,
        serviceWindow: funding.mandate.serviceWindow,
        statuses: view.bills[0].periods.map(
          (p: { state: { status: string } }) => p.state.status,
        ),
        serviceEffects: world.history.effectActivations.length,
        payments: world.history.resourceFlows.filter(
          (f: { basisReference: { kind: string } }) =>
            f.basisReference.kind === "public-funding",
        ).length,
      };
    }, lives[index]!.saveId);
    expect(canonical).toEqual({
      worldId: lives[index]!.worldId,
      personId: lives[index]!.personId,
      bills: 1,
      amountMinorUnits: index ? 60_025 : 40_010,
      serviceWindow: window,
      statuses: ["blocked", "cancelled"],
      serviceEffects: 0,
      payments: 0,
    });
  }
  expect(errors).toEqual([]);
});
