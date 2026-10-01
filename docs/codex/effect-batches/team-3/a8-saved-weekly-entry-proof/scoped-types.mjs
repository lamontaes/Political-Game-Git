import ts from '/workspace/Political-Game-Git/node_modules/typescript/lib/typescript.js';
process.chdir('/workspace/Political-Game-Git');
const parsed=ts.parseJsonConfigFileContent(ts.readConfigFile('tsconfig.app.json',ts.sys.readFile).config,ts.sys,'.');
const roots=['src/simulation/law-consequences/pay-city.test.ts','src/simulation/job-market.ts'];
const p=ts.createProgram(roots,{...parsed.options,types:["node","vite/client"],composite:false,incremental:false,noEmit:true});
const ds=ts.getPreEmitDiagnostics(p);
console.log(ts.formatDiagnosticsWithColorAndContext(ds,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));
console.log(`${roots.length} scoped roots; ${ds.length} diagnostics`);
process.exitCode=ds.length?1:0;
