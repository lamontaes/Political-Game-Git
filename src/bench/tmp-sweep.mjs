import { chromium } from "playwright";
const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
const bad = /undefined|\bnull\b|NaN|\[object|\b\d{4}-\d{2}-\d{2}\b|\b[a-z]+:[a-z-]+:[A-Za-z0-9-]{6,}|person_[0-9a-f]{4}|jurisdiction_|work-relationship|\$\d+\.\d{3,}/;
for (let n=0;n<10;n++){
  const page = await b.newPage({viewport:{width:1440,height:900}});
  page.setDefaultTimeout(300000);
  const errs=[]; page.on("pageerror",e=>errs.push(e.message));
  await page.goto("http://localhost:3000/play");
  await page.waitForTimeout(800);
  await page.click("#new-life"); await page.click("#new-start");
  await page.locator("#cr-screen:not([hidden])").waitFor();
  await page.click(`[data-gender=${["male","female","nonbinary"][n%3]}]`).catch(()=>{});
  await page.click("#cr-random-name"); await page.locator("#cr-given:not([value=''])").waitFor();
  await page.click("#cr-place-random"); await page.waitForTimeout(1000);
  const place=(await page.locator("#cr-place-summary-name").innerText()).trim();
  await page.click("#cr-begin");
  await page.locator("#front").waitFor({state:"hidden"});
  await page.waitForTimeout(2500);
  const hits=[];
  const tabs=await page.$$eval("#rings [data-tab]",bs=>bs.map(b=>b.dataset.tab));
  for (const t of tabs){
    await page.locator(`#rings [data-tab="${t}"]`).evaluate(e=>e.click());
    await page.waitForTimeout(1000);
    const subs=await page.locator("#sheet-tabs button").allInnerTexts();
    for (const s of [null,...subs]){
      if (s) await page.locator("#sheet-tabs button",{hasText:s}).first().evaluate(e=>e.click()).catch(()=>{});
      await page.waitForTimeout(600);
      const info=await page.evaluate(()=>{const s=document.getElementById("sheet"); const body=document.getElementById("sheet-body"); const r=s.getBoundingClientRect(); return {txt:body.innerText, off: r.right>innerWidth+1||r.bottom>innerHeight+1||r.left<-1||r.top<-1, hs: body.scrollWidth>body.clientWidth+2}});
      const m=info.txt.match(bad); if (m) hits.push(`${t}/${s??"-"}: "${m[0]}"`);
      if (info.off) hits.push(`${t}/${s??"-"}: sheet off screen`);
      if (info.hs) hits.push(`${t}/${s??"-"}: sideways scroll`);
    }
  }
  console.log(`${place}: errors ${JSON.stringify(errs)}, hits ${JSON.stringify(hits)}`);
  await page.close();
}
await b.close();
