/* global document, window */

const byId = (id) => document.getElementById(id);
const identity = byId("identity");
const repository = byId("repository");
const status = byId("status");
const log = byId("log");
const play = byId("play");
const update = byId("update");
const finish = byId("finish");
const cancel = byId("cancel");
const choose = byId("choose");

function append(message) {
  if (!message) return;
  log.textContent += `\n${message}`;
  log.scrollTop = log.scrollHeight;
}

function render(state) {
  if (!state?.ready) {
    identity.textContent = "No verified playable build is available.";
    play.disabled = true;
  } else {
    identity.textContent = `${state.current.version} · ${state.current.revision.slice(0, 12)} · internal art review · arm64`;
    play.disabled = state.busy;
  }
  repository.textContent =
    state?.repositoryPath ?? "Choose the Political Game folder.";
  update.disabled = Boolean(state?.busy);
  choose.disabled = Boolean(state?.busy);
  cancel.hidden = !state?.busy;
  finish.hidden = !state?.pending;
  if (state?.pending) {
    status.textContent = `Verified update ${state.pending.revision.slice(0, 12)} is ready. Close the game before activating it.`;
  }
}

async function refresh() {
  render(await window.ocdController.state());
}

async function action(run) {
  const result = await run();
  if (result?.message) {
    status.textContent = result.message;
    append(result.message);
  }
  if (result?.state) render(result.state);
  else await refresh();
}

play.addEventListener("click", () => action(() => window.ocdController.play()));
update.addEventListener("click", () =>
  action(() => window.ocdController.update()),
);
finish.addEventListener("click", () =>
  action(() => window.ocdController.finishUpdate()),
);
cancel.addEventListener("click", () =>
  action(() => window.ocdController.cancel()),
);
choose.addEventListener("click", () =>
  action(() => window.ocdController.chooseRepository()),
);

window.ocdController.onEvent((event) => {
  if (event?.message) {
    status.textContent = event.message;
    append(event.message);
  }
  if (event?.state) render(event.state);
  if (event?.kind === "settled" || event?.kind === "error") void refresh();
});

void refresh();
