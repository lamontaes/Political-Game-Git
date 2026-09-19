/* global document, window, URLSearchParams */

const hub = window.ocdHub;
const tab = new URLSearchParams(window.location.search).get("tab");
const $ = (id) => document.getElementById(id);

function button(label, run, primary = false) {
  const b = document.createElement("button");
  b.textContent = label;
  if (primary) b.className = "primary";
  b.addEventListener("click", run);
  return b;
}

function renderPlay(state) {
  const id = state.selectedTrack;
  const track = state.tracks[id];
  const phase = state.tracks[id]?.phase ?? state.phase;
  $("eyebrow").textContent =
    id === "main" ? "Play · Follow main" : `Play · ${id.slice(7)}`;
  const actions = [];
  if (track) {
    $("title").textContent = "Play is closed";
    $("message").textContent = `${track.label.text}. ${phase?.message ?? ""}`;
    actions.push(button("Open Play", () => hub.tab("play"), true));
    if (track.previous)
      actions.push(button("Roll back to last good", () => hub.rollback(id)));
  } else {
    $("title").textContent =
      phase?.phase === "failed"
        ? "This source could not be prepared"
        : "Preparing this source";
    $("message").textContent =
      phase?.message ?? "Waiting for the build worker.";
    if (phase?.phase === "failed")
      actions.push(button("Try again", () => hub.check(id), true));
  }
  if (id !== "main")
    actions.push(button("Return to main", () => hub.returnMain()));
  $("actions").replaceChildren(...actions);
  $("log").hidden = state.log.length === 0;
  $("log").textContent = state.log.slice(-18).join("\n");
}

function renderArtDesk(state) {
  const s = state.artdesk ?? {
    state: "idle",
    message: "Art Desk is not started.",
  };
  $("eyebrow").textContent = `Art Desk · source ${state.artDeskBranch}`;
  $("title").textContent =
    s.state === "failed"
      ? "The Art Desk could not start"
      : s.state === "stopped"
        ? "The Art Desk stopped"
        : "Starting the Art Desk";
  $("message").textContent = s.message;
  const actions = [];
  if (["idle", "failed", "stopped"].includes(s.state))
    actions.push(button("Start Art Desk", () => hub.startArtDesk(), true));
  $("actions").replaceChildren(...actions);
  $("log").hidden = !s.tail;
  $("log").textContent = s.tail ?? "";
}

const render = (state) =>
  tab === "artdesk" ? renderArtDesk(state) : renderPlay(state);
hub.onState(render);
hub.state().then(render);
