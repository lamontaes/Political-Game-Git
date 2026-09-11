import { test, expect, type Page } from "@playwright/test";

/**
 * Component activation proof over an explicitly authored scenario. It proves
 * the controls drive the canonical writers with pointer and keyboard and that
 * every result survives a snapshot reload. It is not normal-route reachability.
 */
async function mount(page: Page, controlled: string, seed: string) {
  await page.goto("/");
  await page.evaluate(
    async ([who, worldSeed]) => {
      const path = "/tests/support/civil-authority-mount.tsx";
      const { mountCivilAuthorityTest } = await import(/* @vite-ignore */ path);
      mountCivilAuthorityTest(who, worldSeed);
    },
    [controlled, seed],
  );
  return page.getByRole("region", { name: "Personnel matters" });
}

test("CIVIL-AUTHORITY13 discharge, filing, appeal and commissioner decision by pointer and keyboard", async ({
  page,
}) => {
  const matters = await mount(page, "director", "civil-authority13-b");
  await expect(matters).toBeVisible();
  const employee = matters.getByRole("article", {
    name: /, Records specialist$/,
  });
  await employee
    .getByRole("textbox", { name: "Meeting note" })
    .fill("Discussed three refusals to follow the retention procedure.");
  await employee
    .getByRole("button", { name: /Hold an informal resolution/ })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "informal resolution meeting took place",
  );
  // Represented and probationary employees stay refused with their reasons.
  await expect(matters).toContainText(
    "collective bargaining agreement governs",
  );
  await expect(matters).toContainText("subd. 3(c)");

  await employee
    .getByRole("combobox", { name: "Action" })
    .selectOption("discharge");
  await employee
    .getByRole("combobox", { name: "Just cause" })
    .selectOption({ label: "Insubordination" });
  await employee
    .getByRole("textbox", { name: "Specific reasons" })
    .fill("Refused three written directives on records retention.");
  await employee
    .getByRole("button", { name: "Issue a reprimand or discharge" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "written notice was issued",
  );

  const action = matters.getByRole("article", { name: /^Discharge of / });
  await expect(action).toContainText("Appeal deadline: 2026-10-14");
  await action
    .getByRole("button", { name: "File the notice with the commissioner" })
    .click();
  await expect(action).toContainText("Filed with the commissioner on time.");
  await action
    .getByRole("button", { name: "Check whether the employee appealed" })
    .focus();
  await page.keyboard.press("Space");
  await expect(action).toContainText(
    "Appeal filed. No one has decided it on the merits.",
  );
  await action
    .getByRole("button", {
      name: "Check for the commissioner's settlement decision",
    })
    .click();
  await expect(action).toContainText(
    "The commissioner did not direct a settlement.",
  );
  await expect(
    action.getByRole("button", {
      name: "Arbitrator list, selection and hearing",
    }),
  ).toBeDisabled();
  await expect(action).toContainText("Bureau rules and the plan");

  const snapshot = await page.evaluate(
    () =>
      (window as unknown as { civilAuthoritySnapshot: string })
        .civilAuthoritySnapshot,
  );
  const kinds = JSON.parse(snapshot).world.history.personnelRecords.map(
    (r: { kind: string }) => r.kind,
  );
  expect(kinds.slice(-5)).toEqual([
    "informal-resolution",
    "disciplinary-action",
    "commissioner-filing",
    "appeal",
    "settlement-decision",
  ]);
});

test("CIVIL-AUTHORITY13 reinstatement offer is not an appointment until the person accepts", async ({
  page,
}) => {
  const matters = await mount(page, "otherDirector", "civil-authority13");
  const vacancy = matters.getByRole("article", {
    name: "Vacant Records specialist position",
  });
  await expect(vacancy).toBeVisible();
  await vacancy.getByRole("checkbox", { name: "Require probation" }).check();
  await vacancy.getByRole("button", { name: "Offer reinstatement" }).click();
  await expect(page.getByRole("status")).toContainText(
    "It is not an appointment until accepted",
  );
  const offer = matters.getByRole("article", {
    name: /^Reinstatement offer to /,
  });
  await expect(offer).toContainText("Awaiting an answer.");
  await offer.getByRole("button", { name: "Hear their answer" }).focus();
  await page.keyboard.press("Enter");
  await expect(offer).toContainText("Answer: accepted.");
  await expect(offer.getByRole("button")).toHaveCount(0);
  const snapshot = await page.evaluate(
    () =>
      (window as unknown as { civilAuthoritySnapshot: string })
        .civilAuthoritySnapshot,
  );
  const records = JSON.parse(snapshot).world.history.personnelRecords;
  expect(records.at(-1)).toMatchObject({
    kind: "incumbency",
    tenure: "probationary",
  });
});
