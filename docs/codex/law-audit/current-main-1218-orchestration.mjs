import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, createWriteStream } from 'node:fs';
const source = '7f2603b5a67f4baea06e8678601173777b4879e6';
const root = 'test-results/law-audit/current-main-1218';
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const dirty = () => execFileSync('git', ['status','--porcelain'], {encoding:'utf8'}).trim();
if (head() !== source || dirty()) throw Error('Source pin or clean state mismatch');
mkdirSync(root, {recursive:true});
writeFileSync(root+'/.pin', 'Owner-authorized current-main two-state rerun; preserve receipts.\n');
const manifest = {
  startedAt: new Date().toISOString(), source,
  productionMain:'d6fb351926da2149ad0183e21463efad18b61df7',
  runnerOrigin:'d10af9af0e61d6db201d994d53f5a50135e3b22c',
  modifications:'Six byte-identical audit files only; production tree hash verified against main plus these blobs.',
  months:24,
  mergedWriters:[{pr:1244,merge:'35ab2458dc1afa171f12dde161ae8984c010cd15',kind:'Medicaid coverage'}, {pr:1256,merge:'6f3c2cdcabb2c03518f4d9787f835ddb0a50d385',kind:'Federal withholding'}, {pr:1261,merge:'ea5f51aefe4aad8fed1e2b587867c804ef01f5b2',kind:'Federal privacy costs'}],
  worlds:[{state:'GA',place:'1382916',name:'Wildwood, Georgia',unincorporated:true,seed:'team2-national-20260930-1131-1',output:root+'/world-ga',status:'NOT RUN'}, {state:'NJ',place:'3439360',name:'Laurence Harbor, New Jersey',unincorporated:true,seed:'team2-national-20260930-1131-2',output:root+'/world-nj',status:'NOT RUN'}],
  limits:['Only enacted-law consequences after opening are attributed by this unchanged reader; starting-law stamps fall outside these rows.', 'Producer stamps alone do not prove physical effects.', 'Missing trace is not absent effect.', 'Old 7c24983 receipts remain historical and separately preserved.']
};
const persist = () => writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
persist();
console.log(JSON.stringify(manifest));
await Promise.all(manifest.worlds.map(async world => {
  const args=['--max-old-space-size=8192','--import','tsx','scripts/law-audit/run.ts','--seed',world.seed,'--place',world.place,'--months','24','--out',world.output];
  world.command=[process.execPath,...args];world.status='RUNNING';persist();
  const log=createWriteStream(world.output+'.log');
  const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});
  world.pid=child.pid;persist();
  child.stdout.pipe(log);child.stderr.pipe(log,{end:false});
  world.exitCode=await new Promise(resolve=>{child.once('error',err=>{log.write(String(err));resolve(1)});child.once('close',code=>resolve(code??1))});
  log.end();
  let receipt;try{receipt=JSON.parse(readFileSync(world.output+'.json','utf8'))}catch{}
  world.status=world.exitCode===0 && receipt?.completedMonths===24 && !receipt.problem ? 'COMPLETED':'NORESULT';
  world.finishedAt=new Date().toISOString();persist();console.log(JSON.stringify(world));
}));
manifest.finishedAt=new Date().toISOString();persist();
if(manifest.worlds.some(x=>x.status!=='COMPLETED'))process.exitCode=1;
