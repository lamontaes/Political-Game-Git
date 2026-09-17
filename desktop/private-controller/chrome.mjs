/* global document, window */

const hub = window.ocdHub;
const $ = (id) => document.getElementById(id);
const track = $("track");
const status = $("status");
const TECHNICAL = "__technical__";
let chooser = null;
let showTechnical = false;
let showDetails = false;
let last = null;
let busy = false;

function esc(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}

function option(value, label, title) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  if (title) element.title = title;
  return element;
}

function group(label, items) {
  const element = document.createElement("optgroup");
  element.label = label;
  for (const item of items)
    element.append(
      option(
        item.branch,
        item.label ?? item.title,
        [item.purpose, item.branch, item.revision?.slice(0, 12)]
          .filter(Boolean)
          .join("\n"),
      ),
    );
  return element;
}

/** The chooser: main first, feature previews, technical only on request. */
function renderChooser(state) {
  const selected = state?.selectedTrack ?? "main";
  const want = selected === "main" ? "main" : selected.slice(7);
  const children = [option("main", "Main game (recommended)")];
  const previews = chooser?.previews ?? [];
  const technical = chooser?.technical ?? [];
  const listed = new Set([
    "main",
    ...previews.map((item) => item.branch),
    ...(showTechnical ? technical.map((item) => item.branch) : []),
  ]);
  if (previews.length) children.push(group("Feature previews", previews));
  if (showTechnical && technical.length)
    children.push(group("Technical branches", technical));
  // A selection outside the visible groups is still shown, never dropped.
  if (!listed.has(want)) children.push(option(want, `Selected · ${want}`));
  children.push(
    option(
      TECHNICAL,
      showTechnical ? "Hide technical branches" : "Show technical branches…",
    ),
  );
  track.replaceChildren(...children);
  track.value = want;
}

function selectedItem(state) {
  const id = state.selectedTrack;
  if (id === "main") return { branch: "main", title: "Main game" };
  const branch = id.slice(7);
  return (
    [...(chooser?.previews ?? []), ...(chooser?.technical ?? [])].find(
      (item) => item.branch === branch,
    ) ?? { branch, title: branch }
  );
}

function timeText(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function render(state) {
  last = state;
  for (const button of document.querySelectorAll("[data-tab]"))
    button.setAttribute(
      "aria-selected",
      String(button.dataset.tab === state.activeTab),
    );
  renderChooser(state);
  const item = selectedItem(state);
  const selected = state.tracks[state.selectedTrack];
  const update = state.update ?? { kind: "unchecked", text: "" };
  const pill = `<span class="pill ${esc(update.kind)}">${esc(update.text)}</span>`;
  let html = pill;
  if (showDetails) {
    const revision =
      selected?.current?.revision ?? update.latestRevision ?? "not built yet";
    html += `${esc(item.branch)} · ${esc(revision)}`;
  } else if (!state.selectedBuilt) {
    // The choice stays; what is on screen is named until the first build lands.
    html += `<strong>Preparing ${esc(item.title)}</strong>`;
    if (state.phase?.message) html += ` · ${esc(state.phase.message)}`;
    if (state.loaded)
      html += ` · still showing ${esc(state.loaded.title)}${
        state.loaded.revision
          ? ` (${esc(state.loaded.revision.slice(0, 8))})`
          : ""
      }`;
  } else {
    html += `<strong>${esc(item.title)}</strong>`;
    if (state.phase?.message && update.kind !== "current")
      html += ` · ${esc(state.phase.message)}`;
  }
  const checked = timeText(update.lastSuccessAt);
  if (!showDetails)
    html += checked
      ? ` <span class="when">· last checked ${esc(checked)}</span>`
      : "";
  status.innerHTML = html;
  status.title = [
    item.title,
    item.purpose,
    `branch ${item.branch}`,
    selected ? `build ${selected.current.revision}` : "no verified build yet",
    update.message,
    selected?.current?.privatePack
      ? `pack ${selected.current.privatePack.packId}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  const building = state.building === state.selectedTrack;
  const check = $("check-updates");
  check.disabled = building;
  check.textContent =
    update.kind === "failed" ? "Try again" : "Check for updates";
  $("copy-ref").hidden = !showDetails;
  $("build-details").setAttribute("aria-expanded", String(showDetails));
  $("apply").hidden = !(selected?.pending && selected.open);
  $("return-main").hidden = state.selectedTrack === "main";
  $("cancel-build").hidden = !building;
  $("return-title").hidden = state.activeTab !== "play" || !state.loaded;
}

for (const button of document.querySelectorAll("[data-tab]"))
  button.addEventListener("click", () => hub.tab(button.dataset.tab));

document.querySelector(".tabs").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const index = tabs.indexOf(document.activeElement);
  if (index < 0) return;
  const next =
    tabs[
      (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length
    ];
  next.focus();
  void hub.tab(next.dataset.tab);
});

async function loadChooser() {
  const result = await hub.branches();
  if (!result?.ok) {
    status.textContent = result?.message ?? "Could not list game builds.";
    return;
  }
  chooser = result.chooser;
  if (last) render(last);
}

track.addEventListener("focus", () => void loadChooser());
track.addEventListener("change", async () => {
  if (track.value === TECHNICAL) {
    showTechnical = !showTechnical;
    if (last) render(last);
    return;
  }
  const result = await hub.selectTrack(track.value);
  if (result && result.ok === false && result.message)
    status.textContent = result.message;
});
$("build-details").addEventListener("click", () => {
  showDetails = !showDetails;
  if (last) render(last);
});
$("copy-ref").addEventListener("click", async () => {
  if (!last) return;
  const item = selectedItem(last);
  const revision = last.tracks[last.selectedTrack]?.current?.revision;
  const result = await hub.copyText(
    revision ? `${item.branch}@${revision}` : item.branch,
  );
  $("copy-ref").textContent = result?.ok ? "Copied" : "Could not copy";
  window.setTimeout(() => ($("copy-ref").textContent = "Copy revision"), 1500);
});
$("check-updates").addEventListener("click", async () => {
  const result = await hub.checkUpdates();
  if (result && result.ok === false && result.message)
    status.textContent = result.message;
});
$("return-title").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  $("return-title").disabled = true;
  try {
    const result = await hub.returnToTitle();
    if (result?.message) status.textContent = result.message;
  } finally {
    busy = false;
    $("return-title").disabled = false;
  }
});
$("apply").addEventListener("click", () => hub.apply(last?.selectedTrack));
$("return-main").addEventListener("click", () => hub.returnMain());
$("cancel-build").addEventListener("click", () => hub.cancelBuild());

hub.onState(render);
hub.state().then(render);
void loadChooser();
