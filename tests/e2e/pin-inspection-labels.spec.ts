import { expect, test } from "./fixtures";

// Component-only presentation proof. Place is an explicit category fixture; no
// place pin reference exists in production. Symbol selection and visual
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

test("pin names appear on hover/focus, and native keyboard activation preserves state", async ({
  page,
}) => {
  await page.goto("/");
  const controlModule = await (
    await page.request.get("/src/player/controls/PinToggle.tsx")
  ).text();
  const mainModule = await (await page.request.get("/src/main.tsx")).text();
  const reactUrl = mainModule.match(
    /from ["']([^"']*\/react\.js[^"']*)["']/,
  )?.[1];
  const domUrl = mainModule.match(
    /from ["']([^"']*\/react-dom_client\.js[^"']*)["']/,
  )?.[1];
  expect(controlModule).toContain("PinToggle");
  expect(reactUrl).toBeTruthy();
  expect(domUrl).toBeTruthy();
  await page.addScriptTag({
    type: "module",
    content: `
    import React from ${JSON.stringify(reactUrl)};
    import ReactDOM from ${JSON.stringify(domUrl)};
    import { PinToggle } from "/src/player/controls/PinToggle.tsx";
    import "/src/player/controls/controls.css";
    const host=document.createElement("div");host.className="pg-game";
    host.style.cssText="position:fixed;left:80px;top:100px;display:flex;gap:120px;z-index:9999";document.body.append(host);
    function Controls(){const [pins,setPins]=React.useState({place:false,government:false});return React.createElement(React.Fragment,null,...["place","government"].map(noun=>React.createElement(PinToggle,{key:noun,noun,pinned:pins[noun],name:"Controlled "+noun,testid:"fixture-pin-"+noun,onToggle:()=>setPins(values=>({...values,[noun]:!values[noun]}))})));}
    ReactDOM.createRoot(host).render(React.createElement(Controls));
  `,
  });
  for (const noun of ["place", "government"]) {
    const control = page.getByTestId(`fixture-pin-${noun}`);
    await expect(control).toHaveAccessibleName(`Pin Controlled ${noun}`);
    await page.mouse.move(600, 300);
    expect(
      await control.evaluate(
        (element) => getComputedStyle(element, "::after").display,
      ),
    ).toBe("none");
    await control.hover();
    expect(
      await control.evaluate(
        (element) => getComputedStyle(element, "::after").display,
      ),
    ).toBe("block");
    expect(
      await control.evaluate(
        (element) => getComputedStyle(element, "::after").content,
      ),
    ).toBe(`"${noun}: Controlled ${noun}"`);
    await page.mouse.move(600, 300);
    await control.focus();
    await page.keyboard.press("Shift");
    expect(
      await control.evaluate(
        (element) => getComputedStyle(element, "::after").display,
      ),
    ).toBe("block");
    await page.keyboard.press("Space");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control).toHaveAccessibleName(`Unpin Controlled ${noun}`);
    await expect(control).toHaveText("");
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-pressed", "false");
  }
});
