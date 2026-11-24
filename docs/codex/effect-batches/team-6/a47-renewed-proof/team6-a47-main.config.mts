import base from "/workspace/Political-Game-Git/vite.config.ts";
import { execFileSync } from "node:child_process";
const root="/workspace/Political-Game-Git/";
const files=new Set(["src/simulation/public-budgets/index.ts","src/simulation/public-budgets/store.ts","src/simulation/public-budgets/federal-treasury.ts","src/simulation/public-budgets/federal-account.test.ts","src/simulation/public-budgets/federal-law-cost-stamps.test.ts"]);
export default {...base, plugins:[{name:"team6-exact-main-a47",enforce:"pre",load(id){const rel=id.split("?")[0].slice(root.length);if(id.startsWith(root)&&files.has(rel)) return execFileSync("git",["show","2e78c9c155e6dcfbf400f21cad56266c2dcfc97b:"+rel],{cwd:root,encoding:"utf8"});}},...base.plugins]};
