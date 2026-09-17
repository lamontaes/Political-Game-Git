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
  const requested = state.tracks[state.selectedTrack] ?? null;
  $("id-requested").textContent =
    `${state.selectedTrack === "main" ? "Follow main" : state.selectedTrack.slice(7)}${
      state.selectedBuilt
        ? state.selectedPresent
          ? ""
          : " · its cached payload is missing from disk"
        : " · not built yet"
    }`;
  $("id-game").textContent = ids.game
    ? `${ids.game.revision} · client ${ids.game.clientTreeSha256} · ${ids.game.architecture}${requested?.pending ? ` · ${requested.pending.revision} waiting for a restart` : ""}`
    : "No verified build yet";
  // What is actually running, never merged with what was requested or staged.
  $("id-loaded").textContent = ids.loaded
    ? `${ids.loaded.title} · ${ids.loaded.revision ?? "revision unknown"}${
        ids.loaded.revision &&
        ids.loaded.selectedBuildRevision &&
        ids.loaded.revision !== ids.loaded.selectedBuildRevision
          ? ` · its track's staged build is now ${ids.loaded.selectedBuildRevision}`
          : ""
      }`
    : "No game view open";
  $("id-bench").textContent = ids.bench
    ? `${ids.bench.branch} · requested ${ids.bench.requestedRevision ?? "unknown"} · running ${ids.bench.revision ?? "unknown"} · records ${ids.bench.recordRoot}`
    : "Not started";
  const exchange = state.artdeskExchange;
  $("id-exchange").textContent = !exchange
    ? "Not bound; the bench uses its own folder discovery"
    : exchange.ok
      ? `${exchange.root} · ${exchange.folders
          .map((folder) =>
            folder.resolvedBy === "id"
              ? `${folder.key} ${folder.id} by Drive id`
              : `${folder.key} "${folder.name}" by name only — Drive identity unverified`,
          )
          .join(" · ")}`
      : exchange.message;
  $("id-pack").textContent = ids.privatePack
    ? `${ids.privatePack.packId} · manifest ${ids.privatePack.manifestSha256}`
    : "Unknown for this build";
  const rows = Object.entries(state.tracks).map(([id, track]) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(id === "main" ? "Follow main" : id.slice(7)),
      cell(
        track.currentPresent
          ? short(track.current)
          : `${short(track.current)} · missing from disk (${track.currentAbsentReason ?? "unknown"})`,
      ),
      cell(track.open ? (track.openRevision ?? "open") : "—"),
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
