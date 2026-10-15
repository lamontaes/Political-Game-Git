const { createRequire } = require("module");
const req = createRequire("/workspace/Political-Game-Git/package.json");
const { chromium } = req("@playwright/test");
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const receipts = [];
  for (const state of ["rest", "open"]) {
    await p.goto(
      "http://127.0.0.1:8144/unified-radial/radial-" + state + ".html",
    );
    await p.waitForFunction(() => window.ready);
    await p.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode())),
    );
    receipts.push(
      await p.evaluate((state) => {
        const rect = (e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        };
        const visible = [
          ...document.querySelectorAll(
            ".entry,.surface,.a-card,.s3-card-name,.facts dd",
          ),
        ].filter((e) => e.getClientRects().length);
        const pills = [...document.querySelectorAll(".entry")]
          .filter((e) => e.getClientRects().length)
          .map((e) => ({
            label: e.innerText,
            angle: +e.dataset.angle,
            ...rect(e),
          }));
        return {
          state,
          viewport: [innerWidth, innerHeight],
          clipped: visible
            .filter((e) => {
              const r = e.getBoundingClientRect();
              return (
                r.x < 0 ||
                r.y < 0 ||
                r.right > innerWidth ||
                r.bottom > innerHeight
              );
            })
            .map((e) => e.className),
          overflow: visible
            .filter(
              (e) =>
                e.scrollHeight > e.clientHeight + 1 ||
                e.scrollWidth > e.clientWidth + 1,
            )
            .map((e) => e.className),
          pills,
          card: rect(document.querySelector(".a-card")),
          surface: rect(document.querySelector(".surface")),
          timeActionsInCard: !!document.querySelector(".a-card .time-actions"),
          radialChevrons: pills.length
            ? [...document.querySelectorAll(".entry")].some(
                (e) => getComputedStyle(e, "::before").content !== "none",
              )
            : false,
          recordedText: document.querySelector(".a-card").innerText,
        };
      }, state),
    );
    await p.screenshot({
      path: "/tmp/session14-mockups/unified-radial/radial-" + state + ".png",
    });
  }
  fs.writeFileSync(
    "/tmp/session14-mockups/unified-radial/fit.json",
    JSON.stringify(receipts, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify(receipts));
})();
