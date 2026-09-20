/** Unknown/old payloads retain the existing unload guard. */
export async function hasSavableLife(contents) {
  if (!contents || contents.isDestroyed()) return null;
  return contents
    .executeJavaScript(
      `(() => {
    let active = null;
    window.dispatchEvent(new CustomEvent("ocd:query-session", {
      detail: { respond: value => { active = value === true; } }
    }));
    return active;
  })()`,
    )
    .catch(() => null);
}

/** Completion, never dispatch or elapsed time, establishes persistence. */
export async function saveOpenLife(contents) {
  if (!contents || contents.isDestroyed()) return false;
  return contents
    .executeJavaScript(
      `new Promise(resolve => {
    let settled = false;
    const complete = saved => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(saved === true);
    };
    const timer = setTimeout(() => complete(false), 30000);
    const unhandled = window.dispatchEvent(new CustomEvent("ocd:request-save", {
      cancelable: true, detail: { complete }
    }));
    if (unhandled) complete(false);
  })`,
      true,
    )
    .catch(() => false);
}

/** Check unload guards without unloading a recoverable page. */
export async function hasUnsavedEdits(contents) {
  if (!contents || contents.isDestroyed()) return false;
  return contents
    .executeJavaScript(
      `(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  })()`,
    )
    .catch(() => null);
}

/** Freeze user edits across the save acknowledgment; restore on any refusal. */
export async function suspendInteraction(contents, suspended) {
  if (!contents || contents.isDestroyed()) return false;
  return contents
    .executeJavaScript(
      `(() => {
    const root = document.documentElement;
    const key = "ocdQuitPreviousInert";
    if (${suspended === true}) {
      if (!(key in root.dataset)) root.dataset[key] = String(root.inert);
      root.inert = true;
    } else if (key in root.dataset) {
      root.inert = root.dataset[key] === "true";
      delete root.dataset[key];
    }
    return true;
  })()`,
    )
    .catch(() => false);
}

/** Consent and persistence only: this function never tears down a view. */
export async function prepareQuit(participants, prompts) {
  for (const { contents, game } of participants) {
    const active = game ? await hasSavableLife(contents) : false;
    const dirty = await hasUnsavedEdits(contents);
    if (active === true) {
      const choice = await prompts.save();
      if (choice === 2) return false;
      if (choice === 0 && !(await saveOpenLife(contents))) {
        await prompts.failed();
        return false;
      }
    } else if (dirty !== false || (game && active === null)) {
      if ((await prompts.discard(game)) === 0) return false;
    }
  }
  return true;
}
