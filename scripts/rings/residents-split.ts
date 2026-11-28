/**
 * The residents engine's split by concern (the Rings work; the CTO's 12:04
 * a.m. line on #10377, Nov 28): the counted population's reads and its
 * ring-free writers move, as written, out of modules/residents.ts,
 * residents-economy.ts, counted-money.ts and counted-income-fifth.ts into
 * leaves named for their concern, every one re-exported from its hub, and the
 * importers on the ring that took only those names import the leaves. One
 * writer of each record stays one writer: a moved writer is the same function
 * in another file.
 *
 *   node --import tsx scripts/rings/residents-split.ts [--check]
 *
 * Re-runnable: a step whose leaf already holds its names is skipped, so a
 * second run on an applied tree changes nothing. --check only reports which
 * steps are applied, and exits 1 when one is not. It runs on a head that has
 * residents-reads.ts and counted-money-reads.ts (Rings 1 and 13).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "../..");
const check = process.argv.includes("--check");
const run = (script: string, args: string[]) =>
  execFileSync(
    process.execPath,
    ["--import", "tsx", path.join(ROOT, "scripts/rings", script), ...args],
    { cwd: ROOT, encoding: "utf8" },
  );
const read = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
const has = (f: string) => existsSync(path.join(ROOT, f));
/** Whether a file declares a top-level name itself. */
function declares(file: string, name: string): boolean {
  if (!has(file)) return false;
  const sf = ts.createSourceFile(
    file,
    read(file),
    ts.ScriptTarget.ESNext,
    true,
  );
  return sf.statements.some(
    (st) =>
      ((ts.isFunctionDeclaration(st) ||
        ts.isInterfaceDeclaration(st) ||
        ts.isTypeAliasDeclaration(st)) &&
        st.name?.text === name) ||
      (ts.isVariableStatement(st) &&
        st.declarationList.declarations.some(
          (d) => ts.isIdentifier(d.name) && d.name.text === name,
        )),
  );
}

/** The in-ring importers no open PR edits, given as a file of paths (one per line). */
const switchFrom = process.env.RINGS_SWITCH_FROM;

const C = "src/core2/";
interface Move {
  hub: string;
  leaf: string;
  names: string[];
  doc?: string;
}
interface Redirect {
  hub: string;
  importers: string[];
  partial?: boolean;
}
type Step = { move: Move } | { redirect: Redirect };

const steps: Step[] = [
  // The money moves residents.ts needs, with their own imports taken from
  // the files that declare them (accounts.ts, laws-reads.ts).
  {
    redirect: {
      hub: C + "budgets-treasury.ts",
      importers: [C + "counted-money.ts"],
      partial: true,
    },
  },
  {
    redirect: {
      hub: C + "modules/budgets.ts",
      importers: [C + "counted-money.ts"],
      partial: true,
    },
  },
  {
    redirect: {
      hub: C + "modules/laws.ts",
      importers: [C + "counted-money.ts"],
      partial: true,
    },
  },
  {
    move: {
      hub: C + "counted-money.ts",
      leaf: C + "counted-money-moves.ts",
      names: [
        "moveShare",
        "fundGroups",
        "chargeGroups",
        "sweepResidual",
        "UNKEYED_STOPGAP",
        "countedDeposits",
        "countedHouseholdSavings",
        "countedHouseholdCash",
        "countedHousingInArrears",
        "countedHouseholdStands",
      ],
      doc: "The counted groups' money moves: a share moved between funds, a group's fund topped up, charged or swept, and a counted household's cash, savings and deposits as the funds hold them. They are counted-money.ts's own writers, moved here as written so a payer takes them without loading the counted money engine's ring; counted-money.ts re-exports each one and they stay its only writers of the funds. They import only the money reads, accounts.ts and the residents runtime, none of them in a ring.",
    },
  },
  {
    redirect: {
      hub: C + "counted-money.ts",
      importers: [C + "modules/residents.ts"],
      partial: true,
    },
  },
  {
    move: {
      hub: C + "counted-income-fifth.ts",
      leaf: C + "counted-income-reads.ts",
      names: [
        "COUNTED",
        "CENTS_PER_DOLLAR",
        "FIFTH_LIMITS",
        "incomeBandOf",
        "wageIndexReads",
        "wageIndexToday",
        "incomeBandOn",
      ],
      doc: "The counted households' income reads: the fifth of the income distribution a household's income falls in, and the wage index since the opening, cached once a day. They import only the counted parameter table and the tax index, both outside every ring; counted-income-fifth.ts re-exports each one.",
    },
  },
  {
    move: {
      hub: C + "modules/residents.ts",
      leaf: C + "resident-flows.ts",
      names: ["ownMap", "ownedMaps"],
      doc: "The counted population's purchase flows: adding, ending, reopening and resizing a resident flow and its parts, and the flow parts maps this engine may change in place. They are the residents engine's own writers of its flows, moved here as written; residents-economy.ts and modules/residents.ts re-export them.",
    },
  },
  {
    redirect: {
      hub: C + "modules/residents.ts",
      importers: [C + "residents-economy.ts"],
      partial: true,
    },
  },
  {
    move: {
      hub: C + "residents-economy.ts",
      leaf: C + "counted-job-heads.ts",
      names: [
        "countedJobsOf",
        "jobIndex",
        "jobIndexes",
        "businessScaleOf",
        "countedHeadcountOf",
        "countedJobHeads",
        "countedHeadsOf",
      ],
      doc: "The counted population's job heads: the counted jobs a firm or a household holds, by its job index, and the heads and staffed scale those jobs make. They import only the residents runtime and types, so a reader takes them without loading the residents economy's ring; residents-economy.ts re-exports each one.",
    },
  },
  {
    move: {
      hub: C + "residents-economy.ts",
      leaf: C + "resident-flows.ts",
      names: [
        "addFlowPart",
        "addResidentFlow",
        "endResidentFlow",
        "endFlowPart",
        "reopenResidentFlow",
        "setResidentFlowAmount",
        "Flow",
        "Runtime",
      ],
    },
  },
  {
    move: {
      hub: C + "modules/residents.ts",
      leaf: C + "residents-reads.ts",
      names: [
        "monthlyLivingCostMinor",
        "perYear",
        "FIXED_SPENDING",
        "countedParameter",
        "COUNTED",
        "unplacedPayPerWorker",
        "payLevel",
        "levelReads",
        "unplacedPayPerWorkerBase",
        "householdIncome",
        "assistanceYear",
        "coreOfRuntime",
        "groupKeyOf",
        "countedFundOf",
        "residentCounts",
        "townPlaceOf",
        "payerLivingCostMinor",
        "householdCashReader",
        "householdPart",
        "FlowState",
      ],
    },
  },
  {
    move: {
      hub: C + "modules/residents.ts",
      leaf: C + "resident-households.ts",
      names: [
        "departingCash",
        "regroupHousehold",
        "writeOffEmptyGroup",
        "schedule",
        "openingUnplaced",
      ],
      doc: "The counted households' writers: a household regrouped when its members change, an empty group written off, the cash a departing household takes, the flows scheduled for a date, and the opening's unplaced workers. They are the residents engine's own writers, moved here as written; modules/residents.ts re-exports each one. They import only the residents and money reads, the flows and the kernel, none of them in a ring.",
    },
  },
  {
    move: {
      hub: C + "modules/residents.ts",
      leaf: C + "resident-schooling.ts",
      names: ["countedSchoolFamilies", "setCountedTuition"],
      doc: "The counted families' school tuition: the households with children in a private school, and setting the tuition a household pays. They are the residents engine's own writers, moved here as written; modules/residents.ts re-exports both.",
    },
  },
];

/** The importers each hub hands over once the leaves exist (their names all resolve to a leaf or a family entry). */
const redirectsAfter: Redirect[] = [
  {
    hub: C + "modules/residents.ts",
    importers: [
      "budgets-service-charges.ts",
      "counted-reach.ts",
      "housing-foreclosure.ts",
      "law-reach/group-b-people.ts",
      "life-stakes.ts",
      "modules/constituent-cases.ts",
      "modules/drives.ts",
      "press-desk.ts",
      "press-money.ts",
      "school-outcomes.ts",
      "world-poverty.ts",
      "credit-deposits.ts",
      "housing-counted-buy.ts",
      "housing-occupancy.ts",
      "law-reach/group-a-records.ts",
      "law-reach/pay-reach.ts",
      "modules/business.ts",
      "modules/housing.ts",
      "private-tuition-reenroll.ts",
    ].map((f) => C + f),
  },
];

const LEAVES = [
  "counted-money-moves.ts",
  "counted-income-reads.ts",
  "resident-flows.ts",
  "counted-job-heads.ts",
  "resident-households.ts",
  "resident-schooling.ts",
].map((f) => C + f);

const RESIDENTS_READS_DOC =
  "The counted population's reads: the residents runtime a world keeps and the questions asked of it (a resident's facts, a counted household, its job, group, staff and children, the households by place, what suppliers are owed, a household's income and living cost, a group's fund, the unplaced workers' pay). They live here, away from the residents engine, and import only the kernel, the parameters, the counted groups and money reads and the residents table, none of them in a ring, so a reader takes them without loading the engine's ring. modules/residents.ts re-exports each one and stays the one writer of the runtime.";

const applied = (m: Move) => m.names.every((n) => declares(m.leaf, n));
const pending = steps.filter((s) => "move" in s && !applied(s.move));
if (check) {
  for (const s of steps)
    if ("move" in s)
      console.log(
        `${applied(s.move) ? "applied" : "pending"}: ${s.move.leaf} (${s.move.names.length} names from ${s.move.hub})`,
      );
  process.exit(pending.length ? 1 : 0);
}
if (!switchFrom)
  throw new Error(
    "set RINGS_SWITCH_FROM to the file of in-ring importers no open PR edits",
  );

const wrap = (text: string) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line + " " + w).length > 77) {
      lines.push(line);
      line = w;
    } else line = line ? line + " " + w : w;
  }
  if (line) lines.push(line);
  return "/**\n" + lines.map((l) => " * " + l).join("\n") + "\n */";
};

// Each new leaf is a people-family entry, named first so the redirects may reach it.
{
  const p = path.join(ROOT, "tests/guards/families.json");
  const map = JSON.parse(readFileSync(p, "utf8"));
  const people = map.families.find((f: { id: string }) => f.id === "people");
  for (const leaf of LEAVES) {
    if (!people.entry.includes(leaf)) people.entry.push(leaf);
    if (!people.paths.includes(leaf)) people.paths.push(leaf);
  }
  writeFileSync(p, JSON.stringify(map, null, 2) + "\n");
}

for (const s of steps) {
  if ("redirect" in s) {
    const r = s.redirect;
    console.log(
      run("redirect-importers.ts", [
        "--hub",
        r.hub,
        "--importers",
        r.importers.join(","),
        ...(r.partial ? ["--partial"] : []),
        "--entries-only",
        "--write",
      ]).trim(),
    );
    continue;
  }
  const m = s.move;
  if (applied(m)) {
    console.log(`skip (applied): ${m.leaf}`);
    continue;
  }
  const append = has(m.leaf);
  console.log(
    run("move-to-leaf.ts", [
      "--hub",
      m.hub,
      "--leaf",
      m.leaf,
      "--names",
      m.names.join(","),
      "--switch-from",
      switchFrom,
      ...(append ? ["--append"] : ["--doc", m.doc ?? m.leaf]),
      "--write",
    ])
      .split("\n")
      .filter((l) => /^(moved|switched|PROBLEMS| {2}moved)/.test(l))
      .join("\n"),
  );
  if (!append) {
    const text = read(m.leaf);
    const end = text.indexOf("\n */");
    writeFileSync(
      path.join(ROOT, m.leaf),
      wrap(m.doc ?? m.leaf) + text.slice(end + 4),
    );
  }
}
for (const r of redirectsAfter)
  console.log(
    run("redirect-importers.ts", [
      "--hub",
      r.hub,
      "--importers",
      r.importers.join(","),
      "--entries-only",
      "--write",
    ]).trim(),
  );

// The residents door's header says what it imports now.
{
  const f = C + "residents-reads.ts";
  const text = read(f);
  const end = text.indexOf("\n */");
  writeFileSync(
    path.join(ROOT, f),
    wrap(RESIDENTS_READS_DOC) + text.slice(end + 4),
  );
}

// A moved import the leaf does not use (the mover reads names by text) is
// dropped, as eslint reports it.
const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter((f) => f.endsWith(".ts"))
  .concat(LEAVES.filter(has));
const lint = JSON.parse(
  (() => {
    try {
      return execFileSync(
        "npx",
        ["eslint", "--format", "json", ...new Set(changed)],
        {
          cwd: ROOT,
          encoding: "utf8",
        },
      );
    } catch (e) {
      return (e as { stdout: string }).stdout;
    }
  })(),
) as {
  filePath: string;
  messages: { ruleId: string; message: string; line: number }[];
}[];
for (const r of lint)
  for (const msg of r.messages.filter(
    (m) =>
      m.ruleId === "@typescript-eslint/no-unused-vars" &&
      /is defined but never used/.test(m.message),
  )) {
    const name = msg.message.match(/'([^']+)'/)![1]!;
    const lines = readFileSync(r.filePath, "utf8").split("\n");
    const i = msg.line - 1;
    if (
      !/^\s*(import|\})|^\s+\w+,?$/.test(lines[i]!) &&
      !lines[i]!.includes("import")
    )
      continue;
    lines[i] = lines[i]!.replace(
      new RegExp(`,\\s*(type\\s+)?${name}\\b(?=[^,]*[,}])`),
      "",
    )
      .replace(new RegExp(`\\b(type\\s+)?${name},\\s*`), "")
      .replace(new RegExp(`^\\s*(type\\s+)?${name},?$`), "");
    writeFileSync(r.filePath, lines.join("\n"));
    console.log(
      `dropped an unused import of ${name} in ${path.relative(ROOT, r.filePath)}`,
    );
  }

execFileSync(
  "npx",
  ["prettier", "--write", ...new Set(changed), "tests/guards/families.json"],
  { cwd: ROOT },
);
execFileSync(
  process.execPath,
  ["--import", "tsx", "scripts/guards/codeowners.ts"],
  { cwd: ROOT },
);
console.log("done; run --check, npm run guards and the import-cycles test");
