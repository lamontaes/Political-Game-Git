/* global document, innerWidth, innerHeight */
import { createRequire } from "node:module";
import { log } from "node:console";
const req = createRequire("/workspace/Political-Game-Git/package.json");
const { chromium } = req("@playwright/test");
import fs from "node:fs";
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const receipts = [];
  for (const active of ["elections", "requirements"]) {
    await p.goto(
      "http://127.0.0.1:8144/campaign-filled/campaigns-" + active + ".html",
    );
    await p.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode()));
    });
    const fit = await p.evaluate(() => {
      const elements = [
        ...document.querySelectorAll(
          ".panel,.columns,section,h1,h2,h3,p,small,footer,.x",
        ),
      ];
      return {
        viewport: [innerWidth, innerHeight],
        clipped: elements
          .filter((e) => {
            let r = e.getBoundingClientRect();
            return (
              r.x < 0 ||
              r.y < 0 ||
              r.right > innerWidth ||
              r.bottom > innerHeight
            );
          })
          .map((e) => e.outerHTML),
        overflow: elements
          .filter(
            (e) =>
              e.scrollWidth > e.clientWidth + 1 ||
              e.scrollHeight > e.clientHeight + 1,
          )
          .map((e) => e.outerHTML),
        retiredActions:
          /not recorded|not known|candidacy pack|data|People met|Ask for something|Put your name in|Door canvass|Phone shift|Go briefly|Leave and return/.test(
            document.body.innerText,
          ),
        text: document.querySelector(".panel").innerText,
        panelAreaFraction: (() => {
          let r = document.querySelector(".panel").getBoundingClientRect();
          return (r.width * r.height) / (innerWidth * innerHeight);
        })(),
      };
    });
    fs.writeFileSync(
      "/tmp/session14-mockups/campaign-filled/fit-" + active + ".json",
      JSON.stringify(fit, null, 2),
    );
    if (fit.clipped.length || fit.overflow.length || fit.retiredActions)
      throw Error("Fit/content failed");
    await p.screenshot({
      path:
        "/tmp/session14-mockups/campaign-filled/campaigns-" +
        active +
        "-1920.png",
    });
    receipts.push(fit);
  }
  await b.close();
  log(JSON.stringify(receipts));
})();
