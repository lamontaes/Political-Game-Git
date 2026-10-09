// Read-only inventory of old-core engines for the core2 porting plan (P11).
// Usage: node scripts/core2-port-inventory/inventory.mjs . <outDir>  (needs the typescript devDependency)
// Classifies every top-level declaration in src/ (tests excluded) as
// RULE, DATA, PLUMBING or DEAD, plus TYPE for interfaces/type aliases.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(process.argv[2] ?? ".");
const outDir = path.resolve(process.argv[3] ?? "out");
fs.mkdirSync(outDir, { recursive: true });
const SRC = path.join(root, "src");

const isTest = (f) =>
  /\.(test|spec)\.tsx?$/.test(f) ||
  /\.fixture\.ts$/.test(f) ||
  /\/__tests__\//.test(f);
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const all = walk(SRC);
const files = all.filter((f) => !isTest(f));
const rel = (f) => path.relative(root, f);

// ---------- parse ----------
const parsed = new Map();
for (const f of all) {
  const text = fs.readFileSync(f, "utf8");
  parsed.set(
    f,
    ts.createSourceFile(
      f,
      text,
      ts.ScriptTarget.Latest,
      true,
      f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  );
}

// ---------- import graph ----------
function resolveSpec(from, spec) {
  if (!spec.startsWith(".")) return undefined;
  const base = path.resolve(path.dirname(from), spec);
  const cands = [
    base,
    base.replace(/\.js$/, ".ts"),
    base.replace(/\.js$/, ".tsx"),
    base + ".ts",
    base + ".tsx",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const c of cands) if (parsed.has(c)) return c;
  return undefined;
}
const imports = new Map();
for (const [f, sf] of parsed) {
  const deps = new Set();
  const visit = (n) => {
    if (
      (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
      n.moduleSpecifier &&
      ts.isStringLiteral(n.moduleSpecifier)
    ) {
      const r = resolveSpec(f, n.moduleSpecifier.text);
      if (r) deps.add(r);
    } else if (
      ts.isCallExpression(n) &&
      n.expression.kind === ts.SyntaxKind.ImportKeyword &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      const r = resolveSpec(f, n.arguments[0].text);
      if (r) deps.add(r);
    } else if (
      ts.isNewExpression(n) &&
      n.expression.getText() === "URL" &&
      n.arguments?.[0] &&
      ts.isStringLiteral(n.arguments[0])
    ) {
      const r = resolveSpec(f, n.arguments[0].text);
      if (r) deps.add(r);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  imports.set(f, deps);
}
const entries = ["main.tsx", "review.tsx", "art-desk-entry.tsx"]
  .map((e) => path.join(SRC, e))
  .filter((e) => parsed.has(e));
const reachable = new Set();
const stack = [...entries];
while (stack.length) {
  const f = stack.pop();
  if (reachable.has(f) || isTest(f)) continue;
  reachable.add(f);
  for (const d of imports.get(f) ?? []) stack.push(d);
}
// Reachable from tests only (wired nowhere in the game).
const importedByTests = new Set();
for (const [f, deps] of imports)
  if (isTest(f)) for (const d of deps) importedByTests.add(d);

// ---------- identifier reference index (reachable non-test files) ----------
const idCount = new Map(); // name -> Map(file -> count)
for (const f of reachable) {
  const sf = parsed.get(f);
  const visit = (n) => {
    if (ts.isIdentifier(n)) {
      let m = idCount.get(n.text);
      if (!m) idCount.set(n.text, (m = new Map()));
      m.set(f, (m.get(f) ?? 0) + 1);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// ---------- engine groups ----------
const T = (alts) => new RegExp("^src/simulation/(?:[a-z-]+/)?(?:" + alts + ")");
const GROUPS = [
  [
    "english",
    /^src\/presentation\/([^/]*english[^/]*|[^/]*dialogue-motifs|speech-registers|story-voice|reply-meaning|conversation-register|[^/]*grammar[^/]*)\.ts$/,
  ],
  [
    "story",
    /^src\/presentation\/(journal|childhood|contextual-scenes|life-narration|life-talk|life-conversation|conversation-|scene-conversation|person-conversation|player-conversation|world39-journal)/,
  ],
  [
    "screens",
    /^src\/(presentation|player|ui|maps|devtools|App\.tsx|main\.tsx|review\.tsx|art-desk-entry\.tsx|authoring|r1-review|connectivity|persistence|release|cli)\b/,
  ],
  [
    "story",
    T(
      "story/|narrative-threads|life-callbacks|character-history|contextual-character-history|childhood-record|episode-bank|life-episodes|story-people|situation-|claim-contradiction|life-choice-evidence|scene-bindings|initiator-occasions",
    ),
  ],
  [
    "press",
    T(
      "press/|press-|neighbor-news|public-information|speech-retelling|national-mood|news-habits|media-",
    ),
  ],
  ["courts", /^src\/simulation\/(justice\/|judiciary\/|crime\/)/],
  [
    "courts",
    T(
      "judicial-|incident|court-size-law|chief-justice|supreme-court|associate-justice|finding-restitution|voting-standing|citizenship",
    ),
  ],
  ["campaigns", /^src\/simulation\/pressure\//],
  [
    "campaigns",
    T(
      "campaign|door-conversations|speech-|filing-visit|after-office-endorsements|movements|movement-succession|protests|civic-actions|law-interest-groups|group-founder",
    ),
  ],
  [
    "economy",
    /^src\/(fiscal-authority\/|simulation\/(macro-economy\/|public-budgets\/|careers\/))/,
  ],
  [
    "economy",
    T(
      "town-(business|finance|bank|deposits|employment|pay|rent|homes|labor|job|economy)|housing-market|housing-price|opening-mortgage|job-market|local-economy|economy|household-(loans|pay|mix)|mortgage|home-|cost-of-living|living-costs|resource|starting-money|pay-coverage|opening-employer|local-business|aggregate-customers|production-catalog|student-debt|public-fiscal|government-fiscal|county-budget|local-fiscal|moguls|mogul-|time-work|recorded-work|completed-hourly|career|recorded-employer|person-money|quantity|money-text|currency|county-home|work-absence|work-schedules|budget-stakes|outside-mandate-payment|wage",
    ),
  ],
  ["elections", /^src\/(districts\/|simulation\/nominations\/)/],
  [
    "elections",
    T(
      "[a-z-]*election|[a-z-]*ballot|candidacy|candidate|[a-z-]*-candidacy-packs|filing-|precinct|statewide-electorate|apportion|recall|measure-numbering|measure-title|petition|district-residence|[a-z-]*qualification|settled-qualifications|age-of-majority|municipal-seat-identity|[a-z-]*turnover|[a-z-]*succession|[a-z-]*term-limits|prior-terms|residence-duration|statehood-seats|congress-seats|congress-candidates|house-delegates|local-government-seats|council-seat-office|senate-selection|senate-vacancy|declared-seat|politics\\.ts|national-places|national-counties|town-wards|party-|congress-contest|chief-executive-election|state-legislature-candidates|state-legislature-queue|state-legislature-opening|town-election|county-election|state-legislative-election",
    ),
  ],
  ["laws", /^src\/simulation\/(law-consequences\/|outcome-web\/)/],
  [
    "laws",
    T(
      "law-|enacted-|policy|tax-|statutory-tax|[a-z-]*-law\\.ts|minimum-wage|paid-leave|public-benefit|rule-capability|rules-capability|permit|effect-records|earned-law|housing-voucher|teacher-salary|fairness-pay|federal-(outlay|farm|cost|defense|passenger|top|data|state-program)|crisis-standing|income-tax|payroll-tax|paycheck-tax|sales-tax|property-tax|business-tax|state-income|state-tax|local-tax|consumer-loan|student-aid|transit-contract|public-program|provision|issue-record|claim-stances|political-opinion|research-rule|data-tables|legislation-(levers|tax|program|fiscal|transit|administration|service|resilience|infrastructure|local-fiscal|federal-rail|family|operative)|final-law-term|statute-effective|ordinance-effective|legislative-effective|program-families|starting-law|tuition-freeze|road-usage|cannabis-|mileage-law|medicare-drug|municipal-rule-registry|institution-authority|federal-budget|federal-treasury",
    ),
  ],
  [
    "legislatures",
    T(
      "legislat|congress|[a-z-]*council|chamber|committee|member-|majority-agenda|minority-party|roll-call|vote-|veto|quorum|procedural|leaders-adjourn|session-adjourn|presiding-officers|joint-assembly|measure-cosponsors|amendment-authors|npc-amendments|body-partisanship|standing-|favor|bill-numbering|municipal-ordinance|local-ordinance|constitutional-|article-v|statehood-admission|rider-rule-trail|relationship-leverage|undertakings|federal-reform|political-reflection|official-views|official-view-|heard-official|cloture|governing-calendar|governing-season|legislative-clock|legislative-sittings|state-legislature|typical-council|local-governing-body|county-governing-body|township-governing-body|dc-council|district-of-columbia-council|town-council|municipal-council|municipal-procedure|item-veto|executive-bill|governor-bill|council-lawmaking|congress-lawmaking|automatic-legislation|county-budget-hearings",
    ),
  ],
  ["legislatures", /^src\/simulation\/patronage\//],
  [
    "governing",
    /^src\/(environment\/|simulation\/(governing\/|regional-issues\/))/,
  ],
  [
    "substrate",
    T(
      "crisis/(health|mortal|death|fatal-illness|condition|snap-participation|strain)",
    ),
  ],
  ["governing", /^src\/simulation\/(crisis\/|nationwide-world\/)/],
  [
    "governing",
    T(
      "executive|civil-personnel|municipal-public-work|municipal-government|office|oath-of-office|record-in-office|public-service|service-delivery|constituent|county-serv|transit-|government-|public-government|crisis|local-institutions|federal-tenures|civic-office|monthly-service|public-appropriation|scheduled-activity|playable-work|state-transit|state-funded|late-term|routine-hook|seats-of-government|local-government-roles|developments|chief-executive|state-executive|county-row-offices|local-governments|local-chief-executive|governor|territory-governor",
    ),
  ],
];
function groupOf(r) {
  for (const [g, re] of GROUPS) if (re.test(r)) return g;
  if (r.startsWith("src/simulation/") || r.startsWith("src/education/"))
    return "substrate";
  if (
    r.startsWith("src/source/") ||
    r.startsWith("src/research/") ||
    r.startsWith("src/content/")
  )
    return "source-data";
  return "other";
}

// ---------- classification ----------
const PLUMB_FILE =
  /(integrity|serialization|serial|queries|query|-index|history|records?\.ts|canonical-json|sha256|json-chunks|store|ids\.ts|rng\.ts|migrat|repair|legacy|lineage|evidence|seam|stamp|portability|world-integrity|runtime-content-packs|installed|compiled)/;
const PLUMB_NAME =
  /^(assert|validate|check|verify|ensure|require|serialize|deserialize|migrate|repair|normalize|hash|stable|canonical|append|put|upsert|with[A-Z]|replace[A-Z]|index|build[A-Z]\w*Index|schedule|wake|tick|advance|commit|store|load|save|clone|copy|freeze|lookup|latest|current|active|find|list|select|query|read|get|by[A-Z]|has[A-Z]|is[A-Z]\w*(Recorded|Present|Known))|Integrity|Invariant|Index$|Store$|Lookup$/;
const DECIDE =
  /^(evaluateDecision|chooseAct|decide\w*|score\w*|weigh\w*|utility\w*|pull\w*|appraise\w*|estimate\w*|compute\w*|calculate\w*|rate\w*|project\w*|allocate\w*|apportion\w*|tally\w*|count[A-Z]\w*Votes)$/;
const WORLD_TYPES =
  /^(World|HistoryStore|\w+Store|WorldState|SimulationWorld)$/;
const SCAN_METHODS = new Set([
  "filter",
  "find",
  "some",
  "every",
  "findLast",
  "findIndex",
  "flatMap",
  "reduce",
  "forEach",
  "map",
  "includes",
]);
const LITERAL_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.TypeReference,
  ts.SyntaxKind.Identifier,
]);
const ARITH = new Set([
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
]);
const COMPARE = new Set([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
]);
const WORLDISH =
  /^(world|w|next|nextWorld|state|history|store|prior|before|after|base|updated|current)\b/;

function signals(node) {
  const s = {
    spreads: 0,
    worldSpreads: 0,
    scans: 0,
    appends: 0,
    throws: 0,
    arith: 0,
    math: 0,
    compare: 0,
    decide: 0,
    worldTyped: false,
    nodes: 0,
    literalNodes: 0,
    fnNodes: 0,
    numericLiterals: 0,
  };
  const visit = (n) => {
    s.nodes++;
    if (LITERAL_KINDS.has(n.kind)) s.literalNodes++;
    if (n.kind === ts.SyntaxKind.NumericLiteral) s.numericLiterals++;
    if (ts.isFunctionLike(n) && n !== node) s.fnNodes++;
    if (ts.isTypeReferenceNode(n) && WORLD_TYPES.test(n.typeName.getText()))
      s.worldTyped = true;
    if (ts.isSpreadAssignment(n) || ts.isSpreadElement(n)) {
      s.spreads++;
      if (WORLDISH.test(n.expression.getText())) s.worldSpreads++;
    }
    if (ts.isThrowStatement(n)) s.throws++;
    if (ts.isBinaryExpression(n)) {
      if (ARITH.has(n.operatorToken.kind)) s.arith++;
      if (COMPARE.has(n.operatorToken.kind)) s.compare++;
    }
    if (ts.isCallExpression(n)) {
      const e = n.expression;
      if (ts.isPropertyAccessExpression(e)) {
        if (e.expression.getText() === "Math") s.math++;
        if (SCAN_METHODS.has(e.name.text)) {
          const recv = e.expression.getText();
          if (
            /(^|\.)(world|history|state|store)\b|history\.|Order\b|[Rr]ecords\b|Records\(|Object\.values\((world|history)/.test(
              recv,
            )
          )
            s.scans++;
        }
      }
      const callee = ts.isIdentifier(e)
        ? e.text
        : ts.isPropertyAccessExpression(e)
          ? e.name.text
          : "";
      if (
        /^(append[A-Z]|put[A-Z]|upsert|withHistory|record[A-Z]\w*Record|appendAction)/.test(
          callee,
        )
      )
        s.appends++;
      if (DECIDE.test(callee)) s.decide++;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return s;
}

function unitsOf(sf) {
  const units = [];
  for (const st of sf.statements) {
    const exported = !!st.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    const lines = (n) =>
      sf.getLineAndCharacterOfPosition(n.getEnd()).line -
      sf.getLineAndCharacterOfPosition(n.getStart()).line +
      1;
    const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
    if (ts.isFunctionDeclaration(st) && st.name)
      units.push({
        name: st.name.text,
        kind: "function",
        exported,
        node: st,
        lines: lines(st),
        line: line(st),
      });
    else if (ts.isClassDeclaration(st) && st.name)
      units.push({
        name: st.name.text,
        kind: "class",
        exported,
        node: st,
        lines: lines(st),
        line: line(st),
      });
    else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        const init = d.initializer;
        const fnLike =
          init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
        units.push({
          name: d.name.text,
          kind: fnLike ? "function" : "value",
          exported,
          node: d,
          lines: lines(st.declarationList.declarations.length === 1 ? st : d),
          line: line(d),
        });
      }
    } else if (
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) ||
      ts.isEnumDeclaration(st)
    ) {
      units.push({
        name: st.name.text,
        kind: "type",
        exported,
        node: st,
        lines: lines(st),
        line: line(st),
      });
    }
  }
  return units;
}

function classify(file, r, u) {
  if (u.kind === "type") return { cls: "TYPE", why: "type" };
  const s = signals(u.node);
  u.signals = s;
  const reachableFile = reachable.has(file);
  if (!reachableFile)
    return {
      cls: "DEAD",
      why: importedByTests.has(file) ? "file-test-only" : "file-unreachable",
    };
  const refs = idCount.get(u.name);
  const inOwn = (refs?.get(file) ?? 0) - 1;
  let elsewhere = 0;
  if (refs) for (const [f, c] of refs) if (f !== file) elsewhere += c;
  if (inOwn <= 0 && elsewhere === 0)
    return { cls: "DEAD", why: "unreferenced" };
  const base = path.basename(file);
  const literalRatio = s.literalNodes / Math.max(1, s.nodes);
  const dataFile =
    /(\.generated\.|-data\.ts|-bank\.ts|catalog|names-data|-copy\.ts|\.d\.json\.ts|-anchors|-sources?\.|bank\.ts|-content\.ts|packs?\.ts|profile-inputs|-rows\.ts|rule-packs|-styles)/.test(
      base,
    );
  if (
    u.kind === "value" &&
    s.fnNodes === 0 &&
    (literalRatio >= 0.6 || (dataFile && literalRatio >= 0.4)) &&
    u.lines >= 3
  )
    return { cls: "DATA", why: `literal ${literalRatio.toFixed(2)}` };
  if (
    u.kind === "function" &&
    s.fnNodes <= 1 &&
    literalRatio >= 0.78 &&
    u.lines >= 15
  )
    return { cls: "DATA", why: `literal-builder ${literalRatio.toFixed(2)}` };
  if (dataFile && u.kind === "value" && s.fnNodes <= 2 && literalRatio >= 0.5)
    return { cls: "DATA", why: "data-file" };
  const P =
    1.5 * s.worldSpreads +
    0.5 * (s.spreads - s.worldSpreads) +
    2 * s.scans +
    2 * s.appends +
    (s.worldTyped ? 1 : 0.5) * s.throws +
    (PLUMB_NAME.test(u.name) ? 4 : 0) +
    (PLUMB_FILE.test(base) ? 4 : 0) +
    (s.worldTyped &&
    /^(get|find|list|select|latest|current|active|read|query|lookup|by)/.test(
      u.name,
    )
      ? 3
      : 0);
  const R = s.arith + 2 * s.math + s.compare + 3 * s.decide;
  const text = u.node.getText();
  // Values: caches, key/tag/version strings and small literal tables.
  if (u.kind === "value") {
    if (
      /^\s*\w+\s*(:[^=]+)?=\s*new (Weak)?(Map|Set)\b/.test(text) ||
      /new WeakMap|new Map\(\)/.test(text)
    )
      return { cls: "PLUMBING", why: "cache" };
    if (
      /(PREFIX|SUFFIX|TAG|VERSION|_KEY|Key|Prefix|Suffix|Version|Tag)$|^V$/.test(
        u.name,
      )
    )
      return { cls: "PLUMBING", why: "key-constant" };
    const init = u.node.initializer;
    if (
      init &&
      u.lines <= 2 &&
      (ts.isStringLiteral(init) ||
        ts.isNoSubstitutionTemplateLiteral(init) ||
        ts.isTemplateExpression(init))
    )
      return { cls: "PLUMBING", why: "string-key" };
    if (s.fnNodes === 0 && R === 0 && literalRatio >= 0.4)
      return { cls: "DATA", why: "constant" };
  }
  // Views, hooks and prose formatters are presentation plumbing, not rules.
  if (
    /\.tsx$/.test(file) &&
    (/^[A-Z]/.test(u.name) || /^use[A-Z]/.test(u.name))
  )
    return { cls: "PLUMBING", why: "view" };
  if (/^use[A-Z]/.test(u.name)) return { cls: "PLUMBING", why: "hook" };
  if (
    /^(describe|format|render|phrase|word|label|title|display|caption|sentence|text|summarize)[A-Z]?|(Word|Words|Label|Text|Phrase|Note|Caption|Sentence|DisplayName)$/.test(
      u.name,
    ) &&
    R <= 2
  )
    return { cls: "PLUMBING", why: "prose-or-label" };
  if (
    /(Key|Id|Ids|Keys)$|^(stableKey|keyFor|idFor|makeKey|make\w*Id)/.test(
      u.name,
    ) &&
    R === 0
  )
    return { cls: "PLUMBING", why: "key-builder" };
  if (/^record[A-Z]/.test(u.name))
    return { cls: "PLUMBING", why: "record-writer" };
  if (R === 0)
    return { cls: "PLUMBING", why: s.worldTyped ? "world-glue" : "glue" };
  if (/\bhistory\b/.test(text) && R <= 4)
    return { cls: "PLUMBING", why: "history-read" };
  if (P >= R) return { cls: "PLUMBING", why: `P${P.toFixed(1)}>=R${R}` };
  return {
    cls: "RULE",
    why: `R${R}>P${P.toFixed(1)}`,
    entangled: s.worldTyped || s.scans > 0 || s.appends > 0,
  };
}

const rows = [];
for (const f of files) {
  const r = rel(f);
  const sf = parsed.get(f);
  for (const u of unitsOf(sf)) {
    const c = classify(f, r, u);
    rows.push({
      engine: groupOf(r),
      file: r,
      line: u.line,
      name: u.name,
      kind: u.kind,
      exported: u.exported,
      lines: u.lines,
      cls: c.cls,
      why: c.why,
      entangled: !!c.entangled,
      worldTyped: !!u.signals?.worldTyped,
      numericLiterals: u.signals?.numericLiterals ?? 0,
    });
  }
}

// file-level totals (incl. imports/comments not in units)
const fileLines = new Map(
  files.map((f) => [rel(f), fs.readFileSync(f, "utf8").split("\n").length]),
);
const fileEngine = new Map(files.map((f) => [rel(f), groupOf(rel(f))]));

const summary = {};
for (const row of rows) {
  const e = (summary[row.engine] ??= {
    files: new Set(),
    fileLines: 0,
    units: {},
    lines: {},
    ruleEntangled: { units: 0, lines: 0 },
    rulePortable: { units: 0, lines: 0 },
    numericLiteralsInRule: 0,
  });
  e.files.add(row.file);
  e.units[row.cls] = (e.units[row.cls] ?? 0) + 1;
  e.lines[row.cls] = (e.lines[row.cls] ?? 0) + row.lines;
  if (row.cls === "RULE") {
    const k = row.entangled ? "ruleEntangled" : "rulePortable";
    e[k].units++;
    e[k].lines += row.lines;
    e.numericLiteralsInRule += row.numericLiterals;
  }
}
for (const [r, g] of fileEngine) {
  const e = (summary[g] ??= {
    files: new Set(),
    fileLines: 0,
    units: {},
    lines: {},
    ruleEntangled: { units: 0, lines: 0 },
    rulePortable: { units: 0, lines: 0 },
    numericLiteralsInRule: 0,
  });
  e.files.add(r);
  e.fileLines += fileLines.get(r);
}
const out = {};
for (const [g, e] of Object.entries(summary)) {
  const deadFiles = [...e.files].filter(
    (r) => !reachable.has(path.join(root, r)),
  ).length;
  out[g] = {
    files: e.files.size,
    deadFiles,
    fileLines: e.fileLines,
    units: e.units,
    lines: e.lines,
    ruleEntangled: e.ruleEntangled,
    rulePortable: e.rulePortable,
    numericLiteralsInRule: e.numericLiteralsInRule,
  };
}
fs.writeFileSync(
  path.join(outDir, "summary.json"),
  JSON.stringify(
    {
      entries: entries.map(rel),
      reachableFiles: reachable.size,
      nonTestFiles: files.length,
      engines: out,
    },
    null,
    1,
  ),
);
const header =
  "engine,file,line,name,kind,exported,lines,class,why,entangled,worldTyped,numericLiterals";
fs.writeFileSync(
  path.join(outDir, "units.csv"),
  [
    header,
    ...rows.map((x) =>
      [
        x.engine,
        x.file,
        x.line,
        x.name,
        x.kind,
        x.exported,
        x.lines,
        x.cls,
        x.why,
        x.entangled,
        x.worldTyped,
        x.numericLiterals,
      ].join(","),
    ),
  ].join("\n") + "\n",
);
fs.writeFileSync(
  path.join(outDir, "files.csv"),
  [
    "engine,file,lines,reachable",
    ...[...fileEngine].map(
      ([r, g]) =>
        `${g},${r},${fileLines.get(r)},${reachable.has(path.join(root, r))}`,
    ),
  ].join("\n") + "\n",
);
console.log(JSON.stringify(out, null, 0).slice(0, 4000));
