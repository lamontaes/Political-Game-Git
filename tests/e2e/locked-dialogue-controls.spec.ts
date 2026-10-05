import { expect, test } from "./fixtures";

// Component-only interaction proof. Ordinary dialogue reachability and visual
// acceptance are separate; this mounts the production control, not a game save.
test.use({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? {
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
        },
      }
    : {}),
});

test("scales support keyboard toggle, pointer toggle and unavailable state", async ({
  page,
}) => {
  await page.goto("/");
  const conversationModule = await (
    await page.request.get("/src/player/SceneConversation.tsx")
  ).text();
  const mainModule = await (await page.request.get("/src/main.tsx")).text();
  const reactUrl = conversationModule.match(
    /from ["']([^"']*\/react\.js[^"']*)["']/,
  )?.[1];
  const domUrl = mainModule.match(
    /from ["']([^"']*\/react-dom_client\.js[^"']*)["']/,
  )?.[1];
  expect(reactUrl, "use the app's own optimized React module").toBeTruthy();
  expect(domUrl, "use the app's own optimized renderer module").toBeTruthy();
  await page.addScriptTag({
    type: "module",
    content: `
    import React from ${JSON.stringify(reactUrl)};
    import ReactDOM from ${JSON.stringify(domUrl)};
    const { createRoot } = ReactDOM;
    import { ConversationScales } from "/src/player/SceneConversation.tsx";
    const host = document.createElement("div");
    host.className = "pg-talk";
    host.style.cssText = "position:fixed;left:20px;top:20px;width:240px;height:100px;z-index:9999";
    document.body.append(host);
    const root = createRoot(host);
    function Controls() {
      const [active, setActive] = React.useState(false);
      const [available, setAvailable] = React.useState(true);
      return React.createElement(React.Fragment, null,
        React.createElement(ConversationScales, {available, active, onToggle: () => setActive(value => !value)}),
        React.createElement("button", {onClick: () => setAvailable(false)}, "Remove false replies"));
    }
    root.render(React.createElement(Controls));
  `,
  });
  const scales = page.getByRole("button", {
    name: "Show knowingly false replies",
    exact: true,
  });
  await expect(scales).toHaveAttribute("aria-pressed", "false");
  await expect(scales.locator("img")).toHaveAttribute(
    "src",
    /scales-level.svg$/,
  );
  await expect(scales).toHaveText("");
  await scales.focus();
  await page.keyboard.press("Space");
  await expect(scales).toHaveAttribute("aria-pressed", "true");
  await expect(scales.locator("img")).toHaveAttribute(
    "src",
    /scales-tipped.svg$/,
  );
  await scales.click();
  await expect(scales).toHaveAttribute("aria-pressed", "false");
  await scales.focus();
  await page.keyboard.press("Enter");
  await expect(scales).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Remove false replies", exact: true })
    .click();
  await expect(scales).toBeDisabled();
  await expect(scales).toHaveAttribute("aria-pressed", "false");
  await expect(scales.locator("img")).toHaveAttribute(
    "src",
    /scales-level.svg$/,
  );
  expect(
    await scales.evaluate(
      (element) => getComputedStyle(element).backgroundImage,
    ),
  ).toBe("none");
  expect(
    await scales
      .locator("img")
      .evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("0.28");
});
