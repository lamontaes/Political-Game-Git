/* global document, fetch, location */
// Dev mode's page: record data and control names only. Every write goes to
// /api/dev/*, which calls the core; reading spends no game time.
import {
  actionButton,
  billPanel,
  experimentActions,
  followBar as followBarView,
  followedColumn,
  idLink,
  idList,
  lawCell,
  levelOptions,
  payChart,
  personIdLine,
  recordTree,
  reportText,
  tableRows,
  traceBox,
  traceDetail,
  whyView as whyPanel,
} from "./ui/dev-view.mjs";
import { moneyWords } from "../english/plain-words.mjs";

const $ = (id) => document.getElementById(id);
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

/** Any record as nested key/value rows; ids open in Trace. */
const tree = (value, key = "", depth = 0) =>
  recordTree(value, traceId, key, depth);

function table(target, columns, rows, onPick, rowClass) {
  $(target).replaceChildren(...tableRows(columns, rows, onPick, rowClass));
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
  $("law-level").replaceChildren(...levelOptions(laws.levels));
  if (level) $("law-level").value = level;
  drawLaws();
};
function drawLaws() {
  const filter = $("law-filter").value.toLowerCase();
  table(
    "law-table",
    [
      { name: "Series", value: (s) => s.series.split(":").pop() },
      ...laws.levels.map((l, i) => ({
        name: l.level,
        value: (s) => lawCell(s.levels[i]),
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

// Following -------------------------------------------------------------------
/**
 * Follow puts a resident in focus, as the people the player deals with are,
 * so each act from then on keeps every option's reasons. It decides nothing
 * and spends no time. A resident in the player's circle is already kept.
 */
function followBar(personId, onChange, first) {
  return followBarView({
    first,
    load: () =>
      api(`/api/dev/following?personId=${encodeURIComponent(personId)}`),
    onToggle: (view, draw) =>
      run(async () => {
        const next = await api(
          `/api/dev/${view.status === "dev-mode" ? "unfollow" : "follow"}`,
          { personId },
        );
        draw(next);
        await onChange?.(next);
      }),
  });
}
/** The followed residents' decisions, one column each, so two can be read side by side. */
async function drawFollowed() {
  const { followed } = await api("/api/dev/following");
  $("followed-box").hidden = followed.length === 0;
  $("followed").replaceChildren(
    ...followed.map(({ view, decisions }) =>
      followedColumn(
        view,
        traceId,
        followBar(view.personId, drawFollowed, view),
        whyView(decisions),
      ),
    ),
  );
}

// 2. Decisions ---------------------------------------------------------------
let people = [];
loaders.decisions = async () => {
  people = await api("/api/dev/people");
  drawPeople();
  await drawFollowed();
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
  $("offers-follow").replaceChildren(followBar(personId, drawFollowed));
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
  $("choose-result").replaceChildren(personIdLine(personId, personView));
}
async function drawBodies() {
  const bills = await api("/api/dev/bodies");
  $("bodies").replaceChildren(
    ...bills.map((bill) => billPanel(bill, traceId, act)),
  );
}
const act = (name, path, input) =>
  actionButton(name, () =>
    run(async () => {
      await api(path, input);
      await drawBodies();
    }),
  );

// 3. Trace -------------------------------------------------------------------
const whyView = (panel) => whyPanel(panel, traceId);
// The clicked chain, root first: what Report writes out.
let chain = [];
function traceChild(child, path, depth) {
  const here = [...path, { id: child.id, via: child.via, value: child.value }];
  const { box, link } = traceBox(
    child,
    child.value !== undefined ? tree(child.value, "", 1) : undefined,
  );
  // A reason has no record of its own; anything else opens on click.
  if (!link) return box;
  let open;
  // Read the node and show it, replacing what shows now (a person's decisions change once followed).
  const render = async () => {
    const node = await api(
      `/api/dev/trace/node?id=${encodeURIComponent(child.id)}`,
    );
    const next = traceDetail(node, {
      follow:
        node.kind === "person" && node.engine === "core.people"
          ? followBar(child.id, render)
          : undefined,
      whys: (node.why ?? []).map(whyView),
      record: tree(node.record, "record", 2),
      resolver: tree(node.resolver, "saved trace", 2),
      children: node.children.map((c) => traceChild(c, here, depth + 1)),
    });
    if (open) open.replaceWith(next);
    else box.append(next);
    open = next;
  };
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
      await render();
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
    $("trace-result").prepend(reportText(report.text));
  });
async function personView(id) {
  $("trace-id").value = id;
  await show("trace");
  await run(async () =>
    $("trace-result").replaceChildren(
      followBar(id),
      tree(await api(`/api/dev/person?id=${encodeURIComponent(id)}`), id),
    ),
  );
}
$("trace-go").onclick = () => traceId($("trace-id").value.trim());
$("person-go").onclick = () => personView($("trace-id").value.trim());

// 4. Watch -------------------------------------------------------------------
loaders.watch = async () => {
  const view = await api("/api/dev/watch");
  const firstMark = view.marks[0]?.date ?? "9999";
  $("chart").replaceChildren(payChart(view.watched));
  table(
    "watch-table",
    [
      { name: "Month", value: (r) => r.date },
      { name: "Public jobs", value: (r) => r.pay.publicJobs },
      {
        name: "Public hourly",
        value: (r) => moneyWords(r.pay.publicMedianHourlyMinor),
      },
      { name: "Private jobs", value: (r) => r.pay.privateJobs },
      {
        name: "Private hourly",
        value: (r) => moneyWords(r.pay.privateMedianHourlyMinor),
      },
      {
        name: "Changes",
        value: (r) => idList(r.marks, traceId),
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
        value: (r) => idLink(r.id, traceId),
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

// 5. Golden path --------------------------------------------------------------
// The bench's own reading of the golden path (src/bench/progress.ts): each
// step's status and the record that shows it, and each world piece with the
// modules that run it.
const evidenceIds = (e) =>
  !e
    ? []
    : (e.recordIds ??
      [e.contestId, e.targetId, e.personId, e.householdId].filter(Boolean));
loaders.path = async () => {
  const id = state.playerId ? `?id=${encodeURIComponent(state.playerId)}` : "";
  const progress = await api(`/api/progress${id}`);
  $("path-furthest").textContent = `furthestReachedStep ${
    progress.furthestReachedStep ?? "none"
  } · ${progress.date}`;
  table(
    "path-steps",
    [
      { name: "Step", value: (r) => r.step },
      { name: "Label", value: (r) => r.label },
      { name: "Status", value: (r) => r.status },
      { name: "Evidence", value: (r) => r.evidence?.kind },
      {
        name: "Record",
        value: (r) =>
          idList(evidenceIds(r.evidence), traceId, r.evidence?.moduleId ?? ""),
      },
      { name: "Missing module", value: (r) => r.missingModule },
    ],
    progress.steps,
    undefined,
    (r) => (r.status === "not in the new core yet" ? "dev" : ""),
  );
  table(
    "path-world",
    [
      { name: "Piece", value: (r) => r.label },
      { name: "Status", value: (r) => r.status },
      { name: "Running modules", value: (r) => r.runningModules?.join(" · ") },
      { name: "Missing module", value: (r) => r.missingModule },
    ],
    progress.world,
  );
};

// 6. Experiments -------------------------------------------------------------
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
          experimentActions(
            () => run(() => applyExperiment(e, 0)),
            () => run(() => applyExperiment(e, e.runMonths)),
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
