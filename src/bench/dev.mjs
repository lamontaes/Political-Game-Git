/* global document, fetch, location, Node */
// Dev mode's page: record data and control names only. Every write goes to
// /api/dev/*, which calls the core; reading spends no game time.
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of children)
    node.append(child instanceof Node ? child : String(child ?? ""));
  return node;
};

async function api(path, input) {
  const response = await fetch(
    path,
    input === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
  );
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

// Every action reports its error in one place and refreshes the header.
async function run(work) {
  $("error").textContent = "";
  document.body.style.cursor = "progress";
  try {
    return await work();
  } catch (error) {
    $("error").textContent = error.message;
  } finally {
    document.body.style.cursor = "";
    await header().catch(() => {});
  }
}

const isId = (value) =>
  typeof value === "string" &&
  /^[a-z][\w-]*[:_][\w:|.-]+$/i.test(value) &&
  value.length > 8;

/** Any record as nested key/value rows; ids open in Trace. */
function tree(value, key = "", depth = 0) {
  if (value === null || typeof value !== "object") {
    const shown = isId(value)
      ? el("span", { className: "id", onclick: () => traceId(value) }, value)
      : el("span", {}, String(value));
    return el(
      "div",
      { className: "kv" },
      el("span", {}, key ? `${key} ` : ""),
      shown,
    );
  }
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  const box = el(
    "details",
    { open: depth < 1 },
    el("summary", {}, `${key} (${entries.length})`),
  );
  for (const [k, v] of entries.slice(0, 300)) box.append(tree(v, k, depth + 1));
  return box;
}

function table(target, columns, rows, onPick, rowClass) {
  const node = $(target);
  node.replaceChildren(
    el("tr", {}, ...columns.map((c) => el("th", {}, c.name))),
    ...rows.map((row) => {
      const tr = el(
        "tr",
        { className: `${onPick ? "item" : ""} ${rowClass?.(row) ?? ""}` },
        ...columns.map((c) => {
          const value = c.value(row);
          return el("td", {}, value instanceof Node ? value : (value ?? ""));
        }),
      );
      if (onPick)
        tr.onclick = () => {
          for (const other of node.querySelectorAll("tr.on"))
            other.classList.remove("on");
          tr.classList.add("on");
          onPick(row);
        };
      return tr;
    }),
  );
}

// Header: the world and its date --------------------------------------------
let state = {};
async function header() {
  state = await api("/api/dev/state");
  $("place").textContent = state.placeName ?? state.placeId;
  $("seed").textContent = state.seed;
  $("date").textContent = state.date;
  const checks = state.journalChecks;
  $("journal-checks").textContent = checks.checking
    ? `on (${checks.checked} postings)`
    : `skipped (${checks.skipped} postings; rerun with ${checks.rerunWith})`;
}

$("build").onclick = () =>
  run(async () => {
    const seed = $("new-seed").value.trim();
    await fetch(`/api/build?seed=${encodeURIComponent(seed)}`, {
      method: "POST",
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error);
    });
    await header();
    await show(current);
  });

// Tabs -----------------------------------------------------------------------
let current = "laws";
const loaders = {};
async function show(tab) {
  current = tab;
  for (const button of document.querySelectorAll(".tab"))
    button.classList.toggle("on", button.dataset.tab === tab);
  for (const section of document.querySelectorAll("main > section"))
    section.hidden = section.id !== tab;
  await loaders[tab]?.();
}
for (const button of document.querySelectorAll(".tab"))
  button.onclick = () => run(() => show(button.dataset.tab));

// Time -----------------------------------------------------------------------
for (const button of document.querySelectorAll("#time [data-step]"))
  button.onclick = () =>
    run(async () => {
      for (const b of document.querySelectorAll("#time button"))
        b.disabled = true;
      try {
        const result = await api("/api/dev/advance", {
          step: button.dataset.step,
          to: $("to-date").value,
        });
        $("time-result").textContent =
          `${result.from} → ${result.to} · ${(result.ms / 1000).toFixed(1)} s`;
      } finally {
        for (const b of document.querySelectorAll("#time button"))
          b.disabled = false;
      }
      await loaders[current]?.();
    });

// 1. Laws --------------------------------------------------------------------
let laws;
let lawPick;
loaders.laws = async () => {
  laws = await api("/api/dev/laws");
  const level = $("law-level").value;
  $("law-level").replaceChildren(
    ...laws.levels.map((l) =>
      el("option", { value: l.level }, `${l.level} · ${l.jurisdiction}`),
    ),
  );
  if (level) $("law-level").value = level;
  drawLaws();
};
function drawLaws() {
  const filter = $("law-filter").value.toLowerCase();
  const cell = (row) =>
    row
      ? el(
          "span",
          { className: row.devMode ? "dev" : "" },
          `${row.value}${row.unit ? ` ${row.unit}` : ""}`,
        )
      : "";
  table(
    "law-table",
    [
      { name: "Series", value: (s) => s.series.split(":").pop() },
      ...laws.levels.map((l, i) => ({
        name: l.level,
        value: (s) =>
          s.levels[i].setAside
            ? el("s", { title: s.levels[i].setAside }, cell(s.levels[i].row))
            : cell(s.levels[i].row),
      })),
      { name: "In force", value: (s) => s.combined },
    ],
    laws.series.filter((s) => s.series.toLowerCase().includes(filter)),
    (s) => {
      lawPick = s;
      $("law-series").textContent = s.series;
      const unit = s.levels.find((l) => l.row?.unit)?.row.unit;
      $("law-unit").value = unit ?? "";
      $("law-result").replaceChildren(tree(s, "levels"));
    },
  );
}
$("law-filter").oninput = () => laws && drawLaws();
const setLaw = (repeal) =>
  run(async () => {
    if (!lawPick) return;
    const result = await api("/api/dev/law", {
      level: $("law-level").value,
      series: lawPick.series,
      value: $("law-value").value,
      unit: $("law-unit").value,
      effectiveDate: $("law-date").value,
      repeal,
    });
    await loaders.laws();
    $("law-result").replaceChildren(
      tree(result.reach, "reach"),
      tree(result.law, "law"),
      tree(result.mark, "mark"),
    );
  });
$("law-set").onclick = () => setLaw(false);
$("law-repeal").onclick = () => setLaw(true);

// 2. Decisions ---------------------------------------------------------------
let people = [];
loaders.decisions = async () => {
  people = await api("/api/dev/people");
  drawPeople();
  await drawBodies();
};
function drawPeople() {
  const filter = $("person-filter").value.toLowerCase();
  table(
    "people-table",
    [
      { name: "Name", value: (p) => `${p.givenName} ${p.familyName}` },
      { name: "Born", value: (p) => p.birthDate },
      { name: "Id", value: (p) => p.id },
    ],
    people
      .filter((p) =>
        `${p.givenName} ${p.familyName} ${p.id}`.toLowerCase().includes(filter),
      )
      .slice(0, 400),
    (p) => run(() => drawOffers(p.id)),
  );
}
$("person-filter").oninput = drawPeople;
async function drawOffers(personId) {
  const value = await api(
    `/api/dev/offers?personId=${encodeURIComponent(personId)}`,
  );
  $("offers-name").textContent =
    `${value.name}${value.pending ? ` · ${value.pending}` : ""}`;
  table(
    "offers-table",
    [
      { name: "Choice", value: (o) => o.actionId },
      { name: "With", value: (o) => o.targetName ?? o.targetId },
      { name: "Need", value: (o) => o.need },
    ],
    value.offers,
    (o) =>
      run(async () => {
        const mark = await api("/api/dev/choose", { personId, key: o.key });
        $("choose-result").replaceChildren(tree(mark, "mark"));
        await drawOffers(personId);
      }),
    (o) => (o.key === value.pending ? "on" : ""),
  );
  $("choose-result").replaceChildren(
    el(
      "span",
      { className: "id", onclick: () => personId && personView(personId) },
      personId,
    ),
  );
}
async function drawBodies() {
  const bills = await api("/api/dev/bodies");
  $("bodies").replaceChildren(
    ...bills.map((bill) => {
      const box = el(
        "div",
        { className: "panel", style: "padding:8px 12px;margin:8px 0" },
        el(
          "div",
          { className: "row" },
          el("b", {}, bill.number),
          el("span", { className: "role" }, bill.status),
          el(
            "span",
            { className: "role" },
            bill.office?.name ?? bill.bodyOfficeId,
          ),
          el(
            "span",
            { className: "id", onclick: () => traceId(bill.id) },
            bill.id,
          ),
        ),
      );
      const act = (name, path, input) =>
        el(
          "button",
          {
            className: "action",
            type: "button",
            onclick: () =>
              run(async () => {
                await api(path, input);
                await drawBodies();
              }),
          },
          name,
        );
      if (bill.open)
        box.append(
          el(
            "div",
            { className: "row" },
            act("Hold vote", "/api/dev/hold-vote", { billId: bill.id }),
            act("Sign", "/api/dev/sign", { billId: bill.id, sign: true }),
            act("Veto", "/api/dev/sign", { billId: bill.id, sign: false }),
          ),
        );
      for (const member of bill.members)
        box.append(
          el(
            "div",
            { className: "row" },
            el("span", {}, `${member.givenName} ${member.familyName}`),
            el("span", { className: "role" }, member.vote ?? ""),
            ...(bill.open ? ["yes", "no", "abstain"] : []).map((vote) =>
              act(vote, "/api/dev/vote", {
                billId: bill.id,
                memberId: member.key,
                vote,
              }),
            ),
          ),
        );
      return box;
    }),
  );
}

// 3. Trace -------------------------------------------------------------------
/** One "why" panel: labeled rows (ids open in Trace) and, where an engine keeps no reason, the gap. */
function whyView(panel) {
  const box = el(
    "details",
    { className: "why", open: true },
    el("summary", {}, panel.title),
  );
  for (const row of panel.rows)
    box.append(
      el(
        "div",
        { className: "kv" },
        el("span", {}, `${row.label} `),
        row.id
          ? el(
              "span",
              { className: "id", onclick: () => traceId(row.id) },
              String(row.value),
            )
          : el("span", {}, String(row.value)),
      ),
    );
  if (panel.gap)
    box.append(el("div", { className: "kv gap" }, `Gap: ${panel.gap}`));
  return box;
}
// The clicked chain, root first: what Report writes out.
let chain = [];
function traceChild(child, path, depth) {
  const box = el("div", { className: `node ${child.kind}` });
  const head = el(
    "div",
    { className: "head" },
    el("span", { className: "kind" }, child.kind),
    el("span", { className: "via" }, child.via ?? ""),
  );
  box.append(head);
  const here = [...path, { id: child.id, via: child.via, value: child.value }];
  if (child.value !== undefined) box.append(tree(child.value, "", 1));
  // A reason has no record of its own; anything else opens on click.
  if (child.kind === "reason") return box;
  const link = el("span", { className: "id" }, child.id);
  head.append(link);
  let open;
  link.onclick = () =>
    run(async () => {
      for (const other of document.querySelectorAll(".node.on"))
        other.classList.remove("on");
      box.classList.add("on");
      chain = here;
      $("trace-chain").textContent = chain.map((s) => s.id).join(" ← ");
      if (open) {
        open.remove();
        open = undefined;
        return;
      }
      const node = await api(
        `/api/dev/trace/node?id=${encodeURIComponent(child.id)}`,
      );
      open = el(
        "div",
        {},
        el(
          "div",
          { className: "row" },
          el("span", { className: "kind" }, node.kind),
          el("span", { className: "via" }, node.engine),
        ),
        ...(node.why ?? []).map(whyView),
        tree(node.record, "record", 2),
        tree(node.resolver, "saved trace", 2),
        ...node.children.map((c) => traceChild(c, here, depth + 1)),
      );
      box.append(open);
    });
  return box;
}
async function traceId(id) {
  $("trace-id").value = id;
  await show("trace");
  chain = [];
  const root = traceChild({ id, kind: "record", via: "" }, [], 0);
  $("trace-result").replaceChildren(root);
  root.querySelector(".id").click();
}
$("trace-report").onclick = () =>
  run(async () => {
    if (!chain.length) return;
    const report = await api("/api/dev/trace/report", { chain });
    $("trace-chain").textContent = report.file;
    $("trace-result").prepend(el("pre", { className: "prose" }, report.text));
  });
async function personView(id) {
  $("trace-id").value = id;
  await show("trace");
  await run(async () =>
    $("trace-result").replaceChildren(
      tree(await api(`/api/dev/person?id=${encodeURIComponent(id)}`), id),
    ),
  );
}
$("trace-go").onclick = () => traceId($("trace-id").value.trim());
$("person-go").onclick = () => personView($("trace-id").value.trim());

// 4. Watch -------------------------------------------------------------------
function chart(rows, marks) {
  if (rows.length < 2) return el("div");
  const w = 600;
  const h = 150;
  const values = rows.flatMap((r) => [
    r.pay.publicMedianHourlyMinor,
    r.pay.privateMedianHourlyMinor,
  ]);
  const top = Math.max(...values) * 1.1 || 1;
  const x = (i) => 30 + (i * (w - 40)) / (rows.length - 1);
  const y = (v) => h - 15 - (v / top) * (h - 25);
  const line = (key) =>
    rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.pay[key])}`).join("");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "chart");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = [
    ...rows
      .map((r, i) => (r.marks.length ? i : -1))
      .filter((i) => i >= 0)
      .map(
        (i) =>
          `<line class="mark" x1="${x(i)}" x2="${x(i)}" y1="5" y2="${h - 15}"/>`,
      ),
    `<path class="public" d="${line("publicMedianHourlyMinor")}"/>`,
    `<path class="private" d="${line("privateMedianHourlyMinor")}"/>`,
    `<text x="2" y="12">${(top / 100).toFixed(2)}</text>`,
    `<text x="30" y="${h - 2}">${rows[0].date}</text>`,
    `<text x="${w - 70}" y="${h - 2}">${rows.at(-1).date}</text>`,
  ].join("");
  void marks;
  return svg;
}
const dollars = (minor) => (minor / 100).toFixed(2);
loaders.watch = async () => {
  const view = await api("/api/dev/watch");
  const firstMark = view.marks[0]?.date ?? "9999";
  $("chart").replaceChildren(chart(view.watched, view.marks));
  table(
    "watch-table",
    [
      { name: "Month", value: (r) => r.date },
      { name: "Public jobs", value: (r) => r.pay.publicJobs },
      {
        name: "Public hourly",
        value: (r) => dollars(r.pay.publicMedianHourlyMinor),
      },
      { name: "Private jobs", value: (r) => r.pay.privateJobs },
      {
        name: "Private hourly",
        value: (r) => dollars(r.pay.privateMedianHourlyMinor),
      },
      {
        name: "Changes",
        value: (r) =>
          el(
            "span",
            {},
            ...r.marks.map((id) =>
              el(
                "span",
                { className: "id", onclick: () => traceId(id) },
                `${id} `,
              ),
            ),
          ),
      },
    ],
    view.watched,
    undefined,
    (r) => (r.date > firstMark ? "after" : ""),
  );
  const keys = (rows) =>
    [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
      (k) => !["id", "placeId"].includes(k),
    );
  const metricKeys = keys(view.metrics);
  table(
    "metrics-table",
    metricKeys.map((k) => ({
      name: k,
      value: (r) => (typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k]),
    })),
    view.metrics,
    undefined,
    (r) => (r.date > firstMark ? "after" : ""),
  );
  const nation = view.nation.slice(-24);
  table(
    "nation-table",
    keys(nation).map((k) => ({
      name: k,
      value: (r) =>
        typeof r[k] === "number"
          ? +r[k].toFixed(4)
          : typeof r[k] === "object"
            ? JSON.stringify(r[k])
            : r[k],
    })),
    nation,
  );
  $("budgets").replaceChildren(
    ...view.budgets.map((g) => tree(g.latest ?? {}, g.name ?? g.id)),
  );
  $("prices").replaceChildren(tree(view.prices, "rules"));
  table(
    "news-table",
    [
      { name: "Date", value: (r) => r.date },
      { name: "Kind", value: (r) => r.kind },
      {
        name: "Record",
        value: (r) =>
          el("span", { className: "id", onclick: () => traceId(r.id) }, r.id),
      },
      {
        name: "Facts",
        value: (r) =>
          Object.entries(r.facts)
            .slice(0, 6)
            .map(([k, v]) => `${k}=${v}`)
            .join(" · "),
      },
    ],
    view.news,
    undefined,
    (r) => (r.kind === "dev-mode-change" ? "dev" : ""),
  );
};

// 5. Experiments -------------------------------------------------------------
loaders.experiments = async () => {
  const { builtIn, saved } = await api("/api/dev/experiments");
  table(
    "experiment-table",
    [
      { name: "Experiment", value: (e) => e.id },
      { name: "Months", value: (e) => e.runMonths },
      {
        name: "Steps",
        value: (e) => e.steps.map((s) => JSON.stringify(s)).join(" "),
      },
      {
        name: "",
        value: (e) =>
          el(
            "span",
            {},
            el(
              "button",
              {
                className: "action",
                type: "button",
                onclick: () => run(() => applyExperiment(e, 0)),
              },
              "Apply",
            ),
            el(
              "button",
              {
                className: "action primary",
                type: "button",
                onclick: () => run(() => applyExperiment(e, e.runMonths)),
              },
              "Run",
            ),
          ),
      },
    ],
    [...builtIn, ...saved],
  );
};
async function applyExperiment(experiment, months) {
  const result = await api("/api/dev/experiment/apply", { id: experiment.id });
  $("experiment-result").replaceChildren(tree(result, experiment.id));
  // One month per call, so the page shows each month as it lands.
  for (let month = 0; month < months; month++) {
    const leg = await api("/api/dev/advance", { step: "month" });
    $("time-result").textContent = `${month + 1} / ${months} · ${leg.to}`;
    await header();
  }
  if (months) await show("watch");
}
$("save").onclick = () =>
  run(async () => {
    // This session's law changes, as steps.
    const steps = state.marks
      .filter((m) => m.control === "law")
      .map((m) => ({
        control: "law",
        level: m.facts.level,
        series: m.facts.series,
        value: Number(m.facts.value),
        ...(m.facts.unit ? { unit: m.facts.unit } : {}),
        effectiveInDays: Math.max(
          0,
          (Date.parse(m.facts.effectiveDate) - Date.parse(m.date)) / 86_400_000,
        ),
      }));
    const result = await api("/api/dev/experiment/save", {
      id: $("save-id").value.trim(),
      steps,
      runMonths: Number($("save-months").value),
    });
    $("experiment-result").replaceChildren(tree(result, result.id));
    await loaders.experiments();
  });

await run(async () => {
  await header();
  await show(location.hash.slice(1) || "laws");
});
