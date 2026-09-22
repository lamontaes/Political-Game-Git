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

/** How long quit waits for any one page to answer before calling it unresponsive. */
export const QUIT_ANSWER_MS = 5000;
const UNANSWERED = Symbol("unanswered");

/** A hung renderer never settles executeJavaScript; quit must not wait on it. */
function bounded(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(UNANSWERED), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Freeze user edits across the save acknowledgment; restore on any refusal.
 * Resolves true when applied, false when the page is gone or refused, and
 * null when the page did not answer within `timeoutMs`. */
export async function suspendInteraction(
  contents,
  suspended,
  timeoutMs = QUIT_ANSWER_MS,
) {
  if (!contents || contents.isDestroyed()) return false;
  const answer = await bounded(
    contents
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
      .catch(() => false),
    timeoutMs,
  );
  return answer === UNANSWERED ? null : answer;
}

/** Consent and persistence only: this function never tears down a view.
 * A participant marked `unresponsive`, or one that stops answering, cannot
 * block quit: a game still asks the owner before its life is discarded; a
 * non-game page (the bench) that cannot answer has nothing it can hand over. */
export async function prepareQuit(
  participants,
  prompts,
  // The page bounds its own save at 30s; allow for that before giving up.
  { timeoutMs = QUIT_ANSWER_MS, saveTimeoutMs = timeoutMs + 30000 } = {},
) {
  for (const participant of participants) {
    const { contents, game } = participant;
    let active = false;
    let dirty = null;
    if (!participant.unresponsive) {
      if (game) {
        active = await bounded(hasSavableLife(contents), timeoutMs);
        if (active === UNANSWERED) participant.unresponsive = true;
      }
      if (!participant.unresponsive) {
        dirty = await bounded(hasUnsavedEdits(contents), timeoutMs);
        if (dirty === UNANSWERED) participant.unresponsive = true;
      }
    }
    if (participant.unresponsive) {
      if (game && (await prompts.unresponsive()) === 0) return false;
      continue;
    }
    if (active === true) {
      const choice = await prompts.save();
      if (choice === 2) return false;
      if (
        choice === 0 &&
        (await bounded(saveOpenLife(contents), saveTimeoutMs)) !== true
      ) {
        await prompts.failed();
        return false;
      }
    } else if (dirty !== false || (game && active === null)) {
      if ((await prompts.discard(game)) === 0) return false;
    }
  }
  return true;
}

/** Only a modern payload can explicitly attest an idle title. Unknown is unsafe. */
export async function isIdleTitle(contents) {
  if (!contents || contents.isDestroyed()) return false;
  return contents
    .executeJavaScript(
      `(() => {
    let idle = false;
    window.dispatchEvent(new CustomEvent("ocd:query-update-boundary", { detail: { respond: value => { idle = value === true; } } }));
    return idle;
  })()`,
    )
    .then((value) => value === true)
    .catch(() => false);
}
