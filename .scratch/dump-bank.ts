import * as S from "../src/simulation";
const items: any[] = (S as any).SETUP_QUESTIONNAIRE_BANK;
console.log("total items:", items.length);
const byReg: Record<string, number> = {};
for (const it of items) byReg[it.register] = (byReg[it.register] ?? 0) + 1;
console.log("registers:", JSON.stringify(byReg));
for (const it of items) {
  console.log(`\n### ${it.key} [${it.register}] w=${it.observationWeight} fixed=${it.fixedOrdinal} src=${it.source?.reference ?? ""}`);
  console.log("P: " + it.prompt);
  for (const o of it.options) console.log(`   - (${o.key}) ${o.text}`);
}
