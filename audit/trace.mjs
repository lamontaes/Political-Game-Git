import fs from 'fs'; import path from 'path'; import cp from 'child_process';
const ROOT='/Users/lamontae/political-game-play/scratchpad/wt-work';
const OUT='/Users/lamontae/political-game-play/cto-notes/tentacles';
const EXTS=['.ts','.tsx','.mts','.js','.mjs','.json','.cts','.cjs'];
const SKIP=new Set(['node_modules','.git','test-results','dist','art','public','data','docs','deployment','desktop','fixtures','examples','prose-review','zz-preview']);
const all=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  if(e.isDirectory()){ if(SKIP.has(e.name)&&d===ROOT)continue; if(e.name==='node_modules'||e.name==='.git')continue; walk(path.join(d,e.name));}
  else if(/\.(ts|tsx|mts|cts|js|mjs|cjs|json)$/.test(e.name)) all.push(path.relative(ROOT,path.join(d,e.name)));}})(ROOT);
// also data/docs-free: include data dir json? imports resolve by existence check instead
const exists=p=>{try{return fs.statSync(path.join(ROOT,p)).isFile()}catch{return false}};
const aliases=[];
for(const f of ['tsconfig.json','tsconfig.app.json','tsconfig.node.json']){try{
  const j=JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8').replace(/^\s*\/\/.*$/mg,''));
  const co=j.compilerOptions||{};for(const [k,v] of Object.entries(co.paths||{}))aliases.push([k.replace('*',''),v[0].replace('*',''),co.baseUrl||'.']);}catch{}}
const rx=[/\bimport\s+(?:[^'"()]*?\sfrom\s*)?['"]([^'"]+)['"]/g,/\bexport\s+(?:\*|\{[^}]*\}|\*\s+as\s+\w+)\s*from\s*['"]([^'"]+)['"]/g,/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,/new URL\(\s*['"](\.[^'"]+)['"]\s*,\s*import\.meta\.url/g];
let unresolved=[];const edges=new Map();const importers=new Map();
function resolve(from,spec){
  let base;
  if(spec.startsWith('.'))base=path.normalize(path.join(path.dirname(from),spec));
  else{const a=aliases.find(([k])=>k&&spec.startsWith(k));if(!a)return null;base=path.normalize(path.join(a[2],a[1],spec.slice(a[0].length)));}
  spec=spec.split('?')[0];base=base.split('?')[0];
  const cands=[base,...EXTS.map(e=>base+e),...EXTS.map(e=>path.join(base,'index'+e))];
  // .js -> .ts mapping
  if(/\.(m?js)$/.test(base)){const b=base.replace(/\.(m?js)$/,'');cands.push(b+'.ts',b+'.tsx',b+'.mts');}
  for(const c of cands)if(exists(c))return c;
  return undefined;}
for(const f of all){const t=fs.readFileSync(path.join(ROOT,f),'utf8');const set=new Set();
  if(f.endsWith('.json'))continue;
  for(const r of rx){r.lastIndex=0;let m;while((m=r.exec(t))){const s=m[1];const res=resolve(f,s);
    if(res===null)continue; if(res===undefined){ if(!/\.(css|svg|png|jpg|webp|woff2?|md|txt|csv|html|glsl|wav|mp3|ogg|ttf|gif)(\?|$)/.test(s)&&!s.includes('${'))unresolved.push([f,s]); continue;}
    set.add(res);}}
  edges.set(f,[...set]);for(const x of set){importers.set(x,(importers.get(x)||0)+1);}}
// entries
const roots={main:['src/main.tsx'],other:new Map()};
const add=(f,k)=>{if(!exists(f)||!all.includes(f))return;(roots.other.get(f)||roots.other.set(f,new Set()).get(f)).add(k)};
for(const f of all){
  if(/\.(test|spec)\.[cm]?[tj]sx?$/.test(f))add(f,'test');
  else if(f.startsWith('scripts/'))add(f,'scripts');
  else if(f.startsWith('tests/'))add(f,'tests-dir');
  else if(f.startsWith('tooling/'))add(f,'tooling');
  else if(!f.includes('/')&&/config|guard/.test(f))add(f,'config');
  else if(/^src\/(.*\/)?[^/]*main[^/]*\.tsx?$/.test(f)&&f!=='src/main.tsx')add(f,'other-main');
}
for(const f of fs.readdirSync(ROOT))if(f.endsWith('.html')){const t=fs.readFileSync(path.join(ROOT,f),'utf8');for(const m of t.matchAll(/<script[^>]*src="\/?([^"]+)"/g))if(m[1]!=='src/main.tsx')add(m[1],'html-entry:'+f);}
const pk=fs.readFileSync(path.join(ROOT,'package.json'),'utf8');
for(const m of pk.matchAll(/(?:["\s])((?:src|scripts|tooling|tests)\/[\w./-]+\.(?:tsx?|mjs|mts|js))/g))add(m[1],'package.json-script');
for(const f of all)if(f.endsWith('.json')&&!f.includes('/'))continue;
// json imports reached via edges only (json has no edges)
function bfs(starts){const d=new Map();let q=[];for(const s of starts)if(exists(s)){d.set(s,0);q.push(s);}
  while(q.length){const n=[];for(const x of q)for(const y of edges.get(x)||[])if(!d.has(y)){d.set(y,d.get(x)+1);n.push(y);}q=n;}return d;}
const mainD=bfs(roots.main);
const reached=new Map();// file -> Set kinds
const kinds={};for(const [f,ks] of roots.other)for(const k of ks)(kinds[k]??=[]).push(f);
for(const [k,fs_] of Object.entries(kinds)){for(const f of bfs(fs_).keys())(reached.get(f)||reached.set(f,new Set()).get(f)).add(k.split(':')[0]);}
const srcFiles=all.filter(f=>f.startsWith('src/')&&/\.(ts|tsx|mts|json)$/.test(f));
const lines=f=>fs.readFileSync(path.join(ROOT,f),'utf8').split('\n').length;
const files=srcFiles.map(f=>{const st=mainD.has(f)?'MAIN':reached.has(f)?'OTHER-ENTRY':'NOBODY';
  return {path:f,status:st,depth:mainD.has(f)?mainD.get(f):null,importers:importers.get(f)||0,reachedBy:[...(reached.get(f)||[])],lines:lines(f)};});
const c=s=>files.filter(x=>x.status===s).length;
const head=cp.execSync('git rev-parse HEAD',{cwd:ROOT}).toString().trim();
const counts={total:files.length,main:c('MAIN'),otherEntry:c('OTHER-ENTRY'),nobody:c('NOBODY')};
fs.writeFileSync(OUT+'/tentacles.json',JSON.stringify({generatedAt:new Date().toISOString(),head,entry:'src/main.tsx (index.html); review.html -> src/review.tsx; art-desk.html -> src/art-desk-entry.tsx treated as other-entry',counts,files},null,1));
// md
const g=(arr,fn)=>{const m={};for(const x of arr)(m[fn(x)]??=[]).push(x);return m};
let md=`# Tentacles (static reachability)\n\nHead ${head}\n\n- total ${counts.total}\n- MAIN ${counts.main}\n- OTHER-ENTRY ${counts.otherEntry}\n- NOBODY ${counts.nobody}\n\nCaveat: src/review.tsx and src/art-desk-entry.tsx (html entries) count as OTHER-ENTRY. Test files count as roots of kind "test".\n\n## NOBODY by folder\n`;
const nob=files.filter(x=>x.status==='NOBODY');
for(const [k,v] of Object.entries(g(nob,x=>x.path.split('/').slice(0,2).join('/'))).sort())md+=`\n### ${k} (${v.length})\n\n| file | lines |\n|---|---|\n`+v.map(x=>`| ${x.path} | ${x.lines} |`).join('\n')+'\n';
md+=`\n## OTHER-ENTRY by entry kind\n`;
const oth=files.filter(x=>x.status==='OTHER-ENTRY');
for(const [k,v] of Object.entries(g(oth,x=>x.reachedBy.slice().sort().join('+'))).sort())md+=`\n### ${k} (${v.length})\n\n`+v.map(x=>`- ${x.path}`).join('\n')+'\n';
md+=`\n## 40 largest MAIN files\n\n| file | lines | depth | importers |\n|---|---|---|---|\n`+files.filter(x=>x.status==='MAIN').sort((a,b)=>b.lines-a.lines).slice(0,40).map(x=>`| ${x.path} | ${x.lines} | ${x.depth} | ${x.importers} |`).join('\n')+'\n';
md+=`\n## src/simulation name watch list\n\n| file | status | reachedBy |\n|---|---|---|\n`+files.filter(x=>x.path.startsWith('src/simulation/')&&/content|copy|legacy|playtest|text|fallback|placeholder/.test(path.basename(x.path))).map(x=>`| ${x.path} | ${x.status} | ${x.reachedBy.join(',')} |`).join('\n')+'\n';
md+=`\n## Unresolved specifiers\n\nCount: ${unresolved.length} (relative/aliased specifiers that matched no file; asset imports and template strings excluded)\n\n`+unresolved.slice(0,200).map(([f,s])=>`- ${f}: ${s}`).join('\n')+'\n';
fs.writeFileSync(OUT+'/tentacles.md',md);
console.log(counts,unresolved.length,aliases.length);
console.log(nob.sort((a,b)=>b.lines-a.lines).slice(0,10).map(x=>x.lines+' '+x.path).join('\n'));
