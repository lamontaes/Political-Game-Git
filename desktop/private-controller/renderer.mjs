/* global document, window */
import { controllerControls } from "./controller-view.mjs";

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
const automatic = byId("automatic");
const buildStatus = byId("build-status");
const rollback = byId("rollback");

function append(message) {
  if (!message) return;
  log.textContent += `\n${message}`;
  log.scrollTop = log.scrollHeight;
}

function render(state) {
  const actual = state?.installed?.identity;
  identity.textContent = actual
    ? `${actual.version} · build ${actual.revision.slice(0, 12)}${actual.dirty ? " (dirty)" : ""} · internal art review · arm64`
    : "No readable installed build identity.";
  const controls = controllerControls(state);
  play.disabled = controls.playDisabled;
  repository.textContent =
    state?.repositoryPath ?? "Choose the Political Game folder.";
  update.disabled = controls.updateDisabled;
  choose.disabled = controls.chooseDisabled;
  cancel.hidden = controls.cancelHidden;
  finish.hidden = controls.finishHidden;
  finish.disabled = controls.finishDisabled;
  rollback.hidden = controls.rollbackHidden;
  rollback.disabled = controls.rollbackDisabled;
  automatic.checked = state?.updatePolicy?.mode === "automatic";
  buildStatus.textContent = [
    actual
      ? `Installed compiled source: ${actual.revision}\nClient tree: ${actual.clientTreeSha256}\nProfile/channel: ${actual.profile} / ${actual.channel}\nComposition: ${actual.composition}`
      : "Installed identity unavailable.",
    `Pointer source: ${state?.current?.revision ?? "none"}`,
    `Controller source: ${state?.controllerIdentity?.controllerSourceRevision ?? "not stamped"}${state?.controllerIdentity?.controllerSourceDirty ? " (dirty)" : ""}\nController tree: ${state?.controllerIdentity?.controllerTreeSha256 ?? "not stamped"}`,
    `Last update check: ${state?.updatePolicy?.lastAttemptAt ?? "not yet checked"} (${state?.updatePolicy?.lastOutcome ?? "none"})`,
    `Last discovered source: ${state?.updatePolicy?.lastTargetRevision ?? "not recorded"}`,
    state?.installed?.problem,
  ]
    .filter(Boolean)
    .join("\n\n");
  if (state?.installed?.problem) status.textContent = state.installed.problem;
  if (state?.pending) {
    status.textContent = `Verified update ${state.pending.revision.slice(0, 12)} is ready. Close the game before activating it.`;
  }
}

async function refresh() {
  render(await window.ocdController.state());
}

async function action(run) {
  let result;
  try {
    result = await run();
  } catch (error) {
    result = {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
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
automatic.addEventListener("change", () =>
  action(() =>
    window.ocdController.setUpdateMode(
      automatic.checked ? "automatic" : "manual",
    ),
  ),
);

rollback.addEventListener("click", () =>
  action(() => window.ocdController.rollback()),
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
