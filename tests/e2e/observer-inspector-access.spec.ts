import { test, expect } from "./fixtures";

test("Observer inspector waits for the actual paused generated world and reads without changes", async ({
  page,
}) => {
  await page.route("**/observer-access-proof*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true; await import("/tests/e2e/support/observer-inspector-harness.tsx");</script>',
    }),
  );
  await page.goto("/observer-access-proof");
  await page.getByTestId("open-observer-inspector").click();
  await expect(page.getByTestId("causal-trace-view")).toHaveCount(0);
  const identity = await page.evaluate(() => {
    const proof = (
      window as unknown as {
        observerAccessProof: {
          releasePause(): void;
          identity: {
            seed: string;
            worldId: string;
            date: string;
            frontier: number;
          };
        };
      }
    ).observerAccessProof;
    proof.releasePause();
    return proof.identity;
  });
  const inspector = page.getByTestId("causal-trace-view");
  await expect(inspector).toBeVisible();
  await expect(page.getByTestId("trace-seed")).toHaveText(identity.seed);
  await expect(page.getByTestId("trace-identity")).toContainText(
    identity.worldId,
  );
  await expect(page.getByTestId("trace-identity")).toContainText(identity.date);
  await expect(page.getByTestId("trace-frontier")).toHaveText(
    String(identity.frontier),
  );
  await expect(inspector.getByLabel("Seed", { exact: true })).toBeDisabled();
  await inspector
    .getByLabel("Search id, key, entity or text")
    .fill("no-record-with-this-key");
  await expect(inspector).toContainText("No record matches these filters.");
  await inspector.getByLabel("Search id, key, entity or text").fill("");
  await page
    .getByTestId("trace-record-list")
    .getByRole("button")
    .last()
    .click();
  await inspector
    .getByRole("combobox", { name: "Direction", exact: true })
    .selectOption("both");
  await inspector.getByLabel("Depth", { exact: true }).fill("2");
  await inspector
    .getByRole("combobox", { name: "Format", exact: true })
    .selectOption("json");
  await expect(page.getByTestId("trace-export")).not.toHaveValue("");
  const assertPure = async () =>
    expect(
      await page.evaluate(() => {
        const proof = (
          window as unknown as {
            observerAccessProof: {
              unchanged(): boolean;
              forwardedExactWorld(): boolean;
            };
          }
        ).observerAccessProof;
        return proof.unchanged() && proof.forwardedExactWorld();
      }),
    ).toBe(true);
  await assertPure();
  await page.getByTestId("observer-inspector-workspace-close").click();
  await expect(inspector).toHaveCount(0);
  await assertPure();
  await expect(page.getByTestId("observer-clock")).toBeVisible();
});

test("the clock does not offer developer access without Observer admission callback", async ({
  page,
}) => {
  await page.route("**/observer-access-proof*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true; await import("/tests/e2e/support/observer-inspector-harness.tsx");</script>',
    }),
  );
  await page.goto("/observer-access-proof?withoutInspector");
  await expect(page.getByTestId("observer-clock")).toBeVisible();
  await expect(page.getByTestId("open-observer-inspector")).toHaveCount(0);
});
