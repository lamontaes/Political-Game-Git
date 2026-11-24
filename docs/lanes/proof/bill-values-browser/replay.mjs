import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const root=process.env.BILL_VALUES_PROOF_DIR??'/tmp/lane-2-bill-values-browser-replay'; mkdirSync(root,{recursive:true});
const places=[
 ['Brookside, Delaware','1009850','4d50e1f88df997f9','4d50e1f88df997f9'],
 ['Random Lake, Wisconsin','5566200','75ae3c9378284205:0','3e1c45254451bd62b3517712a0eca476d19117eb2fd7b76773fb3ffba8631191'],
 ['Bear River City, Utah','4903950','75ae3c9378284205:1','c44277a85264058fe9617425dafc7d269ad83eea0d0eed6b9eaeeac1fb25ea30'],
];
const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
const proof=[];
try { for(const [name,key,replay,seed] of places){
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Only generation inputs are supplied, through the existing new-life endpoint.
 await page.route('**/api/newlife?*',route=>{const u=new URL(route.request().url());u.searchParams.set('placeKey',key);u.searchParams.set('seed',seed);return route.continue({url:u.toString()});});
 await page.goto('http://localhost:3000/play');await page.locator('#new-life').click();await page.locator('#new-advanced').click();await page.locator('#seed').fill(seed);
 const built=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/newlife',{timeout:600000});await page.locator('#advanced-build').click();const newLife=await built;assert.equal(newLife.status(),200,await newLife.text());const life=await newLife.json();assert.equal(life.placeName,name);
 await page.locator('#front-pick:not([hidden])').waitFor();const names=await page.locator('#pick-list button').allInnerTexts();const at=names.findIndex(t=>/council|commissioner|alderm|trustee|supervisor|selectm/i.test(t));assert(at>=0,`${name}: no local legislator, no redraw`);
 const entered=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/play');await page.locator('#pick-list button').nth(at).click();const player=await(await entered).json();await page.locator('#card:not([hidden])').waitFor();
 const get=async path=>{const r=await page.request.get('http://localhost:3000'+path);assert.equal(r.status(),200,await r.text());return r.json();};
 const seat=await get('/api/seat?id='+encodeURIComponent(player.personId));assert(seat.bodies.length);const body=seat.bodies[0];const items=body.menus.flatMap(m=>m.items);const trials=[items.find(i=>i.series==='income-tax'&&i.allowed!==false&&i.today),items.find(i=>i.kind==='budget-line'&&i.allowed!==false&&i.today)].filter(Boolean);assert(trials.some(i=>i.line),`${name}: no budget card`);
 const result={name,key,replay,worldSeed:seed,player:player.personId,holder:names[at],officeId:body.officeId,checks:[]};
 for(const item of trials){
  await page.locator('#rings [data-tab="politics"]').first().evaluate(e=>e.click());await page.locator('#sheet-tabs').getByRole('button',{name:'Your office',exact:true}).click();await page.locator('.office-tabs [data-office="draft"]').click();
  const card=page.locator('.draft-card').first();await card.locator('select').selectOption(item.series?'series:'+item.series:'line:'+item.line);const today=(await card.locator('.draft-today').innerText()).trim();assert(today);
  await card.locator('input').fill('2');await page.screenshot({path:`${root}/${key}-${item.series??item.line}-draft.jpg`,type:'jpeg',quality:80});
  const oldBills=await page.locator('.office-bills').count()?await page.locator('.office-bills').first().elementHandle():null;const drafted=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/seat/act');await card.getByRole('button',{name:'Draft',exact:true}).click();const response=await drafted;assert.equal(response.status(),200,await response.text());const bill=await response.json();assert(bill.id);if(oldBills) await page.waitForFunction(node=>!node.isConnected,oldBills);
  const paper=await get('/api/bill?billId='+encodeURIComponent(bill.id));const estimate=paper.sections[0].estimate;assert.equal(estimate.beforeValue,item.today.value);if(item.series) assert.equal(estimate.lawId,item.today.recordId);
  // Open this newly drafted bill through its own paper button.
  const bills=page.locator('.office-bills');await bills.waitFor();const target=bills.locator('.plate').filter({has:page.locator('h3',{hasText:bill.number+' ·'})});
  for(let turn=0;!(await target.count());turn++){assert(turn<100,'new draft missing from bill pages');const next=bills.locator('.pager-arrow').last();assert(await next.isEnabled(),'new draft missing from final bill page');await next.click();}
  const opened=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/bill'&&new URL(r.url()).searchParams.get('billId')===bill.id);await target.getByRole('button',{name:/Read the bill/}).click();assert.equal((await opened).status(),200);await page.locator('.bill-compare').waitFor();const cells=await page.locator('.bill-compare-cell strong').allInnerTexts();writeFileSync(root+'/last-check.json',JSON.stringify({name,key,replay,billId:bill.id,item,paper,today,cells},null,2));assert.equal(cells[0].trim(),today);await page.screenshot({path:`${root}/${key}-${item.series??item.line}-paper.jpg`,type:'jpeg',quality:80});
  result.checks.push({billId:bill.id,subject:item.series??item.line,today,source:item.today,estimate,cells});await page.locator('#sheet-close').click();
 }
 assert.deepEqual(errors,[]);proof.push(result);writeFileSync(root+'/proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(result));await page.close();
}} finally {await browser.close();}
