/* global process, console, document, getComputedStyle */
// No boxes on any menu (owner, Nov 5: "i dont like the boxes being displayted like that"; said
// again in the Nov 16 playtest, and the owner's menu rules on issue #9995): a menu groups by
// spacing and type, with no framed plate per item, no hairline rectangle and no gold rule
// between sections. Each ring tab's screens are opened in a drawn place at 1440x900 and every
// element inside the sheet that is not a control is read for a drawn edge: a border on any
// side, a ring shadow, or a pseudo-element that paints a 1 px line. Controls (buttons, fields)
// are judged by their own states (buttons.browser.mjs), so they are left out here.
import { chromium } from "playwright";
import { startLife } from "./start-life.mjs";

const shots = process.env.MENU_SHOTS;
const SCREENS = [
  [
    "politics",
    [
      "Government",
      "Elections",
      "Parties",
      "Issues",
      "Bills",
      "Budgets",
      "Metrics",
    ],
  ],
  ["who", []],
  ["news", []],
  ["calendar", []],
  ["journal", []],
  ["people", []],
  ["map", []],
];

const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const found = [];

/** Every drawn edge inside the open sheet that is not a control's own. */
async function edges() {
  return page.evaluate(() => {
    const CONTROL = "button, input, select, textarea, [role=button], .tab, a";
    const drawn = (value) =>
      value && !/^rgba?\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$/.test(value);
    const label = (node) =>
      `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}${
        typeof node.className === "string" && node.className
          ? `.${node.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : ""
      }`;
    // Cards, days and list rows are controls that look like plates, so they are judged as plates.
    const PLATES = ".member-card, .calendar-entry, .month .day";
    const out = [];
    const root = document.getElementById("sheet");
    if (!root || root.hidden) return out;
    for (const node of root.querySelectorAll("*")) {
      if (!node.checkVisibility()) continue;
      // A member's card is a plate around a person, so it is judged here like any plate.
      if (node.closest(CONTROL) && !node.closest(PLATES)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      const style = getComputedStyle(node);
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if (
          parseFloat(style[`border${side}Width`]) > 0 &&
          style[`border${side}Style`] !== "none" &&
          drawn(style[`border${side}Color`])
        ) {
          out.push(`${label(node)}: border-${side.toLowerCase()}`);
          break;
        }
      }
      if (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0)
        out.push(`${label(node)}: outline`);
      if (/0px 0px 0px 1px/.test(style.boxShadow))
        out.push(`${label(node)}: ring shadow`);
      // A plate is a surface: an inset shadow or a painted fill behind a group is a box.
      if (/\binset\b/.test(style.boxShadow))
        out.push(`${label(node)}: inset surface`);
      // A plate at rest is no surface: a filled card or row is a box (a lit day is the exception).
      if (
        node.matches(PLATES) &&
        !node.matches(".today, .selected, .own") &&
        drawn(style.backgroundColor) &&
        !/rgba?\([^)]*,\s*0(\.0\d*)?\)$/.test(style.backgroundColor)
      )
        out.push(`${label(node)}: filled plate`);
      for (const pseudo of ["::before", "::after"]) {
        const p = getComputedStyle(node, pseudo);
        if (p.content === "none" || p.content === "normal") continue;
        const lines =
          /gradient/.test(p.backgroundImage) &&
          /\b1px\b/.test(p.backgroundSize);
        const ring =
          parseFloat(p.borderTopWidth) > 0 &&
          p.borderTopStyle !== "none" &&
          drawn(p.borderTopColor);
        if (lines || ring) out.push(`${label(node)}${pseudo}: drawn line`);
      }
    }
    return out;
  });
}

async function look(name) {
  await page.waitForTimeout(700);
  const hits = [...new Set(await edges())];
  console.log(`${name}: ${hits.length} boxed`);
  for (const hit of hits) found.push(`${name}: ${hit}`);
  if (shots)
    await page.screenshot({
      path: `${shots}/${name.replace(/\W+/g, "-").toLowerCase()}.png`,
    });
}

try {
  await startLife(page, { fresh: true });
  for (const [tab, buttons] of SCREENS) {
    const opener = page.locator(`#rings [data-tab="${tab}"]`).first();
    if (!(await opener.count())) continue;
    await opener.evaluate((button) => button.click());
    await look(tab);
    for (const name of buttons) {
      await page.locator("#sheet button", { hasText: name }).first().click();
      await look(`${tab} ${name}`);
    }
    await page
      .locator("#sheet-close")
      .click({ timeout: 3000 })
      .catch(() => undefined);
  }
  if (errors.length) found.push(`page errors: ${errors.join("; ")}`);
  if (found.length) {
    console.log(found.join("\n"));
    if (!process.env.AUDIT) throw new Error(`${found.length} boxes on menus`);
  }
  console.log("menus-no-boxes: ok");
} finally {
  await browser.close();
}
