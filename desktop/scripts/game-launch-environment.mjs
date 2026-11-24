/** Electron's controller worker runs as Node; the actual game must not. */
export function gameLaunchEnvironment(environment, profile) {
  const result = { ...environment, OCD_USER_DATA_DIR: profile };
  delete result.ELECTRON_RUN_AS_NODE;
  return result;
}

/** Native prepared images/fetches stay local to the packaged game origin. */
export function isPackagedRenderRequest(url) {
  return url.startsWith("app://game/") || url.startsWith("blob:app://game/");
}
