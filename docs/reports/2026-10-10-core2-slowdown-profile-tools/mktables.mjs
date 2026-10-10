import { readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
const root = "/home/user/wt-after/";
const load = (v) => JSON.parse(readFileSync(`sum-${v}.json`, "utf8"));
const b = load("before"),
  a = load("after");
const cache = new Map();
function loc(key) {
  if (cache.has(key)) return cache.get(key);
  const m = key.match(/^(.*) ([^ ]+):(\d+)$/);
  let out = key;
  if (m) {
    const [, name, file] = m;
    if (file.startsWith("src/")) {
      let line = "";
      if (name !== "(anonymous)") {
        const esc = name.replace(/[#$]/g, "\\$&");
        try {
          line = execSync(
            `grep -nE "(function ${esc}\\b|^\\s+(async |static |get |set )?${esc}\\s*[<(]|(const|let) ${esc}\\b)" ${root}${file} | head -1 | cut -d: -f1`,
            { encoding: "utf8" },
          ).trim();
        } catch {}
      }
      out = `${name} \`${file}${line ? ":" + line : ""}\``;
    } else out = `${name} (${file.replace(/:\d+$/, "")})`;
  }
  cache.set(key, out);
  return out;
}
const s = (n) => (n / 1000).toFixed(1);
function table(title, listKey, allKey) {
  console.log(`\n**${title}**\n`);
  console.log(
    "| # | Function | BEFORE s | AFTER s | Added s |\n|---|---|---:|---:|---:|",
  );
  a[listKey].slice(0, 40).forEach((r, i) => {
    const bv = b[allKey][r.name] ?? 0;
    console.log(
      `| ${i + 1} | ${loc(r.name)} | ${s(bv)} | ${s(r.ms)} | ${(r.ms - bv >= 0 ? "+" : "") + s(r.ms - bv)} |`,
    );
  });
}
table(
  "Top 40 by self time in AFTER (BEFORE value alongside)",
  "self",
  "selfAll",
);
// functions in BEFORE top 40 self that are not in AFTER top 40
console.log(
  "\n**Top 40 by self time in BEFORE that fall out of AFTER's top 40**\n",
);
const aSet = new Set(a.self.map((r) => r.name));
console.log("| Function | BEFORE s | AFTER s |\n|---|---:|---:|");
b.self
  .filter((r) => !aSet.has(r.name))
  .forEach((r) =>
    console.log(
      `| ${loc(r.name)} | ${s(r.ms)} | ${s(a.selfAll[r.name] ?? 0)} |`,
    ),
  );
table(
  "Top 40 by total (inclusive) time in AFTER (BEFORE value alongside)",
  "total",
  "totalAll",
);
console.log(
  "\n**Top 40 by total time in BEFORE that fall out of AFTER's top 40**\n",
);
const aT = new Set(a.total.map((r) => r.name));
console.log("| Function | BEFORE s | AFTER s |\n|---|---:|---:|");
b.total
  .filter((r) => !aT.has(r.name))
  .forEach((r) =>
    console.log(
      `| ${loc(r.name)} | ${s(r.ms)} | ${s(a.totalAll[r.name] ?? 0)} |`,
    ),
  );
