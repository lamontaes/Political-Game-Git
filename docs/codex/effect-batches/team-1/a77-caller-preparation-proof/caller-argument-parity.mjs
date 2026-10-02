import ts from '/workspace/Political-Game-Git/node_modules/typescript/lib/typescript.js';
import fs from 'node:fs';
const path='src/simulation/living-world/local-council-meetings.ts';
const baseline=fs.readFileSync('/tmp/team1-a77-caller-before.ts','utf8');
const prepared=fs.readFileSync(path,'utf8');
function nodes(source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true);let call,input;function walk(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='decideCouncilVote')call=n;if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.name.text==='voteInput')input=n.initializer;ts.forEachChild(n,walk);}walk(file);return{file,call,input};}
const before=nodes(baseline),after=nodes(prepared),printer=ts.createPrinter();
const print=(n,f)=>printer.printNode(ts.EmitHint.Unspecified,n,f);
const result={unchangedWorldArgument:print(before.call.arguments[0],before.file)===print(after.call.arguments[0],after.file),unchangedAuthorityAndDecisionInputs:print(before.call.arguments[1],before.file)===print(after.input,after.file),existingInputVariablePassed:ts.isIdentifier(after.call.arguments[1])&&after.call.arguments[1].text==='voteInput',existingDecider:'decideCouncilVote',newContract:false};
console.log(JSON.stringify(result,null,2));if(!result.unchangedWorldArgument||!result.unchangedAuthorityAndDecisionInputs||!result.existingInputVariablePassed)process.exitCode=1;
