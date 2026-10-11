/* global process, console */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { hostname, cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { Session } from 'node:inspector';
import { gzipSync } from 'node:zlib';
import { prepareWorld } from './guard/month.mjs';
import { lifePlaceStateIdentities, lifePlaceSearch } from '../../../src/simulation/life-places.ts';

const directory = new URL('.', import.meta.url);
const save = (name, value) => writeFileSync(new URL(name, directory), JSON.stringify(value, null, 2) + '\n');
const sha = value => createHash('sha256').update(value).digest('hex');
const seed = 'speed-plan-all56-2026-10-11-v1';
const draw = (label, length) => parseInt(sha(`${seed}:${label}`).slice(0, 8), 16) % length;
if (process.argv.includes('--draw')) {
  const pool = [...lifePlaceStateIdentities()].sort((a,b) => a.jurisdictionKey.localeCompare(b.jurisdictionKey));
  if (pool.length !== 56) throw new Error('Expected all 56 jurisdictions');
  const selected = [];
  for (let i = 0; i < 3; i++) {
    const state = pool.splice(draw(`jurisdiction:${i}`, pool.length), 1)[0];
    const localities = lifePlaceSearch('', 100000, {stateJurisdictionKey: state.jurisdictionKey, scope:'locality'}).sort((a,b) => a.key.localeCompare(b.key));
    if (!localities.length) throw new Error('Drawn jurisdiction has no locality; do not redraw');
    const place = localities[draw(`locality:${i}`, localities.length)];
    selected.push({index:i, state, place, seed:`${seed}:world:${i}`});
  }
  save('draw.json', {selectionSeed:seed, method:'SHA-256 first 32 bits modulo sorted pool length; jurisdictions without replacement, localities without filtering; generation only', poolSize:56, selected});
  console.log(JSON.stringify(selected));
} else {
  const selected = JSON.parse(readFileSync(new URL('draw.json', directory))).selected[Number(process.argv[2])];
  const startUtc = new Date().toISOString();
  const {input, phases, place} = await prepareWorld({seed:selected.seed, placeKey:selected.place.key});
  const {censusOpeningInput, openingInputBudget} = await import('../../../src/core2/tooling/opening-input-budget.ts');
  const {createLifeCore, advanceCore} = await import('../../../src/core2/life.ts');
  const {addDays, makeIsoDate} = await import('../../../src/simulation/dates.ts');
  const census = censusOpeningInput(input);
  const budget = openingInputBudget(census, JSON.parse(readFileSync('src/core2/tooling/opening-input-budgets.json','utf8')));
  const inputHash = sha(JSON.stringify(input));
  const revision = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const sourceTree = execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim();
  if (execFileSync('git',['diff','HEAD','--','src'],{encoding:'utf8'}).length) throw new Error('Modified measured source');
  const session = new Session(); session.connect();
  const post = (method, params={}) => new Promise((resolve,reject) => session.post(method,params,(error,result) => error ? reject(error) : resolve(result)));
  await post('Profiler.enable'); await post('Profiler.setSamplingInterval',{interval:10000}); await post('Profiler.start');
  const started = performance.now();
  const core = createLifeCore(input,{observer:false, scheduledWork:true});
  const initialized = performance.now();
  const months = [];
  let days=0, acts=0, decisions=0;
  for (const count of [31,28,31,30,31,30,31,31,30,31,30,31]) {
    const before = performance.now();
    const result = advanceCore(core, addDays(makeIsoDate(core.date),count));
    const milliseconds = performance.now()-before;
    days += result.simulatedDays; acts += result.acts; decisions += result.decisions;
    const row = {throughDate:core.date, ...result, milliseconds, rssMiB:process.memoryUsage().rss/1048576, heapMiB:process.memoryUsage().heapUsed/1048576};
    months.push(row);
    save(`${selected.index}-progress.json`,{selected,revision,inputHash,days,months});
    console.log(JSON.stringify(row));
  }
  const completed=performance.now();
  const {profile} = await post('Profiler.stop'); session.disconnect();
  if(days!==365 || core.date!==addDays(makeIsoDate(input.startedAt),365)) throw new Error('Incomplete year');
  const bytes = JSON.stringify(profile);
  writeFileSync(new URL(`${selected.index}.cpuprofile.gz`,directory),gzipSync(bytes));
  save(`${selected.index}-receipt.json`,{schema:'core2-profiled-year-v1',selected,place,revision,sourceTree,inputHash,startUtc,endUtc:new Date().toISOString(),phases,initializeMilliseconds:initialized-started,advanceMilliseconds:months.reduce((sum,row)=>sum+row.milliseconds,0),elapsedMilliseconds:completed-started,days,acts,decisions,months,peakRssMiB:process.resourceUsage().maxRSS/1024,opening:{bytes:census.bytes,residents:census.residents,sourceShare:census.declaredConservativeSourceByteShare,budget},settings:{observer:false,scheduledWork:true,samplingIntervalMicroseconds:10000},profileSha256:sha(bytes),host:{hostname:hostname(),node:process.version,cpu:cpus()[0]?.model,cpuCount:cpus().length}});
}
