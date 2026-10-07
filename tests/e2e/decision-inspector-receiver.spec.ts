import { test, expect } from "./fixtures";

test("recorded decision selection renders shared current-code math without changing the supplied world", async ({
  page,
}) => {
  await page.goto("/tests/support/decision-inspector-receiver.html");
  await expect(page.getByTestId("causal-trace-view")).toBeVisible();
  const evidence = await page.evaluate(() => {
    const proof = (
      window as unknown as {
        decisionInspectorReceiverProof: {
          seed: string;
          initial: string;
          expected: {
            id: string;
            calculation: { options: { optionKey: string; sum: number }[] };
          }[];
        };
      }
    ).decisionInspectorReceiverProof;
    return {
      seed: proof.seed,
      initial: proof.initial,
      expected: proof.expected,
    };
  });
  await expect(page.getByTestId("trace-seed")).toHaveText(evidence.seed);
  expect(evidence.expected.length).toBeGreaterThan(0);
  for (const record of evidence.expected) {
    await page
      .getByRole("textbox", { name: "Search id, key, entity or text" })
      .fill(record.id);
    await page
      .getByTestId("trace-record-list")
      .getByRole("button")
      .first()
      .click();
    const details = page.getByTestId("decision-details");
    await expect(details).toBeVisible();
    await expect(details).toContainText("CURRENT-CODE CALCULATION");
    await expect(details).toContainText("not a historically stored total");
    for (const option of record.calculation.options) {
      await expect(
        details.getByRole("heading", {
          name: `${option.optionKey}: current-code sum ${option.sum}`,
          exact: true,
        }),
      ).toBeVisible();
    }
  }
  await page
    .getByRole("combobox", { name: "Format", exact: true })
    .selectOption("json");
  await expect(page.getByTestId("trace-export")).toHaveValue(
    new RegExp(evidence.expected.at(-1)!.id),
  );
  const snapshot = await page.evaluate(() =>
    (
      window as unknown as {
        decisionInspectorReceiverProof: { snapshot(): string };
      }
    ).decisionInspectorReceiverProof.snapshot(),
  );
  expect(snapshot).toBe(evidence.initial);
});
