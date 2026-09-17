/* global setTimeout, clearTimeout */
/**
 * Silence watch for the build worker. A worker that prints nothing for a
 * while is not proof of any particular cause: it may be waiting on a macOS
 * privacy prompt, a slow network or a busy disk. The notice says so, and it
 * never claims Play is unaffected when there is nothing to play yet.
 */

export const SILENCE_NOTICE_MS = 10000;

export function silenceNotice({ hasPlayableBuild, seconds }) {
  return [
    `No progress from the build worker for ${seconds} s.`,
    "If macOS is showing a privacy prompt for Our Civic Duty Private (for example Documents access), answer it; otherwise the network or disk may be slow.",
    hasPlayableBuild
      ? "The last verified build stays playable meanwhile."
      : "There is no playable build yet; Play opens when this build is verified.",
  ].join(" ");
}

/**
 * One-shot timer that fires onSilent only if the worker has produced no
 * output and has not reached a terminal outcome. heard() and settle() both
 * cancel it; firing twice is impossible.
 */
export function createSilenceWatch({
  delayMs = SILENCE_NOTICE_MS,
  onSilent,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let state = "waiting";
  const timer = setTimer(() => {
    if (state !== "waiting") return;
    state = "silent";
    onSilent();
  }, delayMs);
  const stop = (next) => {
    if (state === "waiting") clearTimer(timer);
    if (state !== "settled") state = next;
  };
  return {
    heard: () => stop("heard"),
    settle: () => stop("settled"),
    get state() {
      return state;
    },
  };
}
