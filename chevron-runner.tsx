import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ShellNav} from '../../../src/player/ShellNav';
import {INITIAL_SHELL_STATE,shellReducer} from '../../../src/presentation/shell-navigation';
(globalThis as any).React=React;
const root=process.cwd(), out=resolve(root,'test-results/session2/chevrons');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
let styles=['player.css','kit12.css','controls/controls.css','shell.css'].map(p=>readFileSync(resolve(root,'src/player',p),'utf8')).join('\n');
const destinations=[{surface:'calendar',group:'calendar',label:'Calendar',hint:'Time',testid:'proof-calendar',open:true},{surface:'people',group:'people',label:'People',hint:'People',testid:'proof-people',open:false},{surface:'finances',group:'personal',label:'Money',hint:'Money',testid:'proof-money',open:false},{surface:'jobs',group:'personal',label:'Work',hint:'Work',testid:'proof-work',open:false}] as const;
function html(state:any){return '<html><head><style>'+styles+'</style></head><body class="pg-game">'+renderToStaticMarkup(<ShellNav state={state} dispatch={()=>{}} playerName="Controlled shell fixture" dateLabel="Tuesday, January 20, 2026" placeName={null} destinations={destinations} canSave unsaved={false} onSave={()=>{}} onLeave={()=>{}} onPassDays={()=>{}} />)+'</body></html>'}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/'){await route.fulfill({body:'<html></html>',contentType:'text/html'});return;}try{const p=resolve(root,'public',u.pathname.slice(1)); await route.fulfill({body:readFileSync(p),contentType:p.endsWith('.svg')?'image/svg+xml':p.endsWith('.ttf')?'font/ttf':'image/png'});}catch{await route.abort();}});
const rows:any[]=[];
async function inspect(label:string,sel:string){const v=await page.locator(sel).evaluate(e=>({background:getComputedStyle(e).backgroundImage,display:getComputedStyle(e).display,active:e.matches(':active')}));rows.push({label,...v});return v;}
function assert(v:boolean,msg:string){if(!v)throw Error(msg)}
async function load(state:any){await page.goto('http://proof.test/');await page.setContent(html(state));await page.evaluate(()=>document.fonts.ready);}
const checkedStyles=styles;
const baseline=execFileSync('git',['rev-parse','1ee0abcdabd4dadba0bc0a0737789f7c31decfa4'],{encoding:'utf8'}).trim();
styles=['player.css','kit12.css','controls/controls.css'].map(p=>readFileSync(resolve(root,'src/player',p),'utf8')).join('\n')+execFileSync('git',['show',baseline+':src/player/shell.css'],{encoding:'utf8'});
await load({...INITIAL_SHELL_STATE,confirmingLeave:true});
assert((await inspect('baseline-static-rest','[data-testid="leave-save-first"]')).background.includes('primary-corner'),'baseline failed to reproduce');
await page.screenshot({path:out+'/static-before.png'});
styles=checkedStyles;
await load({...INITIAL_SHELL_STATE,confirmingLeave:true});
const primary=page.getByTestId('leave-save-first'), selector='[data-testid="leave-save-first"]';
assert(!(await inspect('static-rest',selector)).background.includes('primary-corner'),'rest mark');await primary.hover();assert(!(await inspect('static-hover',selector)).background.includes('primary-corner'),'hover mark');
await page.mouse.down();assert((await inspect('static-pointer-held',selector)).background.includes('primary-corner'),'missing pointer mark');await page.screenshot({path:out+'/static-held.png'});await page.mouse.up();assert(!(await inspect('static-released',selector)).background.includes('primary-corner'),'released mark');
await primary.focus();await page.keyboard.down('Space');assert((await inspect('static-key-held',selector)).background.includes('primary-corner'),'missing key mark');await page.keyboard.up('Space');assert(!(await inspect('static-key-released',selector)).background.includes('primary-corner'),'key release mark');await page.screenshot({path:out+'/static-rest.png'});
await load(INITIAL_SHELL_STATE);const day='[data-testid="shell-pass-day"] > span';assert((await inspect('day-rest',day)).display==='none','day rest');await page.getByTestId('shell-pass-day').hover();assert((await inspect('day-hover',day)).display==='none','day hover');await page.mouse.down();assert((await inspect('day-held',day)).display!=='none','day held');await page.mouse.up();assert((await inspect('day-released',day)).display==='none','day release');
await load(shellReducer(INITIAL_SHELL_STATE,{type:'open-nav-primary'}));
for(const state of ['rest','hover','held','released']){const b=page.getByTestId('nav-group-personal');if(state==='hover')await b.hover();if(state==='held')await page.mouse.down();if(state==='released')await page.mouse.up();assert((await inspect('radial-'+state,'.pg-nav-more')).display==='none','radial chevron '+state);for(const btn of await page.locator('.pg-nav-flyout [role="menuitem"]').all()){assert(!(await btn.evaluate(e=>getComputedStyle(e).backgroundImage)).includes('primary-corner'),'radial corner '+state)}}
await page.screenshot({path:out+'/radial-open.png'});
await load(shellReducer(INITIAL_SHELL_STATE,{type:'open-nav-submenu',submenu:'personal'}));
assert(await page.locator('.pg-nav-more').count()===0,'submenu glyph');
const submenu=page.getByTestId('proof-money');await submenu.hover();await page.mouse.down();assert(!(await inspect('submenu-held','[data-testid="proof-money"]')).background.includes('primary-corner'),'submenu mark');await page.mouse.up();await page.screenshot({path:out+'/radial-submenu.png'});
writeFileSync(out+'/proof.json',JSON.stringify({head,baseline,sourceClean:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()==='',stylesheetSha256:createHash('sha256').update(checkedStyles).digest('hex'),browserVersion:browser.version(),kind:'controlled actual ShellNav markup and repository CSS; no generated world or intro proof',viewport:{width:1920,height:1080,dpr:1},rows,passed:true},null,2));await browser.close();
