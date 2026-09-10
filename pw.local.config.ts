import base from "./playwright.config";
/*
 * Local-only: this container ships Chromium 1194 while @playwright/test 1.62.1
 * resolves build 1234, so every launch fails and the whole suite reports as
 * failed without a single test body running. Everything else — the identity
 * globalSetup, the historical-evidence globalTeardown, the run artifacts — is
 * the repository's own config, spread through unchanged. Not committed.
 */
export default {
  ...base,
  projects: (base.projects ?? []).map((project) => ({
    ...project,
    use: {
      ...project.use,
      channel: undefined,
      launchOptions: {
        ...(project.use as { launchOptions?: object }).launchOptions,
        executablePath: "/opt/pw-browsers/chromium",
      },
    },
  })),
};
