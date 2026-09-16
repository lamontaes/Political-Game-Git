/* global document, window */

const hub = window.ocdHub;
const $ = (id) => document.getElementById(id);
const track = $("track");
const status = $("status");
let branchesLoaded = false;
let last = null;

function esc(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}

function optionFor(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function renderTracks(state) {
  const selected = state.selectedTrack;
  const known = new Set([...track.options].map((o) => o.value));
  for (const id of Object.keys(state.tracks)) {
    if (id === "main" || known.has(id.slice(7))) continue;
    track.append(optionFor(id.slice(7), `Branch · ${id.slice(7)}`));
  }
  const want = selected === "main" ? "main" : selected.slice(7);
  if ([...track.options].some((o) => o.value === want)) track.value = want;
}

function render(state) {
  last = state;
  for (const button of document.querySelectorAll("[data-tab]"))
    button.setAttribute(
      "aria-selected",
      String(button.dataset.tab === state.activeTab),
    );
  renderTracks(state);
  const selected = state.tracks[state.selectedTrack];
  const phase = state.phase;
  const building = state.building === state.selectedTrack;
  const pill = (kind, text) =>
    `<span class="pill ${esc(kind)}">${esc(text)}</span>`;
  let html = "";
  if (selected)
    html += pill(selected.label.kind, selected.label.kind.replace("-", " "));
  else html += pill("failed", "no build");
  if (phase) {
    const name = phase.phase[0].toUpperCase() + phase.phase.slice(1);
    html += `<strong>${esc(name)}</strong> · ${esc(phase.message ?? "")}`;
  } else if (selected) {
    html += esc(selected.label.text);
  } else {
    html += "This source has no verified build yet.";
  }
  if (selected?.current?.privatePack)
    html += ` · pack ${esc(selected.current.privatePack.packId)}`;
  status.innerHTML = html;
  status.title = selected
    ? `${selected.label.text}\nbuild ${selected.current.revision}\nclient ${selected.current.clientTreeSha256}\n${selected.current.architecture}`
    : "";
  $("apply").hidden = !(selected?.pending && selected.open);
  $("return-main").hidden = state.selectedTrack === "main";
  $("cancel-build").hidden = !building;
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

async function loadBranches() {
  const result = await hub.branches();
  if (!result?.ok) {
    status.textContent = result?.message ?? "Could not list branches.";
    return;
  }
  const current = track.value;
  track.replaceChildren(optionFor("main", "Follow main"));
  for (const branch of result.branches) {
    if (branch.name === "main") continue;
    track.append(optionFor(branch.name, `Branch · ${branch.name}`));
  }
  track.value = current;
  branchesLoaded = true;
}

track.addEventListener("focus", () => {
  if (!branchesLoaded) void loadBranches();
});
$("refresh-branches").addEventListener("click", () => loadBranches());
track.addEventListener("change", async () => {
  const result = await hub.selectTrack(track.value);
  if (result && result.ok === false && result.message)
    status.textContent = result.message;
});
$("apply").addEventListener("click", () => hub.apply(last?.selectedTrack));
$("return-main").addEventListener("click", () => hub.returnMain());
$("cancel-build").addEventListener("click", () => hub.cancelBuild());

hub.onState(render);
hub.state().then(render);
