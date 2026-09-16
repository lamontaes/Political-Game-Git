/* global document, window */

const hub = window.ocdHub;
const $ = (id) => document.getElementById(id);
const note = (text) => ($("settings-note").textContent = text ?? "");

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

const short = (build) =>
  build
    ? `${build.revision.slice(0, 12)} · ${build.privatePack?.packId ?? "pack unknown"}`
    : "—";

function render(state) {
  $("repo").textContent = state.repositoryPath ?? "Not chosen";
  $("pack").textContent = state.privatePackPath ?? "Not chosen";
  $("artdesk-branch").textContent = state.artDeskBranch;
  if (document.activeElement !== $("artdesk-input"))
    $("artdesk-input").value = state.artDeskBranch;
  $("arch").textContent = `${state.architecture} · hub ${state.hubVersion}`;
  const ids = state.identities ?? {};
  $("id-hub").textContent =
    `${ids.hub?.revision ?? "unknown"}${ids.hub?.desktopDirty ? " (uncommitted desktop changes)" : ""} · ${ids.hub?.signing ?? ""}`;
  $("id-game").textContent = ids.game
    ? `${ids.game.track} · ${ids.game.revision} · client ${ids.game.clientTreeSha256} · ${ids.game.architecture}`
    : "No verified build yet";
  $("id-bench").textContent = ids.bench
    ? `${ids.bench.branch} @ ${ids.bench.revision}${ids.bench.requestedRevision && ids.bench.requestedRevision !== ids.bench.revision ? ` (newer ${ids.bench.requestedRevision} waiting)` : ""} · records ${ids.bench.recordRoot}`
    : "Not started";
  $("id-pack").textContent = ids.privatePack
    ? `${ids.privatePack.packId} · manifest ${ids.privatePack.manifestSha256}`
    : "Unknown for this build";
  const rows = Object.entries(state.tracks).map(([id, track]) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(id === "main" ? "Follow main" : id.slice(7)),
      cell(short(track.current)),
      cell(short(track.pending)),
      cell(short(track.previous)),
      cell(
        track.phase
          ? `${track.phase.phase}: ${track.phase.message}`
          : track.label.text,
        `state-${track.phase?.phase ?? track.label.kind}`,
      ),
    );
    const actions = document.createElement("td");
    const check = document.createElement("button");
    check.textContent = "Check now";
    check.addEventListener("click", () => hub.check(id));
    actions.append(check);
    if (track.pending) {
      const apply = document.createElement("button");
      apply.textContent = "Activate waiting build";
      apply.className = "primary";
      apply.addEventListener("click", async () =>
        note((await hub.apply(id))?.message),
      );
      actions.append(apply);
    }
    if (track.previous) {
      const back = document.createElement("button");
      back.textContent = "Roll back";
      back.addEventListener("click", async () =>
        note((await hub.rollback(id))?.message),
      );
      actions.append(back);
    }
    tr.append(actions);
    return tr;
  });
  $("tracks").replaceChildren(...rows);
  $("log").textContent = state.log.length
    ? state.log.join("\n")
    : "No activity yet.";
}

$("choose-repo").addEventListener("click", async () =>
  note((await hub.chooseRepository())?.message),
);
$("choose-pack").addEventListener("click", async () =>
  note((await hub.choosePack())?.message),
);
$("artdesk-save").addEventListener("click", async () =>
  note((await hub.setArtDeskBranch($("artdesk-input").value.trim()))?.message),
);
$("artdesk-restart").addEventListener("click", async () =>
  note((await hub.restartArtDesk())?.message),
);

hub.onState(render);
hub.state().then(render);
